import { CylinderGeometry, ExtrudeGeometry, Group, Mesh } from 'three';
import { COQUE, DIAGONALE, PCB, Z } from './dimensions.js';
import { boite, decouper, forme, prisme, trouPolygone } from './outils.js';

// ---------------------------------------------------------------------------
// 10 · Backplate en métal, deux tons séparés par une diagonale, grande fenêtre
// ajourée là où le PCB s'arrête (l'air chaud ressort par là). Trois barres
// obliques à la place du dragon d'origine.
// ---------------------------------------------------------------------------
const PENTE = (DIAGONALE.b[1] - DIAGONALE.a[1]) / (DIAGONALE.b[0] - DIAGONALE.a[0]);
const xDiagonale = (y) => DIAGONALE.a[0] + (y - DIAGONALE.a[1]) / PENTE;

export const FENETRE = (() => {
  const decalage = 10; // la fenêtre longe la diagonale, 10 mm à droite
  const yBas = -49;
  const yHaut = 62;
  const xGauche = PCB.xMax - 4;
  const yCoude = DIAGONALE.a[1] + (xGauche - decalage - DIAGONALE.a[0]) * PENTE;
  return [
    [xGauche, yBas],
    [160, yBas],
    [172, yBas + 12],
    [172, yHaut],
    [xDiagonale(yHaut) + decalage, yHaut],
    [xGauche, yCoude],
  ];
})();

export function construireBackplate(ctx) {
  const g = new Group();
  const { xMin, xMax, yMax } = COQUE;
  const yMin = -59;
  const contour = [
    [xMin, yMin],
    [xMax - 3, yMin],
    [xMax, yMin + 3],
    [xMax, yMax],
    [xMin, yMax],
  ];
  g.add(prisme(ctx.m('backplateLisse'), contour, Z.backplateArriere, Z.backplateAvant, { trous: [trouPolygone(FENETRE)], biseau: 0.5 }));

  // Partie en alu brossé, côté équerre de la diagonale.
  const brosse = [
    [xMin + 0.5, yMin + 0.5],
    [xDiagonale(yMin + 0.5), yMin + 0.5],
    [xDiagonale(yMax - 0.5), yMax - 0.5],
    [xMin + 0.5, yMax - 0.5],
  ];
  g.add(prisme(ctx.m('backplateBrosse'), brosse, Z.backplateArriere - 0.3, Z.backplateArriere));

  // Barres obliques dans la fenêtre, en chevron avec la diagonale (produit-4.webp),
  // découpées à la forme de la fenêtre.
  const angle = -Math.atan(PENTE);
  const [c, s] = [Math.cos(angle), Math.sin(angle)];
  for (const cx of [98, 130, 162]) {
    const bande = [
      [-90, -2.4],
      [90, -2.4],
      [90, 2.4],
      [-90, 2.4],
    ].map(([u, v]) => [cx + u * c - v * s, 6 + u * s + v * c]);
    const morceau = decouper(bande, FENETRE);
    // légèrement en retrait des faces de la tôle pour éviter les faces confondues
    if (morceau.length > 2) g.add(prisme(ctx.m('backplateLisse'), morceau, Z.backplateArriere + 0.2, Z.backplateAvant - 0.2));
  }

  // Plaque d'about, côté écusson : la tôle du backplate se replie, percée de trous
  // de fixation (support anti-affaissement).
  g.add(boite(ctx.m('backplateLisse'), [179.5, 181], [yMin, yMax], [Z.backplateArriere, -8]));
  const trou = new CylinderGeometry(1.6, 1.6, 0.4, 16);
  for (const y of [-40, -12, 16, 44]) {
    const t = new Mesh(trou, ctx.m('composant'));
    t.rotation.z = Math.PI / 2;
    t.position.set(181.1, y, -20);
    g.add(t);
  }

  // Vis.
  const vis = new CylinderGeometry(2.2, 2.2, 0.8, 18);
  // positions relevées sur produit-4.webp en superposition
  for (const [x, y] of [
    [-172, -56],
    [37, -54],
    [172, -52],
    [-171, 67],
    [37, 68],
    [172, 68],
  ]) {
    const v = new Mesh(vis, ctx.m('nickel'));
    v.rotation.x = Math.PI / 2;
    v.position.set(x, y, Z.backplateArriere - 0.4);
    g.add(v);
  }
  return g;
}

// ---------------------------------------------------------------------------
// 11 · Équerre : tôle argent ajourée, 3 DisplayPort 2.1b et 1 HDMI 2.1b
// (HDMI côté doigts PCIe, comme sur la vraie carte).
// ---------------------------------------------------------------------------
export const PORTS = [
  { y: 45, largeur: 16.5, hauteur: 6.6 },
  { y: 25, largeur: 16.5, hauteur: 6.6 },
  { y: 5, largeur: 16.5, hauteur: 6.6 },
  { y: -15, largeur: 15.5, hauteur: 6.2, hdmi: true },
];
const Z_PORTS = Z.pcbAvant + 4.2;

export function construireEquerre(ctx) {
  const g = new Group();
  const acier = ctx.m('equerre');
  const x0 = -179.5;

  // Contour de la tôle dans le plan (z, y), avec la languette du bas.
  const contour = forme([
    [-35.5, -60],
    [-31, -60],
    [-31, -74.5],
    [-28, -74.5],
    [-28, -60],
    [4.5, -60],
    [4.5, 62],
    [-35.5, 62],
  ]);
  for (const p of PORTS) {
    const [demiL, demiH] = [p.largeur / 2 + 0.6, p.hauteur / 2 + 0.6];
    contour.holes.push(
      trouPolygone([
        [Z_PORTS - demiH, p.y - demiL],
        [Z_PORTS + demiH, p.y - demiL],
        [Z_PORTS + demiH, p.y + demiL],
        [Z_PORTS - demiH, p.y + demiL],
      ]),
    );
  }
  // ouïes en chevrons au-dessus de la rangée de ports
  for (const [ya, yb] of [
    [-52, -24],
    [-18, 14],
    [20, 54],
  ]) {
    contour.holes.push(
      trouPolygone([
        [-14, ya],
        [-14, yb - 6],
        [-8, yb],
        [1.5, yb],
        [1.5, ya + 6],
        [-4.5, ya],
      ]),
    );
  }
  const tole = new Mesh(new ExtrudeGeometry(contour, { depth: 1, bevelEnabled: false, curveSegments: 4 }), acier);
  // forme en (z, y) : on la tourne pour que son plan soit perpendiculaire à X
  tole.geometry.rotateY(-Math.PI / 2);
  tole.position.x = x0 + 1;
  g.add(tole);

  // Ports : coque métallique et cavité sombre.
  for (const p of PORTS) {
    const demiL = p.largeur / 2;
    const demiH = p.hauteur / 2;
    g.add(boite(acier, [x0 + 1, -158], [p.y - demiL, p.y + demiL], [Z_PORTS - demiH, Z_PORTS + demiH]));
    g.add(boite(ctx.m('composant'), [x0 + 0.5, x0 + 9], [p.y - demiL + 1, p.y + demiL - 1], [Z_PORTS - demiH + 1, Z_PORTS + demiH - 1]));
  }
  return g;
}
