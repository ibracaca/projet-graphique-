import { Euler, MathUtils, PerspectiveCamera, Vector3 } from 'three';

// Retrouve la caméra d'une photo à partir de points dont on connaît la position
// sur la carte (mm) et sur la photo (pixels). Inconnues : position (3), lacet,
// tangage, roulis (degrés) et champ de vision vertical. Minimisation de l'erreur
// de reprojection par la méthode de Nelder-Mead.

const cam = new PerspectiveCamera();
const v = new Vector3();
const euler = new Euler(0, 0, 0, 'YXZ');
const rad = MathUtils.degToRad;

export function poserCamera(camera, p, aspect) {
  const [x, y, z, lacet, tangage, roulis, fov] = p;
  camera.fov = fov;
  camera.aspect = aspect;
  camera.position.set(x, y, z);
  camera.quaternion.setFromEuler(euler.set(rad(tangage), rad(lacet), rad(roulis), 'YXZ'));
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
}

function projeter(p, monde, l, h) {
  v.set(...monde).project(cam);
  return [((v.x + 1) / 2) * l, ((1 - v.y) / 2) * h, v.z];
}

function erreur(p, points, l, h) {
  if (p[6] < 3 || p[6] > 80) return 1e12;
  poserCamera(cam, p, l / h);
  let e = 0;
  for (const { monde, pixel, poids = 1 } of points) {
    const [px, py, z] = projeter(p, monde, l, h);
    if (z > 1 || z < -1) return 1e12;
    e += poids * ((px - pixel[0]) ** 2 + (py - pixel[1]) ** 2);
  }
  return e;
}

function nelderMead(f, depart, pas, iterations = 3000) {
  const n = depart.length;
  let simplexe = [depart.slice()];
  for (let i = 0; i < n; i++) {
    const p = depart.slice();
    p[i] += pas[i];
    simplexe.push(p);
  }
  let valeurs = simplexe.map(f);
  for (let it = 0; it < iterations; it++) {
    const ordre = valeurs.map((val, i) => [val, i]).sort((a, b) => a[0] - b[0]);
    simplexe = ordre.map(([, i]) => simplexe[i]);
    valeurs = ordre.map(([val]) => val);
    const centre = new Array(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) centre[j] += simplexe[i][j] / n;
    const pire = simplexe[n];
    const combiner = (k) => centre.map((c, j) => c + k * (pire[j] - c));
    const r = combiner(-1);
    const fr = f(r);
    if (fr < valeurs[0]) {
      const e = combiner(-2);
      const fe = f(e);
      [simplexe[n], valeurs[n]] = fe < fr ? [e, fe] : [r, fr];
    } else if (fr < valeurs[n - 1]) {
      [simplexe[n], valeurs[n]] = [r, fr];
    } else {
      const c = combiner(0.5);
      const fc = f(c);
      if (fc < valeurs[n]) [simplexe[n], valeurs[n]] = [c, fc];
      else {
        for (let i = 1; i <= n; i++) {
          simplexe[i] = simplexe[i].map((x, j) => simplexe[0][j] + 0.5 * (x - simplexe[0][j]));
          valeurs[i] = f(simplexe[i]);
        }
      }
    }
  }
  const meilleur = valeurs.indexOf(Math.min(...valeurs));
  return { p: simplexe[meilleur], e: valeurs[meilleur] };
}

// Recherche grossière : caméra tournée vers l'origine, sur une grille d'orientations,
// de distances et de champs de vision. Donne de bons départs à Nelder-Mead.
function grille(f) {
  const essais = [];
  const dir = new Vector3();
  for (let lacet = -180; lacet < 180; lacet += 20) {
    for (let tangage = -80; tangage <= 80; tangage += 16) {
      for (let roulis = -180; roulis < 180; roulis += 30) {
        for (const fov of [18, 30, 45]) {
          for (const dist of [350, 600, 1000]) {
            euler.set(rad(tangage), rad(lacet), rad(roulis), 'YXZ');
            dir.set(0, 0, -1).applyEuler(euler);
            const p = [-dir.x * dist, -dir.y * dist, -dir.z * dist, lacet, tangage, roulis, fov];
            essais.push([f(p), p]);
          }
        }
      }
    }
  }
  return essais.sort((a, b) => a[0] - b[0]).slice(0, 4).map(([, p]) => p);
}

export function calerSurPhoto({ points, depart }, l, h) {
  const f = (p) => erreur(p, points, l, h);
  const pas = [100, 100, 100, 10, 10, 10, 6];
  let res = null;
  for (const p0 of [depart, ...grille(f)]) {
    let r = { p: p0 };
    for (let k = 0; k < 6; k++) r = nelderMead(f, r.p, pas.map((s) => s / (1 + k * 0.7)), 2000);
    if (!res || r.e < res.e) res = r;
  }
  poserCamera(cam, res.p, l / h);
  const ecarts = points.map(({ monde, pixel }) => {
    const [px, py] = projeter(res.p, monde, l, h);
    return Math.round(Math.hypot(px - pixel[0], py - pixel[1]));
  });
  const rms = Math.sqrt(ecarts.reduce((s, e) => s + e * e, 0) / ecarts.length);
  return { p: res.p, rms, ecarts, fov: res.p[6] };
}
