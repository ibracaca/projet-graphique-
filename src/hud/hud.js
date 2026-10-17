import gsap from 'gsap';
import { Box3, Vector3 } from 'three';
import { ACTES, longueursActes } from '../recit/cue.js';

// Interface permanente (DESIGN.md, section 6.1).

const CARACTERES_HEX = '0123456789ABCDEF';

export function creerHUD({ camera, son }) {
  const hud = document.getElementById('hud');
  const reticules = [...document.querySelectorAll('.reticule')];
  const labelBeat = document.getElementById('label-beat');
  const coord = document.getElementById('coordonnees');
  const rail = document.getElementById('rail');
  const oscillo = document.getElementById('oscillo');
  const ctxOscillo = oscillo.getContext('2d');
  const btnSon = document.getElementById('btn-son');
  const btnSonTexte = document.getElementById('btn-son-texte');
  const indication = document.getElementById('indication');

  // --- Rail : 4 segments proportionnels à la longueur prévue de chaque acte ---
  const longueurs = longueursActes();
  const total = longueurs.reduce((a, b) => a + b, 0);
  const remplissages = ACTES.map((acte, i) => {
    const seg = document.createElement('button');
    seg.className = 'rail-segment';
    seg.dataset.curseur = 'bouton';
    seg.style.flex = String(longueurs[i] / total);
    seg.setAttribute('aria-label', `Acte ${acte.num} : ${acte.nom}`);
    seg.innerHTML = `<span class="rail-remplissage"></span><span class="rail-nom hud-texte">ACTE ${acte.num} : ${acte.nom.toUpperCase()}</span>`;
    rail.append(seg);
    seg.addEventListener('click', () => hudApi.auClicActe?.(i));
    return seg.querySelector('.rail-remplissage');
  });

  // --- Réticules : aux coins de l'écran, ou resserrés sur la carte (mise au point) ---
  const boiteCarte = new Box3(new Vector3(-180, -75, -35), new Vector3(181, 75, 36));
  const coins = Array.from({ length: 8 }, () => new Vector3());
  function cadreCarte() {
    const { min, max } = boiteCarte;
    let i = 0;
    for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) coins[i++].set(x, y, z);
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const c of coins) {
      c.project(camera);
      const sx = ((c.x + 1) / 2) * innerWidth;
      const sy = ((1 - c.y) / 2) * innerHeight;
      x0 = Math.min(x0, sx);
      x1 = Math.max(x1, sx);
      y0 = Math.min(y0, sy);
      y1 = Math.max(y1, sy);
    }
    return { x0: x0 - 28, y0: y0 - 28, x1: x1 + 28, y1: y1 + 28 };
  }

  const marge = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--marge')) || 24;
  let margePx = marge();
  addEventListener('resize', () => (margePx = marge()));

  // --- Label du beat : se décode quand on change de beat ---
  let labelActuel = '';
  function changerLabel(texte) {
    if (texte === labelActuel) return;
    labelActuel = texte;
    gsap.to(labelBeat, { duration: 0.32, scrambleText: { text: texte || ' ', chars: CARACTERES_HEX, speed: 1 }, ease: 'none', overwrite: true });
  }

  // --- Bouton son : état et oscilloscope du signal réel ---
  function majBoutonSon() {
    const actif = son.etat.allume && !son.etat.muet;
    btnSonTexte.textContent = actif ? '[ SON : ON ]' : '[ SON : OFF ]';
    btnSon.setAttribute('aria-pressed', String(actif));
  }
  function dessinerOscillo() {
    const w = oscillo.width;
    const h = oscillo.height;
    ctxOscillo.clearRect(0, 0, w, h);
    ctxOscillo.strokeStyle = 'rgba(190, 192, 196, 0.85)';
    ctxOscillo.lineWidth = 1.5;
    ctxOscillo.beginPath();
    const onde = son.etat.allume && !son.etat.muet ? son.formeOnde() : null;
    for (let i = 0; i <= w; i += 2) {
      const v = onde ? (onde[Math.floor((i / w) * (onde.length - 1))] - 128) / 128 : 0;
      const y = h / 2 + v * h * 0.45;
      i ? ctxOscillo.lineTo(i, y) : ctxOscillo.moveTo(i, y);
    }
    ctxOscillo.stroke();
  }

  let image = 0;
  let indicationVisible = true;
  const fmt = (v) => (v < 0 ? '-' : '+') + String(Math.round(Math.abs(v))).padStart(4, '0');

  const hudApi = {
    afficher() {
      gsap.to(hud, { opacity: 1, duration: 1.6, ease: 'traine' });
    },
    changerLabel,
    majBoutonSon,
    auClicActe: null,
    masquerIndication() {
      if (!indicationVisible) return;
      indicationVisible = false;
      gsap.to(indication, { opacity: 0, duration: 0.6, ease: 'traine', overwrite: true });
    },
    montrerIndication() {
      indicationVisible = true;
      gsap.to(indication, { opacity: 1, duration: 0.6, ease: 'traine', overwrite: true });
    },
    // progressionActes : [0..1] par acte
    maj(etat, progressionActes) {
      image++;
      // réticules
      const m = margePx;
      const W = innerWidth;
      const H = innerHeight;
      const k = etat.miseAuPoint;
      const cadre = k > 0.001 ? cadreCarte() : null;
      const pos = {
        hg: [m, m],
        hd: [W - m, m],
        bg: [m, H - m],
        bd: [W - m, H - m],
      };
      if (cadre) {
        const c = { hg: [cadre.x0, cadre.y0], hd: [cadre.x1, cadre.y0], bg: [cadre.x0, cadre.y1], bd: [cadre.x1, cadre.y1] };
        for (const cle in pos) pos[cle] = pos[cle].map((v, i) => v + (c[cle][i] - v) * k);
      }
      for (const r of reticules) {
        const [x, y] = pos[r.dataset.coin];
        r.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
      // rail
      progressionActes.forEach((p, i) => (remplissages[i].style.transform = `scaleY(${p})`));
      // coordonnées et oscilloscope, une image sur deux
      if (image % 2 === 0) {
        const c = camera.position;
        coord.textContent = `CAM X ${fmt(c.x)} Y ${fmt(c.y)} Z ${fmt(c.z)}`;
        dessinerOscillo();
      }
    },
  };
  return hudApi;
}
