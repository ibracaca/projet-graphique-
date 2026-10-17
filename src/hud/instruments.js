import { Vector3 } from 'three';
import { ETAPES, etapeDe } from '../scene/image.js';

// Instruments de l'acte III : règle d'échelle en direct (beat 7), compteur de
// cœurs CUDA (beat 8), chronomètre et étapes de l'image (beat 10).

const SVG = 'http://www.w3.org/2000/svg';
const HAUT = -0.5; // haut de la règle : 10^-0,5 m
const BAS = -8.5; // bas de la règle

export function creerInstrumentsActe3(camera) {
  // --- règle logarithmique : une graduation majeure par décade, 8 mineures ---
  const svg = document.getElementById('regle-svg');
  const corps = svg.parentElement;
  const curseur = document.createElementNS(SVG, 'line');
  curseur.setAttribute('class', 'curseur');
  function dessinerRegle() {
    svg.replaceChildren();
    const h = corps.clientHeight;
    const w = corps.clientWidth;
    const y = (z) => ((HAUT - z) / (HAUT - BAS)) * h;
    for (let e = -1; e >= -8; e--) {
      for (let k = 1; k <= 9; k++) {
        const z = e + Math.log10(k);
        if (z > HAUT || z < BAS) continue;
        const l = document.createElementNS(SVG, 'line');
        const majeure = k === 1;
        l.setAttribute('x1', w - (majeure ? 22 : 9));
        l.setAttribute('x2', w);
        l.setAttribute('y1', y(z));
        l.setAttribute('y2', y(z));
        if (majeure) l.setAttribute('class', 'majeure');
        svg.append(l);
        if (majeure) {
          const t = document.createElementNS(SVG, 'text');
          t.setAttribute('x', w - 30);
          t.setAttribute('y', y(z) + 3.5);
          t.setAttribute('text-anchor', 'end');
          t.textContent = '10';
          const sup = document.createElementNS(SVG, 'tspan');
          sup.setAttribute('dy', '-4');
          sup.setAttribute('font-size', '7');
          sup.textContent = exposant(e);
          t.append(sup);
          svg.append(t);
        }
      }
    }
    curseur.setAttribute('x1', w - 40);
    curseur.setAttribute('x2', w + 6);
    svg.append(curseur);
    return { y };
  }
  let regle = dessinerRegle();
  addEventListener('resize', () => (regle = dessinerRegle()));
  const valeur = document.getElementById('regle-valeur');

  const compteur = document.getElementById('compteur-cuda');
  const chrono = document.getElementById('chrono');

  const liste = document.getElementById('etapes');
  const items = ETAPES.map((nom, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="num">${String(i + 1).padStart(2, '0')}</span><span>${nom}</span>`;
    liste.append(li);
    return li;
  });

  const cible = new Vector3();
  let dernier = {};
  const changer = (cle, v, f) => {
    if (dernier[cle] !== v) {
      dernier[cle] = v;
      f(v);
    }
  };

  return {
    maj(E) {
      // échelle : celle de la caméra 3D, ou celle du microscope quand il est là
      let z;
      if (E.micro > 0.5) z = E.zoom;
      else {
        cible.set(E.cam.cx, E.cam.cy, E.cam.cz);
        const d = camera.position.distanceTo(cible);
        const largeur = 2 * d * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect; // mm
        z = Math.log10(largeur / 1000);
      }
      if (document.getElementById('regle').style.visibility === 'visible') {
        const zr = Math.round(z * 200) / 200;
        changer('z', zr, () => {
          curseur.setAttribute('y1', regle.y(Math.max(BAS, Math.min(HAUT, z))));
          curseur.setAttribute('y2', regle.y(Math.max(BAS, Math.min(HAUT, z))));
          const e = Math.floor(z);
          const m = Math.pow(10, z - e);
          valeur.innerHTML = `${m.toFixed(1).replace('.', ',')} × 10<sup>${exposant(e)}</sup> m`;
        });
      }
      // cœurs CUDA : 128 par SM actif
      changer('cuda', Math.round(E.coeurs * 170) * 128, (n) => (compteur.textContent = n.toLocaleString('fr-FR')));
      // chronomètre : 1/240 s = 4,17 ms
      changer('chrono', Math.round(E.image * 417), (c) => (chrono.textContent = (c / 100).toFixed(2).replace('.', ',')));
      const etape = E.imageVisible > 0.01 ? etapeDe(E.image) : -1;
      changer('etape', etape, (k) =>
        items.forEach((li, i) => {
          li.classList.toggle('active', i === k);
          li.classList.toggle('faite', k >= 0 && i < k);
        }),
      );
    },
  };
}

// « −6 » en notation d'exposant (signe moins typographique)
function exposant(e) {
  return `−${Math.abs(e)}`;
}
