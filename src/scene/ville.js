import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  FogExp2,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  LineSegments,
  MathUtils,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  Points,
  RepeatWrapping,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { COULEURS, DEGRADE_MSI } from '../couleurs.js';
import { genererVille, RUE } from './ville-kit.js';

// ---------------------------------------------------------------------------
// Beat 12, le rendu qui se calcule : une rue de ville inventée, la nuit, sous une
// pluie fine. Elle se calcule sous nos yeux, par tuiles d'écran, comme un moteur :
//   E.etape (continu) : −1 noir, 0 fil de fer, 1 polygones, 2 ombres, 3 ray tracing.
//   Entre deux étapes, chaque tuile bascule à son tour (ordre tiré au hasard),
//   avec un liseré au moment où elle est calculée. DLSS est fait en
//   post-traitement (rendu.js).
// La géométrie vient du kit (ville-kit.js). Pas de texte, pas de glitch : des
// enseignes abstraites aux couleurs du dégradé MSI, seul endroit où le néon déborde.
// Unités de la scène (la carte mesure 359) ; la rue fait 190 de large.
// ---------------------------------------------------------------------------

const TUILE = 56; // px
// reflets de l'environnement (valeur indicative : plateau.js règle
// scene.environmentIntensity à 0,03 pendant la ville, ce qui s'impose aux matériaux)
const ENV = 0.03;

// GLSL commun : étape locale de la tuile et liseré de calcul.
const GLSL_TUILES = /* glsl */ `
  uniform float uEtape, uTuile, uTempsV;
  float hashT(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float etapeLocale(out float frais) {
    vec2 t = floor(gl_FragCoord.xy / uTuile);
    float h = hashT(t);
    float f = fract(uEtape);
    frais = smoothstep(0.06, 0.0, f - h) * step(h, f) * step(0.001, f);
    return floor(uEtape) + step(h, f);
  }
  float cadreTuile() {
    vec2 q = mod(gl_FragCoord.xy, uTuile);
    return step(min(min(q.x, q.y), min(uTuile - q.x, uTuile - q.y)), 1.0);
  }
`;

const GLSL_DEGRADE = /* glsl */ `
  uniform vec3 uC0, uC1, uC2, uC3;
  vec3 degrade(float t) {
    t = clamp(t, 0.0, 1.0) * 3.0;
    if (t < 1.0) return mix(uC0, uC1, t);
    if (t < 2.0) return mix(uC1, uC2, t - 1.0);
    return mix(uC2, uC3, t - 2.0);
  }
`;
const uniformesDegrade = () => ({ uC0: { value: DEGRADE_MSI[0] }, uC1: { value: DEGRADE_MSI[1] }, uC2: { value: DEGRADE_MSI[2] }, uC3: { value: DEGRADE_MSI[3] } });

// Fenêtres avec intérieur (« interior mapping ») : derrière chaque vitre, une pièce
// simulée par un rayon qui va de l'œil au mur du fond, au sol ou au plafond. La
// profondeur change avec le point de vue, pour presque rien. Quelques pièces sont
// allumées, en blanc cassé chaud (ou plus neutre), très faiblement ; certaines ont
// le store baissé. Les vitrines du rez-de-chaussée (cellules hautes) s'allument plus.
const GLSL_INTERIEUR = /* glsl */ `
  vec3 interieur(vec3 p, vec3 nG, vec4 st, vec2 org, float gr, out float vitre) {
    // la graine arrive interpolée (à quelques millionièmes près d'un pixel à l'autre) :
    // on l'arrondit, sinon le hachage transforme ces écarts en bruit
    gr = floor(gr * 1024.0 + 0.5) / 1024.0;
    vec3 n;
    vec3 t;
    if (abs(nG.x) > abs(nG.z)) { n = vec3(sign(nG.x), 0.0, 0.0); t = vec3(0.0, 0.0, 1.0); }
    else { n = vec3(0.0, 0.0, sign(nG.z)); t = vec3(1.0, 0.0, 0.0); }
    float u = dot(p, t) - org.x;
    float v = p.y - org.y;
    vec2 g = vec2(u / st.x, v / st.y);
    vec2 cel = fract(g);
    vec2 id = floor(g);
    vec2 aa = fwidth(g) * 1.2;
    vec2 bord = 0.5 * st.zw;
    vec2 dc = abs(cel - 0.5);
    vitre = (1.0 - smoothstep(bord.x - aa.x, bord.x + aa.x, dc.x)) * (1.0 - smoothstep(bord.y - aa.y, bord.y + aa.y, dc.y)) * step(0.0, v);
    float h1 = hashT(id + gr * 91.7);
    float h2 = hashT(id * 1.31 + gr * 17.3);
    float h3 = hashT(id * 2.17 + gr * 5.1);
    float boutique = step(28.0, st.y);
    float allume = step(mix(0.83, 0.5, boutique), h1);
    vec3 teinte = mix(vec3(1.0, 0.8, 0.58), vec3(0.9, 0.93, 1.0), step(0.72, h2));
    vec3 d = normalize(p - cameraPosition);
    float du = dot(d, t);
    float dv = d.y;
    float dw = max(-dot(d, n), 1e-3);
    float lu = cel.x * st.x;
    float lv = cel.y * st.y;
    float D = min(st.x * 0.85, 34.0);
    float tu = du > 0.0 ? (st.x - lu) / max(du, 1e-4) : lu / max(-du, 1e-4);
    float tv = dv > 0.0 ? (st.y - lv) / max(dv, 1e-4) : lv / max(-dv, 1e-4);
    float tw = D / dw;
    float tt = min(tw, min(tu, tv));
    vec3 h = vec3(lu + du * tt, lv + dv * tt, dw * tt);
    // surface touchée : choisie par comparaison stricte (pas d'égalité entre
    // flottants, qui bascule d'un pixel à l'autre et fait grésiller l'image)
    float lum;
    if (tw < tu && tw < tv) lum = 0.75 - 0.3 * abs(h.x / st.x - 0.5);
    else if (tv < tu) lum = dv < 0.0 ? 0.28 : 1.15 - 0.7 * length(vec2(h.x / st.x - 0.5, h.z / D - 0.5));
    else lum = 0.5;
    lum *= mix(1.0, 0.55, clamp(h.z / D, 0.0, 1.0));
    float store = step(0.7, h3) * (1.0 - boutique);
    lum = mix(lum, 0.55 + 0.12 * step(0.5, fract(lv * 0.8)), store);
    vec3 c = teinte * lum * allume * (0.5 + 0.5 * h2) * mix(1.0, 1.4, boutique);
    c += vec3(0.003, 0.004, 0.006) * (1.0 - allume);
    // au loin, la grille devient trop fine : on la fond en une lueur moyenne
    float trop = smoothstep(0.15, 0.5, max(aa.x, aa.y));
    c = mix(c, teinte * mix(0.05, 0.4, boutique) * (0.3 + 0.7 * h2), trop);
    vitre = mix(vitre, 0.45, trop);
    return c * vitre;
  }
`;

// Matériau physique de Three.js (ombres, lumières, textures) auquel on greffe les
// étapes du rendu, les fenêtres et un brouillard en couches (plus dense en bas).
function brancherEtapes(materiau, uniformes, { sol = false, fenetres = false } = {}) {
  materiau.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniformes);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute vec2 uvBord;
        attribute float graine;
        attribute float fen;
        attribute vec4 style;
        attribute vec2 origine;
        varying vec3 vMondeV;
        varying vec3 vNormaleM;
        varying vec2 vUvB;
        varying float vGraine;
        varying float vFen;
        varying vec4 vStyle;
        varying vec2 vOrigine;`,
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec4 pm = vec4(transformed, 1.0);
        vec3 nm = objectNormal;
        #ifdef USE_INSTANCING
          pm = instanceMatrix * pm;
          nm = mat3(instanceMatrix) * nm;
        #endif
        vNormaleM = normalize(mat3(modelMatrix) * nm);
        vMondeV = (modelMatrix * pm).xyz;
        vUvB = uvBord;
        vGraine = graine;
        vFen = fen;
        vStyle = style;
        vOrigine = origine;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vMondeV;
        varying vec3 vNormaleM;
        varying vec2 vUvB;
        varying float vGraine;
        varying float vFen;
        varying vec4 vStyle;
        varying vec2 vOrigine;
        uniform vec3 uFil, uFenetre;
        ${GLSL_TUILES}
        ${fenetres ? GLSL_INTERIEUR : ''}
        // 1 près du bord de la cellule (|d| proche de 0,5), 0 ailleurs
        float ligne(float d, float l) { float a = fwidth(d) * 0.8; return smoothstep(l - a, l + a, abs(d)); }`,
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        float frais;
        float eLoc = etapeLocale(frais);
        if (eLoc < -0.5) discard;
        // normale de face par dérivées : pour le rendu facetté des polygones ;
        // normale du maillage : pour les tests (stable même en vue rasante, au loin)
        vec3 nMonde = normalize(cross(dFdx(vMondeV), dFdy(vMondeV)));
        vec3 nGeo = normalize(vNormaleM);
        float vitre = 0.0;
        vec3 interieurC = vec3(0.0);
        ${fenetres ? 'if (eLoc > 1.5 && vFen > 0.5 && abs(nGeo.y) < 0.5) interieurC = interieur(vMondeV, nGeo, vStyle, vOrigine, vGraine, vitre);' : ''}`,
      )
      .replace('#include <map_fragment>', '#include <map_fragment>\n        diffuseColor.rgb *= mix(1.0, 0.05, vitre);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n        roughnessFactor = mix(roughnessFactor, 0.16, vitre);')
      // le verre est lisse : pas de relief de béton sur les vitres (sinon il scintille)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n        normal = normalize(mix(normal, nonPerturbedNormal, vitre));')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n        metalnessFactor = mix(metalnessFactor, 0.0, vitre);')
      .replace(
        '#include <opaque_fragment>',
        `${
          sol
            ? `// sol : quadrillage en fil de fer
          float fil = max(ligne(fract(vMondeV.x / 80.0) - 0.5, 0.5 - 0.012), ligne(fract(vMondeV.z / 80.0) - 0.5, 0.5 - 0.012));`
            : `// arêtes des faces, et une ligne par étage sur les façades
          vec2 dB = min(vUvB, 1.0 - vUvB);
          float fil = 1.0 - smoothstep(0.0, fwidth(min(dB.x, dB.y)) * 1.5, min(dB.x, dB.y));
          float hEtage = (vMondeV.y - vOrigine.y) / max(vStyle.y, 1.0);
          fil = max(fil, ligne(fract(hEtage) - 0.5, 0.5 - 0.01) * step(abs(nGeo.y), 0.5) * vFen * step(0.0, vMondeV.y - vOrigine.y) * 0.5);`
        }
        if (eLoc < 0.5) {
          if (fil < 0.05) discard;
          outgoingLight = uFil * fil;
        } else if (eLoc < 1.5) {
          // polygones : facettes grises, éclairage plat, sans ombres ni textures
          float l = 0.03 + 0.11 * max(dot(nMonde, normalize(vec3(-0.4, 0.7, 0.5))), 0.0);
          outgoingLight = vec3(l);
        } else {
          outgoingLight += interieurC * uFenetre;
        }
        outgoingLight += vec3(0.5) * frais * cadreTuile();
        #include <opaque_fragment>`,
      )
      .replace(
        '#include <fog_fragment>',
        `#ifdef USE_FOG
          float distB = length(vMondeV - cameraPosition);
          float bas = exp(-max(vMondeV.y, 0.0) / 480.0);
          float fogFactor = 1.0 - exp(-fogDensity * distB * (0.5 + 1.0 * bas));
          gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
        #endif`,
      );
  };
  materiau.customProgramCacheKey = () => `etapes-${sol}-${fenetres}`;
  return materiau;
}

// Tubes de néon : le dégradé MSI le long de chaque enseigne, cœur du tube plus
// clair, léger battement. Ils s'allument avec la lumière (étape 2).
function materiauNeon(uniformes) {
  return new ShaderMaterial({
    uniforms: { ...uniformes, ...uniformesDegrade(), uIntensite: { value: 2.3 }, uDensite: { value: 0 }, uCoeur: { value: COULEURS.msiIncandescent } },
    vertexShader: /* glsl */ `
      attribute float t;
      attribute float graine;
      varying float vT;
      varying float vGraine;
      varying vec3 vN;
      varying vec3 vMonde;
      void main() {
        vT = t;
        vGraine = graine;
        vN = normalize(mat3(modelMatrix) * normal);
        vec4 w = modelMatrix * vec4(position, 1.0);
        vMonde = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_TUILES}
      ${GLSL_DEGRADE}
      uniform float uIntensite, uDensite;
      uniform vec3 uCoeur;
      varying float vT;
      varying float vGraine;
      varying vec3 vN;
      varying vec3 vMonde;
      void main() {
        float frais;
        float eLoc = etapeLocale(frais);
        if (eLoc < 1.5) discard;
        // chaque enseigne porte sa portion du dégradé
        float tt = fract(vGraine * 7.31) * 0.45 + vT * 0.55;
        vec3 c = degrade(tt);
        vec3 v = normalize(cameraPosition - vMonde);
        float coeur = pow(abs(dot(normalize(vN), v)), 3.0);
        c = mix(c, uCoeur, coeur * 0.25);
        float battement = 0.93 + 0.07 * sin(uTempsV * (2.0 + vGraine * 5.0) + vGraine * 40.0);
        float dist = length(vMonde - cameraPosition);
        c *= uIntensite * battement * (0.75 + 0.5 * coeur) * exp(-uDensite * dist * 0.45);
        gl_FragColor = vec4(c + vec3(0.5) * frais * cadreTuile(), 1.0);
      }
    `,
    toneMapped: false,
  });
}

// Têtes de lampadaires : une source blanc froid, faible.
function materiauLampe(uniformes) {
  return new ShaderMaterial({
    uniforms: { ...uniformes, uLampes: { value: 0 }, uDensite: { value: 0 } },
    vertexShader: 'varying vec3 vMonde; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vMonde = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */ `
      ${GLSL_TUILES}
      uniform float uLampes, uDensite;
      varying vec3 vMonde;
      void main() {
        float frais;
        if (etapeLocale(frais) < 1.5) discard;
        float dist = length(vMonde - cameraPosition);
        gl_FragColor = vec4(vec3(0.95, 0.96, 1.0) * 0.45 * uLampes * exp(-uDensite * dist * 0.6), 1.0);
      }
    `,
    toneMapped: false,
  });
}

// Halos dans l'air humide autour des enseignes, cônes de lumière sous les
// lampadaires : de la lumière diffusée par la pluie, en addition.
function materiauHalo(uniformes) {
  return new ShaderMaterial({
    uniforms: { ...uniformes, uHalo: { value: 0 }, uDensite: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute vec3 centre;
      attribute vec2 coin;
      attribute float taille;
      attribute vec3 couleur;
      varying vec2 vCoin;
      varying vec3 vCouleur;
      varying float vDist;
      void main() {
        vec4 vp = viewMatrix * vec4(centre, 1.0);
        vp.xy += coin * taille;
        vCoin = coin;
        vCouleur = couleur;
        vDist = -vp.z;
        gl_Position = projectionMatrix * vp;
      }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_TUILES}
      uniform float uHalo, uDensite;
      varying vec2 vCoin;
      varying vec3 vCouleur;
      varying float vDist;
      void main() {
        float frais;
        if (etapeLocale(frais) < 1.5) discard;
        float r = length(vCoin);
        float a = exp(-r * r * 4.0) * (1.0 - smoothstep(0.75, 1.0, r));
        gl_FragColor = vec4(vCouleur * a * uHalo * exp(-uDensite * vDist * 0.35), 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
}

function materiauCone(uniformes) {
  return new ShaderMaterial({
    uniforms: { ...uniformes, uLampes: { value: 0 }, uDensite: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float hauteur;
      varying float vH;
      varying vec3 vN;
      varying vec3 vMonde;
      void main() {
        vH = hauteur;
        vN = normalize(mat3(modelMatrix) * normal);
        vec4 w = modelMatrix * vec4(position, 1.0);
        vMonde = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_TUILES}
      uniform float uLampes, uDensite;
      varying float vH;
      varying vec3 vN;
      varying vec3 vMonde;
      void main() {
        float frais;
        if (etapeLocale(frais) < 1.5) discard;
        vec3 v = normalize(cameraPosition - vMonde);
        float bord = pow(abs(dot(normalize(vN), v)), 1.6);
        float a = pow(1.0 - vH, 1.4) * bord * 0.05 * uLampes;
        float dist = length(vMonde - cameraPosition);
        gl_FragColor = vec4(vec3(0.85, 0.88, 0.95) * a * exp(-uDensite * dist * 0.5), 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: 2,
    toneMapped: false,
  });
}

// Reflets (étape 3, « ray tracing ») : texture du Reflector, nette dans les
// flaques, étirée verticalement sur l'asphalte rugueux, troublée par les gouttes.
// Les flaques sont lues dans la carte de rugosité de l'asphalte.
const FlaquesShader = {
  name: 'Flaques',
  uniforms: {
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
    tRugosite: { value: null },
    uEtape: { value: 0 },
    uTuile: { value: TUILE },
    uTempsV: { value: 0 },
  },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec3 vMonde;
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vMonde = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse, tRugosite;
    varying vec4 vUv;
    varying vec3 vMonde;
    ${GLSL_TUILES}
    void main() {
      float frais;
      float eLoc = etapeLocale(frais);
      if (eLoc < 2.5) discard;
      float rug = texture2D(tRugosite, vMonde.xz / 140.0).g;
      float flaque = smoothstep(0.62, 0.38, rug);
      // impacts de pluie : petits anneaux qui troublent le reflet
      vec2 cel = floor(vMonde.xz / 9.0);
      vec2 r = fract(vMonde.xz / 9.0) - 0.5;
      float t = fract(uTempsV * 1.3 + hashT(cel));
      float anneau = sin(clamp((length(r) - t * 0.5) * 40.0, -3.1416, 3.1416)) * (1.0 - t) * step(length(r), t * 0.5 + 0.08);
      // (seulement au premier plan : au loin, ces remous déchiquetteraient le reflet)
      float proche = smoothstep(900.0, 250.0, length(vMonde - cameraPosition));
      vec4 uv = vUv;
      uv.xy += anneau * 0.25 * proche * uv.w * 0.01;
      // étirement vertical : sept prises le long de l'écran, serrées dans les flaques
      float etire = mix(0.05, 0.006, flaque) * uv.w;
      vec3 c = vec3(0.0);
      float w = 0.0;
      for (int i = -3; i <= 3; i++) {
        float k = float(i);
        float wi = exp(-k * k * 0.18);
        c += texture2DProj(tDiffuse, uv + vec4(0.0, k * etire, 0.0, 0.0)).rgb * wi;
        w += wi;
      }
      c /= w;
      float fondu = smoothstep(1500.0, 250.0, length(vMonde - cameraPosition));
      gl_FragColor = vec4(c * (0.22 + 0.78 * flaque) * fondu, 1.0);
    }
  `,
};

// Pluie : des traînées de longueurs variées, éclairées par les néons voisins.
const N_LUMIERES = 8;
function creerPluie(n, lumieres) {
  const pos = new Float32Array(n * 6);
  const bout = new Float32Array(n * 2);
  const longueur = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    // plus dense près de la caméra
    const z = 620 - Math.pow(Math.random(), 1.6) * 2400;
    const x = MathUtils.randFloat(-260, 260);
    const y = MathUtils.randFloat(0, 900);
    pos.set([x, y, z, x, y, z], i * 6);
    bout.set([0, 1], i * 2);
    const l = MathUtils.randFloat(12, 38);
    longueur.set([l, l], i * 2);
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('bout', new BufferAttribute(bout, 1));
  geo.setAttribute('longueur', new BufferAttribute(longueur, 1));
  const mat = new ShaderMaterial({
    uniforms: { uTempsV: { value: 0 }, uIntensite: { value: 0 }, uCouleur: { value: COULEURS.blanc }, ...lumieres },
    vertexShader: /* glsl */ `
      attribute float bout;
      attribute float longueur;
      uniform float uTempsV;
      uniform vec3 uLumPos[${N_LUMIERES}];
      uniform vec3 uLumCol[${N_LUMIERES}];
      varying float vB;
      varying vec3 vC;
      void main() {
        vec3 p = position;
        p.y = mod(p.y - uTempsV * 1100.0, 900.0);
        p += vec3(0.14, -1.0, 0.0) * longueur * bout; // vent léger : la pluie tombe en biais
        vB = bout;
        vec3 c = vec3(0.2);
        for (int i = 0; i < ${N_LUMIERES}; i++) {
          vec3 d = p - uLumPos[i];
          c += uLumCol[i] * 1.1 / (1.0 + dot(d, d) / 3600.0);
        }
        vC = c;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uIntensite;
      uniform vec3 uCouleur;
      varying float vB;
      varying vec3 vC;
      void main() { gl_FragColor = vec4(uCouleur * vC * (1.0 - vB) * uIntensite, 1.0); }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const pluie = new LineSegments(geo, mat);
  pluie.frustumCulled = false;
  return pluie;
}

// Éclaboussures au sol, près de la caméra : de petits anneaux qui naissent et s'effacent.
function creerEclaboussures(n, lumieres) {
  const pos = new Float32Array(n * 3);
  const phase = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = MathUtils.randFloat(-RUE.facade, RUE.facade);
    const y = Math.abs(x) > RUE.chaussee ? RUE.trottoir + 0.2 : 0.3;
    pos.set([x, y, MathUtils.randFloat(-700, 560)], i * 3);
    phase[i] = Math.random();
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('phase', new BufferAttribute(phase, 1));
  const mat = new ShaderMaterial({
    uniforms: { uTempsV: { value: 0 }, uIntensite: { value: 0 }, uEchelle: { value: 1 }, ...lumieres },
    vertexShader: /* glsl */ `
      attribute float phase;
      uniform float uTempsV, uEchelle;
      uniform vec3 uLumPos[${N_LUMIERES}];
      uniform vec3 uLumCol[${N_LUMIERES}];
      varying float vVie;
      varying vec3 vC;
      void main() {
        float vie = fract(uTempsV * 1.7 + phase * 13.0);
        vVie = vie;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = step(vie, 0.25) * (1.5 + vie * 26.0) * uEchelle * 260.0 / max(-mv.z, 1.0);
        vec3 c = vec3(0.2);
        for (int i = 0; i < ${N_LUMIERES}; i++) {
          vec3 d = position - uLumPos[i];
          c += uLumCol[i] * 1.6 / (1.0 + dot(d, d) / 6400.0);
        }
        vC = c;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uIntensite;
      varying float vVie;
      varying vec3 vC;
      void main() {
        vec2 q = (gl_PointCoord - 0.5) * vec2(1.0, 3.0); // vu en biais : une ellipse
        float r = length(q) * 2.0;
        float anneau = smoothstep(1.0, 0.75, r) * smoothstep(0.45, 0.75, r);
        float a = anneau * (1.0 - vVie / 0.25) * uIntensite;
        if (a < 0.003) discard;
        gl_FragColor = vec4(vC * a, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const p = new Points(geo, mat);
  p.frustumCulled = false;
  return p;
}

// Couleur du dégradé MSI en un point (pour les lumières des enseignes).
function couleurDegrade(t) {
  const k = MathUtils.clamp(t, 0, 1) * 3;
  const i = Math.min(2, Math.floor(k));
  return DEGRADE_MSI[i].clone().lerp(DEGRADE_MSI[i + 1], k - i);
}

function chargerTexture(chargeur, chemin, { couleur = false, repetition = 1 } = {}) {
  const t = chargeur.load(chemin);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(repetition, repetition);
  t.anisotropy = 8;
  if (couleur) t.colorSpace = SRGBColorSpace;
  return t;
}

export function creerVille(scene, renderer) {
  const groupe = new Group();
  groupe.name = 'ville';
  groupe.visible = false;
  scene.add(groupe);

  const uniformes = {
    uEtape: { value: -1 },
    uTuile: { value: TUILE },
    uTempsV: { value: 0 },
    uFil: { value: COULEURS.alu.clone().multiplyScalar(0.7) },
    uFenetre: { value: COULEURS.blanc.clone().multiplyScalar(0.22) },
  };

  // --- textures (ambientCG, CC0) ---------------------------------------------------
  const chargeur = new TextureLoader();
  const tex = (dossier, nom, o) => chargerTexture(chargeur, new URL(`../../assets/textures/${dossier}/${nom}.jpg`, import.meta.url).href, o);
  const beton = { map: tex('concrete036', 'color', { couleur: true }), roughnessMap: tex('concrete036', 'roughness'), normalMap: tex('concrete036', 'normal') };
  const asphalte = { map: tex('asphalt025c', 'color', { couleur: true }), roughnessMap: tex('asphalt025c', 'roughness'), normalMap: tex('asphalt025c', 'normal') };

  // --- géométrie ----------------------------------------------------------------
  const v = genererVille(11);
  const ombres = (m, porte = true) => {
    m.castShadow = porte;
    m.receiveShadow = true;
    return m;
  };

  const matFacade = brancherEtapes(
    new MeshStandardMaterial({ color: new Color('#383a40'), ...beton, roughness: 1, metalness: 0.05, envMapIntensity: ENV }),
    uniformes,
    { fenetres: true },
  );
  matFacade.normalScale.set(0.7, 0.7);
  const matMetal = brancherEtapes(new MeshStandardMaterial({ color: new Color('#2c2e33'), roughness: 0.5, metalness: 0.55, envMapIntensity: ENV }), uniformes);
  const matRoute = brancherEtapes(new MeshStandardMaterial({ color: new Color('#9a9ca0'), ...asphalte, roughness: 1, metalness: 0.05, envMapIntensity: ENV }), uniformes, { sol: true });
  const matTrottoir = brancherEtapes(new MeshStandardMaterial({ color: new Color('#303236'), ...beton, roughness: 0.9, metalness: 0.0, envMapIntensity: ENV }), uniformes);
  const matPeinture = brancherEtapes(new MeshStandardMaterial({ color: new Color('#6a6c70'), roughness: 0.7, metalness: 0.0 }), uniformes);

  groupe.add(ombres(new Mesh(v.facades.geometrie(), matFacade)));
  groupe.add(ombres(new Mesh(v.metal.geometrie(), matMetal)));
  groupe.add(ombres(new Mesh(v.route.geometrie(), matRoute), false));
  groupe.add(ombres(new Mesh(v.trottoirs.geometrie(), matTrottoir)));
  groupe.add(ombres(new Mesh(v.peinture.geometrie(), matPeinture), false));

  // --- îlots lointains : volumes simples instanciés, avec fenêtres --------------------
  const geoBloc = new BoxGeometry(1, 1, 1);
  geoBloc.translate(0, 0.5, 0);
  geoBloc.setAttribute('uvBord', geoBloc.attributes.uv.clone());
  const fenBloc = new Float32Array(geoBloc.attributes.position.count);
  for (let i = 0; i < fenBloc.length; i++) fenBloc[i] = i >= 8 && i < 16 ? 0 : 1; // faces +y et -y sans fenêtres
  geoBloc.setAttribute('fen', new BufferAttribute(fenBloc, 1));
  geoBloc.setAttribute('t', new BufferAttribute(new Float32Array(fenBloc.length), 1));
  const matLointain = brancherEtapes(new MeshStandardMaterial({ color: new Color('#17181b'), roughness: 0.8, metalness: 0.2, envMapIntensity: ENV }), uniformes, { fenetres: true });
  const blocs = new InstancedMesh(geoBloc, matLointain, v.blocs.length);
  const m4 = new Matrix4();
  const gB = new Float32Array(v.blocs.length);
  const sB = new Float32Array(v.blocs.length * 4);
  const oB = new Float32Array(v.blocs.length * 2);
  v.blocs.forEach(([x, z, l, p, h, base, g], i) => {
    m4.makeScale(l, h, p);
    m4.setPosition(x, base, z);
    blocs.setMatrixAt(i, m4);
    gB[i] = g;
    sB.set([18 + g * 8, 22 + g * 4, 0.5 + g * 0.2, 0.55], i * 4);
    oB.set([z - p / 2, base], i * 2);
  });
  blocs.geometry.setAttribute('graine', new InstancedBufferAttribute(gB, 1));
  blocs.geometry.setAttribute('style', new InstancedBufferAttribute(sB, 4));
  blocs.geometry.setAttribute('origine', new InstancedBufferAttribute(oB, 2));
  ombres(blocs);
  blocs.computeBoundingSphere();
  groupe.add(blocs);

  // grand sol sous tout le quartier (au-delà de la rue)
  const geoSol = new PlaneGeometry(4200, 5600);
  geoSol.setAttribute('uvBord', geoSol.attributes.uv.clone());
  const matSol = brancherEtapes(new MeshStandardMaterial({ color: new Color('#0b0b0d'), roughness: 0.6, metalness: 0.1, envMapIntensity: ENV }), uniformes, { sol: true });
  const sol = new Mesh(geoSol, matSol);
  sol.rotation.x = -Math.PI / 2;
  sol.position.set(0, -1.2, -1200);
  sol.receiveShadow = true;
  groupe.add(sol);

  // --- néons, lampadaires -----------------------------------------------------------
  const neons = new Mesh(v.neons.geometrie(), materiauNeon(uniformes));
  neons.userData.neon = true;
  groupe.add(neons);
  const lampes = new Mesh(v.lampes.geometrie(), materiauLampe(uniformes));
  lampes.userData.neon = true;
  groupe.add(lampes);

  // halos des enseignes proches
  const choisies = v.enseignes.filter((e) => e.centre[2] > -2200);
  const geoHalo = new BufferGeometry();
  {
    const n = choisies.length;
    const centre = new Float32Array(n * 4 * 3);
    const coin = new Float32Array(n * 4 * 2);
    const taille = new Float32Array(n * 4);
    const couleur = new Float32Array(n * 4 * 3);
    const idx = [];
    choisies.forEach((e, i) => {
      const c = couleurDegrade(e.couleur * 0.45 + 0.3);
      [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ].forEach(([a, b], k) => {
        centre.set(e.centre, (i * 4 + k) * 3);
        coin.set([a, b], (i * 4 + k) * 2);
        taille[i * 4 + k] = Math.max(40, e.taille * 0.9);
        couleur.set([c.r, c.g, c.b], (i * 4 + k) * 3);
      });
      idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
    });
    geoHalo.setAttribute('position', new BufferAttribute(centre.slice(), 3));
    geoHalo.setAttribute('centre', new BufferAttribute(centre, 3));
    geoHalo.setAttribute('coin', new BufferAttribute(coin, 2));
    geoHalo.setAttribute('taille', new BufferAttribute(taille, 1));
    geoHalo.setAttribute('couleur', new BufferAttribute(couleur, 3));
    geoHalo.setIndex(idx);
  }
  const halos = new Mesh(geoHalo, materiauHalo(uniformes));
  halos.frustumCulled = false;
  halos.userData.horsBloom = true;
  groupe.add(halos);

  // cônes de lumière sous les lampadaires (diffusion dans la pluie)
  const cones = v.lampadaires.map(([x, y, z]) => {
    const g = new CylinderGeometry(3, 34, y - 1, 24, 1, true);
    const h = new Float32Array(g.attributes.position.count);
    for (let i = 0; i < h.length; i++) h[i] = 0.5 - g.attributes.position.getY(i) / (y - 1);
    g.setAttribute('hauteur', new BufferAttribute(h, 1));
    g.translate(x, y / 2, z);
    return g;
  });
  const cone = new Mesh(mergeGeometries(cones), materiauCone(uniformes));
  cone.userData.horsBloom = true;
  groupe.add(cone);

  // --- lumières des enseignes (les plus grandes, près de la caméra) ---------------------
  const proches = v.enseignes
    .filter((e) => e.centre[2] > -1100 && e.centre[2] < 620)
    .sort((a, b) => b.taille - a.taille)
    .slice(0, 10);
  const lumieres = proches.map((e) => {
    const c = couleurDegrade(e.couleur * 0.45 + 0.3);
    const l = new PointLight(c, 0, 460, 1.6);
    // un peu vers la rue : la lumière tombe sur le trottoir et la façade d'en face
    l.position.set(e.centre[0] * 0.8, e.centre[1], e.centre[2]);
    groupe.add(l);
    return l;
  });
  const lumPos = Array.from({ length: N_LUMIERES }, (_, i) => new Vector3(...(proches[i]?.centre ?? [0, -9999, 0])));
  const lumCol = Array.from({ length: N_LUMIERES }, (_, i) => (proches[i] ? couleurDegrade(proches[i].couleur * 0.45 + 0.3) : new Color(0, 0, 0)));
  const uLum = { uLumPos: { value: lumPos }, uLumCol: { value: lumCol.map((c) => c.clone().multiplyScalar(0)) } };

  // --- flaques (reflets) ---------------------------------------------------------------
  const flaques = new Reflector(new PlaneGeometry(RUE.facade * 2 + 8, 4200), {
    shader: FlaquesShader,
    textureWidth: 1024,
    textureHeight: 1024,
    clipBias: 0.003,
    multisample: 0,
  });
  flaques.material.transparent = true;
  flaques.material.blending = AdditiveBlending;
  flaques.material.depthWrite = false;
  flaques.material.uniforms.uEtape = uniformes.uEtape;
  flaques.material.uniforms.uTuile = uniformes.uTuile;
  flaques.material.uniforms.uTempsV = uniformes.uTempsV;
  flaques.material.uniforms.tRugosite.value = asphalte.roughnessMap;
  flaques.rotation.x = -Math.PI / 2;
  flaques.position.set(0, 0.5, -900);
  flaques.userData.horsBloom = true;
  groupe.add(flaques);

  // --- pluie, éclaboussures, lune -------------------------------------------------------
  const pluie = creerPluie(9000, uLum);
  groupe.add(pluie);
  const eclaboussures = creerEclaboussures(1800, uLum);
  groupe.add(eclaboussures);

  const lune = new DirectionalLight(new Color('#c9cfdb'), 0);
  lune.position.set(-600, 900, 300);
  lune.target.position.set(0, 0, -700);
  lune.castShadow = true;
  lune.shadow.mapSize.set(2048, 2048);
  Object.assign(lune.shadow.camera, { left: -1300, right: 1300, top: 1600, bottom: -1600, near: 10, far: 3500 });
  lune.shadow.bias = -0.0006;
  lune.shadow.normalBias = 1.5;
  groupe.add(lune, lune.target);

  const brouillard = new FogExp2(0x000000, 0);
  scene.fog = brouillard;
  const DENSITE = 0.00042;

  function redimensionner() {
    const dpr = renderer.getPixelRatio();
    uniformes.uTuile.value = TUILE * dpr;
    eclaboussures.material.uniforms.uEchelle.value = dpr;
    flaques.getRenderTarget().setSize(Math.round((innerWidth * dpr) / 2), Math.round((innerHeight * dpr) / 2));
  }
  addEventListener('resize', redimensionner);
  redimensionner();

  const densites = [neons, lampes, halos, cone].map((o) => o.material.uniforms.uDensite);

  return {
    groupe,
    redimensionner,
    maj(dt, E) {
      const visible = E.ville > 0.5;
      groupe.visible = visible;
      brouillard.density = visible ? DENSITE : 0;
      if (!visible) return;
      // une passe terminée reste exactement entière (pas de liseré résiduel)
      uniformes.uEtape.value = Math.abs(E.etape - Math.round(E.etape)) < 0.002 ? Math.round(E.etape) : E.etape;
      uniformes.uTempsV.value += dt;
      for (const d of densites) d.value = DENSITE;
      const tps = uniformes.uTempsV.value;
      pluie.material.uniforms.uTempsV.value = tps;
      pluie.material.uniforms.uIntensite.value = E.pluie * 0.24;
      eclaboussures.material.uniforms.uTempsV.value = tps;
      eclaboussures.material.uniforms.uIntensite.value = E.pluie * 0.5;
      lune.intensity = E.lune * 0.45; // clair de lune faible : la rue vit de ses néons
      for (const l of lumieres) l.intensity = E.neonsVille * 6000;
      uLum.uLumCol.value.forEach((c, i) => c.copy(lumCol[i]).multiplyScalar(E.neonsVille));
      halos.material.uniforms.uHalo.value = E.neonsVille * 0.07 * (0.6 + 0.4 * E.pluie);
      lampes.material.uniforms.uLampes.value = E.neonsVille;
      cone.material.uniforms.uLampes.value = E.neonsVille * (0.5 + 0.5 * E.pluie);
      flaques.visible = E.etape > 2;
    },
  };
}
