import { BufferGeometry, CircleGeometry, CylinderGeometry, Float32BufferAttribute, Group, Mesh, RingGeometry } from 'three';
import { VENTILATEURS } from './dimensions.js';

// Pale STORMFORCE : large faucille balayée vers l'avant, vrillée, cambrée.
// Surface paramétrique : u va du moyeu au bout de pale, v du bord d'attaque au bord de fuite.
function geometriePale(angleDepart) {
  const NU = 16;
  const NV = 10;
  const rMoyeu = VENTILATEURS.rayonMoyeu - 0.5;
  const rBout = VENTILATEURS.rayonPales;
  const positions = [];
  const index = [];
  for (let i = 0; i <= NU; i++) {
    const u = i / NU;
    const r = rMoyeu + u * (rBout - rMoyeu);
    const attaque = angleDepart + 0.62 * u ** 1.25; // balayage vers l'avant
    const corde = 0.5 + 0.34 * u; // corde angulaire, plus large au bout
    const pas = 9 - 3.5 * u; // vrillage : plus incliné près du moyeu
    for (let j = 0; j <= NV; j++) {
      const v = j / NV;
      const a = attaque - v * corde;
      const z = (v - 0.5) * pas + 1.3 * Math.sin(Math.PI * v); // cambrure
      positions.push(r * Math.cos(a), r * Math.sin(a), z);
    }
  }
  for (let i = 0; i < NU; i++) {
    for (let j = 0; j < NV; j++) {
      const a = i * (NV + 1) + j;
      const b = a + NV + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(positions, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

function ventilateur(ctx, central) {
  const v = new Group();
  const plastique = ctx.m('plastiqueNoir');
  const { rayonAnneau, rayonMoyeu, nbPales } = VENTILATEURS;

  // Anneau extérieur fermé (relie le bout des pales) et sa lèvre avant.
  const anneau = new Mesh(new CylinderGeometry(rayonAnneau - 0.8, rayonAnneau - 0.8, 15, 128, 1, true), plastique);
  anneau.rotation.x = Math.PI / 2;
  anneau.position.z = 0.5;
  const levre = new Mesh(new RingGeometry(rayonAnneau - 3.8, rayonAnneau, 128, 1), plastique);
  levre.position.z = 8;
  v.add(anneau, levre);

  // Rotor : pales et moyeu, tournent ensemble.
  const rotor = new Group();
  for (let k = 0; k < nbPales; k++) rotor.add(new Mesh(geometriePale((k * 2 * Math.PI) / nbPales), plastique));
  const moyeu = new Mesh(new CylinderGeometry(rayonMoyeu, rayonMoyeu, 10, 64), plastique);
  moyeu.rotation.x = Math.PI / 2;
  moyeu.position.z = 1;
  const capot = new Mesh(new CircleGeometry(rayonMoyeu - 1, 64), ctx.m(central ? 'moyeuArgent' : 'moyeuSombre'));
  capot.position.z = 6.05;
  const lisere = new Mesh(new RingGeometry(rayonMoyeu - 1.4, rayonMoyeu, 64), ctx.m('moyeuArgent'));
  lisere.position.z = 6.1;
  rotor.add(moyeu, capot, lisere);
  v.add(rotor);
  v.userData.rotor = rotor;
  return v;
}

export function construireVentilateurs(ctx) {
  const g = new Group();
  g.userData.rotors = [];
  VENTILATEURS.centres.forEach(([x, y], i) => {
    const v = ventilateur(ctx, i === 1);
    v.position.set(x, y, VENTILATEURS.zCentre);
    g.add(v);
    g.userData.rotors.push(v.userData.rotor);
  });
  return g;
}
