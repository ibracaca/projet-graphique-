import { BufferAttribute, BufferGeometry, Matrix3, Matrix4, Vector3 } from 'three';

// ---------------------------------------------------------------------------
// Kit de la ville du beat 12 : des blocs, des cylindres et des tubes, assemblés
// par règles en quelques grandes géométries (une par matière).
// Chaque face porte :
//   uv      : coordonnées de texture en unités du monde (béton, asphalte),
//   uvBord  : 0 à 1 sur la face (le fil de fer de l'étape 0 en dessine les bords),
//   graine  : une valeur au hasard par immeuble ou par enseigne,
//   fen     : 1 si la face porte des fenêtres (façades), 0 sinon,
//   style   : taille des cellules de fenêtres et part vitrée (x, y, largeur, hauteur),
//   origine : origine de la grille de fenêtres (le long de la façade, en hauteur),
//   t       : position le long d'une enseigne (dégradé MSI), pour les tubes.
// ---------------------------------------------------------------------------

const AXES = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

export class Kit {
  constructor(echelleTexture = 80) {
    this.echelle = echelleTexture;
    this.p = [];
    this.n = [];
    this.uv = [];
    this.uvb = [];
    this.g = [];
    this.fen = [];
    this.style = [];
    this.orig = [];
    this.t = [];
    this.idx = [];
    this.m = new Matrix4();
    this.mn = new Matrix3();
  }

  // un sommet ; u, v de bord ; o : options de la pièce
  sommet(x, y, z, nx, ny, nz, ub, vb, o, fen) {
    const s = this.echelle;
    // projection de la texture selon l'axe dominant de la normale
    const ax = Math.abs(nx);
    const ay = Math.abs(ny);
    const az = Math.abs(nz);
    let tu;
    let tv;
    if (ay >= ax && ay >= az) [tu, tv] = [x / s, z / s];
    else if (ax >= az) [tu, tv] = [z / s, y / s];
    else [tu, tv] = [x / s, y / s];
    this.p.push(x, y, z);
    this.n.push(nx, ny, nz);
    this.uv.push(tu, tv);
    this.uvb.push(ub, vb);
    this.g.push(o.graine ?? 0);
    this.fen.push(fen);
    const st = o.style ?? [22, 24, 0.55, 0.55];
    this.style.push(st[0], st[1], st[2], st[3]);
    const or = o.origine ?? [0, 0];
    this.orig.push(or[0], or[1]);
    this.t.push(o.t ?? 0);
    return this.p.length / 3 - 1;
  }

  // Bloc défini par ses bornes. o.matrice : transformation appliquée ensuite
  // (rotation d'un escalier...). o.fen : fenêtres sur les faces verticales.
  boite(x0, x1, y0, y1, z0, z1, o = {}) {
    const c = [
      [x0, y0, z0],
      [x1, y0, z0],
      [x1, y1, z0],
      [x0, y1, z0],
      [x0, y0, z1],
      [x1, y0, z1],
      [x1, y1, z1],
      [x0, y1, z1],
    ];
    const faces = [
      [1, 5, 6, 2], // +x
      [4, 0, 3, 7], // -x
      [3, 2, 6, 7], // +y
      [4, 5, 1, 0], // -y
      [5, 4, 7, 6], // +z
      [0, 1, 2, 3], // -z
    ];
    const v = new Vector3();
    const nn = new Vector3();
    if (o.matrice) this.mn.getNormalMatrix(o.matrice);
    faces.forEach((f, k) => {
      nn.fromArray(AXES[k]);
      if (o.matrice) nn.applyMatrix3(this.mn).normalize();
      const fen = o.fen && k !== 2 && k !== 3 ? 1 : 0;
      const ids = f.map((i, j) => {
        v.fromArray(c[i]);
        if (o.matrice) v.applyMatrix4(o.matrice);
        return this.sommet(v.x, v.y, v.z, nn.x, nn.y, nn.z, j === 1 || j === 2 ? 1 : 0, j >= 2 ? 1 : 0, o, fen);
      });
      this.idx.push(ids[0], ids[1], ids[2], ids[0], ids[2], ids[3]);
    });
  }

  // Cylindre entre deux points (tubes de néon, poteaux, câbles, réservoirs).
  cylindre(a, b, r, segments = 8, o = {}, bouchons = false) {
    const A = new Vector3(...a);
    const B = new Vector3(...b);
    const axe = new Vector3().subVectors(B, A);
    const l = axe.length();
    axe.normalize();
    const u = Math.abs(axe.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
    const e1 = new Vector3().crossVectors(axe, u).normalize();
    const e2 = new Vector3().crossVectors(axe, e1);
    const base = this.p.length / 3;
    const ta = o.ta ?? o.t ?? 0;
    const tb = o.tb ?? o.t ?? 0;
    for (let i = 0; i <= segments; i++) {
      const ang = (i / segments) * Math.PI * 2;
      const n = new Vector3().addScaledVector(e1, Math.cos(ang)).addScaledVector(e2, Math.sin(ang));
      for (const [P, tt, vb] of [
        [A, ta, 0],
        [B, tb, 1],
      ]) {
        const q = new Vector3().copy(P).addScaledVector(n, r);
        this.sommet(q.x, q.y, q.z, n.x, n.y, n.z, i / segments, vb, { ...o, t: tt }, 0);
      }
    }
    for (let i = 0; i < segments; i++) {
      const a0 = base + i * 2;
      this.idx.push(a0, a0 + 2, a0 + 3, a0, a0 + 3, a0 + 1);
    }
    if (bouchons) {
      for (const [P, s, tt] of [
        [A, -1, ta],
        [B, 1, tb],
      ]) {
        const c0 = this.sommet(P.x, P.y, P.z, axe.x * s, axe.y * s, axe.z * s, 0.5, 0.5, { ...o, t: tt }, 0);
        const anneau = [];
        for (let i = 0; i < segments; i++) {
          const ang = (i / segments) * Math.PI * 2;
          const q = new Vector3().copy(P).addScaledVector(e1, Math.cos(ang) * r).addScaledVector(e2, Math.sin(ang) * r);
          anneau.push(this.sommet(q.x, q.y, q.z, axe.x * s, axe.y * s, axe.z * s, 0, 0, { ...o, t: tt }, 0));
        }
        for (let i = 0; i < segments; i++) {
          const j = (i + 1) % segments;
          if (s > 0) this.idx.push(c0, anneau[i], anneau[j]);
          else this.idx.push(c0, anneau[j], anneau[i]);
        }
      }
    }
    return l;
  }

  // Polyligne en tube (néons) : t va de t0 à t1 le long du tracé.
  tube(points, r, o = {}, t0 = 0, t1 = 1, ferme = false) {
    const pts = ferme ? [...points, points[0]] : points;
    let total = 0;
    for (let i = 1; i < pts.length; i++) total += new Vector3(...pts[i]).distanceTo(new Vector3(...pts[i - 1]));
    let cumul = 0;
    for (let i = 1; i < pts.length; i++) {
      const l = new Vector3(...pts[i]).distanceTo(new Vector3(...pts[i - 1]));
      const ta = t0 + ((t1 - t0) * cumul) / total;
      cumul += l;
      const tb = t0 + ((t1 - t0) * cumul) / total;
      // on prolonge un peu chaque segment : les coudes restent pleins
      const a = new Vector3(...pts[i - 1]);
      const b = new Vector3(...pts[i]);
      const d = new Vector3().subVectors(b, a).normalize().multiplyScalar(r * 0.9);
      this.cylindre(a.clone().sub(d).toArray(), b.clone().add(d).toArray(), r, 8, { ...o, ta, tb });
    }
  }

  // Chaînette entre deux points (câbles tendus entre les immeubles).
  chainette(a, b, fleche, r, o = {}, n = 12) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      pts.push([a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s - fleche * 4 * s * (1 - s), a[2] + (b[2] - a[2]) * s]);
    }
    for (let i = 1; i < pts.length; i++) this.cylindre(pts[i - 1], pts[i], r, 5, o);
  }

  geometrie() {
    const g = new BufferGeometry();
    const f = (a, k) => new BufferAttribute(new Float32Array(a), k);
    g.setAttribute('position', f(this.p, 3));
    g.setAttribute('normal', f(this.n, 3));
    g.setAttribute('uv', f(this.uv, 2));
    g.setAttribute('uvBord', f(this.uvb, 2));
    g.setAttribute('graine', f(this.g, 1));
    g.setAttribute('fen', f(this.fen, 1));
    g.setAttribute('style', f(this.style, 4));
    g.setAttribute('origine', f(this.orig, 2));
    g.setAttribute('t', f(this.t, 1));
    const n = this.p.length / 3;
    g.setIndex(n > 65535 ? new BufferAttribute(new Uint32Array(this.idx), 1) : new BufferAttribute(new Uint16Array(this.idx), 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

// ---------------------------------------------------------------------------
// La rue : une rue étroite et profonde, des immeubles hauts et denses. Façades
// sur x = ±95 (la chaussée de x = -70 à 70, les trottoirs jusqu'à ±95).
// La caméra avance de z = 560 à 140 à hauteur d'yeux en regardant vers -Z.
// ---------------------------------------------------------------------------
export const RUE = { facade: 95, chaussee: 70, trottoir: 2.2, zDebut: 760, zFin: -3000 };
const REZ = 34; // hauteur du rez-de-chaussée (vitrines)

export function genererVille(graineDepart = 11) {
  let graine = graineDepart;
  const alea = () => (graine = (graine * 16807) % 2147483647) / 2147483647;
  const entre = (a, b) => a + alea() * (b - a);

  const facades = new Kit(80); // béton : masses, vitrines, bandeaux
  const metal = new Kit(60); // tôle peinte : climatiseurs, escaliers, cadres d'enseignes, poteaux, câbles
  const route = new Kit(140);
  const trottoirs = new Kit(70);
  const peinture = new Kit(140);
  const neons = new Kit(60);
  const lampes = new Kit(60);
  const enseignes = []; // { centre, couleur (0 à 1 dans le dégradé), taille }
  const lampadaires = [];

  // --- immeubles en front de rue ------------------------------------------------
  for (const cote of [-1, 1]) {
    const xF = cote * RUE.facade; // plan de la façade
    const vers = -cote; // direction de la rue depuis la façade (vers x = 0)
    let z1 = RUE.zDebut;
    while (z1 > RUE.zFin) {
      const largeur = entre(110, 210);
      const z0 = z1 - largeur;
      const profondeur = entre(140, 190);
      const loin = Math.max(0, -z0 / 3000);
      const h = REZ + entre(130, 520) + loin * entre(0, 700);
      const g = alea();
      const style = [entre(17, 26), entre(22, 26), entre(0.42, 0.72), entre(0.48, 0.66)];
      const origine = [z0 + entre(0, 4), REZ];
      const xArr = xF - vers * profondeur; // façade arrière
      const [xa, xb] = cote < 0 ? [xArr, xF] : [xF, xArr];
      const op = { graine: g, style, origine };

      // masse au-dessus du rez-de-chaussée, et rez en retrait avec sa vitrine
      facades.boite(xa, xb, REZ, h, z0, z1, { ...op, fen: 1 });
      const xr = xF - vers * 3; // face du rez, en retrait de 3
      facades.boite(Math.min(xArr, xr), Math.max(xArr, xr), 0, REZ, z0, z1, op);
      // vitrine : une grande baie posée devant le rez (intérieur de boutique)
      facades.boite(Math.min(xr, xr + vers * 0.6), Math.max(xr, xr + vers * 0.6), 2.5, REZ - 3, z0 + 5, z1 - 5, {
        graine: g,
        style: [z1 - z0 - 10, REZ - 4, 0.94, 0.86],
        origine: [z0 + 5, 2.5],
        fen: 1,
      });

      // corniche, acrotère
      const [ca, cb] = cote < 0 ? [xArr, xF + vers * 3.5] : [xF + vers * 3.5, xArr];
      facades.boite(ca, cb, h, h + 4, z0 - 2, z1 + 2, op);
      facades.boite(ca, cb, REZ - 1.5, REZ + 1.5, z0 - 1, z1 + 1, op); // bandeau au-dessus des vitrines

      const proche = z0 > -1700;
      const nEtages = Math.floor((h - REZ) / style[1]);
      const typeFacade = Math.floor(alea() * 4);
      const dalle = (y, ep, saillie, za, zb, kit = facades, o = op) => {
        const [a, b] = cote < 0 ? [xF, xF + vers * saillie] : [xF + vers * saillie, xF];
        kit.boite(Math.min(a, b), Math.max(a, b), y, y + ep, za, zb, o);
      };
      if (typeFacade === 0) {
        // bandeaux d'étage
        for (let k = 1; k < nEtages; k++) dalle(REZ + k * style[1] - 1.2, 2.4, 1.8, z0, z1);
      } else if (typeFacade === 1) {
        // pilastres : des nervures verticales entre les fenêtres
        for (let u = origine[0]; u < z1 - 2; u += style[0]) if (u > z0 + 2) dalle(REZ, h - REZ - 4, 2.6, u - 1.1, u + 1.1);
      } else if (typeFacade === 2 && proche) {
        // balcons : dalle, garde-corps vitré sombre, main courante
        for (let k = 1; k < nEtages; k++) {
          for (let u = origine[0] + style[0] * 0.15; u + style[0] * 1.7 < z1; u += style[0] * 2) {
            if (alea() < 0.25) continue;
            const y = REZ + k * style[1] - 1;
            dalle(y, 1.6, 10, u, u + style[0] * 1.7);
            const [ga, gb] = cote < 0 ? [xF + vers * 9.4, xF + vers * 10] : [xF + vers * 10, xF + vers * 9.4];
            metal.boite(Math.min(ga, gb), Math.max(ga, gb), y + 1.6, y + 8.5, u, u + style[0] * 1.7, { graine: g });
            metal.boite(Math.min(ga, gb) - 0.3, Math.max(ga, gb) + 0.3, y + 8.5, y + 9.3, u, u + style[0] * 1.7, { graine: g });
          }
        }
      }

      if (proche) {
        // climatiseurs sous certaines fenêtres
        for (let k = 0; k < 10; k++) {
          const etage = Math.floor(entre(1, Math.max(2, nEtages - 1)));
          const cel = Math.floor(entre(0, (z1 - z0) / style[0]));
          const u = origine[0] + (cel + 0.5) * style[0];
          if (u < z0 + 6 || u > z1 - 6) continue;
          const y = REZ + etage * style[1] + 1;
          const [a, b] = cote < 0 ? [xF, xF + vers * 6.5] : [xF + vers * 6.5, xF];
          metal.boite(Math.min(a, b), Math.max(a, b), y, y + 6, u - 4.5, u + 4.5, { graine: g });
        }
        // descente d'eau pluviale le long d'un angle
        if (alea() < 0.6) metal.cylindre([xF + vers * 1.6, 0, z0 + 2.5], [xF + vers * 1.6, h, z0 + 2.5], 0.9, 6, { graine: g });
        // escalier de secours métallique
        if ((typeFacade === 0 || typeFacade === 3) && alea() < 0.45 && z1 - z0 > 120) {
          const ua = origine[0] + style[0];
          const ub = ua + style[0] * 2.2;
          for (let k = 1; k < Math.min(nEtages, 14); k++) {
            const y = REZ + k * style[1] - 2;
            dalle(y, 0.9, 14, ua, ub, metal, { graine: g }); // palier
            const [ga, gb] = cote < 0 ? [xF + vers * 13.4, xF + vers * 14] : [xF + vers * 14, xF + vers * 13.4];
            metal.boite(Math.min(ga, gb), Math.max(ga, gb), y + 7.5, y + 8.2, ua, ub, { graine: g }); // main courante
            for (const u of [ua, (ua + ub) / 2, ub]) metal.boite(Math.min(ga, gb), Math.max(ga, gb), y, y + 8, u - 0.3, u + 0.3, { graine: g });
            // volée d'escalier en biais vers le palier du dessus
            const lv = Math.hypot(style[1], ub - ua - 6);
            const ang = Math.atan2(style[1], ub - ua - 6);
            const m = new Matrix4()
              .makeTranslation(xF + vers * 9, y + 0.9, (ua + ub) / 2)
              .multiply(new Matrix4().makeRotationX((k % 2 ? 1 : -1) * ang));
            metal.boite(-2.8, 2.8, -0.4, 0.4, -lv / 2, lv / 2, { graine: g, matrice: m });
          }
        }
      }

      // toit : réservoir sur pieds, caissons, antenne
      const xm = (xa + xb) / 2;
      const zm = (z0 + z1) / 2;
      if (alea() < 0.45) {
        const xr = xm + entre(-30, 30);
        const zr = zm + entre(-20, 20);
        for (const [dx, dz] of [
          [-8, -8],
          [8, -8],
          [-8, 8],
          [8, 8],
        ])
          metal.boite(xr + dx - 0.8, xr + dx + 0.8, h + 4, h + 18, zr + dz - 0.8, zr + dz + 0.8, { graine: g });
        metal.cylindre([xr, h + 18, zr], [xr, h + 44, zr], 13, 14, { graine: g }, true);
      }
      for (let k = 0; k < 3; k++) if (alea() < 0.6) metal.boite(xm + entre(-50, 30), xm + entre(35, 55), h + 4, h + entre(9, 16), zm + entre(-50, 0), zm + entre(5, 50), { graine: g });
      if (alea() < 0.35) metal.boite(xm - 0.6, xm + 0.6, h + 4, h + entre(40, 90), zm - 0.6, zm + 0.6, { graine: g });

      // --- enseignes (formes abstraites, aucun texte) ---------------------------
      if (z0 > -2400) {
        const choix = alea();
        const couleur = alea();
        if (choix < 0.55) {
          // enseigne drapeau, perpendiculaire à la façade : elle fait face à la rue
          const zc = entre(z0 + 15, z1 - 15);
          const y0 = entre(REZ + 6, REZ + 70);
          const H = entre(60, 190);
          const saillie = entre(20, 30);
          const xa2 = xF + vers * 4;
          const xb2 = xF + vers * saillie;
          metal.boite(Math.min(xa2, xb2), Math.max(xa2, xb2), y0, y0 + H, zc - 1.6, zc + 1.6, { graine: couleur });
          // potences
          for (const yy of [y0 + 6, y0 + H - 6]) metal.boite(Math.min(xF, xa2), Math.max(xF, xa2), yy - 0.8, yy + 0.8, zc - 0.8, zc + 0.8, { graine: couleur });
          for (const s of [-1, 1]) {
            const z = zc + s * 2.1;
            const x0 = Math.min(xa2, xb2) + 2.5;
            const x1 = Math.max(xa2, xb2) - 2.5;
            const o = { graine: couleur };
            neons.tube(
              [
                [x0, y0 + 2.5, z],
                [x1, y0 + 2.5, z],
                [x1, y0 + H - 2.5, z],
                [x0, y0 + H - 2.5, z],
              ],
              0.8,
              o,
              0,
              1,
              true,
            );
            // barres intérieures : horizontales ou le motif « /// »
            if (alea() < 0.5) {
              for (let k = 1; k <= 3; k++) {
                const yy = y0 + (H * k) / 4;
                neons.tube([[x0 + 3, yy, z], [x1 - 3, yy, z]], 0.7, o, (k - 1) / 3, k / 3);
              }
            } else {
              const ls = (x1 - x0) * 0.8;
              for (let k = 0; k < 3; k++) {
                const yy = y0 + H * 0.35 + k * 8;
                neons.tube([[x0 + 2, yy, z], [x0 + 2 + ls * 0.7, yy + ls * 0.7, z]], 0.7, o, 0.2, 0.9);
              }
            }
          }
          enseignes.push({ centre: [(xa2 + xb2) / 2, y0 + H / 2, zc], couleur, taille: H });
        } else if (choix < 0.85) {
          // bandeau au-dessus des vitrines, à plat sur la façade
          const L = Math.min(z1 - z0 - 20, entre(50, 120));
          const zc = entre(z0 + 10 + L / 2, z1 - 10 - L / 2);
          const y0 = REZ + 3;
          const H = entre(8, 16);
          const [pa, pb] = cote < 0 ? [xF, xF + vers * 1.6] : [xF + vers * 1.6, xF];
          metal.boite(Math.min(pa, pb), Math.max(pa, pb), y0, y0 + H, zc - L / 2, zc + L / 2, { graine: couleur });
          const x = xF + vers * 2.3;
          neons.tube(
            [
              [x, y0 + 1.5, zc - L / 2 + 1.5],
              [x, y0 + 1.5, zc + L / 2 - 1.5],
              [x, y0 + H - 1.5, zc + L / 2 - 1.5],
              [x, y0 + H - 1.5, zc - L / 2 + 1.5],
            ],
            0.65,
            { graine: couleur },
            0,
            1,
            true,
          );
          enseignes.push({ centre: [x, y0 + H / 2, zc], couleur, taille: L * 0.6 });
        } else {
          // trois barres verticales le long de la façade
          const zc = entre(z0 + 12, z1 - 20);
          const y0 = entre(REZ + 10, REZ + 60);
          const H = entre(70, 200);
          const x = xF + vers * 2.5;
          for (let k = 0; k < 3; k++) {
            const z = zc + k * 5;
            metal.boite(Math.min(xF, x), Math.max(xF, x), y0 - 2, y0 + H + 2, z - 1.6, z + 1.6, { graine: couleur });
            neons.tube([[x + vers * 0.6, y0, z], [x + vers * 0.6, y0 + H, z]], 0.75, { graine: couleur }, 0, 1);
          }
          enseignes.push({ centre: [x, y0 + H / 2, zc + 5], couleur, taille: H * 0.6 });
        }
      }

      // ruelle entre deux immeubles, parfois
      z1 = z0 - (alea() < 0.25 ? entre(8, 22) : 0);
    }
  }

  // --- arrière-plans : îlots plus loin de la rue, en volumes simples -------------
  const blocs = [];
  for (const cote of [-1, 1]) {
    for (let col = 1; col < 5; col++) {
      for (let rang = 0; rang < 20; rang++) {
        const x0 = cote * (95 + 200 + (col - 1) * 190);
        const z0 = 600 - rang * 190;
        const l = entre(150, 180);
        const p = entre(150, 180);
        const h = 200 + alea() * 420 + rang * 26 + col * 70;
        const cx = x0 + (cote * l) / 2;
        blocs.push([cx, z0, l, p, h, 0, alea()]);
        let ll = l;
        let pp = p;
        let base = h;
        for (let k = 0; k < 2 && alea() < 0.6; k++) {
          ll *= 0.55 + alea() * 0.25;
          pp *= 0.55 + alea() * 0.25;
          const hh = 60 + alea() * 260;
          blocs.push([cx + (alea() - 0.5) * (l - ll) * 0.5, z0 + (alea() - 0.5) * (p - pp) * 0.5, ll, pp, hh, base, alea()]);
          base += hh;
        }
      }
    }
  }
  // fond de rue : la ville se dresse au bout, en couches de plus en plus sombres
  for (let k = 0; k < 26; k++) {
    const cx = entre(-1400, 1400);
    const z0 = entre(-3100, -4200);
    blocs.push([cx, z0, entre(120, 260), entre(120, 260), entre(500, 1500), 0, alea()]);
  }

  // --- sol : chaussée, trottoirs, marquages, plaques ------------------------------
  const zA = RUE.zFin - 200;
  const zB = RUE.zDebut + 300;
  route.boite(-RUE.chaussee, RUE.chaussee, -1, 0, zA, zB);
  for (const cote of [-1, 1]) {
    const [a, b] = cote < 0 ? [-RUE.facade - 4, -RUE.chaussee] : [RUE.chaussee, RUE.facade + 4];
    trottoirs.boite(a, b, 0, RUE.trottoir, zA, zB);
  }
  // ligne médiane en tirets, passage piéton
  for (let z = zB - 40; z > zA; z -= 70) peinture.boite(-0.8, 0.8, 0, 0.06, z - 30, z);
  for (let x = -62; x <= 62; x += 13) peinture.boite(x - 3.5, x + 3.5, 0, 0.06, 190, 232);
  for (const cote of [-1, 1]) for (let z = zB - 20; z > zA; z -= 120) peinture.boite(cote * 64 - 0.6, cote * 64 + 0.6, 0, 0.06, z - 60, z);
  // plaques d'égout (l'une fume)
  const plaques = [
    [-22, 330],
    [30, -120],
    [-8, -640],
    [26, -1250],
  ];
  for (const [x, z] of plaques) metal.cylindre([x, -0.2, z], [x, 0.12, z], 6.5, 16, {}, true);

  // --- lampadaires --------------------------------------------------------------
  for (const cote of [-1, 1]) {
    for (let z = 640 + (cote > 0 ? 75 : 0); z > -2400; z -= 150) {
      const x = cote * 82;
      metal.cylindre([x, RUE.trottoir, z], [x, 112, z], 1, 8, {}, true);
      metal.boite(Math.min(x, x - cote * 26), Math.max(x, x - cote * 26), 108.5, 110.5, z - 0.8, z + 0.8);
      const xt = x - cote * 26;
      metal.boite(xt - 6, xt + 6, 106, 109, z - 3, z + 3);
      lampes.boite(xt - 5, xt + 5, 105.6, 106, z - 2.4, z + 2.4);
      lampadaires.push([xt, 105.5, z]);
    }
  }

  // --- câbles tendus d'une façade à l'autre -----------------------------------------
  for (let k = 0; k < 28; k++) {
    const z = entre(-1800, 520);
    const y1 = entre(90, 320);
    metal.chainette([-RUE.facade, y1, z], [RUE.facade, y1 + entre(-30, 30), z + entre(-40, 40)], entre(8, 26), 0.35);
  }

  return { facades, metal, route, trottoirs, peinture, neons, lampes, enseignes, lampadaires, blocs, plaques };
}
