import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Group,
  Line,
  PointLight,
  Points,
  ShaderMaterial,
  Vector3,
} from 'three';
import { DEGRADE_MSI } from '../couleurs.js';
import { GPU } from '../carte/dimensions.js';

// Beat 3, le courant : 575 W entrent par le connecteur 16 broches et coulent sur le
// PCB vers les étages d'alimentation, puis vers la puce. Un réseau de pistes (repère
// local du PCB) parcouru par des particules ; le front du courant avance avec
// ETAT.courant. Couleur le long du trajet : bleu à l'entrée, rose à l'arrivée.

const Z_PISTE = -29.3; // juste au-dessus de la surface du PCB
const Z_PUCE = -27.4; // sur le die
const ECHANTILLONS = 120;

const COULEURS_GLSL = /* glsl */ `
  uniform vec3 uC0, uC1, uC2, uC3;
  vec3 degrade(float t) {
    t = clamp(t, 0.0, 1.0) * 3.0;
    if (t < 1.0) return mix(uC0, uC1, t);
    if (t < 2.0) return mix(uC1, uC2, t - 1.0);
    return mix(uC2, uC3, t - 2.0);
  }
`;
const uniformsCouleurs = () => ({
  uC0: { value: DEGRADE_MSI[0] },
  uC1: { value: DEGRADE_MSI[1] },
  uC2: { value: DEGRADE_MSI[2] },
  uC3: { value: DEGRADE_MSI[3] },
});

// Une piste : courbe lissée, échantillonnée, avec sa distance de départ depuis le connecteur.
function piste(points2d, depart, { finSurPuce = false } = {}) {
  const pts = points2d.map(([x, y], i) => new Vector3(x, y, finSurPuce && i === points2d.length - 1 ? Z_PUCE : Z_PISTE));
  const courbe = new CatmullRomCurve3(pts, false, 'centripetal', 0.3);
  const positions = new Float32Array((ECHANTILLONS + 1) * 3);
  const distances = new Float32Array(ECHANTILLONS + 1);
  let cumul = 0;
  const p = new Vector3();
  const prec = new Vector3();
  for (let i = 0; i <= ECHANTILLONS; i++) {
    courbe.getPoint(i / ECHANTILLONS, p);
    if (i) cumul += p.distanceTo(prec);
    prec.copy(p);
    positions.set([p.x, p.y, p.z], i * 3);
    distances[i] = depart + cumul;
  }
  return { positions, distances, longueur: cumul, depart };
}

// Distance (le long d'une piste) du point le plus proche de (x, y) : point de branchement.
function distanceAuPoint(p, x, y) {
  let meilleur = Infinity;
  let d = p.depart;
  for (let i = 0; i <= ECHANTILLONS; i++) {
    const dx = p.positions[i * 3] - x;
    const dy = p.positions[i * 3 + 1] - y;
    const e = dx * dx + dy * dy;
    if (e < meilleur) {
      meilleur = e;
      d = p.distances[i];
    }
  }
  return d;
}

function construireReseau() {
  const pistes = [];
  // Six brins parallèles sortent des broches de puissance et convergent (le « fleuve »).
  for (let k = 0; k < 6; k++) {
    const x = -5.5 + k * 3;
    pistes.push(piste([[x, 60], [x, 55], [x * 0.5 + 1.25, 51], [2.5, 47]], 0));
  }
  const tronc = pistes[2];
  const jonction = distanceAuPoint(tronc, 2.5, 47);

  // Colonne d'alimentation droite (selfs en x = -14 et -4).
  const droite = piste([[2.5, 47], [-9, 44], [-9, 10], [-9, -40]], jonction);
  pistes.push(droite);
  // Colonne gauche (selfs en x = -150 et -140), en longeant le haut du PCB.
  const gauche = piste([[2.5, 47], [-30, 55], [-90, 56], [-130, 54], [-145, 44], [-145, 0], [-145, -40]], jonction);
  pistes.push(gauche);
  // Petits étages en bas à droite.
  pistes.push(piste([[2.5, 47], [16, 38], [24, 0], [26, -34]], jonction));

  // Alimentation de la puce depuis les deux colonnes : cinq pistes de chaque côté.
  const cx = GPU.x;
  const cy = GPU.y;
  for (const yk of [36, 18, 0, -18, -36]) {
    pistes.push(
      piste([[-9, yk], [-38, cy + yk * 0.7], [-54, cy + yk * 0.3], [cx + 6, cy + yk * 0.08], [cx, cy]], distanceAuPoint(droite, -9, yk), { finSurPuce: true }),
    );
    pistes.push(
      piste([[-145, yk], [-102, cy + yk * 0.7], [-86, cy + yk * 0.3], [cx - 6, cy + yk * 0.08], [cx, cy]], distanceAuPoint(gauche, -145, yk), { finSurPuce: true }),
    );
  }
  const max = Math.max(...pistes.map((p) => p.depart + p.longueur));
  return { pistes, max };
}

export function creerCourant(pcb, qualite, renderer) {
  const groupe = new Group();
  groupe.name = 'courant';
  pcb.add(groupe);
  const { pistes, max } = construireReseau();

  // --- Les pistes, révélées par le front -------------------------------------
  const matPiste = new ShaderMaterial({
    uniforms: { uFront: { value: 0 }, uMax: { value: max }, uIntensite: { value: 1 }, ...uniformsCouleurs() },
    vertexShader: /* glsl */ `
      attribute float dist;
      varying float vDist;
      void main() { vDist = dist; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      ${COULEURS_GLSL}
      uniform float uFront, uMax, uIntensite;
      varying float vDist;
      void main() {
        if (vDist > uFront) discard;
        float tete = exp(-(uFront - vDist) / 6.0);
        float a = (0.16 + tete * 1.3) * uIntensite;
        gl_FragColor = vec4(degrade(vDist / uMax) * a, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  for (const p of pistes) {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(p.positions, 3));
    g.setAttribute('dist', new BufferAttribute(p.distances, 1));
    const ligne = new Line(g, matPiste);
    ligne.userData.neon = true;
    ligne.frustumCulled = false;
    groupe.add(ligne);
  }

  // --- Les particules ---------------------------------------------------------
  const N = 2600;
  const longueurTotale = pistes.reduce((s, p) => s + p.longueur, 0);
  const piste_ = new Uint16Array(N);
  const u = new Float32Array(N);
  const vitesse = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    // répartition proportionnelle à la longueur des pistes
    let r = Math.random() * longueurTotale;
    let k = 0;
    while (r > pistes[k].longueur && k < pistes.length - 1) r -= pistes[k++].longueur;
    piste_[i] = k;
    u[i] = Math.random();
    vitesse[i] = 0.75 + Math.random() * 0.5;
  }
  const pos = new Float32Array(N * 3);
  const dist = new Float32Array(N);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('dist', new BufferAttribute(dist, 1));
  const matPoints = new ShaderMaterial({
    uniforms: { uFront: { value: 0 }, uMax: { value: max }, uIntensite: { value: 1 }, uTaille: { value: 1 }, ...uniformsCouleurs() },
    vertexShader: /* glsl */ `
      attribute float dist;
      uniform float uTaille;
      varying float vDist;
      void main() {
        vDist = dist;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = uTaille * 900.0 / -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COULEURS_GLSL}
      uniform float uFront, uMax, uIntensite;
      varying float vDist;
      void main() {
        if (vDist > uFront) discard;
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d) * uIntensite * (0.6 + exp(-(uFront - vDist) / 8.0) * 1.4);
        gl_FragColor = vec4(degrade(vDist / uMax) * a, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const points = new Points(geo, matPoints);
  points.userData.neon = true;
  points.frustumCulled = false;
  groupe.add(points);

  // --- La lumière que le courant jette sur le PCB ------------------------------
  // portée courte : elle n'éclaire que le PCB, pas le reste de la carte
  const lumiere = new PointLight(DEGRADE_MSI[3].clone(), 0, 95, 2);
  lumiere.position.set(GPU.x, GPU.y, Z_PISTE + 28);
  groupe.add(lumiere);

  function maj(dt, E, son) {
    const visible = E.courant > 0.0005 || E.courantLumiere > 0.001;
    groupe.visible = visible;
    if (!visible) return;
    const front = E.courant * max;
    matPiste.uniforms.uFront.value = front;
    matPoints.uniforms.uFront.value = front;
    const pulse = 1 + son.basses * 0.35;
    matPiste.uniforms.uIntensite.value = E.courantLumiere * pulse;
    matPoints.uniforms.uIntensite.value = E.courantLumiere * pulse;
    lumiere.intensity = E.courantLumiere * 600 * E.courant * pulse;
    lumiere.color.copy(DEGRADE_MSI[0]).lerp(DEGRADE_MSI[3], Math.min(1, E.courant * 1.3));

    // les particules avancent (vitesse en mm/s), s'arrêtent avec E.flux
    const actives = Math.round(N * qualite().poussiere);
    geo.setDrawRange(0, actives);
    const avance = dt * 70 * E.flux;
    for (let i = 0; i < actives; i++) {
      const p = pistes[piste_[i]];
      u[i] += (avance * vitesse[i]) / p.longueur;
      if (u[i] > 1) u[i] -= 1;
      const f = u[i] * ECHANTILLONS;
      const j = Math.min(ECHANTILLONS - 1, Math.floor(f));
      const t = f - j;
      const a = j * 3;
      pos[i * 3] = p.positions[a] + (p.positions[a + 3] - p.positions[a]) * t;
      pos[i * 3 + 1] = p.positions[a + 1] + (p.positions[a + 4] - p.positions[a + 1]) * t;
      pos[i * 3 + 2] = p.positions[a + 2] + (p.positions[a + 5] - p.positions[a + 2]) * t;
      dist[i] = p.distances[j] + (p.distances[j + 1] - p.distances[j]) * t;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.dist.needsUpdate = true;
    matPoints.uniforms.uTaille.value = 1.6 * renderer.getPixelRatio();
  }

  return { groupe, maj, lumiere };
}
