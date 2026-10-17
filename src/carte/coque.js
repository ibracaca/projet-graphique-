import { BoxGeometry, ExtrudeGeometry, Group, Mesh, Vector3 } from 'three';
import { COQUE, VENTILATEURS } from './dimensions.js';
import { boite, decouper, forme, prisme, trouRond } from './outils.js';

const { xMin, yMin, yMax } = COQUE;
const X_EMBOUT = 167; // début de l'embout droit (pan coupé)

// Ouvertures des ventilateurs, utilisées pour découper les pièces posées en façade.
export const TROUS_FACADE = VENTILATEURS.centres.map(([x, y]) => new Vector3(x, y, VENTILATEURS.rayonAnneau));

// Polygones de façade relevés sur produit-2.webp (mm, repère de la carte).
export const FACADE = {
  coinHaut: [
    [-87, yMax],
    [122, yMax],
    [46, 41],
    [-33, 54],
  ],
  coinBas: [
    [-124, yMin],
    [87, yMin],
    [56, -46],
    [-29, -23],
  ],
  // Facettes inclinées des extrémités : [contour, inclinaison en degrés autour de X].
  facettes: [
    [
      [
        [xMin, yMax],
        [-87, yMax],
        [-122, 64],
        [xMin, 60],
      ],
      -9,
    ],
    [
      [
        [xMin, yMin],
        [-124, yMin],
        [-160, -42],
        [xMin, -36],
      ],
      9,
    ],
    [
      [
        [122, yMax],
        [X_EMBOUT, yMax],
        [X_EMBOUT, 57],
        [148, 63],
      ],
      -9,
    ],
    [
      [
        [87, yMin],
        [X_EMBOUT, yMin],
        [X_EMBOUT, -43],
        [122, -55],
      ],
      9,
    ],
  ],
  // Inserts noirs entre les ventilateurs (on voit le radiateur à travers sur la photo).
  entreVentilateurs: [
    [
      [-87, yMax],
      [-33, 54],
      [-50, 10],
      [-66, 30],
    ],
    [
      [-29, -23],
      [-124, yMin],
      [-80, -40],
      [-62, -14],
    ],
    [
      [46, 41],
      [122, yMax],
      [74, 22],
      [58, 8],
    ],
  ],
};

// Barres lumineuses « /// » : centre, angle (degrés), et sens du dégradé.
export const BARRES = {
  longueur: 38,
  largeur: 5,
  angle: 45, // mesuré sur produit-2.webp
  haut: { centres: [[44.5, 58], [55.5, 58], [66.5, 58]], bleuEnHaut: true },
  bas: { centres: [[-69, -46.5], [-58, -46.5], [-47, -46.5]], bleuEnHaut: false },
};

function barres(ctx, groupe, { centres, bleuEnHaut }) {
  const L = BARRES.longueur;
  // bleu à l'extrémité tournée vers le bord de la carte, rose vers le centre
  const mat = ctx.neon(bleuEnHaut ? { axe: 'x', min: L / 2, max: -L / 2 } : { axe: 'x', min: -L / 2, max: L / 2 });
  const geo = new BoxGeometry(L, BARRES.largeur, 1.2);
  for (const [x, y] of centres) {
    const b = new Mesh(geo, mat);
    b.position.set(x, y, 35.9);
    b.rotation.z = (BARRES.angle * Math.PI) / 180;
    b.userData.neon = true;
    groupe.add(b);
  }
}

// Rainures diagonales du flanc côté équerre. Dessinées dans le plan (z, y),
// découpées par deux rectangles (le flanc a une forme en L), puis tournées en place.
function rainuresFlanc(ctx) {
  const g = new Group();
  const zones = [
    [
      [-27, 39],
      [31, 39],
      [31, 72],
      [-27, 72],
    ],
    [
      [5, 3],
      [31, 3],
      [31, 39],
      [5, 39],
    ],
  ];
  const angle = (48 * Math.PI) / 180;
  const [c, s] = [Math.cos(angle), Math.sin(angle)];
  const mat = ctx.m('anthracite');
  for (let k = -6; k < 12; k++) {
    // bande le long de (cos a, -sin a) dans le plan (z, y) : z monte quand y descend
    const cz = -10 + k * 6.5 * c;
    const cy = 40 + k * 6.5 * s;
    const bande = [
      [-60, -1.1],
      [60, -1.1],
      [60, 1.1],
      [-60, 1.1],
    ].map(([u, v]) => [cz + u * s + v * c, cy - u * c + v * s]);
    for (const zone of zones) {
      const morceau = decouper(bande, zone);
      if (morceau.length < 3) continue;
      const r = prisme(mat, morceau, 0, 0.7);
      r.geometry.rotateY(-Math.PI / 2);
      g.add(r);
    }
  }
  g.position.x = xMin;
  return g;
}

// Écusson de l'embout droit : contour en bouclier, bague lumineuse.
function ecusson(ctx) {
  const g = new Group();
  // 30 × 44 mm, mesuré sur card-f-1 et produit-3
  const bouclier = (k) => [
    [-15 * k, 20 * k],
    [15 * k, 20 * k],
    [15 * k, -6 * k],
    [0, -24 * k],
    [-15 * k, -6 * k],
  ];
  const ext = forme(bouclier(1));
  const int = forme(bouclier(0.88));
  ext.holes.push(int);
  const bague = new Mesh(
    new ExtrudeGeometry(ext, { depth: 1.2, bevelEnabled: false }),
    ctx.neon({ mode: 'angle' }),
  );
  bague.userData.neon = true;
  const plaque = new Mesh(new ExtrudeGeometry(forme(bouclier(0.88)), { depth: 0.6, bevelEnabled: false }), ctx.m('verreFume'));
  g.add(bague, plaque);
  // le bouclier est dessiné dans le plan (z, y) de l'embout : on le tourne face à +X
  g.rotation.y = Math.PI / 2;
  g.position.set(179.5, 36, 2);
  return g;
}

export function construireCoque(ctx) {
  const g = new Group();
  const m = ctx.m;

  // Plaque principale, percée des trois ouvertures des ventilateurs.
  const plaque = prisme(
    m('coqueClaire'),
    [
      [xMin + 2, yMin],
      [X_EMBOUT, yMin],
      [X_EMBOUT, yMax],
      [xMin + 2, yMax],
      [xMin, yMax - 2],
      [xMin, yMin + 2],
    ],
    31,
    34,
    { trous: VENTILATEURS.centres.map(([x, y]) => trouRond(x, y, VENTILATEURS.rayonAnneau)), biseau: 0.6, segments: 96 },
  );
  g.add(plaque);

  // Coins en verre fumé et inserts noirs, découpés par les ouvertures des ventilateurs.
  const fume = m('verreFume', { trous: TROUS_FACADE });
  g.add(prisme(fume, FACADE.coinHaut, 34, 35.5, { biseau: 0.4 }));
  g.add(prisme(fume, FACADE.coinBas, 34, 35.5, { biseau: 0.4 }));
  for (const f of FACADE.entreVentilateurs) g.add(prisme(m('anthracite', { trous: TROUS_FACADE }), f, 33.6, 34.4));
  for (const [contour, inclinaison] of FACADE.facettes) {
    const cx = contour.reduce((s, p) => s + p[0], 0) / contour.length;
    const cy = contour.reduce((s, p) => s + p[1], 0) / contour.length;
    const f = prisme(m('facette', { trous: TROUS_FACADE }), contour, 33.8, 34.6, { biseau: 0.3 });
    f.geometry.translate(-cx, -cy, -34.2);
    f.position.set(cx, cy, 34.2);
    f.rotation.x = (inclinaison * Math.PI) / 180;
    g.add(f);
  }

  // Embout droit au pan coupé : profil dans le plan XZ, extrudé sur la hauteur.
  const profil = forme([
    [X_EMBOUT, -33],
    [179.5, -33],
    [179.5, 20],
    [169.5, 34],
    [X_EMBOUT, 34],
  ]);
  const embout = new Mesh(
    new ExtrudeGeometry(profil, { depth: yMax - yMin - 1.2, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.6, bevelOffset: -0.6, bevelSegments: 1 }),
    m('facette'),
  );
  // le profil est en (x, z) : on fait tourner l'extrusion pour qu'elle suive Y
  embout.geometry.rotateX(Math.PI / 2);
  embout.geometry.translate(0, yMax - 0.6, 0);
  g.add(embout);

  // Jupe du bas, et flanc côté équerre : il descend plus bas au-dessus de l'équerre
  // (relevé sur produit-5.webp).
  g.add(boite(m('coqueClaire'), [xMin, X_EMBOUT], [yMin, yMin + 2], [0, 31]));
  g.add(boite(m('coqueClaire'), [xMin, xMin + 2], [38, yMax], [-30, 31]));
  g.add(boite(m('coqueClaire'), [xMin, xMin + 2], [yMin, 38], [3, 31]));
  g.add(rainuresFlanc(ctx));

  // Tranche du dessus (relevée sur produit-3 et card-f-1) : un rebord avant sur
  // toute la longueur, une plaque en verre fumé à gauche du connecteur, trois traits
  // lumineux, puis une grande plaque sombre au-dessus du radiateur à droite.
  // Entre les deux, le connecteur 16 broches reste accessible. Logos non reproduits.
  g.add(boite(m('anthracite'), [xMin, X_EMBOUT], [yMax - 2, yMax], [12, 31]));
  g.add(boite(m('verreFume'), [-135, -35], [yMax - 0.5, yMax + 0.8], [13, 30]));
  g.add(boite(m('anthracite'), [22, 158], [yMax - 3, yMax], [-10, 30]));

  // Zones RGB.
  barres(ctx, g, BARRES.haut);
  barres(ctx, g, BARRES.bas);
  const traits = ctx.neon({ axe: 'z', min: 5, max: -5 });
  for (const x of [17, 23, 29]) {
    const t = boite(traits, [x - 1.1, x + 1.1], [yMax, yMax + 0.6], [16, 26]);
    t.userData.neon = true;
    g.add(t);
  }
  g.add(ecusson(ctx));

  return g;
}
