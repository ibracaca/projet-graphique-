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
import { creerThermique } from './thermique.js';

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

// La vision thermique (beat 6) remplace l'image au passage d'une ligne de balayage
// qui descend du haut de l'écran.
const Composition = {
  uniforms: {
    tDiffuse: { value: null },
    tBloom: { value: null },
    tThermique: { value: null },
    uBloom: { value: 1 },
    uAberration: { value: 0 },
    uScan: { value: 0 },
    uHauteur: { value: 1080 },
    uLargeur: { value: 1920 },
    uBrut: { value: 0 }, // image du ray tracing avant DLSS : bruitée, basse définition
    uDlss: { value: 0 }, // part des tuiles déjà passées par DLSS
    uTuile: { value: 56 },
    uTempsC: { value: 0 },
  },
  vertexShader: VERTEX_PLEIN_ECRAN,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse, tBloom, tThermique;
    uniform float uBloom, uAberration, uScan, uHauteur, uLargeur, uBrut, uDlss, uTuile, uTempsC;
    varying vec2 vUv;
    float hashT(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    void main() {
      vec2 res = vec2(uLargeur, uHauteur);
      vec2 uvC = vUv;
      float brut = 0.0;
      float liseret = 0.0;
      if (uBrut > 0.0) {
        // avant DLSS, chaque tuile est rendue en basse définition et bruitée ;
        // DLSS les reprend une à une (ordre tiré au hasard, comme les autres passes)
        vec2 px = vUv * res;
        float h = hashT(floor(px / uTuile));
        brut = uBrut * step(uDlss, h);
        float age = uDlss - h;
        liseret = step(0.0, age) * step(age, 0.05) * step(0.001, uDlss) * step(uDlss, 0.999);
        if (brut > 0.0) uvC = (floor(px / 4.0) * 4.0 + 2.0) / res;
      }
      vec2 d = uvC - 0.5;
      float bord = smoothstep(0.25, 0.75, length(d));
      vec2 decal = d * uAberration * bord * 0.02;
      vec3 c;
      c.r = texture2D(tDiffuse, uvC - decal).r;
      c.g = texture2D(tDiffuse, uvC).g;
      c.b = texture2D(tDiffuse, uvC + decal).b;
      vec3 bloom = texture2D(tBloom, vUv).rgb * uBloom;
      if (brut > 0.0) {
        // bruit de Monte-Carlo : des pixels trop clairs ou trop sombres, qui changent
        float n = hashT(floor(vUv * res) + fract(uTempsC * 13.7) * 91.0);
        c *= mix(1.0, 0.35 + 1.5 * n * n, 0.75 * brut);
      }
      if (liseret > 0.0) {
        vec2 q = mod(vUv * res, uTuile);
        c += vec3(0.5) * step(min(min(q.x, q.y), min(uTuile - q.x, uTuile - q.y)), 1.0);
      }
      if (uScan > 0.0) {
        float limite = 1.0 - uScan;
        float m = step(limite, vUv.y);
        c = mix(c, texture2D(tThermique, vUv).rgb, m);
        bloom *= 1.0 - m;
        // la ligne de balayage : un filet net, avec une traîne vers le haut
        float px = (vUv.y - limite) * uHauteur;
        float actif = step(0.0005, uScan) * step(uScan, 0.9995);
        c += vec3(1.0) * (exp(-px * px / 1.5) * 2.0 + exp(-max(px, 0.0) / 40.0) * 0.06) * actif;
      }
      gl_FragColor = vec4(c + bloom, 1.0);
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
    uNoirTuiles: { value: 0 }, // fondu au noir par tuiles (sortie de la carte vers la ville)
    uRes: { value: new Vector2(1920, 1080) },
    uTuileF: { value: 56 },
    uC0: { value: DEGRADE_MSI[0] },
    uC1: { value: DEGRADE_MSI[1] },
    uC2: { value: DEGRADE_MSI[2] },
    uC3: { value: DEGRADE_MSI[3] },
  },
  vertexShader: VERTEX_PLEIN_ECRAN,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTemps, uGrain, uVignette, uGriffure, uRatio, uNoir, uNoirTuiles, uTuileF;
    uniform vec2 uRes;
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
      if (uNoirTuiles > 0.0) {
        float h = hash(floor(vUv * uRes / uTuileF) * 0.731 + 0.17);
        c *= step(uNoirTuiles, h);
      }

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
// msaa : échantillons d'antialiasing de la composition principale (les ailettes
// et les bords de pales ne scintillent plus).
const NIVEAUX = [
  { dpr: 1.5, bloom: 0.5, ombres: 2048, poussiere: 1, msaa: 4 },
  { dpr: 1.25, bloom: 0.5, ombres: 2048, poussiere: 0.8, msaa: 4 },
  { dpr: 1, bloom: 0.4, ombres: 1024, poussiere: 0.6, msaa: 2 },
  { dpr: 0.85, bloom: 0.33, ombres: 1024, poussiere: 0.35, msaa: 2 },
  { dpr: 0.7, bloom: 0.25, ombres: 512, poussiere: 0.2, msaa: 0 },
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
  // rayon court : une lueur de tube, pas un brouillard coloré
  // Rayon 0 : les poids ci-dessous s'appliquent tels quels (avec un rayon non nul,
  // Three.js redonne du poids aux niveaux larges et voile tout l'écran).
  const bloom = new UnrealBloomPass(new Vector2(256, 256), 1.1, 0, 0);
  // poids des cinq niveaux de flou : surtout les plus fins (lueur de tube),
  // les plus larges ne laissent qu'un halo court
  bloom.compositeMaterial.uniforms.bloomFactors.value = [1.0, 0.65, 0.28, 0.08, 0.02];
  composerBloom.addPass(bloom);
  passeComposition.uniforms.tBloom.value = composerBloom.renderTarget2.texture;

  // Passe thermique (beat 6).
  const thermique = creerThermique();
  passeComposition.uniforms.tThermique.value = thermique.cible.texture;
  let horsThermique = [];
  let horsBloom = [];

  // Matériaux masqués pendant la passe des néons (ils n'écrivent que leur profondeur).
  // Objets cachés pendant la passe thermique : filaires, particules, lignes,
  // et ce qui est marqué horsThermique (coque, ventilateurs).
  let masques = [];
  function recenserMateriaux() {
    const set = new Set();
    horsThermique = [];
    horsBloom = [];
    scene.traverse((o) => {
      if (o.isLine || o.isPoints || o.userData.horsThermique || o.userData.neon) horsThermique.push(o);
      if (o.userData.horsBloom) horsBloom.push(o);
      if (!(o.isMesh || o.isLine || o.isPoints) || o.userData.neon) return;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      ms.forEach((m) => set.add(m));
    });
    masques = [...set];
  }

  function rendreThermique(temps) {
    const visibles = horsThermique.map((o) => o.visible);
    horsThermique.forEach((o) => (o.visible = false));
    const ombres = renderer.shadowMap.enabled;
    renderer.shadowMap.enabled = false;
    thermique.materiau.uniforms.uTemps.value = Math.floor(temps * 24) / 24;
    scene.overrideMaterial = thermique.materiau;
    renderer.setRenderTarget(thermique.cible);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    scene.overrideMaterial = null;
    renderer.shadowMap.enabled = ombres;
    horsThermique.forEach((o, i) => (o.visible = visibles[i]));
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
    const msaa = NIVEAUX[niveau].msaa;
    for (const cible of [composer.renderTarget1, composer.renderTarget2]) {
      if (cible.samples !== msaa) {
        cible.samples = msaa;
        cible.dispose(); // recréée au prochain rendu avec le bon nombre d'échantillons
      }
    }
    composer.setPixelRatio(dpr());
    composer.setSize(l, h);
    const k = NIVEAUX[niveau].bloom;
    composerBloom.setPixelRatio(dpr() * k);
    composerBloom.setSize(l, h);
    passeComposition.uniforms.tBloom.value = composerBloom.renderTarget2.texture;
    passeFinition.uniforms.uRatio.value = l / h;
    thermique.cible.setSize(Math.round(l * dpr()), Math.round(h * dpr()));
    passeComposition.uniforms.uHauteur.value = h * dpr();
    passeComposition.uniforms.uLargeur.value = l * dpr();
    passeComposition.uniforms.uTuile.value = 56 * dpr();
    passeFinition.uniforms.uRes.value.set(l * dpr(), h * dpr());
    passeFinition.uniforms.uTuileF.value = 56 * dpr();
    qualite.auRedimensionnement?.();
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
    passeComposition.uniforms.uTempsC.value = temps;
    renderer.shadowMap.needsUpdate = true;
    // passe des néons
    // (les reflets ne servent pas à la passe des néons : on économise leur rendu)
    const vis = horsBloom.map((o) => o.visible);
    horsBloom.forEach((o) => (o.visible = false));
    for (const m of masques) m.colorWrite = false;
    composerBloom.render();
    for (const m of masques) m.colorWrite = true;
    horsBloom.forEach((o, i) => (o.visible = vis[i]));
    renderer.shadowMap.needsUpdate = false;
    if (passeComposition.uniforms.uScan.value > 0) rendreThermique(temps);
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
    thermique: thermique.materiau.uniforms,
    bloom,
  };
}
