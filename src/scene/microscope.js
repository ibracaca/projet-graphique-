import {
  AdditiveBlending,
  DataTexture,
  Mesh,
  NearestFilter,
  NormalBlending,
  PlaneGeometry,
  RGBAFormat,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
} from 'three';
import { COULEURS, DEGRADE_MSI } from '../couleurs.js';

// ---------------------------------------------------------------------------
// Le microscope (beats 7 et 8) : un zoom continu de la puce jusqu'aux transistors,
// dessiné par un shader plein écran. On ne peut pas zoomer physiquement de 10⁻¹ à
// 10⁻⁸ m dans une scène en millimètres (précision des flottants) : on fait comme
// le film « Powers of Ten », une suite de couches dont chacune vit sur une plage
// d'échelles et se fond dans la suivante.
//   uZoom = log10 de la largeur de champ, en mètres (−1,3 : la puce entière).
// Couches :
//   1. le plan de la puce GB202 : 12 GPC de 16 SM (organisation relevée sur les
//      analyses de photos de la puce), cache L2 au centre, interfaces mémoire au bord.
//      Chaque SM : 4 blocs de 32 cœurs CUDA (128 par SM, chiffre officiel).
//   2. l'intérieur d'un SM : blocs logiques et mémoires ;
//   3. cellules standard et pistes de métal ;
//   4. les transistors : ailettes (FinFET) traversées par les grilles.
// La 2ᵉ passe (« néon ») ne dessine que les vagues de lumière des SM (bloom).
// ---------------------------------------------------------------------------

// Plan de la puce, en mètres, origine au centre du die (die de 25,5 × 29,4 mm).
export const PLAN = (() => {
  const hx = 0.01275;
  const hy = 0.0147;
  const phyX = 0.0016;
  const phyY = 0.0012;
  const l2 = 0.0021;
  const ecart = 0.0005;
  const x0 = -hx + phyX;
  const cw = (2 * (hx - phyX)) / 6;
  const gh = hy - phyY - ecart - (l2 + ecart);
  const smw = (cw - ecart) / 2;
  const smh = gh / 8;
  const centres = [];
  for (let g = 0; g < 12; g++) {
    const gc = g % 6;
    const haut = g < 6;
    for (let s = 0; s < 16; s++) {
      const col = s % 2;
      const row = Math.floor(s / 2);
      const x = x0 + gc * cw + ecart / 2 + (col + 0.5) * smw;
      const yy = l2 + ecart + (row + 0.5) * smh;
      centres.push([x, haut ? yy : -yy]);
    }
  }
  return { hx, hy, phyX, phyY, l2, ecart, x0, cw, gh, smw, smh, centres };
})();

// SM visé par le zoom : GPC 1, SM 6.
export const CENTRE_ZOOM = new Vector2(...PLAN.centres[1 * 16 + 6]);

const P = PLAN;
const f = (v) => v.toExponential(6);

const FRAGMENT = /* glsl */ `
  uniform float uZoom, uTilt, uRot, uTemps, uRatio, uTanF, uVisible, uMode;
  uniform vec2 uCentre;
  uniform sampler2D uSM;
  uniform vec3 uC0, uC1, uC2, uC3, uAlu, uAcier, uGraphite, uBlanc;
  varying vec2 vUv;

  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

  vec3 degrade(float t) {
    t = clamp(t, 0.0, 1.0) * 3.0;
    if (t < 1.0) return mix(uC0, uC1, t);
    if (t < 2.0) return mix(uC1, uC2, t - 1.0);
    return mix(uC2, uC3, t - 2.0);
  }

  // fenêtre d'échelle : visible pour bas < uZoom < haut, fondus de 0,6 décade
  float poids(float haut, float bas) {
    return (1.0 - smoothstep(haut - 0.6, haut, uZoom)) * smoothstep(bas, bas + 0.6, uZoom);
  }

  // trait antialiasé : 1 sur une bande de demi-largeur l (dans l'unité de d)
  float trait(float d, float l) { float a = fwidth(d) * 0.75; return 1.0 - smoothstep(l - a, l + a, abs(d)); }
  float boite(vec2 q, vec2 h) { vec2 d = abs(q) - h; vec2 a = fwidth(q) * 0.75; return (1.0 - smoothstep(-a.x, a.x, d.x)) * (1.0 - smoothstep(-a.y, a.y, d.y)); }

  // --- Couche 1 : le plan de la puce --------------------------------------
  vec4 couchePuce(vec2 q) {
    vec3 c = vec3(0.0);
    float neon = 0.0;
    vec3 neonC = vec3(0.0);
    float dansDie = boite(q, vec2(${f(P.hx)}, ${f(P.hy)}));
    if (dansDie <= 0.0) return vec4(0.0);
    c = uGraphite * 0.16;
    // bord : interfaces mémoire (stries fines)
    float bordX = step(${f(P.hx - P.phyX)}, abs(q.x));
    float bordY = step(${f(P.hy - P.phyY)}, abs(q.y));
    float stries = 0.5 + 0.5 * sin(q.y * 9000.0 * 6.2832 * (1.0 - bordY) + q.x * 9000.0 * 6.2832 * bordY);
    c += uAcier * 0.22 * max(bordX, bordY) * smoothstep(0.3, 0.9, stries);
    // cache L2 : grille de cellules mémoire
    if (abs(q.y) < ${f(P.l2)} && bordX < 0.5) {
      vec2 g = fract(q / vec2(0.00018, 0.00022));
      c += uAcier * 0.18 * boite(g - 0.5, vec2(0.4, 0.38));
    }
    // GPC et SM
    float y = abs(q.y) - ${f(P.l2 + P.ecart)};
    float x = q.x - ${f(P.x0)};
    if (y > 0.0 && y < ${f(P.gh)} && x > 0.0 && x < ${f(6 * P.cw)}) {
      float gc = floor(x / ${f(P.cw)});
      float xl = x - gc * ${f(P.cw)} - ${f(P.ecart / 2)};
      if (xl > 0.0 && xl < ${f(2 * P.smw)}) {
        float col = floor(xl / ${f(P.smw)});
        float row = floor(y / ${f(P.smh)});
        float g = gc + (q.y < 0.0 ? 6.0 : 0.0);
        float s = row * 2.0 + col;
        vec4 etat = texture2D(uSM, (vec2(s, g) + 0.5) / vec2(16.0, 12.0));
        vec2 uv = vec2((xl - col * ${f(P.smw)}) / ${f(P.smw)}, (y - row * ${f(P.smh)}) / ${f(P.smh)});
        // contour du SM
        float cadre = 1.0 - boite(uv - 0.5, vec2(0.46, 0.44));
        c += uGraphite * 0.9 * cadre * boite(uv - 0.5, vec2(0.5));
        // 4 blocs de 32 cœurs (4 × 8 points) ; les points n'apparaissent que
        // quand ils sont assez grands à l'écran, sinon le bloc se lit comme une tuile
        vec2 b = fract(uv * 2.0);
        float bloc = boite(b - 0.5, vec2(0.42, 0.42));
        vec2 cel = fract(b * vec2(4.0, 8.0));
        float taillePx = 1.0 / max(fwidth(uv.x * 8.0), 1e-6);
        float detail = smoothstep(4.0, 10.0, taillePx);
        float point = boite(cel - 0.5, vec2(0.28, 0.26)) * bloc;
        float motif = mix(bloc * 0.55, point, detail);
        float actif = etat.r;
        c += mix(uAcier * 0.18 * bloc, uBlanc * 0.8 * motif, actif);
        float pulse = etat.g;
        // la vague ne fait briller qu'un liseré sur chaque bloc : une lueur, pas un aplat
        neon = pulse * mix(bloc * 0.35, point, detail);
        neonC = degrade(1.0 - length(q) / 0.017);
      }
    }
    if (uMode > 0.5) return vec4(neonC * neon * 1.2 * dansDie, 1.0);
    return vec4(c * dansDie, 1.0);
  }

  // --- Couche 2 : l'intérieur d'un SM (blocs logiques et mémoires) ---------
  vec3 coucheSM(vec2 p) {
    vec2 q = p / 2.0e-5;
    vec2 id = floor(q);
    vec2 r = fract(q);
    float h = hash(id);
    vec3 c = uGraphite * 0.12;
    // blocs de tailles variées, certains sont des mémoires (grilles fines)
    vec2 marge = vec2(0.06 + 0.1 * h, 0.08 + 0.1 * fract(h * 7.0));
    float bloc = boite(r - 0.5, 0.5 - marge);
    float memoire = step(0.6, h);
    vec2 m = fract(p / 6.0e-7);
    float grille = boite(m - 0.5, vec2(0.38));
    float rangs = trait(fract(p.y / 1.2e-6) - 0.5, 0.06);
    c += bloc * mix(uAcier * 0.22 + uAlu * 0.12 * rangs, uAlu * 0.3 * grille, memoire);
    c += uGraphite * 0.8 * (bloc - boite(r - 0.5, 0.5 - marge - 0.012));
    return c;
  }

  // --- Couche 3 : cellules standard et pistes de métal --------------------
  vec3 coucheMetal(vec2 p) {
    vec3 c = uGraphite * 0.1;
    // rangées de cellules standard (hauteur 0,2 µm), largeurs variables
    float rangee = floor(p.y / 2.0e-7);
    float xr = p.x / 1.0e-7 + hash(vec2(rangee, 3.0)) * 10.0;
    float cel = floor(xr / (1.0 + floor(hash(vec2(floor(xr / 3.0), rangee)) * 3.0)));
    float lisere = trait(fract(p.y / 2.0e-7) - 0.5, 0.42);
    c += uAcier * 0.16 * (1.0 - lisere) + uGraphite * 0.3 * trait(fract(xr) - 0.5, 0.47);
    // métal 1 : pistes horizontales fines, interrompues
    float m1 = trait(fract(p.y / 4.0e-8) - 0.5, 0.22) * step(0.35, hash(vec2(floor(p.x / 3.0e-7), floor(p.y / 4.0e-8))));
    // métal 2 : pistes verticales plus larges, au-dessus
    float m2 = trait(fract(p.x / 8.0e-8) - 0.5, 0.25) * step(0.5, hash(vec2(floor(p.x / 8.0e-8), floor(p.y / 5.0e-7))));
    // vias aux croisements
    vec2 v = fract(p / vec2(8.0e-8, 4.0e-8)) - 0.5;
    float via = boite(v, vec2(0.12, 0.2)) * m1 * m2;
    c = mix(c, uAcier * 0.5, m1 * 0.85);
    c = mix(c, uAlu * 0.5, m2);
    c += uBlanc * via * 0.5;
    return c;
  }

  // --- Couche 4 : transistors FinFET (relief éclairé) ----------------------
  // pas des ailettes et des grilles : illustratifs (aucune cote affichée).
  // Ailettes fines et serrées, grilles plus espacées : à chaque croisement, un transistor.
  float relief(vec2 p) {
    float ailette = 1.0 - smoothstep(0.10, 0.16, abs(fract(p.x / 1.6e-8) - 0.5));
    float grille = 1.0 - smoothstep(0.09, 0.13, abs(fract(p.y / 4.8e-8) - 0.5));
    return max(ailette * 0.6, grille * 1.0);
  }
  vec3 coucheTransistors(vec2 p) {
    float e = 1.0e-10;
    float h = relief(p);
    float hx = relief(p + vec2(e, 0.0)) - h;
    float hy = relief(p + vec2(0.0, e)) - h;
    vec3 n = normalize(vec3(-hx * 5.0, -hy * 5.0, 1.0));
    vec3 l = normalize(vec3(-0.5, 0.6, 0.7));
    float d = max(dot(n, l), 0.0);
    float spec = pow(max(dot(reflect(-l, n), vec3(0.0, 0.0, 1.0)), 0.0), 20.0);
    float grille = 1.0 - smoothstep(0.09, 0.13, abs(fract(p.y / 4.8e-8) - 0.5));
    vec3 base = mix(uGraphite * 0.5, uAcier * 1.1, h);
    base = mix(base, uAlu * 1.05, grille);
    return base * (0.35 + 0.75 * d) + uBlanc * spec * 0.5;
  }

  void main() {
    vec2 ndc = vUv * 2.0 - 1.0;
    // rayon d'une caméra virtuelle inclinée de uTilt au-dessus du plan
    float s = sin(uTilt);
    float co = cos(uTilt);
    vec3 cam = vec3(0.0, -s, co);
    vec3 avant = vec3(0.0, s, -co);
    vec3 haut = vec3(0.0, co, s);
    vec3 dir = normalize(avant + vec3(1.0, 0.0, 0.0) * ndc.x * uTanF * uRatio + haut * ndc.y * uTanF);
    if (dir.z > -1e-4) { gl_FragColor = vec4(0.0, 0.0, 0.0, uVisible); return; }
    vec2 hit = (cam + dir * (-cam.z / dir.z)).xy;
    float cr = cos(uRot);
    float sr = sin(uRot);
    hit = mat2(cr, sr, -sr, cr) * hit;
    vec2 p = hit * pow(10.0, uZoom) / (2.0 * uTanF * uRatio);
    // brouillard de profondeur : le plan s'éteint vers l'horizon
    float loin = exp(-max(length(hit) - 0.6, 0.0) * 0.9);

    vec4 puce = couchePuce(uCentre + p);
    float w1 = poids(2.0, -3.4);
    if (uMode > 0.5) { gl_FragColor = vec4(puce.rgb * w1 * uVisible * loin, 1.0); return; }

    vec3 c = puce.rgb * w1;
    float w2 = poids(-2.5, -5.0);
    if (w2 > 0.0) c += coucheSM(p + vec2(3.1e-5, 1.7e-5)) * w2;
    float w3 = poids(-4.4, -6.7);
    if (w3 > 0.0) c += coucheMetal(p + vec2(1.3e-7, 2.1e-7)) * w3;
    float w4 = poids(-6.0, -11.0);
    if (w4 > 0.0) c += coucheTransistors(p + vec2(1.0e-8, 0.4e-8)) * w4;
    gl_FragColor = vec4(c * loin, uVisible);
  }
`;

export function creerMicroscope(scene) {
  const donnees = new Uint8Array(16 * 12 * 4);
  const texture = new DataTexture(donnees, 16, 12, RGBAFormat, UnsignedByteType);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.needsUpdate = true;

  const uniforms = {
    uZoom: { value: -1.3 },
    uTilt: { value: 0.35 },
    uRot: { value: 0 },
    uTemps: { value: 0 },
    uRatio: { value: 16 / 9 },
    uTanF: { value: Math.tan((15 * Math.PI) / 180) },
    uVisible: { value: 0 },
    uMode: { value: 0 },
    uCentre: { value: CENTRE_ZOOM.clone() },
    uSM: { value: texture },
    uC0: { value: DEGRADE_MSI[0] },
    uC1: { value: DEGRADE_MSI[1] },
    uC2: { value: DEGRADE_MSI[2] },
    uC3: { value: DEGRADE_MSI[3] },
    uAlu: { value: COULEURS.alu },
    uAcier: { value: COULEURS.acier },
    uGraphite: { value: COULEURS.graphite },
    uBlanc: { value: COULEURS.blanc },
  };
  const vertexShader = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const base = new ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: NormalBlending,
  });
  const neon = new ShaderMaterial({
    uniforms: { ...uniforms, uMode: { value: 1 } },
    vertexShader,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const geo = new PlaneGeometry(2, 2);
  const plan = new Mesh(geo, base);
  const planNeon = new Mesh(geo, neon);
  for (const m of [plan, planNeon]) {
    m.frustumCulled = false;
    m.renderOrder = 1000;
    m.userData.horsThermique = true;
    m.visible = false;
    scene.add(m);
  }
  planNeon.renderOrder = 1001;
  planNeon.userData.neon = true;

  // --- SM actifs et vagues -------------------------------------------------
  // 170 SM actifs sur les 192 dessinés. Lesquels sont désactivés varie d'une puce
  // à l'autre : ici un tirage fixe, réparti sur toute la puce.
  const N = 192;
  const actifs = new Uint8Array(N).fill(1);
  let graine = 7;
  const alea = () => ((graine = (graine * 16807) % 2147483647) / 2147483647);
  let coupes = 0;
  while (coupes < 22) {
    const i = Math.floor(alea() * N);
    if (actifs[i]) {
      actifs[i] = 0;
      coupes++;
    }
  }
  // ordre d'allumage : du centre vers les bords
  const distances = PLAN.centres.map(([x, y]) => Math.hypot(x, y));
  const ordre = [...distances.keys()].filter((i) => actifs[i]).sort((a, b) => distances[a] - distances[b]);
  const rang = new Float32Array(N).fill(1e9);
  ordre.forEach((i, k) => (rang[i] = k));

  const vagues = [];
  let horlogeTemps = 0;
  let temps = 0;
  const periode = 60 / 83;

  function maj(dt, E, son, camera) {
    const visible = E.micro > 0.001;
    plan.visible = visible;
    planNeon.visible = visible;
    if (!visible) return;
    temps += dt;
    uniforms.uZoom.value = E.zoom;
    uniforms.uTilt.value = E.inclinaison;
    uniforms.uRot.value = E.rotation;
    uniforms.uVisible.value = E.micro;
    uniforms.uRatio.value = camera.aspect;
    uniforms.uTanF.value = Math.tan((camera.fov * Math.PI) / 360);
    uniforms.uCentre.value.copy(CENTRE_ZOOM).multiplyScalar(1 - E.recentrage);
    neon.uniforms.uVisible.value = E.micro;

    // vagues sur les temps de la musique (ou au tempo du morceau, sans son)
    // (sans son, ou si aucun temps n'est détecté depuis 1,4 s : au tempo du morceau)
    if (E.vagues > 0.01) {
      let nouvelle = son.allume && son.temps;
      horlogeTemps += dt;
      if (nouvelle) horlogeTemps = 0;
      else if (horlogeTemps > (son.allume ? 1.4 : periode)) {
        horlogeTemps = son.allume ? 1.4 - periode : 0;
        nouvelle = true;
      }
      if (nouvelle) {
        const i = ordre[Math.floor(Math.random() * ordre.length)];
        vagues.push({ x: PLAN.centres[i][0], y: PLAN.centres[i][1], t0: temps });
      }
    }
    while (vagues.length && temps - vagues[0].t0 > 3) vagues.shift();

    const allumes = E.coeurs * ordre.length;
    for (let i = 0; i < N; i++) {
      const [x, y] = PLAN.centres[i];
      let pulse = 0;
      if (actifs[i]) {
        for (const v of vagues) {
          const age = temps - v.t0;
          const d = Math.hypot(x - v.x, y - v.y) - age * 0.016;
          // anneau qui s'étend depuis le SM de départ, et s'éteint avec de la traîne
          pulse += Math.exp(-(d * d) / (0.0016 * 0.0016)) * Math.exp(-age * 1.4);
        }
      }
      const on = actifs[i] ? Math.min(1, Math.max(0, allumes - rang[i])) : 0;
      donnees[i * 4] = Math.round(on * 255);
      donnees[i * 4 + 1] = Math.round(Math.min(1, pulse * E.vagues) * 255);
    }
    // texel (s, g) : ligne g, colonne s
    texture.needsUpdate = true;
  }

  return { maj, plan, planNeon };
}
