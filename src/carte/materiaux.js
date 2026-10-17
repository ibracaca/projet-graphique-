import {
  AdditiveBlending,
  Color,
  DoubleSide,
  MeshPhysicalMaterial,
  RepeatWrapping,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  Vector3,
} from 'three';
import { COULEURS, DEGRADE_MSI } from '../couleurs.js';

// ---------------------------------------------------------------------------
// Le balayage : chaque pièce passe du filaire lumineux à la matière réelle quand
// un front lumineux la traverse. Un objet « balayage » par pièce, partagé par
// tous ses matériaux. uRemplir va de 0 (filaire seul) à 1 (matière seule).
// ---------------------------------------------------------------------------
export function creerBalayage() {
  return {
    uRemplir: { value: 1 },
    uDir: { value: new Vector3(1, 0, 0) },
    uPlage: { value: new Vector2(-200, 200) },
    uFront: { value: COULEURS.msiIncandescent.clone() },
    uFilaire: { value: COULEURS.alu.clone() },
    uOpaciteFilaire: { value: 0.55 },
    uAllumage: { value: 1 }, // intensité des néons
  };
}

const GLSL_BALAYAGE = /* glsl */ `
  uniform float uRemplir;
  uniform vec3 uDir;
  uniform vec2 uPlage;
  uniform vec3 uFront;
  varying vec3 vMonde;
  float frontBalayage() { return mix(uPlage.x, uPlage.y, uRemplir); }
`;

const GLSL_TROUS = /* glsl */ `
  uniform vec3 uTrous[3];
  bool dansUnTrou(vec3 p) {
    for (int i = 0; i < 3; i++) {
      if (distance(p.xy, uTrous[i].xy) < uTrous[i].z) return true;
    }
    return false;
  }
`;

// Ajoute le balayage (et, en option, la découpe des ouvertures des ventilateurs)
// à un matériau physique de Three.js.
function brancherBalayage(materiau, balayage, trous) {
  materiau.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uRemplir: balayage.uRemplir,
      uDir: balayage.uDir,
      uPlage: balayage.uPlage,
      uFront: balayage.uFront,
    });
    if (trous) shader.uniforms.uTrous = { value: trous };

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMonde;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec4 pMonde = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          pMonde = instanceMatrix * pMonde;
        #endif
        vMonde = (modelMatrix * pMonde).xyz;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${GLSL_BALAYAGE}\n${trous ? GLSL_TROUS : ''}`)
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        float sBal = dot(vMonde, uDir);
        float fBal = frontBalayage();
        if (sBal > fBal) discard;
        ${trous ? 'if (dansUnTrou(vMonde)) discard;' : ''}`,
      )
      .replace(
        '#include <opaque_fragment>',
        `float lisere = 1.0 - smoothstep(0.0, 2.5, fBal - sBal);
        outgoingLight += uFront * lisere * 6.0 * step(uRemplir, 0.999);
        #include <opaque_fragment>`,
      );
  };
  materiau.customProgramCacheKey = () => `balayage-${trous ? 'trous' : 'plein'}`;
  return materiau;
}

// ---------------------------------------------------------------------------
// Matières de base, relevées sur les photos MSI.
// ---------------------------------------------------------------------------
const srgb = (hex) => new Color(hex);

const RECETTES = {
  coqueClaire: { color: srgb('#4a4c51'), metalness: 0.5, roughness: 0.48, clearcoat: 0.15, clearcoatRoughness: 0.45 },
  anthracite: { color: srgb('#1a1b1e'), metalness: 0.35, roughness: 0.5, clearcoat: 0.08, clearcoatRoughness: 0.4 },
  facette: { color: srgb('#5a5c61'), metalness: 0.55, roughness: 0.42 },
  verreFume: { color: srgb('#060607'), metalness: 0, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03 },
  plastiqueNoir: { color: srgb('#101114'), metalness: 0, roughness: 0.55, side: DoubleSide },
  moyeuArgent: { color: srgb('#cfd0d2'), metalness: 1, roughness: 0.42 },
  moyeuSombre: { color: srgb('#8a8c92'), metalness: 1, roughness: 0.4 },
  // pièces enfouies dans la coque : moins de reflets (occlusion approchée)
  alu: { color: srgb('#9a9ca0'), metalness: 1, roughness: 0.45, envMapIntensity: 0.45 },
  nickel: { color: srgb('#d5d2cc'), metalness: 1, roughness: 0.22, envMapIntensity: 0.8 },
  pcb: { color: srgb('#0f1011'), metalness: 0, roughness: 0.72 },
  or: { color: srgb('#e2be66'), metalness: 1, roughness: 0.42 },
  composant: { color: srgb('#1b1c1e'), metalness: 0.1, roughness: 0.6 },
  die: { color: srgb('#2b2e34'), metalness: 0.6, roughness: 0.1 },
  substrat: { color: srgb('#23272a'), metalness: 0.1, roughness: 0.55 },
  backplateLisse: { color: srgb('#18191b'), metalness: 0.6, roughness: 0.5 },
  backplateBrosse: { color: srgb('#a4a6ab'), metalness: 1, roughness: 0.34, anisotropy: 0.9 },
  equerre: { color: srgb('#b9babc'), metalness: 1, roughness: 0.35 },
  connecteur: { color: srgb('#121212'), metalness: 0, roughness: 0.5 },
};

let texturesBrosse = null;

export function chargerTextures(maxAnisotropie = 8) {
  const chargeur = new TextureLoader();
  const charger = (fichier, srgbCouleur) =>
    new Promise((ok) => {
      chargeur.load(new URL(`../../assets/textures/metal009/${fichier}`, import.meta.url).href, (t) => {
        t.wrapS = t.wrapT = RepeatWrapping;
        t.repeat.set(3, 3);
        t.anisotropy = maxAnisotropie;
        if (srgbCouleur) t.colorSpace = SRGBColorSpace;
        ok(t);
      });
    });
  return Promise.all([charger('color.jpg', true), charger('roughness.jpg'), charger('normal.jpg')]).then(
    ([couleur, rugosite, normale]) => {
      texturesBrosse = { couleur, rugosite, normale };
    },
  );
}

// Fabrique les matériaux d'une pièce, tous reliés au même balayage.
export function fabriqueMateriaux(balayage) {
  const cache = new Map();
  return function materiau(nom, { trous } = {}) {
    const cle = nom + (trous ? '+trous' : '');
    if (cache.has(cle)) return cache.get(cle);
    const recette = { ...RECETTES[nom] };
    const m = new MeshPhysicalMaterial(recette);
    if (nom === 'backplateBrosse' && texturesBrosse) {
      m.map = texturesBrosse.couleur;
      m.roughnessMap = texturesBrosse.rugosite;
      m.normalMap = texturesBrosse.normale;
      m.normalScale.set(0.35, 0.35);
      m.anisotropyRotation = (31 * Math.PI) / 180;
    }
    brancherBalayage(m, balayage, trous);
    cache.set(cle, m);
    return m;
  };
}

// ---------------------------------------------------------------------------
// Filaire lumineux : arêtes de chaque pièce, qui s'effacent derrière le front.
// ---------------------------------------------------------------------------
export function materiauFilaire(balayage) {
  return new ShaderMaterial({
    uniforms: {
      uRemplir: balayage.uRemplir,
      uDir: balayage.uDir,
      uPlage: balayage.uPlage,
      uFront: balayage.uFront,
      uCouleur: balayage.uFilaire,
      uOpacite: balayage.uOpaciteFilaire,
    },
    vertexShader: /* glsl */ `
      varying vec3 vMonde;
      void main() {
        vec4 p = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          p = instanceMatrix * p;
        #endif
        vec4 w = modelMatrix * p;
        vMonde = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_BALAYAGE}
      uniform vec3 uCouleur;
      uniform float uOpacite;
      void main() {
        float s = dot(vMonde, uDir);
        float f = frontBalayage();
        float rempli = smoothstep(f + 1.0, f - 10.0, s);
        float bord = 1.0 - smoothstep(0.0, 5.0, abs(s - f));
        bord *= step(0.001, uRemplir) * step(uRemplir, 0.999);
        float a = uOpacite * (1.0 - rempli);
        vec3 c = mix(uCouleur, uFront * 3.0, bord);
        float alpha = max(a, bord);
        if (alpha < 0.002) discard;
        gl_FragColor = vec4(c * alpha, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
}

// ---------------------------------------------------------------------------
// Néon : le dégradé MSI le long d'un axe local de la géométrie.
// mode 'axe' : t = coordonnée locale sur l'axe ; mode 'angle' : t suit le tour.
// ---------------------------------------------------------------------------
export function materiauNeon(balayage, { axe = 'x', min = -1, max = 1, mode = 'axe', intensite = 2.2 } = {}) {
  const [c0, c1, c2, c3] = DEGRADE_MSI;
  return new ShaderMaterial({
    uniforms: {
      uRemplir: balayage.uRemplir,
      uDir: balayage.uDir,
      uPlage: balayage.uPlage,
      uFront: balayage.uFront,
      uAllumage: balayage.uAllumage,
      uIntensite: { value: intensite },
      uMin: { value: min },
      uMax: { value: max },
      uC0: { value: c0 },
      uC1: { value: c1 },
      uC2: { value: c2 },
      uC3: { value: c3 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vMonde;
      varying float vT;
      uniform float uMin;
      uniform float uMax;
      void main() {
        ${
          mode === 'angle'
            ? 'vT = abs(atan(position.x, position.y)) / 3.1415927;'
            : `vT = clamp((position.${axe} - uMin) / (uMax - uMin), 0.0, 1.0);`
        }
        vec4 w = modelMatrix * vec4(position, 1.0);
        vMonde = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_BALAYAGE}
      varying float vT;
      uniform float uAllumage;
      uniform float uIntensite;
      uniform vec3 uC0, uC1, uC2, uC3;
      vec3 degrade(float t) {
        t = clamp(t, 0.0, 1.0) * 3.0;
        if (t < 1.0) return mix(uC0, uC1, t);
        if (t < 2.0) return mix(uC1, uC2, t - 1.0);
        return mix(uC2, uC3, t - 2.0);
      }
      void main() {
        if (dot(vMonde, uDir) > frontBalayage()) discard;
        vec3 eteint = vec3(0.012);
        vec3 c = mix(eteint, degrade(vT) * uIntensite, uAllumage);
        gl_FragColor = vec4(c, 1.0);
      }
    `,
    toneMapped: false,
  });
}
