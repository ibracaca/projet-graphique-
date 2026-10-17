// Acte I, l'objet : beats 1 (l'ombre) et 2 (l'éclaté), puis la griffure vers l'acte II.
// Tout est écrit sur la timeline maîtresse, dont l'unité est le vh de scroll :
// le scroll est la tête de lecture (DESIGN.md, 4.4).

const HEX = '0123456789ABCDEF';
const NOM = 'GeForce RTX 5090 Gaming Trio';

// Ordre du démontage : de l'extérieur vers le cœur.
const ORDRE_ECLATEMENT = ['coque', 'backplate', 'ventilateurs', 'equerre', 'radiateur', 'pcb', 'corePipes', 'connecteur', 'memoire', 'gpu', 'plaqueBase'];
// Ordre du passage matière vers filaire : de l'avant vers l'arrière.
const ORDRE_FILAIRE = ['coque', 'ventilateurs', 'radiateur', 'corePipes', 'plaqueBase', 'gpu', 'memoire', 'connecteur', 'pcb', 'equerre', 'backplate'];
// Ordre des annotations : dans l'ordre des numéros.
const ORDRE_ANNOTATIONS = ['coque', 'ventilateurs', 'radiateur', 'corePipes', 'plaqueBase', 'pcb', 'gpu', 'memoire', 'connecteur', 'backplate', 'equerre'];

export function construireActe1({ tl, E, carte, annotations, positions, son, reduit, sensDuScroll }) {
  const { ombre, eclate, suite } = positions;
  const pieces = (ordre) => ordre.map((id) => carte.piece(id));

  // Le son s'ouvre pendant tout l'acte I : 350 Hz -> 20 kHz (courbe exponentielle,
  // gérée à la lecture de E.ouverture).
  tl.fromTo(E, { ouverture: 0 }, { ouverture: 1, duration: suite - ombre, ease: 'none' }, ombre);

  // ------------------------------------------------------------------------
  // Beat 1 : l'ombre. Un faisceau rasant balaie lentement la carte et n'en
  // révèle que des fragments. Le nom se décode lettre par lettre.
  // ------------------------------------------------------------------------
  const o = ombre;
  tl.to(E.faisceau, { intensite: 1, duration: 45, ease: 'traine' }, o)
    .to(E, { poussiere: 1, duration: 70, ease: 'traine' }, o + 5)
    .fromTo(E.faisceau, { x: -430 }, { x: 430, duration: 340, ease: 'none' }, o)
    .to(E.cam, { x: 40, y: 6, z: 520, cx: 12, cy: 2, duration: 420, ease: 'masse' }, o)
    .to(E, { miseAuPoint: 1, duration: 80, ease: 'masse' }, o + 50);

  // Le nom : il se décode avec des caractères hexadécimaux, le langage du BIOS.
  tl.set('#t-ombre', { visibility: 'visible' }, o + 110);
  // (le span est vide au départ : ScrambleText le remet vide quand on remonte)
  tl.to('#nom-carte', { scrambleText: { text: NOM, chars: HEX, revealDelay: reduit ? 0 : 0.35, speed: 0.6 }, duration: reduit ? 1 : 120, ease: 'none' }, o + 110);
  tl.fromTo('.cote-trait', { scaleX: 0 }, { scaleX: 1, duration: 40, ease: 'masse' }, o + 220)
    .fromTo('#cote-texte', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 35, ease: 'traine' }, o + 245);

  // Fin du beat : la lumière d'atelier monte doucement, la carte apparaît entière
  // pour la première fois ; le faisceau s'éteint avec de la traîne.
  tl.to(E, { atelier: 0.6, env: 0.35, duration: 70, ease: 'traine' }, o + 320)
    .to(E.faisceau, { intensite: 0, duration: 70, ease: 'masse' }, o + 350)
    .to(E, { poussiere: 0.12, grain: 0.06, duration: 70, ease: 'masse' }, o + 350)
    .to(E, { miseAuPoint: 0, duration: 60, ease: 'masse' }, o + 360)
    .to('#t-ombre', { clipPath: 'inset(0 0 0 100%)', duration: 40, ease: 'coupe' }, o + 380)
    .set('#t-ombre', { visibility: 'hidden' }, eclate);

  // ------------------------------------------------------------------------
  // Beat 2 : l'éclaté. La matière se retire derrière un front lumineux, il ne
  // reste que le filaire ; les pièces s'écartent avec du poids ; chacune reçoit
  // son numéro et une ligne de cote qui se dessine.
  // ------------------------------------------------------------------------
  const e = eclate;
  tl.to(E.cam, { x: 520, y: 250, z: 600, cx: 0, cy: 0, cz: 0, fov: 30, duration: 130, ease: 'masse' }, e);
  tl.to(pieces(ORDRE_FILAIRE), { remplissage: 0, duration: 80, ease: 'masse', stagger: 9 }, e + 30);
  tl.to(E, { atelier: 0.15, env: 0.12, duration: 90, ease: 'traine' }, e + 60);
  tl.to(pieces(ORDRE_ECLATEMENT), { eclatement: 1, duration: 170, ease: 'masse', stagger: 13 }, e + 110);
  tl.to(E.cam, { x: 700, y: 330, z: 430, cx: -10, cy: -6, cz: 10, fov: 32, duration: 260, ease: 'masse' }, e + 120);

  tl.set('#t-eclate', { visibility: 'visible' }, e + 150).fromTo(
    '#t-eclate',
    { clipPath: 'polygon(0% 0%, 0% 0%, -30% 100%, -30% 100%)' },
    { clipPath: 'polygon(0% 0%, 130% 0%, 100% 100%, -30% 100%)', duration: 45, ease: 'traine' },
    e + 150,
  );

  const items = ORDRE_ANNOTATIONS.map((id) => annotations.parId(id));
  tl.to(items, { progression: 1, duration: 60, ease: 'none', stagger: 16 }, e + 210);

  // Sortie : les annotations se rétractent, le titre s'efface en biais.
  tl.to(items, { progression: 0, duration: 30, ease: 'none', stagger: 2 }, e + 470)
    .to('#t-eclate', { clipPath: 'polygon(130% 0%, 130% 0%, 100% 100%, 100% 100%)', duration: 35, ease: 'coupe' }, e + 470)
    .set('#t-eclate', { visibility: 'hidden' }, suite);

  // ------------------------------------------------------------------------
  // Griffure I -> II : trois entailles de lumière, à l'angle des barres de la
  // carte, tranchent le noir ; derrière elles, l'acte suivant.
  // ------------------------------------------------------------------------
  if (reduit) {
    tl.to(E, { noir: 1, duration: 40, ease: 'none' }, e + 500);
  } else {
    // la carte s'éteint pendant que les lames traversent l'écran
    tl.to(E, { griffure: 1, duration: 60, ease: 'coupe' }, e + 490)
      .to(E, { noir: 1, duration: 26, ease: 'coupe' }, e + 508)
      .call(() => sensDuScroll() > 0 && son.souffle(), null, e + 500);
  }
  tl.set('#t-suite', { visibility: 'visible' }, suite + 10).fromTo('#t-suite', { opacity: 0 }, { opacity: 1, duration: 40, ease: 'traine' }, suite + 10);
}
