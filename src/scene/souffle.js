import { AdditiveBlending, BufferAttribute, BufferGeometry, LineSegments, ShaderMaterial } from 'three';
import { COULEURS } from '../couleurs.js';
import { PCB, VENTILATEURS } from '../carte/dimensions.js';

// Beat 5, le souffle : le flux d'air devient visible. Des filets d'air (traits courts)
// sont aspirés par chaque ventilateur, tournent avec lui, traversent les ailettes.
// Au-dessus du PCB, l'air bute et s'échappe par le haut et le bas ; au-delà du PCB
// (sous le troisième ventilateur), il traverse la carte et ressort par la fenêtre
// du backplate. Blanc cassé, jamais néon : c'est de l'air, pas de la lumière.

const PAR_VENTILATEUR = 380;

export function creerSouffle(scene, carte) {
  const N = PAR_VENTILATEUR * 3;
  const tete = new Float32Array(N * 3);
  const vit = new Float32Array(N * 3);
  const ventilo = new Uint8Array(N);
  const age = new Float32Array(N);
  const pos = new Float32Array(N * 6);
  const alpha = new Float32Array(N * 2);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('alpha', new BufferAttribute(alpha, 1));
  const mat = new ShaderMaterial({
    uniforms: { uCouleur: { value: COULEURS.blanc.clone() }, uIntensite: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float alpha;
      varying float vA;
      void main() { vA = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uCouleur;
      uniform float uIntensite;
      varying float vA;
      void main() { gl_FragColor = vec4(uCouleur * vA * uIntensite, 1.0); }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const lignes = new LineSegments(geo, mat);
  lignes.frustumCulled = false;
  lignes.visible = false;
  scene.add(lignes);

  const ventilateurs = carte.piece('ventilateurs');
  const radiateur = carte.piece('radiateur');
  const backplate = carte.piece('backplate');
  const pcb = carte.piece('pcb');

  function naitre(i, zFan, aleatoire = true) {
    const k = ventilo[i];
    const [cx, cy] = VENTILATEURS.centres[k];
    const r = 17 + Math.sqrt(Math.random()) * 36;
    const a = Math.random() * Math.PI * 2;
    tete[i * 3] = cx + Math.cos(a) * r;
    tete[i * 3 + 1] = cy + Math.sin(a) * r;
    tete[i * 3 + 2] = zFan + 20 + (aleatoire ? Math.random() * 90 : 70 + Math.random() * 30);
    vit[i * 3] = 0;
    vit[i * 3 + 1] = 0;
    vit[i * 3 + 2] = -1;
    age[i] = 0;
  }

  for (let i = 0; i < N; i++) {
    ventilo[i] = Math.floor(i / PAR_VENTILATEUR);
    naitre(i, 23);
  }

  // vitesses : régime de chaque ventilateur (0 à 1)
  function maj(dt, E, vitesses) {
    const total = E.souffle;
    lignes.visible = total > 0.001;
    if (!lignes.visible) return;
    mat.uniforms.uIntensite.value = total * 0.4;

    const zFan = ventilateurs.groupe.position.z + VENTILATEURS.zCentre;
    const zRadArriere = radiateur.groupe.position.z - 17;
    const zPcb = pcb.groupe.position.z - 30 + 6;
    const zBack = backplate.groupe.position.z - 35;
    for (let i = 0; i < N; i++) {
      const k = ventilo[i];
      const s = vitesses[k];
      const [cx, cy] = VENTILATEURS.centres[k];
      const V = 30 + 300 * s; // mm/s
      let x = tete[i * 3];
      let y = tete[i * 3 + 1];
      let z = tete[i * 3 + 2];
      const dx = x - cx;
      const dy = y - cy;
      const traversant = x > PCB.xMax + 4; // pas de PCB derrière : l'air traverse
      let vx = 0;
      let vy = 0;
      let vz = -V;
      if (z < zFan + 12 && z > zRadArriere - 4) {
        // dans le ventilateur et les ailettes : l'air tourne avec les pales
        const w = 2.2 * s;
        vx = -dy * w;
        vy = dx * w;
      } else if (z <= zRadArriere - 4 && !traversant) {
        // l'air bute sur le PCB et s'échappe vers le haut ou le bas
        const versHaut = y > cy - 8 ? 1 : -1;
        const proche = Math.min(1, (zRadArriere - z) / Math.max(4, zRadArriere - zPcb));
        vy = versHaut * V * (0.4 + 0.9 * proche);
        vz = -V * (1 - proche) * 0.6;
      }
      x += vx * dt;
      y += vy * dt;
      z += vz * dt;
      age[i] += dt;
      const sorti = z < zBack - 140 || Math.abs(y) > 150 || (z < zPcb && !traversant);
      if (sorti || s < 0.01) {
        if (s < 0.01) {
          // ventilateur à l'arrêt : le filet reste invisible
          alpha[i * 2] = 0;
          alpha[i * 2 + 1] = 0;
          continue;
        }
        naitre(i, zFan, false);
        x = tete[i * 3];
        y = tete[i * 3 + 1];
        z = tete[i * 3 + 2];
      }
      tete[i * 3] = x;
      tete[i * 3 + 1] = y;
      tete[i * 3 + 2] = z;
      const n = Math.hypot(vx, vy, vz) || 1;
      const longueur = 10 + 40 * s;
      const o = i * 6;
      pos[o] = x;
      pos[o + 1] = y;
      pos[o + 2] = z;
      pos[o + 3] = x - (vx / n) * longueur;
      pos[o + 4] = y - (vy / n) * longueur;
      pos[o + 5] = z - (vz / n) * longueur;
      const apparition = Math.min(1, age[i] * 3);
      alpha[i * 2] = apparition * (0.35 + 0.65 * s);
      alpha[i * 2 + 1] = 0;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.alpha.needsUpdate = true;
  }

  return { lignes, maj };
}
