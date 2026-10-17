import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  DirectionalLight,
  MathUtils,
  Mesh,
  Points,
  RectAreaLight,
  ShaderMaterial,
  SpotLight,
  Vector3,
} from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { construireCarte } from '../carte/carte.js';
import { COULEURS } from '../couleurs.js';
import { creerAretes } from './aretes.js';
import { creerCourant } from './courant.js';
import { creerImage } from './image.js';
import { creerMemoire } from './memoire.js';
import { creerMicroscope } from './microscope.js';
import { creerSouffle } from './souffle.js';
import { creerVille } from './ville.js';

// ---------------------------------------------------------------------------
// Le plateau : la carte, ses lumières, la poussière. Tout ce qui bouge est piloté
// par l'objet ETAT, que la timeline du récit anime au scroll. La boucle de rendu
// ne fait que recopier ETAT dans la scène.
// ---------------------------------------------------------------------------

export const ETAT = {
  // caméra (mm) : position, point visé, champ vertical (pour un écran 16:9)
  cam: { x: 0, y: -10, z: 620, cx: 0, cy: 4, cz: 0, fov: 28 },
  // faisceau rasant : position le long de la carte, intensité, ouverture (degrés)
  faisceau: { x: -420, intensite: 0, angle: 12, hauteur: 260 },
  env: 0, // studio filtré (reflets des boîtes à lumière)
  atelier: 0, // lumière d'atelier faible
  poussiere: 0,
  neon: 0, // allumage des néons de la carte
  // post-traitement
  grain: 0.09,
  vignette: 0.4,
  griffure: 0,
  noir: 0,
  aberration: 0,
  bloom: 1,
  // son : ouverture du filtre, de 0 (350 Hz, son étouffé) à 1 (20 kHz)
  ouverture: 0,
  // repère de cadrage : 0 = réticules aux coins, 1 = resserrés sur la carte
  miseAuPoint: 0,
  // acte II
  courant: 0, // front du courant dans le PCB (0 à 1)
  courantLumiere: 0, // éclat des pistes et lumière jetée par le courant
  flux: 1, // vitesse des particules du courant (0 : tout s'immobilise)
  pointLumiere: 0, // lumière d'appoint rasante pour le PCB
  souffle: 0, // visibilité du flux d'air
  v1: 0, // régime de chaque ventilateur (0 à 1)
  v2: 0,
  v3: 0,
  scan: 0, // vision thermique : part de l'écran balayée (0 à 1)
  chauffe: 0,
  evacuation: 0,
  // acte III
  micro: 0, // visibilité du microscope (0 : la scène 3D, 1 : le microscope seul)
  zoom: -1.3, // log10 de la largeur de champ du microscope, en mètres
  inclinaison: 0.35, // inclinaison du plan observé (radians)
  rotation: 0,
  recentrage: 0, // 0 : zoom centré sur un SM, 1 : centré sur la puce
  coeurs: 0, // part des SM allumés (beat 8)
  vagues: 0, // intensité des vagues sur les temps
  traces: 0, // pistes mémoire dessinées (beat 9)
  donnees: 0, // paquets de données
  image: 0, // progression de l'image (beat 10)
  imageVisible: 0,
  // acte IV
  aretes: 0, // front du dégradé sur les arêtes (beat 11)
  aretesIntensite: 1,
  tourne: 0, // rotation de la carte sur elle-même (radians)
  noirTuiles: 0, // fondu au noir par tuiles
  ville: 0, // 1 : la ville remplace la carte
  etape: -1, // passe de rendu de la ville (−1 à 3, voir ville.js)
  pluie: 0,
  lune: 0,
  neonsVille: 0,
  brut: 0, // ray tracing bruité avant DLSS
  dlss: 0, // part des tuiles passées par DLSS
  extinction: 0, // extinction finale, pixel par pixel (0 à 1)
};

const NB_POUSSIERE = 2400;

function creerPoussiere() {
  const pos = new Float32Array(NB_POUSSIERE * 3);
  const graine = new Float32Array(NB_POUSSIERE);
  for (let i = 0; i < NB_POUSSIERE; i++) {
    pos[i * 3] = MathUtils.randFloat(-420, 420);
    pos[i * 3 + 1] = MathUtils.randFloat(-140, 300);
    pos[i * 3 + 2] = MathUtils.randFloat(-60, 260);
    graine[i] = Math.random();
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('graine', new BufferAttribute(graine, 1));
  const mat = new ShaderMaterial({
    uniforms: {
      uTemps: { value: 0 },
      uOrigine: { value: new Vector3() },
      uDir: { value: new Vector3(0, -1, 0) },
      uTan: { value: 0.16 },
      uIntensite: { value: 0 },
      uScintille: { value: 0 },
      uEchelle: { value: 1 },
      uCouleur: { value: COULEURS.blanc.clone() },
    },
    vertexShader: /* glsl */ `
      attribute float graine;
      uniform float uTemps, uTan, uIntensite, uScintille, uEchelle;
      uniform vec3 uOrigine, uDir;
      varying float vLum;
      void main() {
        vec3 p = position;
        // dérive lente, comme de la poussière dans l'air immobile
        float t = uTemps * (0.15 + graine * 0.2);
        p += vec3(sin(t + graine * 31.0) * 9.0, sin(t * 0.7 + graine * 17.0) * 6.0, cos(t * 0.8 + graine * 7.0) * 8.0);
        vec3 v = p - uOrigine;
        float le_long = dot(v, uDir);
        float travers = length(v - uDir * le_long);
        float rayon = max(le_long, 0.0) * uTan;
        float dedans = 1.0 - smoothstep(rayon * 0.6, rayon * 1.15, travers);
        dedans *= smoothstep(0.0, 40.0, le_long);
        float eclat = 0.6 + 0.4 * sin(uTemps * 3.0 + graine * 60.0);
        vLum = dedans * uIntensite * (eclat + uScintille * graine);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (2.0 + graine * 3.2) * uEchelle * 420.0 / -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uCouleur;
      varying float vLum;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vLum;
        if (a < 0.003) discard;
        gl_FragColor = vec4(uCouleur * a, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const points = new Points(geo, mat);
  points.frustumCulled = false;
  return points;
}

// Le cône du faisceau, à peine visible : on devine l'air éclairé.
function creerCone() {
  const geo = new CylinderGeometry(1, 1, 1, 48, 1, true);
  geo.translate(0, -0.5, 0); // sommet en haut, ouverture vers le bas
  const mat = new ShaderMaterial({
    uniforms: { uIntensite: { value: 0 }, uCouleur: { value: COULEURS.blanc.clone() } },
    vertexShader: /* glsl */ `
      varying float vLe;
      varying vec3 vN;
      varying vec3 vVue;
      void main() {
        vLe = -position.y;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vVue = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uIntensite;
      uniform vec3 uCouleur;
      varying float vLe;
      varying vec3 vN;
      varying vec3 vVue;
      void main() {
        float face = pow(abs(dot(vN, vVue)), 3.0);
        float a = face * (1.0 - vLe) * smoothstep(0.05, 0.45, vLe) * uIntensite;
        gl_FragColor = vec4(uCouleur * a, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: 2,
  });
  const cone = new Mesh(geo, mat);
  cone.frustumCulled = false;
  return cone;
}

// intensité des boîtes à lumière pour E.atelier = 1 (réglée à l'œil sur les beats 11 et 13)
const BOITES = 6;

export function creerPlateau(rendu, modele) {
  const { scene, camera } = rendu;
  const carte = construireCarte(modele);
  scene.add(carte.racine);
  carte.racine.traverse((o) => {
    if (o.isMesh && !o.userData.neon) {
      // les ailettes (des milliers de triangles, enfermées dans la coque) reçoivent
      // les ombres mais n'en projettent pas : la passe d'ombres reste légère
      o.castShadow = !o.name.startsWith('ailettes');
      o.receiveShadow = true;
    }
  });
  // Néons éteints au départ.
  for (const p of carte.pieces) p.balayage.uAllumage.value = 0;
  // La caméra thermique ne voit pas la coque ni les ventilateurs : on regarde dedans.
  carte.piece('coque').groupe.userData.horsThermique = true;
  carte.piece('ventilateurs').groupe.userData.horsThermique = true;

  const courant = creerCourant(carte.piece('pcb').groupe, rendu.qualite.reglages, rendu.renderer);
  const souffle = creerSouffle(scene, carte);
  const microscope = creerMicroscope(scene);
  const memoire = creerMemoire(carte.piece('pcb').groupe);
  const image = creerImage(carte.piece('pcb').groupe);
  const aretes = creerAretes(carte);
  const ville = creerVille(scene, rendu.renderer);
  rendu.qualite.auRedimensionnement = ville.redimensionner;

  // Lumière rasante d'appoint sur le PCB pendant le beat 3 (vient du bord haut).
  const appoint = new DirectionalLight(0xffffff, 0);
  appoint.position.set(-60, 400, 60);
  scene.add(appoint);

  // Faisceau rasant.
  const faisceau = new SpotLight(0xffffff, 0, 1400, MathUtils.degToRad(9), 0.75, 0);
  faisceau.castShadow = true;
  faisceau.shadow.mapSize.set(2048, 2048);
  faisceau.shadow.bias = -0.0004;
  faisceau.shadow.normalBias = 0.6;
  faisceau.shadow.camera.near = 40;
  faisceau.shadow.camera.far = 1400;
  scene.add(faisceau, faisceau.target);

  // Lumière d'atelier : douce, de haut et de face.
  const atelier = new DirectionalLight(0xffffff, 0);
  atelier.position.set(-300, 500, 600);
  scene.add(atelier);

  // Boîtes à lumière du studio : de longues sources rectangulaires qui dessinent des
  // reflets nets sur la coque, les verres, les caloducs et le backplate (le « look »
  // d'un film produit). Elles suivent la lumière d'atelier déjà chorégraphiée :
  // éteintes tant qu'elle l'est (début de l'acte I, plongée, ville).
  RectAreaLightUniformsLib.init();
  const boites = [
    // [x, y, z, largeur, hauteur, intensité relative] : bandeau haut-avant, flanc gauche, contre-jour
    [60, 170, 430, 700, 60, 1],
    [-520, 60, 160, 70, 300, 0.55],
    [260, 140, -380, 420, 50, 0.7],
  ].map(([x, y, z, l, h, k]) => {
    const b = new RectAreaLight(0xffffff, 0, l, h);
    b.position.set(x, y, z);
    b.lookAt(0, 0, 0);
    b.userData.k = k;
    scene.add(b);
    return b;
  });

  const poussiere = creerPoussiere();
  const cone = creerCone();
  scene.add(poussiere, cone);

  const dir = new Vector3();
  const FOV_REF = 16 / 9;

  const vitesses = [0, 0, 0];
  let ao = 0;

  // Recopie ETAT dans la scène. son : niveaux lissés (basses, aigus, temps).
  function appliquer(temps, son, dt = 1 / 60) {
    const E = ETAT;

    // Caméra : le champ horizontal ne descend jamais sous celui d'un écran 16:9
    // (les écrans 16:10 voient toute la carte ; les ultrawide voient plus large).
    const aspect = camera.aspect;
    let fov = E.cam.fov;
    if (aspect < FOV_REF) {
      const t = Math.tan(MathUtils.degToRad(fov) / 2) * (FOV_REF / aspect);
      fov = MathUtils.radToDeg(2 * Math.atan(t));
    }
    if (Math.abs(camera.fov - fov) > 1e-4) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    camera.position.set(E.cam.x, E.cam.y, E.cam.z);
    camera.lookAt(E.cam.cx, E.cam.cy, E.cam.cz);

    // Faisceau : il descend presque parallèlement à la face avant (rasant).
    const F = E.faisceau;
    // incidence d'environ 14° sur la face : assez rasant pour sculpter les arêtes
    faisceau.position.set(F.x - 30, F.hauteur, 110);
    faisceau.target.position.set(F.x + 25, -90, 20);
    faisceau.angle = MathUtils.degToRad(F.angle);
    faisceau.intensity = F.intensite * 26;
    dir.subVectors(faisceau.target.position, faisceau.position);
    const longueur = dir.length();
    dir.normalize();
    cone.position.copy(faisceau.position);
    cone.quaternion.setFromUnitVectors(new Vector3(0, -1, 0), dir);
    const rayon = Math.tan(faisceau.angle) * longueur;
    cone.scale.set(rayon, longueur, rayon);
    cone.material.uniforms.uIntensite.value = F.intensite * 0.018;
    cone.visible = F.intensite > 0.001;

    const pu = poussiere.material.uniforms;
    pu.uTemps.value = temps;
    pu.uOrigine.value.copy(faisceau.position);
    pu.uDir.value.copy(dir);
    pu.uTan.value = Math.tan(faisceau.angle);
    pu.uIntensite.value = E.poussiere * (0.8 + son.aigus * 0.8);
    pu.uScintille.value = son.aigus;
    pu.uEchelle.value = rendu.renderer.getPixelRatio();
    poussiere.visible = E.poussiere > 0.001;

    scene.environmentIntensity = E.env;
    // Occlusion ambiante : seulement quand toute la carte est en matière, hors
    // vision thermique, microscope et ville ; elle arrive et repart en fondu.
    const enMatiere = carte.pieces.every((p) => p.remplissage > 0.999) && E.ville < 0.5 && E.scan < 0.001 && E.micro < 0.01;
    ao += ((enMatiere ? 1 : 0) - ao) * Math.min(1, dt * 5);
    rendu.reglerAO(ao);
    // Profondeur de champ discrète, en même temps que l'occlusion : mise au point sur
    // le point que regarde la caméra, le reste de la carte s'adoucit un peu.
    const focale = Math.hypot(E.cam.x - E.cam.cx, E.cam.y - E.cam.cy, E.cam.z - E.cam.cz);
    rendu.reglerFlou(ao, focale);

    atelier.intensity = E.atelier;
    for (const b of boites) {
      b.intensity = E.atelier * b.userData.k * BOITES;
      b.visible = b.intensity > 0.001;
    }

    // Néons de la carte : allumage, et une respiration sur les basses.
    const pulse = 1 + son.basses * 0.25;
    for (const p of carte.pieces) p.balayage.uAllumage.value = E.neon * pulse;

    carte.placer();

    // Acte II : courant, ventilateurs, flux d'air, thermique.
    appoint.intensity = E.pointLumiere;
    courant.maj(dt, E, son);
    vitesses[0] = E.v1;
    vitesses[1] = E.v2;
    vitesses[2] = E.v3;
    carte.rotors.forEach((r, i) => {
      // jusqu'à 11 rad/s à l'écran ; les basses donnent un léger à-coup de couple
      r.rotation.z += dt * vitesses[i] * (11 + son.basses * 1.5);
    });
    souffle.maj(dt, E, vitesses);
    const th = rendu.thermique;
    th.uChauffe.value = E.chauffe;
    th.uEvacuation.value = E.evacuation;
    rendu.uniforms.uScan.value = E.scan;

    // Acte III : microscope, mémoire, image. Quand le microscope couvre tout
    // l'écran, la carte n'est plus dessinée.
    microscope.maj(dt, E, son, camera);
    carte.racine.visible = E.micro < 0.999 && E.ville < 0.5;
    carte.racine.rotation.y = E.tourne;
    memoire.maj(dt, E);
    image.maj(dt, E);

    // Acte IV : arêtes de lumière, ville, DLSS, fondu par tuiles.
    aretes.maj(dt, E);
    ville.maj(dt, E);
    rendu.uniforms.uBrut.value = E.brut;
    rendu.uniforms.uDlss.value = E.dlss > 0.998 ? 1 : E.dlss;
    rendu.uniforms.uNoirTuiles.value = E.noirTuiles;

    const u = rendu.uniforms;
    u.uGrain.value = E.grain;
    u.uVignette.value = E.vignette;
    u.uGriffure.value = E.griffure;
    u.uNoir.value = E.noir;
    u.uAberration.value = E.aberration;
    u.uBloom.value = E.bloom * (1 + son.basses * 0.3);
  }

  return { carte, appliquer, faisceau, poussiere, camera };
}
