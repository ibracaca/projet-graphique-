import {
  Color,
  HalfFloatType,
  NeutralToneMapping,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer,
  PCFSoftShadowMap,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { DEGRADE_MSI } from '../couleurs.js';

// ---------------------------------------------------------------------------
// Une seule scène WebGL pour tout le site. Chaîne d'image :
//   rendu HDR -> composition (bloom des néons seuls, aberration en bord d'écran)
//   -> tone mapping -> finition (grain de capteur, vignette, griffures).
// Le bloom est sélectif : une deuxième passe ne dessine que les néons (les autres
// matériaux n'écrivent que leur profondeur, pour masquer correctement).
// ---------------------------------------------------------------------------

const VERTEX_PLEIN_ECRAN = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const Composition = {
  uniforms: {
    tDiffuse: { value: null },
    tBloom: { value: null },
    uBloom: { value: 1 },
    uAberration: { value: 0 },
  },
  vertexShader: VERTEX_PLEIN_ECRAN,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse, tBloom;
    uniform float uBloom, uAberration;
    varying vec2 vUv;
    void main() {
      vec2 d = vUv - 0.5;
      float bord = smoothstep(0.25, 0.75, length(d));
      vec2 decal = d * uAberration * bord * 0.02;
      vec3 c;
      c.r = texture2D(tDiffuse, vUv - decal).r;
      c.g = texture2D(tDiffuse, vUv).g;
      c.b = texture2D(tDiffuse, vUv + decal).b;
      c += texture2D(tBloom, vUv).rgb * uBloom;
      gl_FragColor = vec4(c, 1.0);
    }
  `,
};

// Finition, en sRGB après tone mapping.
// Griffures : trois entailles parallèles à l'angle des barres de la carte (45°),
// qui traversent l'écran ; dégradé MSI le long de chaque entaille, bleu vers
// l'extérieur, rose au cœur ; traîne de phosphore derrière le front.
const Finition = {
  uniforms: {
    tDiffuse: { value: null },
    uTemps: { value: 0 },
    uGrain: { value: 0.04 },
    uVignette: { value: 0.35 },
    uGriffure: { value: 0 },
    uRatio: { value: 16 / 9 },
    uNoir: { value: 0 },
    uC0: { value: DEGRADE_MSI[0] },
    uC1: { value: DEGRADE_MSI[1] },
    uC2: { value: DEGRADE_MSI[2] },
    uC3: { value: DEGRADE_MSI[3] },
  },
  vertexShader: VERTEX_PLEIN_ECRAN,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTemps, uGrain, uVignette, uGriffure, uRatio, uNoir;
    uniform vec3 uC0, uC1, uC2, uC3;
    varying vec2 vUv;

    float hash(vec2 p) { p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }

    vec3 degrade(float t) {
      t = clamp(t, 0.0, 1.0) * 3.0;
      if (t < 1.0) return mix(uC0, uC1, t);
      if (t < 2.0) return mix(uC1, uC2, t - 1.0);
      return mix(uC2, uC3, t - 2.0);
    }

    // Lumière d'une entaille : distance au trait oblique, front qui avance.
    vec3 entaille(vec2 p, float decalage, float largeur) {
      float g = clamp(uGriffure * 1.25 - decalage, 0.0, 1.0);
      if (g <= 0.0) return vec3(0.0);
      // repère tourné de 45° : u le long du trait, v en travers
      vec2 q = vec2(p.x * 0.7071 + p.y * 0.7071, -p.x * 0.7071 + p.y * 0.7071);
      // le trait traverse l'écran en travers (q.y couvre environ -1 à 1 en 16:9)
      float etendue = 0.36 * (uRatio + 1.0);
      float position = mix(-etendue, etendue, g);
      float v = q.y - position;
      float trait = exp(-pow(v / largeur, 2.0));
      // traîne de phosphore : fine, derrière le front seulement
      float trainee = exp(min(v, 0.0) * 40.0) * step(v, 0.0) * 0.18;
      float vie = smoothstep(0.0, 0.05, g) * (1.0 - smoothstep(0.8, 1.0, g));
      float t = clamp(0.5 + q.x * 0.45, 0.0, 1.0);
      float coeur = 1.0 - abs(t - 0.5) * 2.0; // rose au centre, bleu aux extrémités
      vec3 couleur = degrade(coeur);
      // le cœur du trait tend vers le blanc, comme un vrai tube
      return (mix(couleur, vec3(1.0), trait * 0.35) * trait * 1.6 + couleur * trainee) * vie;
    }

    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      vec2 p = (vUv - 0.5) * vec2(uRatio, 1.0);

      // vignette douce
      c *= 1.0 - uVignette * smoothstep(0.35, 1.1, length(p));

      // grain de capteur : fort dans les basses lumières, comme une vraie caméra,
      // mais nul sur le noir pur (sur un OLED, ces pixels doivent rester éteints)
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      float n = hash(vUv * 1000.0 + fract(uTemps * 7.13)) - 0.5;
      float zone = smoothstep(0.002, 0.04, l) * (1.0 - smoothstep(0.04, 0.6, l));
      c += n * uGrain * zone * 1.2;

      // fondu au noir (transitions calmes, extinction)
      c *= 1.0 - uNoir;

      // griffures : par-dessus le noir, elles ouvrent l'acte suivant (raccord)
      if (uGriffure > 0.0) {
        float lg = 1.5 / 1080.0;
        c += entaille(p, 0.0, lg * 1.4) + entaille(p, 0.022, lg) + entaille(p, 0.044, lg * 1.2);
      }
      gl_FragColor = vec4(max(c, 0.0), 1.0);
    }
  `,
};

// Niveaux de qualité : on descend quand les images par seconde chutent.
const NIVEAUX = [
  { dpr: 1.5, bloom: 0.5, ombres: 2048, poussiere: 1 },
  { dpr: 1.25, bloom: 0.5, ombres: 2048, poussiere: 0.8 },
  { dpr: 1, bloom: 0.4, ombres: 1024, poussiere: 0.6 },
  { dpr: 0.85, bloom: 0.33, ombres: 1024, poussiere: 0.35 },
  { dpr: 0.7, bloom: 0.25, ombres: 512, poussiere: 0.2 },
];

export function creerRendu(canvas) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', stencil: false });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.setClearColor(0x000000, 1);

  const scene = new Scene();
  scene.background = new Color(0x000000);
  const camera = new PerspectiveCamera(28, innerWidth / innerHeight, 5, 6000);

  // Composition principale.
  const composer = new EffectComposer(renderer);
  composer.renderTarget1.texture.type = HalfFloatType;
  composer.renderTarget2.texture.type = HalfFloatType;
  composer.addPass(new RenderPass(scene, camera));
  const passeComposition = new ShaderPass(Composition);
  composer.addPass(passeComposition);
  composer.addPass(new OutputPass());
  const passeFinition = new ShaderPass(Finition);
  composer.addPass(passeFinition);

  // Passe des néons seuls.
  const composerBloom = new EffectComposer(renderer);
  composerBloom.renderToScreen = false;
  composerBloom.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new Vector2(256, 256), 1.2, 0.55, 0);
  composerBloom.addPass(bloom);
  passeComposition.uniforms.tBloom.value = composerBloom.renderTarget2.texture;

  // Matériaux masqués pendant la passe des néons (ils n'écrivent que leur profondeur).
  let masques = [];
  function recenserMateriaux() {
    const set = new Set();
    scene.traverse((o) => {
      if (!(o.isMesh || o.isLineSegments || o.isPoints) || o.userData.neon) return;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      ms.forEach((m) => set.add(m));
    });
    masques = [...set];
  }

  let niveau = 0;
  const qualite = {
    niveau: () => niveau,
    reglages: () => NIVEAUX[niveau],
    auChangement: null,
  };

  // devicePixelRatio plafonné (2 sur les petits écrans, 1,5 au-delà), puis réduit
  // proportionnellement au niveau de qualité.
  function dpr() {
    const plafond = innerWidth < 1600 ? 2 : 1.5;
    return Math.min(devicePixelRatio || 1, plafond) * (NIVEAUX[niveau].dpr / NIVEAUX[0].dpr);
  }

  function redimensionner() {
    const l = innerWidth;
    const h = innerHeight;
    renderer.setPixelRatio(dpr());
    renderer.setSize(l, h, false);
    composer.setPixelRatio(dpr());
    composer.setSize(l, h);
    const k = NIVEAUX[niveau].bloom;
    composerBloom.setPixelRatio(dpr() * k);
    composerBloom.setSize(l, h);
    passeComposition.uniforms.tBloom.value = composerBloom.renderTarget2.texture;
    passeFinition.uniforms.uRatio.value = l / h;
    camera.aspect = l / h;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', redimensionner);
  redimensionner();

  // Mesure des images par seconde sur 2 s ; on descend sous 50, on remonte au-dessus de 58.
  let cumul = 0;
  let images = 0;
  let calme = 0;
  function mesurer(dt) {
    cumul += dt;
    images++;
    if (cumul < 2) return;
    const ips = images / cumul;
    cumul = 0;
    images = 0;
    if (ips < 50 && niveau < NIVEAUX.length - 1) {
      niveau++;
      calme = 0;
      redimensionner();
      qualite.auChangement?.(NIVEAUX[niveau]);
    } else if (ips > 58 && niveau > 0) {
      if (++calme >= 3) {
        niveau--;
        calme = 0;
        redimensionner();
        qualite.auChangement?.(NIVEAUX[niveau]);
      }
    } else calme = 0;
    qualite.ips = ips;
  }

  function rendre(temps, dt) {
    mesurer(dt);
    passeFinition.uniforms.uTemps.value = temps;
    renderer.shadowMap.needsUpdate = true;
    // passe des néons
    for (const m of masques) m.colorWrite = false;
    composerBloom.render();
    for (const m of masques) m.colorWrite = true;
    renderer.shadowMap.needsUpdate = false;
    composer.render();
  }

  return {
    renderer,
    scene,
    camera,
    rendre,
    recenserMateriaux,
    redimensionner,
    qualite,
    uniforms: { ...passeComposition.uniforms, ...passeFinition.uniforms },
    bloom,
  };
}
