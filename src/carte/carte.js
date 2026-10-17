import { Box3, EdgesGeometry, Group, LineSegments, Vector3 } from 'three';
import { construireBackplate, construireEquerre } from './arriere.js';
import { construireCoque } from './coque.js';
import { construireConnecteur, construireGPU, construireMemoire, construirePCB } from './electronique.js';
import { creerBalayage, fabriqueMateriaux, materiauFilaire, materiauNeon } from './materiaux.js';
import { adapterPiece } from './modele.js';
import { construireCorePipes, construirePlaqueBase, construireRadiateur } from './refroidissement.js';
import { construireVentilateurs } from './ventilateurs.js';

// Les onze pièces de la vue éclatée, avec les textes validés (docs/07).
// « eclate » : décalage en mm quand la carte est démontée.
export const PIECES = [
  { id: 'coque', num: '01', nom: 'Coque', detail: 'carénage en deux tons', construire: construireCoque, eclate: [0, 0, 175] },
  { id: 'ventilateurs', num: '02', nom: 'STORMFORCE ×3', detail: 'ventilateurs à 7 pales', construire: construireVentilateurs, eclate: [0, 0, 118] },
  { id: 'radiateur', num: '03', nom: 'TRI FROZR 4', detail: 'radiateur à ailettes', construire: construireRadiateur, eclate: [0, 0, 64] },
  { id: 'corePipes', num: '04', nom: 'Core Pipes', detail: 'caloducs à section carrée', construire: construireCorePipes, eclate: [0, 0, 24] },
  { id: 'plaqueBase', num: '05', nom: 'Plaque de base', detail: 'cuivre nickelé', construire: construirePlaqueBase, eclate: [0, 0, 2] },
  { id: 'pcb', num: '06', nom: 'PCB', detail: '', construire: construirePCB, eclate: [0, 0, -72] },
  { id: 'gpu', num: '07', nom: 'GPU GB202', detail: '', construire: construireGPU, eclate: [0, 0, -44] },
  { id: 'memoire', num: '08', nom: 'GDDR7', detail: '16 modules', construire: construireMemoire, eclate: [0, 0, -54] },
  { id: 'connecteur', num: '09', nom: 'Connecteur 16 broches', detail: '', construire: construireConnecteur, eclate: [0, 30, -50] },
  { id: 'backplate', num: '10', nom: 'Backplate', detail: 'métal, ouïes de ventilation', construire: construireBackplate, eclate: [0, 0, -128] },
  { id: 'equerre', num: '11', nom: 'Sorties', detail: '3 × DisplayPort 2.1b, 1 × HDMI 2.1b', construire: construireEquerre, eclate: [-60, 0, -72] },
];

const ANGLE_ARETES = 28; // degrés : au-delà, l'arête est tracée en filaire

// Ajoute à chaque maillage ses arêtes lumineuses (état « filaire »).
function ajouterFilaire(groupe, materiau) {
  const cache = new Map();
  const maillages = [];
  groupe.traverse((o) => o.isMesh && maillages.push(o));
  for (const m of maillages) {
    let geo;
    if (m.isInstancedMesh) {
      geo = m.userData.filaire;
      if (!geo) continue;
    } else {
      geo = cache.get(m.geometry.uuid);
      if (!geo) {
        geo = new EdgesGeometry(m.geometry, ANGLE_ARETES);
        cache.set(m.geometry.uuid, geo);
      }
    }
    const lignes = new LineSegments(geo, materiau);
    lignes.userData.filaire = true;
    m.add(lignes);
  }
}

// modele : la scène du fichier carte.glb (ou null). Une pièce présente dans le
// modèle vient de Blender, avec son filaire dédié ; sinon elle est construite par code.
export function construireCarte(modele = null) {
  const racine = new Group();
  racine.name = 'carte';
  const coins = Array.from({ length: 8 }, () => new Vector3());

  const pieces = PIECES.map((def) => {
    const balayage = creerBalayage();
    const ctx = {
      balayage,
      m: fabriqueMateriaux(balayage),
      neon: (options) => materiauNeon(balayage, options),
    };
    const noeud = modele?.getObjectByName(def.id);
    let groupe;
    if (noeud) {
      groupe = adapterPiece(noeud, { ...ctx, filaire: materiauFilaire(balayage) });
    } else {
      groupe = def.construire(ctx);
      ajouterFilaire(groupe, materiauFilaire(balayage));
    }
    groupe.name = def.id;
    groupe.updateMatrixWorld(true);
    const boite = new Box3().setFromObject(groupe);
    racine.add(groupe);
    // dz : décalage en profondeur en plus de l'éclatement (vue « semi-éclatée » de l'acte II)
    return { ...def, groupe, balayage, boite, eclatement: 0, remplissage: 1, dz: 0 };
  });

  // Recalcule l'étendue du balayage de chaque pièce dans le monde
  // (elle change quand la pièce bouge).
  function majBalayage() {
    racine.updateMatrixWorld(true);
    for (const p of pieces) {
      const { min, max } = p.boite;
      let i = 0;
      for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) coins[i++].set(x, y, z);
      const dir = p.balayage.uDir.value;
      let a = Infinity;
      let b = -Infinity;
      for (const c of coins) {
        const s = c.applyMatrix4(p.groupe.matrixWorld).dot(dir);
        a = Math.min(a, s);
        b = Math.max(b, s);
      }
      p.balayage.uPlage.value.set(a - 4, b + 4);
    }
  }

  function placer() {
    for (const p of pieces) {
      const [x, y, z] = p.eclate;
      p.groupe.position.set(x * p.eclatement, y * p.eclatement, z * p.eclatement + p.dz);
      p.balayage.uRemplir.value = p.remplissage;
    }
    majBalayage();
  }

  return {
    racine,
    pieces,
    placer,
    rotors: pieces.find((p) => p.id === 'ventilateurs').groupe.userData.rotors,
    piece: (id) => pieces.find((p) => p.id === id),
  };
}
