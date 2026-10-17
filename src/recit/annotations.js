import { Vector3 } from 'three';

// Annotations de la vue éclatée (beat 2), disposées comme la nomenclature d'un plan :
// un point sur la pièce, une ligne de cote qui part à l'angle signature (32° depuis
// la verticale) puis file à l'horizontale vers l'étiquette. Les étiquettes se rangent
// sur des rangées au-dessus ou au-dessous de la carte, sans se chevaucher.
// Chaque annotation a une progression de 0 à 1 que la timeline anime :
// la ligne se dessine, puis l'étiquette se révèle.

// Point d'accroche sur chaque pièce (mm, pièce assemblée) et côté de l'étiquette.
const ACCROCHES = {
  coque: { p: [-60, -61.5, 34], cote: 'bas' },
  ventilateurs: { p: [115.5, -49.5, 31], cote: 'bas' },
  radiateur: { p: [100, -57, 14], cote: 'bas' },
  corePipes: { p: [-140, -40, -11], cote: 'bas' },
  plaqueBase: { p: [-70, 38, -23.7], cote: 'haut' },
  pcb: { p: [-90, -74.5, -30], cote: 'bas' },
  gpu: { p: [-70, 30, -28.5], cote: 'haut' },
  memoire: { p: [-79, -42, -28.9], cote: 'bas' },
  connecteur: { p: [2, 61, -19], cote: 'haut' },
  backplate: { p: [120, 74.5, -35], cote: 'haut' },
  equerre: { p: [-179.5, 60, -12], cote: 'haut' },
};

const TAN = Math.tan((32 * Math.PI) / 180);
const PALIER = 46; // longueur du segment horizontal (px)
const SVG = 'http://www.w3.org/2000/svg';

export function creerAnnotations({ carte, camera }) {
  const svg = document.getElementById('annotations-lignes');
  const conteneur = document.getElementById('annotations');
  const titre = document.getElementById('t-eclate');
  const hud = ['label-beat', 'coordonnees', 'commandes'].map((id) => document.getElementById(id));
  const v = new Vector3();

  const items = carte.pieces.map((piece) => {
    const a = ACCROCHES[piece.id];
    const chemin = document.createElementNS(SVG, 'path');
    const point = document.createElementNS(SVG, 'circle');
    point.setAttribute('r', '2.2');
    svg.append(chemin, point);
    const etiquette = document.createElement('div');
    etiquette.className = 'annotation';
    etiquette.innerHTML = `<span class="annotation-num">${piece.num}</span><span class="annotation-nom">${piece.nom}</span>${
      piece.detail ? `<span class="annotation-detail">${piece.detail}</span>` : ''
    }`;
    conteneur.append(etiquette);
    return { piece, accroche: new Vector3(...a.p), cote: a.cote, chemin, point, etiquette, progression: 0, place: null };
  });

  addEventListener('resize', () => items.forEach((it) => ((it.largeur = 0), (it.place = null))));

  const chevauche = (r, liste) => liste.some((o) => r.x0 < o.x1 && r.x1 > o.x0 && r.y0 < o.y1 && r.y1 > o.y0);

  function maj() {
    const W = innerWidth;
    const H = innerHeight;
    const marge = 24;
    const visibles = items.filter((it) => it.progression > 0.001);
    for (const it of items) {
      if (it.progression > 0.001) continue;
      it.chemin.style.display = 'none';
      it.point.style.display = 'none';
      it.etiquette.style.opacity = 0;
      it.place = null;
    }
    if (!visibles.length) return;

    // Projection des accroches.
    for (const it of visibles) {
      v.copy(it.accroche).applyMatrix4(it.piece.groupe.matrixWorld).project(camera);
      it.x = ((v.x + 1) / 2) * W;
      it.y = ((1 - v.y) / 2) * H;
      if (!it.largeur) {
        it.largeur = it.etiquette.offsetWidth;
        it.hauteur = it.etiquette.offsetHeight;
      }
    }

    // Rangées : au-dessus de l'accroche la plus haute, au-dessous de la plus basse.
    const pas = (visibles[0].hauteur || 40) + 8;
    const tous = items.map((it) => {
      v.copy(it.accroche).applyMatrix4(it.piece.groupe.matrixWorld).project(camera);
      return ((1 - v.y) / 2) * H;
    });
    const haut0 = Math.min(...tous) - 36;
    const bas0 = Math.max(...tous) + 36;
    const rangee = (cote, k) => (cote === 'haut' ? haut0 - k * pas : bas0 + k * pas);

    // Zones interdites : le titre du beat et les éléments du HUD.
    const occupes = [];
    for (const el of [titre, ...hud]) {
      if (el.style.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width) occupes.push({ x0: r.left - 12, x1: r.right + 12, y0: r.top - 12, y1: r.bottom + 12 });
    }

    const essayer = (it, k, s, cote = it.cote) => {
      const yc = rangee(cote, k);
      if (yc < marge + 12 || yc > H - marge - 12) return null;
      const dy = Math.abs(yc - it.y);
      const xc = it.x + s * dy * TAN;
      const xf = xc + s * PALIER;
      const xe = s > 0 ? xf + 8 : xf - 8 - it.largeur;
      const boite = { x0: xe - 6, x1: xe + it.largeur + 6, y0: yc - it.hauteur * 0.5, y1: yc + it.hauteur * 0.85 };
      if (boite.x0 < marge + 40 || boite.x1 > W - marge) return null;
      if (chevauche(boite, occupes)) return null;
      return { k, s, cote, yc, xc, xf, xe, boite };
    };

    // De gauche à droite ; chaque étiquette garde sa place tant qu'elle reste libre.
    // Si son côté est plein, elle passe de l'autre côté de la carte.
    visibles.sort((a, b) => a.x - b.x);
    const autre = (c) => (c === 'haut' ? 'bas' : 'haut');
    for (const it of visibles) {
      let place = it.place && essayer(it, it.place.k, it.place.s, it.place.cote);
      for (let k = 0; !place && k < 8; k++) place = essayer(it, k, 1) || essayer(it, k, -1);
      for (let k = 0; !place && k < 8; k++) place = essayer(it, k, 1, autre(it.cote)) || essayer(it, k, -1, autre(it.cote));
      if (!place) place = it.dernier;
      if (!place) {
        // dernier recours : première rangée, à droite
        const yc = rangee(it.cote, 0);
        const xc = it.x + Math.abs(yc - it.y) * TAN;
        place = { k: 0, s: 1, yc, xc, xf: xc + PALIER, xe: xc + PALIER + 8, boite: { x0: 0, x1: 0, y0: 0, y1: 0 } };
      }
      it.place = { k: place.k, s: place.s, cote: place.cote ?? it.cote };
      it.dernier = place;
      occupes.push(place.boite);
      dessiner(it, place);
    }
  }

  function dessiner(it, { yc, xc, xf, xe, s }) {
    const p = it.progression;
    it.chemin.style.display = '';
    it.point.style.display = '';
    const d = `M${it.x.toFixed(1)} ${it.y.toFixed(1)}L${xc.toFixed(1)} ${yc.toFixed(1)}H${xf.toFixed(1)}`;
    it.chemin.setAttribute('d', d);
    const longueur = Math.hypot(xc - it.x, yc - it.y) + Math.abs(xf - xc);
    const trace = Math.min(1, p / 0.6);
    it.chemin.style.strokeDasharray = `${longueur}`;
    it.chemin.style.strokeDashoffset = `${longueur * (1 - trace)}`;
    it.point.setAttribute('cx', it.x.toFixed(1));
    it.point.setAttribute('cy', it.y.toFixed(1));
    const texte = Math.max(0, (p - 0.55) / 0.45);
    it.etiquette.style.opacity = texte;
    it.etiquette.style.transform = `translate3d(${xe}px, ${yc - 9}px, 0)`;
    it.etiquette.style.clipPath = s > 0 ? `inset(0 ${(1 - texte) * 100}% 0 0)` : `inset(0 0 0 ${(1 - texte) * 100}%)`;
  }

  return { items, maj, parId: (id) => items.find((i) => i.piece.id === id) };
}
