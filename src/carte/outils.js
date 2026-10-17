import { BoxGeometry, ExtrudeGeometry, Mesh, Path, Shape } from 'three';

// Boîte définie par ses bornes, plus lisible que largeur/hauteur/centre.
export function boite(materiau, [x0, x1], [y0, y1], [z0, z1]) {
  const m = new Mesh(new BoxGeometry(x1 - x0, y1 - y0, z1 - z0), materiau);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return m;
}

export function forme(points) {
  const s = new Shape();
  points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  return s;
}

export function trouPolygone(points) {
  const p = new Path();
  points.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  p.closePath();
  return p;
}

export function trouRond(x, y, r) {
  const p = new Path();
  p.absarc(x, y, r, 0, Math.PI * 2, true);
  return p;
}

// Prisme : un contour 2D (plan XY) extrudé entre z0 et z1, avec un biseau optionnel
// qui reste à l'intérieur du contour (les dimensions relevées sont respectées).
export function prismeGeo(points, z0, z1, { trous = [], biseau = 0, segments = 64 } = {}) {
  const s = Array.isArray(points) ? forme(points) : points;
  trous.forEach((t) => s.holes.push(t));
  const b = Math.min(biseau, (z1 - z0) / 2 - 0.01);
  const g = new ExtrudeGeometry(s, {
    depth: z1 - z0 - 2 * Math.max(b, 0),
    bevelEnabled: b > 0,
    bevelThickness: b,
    bevelSize: b,
    bevelOffset: -b,
    bevelSegments: 1,
    curveSegments: segments,
  });
  g.translate(0, 0, z0 + Math.max(b, 0));
  return g;
}

export function prisme(materiau, points, z0, z1, options) {
  return new Mesh(prismeGeo(points, z0, z1, options), materiau);
}

// Découpe d'un polygone par un polygone convexe (Sutherland-Hodgman).
// Les deux polygones sont des listes de points [x, y] dans le sens trigonométrique.
export function decouper(sujet, fenetre) {
  let sortie = sujet;
  for (let i = 0; i < fenetre.length; i++) {
    const [ax, ay] = fenetre[i];
    const [bx, by] = fenetre[(i + 1) % fenetre.length];
    const dedans = ([x, y]) => (bx - ax) * (y - ay) - (by - ay) * (x - ax) >= 0;
    const inter = ([px, py], [qx, qy]) => {
      const a1 = by - ay;
      const b1 = ax - bx;
      const c1 = a1 * ax + b1 * ay;
      const a2 = qy - py;
      const b2 = px - qx;
      const c2 = a2 * px + b2 * py;
      const d = a1 * b2 - a2 * b1;
      return [(b2 * c1 - b1 * c2) / d, (a1 * c2 - a2 * c1) / d];
    };
    const entree = sortie;
    sortie = [];
    for (let j = 0; j < entree.length; j++) {
      const p = entree[j];
      const q = entree[(j + 1) % entree.length];
      if (dedans(q)) {
        if (!dedans(p)) sortie.push(inter(p, q));
        sortie.push(q);
      } else if (dedans(p)) sortie.push(inter(p, q));
    }
    if (!sortie.length) break;
  }
  return sortie;
}

// Ligne de tous les points d'un rectangle (pour des filaires fabriqués à la main).
export function rectangleSegments(tab, [x0, x1], [y0, y1], [z0, z1], plan) {
  // plan 'yz' : rectangle à x constant (x0)
  if (plan === 'yz') {
    const p = [
      [x0, y0, z0],
      [x0, y1, z0],
      [x0, y1, z1],
      [x0, y0, z1],
    ];
    for (let i = 0; i < 4; i++) tab.push(...p[i], ...p[(i + 1) % 4]);
  }
}
