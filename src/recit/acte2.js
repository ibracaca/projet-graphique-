import { SplitText } from 'gsap/SplitText';

// Acte II, l'énergie : beats 3 (le courant), 4 (le silence), 5 (le souffle),
// 6 (vision thermique), puis la griffure vers l'acte III.
// Même règle que l'acte I : la timeline est en vh de scroll.

// Vue « semi-éclatée » : les couches restent séparées en profondeur pour qu'on voie
// le courant, l'air et la chaleur les traverser. La vraie reconstruction est
// réservée au beat 11.
const COUCHES = {
  backplate: -95,
  pcb: -60,
  gpu: -60,
  memoire: -60,
  connecteur: -60,
  equerre: -60,
  plaqueBase: -32,
  corePipes: -16,
  radiateur: 0,
  ventilateurs: 38,
  coque: 80,
};
const CARTE_ELECTRONIQUE = ['pcb', 'gpu', 'memoire', 'connecteur', 'equerre'];
const DEVANT = ['coque', 'ventilateurs', 'radiateur', 'corePipes', 'plaqueBase', 'backplate'];
// Remplissage de la matière à la fin du beat 3 : de l'arrière vers l'avant.
const ORDRE_MATIERE = ['backplate', 'equerre', 'plaqueBase', 'corePipes', 'radiateur', 'ventilateurs', 'coque'];

export function construireActe2({ tl, E, carte, positions, son, reduit, sensDuScroll }) {
  const C = positions.courant;
  const S = positions.silence;
  const F = positions.souffle;
  const T = positions.thermique;
  const fin = positions.finActe2;
  const piece = (id) => carte.piece(id);

  // ------------------------------------------------------------------------
  // Raccord : on rouvre sur la carte électronique, seule dans le noir.
  // ------------------------------------------------------------------------
  tl.set(E, { griffure: 0 }, C);
  for (const p of carte.pieces) tl.set(p, { eclatement: 0, dz: COUCHES[p.id] }, C);
  for (const id of DEVANT) tl.set(piece(id).balayage.uOpaciteFilaire, { value: 0 }, C);
  // le PCB se remplit dans le sens du courant : du connecteur vers la gauche
  tl.set(piece('pcb').balayage.uDir.value, { x: -1 }, C);
  tl.set(E.cam, { x: -20, y: -95, z: 250, cx: -62, cy: 2, cz: -90, fov: 28 }, C);
  tl.set(E, { atelier: 0.04, env: 0.06, poussiere: 0, miseAuPoint: 0 }, C);
  tl.to(E, { noir: 0, duration: 30, ease: 'traine' }, C);
  tl.to(E, { pointLumiere: 0.3, duration: 60, ease: 'traine' }, C + 10);
  // des milliers de particules : on retient le bloom pour garder le noir autour
  tl.to(E, { bloom: 0.75, duration: 30, ease: 'none' }, C);
  tl.to(E, { bloom: 1, duration: 40, ease: 'none' }, C + 290);

  // ------------------------------------------------------------------------
  // Beat 3 : le courant. Le fleuve entre par le 16 broches, se ramifie vers les
  // étages d'alimentation, puis converge sur le GB202. La matière du PCB se
  // remplit derrière lui ; « 575 W » s'élargit à mesure qu'il coule.
  // ------------------------------------------------------------------------
  tl.to(E, { courantLumiere: 1, duration: 20, ease: 'traine' }, C + 20)
    .fromTo(E, { courant: 0 }, { courant: 1, duration: 210, ease: 'none' }, C + 25)
    .to(E.cam, { x: -48, y: -55, z: 170, cx: -66, cy: 4, duration: 240, ease: 'masse' }, C)
    .to(piece('connecteur'), { remplissage: 1, duration: 30, ease: 'masse' }, C + 30)
    .to(piece('pcb'), { remplissage: 1, duration: 170, ease: 'none' }, C + 45)
    .to(piece('memoire'), { remplissage: 1, duration: 60, ease: 'masse' }, C + 150)
    .to(piece('gpu'), { remplissage: 1, duration: 50, ease: 'masse' }, C + 190)
    .to(piece('equerre'), { remplissage: 1, duration: 60, ease: 'masse' }, C + 200);

  tl.set('#t-courant', { visibility: 'visible' }, C + 50)
    .fromTo('#titre-575', { '--wdth': 62, '--wght': 160, clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 25, ease: 'traine' }, C + 50)
    .to('#titre-575', { '--wdth': 125, '--wght': 420, duration: 180, ease: 'none' }, C + 55)
    .fromTo('#t-courant .texte-beat', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 35, ease: 'traine' }, C + 140);

  // Fin du beat 3 : on recule, les autres couches reviennent, la matière se remplit
  // de l'arrière vers l'avant, la lumière d'atelier monte.
  tl.to(DEVANT.map((id) => piece(id).balayage.uOpaciteFilaire), { value: 0.3, duration: 30, ease: 'traine', stagger: 4 }, C + 245)
    .to(ORDRE_MATIERE.map(piece), { remplissage: 1, duration: 55, ease: 'masse', stagger: 7 }, C + 270)
    .to(E.cam, { x: 470, y: 190, z: 520, cx: 10, cy: -6, cz: -20, fov: 30, duration: 110, ease: 'masse' }, C + 245)
    .to(E, { atelier: 0.75, env: 0.6, pointLumiere: 0.1, courantLumiere: 0.3, duration: 80, ease: 'traine' }, C + 270)
    .to('#t-courant .texte-beat', { clipPath: 'inset(0 0 0 100%)', duration: 25, ease: 'coupe' }, C + 300);

  // ------------------------------------------------------------------------
  // Beat 4 : le silence. Charge faible : tout s'immobilise, le titre se comprime,
  // le son baisse (géré dans main.js, à l'entrée du beat).
  // ------------------------------------------------------------------------
  tl.to(E, { flux: 0, duration: 40, ease: 'masse' }, S)
    .to(E, { courantLumiere: 0.12, duration: 50, ease: 'traine' }, S + 5)
    .to(E, { ouverture: 0.72, duration: 20, ease: 'masse' }, S)
    .to(E.cam, { x: 455, y: 184, z: 505, duration: 120, ease: 'none' }, S)
    .to('#titre-575', { '--wdth': 62, '--wght': 120, duration: 30, ease: 'masse' }, S)
    .to('#titre-575', { clipPath: 'inset(0 0 0 100%)', duration: 15, ease: 'coupe' }, S + 30)
    .set('#t-courant', { visibility: 'hidden' }, S + 46)
    .set('#t-silence', { visibility: 'visible' }, S + 40)
    .fromTo('#titre-silence', { '--wdth': 62, '--wght': 200, clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 18, ease: 'traine' }, S + 40)
    .fromTo('#t-silence .texte-beat', { opacity: 0 }, { opacity: 1, duration: 15, ease: 'traine' }, S + 58)
    .to('#t-silence', { clipPath: 'inset(0 0 100% 0)', duration: 14, ease: 'coupe' }, S + 104)
    .set('#t-silence', { visibility: 'hidden' }, F + 1);

  // ------------------------------------------------------------------------
  // Beat 5 : le souffle. Les trois ventilateurs s'éveillent l'un après l'autre
  // (un temps d'écart), accélèrent avec le scroll ; l'air devient visible.
  // ------------------------------------------------------------------------
  tl.to(E, { ouverture: 1, duration: 12, ease: 'masse' }, F)
    .to(E, { flux: 0.6, courantLumiere: 0.15, duration: 40, ease: 'traine' }, F)
    .fromTo(E, { v1: 0 }, { v1: 1, duration: 210, ease: 'power2.in' }, F + 6)
    .fromTo(E, { v2: 0 }, { v2: 1, duration: 200, ease: 'power2.in' }, F + 22)
    .fromTo(E, { v3: 0 }, { v3: 1, duration: 190, ease: 'power2.in' }, F + 38)
    .to(E, { souffle: 1, duration: 90, ease: 'traine' }, F + 10)
    // la caméra fait le tour : on voit l'air entrer devant, puis ressortir derrière
    .to(E.cam, { x: 760, y: 250, z: 330, cx: 20, cy: -8, cz: -40, duration: 150, ease: 'masse' }, F + 20)
    .to(E.cam, { x: 640, y: 210, z: -470, cx: 30, cy: -8, cz: -60, duration: 150, ease: 'masse' }, F + 160);

  const lettres = new SplitText('#titre-souffle', { type: 'chars', charsClass: 'lettre' });
  tl.set('#t-souffle', { visibility: 'visible' }, F + 25)
    .fromTo(lettres.chars, { x: 90, opacity: 0, skewX: -18 }, { x: 0, opacity: 1, skewX: 0, duration: 30, ease: 'traine', stagger: 2.2 }, F + 25)
    .fromTo('#t-souffle .texte-beat', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 35, ease: 'traine' }, F + 70)
    .set('#t-regime', { visibility: 'visible' }, F + 30)
    .fromTo('#t-regime', { clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', duration: 25, ease: 'traine' }, F + 30)
    .to(lettres.chars, { x: -70, opacity: 0, skewX: 18, duration: 20, ease: 'coupe', stagger: 1 }, F + 268)
    .to('#t-souffle .texte-beat', { clipPath: 'inset(0 0 0 100%)', duration: 20, ease: 'coupe' }, F + 268)
    .to('#t-regime', { clipPath: 'inset(0 0 0 100%)', duration: 20, ease: 'coupe' }, F + 275)
    .set(['#t-souffle', '#t-regime'], { visibility: 'hidden' }, T);

  // ------------------------------------------------------------------------
  // Beat 6 : vision thermique. Un obturateur claque, une ligne de balayage
  // descend et convertit l'image ; la puce chauffe, puis les Core Pipes
  // emportent la chaleur vers le radiateur.
  // ------------------------------------------------------------------------
  // la caméra monte au-dessus de la carte : vue plongeante sur le plan de coupe
  tl.to(E.cam, { x: -40, y: 400, z: 90, cx: -45, cy: -10, cz: -50, fov: 30, duration: 70, ease: 'masse' }, T - 10)
    .call(() => sensDuScroll() > 0 && son.obturateur(), null, T + 4)
    .fromTo(E, { scan: 0 }, { scan: 1, duration: reduit ? 10 : 60, ease: 'none' }, T + 5)
    .to(E, { souffle: 0, duration: 30, ease: 'traine' }, T + 5)
    .fromTo(E, { chauffe: 0 }, { chauffe: 1, duration: 90, ease: 'power1.in' }, T + 60)
    .fromTo(E, { evacuation: 0 }, { evacuation: 1, duration: 150, ease: 'none' }, T + 150)
    // puis elle s'élargit pendant que la chaleur gagne les extrémités
    .to(E.cam, { x: 0, y: 470, z: 110, cx: -10, cy: -10, cz: -55, duration: 280, ease: 'none' }, T + 60);

  tl.set(['#t-thermique', '#echelle-thermique'], { visibility: 'visible' }, T + 20)
    .fromTo('#t-thermique .titre-beat', { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 20, ease: 'none' }, T + 20)
    .fromTo('#t-thermique .texte-beat', { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 30, ease: 'none' }, T + 35)
    .fromTo('.echelle-barre', { scaleX: 0 }, { scaleX: 1, duration: 40, ease: 'masse' }, T + 50)
    .fromTo('#echelle-thermique .hud-texte', { opacity: 0 }, { opacity: 0.6, duration: 20, ease: 'traine', stagger: 15 }, T + 55)
    .to(['#t-thermique', '#echelle-thermique'], { clipPath: 'inset(0 0 100% 0)', duration: 20, ease: 'coupe' }, T + 300)
    .set(['#t-thermique', '#echelle-thermique'], { visibility: 'hidden' }, fin);

  // ------------------------------------------------------------------------
  // Griffure II -> III.
  // ------------------------------------------------------------------------
  if (reduit) {
    tl.to(E, { noir: 1, duration: 30, ease: 'none' }, T + 315);
  } else {
    tl.to(E, { griffure: 1, duration: 60, ease: 'coupe' }, T + 290)
      .to(E, { noir: 1, duration: 26, ease: 'coupe' }, T + 308)
      .call(() => sensDuScroll() > 0 && son.souffle(), null, T + 300);
  }
}
