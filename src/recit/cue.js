// Cue sheet : la source unique du découpage du film (DESIGN.md, section 5).
// Chaque beat a un temps musical (calé sur les temps de « Genesis ») et une
// longueur de scroll en hauteurs d'écran (vh). « construit » indique les beats
// déjà réalisés : la piste de scroll ne contient qu'eux.

export const TEMPO = { premierTemps: 1.37, periode: 60 / 83 };

// Temps musical du n-ième temps.
export const temps = (n) => TEMPO.premierTemps + n * TEMPO.periode;

export const ACTES = [
  { num: 'I', nom: "L'objet" },
  { num: 'II', nom: "L'énergie" },
  { num: 'III', nom: "L'intérieur" },
  { num: 'IV', nom: 'Le réveil' },
];

export const BEATS = [
  { id: 'demarrage', num: '00', label: '[ BOOT ]', acte: 0, temps: 0, vh: 0, construit: true },
  { id: 'ombre', num: '01', label: '[ 01 / OBJET ]', acte: 0, temps: temps(20), vh: 420, construit: true },
  { id: 'eclate', num: '02', label: '[ 02 / VUE ÉCLATÉE ]', acte: 0, temps: temps(44), vh: 560, construit: true },
  { id: 'courant', num: '03', label: '[ 03 / POWER ]', acte: 1, temps: temps(86), vh: 350 },
  { id: 'silence', num: '04', label: '[ 04 / IDLE ]', acte: 1, temps: temps(111), vh: 120 },
  { id: 'souffle', num: '05', label: '[ 05 / AIRFLOW ]', acte: 1, temps: temps(118), vh: 300 },
  { id: 'thermique', num: '06', label: '[ VISION : THERMIQUE ]', acte: 1, temps: temps(135), vh: 350 },
  { id: 'echelle', num: '07', label: '[ 07 / ÉCHELLE ]', acte: 2, temps: temps(153), vh: 500 },
  { id: 'puce', num: '08', label: '[ 08 / GB202 ]', acte: 2, temps: temps(183), vh: 300 },
  { id: 'memoire', num: '09', label: '[ 09 / VRAM ]', acte: 2, temps: temps(208), vh: 250 },
  { id: 'image', num: '10', label: '[ 10 / FRAME TIME ]', acte: 2, temps: temps(219), vh: 250 },
  { id: 'reveil', num: '11', label: '[ SYSTEM READY ]', acte: 3, temps: temps(231), vh: 600 },
  { id: 'rendu', num: '12', label: '[ 12 / RENDER ]', acte: 3, temps: temps(264), vh: 600 },
  { id: 'fiche', num: '13', label: '[ 13 / SPÉCIFICATIONS ]', acte: 3, temps: temps(297), vh: 300 },
  { id: 'fin', num: '14', label: '', acte: 3, temps: temps(341), vh: 200 },
];

// Fin du dernier beat construit : la piste s'arrête là (plus une respiration).
export const QUEUE_VH = 140;

// Positions (en vh de piste) de chaque beat construit, et longueur totale.
export function decoupage() {
  const construits = BEATS.filter((b) => b.construit && b.vh > 0);
  let debut = 0;
  const beats = construits.map((b) => {
    const r = { ...b, debut, fin: debut + b.vh };
    debut += b.vh;
    return r;
  });
  const suivant = BEATS[BEATS.indexOf(construits.at(-1)) + 1];
  return { beats, total: debut + QUEUE_VH, finConstruit: debut, tempsFin: suivant?.temps ?? 257 };
}

// Longueur prévue de chaque acte (tous beats, construits ou non) : sert au rail.
export function longueursActes() {
  return ACTES.map((_, i) => BEATS.filter((b) => b.acte === i).reduce((s, b) => s + b.vh, 0));
}

// Mode film : position de scroll (vh de piste) pour un temps musical, par
// interpolation linéaire entre les débuts de beats.
export function scrollPourTemps(t) {
  const { beats, finConstruit, tempsFin } = decoupage();
  const points = beats.map((b) => [b.temps, b.debut]);
  points.push([tempsFin, finConstruit]);
  if (t <= points[0][0]) return 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [t0, s0] = points[i];
    const [t1, s1] = points[i + 1];
    if (t <= t1) return s0 + ((t - t0) / (t1 - t0)) * (s1 - s0);
  }
  return finConstruit;
}
