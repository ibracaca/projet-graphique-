import { Color } from 'three';

// Conversion oklch vers sRGB linéaire (formules de Björn Ottosson).
// Les tokens de DESIGN.md sont écrits en oklch : on les convertit ici une fois pour toutes.
export function oklchVersLineaire(L, C, H) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

// Renvoie une couleur Three.js (espace de travail linéaire).
export function oklch(L, C, H) {
  const [r, g, b] = oklchVersLineaire(L, C, H);
  return new Color().setRGB(Math.max(0, r), Math.max(0, g), Math.max(0, b), 'srgb-linear');
}

// Tokens de la charte (DESIGN.md, section 2).
export const TOKENS = {
  noir: [0, 0, 0],
  graphite: [0.3, 0.005, 260],
  acier: [0.52, 0.006, 260],
  alu: [0.74, 0.005, 260],
  blanc: [0.91, 0.003, 260],
  msiBleu: [0.7, 0.14, 245],
  msiIndigo: [0.63, 0.19, 284],
  msiViolet: [0.6, 0.22, 308],
  msiRose: [0.67, 0.25, 328],
  msiIncandescent: [0.95, 0.04, 330],
};

export const COULEURS = Object.fromEntries(
  Object.entries(TOKENS).map(([nom, v]) => [nom, oklch(...v)]),
);

// Arrêts du dégradé MSI, du froid (extérieur) au chaud (cœur).
export const DEGRADE_MSI = [COULEURS.msiBleu, COULEURS.msiIndigo, COULEURS.msiViolet, COULEURS.msiRose];
