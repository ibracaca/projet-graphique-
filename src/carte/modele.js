import { InstancedMesh, Matrix4 } from 'three';
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
      if (o.name.endsWith('__aretes')) {
        // arêtes vives choisies pour le dégradé du beat 11 (src/scene/aretes.js)
        o.userData.aretes = true;
        o.visible = false;
        return;
      }
      o.material = filaire;
      o.userData.filaire = true;
      return;
    }
    if (!o.isMesh) return;
    if (o.name.includes('__neon')) {
      // zones lumineuses : réglage du dégradé passé par Blender (propriétés neon_*)
      const u = o.userData;
      o.material.dispose();
      const reglage = u.neon_mode === 'angle' ? { mode: 'angle' } : { axe: u.neon_axe, min: u.neon_min, max: u.neon_max };
      if (u.neon_intensite) reglage.intensite = u.neon_intensite;
      o.material = ctx.neon(reglage);
      o.userData.neon = true;
      return;
    }
    const g = o.geometry;
    // l'occlusion cuite arrive comme couleur de sommet : on la renomme pour que
    // Three.js ne la prenne pas pour une teinte
    // (les trois ventilateurs partagent leurs géométries : on ne renomme qu'une fois)
    if (g.attributes.color) {
      g.setAttribute('aoSommet', g.attributes.color);
      g.deleteAttribute('color');
    }
    const origine = o.material;
    const m = ctx.m(origine.name, { ao: !!g.attributes.aoSommet });
    // textures préparées dans Blender (PCB) : on les reprend sur le matériau du site
    if (origine.map && !m.map) {
      m.map = origine.map;
      m.map.anisotropy = 8;
      m.color.set(0xffffff);
    }
    if (origine.roughnessMap && !m.roughnessMap) {
      m.roughnessMap = origine.roughnessMap;
      m.roughness = 1;
    }
    if (origine.normalMap && !m.normalMap) {
      m.normalMap = origine.normalMap;
      m.normalScale.copy(origine.normalScale);
    }
    m.needsUpdate = true;
    o.material = m;
  });
  // Pièces répétées (ailettes) : une géométrie modèle et la liste des positions
  // en x (propriété « instances » posée dans Blender) : un seul appel de dessin.
  const aInstancier = [];
  // (« instances » : positions en x seulement ; « instances3 » : triplets x, y, z)
  noeud.traverse((o) => o.isMesh && (o.userData.instances || o.userData.instances3) && aInstancier.push(o));
  const m4 = new Matrix4();
  for (const o of aInstancier) {
    const u = o.userData;
    const pos = u.instances3 ?? u.instances.flatMap((x) => [x, 0, 0]);
    const n = pos.length / 3;
    const inst = new InstancedMesh(o.geometry, o.material, n);
    for (let i = 0; i < n; i++) inst.setMatrixAt(i, m4.makeTranslation(o.position.x + pos[i * 3], o.position.y + pos[i * 3 + 1], o.position.z + pos[i * 3 + 2]));
    inst.name = o.name;
    inst.computeBoundingBox();
    inst.computeBoundingSphere();
    o.parent.add(inst);
    o.removeFromParent();
  }

  // rotors des ventilateurs : nœuds rotor_0, rotor_1...
  const rotors = [];
  for (let i = 0; noeud.getObjectByName(`rotor_${i}`); i++) rotors.push(noeud.getObjectByName(`rotor_${i}`));
  if (rotors.length) noeud.userData.rotors = rotors;
  return noeud;
}
