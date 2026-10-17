// Salle noire : point d'entrée. Relie la scène, le scroll, le son et l'interface.
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/martian-mono/wdth.css';
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { creerSon } from './audio/son.js';
import { chargerTextures } from './carte/materiaux.js';
import { creerCurseur } from './hud/curseur.js';
import { creerHUD } from './hud/hud.js';
import { construireActe1 } from './recit/acte1.js';
import { creerAnnotations } from './recit/annotations.js';
import { decoupage, longueursActes, scrollPourTemps } from './recit/cue.js';
import { lancerDemarrage } from './recit/demarrage.js';
import { chargerEnvironnement } from './scene/environnement.js';
import { creerPlateau, ETAT } from './scene/plateau.js';
import { creerRendu } from './scene/rendu.js';

gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin, CustomEase);
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
const octets = { hdr: [0, 6.3e6], musique: [0, 6.2e6] };
let etapesFaites = 0;
const compter = (p) => p.then((r) => (etapesFaites++, r));
const progression = () => {
  const recu = octets.hdr[0] + octets.musique[0];
  const total = octets.hdr[1] + octets.musique[1];
  return Math.min(1, 0.85 * (recu / total) + 0.15 * (etapesFaites / 5));
};

const textes = compter(chargerTextures(rendu.renderer.capabilities.getMaxAnisotropy()));
const polices = compter(document.fonts.ready);
const environnement = compter(chargerEnvironnement(rendu.renderer, { seuil: 2.5, plancher: 0.06 }, (r, t) => (octets.hdr = [r, t])));
const musique = compter(son.charger((r, t) => (octets.musique = [r, t])));

// La carte a besoin de la texture d'alu brossé : on la construit après.
const plateau = textes.then(() => creerPlateau(rendu));
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
const positions = {
  ombre: beats.find((b) => b.id === 'ombre').debut,
  eclate: beats.find((b) => b.id === 'eclate').debut,
  suite: finConstruit,
};
document.getElementById('piste').style.height = `${total + 100}vh`;

const annotations = creerAnnotations({ carte, camera: rendu.camera });
const hud = creerHUD({ camera: rendu.camera, son });
const curseur = creerCurseur({ son, reduit });

const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
let declencheur = null;
construireActe1({ tl, E: ETAT, carte, annotations, positions, son, reduit, sensDuScroll: () => declencheur?.direction ?? 1 });
tl.set({}, {}, total); // la durée de la timeline = la longueur de la piste, en vh

const lenis = new Lenis({ lerp: reduit ? 1 : 0.085, wheelMultiplier: 0.9 });
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
hud.auClicActe = (i) => {
  const debut = [0, positions.suite][i];
  if (debut !== undefined) lenis.scrollTo(vhEnPx(debut), { duration: 2.4, easing: (t) => 1 - (1 - t) ** 4 });
};

// --- Boucle -------------------------------------------------------------------
const actes = longueursActes();
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
  appliquer(temps, niveaux);
  annotations.maj();

  const pos = tl.time();
  const beat = beats.find((b) => pos >= b.debut && pos < b.fin);
  hud.changerLabel(beat ? beat.label : '');
  hud.maj(ETAT, [Math.min(1, pos / actes[0]), 0, 0, 0]);
  if (pos > 12) hud.masquerIndication();

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
