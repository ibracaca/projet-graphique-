import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Le modèle de la carte, construit dans Blender par script (outils/blender/carte.py)
// et exporté en glTF compressé (Draco). Chaque pièce y est un nœud au nom de son id
// (« ventilateurs », « coque »...) ; les pièces absentes restent construites par code.
export function chargerModeleCarte(progression) {
  const draco = new DRACOLoader().setDecoderPath('/draco/');
  const chargeur = new GLTFLoader().setDRACOLoader(draco);
  return new Promise((ok) => {
    chargeur.load(
      new URL('../../assets/models/carte.glb', import.meta.url).href,
      (gltf) => {
        draco.dispose();
        ok(gltf.scene);
      },
      (e) => progression?.(e.loaded, e.total || 4e5),
      (erreur) => {
        // sans modèle, la carte reste entièrement construite par code
        console.error('carte.glb illisible', erreur);
        ok(null);
      },
    );
  });
}

// Prépare une pièce du modèle : matériaux du site (balayage filaire / matière),
// filaire dédié, occlusion cuite, néons.
export function adapterPiece(noeud, ctx) {
  noeud.removeFromParent();
  noeud.position.set(0, 0, 0);
  const filaire = ctx.filaire;
  noeud.traverse((o) => {
    if (o.isLine) {
      o.material = filaire;
      o.userData.filaire = true;
      return;
    }
    if (!o.isMesh) return;
    const g = o.geometry;
    // l'occlusion cuite arrive comme couleur de sommet : on la renomme pour que
    // Three.js ne la prenne pas pour une teinte
    // (les trois ventilateurs partagent leurs géométries : on ne renomme qu'une fois)
    if (g.attributes.color) {
      g.setAttribute('aoSommet', g.attributes.color);
      g.deleteAttribute('color');
    }
    const nom = o.material.name;
    o.material.dispose();
    o.material = ctx.m(nom, { ao: !!g.attributes.aoSommet });
  });
  // rotors des ventilateurs : nœuds rotor_0, rotor_1...
  const rotors = [];
  for (let i = 0; noeud.getObjectByName(`rotor_${i}`); i++) rotors.push(noeud.getObjectByName(`rotor_${i}`));
  if (rotors.length) noeud.userData.rotors = rotors;
  return noeud;
}
