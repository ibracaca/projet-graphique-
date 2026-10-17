// Acte III, l'intérieur : beats 7 (puissances de dix), 8 (la puce), 9 (la mémoire),
// 10 (4,17 ms), puis la griffure vers l'acte IV. Timeline en vh de scroll.

const DEVANT = ['coque', 'ventilateurs', 'radiateur', 'corePipes', 'plaqueBase'];
// dessus du die dans le monde, carte « semi-éclatée » (PCB décalé de −60 mm)
const DIE = { x: -70, y: 2, z: -87.7 };

export function construireActe3({ tl, E, carte, positions, son, reduit, sensDuScroll }) {
  const A = positions.echelle;
  const P = positions.puce;
  const M = positions.memoire;
  const I = positions.image;
  const fin = positions.finActe3;
  const piece = (id) => carte.piece(id);
  const paliers = [...document.querySelectorAll('#t-echelle .palier')];

  const montrer = (cible, t, duree = 22) =>
    tl.set(cible, { visibility: 'visible' }, t).fromTo(cible, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: duree, ease: 'traine' }, t);
  const cacher = (cible, t, duree = 16) =>
    tl.to(cible, { clipPath: 'inset(0 0 100% 0)', duration: duree, ease: 'coupe' }, t).set(cible, { visibility: 'hidden' }, t + duree);

  // ------------------------------------------------------------------------
  // Raccord : la carte entière, en pleine matière, dans une lumière d'atelier.
  // ------------------------------------------------------------------------
  tl.set(E, { griffure: 0, scan: 0, chauffe: 0, evacuation: 0, souffle: 0, v1: 0, v2: 0, v3: 0, flux: 0, courantLumiere: 0, pointLumiere: 0, atelier: 0.7, env: 0.55 }, A);
  tl.set(E.cam, { x: 80, y: 70, z: 620, cx: 0, cy: 0, cz: -30, fov: 30 }, A);
  tl.to(E, { noir: 0, duration: 30, ease: 'traine' }, A);
  tl.set(['#t-echelle', '#regle'], { visibility: 'visible' }, A + 10);
  tl.fromTo('#regle', { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 40, ease: 'traine' }, A + 15);

  // ------------------------------------------------------------------------
  // Beat 7 : puissances de dix. La carte s'ouvre jusqu'à la puce, puis le
  // microscope prend le relais : une décade tous les 38 vh, jusqu'aux transistors.
  // ------------------------------------------------------------------------
  montrer(paliers[0], A + 25);
  cacher(paliers[0], A + 150);

  // les couches de devant se retirent derrière un front lumineux
  tl.to(DEVANT.map(piece), { remplissage: 0, duration: 60, ease: 'masse', stagger: 10 }, A + 50);
  tl.to(DEVANT.map((id) => piece(id).balayage.uOpaciteFilaire), { value: 0, duration: 40, ease: 'traine', stagger: 10 }, A + 90);
  for (const id of DEVANT) tl.set(piece(id).groupe, { visible: false }, A + 200);

  // la caméra plonge vers le GB202
  tl.to(E.cam, { x: DIE.x + 4, y: DIE.y - 14, z: DIE.z + 60, cx: DIE.x, cy: DIE.y, cz: DIE.z, duration: 140, ease: 'power2.inOut' }, A + 60)
    .to(E.cam, { x: DIE.x + 1, y: DIE.y - 6, z: DIE.z + 26, duration: 45, ease: 'power1.in' }, A + 200);
  montrer(paliers[1], A + 168);
  cacher(paliers[1], A + 290);

  // relais vers le microscope (même cadrage), puis la plongée, une décade tous
  // les 50 vh, jusqu'à un champ d'environ 2 × 10⁻⁷ m (une rangée de transistors)
  tl.set(E, { zoom: -1.45, inclinaison: 0.23, rotation: 0, recentrage: 1 }, A + 205)
    .to(E, { micro: 1, duration: 35, ease: 'none' }, A + 205)
    .to(E, { zoom: -6.75, duration: 265, ease: 'none' }, A + 205)
    .to(E, { recentrage: 0, duration: 80, ease: 'masse' }, A + 225)
    .to(E, { inclinaison: 0.8, duration: 240, ease: 'power1.in' }, A + 230)
    .to(E, { rotation: 0.55, duration: 265, ease: 'none' }, A + 205)
    .to(E, { aberration: reduit ? 0 : 0.8, duration: 60, ease: 'traine' }, A + 200);
  montrer(paliers[2], A + 405);
  cacher(paliers[2], A + 440);
  montrer(paliers[3], A + 452);
  cacher(paliers[3], P + 25);

  // ------------------------------------------------------------------------
  // Beat 8 : la puce. On remonte d'un trait jusqu'au plan du GB202 ; ses SM
  // s'allument du centre vers les bords, des vagues tombent sur les temps.
  // ------------------------------------------------------------------------
  tl.to(E, { zoom: -1.25, duration: 60, ease: 'power3.inOut' }, P)
    .to(E, { recentrage: 1, duration: 45, ease: 'masse' }, P + 15)
    .to(E, { inclinaison: 0.15, rotation: 0, duration: 60, ease: 'masse' }, P)
    .to(E, { aberration: 0, duration: 50, ease: 'traine' }, P + 60)
    .to('#regle', { clipPath: 'inset(0 0 100% 0)', duration: 20, ease: 'coupe' }, P + 30)
    .set('#regle', { visibility: 'hidden' }, P + 50)
    .set('#t-echelle', { visibility: 'hidden' }, P + 50)
    .fromTo(E, { coeurs: 0 }, { coeurs: 1, duration: 150, ease: 'none' }, P + 70)
    .to(E, { vagues: 1, duration: 30, ease: 'none' }, P + 60);
  montrer('#t-puce', P + 70, 24);
  tl.fromTo('#t-puce .donnees li', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 20, ease: 'traine', stagger: 10 }, P + 130);
  cacher('#t-puce', P + 270);

  // ------------------------------------------------------------------------
  // Beat 9 : la mémoire. On recule hors du microscope, sur la carte : 16 modules,
  // 32 pistes chacun, se dessinent jusqu'à la puce ; les données y circulent.
  // ------------------------------------------------------------------------
  tl.set(E.cam, { x: DIE.x, y: DIE.y - 9, z: DIE.z + 59, cx: DIE.x, cy: DIE.y, cz: DIE.z, fov: 30 }, M)
    .to(E, { micro: 0, duration: 40, ease: 'none' }, M)
    .to(E, { zoom: -0.95, vagues: 0, duration: 40, ease: 'none' }, M)
    .to(E.cam, { y: DIE.y - 32, z: DIE.z + 230, cy: DIE.y - 4, duration: 90, ease: 'masse' }, M + 5)
    .fromTo(E, { traces: 0 }, { traces: 1, duration: 80, ease: 'power1.inOut' }, M + 50)
    .fromTo(E, { donnees: 0 }, { donnees: 1, duration: 40, ease: 'none' }, M + 110);
  montrer('#t-memoire', M + 60, 24);
  tl.fromTo('#t-memoire .donnees li', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 20, ease: 'traine', stagger: 10 }, M + 100);
  cacher('#t-memoire', M + 222);

  // ------------------------------------------------------------------------
  // Beat 10 : 4,17 ms. Une image traverse la carte ; le chronomètre est le titre.
  // ------------------------------------------------------------------------
  tl.to(E.cam, { x: -115, y: -48, z: 175, cx: -115, cy: -8, cz: -80, duration: 45, ease: 'masse' }, I)
    .to(E, { donnees: 0.25, duration: 30, ease: 'none' }, I)
    .to(E, { imageVisible: 1, duration: 12, ease: 'traine' }, I + 18)
    .fromTo(E, { image: 0 }, { image: 1, duration: 155, ease: 'none' }, I + 20);
  tl.set(['#t-image', '#etapes'], { visibility: 'visible' }, I + 20)
    .fromTo('#t-image .chrono', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 15, ease: 'traine' }, I + 20)
    .fromTo('#chrono-point', { opacity: 0 }, { opacity: 1, duration: 2, ease: 'none' }, I + 175)
    .fromTo('#t-image .texte-beat', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 25, ease: 'traine' }, I + 180)
    .fromTo('#etapes', { opacity: 0 }, { opacity: 1, duration: 15, ease: 'traine' }, I + 22)
    .to(['#t-image', '#etapes'], { opacity: 0, duration: 15, ease: 'none' }, I + 212)
    .set(['#t-image', '#etapes'], { visibility: 'hidden' }, fin);

  // ------------------------------------------------------------------------
  // Griffure III -> IV.
  // ------------------------------------------------------------------------
  if (reduit) {
    tl.to(E, { noir: 1, duration: 30, ease: 'none' }, I + 215);
  } else {
    tl.to(E, { griffure: 1, duration: 50, ease: 'coupe' }, I + 200)
      .to(E, { noir: 1, duration: 24, ease: 'coupe' }, I + 214)
      .call(() => sensDuScroll() > 0 && son.souffle(), null, I + 208);
  }
}
