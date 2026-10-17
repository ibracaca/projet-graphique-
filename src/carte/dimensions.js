// Toutes les mesures de la carte, en millimètres (1 unité Three.js = 1 mm).
// Repère : X le long de la carte (équerre à gauche), Y vers le haut (doigts PCIe en bas),
// Z vers l'avant (ventilateurs devant, backplate derrière).
// Dimensions officielles MSI : 359 × 149 × 70 mm. Le reste est relevé sur les photos
// de référence (assets/reference/msi/), surtout la vue de face produit-2.webp
// (0,43 mm par pixel).

export const CARTE = {
  longueur: 359,
  hauteur: 149,
  epaisseur: 70,
};

// Coque : 136 mm de haut, les doigts PCIe dépassent de 13 mm en dessous.
export const COQUE = {
  xMin: -177.5,
  xMax: 179.5,
  yMin: -61.5,
  yMax: 74.5,
  zFace: 34, // face avant de la plaque principale
  epaisseurPlaque: 3,
};

export const VENTILATEURS = {
  centres: [
    [-115.5, 7],
    [0, 7],
    [115.5, 7],
  ],
  rayonAnneau: 56.5,
  rayonPales: 53,
  rayonMoyeu: 16.5,
  nbPales: 7,
  zCentre: 23,
};

// Empilement en profondeur (Z), de l'arrière vers l'avant.
export const Z = {
  backplateArriere: -35,
  backplateAvant: -33,
  pcbArriere: -31.6,
  pcbAvant: -30,
  substrat: -28.5,
  die: -27.7,
  plaqueBase: -23.7,
  corePipes: -17.7,
  ailettesArriere: -17,
  ailettesAvant: 14,
};

export const PCB = {
  xMin: -172,
  xMax: 44, // le PCB s'arrête ici : au-delà, l'air traverse la carte
  yMin: -59.5,
  yMax: 62,
  doigts: { xMin: -130, xMax: -49, yMin: -74.5 },
};

// Boîtier du GB202 : 63 × 56 mm (base GPU TechPowerUp), die de 750 mm².
export const GPU = {
  x: -70,
  y: 2,
  substrat: [63, 56],
  die: [25.5, 29.4],
};

export const RADIATEUR = {
  pas: 1.9, // écart entre deux ailettes
  blocs: [
    [-172, -40],
    [-30, 160],
  ],
  yMin: -57,
  yMax: 70,
};

// Diagonale du backplate (deux tons) relevée sur produit-4.webp : environ 31°.
export const DIAGONALE = {
  a: [-96.6, -61.5],
  b: [128.6, 74.5],
};
