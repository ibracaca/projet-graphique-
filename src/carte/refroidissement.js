import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import { GPU, PCB, RADIATEUR, Z } from './dimensions.js';
import { boite } from './outils.js';

// ---------------------------------------------------------------------------
// 03 · TRI FROZR 4 : deux blocs d'ailettes fines, en instances.
// Ailettes « high-low » (Air Antegrade Fin 2.0) : une sur deux est plus courte
// côté ventilateurs. Encoche au-dessus du connecteur 16 broches.
// Au-delà du PCB, les ailettes descendent jusqu'au backplate (flux traversant).
// ---------------------------------------------------------------------------
export function construireRadiateur(ctx) {
  const g = new Group();
  const ailettes = [];
  for (const [x0, x1] of RADIATEUR.blocs) {
    for (let x = x0; x <= x1; x += RADIATEUR.pas) {
      const courte = Math.round((x - x0) / RADIATEUR.pas) % 2 === 1;
      const yMax = x > -10 && x < 15 ? 49 : RADIATEUR.yMax; // encoche du connecteur
      const zArriere = x > PCB.xMax ? Z.backplateAvant - 0.5 : Z.ailettesArriere;
      const zAvant = Z.ailettesAvant - (courte ? 2.5 : 0);
      ailettes.push({ x, y0: RADIATEUR.yMin, y1: yMax, z0: zArriere, z1: zAvant });
    }
  }
  const instances = new InstancedMesh(new BoxGeometry(1, 1, 1), ctx.m('alu'), ailettes.length);
  const mat = new Matrix4();
  const lignes = [];
  ailettes.forEach((a, i) => {
    mat.makeScale(0.32, a.y1 - a.y0, a.z1 - a.z0);
    mat.setPosition(a.x, (a.y0 + a.y1) / 2, (a.z0 + a.z1) / 2);
    instances.setMatrixAt(i, mat);
    // filaire : contour d'une ailette sur deux, plus les tranches avant
    if (i % 2 === 0) {
      const p = [
        [a.x, a.y0, a.z0],
        [a.x, a.y1, a.z0],
        [a.x, a.y1, a.z1],
        [a.x, a.y0, a.z1],
      ];
      for (let k = 0; k < 4; k++) lignes.push(...p[k], ...p[(k + 1) % 4]);
    }
  });
  instances.computeBoundingBox();
  instances.computeBoundingSphere();
  const filaire = new BufferGeometry();
  filaire.setAttribute('position', new Float32BufferAttribute(lignes, 3));
  instances.userData.filaire = filaire;
  g.add(instances);

  // Barrettes de maintien sur la face avant des ailettes.
  for (const y of [RADIATEUR.yMax - 3, 6, RADIATEUR.yMin + 3]) {
    for (const [x0, x1] of RADIATEUR.blocs) g.add(boite(ctx.m('nickel'), [x0 - 1, x1 + 1], [y - 1.5, y + 1.5], [Z.ailettesAvant, Z.ailettesAvant + 0.8]));
  }
  return g;
}

// ---------------------------------------------------------------------------
// 04 · Core Pipes : 9 caloducs à section carrée posés sur la plaque de base,
// qui deviennent ronds pour traverser les ailettes. 5 partent vers la droite,
// 4 vers l'équerre.
// ---------------------------------------------------------------------------
export const CORE_PIPES = {
  nombre: 9,
  section: 7,
  pas: 7.4,
  y: [-34, 38],
};

export function construireCorePipes(ctx) {
  const g = new Group();
  const nickel = ctx.m('nickel');
  const { nombre, section, pas, y } = CORE_PIPES;
  const zCarre = (Z.plaqueBase + Z.corePipes) / 2;
  const geoBout = new SphereGeometry(3.2, 16, 12);
  let droite = 0;
  let gauche = 0;
  for (let i = 0; i < nombre; i++) {
    const x = GPU.x + (i - (nombre - 1) / 2) * pas;
    // partie carrée, sur la plaque de base
    g.add(boite(nickel, [x - section / 2, x + section / 2], y, [Z.plaqueBase, Z.corePipes]));

    // partie ronde
    const versLeHaut = i % 2 === 0;
    const sens = versLeHaut ? 1 : -1;
    const k = versLeHaut ? droite++ : gauche++;
    const zNiveau = -11 + k * 5.5;
    const yNiveau = versLeHaut ? 44 + k * 5 : -40 - k * 4.5;
    const xFin = versLeHaut ? 164 : -166;
    const yDepart = versLeHaut ? y[1] : y[0];
    const pts = [
      new Vector3(x, yDepart - sens * 2, zCarre),
      new Vector3(x, yDepart + sens * 3, zCarre + 2),
      new Vector3(x, yNiveau - sens * 2, zNiveau),
      new Vector3(x + (versLeHaut ? 10 : -10), yNiveau, zNiveau),
      new Vector3(xFin, yNiveau, zNiveau),
    ];
    const courbe = new CatmullRomCurve3(pts, false, 'centripetal');
    g.add(new Mesh(new TubeGeometry(courbe, 96, 3.2, 14, false), nickel));
    const bout = new Mesh(geoBout, nickel);
    bout.position.copy(pts[pts.length - 1]);
    g.add(bout);
  }
  return g;
}

// ---------------------------------------------------------------------------
// 05 · Plaque de base en cuivre nickelé, au-dessus du GPU et de la mémoire.
// ---------------------------------------------------------------------------
export function construirePlaqueBase(ctx) {
  const g = new Group();
  const nickel = ctx.m('nickel');
  g.add(boite(nickel, [GPU.x - 39, GPU.x + 39], [GPU.y - 34, GPU.y + 36], [Z.die, Z.plaqueBase]));
  // pattes de vissage
  const vis = new CylinderGeometry(2.4, 2.4, 3, 20);
  for (const [dx, dy] of [
    [-34, -29],
    [34, -29],
    [-34, 31],
    [34, 31],
  ]) {
    const v = new Mesh(vis, nickel);
    v.rotation.x = Math.PI / 2;
    v.position.set(GPU.x + dx, GPU.y + dy, Z.plaqueBase + 1.5);
    g.add(v);
  }
  return g;
}
