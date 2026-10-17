import { AdditiveBlending, BufferAttribute, BufferGeometry, LineSegments, ShaderMaterial } from 'three';
import { DEGRADE_MSI } from '../couleurs.js';
import { GPU } from '../carte/dimensions.js';
import { MODULES_MEMOIRE } from '../carte/electronique.js';

// Beat 9, la mémoire : 16 modules de GDDR7 × 32 bits = le bus de 512 bits.
// Chaque module envoie ses 32 pistes vers le bord de la puce ; des paquets de
// lumière y circulent, en lecture (vers la puce) ou en écriture (vers le module).
// Dessiné comme un relevé : au-dessus du PCB, bleu côté module, rose côté puce.

const Z = -27.5; // au-dessus des modules et du substrat (repère local du PCB)
const BITS = 32;

function routes() {
  const dieX = 12.75;
  const dieY = 14.7;
  const lignes = [];
  const gauche = MODULES_MEMOIRE.filter(([x]) => x < GPU.x - 30).sort((a, b) => a[1] - b[1]);
  const droite = MODULES_MEMOIRE.filter(([x]) => x > GPU.x + 30).sort((a, b) => a[1] - b[1]);
  const haut = MODULES_MEMOIRE.filter(([x, y]) => Math.abs(x - GPU.x) < 30 && y > GPU.y).sort((a, b) => a[0] - b[0]);
  const bas = MODULES_MEMOIRE.filter(([x, y]) => Math.abs(x - GPU.x) < 30 && y < GPU.y).sort((a, b) => a[0] - b[0]);

  // modules sur les côtés : pistes horizontales qui convergent vers le flanc du die
  for (const [cote, liste] of [[-1, gauche], [1, droite]]) {
    liste.forEach(([x, y, , h], k) => {
      const yd = GPU.y + (k - (liste.length - 1) / 2) * 5.6;
      const pistes = [];
      for (let i = 0; i < BITS; i++) {
        const o = (i / (BITS - 1) - 0.5) * (h - 3);
        const bord = GPU.x + cote * dieX;
        pistes.push([
          [x + cote * 3, y + o],
          [x - cote * 7, y + o],
          [bord + cote * 5, yd + o * 0.32],
          [bord, yd + o * 0.32],
        ]);
      }
      lignes.push({ pistes, sens: k % 2 ? 1 : -1 });
    });
  }
  // modules au-dessus et au-dessous : pistes verticales
  for (const [cote, liste] of [[1, haut], [-1, bas]]) {
    liste.forEach(([x, y, w], k) => {
      const xd = GPU.x + (k - (liste.length - 1) / 2) * 5.6;
      const pistes = [];
      for (let i = 0; i < BITS; i++) {
        const o = (i / (BITS - 1) - 0.5) * (w - 3);
        const bord = GPU.y + cote * dieY;
        pistes.push([
          [x + o, y + cote * 3],
          [x + o, y - cote * 7],
          [xd + o * 0.32, bord + cote * 5],
          [xd + o * 0.32, bord],
        ]);
      }
      lignes.push({ pistes, sens: k % 2 ? -1 : 1 });
    });
  }
  return lignes;
}

export function creerMemoire(pcb) {
  const modules = routes();
  const pos = [];
  const dist = [];
  const phase = [];
  const sens = [];
  let total = 0;
  for (const m of modules) {
    for (const piste of m.pistes) {
      total++;
      // longueur cumulée, normalisée de 0 (module) à 1 (puce)
      const seg = [];
      let L = 0;
      for (let i = 0; i < piste.length - 1; i++) {
        const l = Math.hypot(piste[i + 1][0] - piste[i][0], piste[i + 1][1] - piste[i][1]);
        seg.push([L, L + l]);
        L += l;
      }
      const ph = Math.random();
      for (let i = 0; i < piste.length - 1; i++) {
        pos.push(piste[i][0], piste[i][1], Z, piste[i + 1][0], piste[i + 1][1], Z);
        dist.push(seg[i][0] / L, seg[i][1] / L);
        phase.push(ph, ph);
        sens.push(m.sens, m.sens);
      }
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('dist', new BufferAttribute(new Float32Array(dist), 1));
  geo.setAttribute('phase', new BufferAttribute(new Float32Array(phase), 1));
  geo.setAttribute('sens', new BufferAttribute(new Float32Array(sens), 1));
  const mat = new ShaderMaterial({
    uniforms: {
      uTrace: { value: 0 },
      uDonnees: { value: 0 },
      uTemps: { value: 0 },
      uC0: { value: DEGRADE_MSI[0] },
      uC1: { value: DEGRADE_MSI[1] },
      uC2: { value: DEGRADE_MSI[2] },
      uC3: { value: DEGRADE_MSI[3] },
    },
    vertexShader: /* glsl */ `
      attribute float dist, phase, sens;
      varying float vDist, vPhase, vSens;
      void main() {
        vDist = dist; vPhase = phase; vSens = sens;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTrace, uDonnees, uTemps;
      uniform vec3 uC0, uC1, uC2, uC3;
      varying float vDist, vPhase, vSens;
      vec3 degrade(float t) {
        t = clamp(t, 0.0, 1.0) * 3.0;
        if (t < 1.0) return mix(uC0, uC1, t);
        if (t < 2.0) return mix(uC1, uC2, t - 1.0);
        return mix(uC2, uC3, t - 2.0);
      }
      void main() {
        if (vDist > uTrace) discard;
        float tete = exp(-(uTrace - vDist) * 30.0) * step(uTrace, 0.999);
        // paquets : courts éclats qui glissent le long de la piste
        float x = fract(vDist * 5.0 - uTemps * 1.4 * vSens + vPhase);
        float paquet = smoothstep(0.0, 0.03, x) * (1.0 - smoothstep(0.03, 0.11, x));
        // 32 pistes serrées : chacune reste très fine et sombre, seuls les paquets brillent
        float a = 0.012 + tete * 0.55 + paquet * uDonnees * 0.45;
        gl_FragColor = vec4(degrade(vDist) * a, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const lignes = new LineSegments(geo, mat);
  lignes.userData.neon = true;
  lignes.frustumCulled = false;
  lignes.visible = false;
  pcb.add(lignes);

  function maj(dt, E) {
    lignes.visible = E.traces > 0.001;
    if (!lignes.visible) return;
    mat.uniforms.uTrace.value = E.traces;
    mat.uniforms.uDonnees.value = E.donnees;
    mat.uniforms.uTemps.value += dt * (0.4 + E.donnees);
  }
  return { maj, total };
}
