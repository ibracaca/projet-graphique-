import { BoxGeometry, Group, InstancedMesh, Matrix4 } from 'three';
import { GPU, PCB, Z } from './dimensions.js';
import { boite, prisme } from './outils.js';

// ---------------------------------------------------------------------------
// 06 · PCB court (le flux d'air traverse la carte au-delà), doigts PCIe 5.0 x16.
// ---------------------------------------------------------------------------
export function construirePCB(ctx) {
  const g = new Group();
  const { xMin, xMax, yMin, yMax, doigts } = PCB;
  const contour = [
    [xMin, yMin],
    [doigts.xMin - 4, yMin],
    [doigts.xMin, doigts.yMin],
    [doigts.xMin + 11.4, doigts.yMin], // détrompeur PCIe
    [doigts.xMin + 11.4, doigts.yMin + 8],
    [doigts.xMin + 13.3, doigts.yMin + 8],
    [doigts.xMin + 13.3, doigts.yMin],
    [doigts.xMax, doigts.yMin],
    [doigts.xMax + 4, yMin],
    [xMax, yMin],
    [xMax, yMax - 6],
    [xMax - 6, yMax],
    [xMin, yMax],
  ];
  g.add(prisme(ctx.m('pcb'), contour, Z.pcbArriere, Z.pcbAvant));

  // Contacts dorés, des deux côtés.
  const contacts = [];
  for (let x = doigts.xMin + 0.8; x < doigts.xMax - 0.5; x += 1) {
    if (x > doigts.xMin + 11 && x < doigts.xMin + 13.8) continue;
    contacts.push(x);
  }
  const pastille = new InstancedMesh(new BoxGeometry(0.7, 7, 0.08), ctx.m('or'), contacts.length * 2);
  const m4 = new Matrix4();
  contacts.forEach((x, i) => {
    m4.makeTranslation(x, doigts.yMin + 4.2, Z.pcbAvant + 0.04);
    pastille.setMatrixAt(i * 2, m4);
    m4.makeTranslation(x, doigts.yMin + 4.2, Z.pcbArriere - 0.04);
    pastille.setMatrixAt(i * 2 + 1, m4);
  });
  pastille.computeBoundingBox();
  pastille.computeBoundingSphere();
  g.add(pastille);

  // Étage d'alimentation : colonnes de selfs de part et d'autre du GPU.
  const comp = ctx.m('composant');
  for (const x of [-150, -140, -14, -4]) g.add(boite(comp, [x - 4, x + 4], [-44, 46], [Z.pcbAvant, Z.pcbAvant + 7]));
  for (const [x, y] of [
    [16, -40],
    [26, -40],
    [16, -28],
    [26, -28],
    [36, -34],
  ])
    g.add(boite(comp, [x - 4, x + 4], [y - 4, y + 4], [Z.pcbAvant, Z.pcbAvant + 6]));
  return g;
}

// ---------------------------------------------------------------------------
// 07 · GPU GB202 : substrat de 63 × 56 mm, die de 750 mm².
// ---------------------------------------------------------------------------
export function construireGPU(ctx) {
  const g = new Group();
  const [sx, sy] = GPU.substrat;
  const [dx, dy] = GPU.die;
  g.add(boite(ctx.m('substrat'), [GPU.x - sx / 2, GPU.x + sx / 2], [GPU.y - sy / 2, GPU.y + sy / 2], [Z.pcbAvant, Z.substrat]));
  g.add(boite(ctx.m('die'), [GPU.x - dx / 2, GPU.x + dx / 2], [GPU.y - dy / 2, GPU.y + dy / 2], [Z.substrat, Z.die]));
  return g;
}

// ---------------------------------------------------------------------------
// 08 · GDDR7 : 16 modules de 2 Go autour du GPU (5 à gauche, 5 à droite,
// 4 au-dessus, 2 en dessous).
// ---------------------------------------------------------------------------
export const MODULES_MEMOIRE = (() => {
  const l = [];
  for (let k = 0; k < 5; k++) {
    const y = GPU.y + (k - 2) * 15;
    l.push([GPU.x - 43.5, y, 12, 14], [GPU.x + 43.5, y, 12, 14]);
  }
  for (let k = 0; k < 4; k++) l.push([GPU.x + (k - 1.5) * 16, GPU.y + 41, 14, 12]);
  for (const s of [-1, 1]) l.push([GPU.x + s * 9, GPU.y - 38, 14, 12]);
  return l;
})();

export function construireMemoire(ctx) {
  const g = new Group();
  const mat = ctx.m('composant');
  for (const [x, y, w, h] of MODULES_MEMOIRE) g.add(boite(mat, [x - w / 2, x + w / 2], [y - h / 2, y + h / 2], [Z.pcbAvant, Z.pcbAvant + 1.1]));
  return g;
}

// ---------------------------------------------------------------------------
// 09 · Connecteur 16 broches (12 de puissance + 4 de signal), ouverture vers le haut.
// ---------------------------------------------------------------------------
export function construireConnecteur(ctx) {
  const g = new Group();
  // position relevée sur produit-3, card-f-1 et le PCB nu (vga_body-3)
  const x0 = -8;
  const x1 = 13;
  const y0 = 52;
  const y1 = 61;
  const z0 = Z.pcbAvant;
  const z1 = Z.pcbAvant + 11;
  g.add(boite(ctx.m('connecteur'), [x0, x1], [y0, y1], [z0, z1]));
  // alvéoles : 2 rangées de 6, plus 4 broches de signal
  const alveole = ctx.m('composant');
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 6; c++) {
      const x = x0 + 2.2 + c * 3;
      const z = z0 + 3.3 + r * 3.6;
      g.add(boite(alveole, [x, x + 2.4], [y1, y1 + 0.2], [z - 1.3, z + 1.3]));
    }
  }
  for (let c = 0; c < 4; c++) {
    const x = x0 + 4 + c * 4;
    g.add(boite(alveole, [x, x + 1.4], [y1, y1 + 0.2], [z1 - 1.6, z1 - 0.4]));
  }
  return g;
}
