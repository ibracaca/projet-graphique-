// Salle noire : point d'entrée. Relie la scène, le scroll, le son et l'interface.
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/martian-mono/wdth.css';
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { creerSon } from './audio/son.js';
import { chargerTextures } from './carte/materiaux.js';
import { chargerModeleCarte } from './carte/modele.js';
import { creerCurseur } from './hud/curseur.js';
import { creerHUD } from './hud/hud.js';
import { construireActe1 } from './recit/acte1.js';
import { construireActe2 } from './recit/acte2.js';
import { construireActe3 } from './recit/acte3.js';
import { construireActe4 } from './recit/acte4.js';
import { creerFin } from './recit/fin.js';
import { creerInstrumentsActe3 } from './hud/instruments.js';
import { creerAnnotations } from './recit/annotations.js';
import { decoupage, scrollPourTemps } from './recit/cue.js';
import { lancerDemarrage } from './recit/demarrage.js';
import { chargerEnvironnement } from './scene/environnement.js';
import { creerPlateau, ETAT } from './scene/plateau.js';
import { creerRendu } from './scene/rendu.js';

gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin, CustomEase, SplitText);
// Les trois courbes signatures (DESIGN.md, 4.2), plus celle du curseur.
CustomEase.create('masse', '0.33,0,0,1');
CustomEase.create('traine', '0.19,1,0.22,1');
CustomEase.create('coupe', '0.76,0,0.24,1');
CustomEase.create('curseur', '0.20,0,0.10,1');

const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
history.scrollRestoration = 'manual';
scrollTo(0, 0);

// --- Chargements, suivis par l'écran de démarrage ---------------------------
const rendu = creerRendu(document.getElementById('scene'));
const son = creerSon();
const octets = { hdr: [0, 6.3e6], musique: [0, 6.2e6], modele: [0, 4e5] };
let etapesFaites = 0;
const compter = (p) => p.then((r) => (etapesFaites++, r));
const progression = () => {
  const parts = Object.values(octets);
  const recu = parts.reduce((s, [r]) => s + r, 0);
  const total = parts.reduce((s, [, t]) => s + t, 0);
  return Math.min(1, 0.85 * (recu / total) + 0.15 * (etapesFaites / 6));
};

const textes = compter(chargerTextures(rendu.renderer.capabilities.getMaxAnisotropy()));
const polices = compter(document.fonts.ready);
const environnement = compter(chargerEnvironnement(rendu.renderer, { seuil: 2.5, plancher: 0.06 }, (r, t) => (octets.hdr = [r, t])));
const musique = compter(son.charger((r, t) => (octets.musique = [r, t])));
const modele = compter(chargerModeleCarte((r, t) => (octets.modele = [r, t])));

// La carte a besoin de la texture d'alu brossé et du modèle : on la construit après.
const plateau = Promise.all([modele, textes]).then(([m]) => creerPlateau(rendu, m));
const gpu = compter(
  plateau.then(async (p) => {
    rendu.recenserMateriaux();
    await rendu.renderer.compileAsync(rendu.scene, rendu.camera);
    return p;
  }),
);
environnement.then((env) => (rendu.scene.environment = env));

const choixSon = lancerDemarrage({ etapes: [gpu, textes, polices, environnement, musique], progression, reduit });

// --- Une fois la carte prête : récit, scroll, interface ---------------------
const { carte, appliquer } = await plateau;
const { beats, total, finConstruit } = decoupage();
// début de chaque beat construit, en vh de piste
const positions = Object.fromEntries(beats.map((b) => [b.id, b.debut]));
positions.finActe2 = beats.find((b) => b.id === 'thermique').fin;
positions.finActe3 = beats.find((b) => b.id === 'image').fin;
document.getElementById('piste').style.height = `${total + 100}vh`;

const annotations = creerAnnotations({ carte, camera: rendu.camera });
const hud = creerHUD({ camera: rendu.camera, son });
const curseur = creerCurseur({ son, reduit });

const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
let declencheur = null;
const contexte = { tl, E: ETAT, carte, annotations, positions, son, reduit, sensDuScroll: () => declencheur?.direction ?? 1 };
construireActe1(contexte);
construireActe2(contexte);
construireActe3(contexte);
const acte4 = construireActe4(contexte);
tl.set({}, {}, total); // la durée de la timeline = la longueur de la piste, en vh

const lenis = new Lenis({ lerp: reduit ? 1 : 0.085, wheelMultiplier: 0.9 });
const fin = creerFin({ lenis });
lenis.stop();
lenis.on('scroll', ScrollTrigger.update);
declencheur = ScrollTrigger.create({
  trigger: '#piste',
  start: 'top top',
  end: 'bottom bottom',
  scrub: reduit ? 0.2 : 0.9,
  animation: tl,
});
const vhEnPx = (vh) => (vh / 100) * innerHeight;

// --- Mode film : le scroll suit la musique -----------------------------------
const btnFilm = document.getElementById('btn-film');
let film = false;
function modeFilm(actif) {
  film = actif && !reduit;
  btnFilm.setAttribute('aria-pressed', String(film));
  curseur.masquer(film);
}
btnFilm.addEventListener('click', async () => {
  if (!son.etat.allume) {
    await son.allumer();
    hud.majBoutonSon();
  }
  modeFilm(!film);
});
for (const ev of ['wheel', 'keydown', 'touchstart']) addEventListener(ev, () => film && modeFilm(false), { passive: true });

// --- Bouton son et rail -------------------------------------------------------
document.getElementById('btn-son').addEventListener('click', async () => {
  if (!son.etat.allume) await son.allumer();
  else son.basculerMuet();
  hud.majBoutonSon();
});
// Étendue de chaque acte sur la piste (seuls les beats construits comptent).
const actes = [0, 1, 2, 3].map((i) => {
  const b = beats.filter((x) => x.acte === i);
  return b.length ? { debut: b[0].debut, longueur: b.at(-1).fin - b[0].debut } : null;
});
hud.auClicActe = (i) => {
  if (actes[i]) lenis.scrollTo(vhEnPx(actes[i].debut), { duration: 2.4, easing: (t) => 1 - (1 - t) ** 4 });
};

// Le silence (beat 4) : la musique baisse vers 25 % pendant 2 secondes.
let beatPrecedent = null;
let minuterieSilence = null;
function surChangementDeBeat(id) {
  clearTimeout(minuterieSilence);
  if (id === 'silence') {
    son.gainDeScene(0.25, 0.5);
    minuterieSilence = setTimeout(() => son.gainDeScene(1, 1.5), 2000);
  } else if (beatPrecedent === 'silence') son.gainDeScene(1, 0.8);
  beatPrecedent = id;
}

const instruments = creerInstrumentsActe3(rendu.camera);
const regimeValeur = document.getElementById('regime-valeur');
const regimeLigne = regimeValeur.parentElement;
let regimeAffiche = -1;

// --- Boucle -------------------------------------------------------------------
gsap.ticker.lagSmoothing(0);
gsap.ticker.add((temps, deltaMs) => {
  const dt = Math.min(deltaMs / 1000, 0.1);
  if (film) {
    const cible = vhEnPx(scrollPourTemps(son.temps()));
    lenis.scrollTo(cible, { immediate: true, force: true });
    if (son.temps() >= decoupage().tempsFin) modeFilm(false);
  }
  lenis.raf(temps * 1000);

  const niveaux = son.analyser(dt);
  son.coupure(350 * Math.pow(20000 / 350, ETAT.ouverture));
  appliquer(temps, niveaux, dt);
  annotations.maj();

  const pos = tl.time();
  const beat = beats.find((b) => pos >= b.debut && pos < b.fin);
  hud.changerLabel(beat ? beat.label : '');
  if ((beat?.id ?? null) !== beatPrecedent) surChangementDeBeat(beat?.id ?? null);
  hud.maj(
    ETAT,
    actes.map((a) => (a ? Math.min(1, Math.max(0, (pos - a.debut) / a.longueur)) : 0)),
  );
  if (pos > 12) hud.masquerIndication();

  // régime des ventilateurs, en % : les chiffres s'épaississent avec la puissance
  const regime = Math.round(((ETAT.v1 + ETAT.v2 + ETAT.v3) / 3) * 100);
  if (regime !== regimeAffiche) {
    regimeAffiche = regime;
    regimeValeur.textContent = String(regime).padStart(3, '0');
    regimeLigne.style.setProperty('--wght', String(Math.round(200 + regime * 5)));
  }
  instruments.maj(ETAT);
  acte4.maj(temps);
  fin.maj(ETAT);

  rendu.rendre(temps, dt);
});

// --- Sortie du démarrage --------------------------------------------------------
const avecSon = await choixSon;
document.getElementById('curseur').classList.remove('sur-bouton'); // le bouton cliqué a disparu
if (avecSon) await son.allumer();
hud.majBoutonSon();
hud.afficher();
hud.montrerIndication();
lenis.start();
ScrollTrigger.refresh();

window.salleNoire = { tl, ETAT, carte, rendu, son, lenis, declencheur };
