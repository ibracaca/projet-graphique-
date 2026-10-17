import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
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
  ShaderMaterial,
  Vector3,
} from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { COULEURS, DEGRADE_MSI } from '../couleurs.js';

// ---------------------------------------------------------------------------
// Beat 12, le rendu qui se calcule : une ville nocturne inventée, sous la pluie.
// Elle se calcule sous nos yeux, par tuiles d'écran, comme un moteur de rendu :
//   E.etape (continu) : −1 noir, 0 fil de fer, 1 polygones, 2 ombres, 3 ray tracing.
//   Entre deux étapes, chaque tuile bascule à son tour (ordre tiré au hasard),
//   avec un liseré au moment où elle est calculée. DLSS (étape 5) est fait en
//   post-traitement (rendu.js) : avant lui, l'image du ray tracing est bruitée et
//   en basse définition.
// Unités : celles de la scène (la carte mesure 359) ; une rue de 160 de large.
// Pas de texte décoratif, pas de glitch : enseignes abstraites aux couleurs MSI.
// ---------------------------------------------------------------------------

const TUILE = 56; // px

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

// Bâtiments et sol : matériau physique de Three.js (ombres, brouillard), auquel
// on greffe les étapes.
function brancherEtapes(materiau, uniformes, { sol = false } = {}) {
  materiau.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniformes);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMondeV;\nvarying vec2 vUvB;\nvarying vec3 vEchelle;\nattribute float graine;\nvarying float vGraine;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec4 pm = vec4(transformed, 1.0);
        vEchelle = vec3(1.0);
        #ifdef USE_INSTANCING
          pm = instanceMatrix * pm;
          vEchelle = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
          vGraine = graine;
        #else
          vGraine = 0.0;
        #endif
        vMondeV = (modelMatrix * pm).xyz;
        vUvB = uv;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vMondeV;
        varying vec2 vUvB;
        varying vec3 vEchelle;
        varying float vGraine;
        uniform vec3 uFil, uFenetre;
        ${GLSL_TUILES}
        // 1 près du bord de la cellule (|d| proche de 0,5), 0 ailleurs
        float ligne(float d, float l) { float a = fwidth(d) * 0.8; return smoothstep(l - a, l + a, abs(d)); }`,
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        float frais;
        float eLoc = etapeLocale(frais);
        if (eLoc < -0.5) discard;
        vec3 nMonde = normalize(cross(dFdx(vMondeV), dFdy(vMondeV)));`,
      )
      .replace(
        '#include <opaque_fragment>',
        `${
          sol
            ? `// sol : quadrillage des rues en fil de fer
          float fil = max(ligne(fract(vMondeV.x / 80.0) - 0.5, 0.5 - 0.012), ligne(fract(vMondeV.z / 80.0) - 0.5, 0.5 - 0.012));`
            : `// bâtiments : arêtes des faces, et une ligne par étage
          vec2 d = min(vUvB, 1.0 - vUvB);
          float fil = 1.0 - smoothstep(0.0, fwidth(min(d.x, d.y)) * 1.5, min(d.x, d.y));
          float hEtage = vUvB.y * vEchelle.y / 46.0;
          fil = max(fil, ligne(fract(hEtage) - 0.5, 0.5 - 0.01) * step(abs(nMonde.y), 0.5) * 0.5);`
        }
        if (eLoc < 0.5) {
          if (fil < 0.05) discard;
          outgoingLight = uFil * fil;
        } else if (eLoc < 1.5) {
          // polygones : facettes grises, éclairage plat, sans ombres
          float l = 0.03 + 0.11 * max(dot(normal, normalize(vec3(-0.4, 0.7, 0.5))), 0.0);
          outgoingLight = vec3(l);
        } else {
          ${
            sol
              ? ''
              : `// fenêtres : une grille, quelques-unes allumées (blanc cassé, très faible)
          vec2 g = vec2(vUvB.x * max(vEchelle.x, vEchelle.z) / 22.0, vUvB.y * vEchelle.y / 23.0);
          vec2 cel = fract(g);
          float vitre = step(0.25, cel.x) * step(cel.x, 0.75) * step(0.3, cel.y) * step(cel.y, 0.8);
          float allumee = step(0.93, hashT(floor(g) + vGraine * 91.0));
          float facade = step(abs(nMonde.y), 0.5);
          // au loin, les fenêtres deviennent trop petites : on les fond en une lueur moyenne
          float trop = smoothstep(0.12, 0.45, max(fwidth(g.x), fwidth(g.y)));
          float f = mix(vitre * allumee * (0.5 + 0.5 * hashT(floor(g) * 1.7)), 0.05, trop);
          outgoingLight += uFenetre * f * facade;`
          }
        }
        outgoingLight += vec3(0.5) * frais * cadreTuile();
        #include <opaque_fragment>`,
      );
  };
  materiau.customProgramCacheKey = () => `etapes-${sol}`;
}

// Enseignes : barres de néon abstraites, verticales ou horizontales.
function materiauEnseigne(uniformes) {
  return new ShaderMaterial({
    uniforms: { ...uniformes, uC0: { value: DEGRADE_MSI[0] }, uC1: { value: DEGRADE_MSI[1] }, uC2: { value: DEGRADE_MSI[2] }, uC3: { value: DEGRADE_MSI[3] } },
    vertexShader: /* glsl */ `
      attribute float graine;
      varying vec2 vUvB;
      varying float vGraine;
      void main() {
        vUvB = uv;
        vGraine = graine;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_TUILES}
      uniform vec3 uC0, uC1, uC2, uC3, uFil;
      varying vec2 vUvB;
      varying float vGraine;
      vec3 degrade(float t) {
        t = clamp(t, 0.0, 1.0) * 3.0;
        if (t < 1.0) return mix(uC0, uC1, t);
        if (t < 2.0) return mix(uC1, uC2, t - 1.0);
        return mix(uC2, uC3, t - 2.0);
      }
      void main() {
        float frais;
        float eLoc = etapeLocale(frais);
        if (eLoc < 1.5) discard; // les enseignes s'allument avec la lumière (étape 2)
        // chaque enseigne porte une portion du dégradé ; un léger battement de tube
        float t = fract(vGraine * 3.7) * 0.6 + vUvB.y * 0.4;
        float battement = 0.92 + 0.08 * sin(uTempsV * (2.0 + vGraine * 5.0) + vGraine * 40.0);
        gl_FragColor = vec4(degrade(t) * 2.4 * battement, 1.0);
      }
    `,
    toneMapped: false,
  });
}

// Reflets dans les flaques : texture du Reflector, masquée par des flaques
// (bruit), déformée par les gouttes. Visible à partir de l'étape 3.
const FlaquesShader = {
  name: 'Flaques',
  uniforms: {
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
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
    uniform sampler2D tDiffuse;
    varying vec4 vUv;
    varying vec3 vMonde;
    ${GLSL_TUILES}
    float bruit(vec2 p) {
      vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
      float a = hashT(i), b = hashT(i + vec2(1, 0)), c = hashT(i + vec2(0, 1)), d = hashT(i + vec2(1, 1));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    void main() {
      float frais;
      float eLoc = etapeLocale(frais);
      if (eLoc < 2.5) discard;
      vec2 p = vMonde.xz / 70.0;
      float flaque = smoothstep(0.42, 0.6, bruit(p) * 0.65 + bruit(p * 2.3) * 0.35);
      // impacts de pluie : petits anneaux qui déforment le reflet
      vec2 cel = floor(vMonde.xz / 9.0);
      vec2 r = fract(vMonde.xz / 9.0) - 0.5;
      float t = fract(uTempsV * 1.3 + hashT(cel));
      float anneau = sin(clamp((length(r) - t * 0.5) * 40.0, -3.1416, 3.1416)) * (1.0 - t) * step(length(r), t * 0.5 + 0.08);
      vec4 uv = vUv;
      uv.xy += anneau * 0.6 * uv.w * 0.01;
      vec3 c = texture2DProj(tDiffuse, uv).rgb;
      float fondu = smoothstep(2600.0, 600.0, length(vMonde.xz - vec2(0.0, -200.0)));
      gl_FragColor = vec4(c * (0.25 + 0.75 * flaque) * fondu, 1.0);
    }
  `,
};

function creerPluie(n) {
  const pos = new Float32Array(n * 6);
  const bout = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const x = MathUtils.randFloat(-700, 700);
    const y = MathUtils.randFloat(0, 900);
    const z = MathUtils.randFloat(-1600, 600);
    pos.set([x, y, z, x, y, z], i * 6);
    bout.set([0, 1], i * 2);
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('bout', new BufferAttribute(bout, 1));
  const mat = new ShaderMaterial({
    uniforms: { uTempsV: { value: 0 }, uIntensite: { value: 0 }, uCouleur: { value: COULEURS.blanc } },
    vertexShader: /* glsl */ `
      attribute float bout;
      uniform float uTempsV;
      varying float vB;
      void main() {
        vec3 p = position;
        p.y = mod(p.y - uTempsV * 1100.0, 900.0);
        p += vec3(0.14, -1.0, 0.0) * 26.0 * bout; // vent léger : la pluie tombe en biais
        vB = bout;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uIntensite;
      uniform vec3 uCouleur;
      varying float vB;
      void main() { gl_FragColor = vec4(uCouleur * (1.0 - vB) * uIntensite, 1.0); }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const pluie = new LineSegments(geo, mat);
  pluie.frustumCulled = false;
  return pluie;
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
    uFenetre: { value: COULEURS.blanc.clone().multiplyScalar(0.2) },
  };

  // --- bâtiments : des îlots de part et d'autre d'une longue rue ------------
  let graine = 11;
  const alea = () => ((graine = (graine * 16807) % 2147483647) / 2147483647);
  const boites = [];
  const enseignes = [];
  for (const cote of [-1, 1]) {
    for (let col = 0; col < 5; col++) {
      for (let rang = 0; rang < 18; rang++) {
        const x0 = cote * (95 + col * 190);
        const z0 = 520 - rang * 190;
        const l = 150 + alea() * 30;
        const p = 150 + alea() * 30;
        // plus haut au loin et au centre : la ville se dresse au bout de la rue
        let h = 160 + alea() * 380 + rang * 22 + (col === 0 ? alea() * 200 : col * 60);
        const cx = x0 + (cote * l) / 2;
        boites.push([cx, z0, l, p, h]);
        // gradins : un ou deux volumes en retrait au-dessus
        let ll = l;
        let pp = p;
        let base = h;
        for (let k = 0; k < 2 && alea() < 0.6; k++) {
          ll *= 0.55 + alea() * 0.25;
          pp *= 0.55 + alea() * 0.25;
          const hh = 60 + alea() * 260;
          boites.push([cx + (alea() - 0.5) * (l - ll) * 0.5, z0 + (alea() - 0.5) * (p - pp) * 0.5, ll, pp, hh, base]);
          base += hh;
        }
        // enseignes sur la façade côté rue, pour les deux premières colonnes
        if (col === 0 && alea() < 0.7) {
          const fx = x0 + cote * 1.5;
          const vert = alea() < 0.6;
          const y = 30 + alea() * 160;
          const zz = z0 + (alea() - 0.5) * p * 0.6;
          enseignes.push(vert ? [fx, y, zz, 3, 50 + alea() * 160, 7] : [fx, y, zz, 3, 5, 40 + alea() * 70]);
          if (alea() < 0.4) enseignes.push([fx, y + 30 + alea() * 80, zz + (alea() - 0.5) * 50, 3, 4, 30 + alea() * 50]);
        }
      }
    }
  }

  const geoBoite = new BoxGeometry(1, 1, 1);
  geoBoite.translate(0, 0.5, 0);
  const matBat = new MeshStandardMaterial({ color: new Color('#1a1b1f'), roughness: 0.72, metalness: 0.2, envMapIntensity: 0.25 });
  brancherEtapes(matBat, uniformes);
  const batiments = new InstancedMesh(geoBoite, matBat, boites.length);
  const m4 = new Matrix4();
  const graines = new Float32Array(boites.length);
  boites.forEach(([x, z, l, p, h, base = 0], i) => {
    m4.makeScale(l, h, p);
    m4.setPosition(x, base, z);
    batiments.setMatrixAt(i, m4);
    graines[i] = alea();
  });
  batiments.geometry.setAttribute('graine', new InstancedBufferAttribute(graines, 1));
  batiments.castShadow = true;
  batiments.receiveShadow = true;
  batiments.computeBoundingSphere();
  groupe.add(batiments);

  // --- enseignes --------------------------------------------------------------
  const geoEns = new BoxGeometry(1, 1, 1);
  const ens = new InstancedMesh(geoEns, materiauEnseigne(uniformes), enseignes.length);
  const gEns = new Float32Array(enseignes.length);
  enseignes.forEach(([x, y, z, sx, sy, sz], i) => {
    m4.makeScale(sx, sy, sz);
    m4.setPosition(x, y, z);
    ens.setMatrixAt(i, m4);
    gEns[i] = alea();
  });
  ens.geometry.setAttribute('graine', new InstancedBufferAttribute(gEns, 1));
  ens.userData.neon = true;
  ens.computeBoundingSphere();
  groupe.add(ens);

  // --- sol --------------------------------------------------------------------
  const matSol = new MeshStandardMaterial({ color: new Color('#0c0c0e'), roughness: 0.55, metalness: 0.1, envMapIntensity: 0.2 });
  brancherEtapes(matSol, uniformes, { sol: true });
  const sol = new Mesh(new PlaneGeometry(4200, 5200), matSol);
  sol.rotation.x = -Math.PI / 2;
  sol.position.z = -1000;
  sol.receiveShadow = true;
  groupe.add(sol);

  // --- flaques (reflets) ----------------------------------------------------
  const flaques = new Reflector(new PlaneGeometry(1400, 4200), {
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
  flaques.rotation.x = -Math.PI / 2;
  flaques.position.set(0, 0.5, -900);
  flaques.userData.horsBloom = true;
  groupe.add(flaques);

  // --- pluie, lumières ------------------------------------------------------
  const pluie = creerPluie(5000);
  groupe.add(pluie);

  const lune = new DirectionalLight(new Color('#c9cfdb'), 0);
  lune.position.set(-600, 900, 300);
  lune.target.position.set(0, 0, -700);
  lune.castShadow = true;
  lune.shadow.mapSize.set(2048, 2048);
  Object.assign(lune.shadow.camera, { left: -1300, right: 1300, top: 1600, bottom: -1600, near: 10, far: 3500 });
  lune.shadow.bias = -0.0006;
  lune.shadow.normalBias = 1.5;
  groupe.add(lune, lune.target);

  // les enseignes éclairent la rue (quelques lumières, aux couleurs du dégradé)
  const lumieres = enseignes.slice(0, 10).map(([x, y, z], i) => {
    const l = new PointLight(DEGRADE_MSI[i % 4].clone(), 0, 420, 1.6);
    l.position.set(x * 0.85, y, z);
    groupe.add(l);
    return l;
  });

  const brouillard = new FogExp2(0x000000, 0);
  scene.fog = brouillard;

  function redimensionner() {
    const dpr = renderer.getPixelRatio();
    uniformes.uTuile.value = TUILE * dpr;
    flaques.getRenderTarget().setSize(Math.round((innerWidth * dpr) / 2), Math.round((innerHeight * dpr) / 2));
  }
  addEventListener('resize', redimensionner);
  redimensionner();

  return {
    groupe,
    redimensionner,
    maj(dt, E) {
      const visible = E.ville > 0.5;
      groupe.visible = visible;
      brouillard.density = visible ? 0.00042 : 0;
      if (!visible) return;
      // une passe terminée reste exactement entière (pas de liseré résiduel)
      uniformes.uEtape.value = Math.abs(E.etape - Math.round(E.etape)) < 0.002 ? Math.round(E.etape) : E.etape;
      uniformes.uTempsV.value += dt;
      pluie.material.uniforms.uTempsV.value = uniformes.uTempsV.value;
      pluie.material.uniforms.uIntensite.value = E.pluie * 0.32;
      lune.intensity = E.lune;
      for (const l of lumieres) l.intensity = E.neonsVille * 6000;
      flaques.visible = E.etape > 2;
    },
  };
}
