// Atelier de la carte : compare le modèle 3D aux photos de référence MSI.
// Outil interne, pas une page du site. Les photos restent dans assets/reference/.
import '@fontsource-variable/martian-mono/wdth.css';
import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  OrthographicCamera,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { construireCarte } from '../carte/carte.js';
import { chargerEnvironnement } from '../scene/environnement.js';
import { chargerTextures } from '../carte/materiaux.js';
import { calerSurPhoto, poserCamera } from './calage.js';

// Vues : orthographiques calées au pixel sur une photo, ou en perspective à l'œil.
const VUES = {
  face: {
    nom: 'Face',
    photo: 'produit-2.webp',
    ortho: { dir: [0, 0, -1], haut: [0, 1, 0], point: [-177.5, 74.5, 0], pixel: [93.5, 213], mmParPx: 0.427 },
  },
  dos: {
    nom: 'Dos',
    photo: 'produit-4.webp',
    ortho: { dir: [0, 0, 1], haut: [0, -1, 0], point: [-177.5, -59, 0], pixel: [95, 270], mmParPx: 0.4225 },
  },
  // Vues en perspective : caméra retrouvée par calage sur des points repérés
  // sur la photo (centres des moyeux, coins, écusson, ports).
  avant: {
    nom: '3/4 avant',
    photo: 'card-f-1.png',
    calage: {
      depart: [180, 145, 312, 30, -22, 0, 35],
      points: [
        { monde: [-115.5, 7, 29.1], pixel: [217, 283] },
        { monde: [0, 7, 29.1], pixel: [507, 365] },
        { monde: [115.5, 7, 29.1], pixel: [858, 478] },
        { monde: [179.5, 40, 6], pixel: [1160, 355] },
        { monde: [-177.5, 74.5, 34], pixel: [65, 45] },
        { monde: [55.5, 58, 35.9], pixel: [690, 228] },
        { monde: [-56, -46.5, 35.9], pixel: [380, 475] },
        { monde: [179.5, 74.5, 20], pixel: [1213, 225] },
      ],
    },
  },
  arriere: {
    nom: '3/4 arrière',
    photo: 'card-b-1.png',
    calage: {
      depart: [283, 273, -461, 148, -27, 180, 22],
      points: [
        { monde: [-177.5, -59, -35], pixel: [160, 93] },
        { monde: [179.5, -59, -35], pixel: [1205, 78] },
        { monde: [179.5, 74.5, -35], pixel: [1103, 497] },
        { monde: [-177.5, 74.5, -35], pixel: [12, 445] },
        { monde: [179.5, 40, 6], pixel: [1160, 470] },
        { monde: [-92.5, -59, -35], pixel: [275, 95] },
        { monde: [128.6, 74.5, -35], pixel: [905, 485] },
      ],
    },
  },
  dessus: {
    nom: 'Dessus',
    photo: 'produit-3.webp',
    calage: {
      depart: [350, 550, -250, 126, -51, 0, 25],
      points: [
        { monde: [179.5, 40, 6], pixel: [783, 535] },
        { monde: [-177.5, 74.5, -35], pixel: [65, 245] },
        { monde: [179.5, 74.5, -35], pixel: [940, 375] },
        { monde: [169.5, 74.5, 34], pixel: [715, 650] },
        { monde: [2.5, 61, -24.5], pixel: [355, 352] },
        { monde: [-177.5, 74.5, 34], pixel: [72, 390] },
      ],
    },
  },
  // Photo prise presque de face : vue orthographique calée sur le premier DisplayPort
  // et sur le pas entre les ports (114,7 px pour 20 mm).
  ports: {
    nom: 'Côté ports',
    photo: 'produit-5.webp',
    ortho: { dir: [1, 0, 0], haut: [0, 0, 1], point: [-179.5, 45, -25.8], pixel: [380.6, 539], mmParPx: 0.1743 },
  },
  // Vue libre, sans photo : pour la vue éclatée et le balayage filaire / matière.
  libre: { nom: 'Libre', libre: { pos: [420, 260, 620], cible: [0, 0, 0], fov: 32 } },
};
const calages = {};

const params = new URLSearchParams(location.search);
const etat = {
  vue: params.get('vue') in VUES ? params.get('vue') : 'face',
  mode: params.get('mode') === 'superpose' ? 'superpose' : 'cote',
  eclate: Number(params.get('eclate') ?? 0),
  matiere: Number(params.get('matiere') ?? 1),
};

const voletPhoto = document.getElementById('voletPhoto');
const voletRendu = document.getElementById('voletRendu');
const boitePhoto = document.getElementById('photo');
const imgPhoto = boitePhoto.querySelector('img');

const renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = SRGBColorSpace;
voletRendu.appendChild(renderer.domElement);

const scene = new Scene();
scene.background = new Color(0x000000);

const cameraOrtho = new OrthographicCamera(-1, 1, 1, -1, 1, 4000);
const cameraPersp = new PerspectiveCamera(30, 1, 1, 6000);
let camera = cameraOrtho;
const controles = new OrbitControls(cameraPersp, renderer.domElement);
controles.enableDamping = true;

await chargerTextures(renderer.capabilities.getMaxAnisotropy());
const carte = construireCarte();
scene.add(carte.racine);

// Studio filtré « salle noire » ; ?seuil=, ?gain=, ?plancher=, ?env= pour régler.
const reglage = (cle, defaut) => Number(params.get(cle) ?? defaut);
scene.environment = await chargerEnvironnement(renderer, {
  seuil: reglage('seuil', 2.5),
  gain: reglage('gain', 1),
  plancher: reglage('plancher', 0.015),
});
scene.environmentIntensity = reglage('env', 1.2);

// Lumière de studio photo produit, accrochée aux caméras (haut gauche, légèrement devant),
// pour que chaque vue de comparaison soit éclairée comme une photo de catalogue.
const lumiereCle = new DirectionalLight(0xffffff, reglage('lumiere', 2.2));
lumiereCle.position.set(-0.6, 0.8, 1);
const lumiereRemplissage = new DirectionalLight(0xffffff, reglage('lumiere', 2.2) * 0.25);
lumiereRemplissage.position.set(0.8, -0.3, 1);
for (const c of [cameraOrtho, cameraPersp]) scene.add(c);
function accrocherLumieres(c) {
  for (const l of [lumiereCle, lumiereRemplissage]) {
    c.add(l);
    c.add(l.target);
    l.target.position.set(0, 0, -1);
  }
}
scene.environmentRotation.y = (reglage('rotation', 0) * Math.PI) / 180;

// --- Mise en page des volets et calage des caméras -------------------------
function rectVolet() {
  const r = voletRendu.getBoundingClientRect();
  return { w: r.width, h: r.height };
}

function placerPhoto() {
  const { w, h } = rectVolet();
  const iw = imgPhoto.naturalWidth || 1;
  const ih = imgPhoto.naturalHeight || 1;
  const s = Math.min(w / iw, h / ih);
  const ox = (w - iw * s) / 2;
  const oy = (h - ih * s) / 2;
  Object.assign(boitePhoto.style, { left: `${ox}px`, top: `${oy}px`, width: `${iw * s}px`, height: `${ih * s}px` });
  Object.assign(imgPhoto.style, { width: `${iw * s}px`, height: `${ih * s}px` });
  return { s, ox, oy };
}

function calerOrtho(o, { s, ox, oy }) {
  const { w, h } = rectVolet();
  const dir = new Vector3(...o.dir);
  const haut = new Vector3(...o.haut);
  const droite = new Vector3().crossVectors(dir, haut).normalize();
  const point = new Vector3(...o.point);
  const k = o.mmParPx / s; // mm par pixel d'écran
  const px = ox + o.pixel[0] * s;
  const py = oy + o.pixel[1] * s;
  const u = point.dot(droite);
  const v = point.dot(haut);
  cameraOrtho.left = u - px * k;
  cameraOrtho.right = cameraOrtho.left + w * k;
  cameraOrtho.top = v + py * k;
  cameraOrtho.bottom = cameraOrtho.top - h * k;
  cameraOrtho.position.copy(dir).multiplyScalar(-1500);
  cameraOrtho.up.copy(haut);
  cameraOrtho.lookAt(0, 0, 0);
  cameraOrtho.updateProjectionMatrix();
}

function appliquerVue() {
  const vue = VUES[etat.vue];
  document.getElementById('volets').classList.toggle('libre', !!vue.libre);
  const calage = placerPhoto();
  const { w, h } = rectVolet();
  renderer.setSize(w, h);
  if (vue.libre) {
    camera = cameraPersp;
    controles.enabled = true;
    cameraPersp.clearViewOffset();
    cameraPersp.fov = vue.libre.fov;
    cameraPersp.aspect = w / h;
    cameraPersp.up.set(0, 1, 0);
    cameraPersp.position.set(...vue.libre.pos);
    controles.target.set(...vue.libre.cible);
    cameraPersp.updateProjectionMatrix();
    controles.update();
  } else if (vue.ortho) {
    camera = cameraOrtho;
    controles.enabled = false;
    calerOrtho(vue.ortho, calage);
  } else {
    camera = cameraPersp;
    controles.enabled = false;
    const iw = imgPhoto.naturalWidth;
    if (!iw) return;
    const ih = imgPhoto.naturalHeight;
    calages[etat.vue] ??= calerSurPhoto(vue.calage, iw, ih);
    const res = calages[etat.vue];
    console.info(`calage ${etat.vue} : écart moyen ${res.rms.toFixed(1)} px, écarts ${res.ecarts.join(' ')}, p ${res.p.map((x) => x.toFixed(1)).join(', ')}`);
    poserCamera(cameraPersp, res.p, iw / ih);
    // la photo n'occupe qu'une partie du volet : on décale le cadre de la caméra
    cameraPersp.setViewOffset(iw * calage.s, ih * calage.s, -calage.ox, -calage.oy, w, h);
  }
  accrocherLumieres(camera);
  document.getElementById('legendePhoto').textContent = vue.photo ? `Photo MSI : ${vue.photo}` : '';
}

function changerVue(nom) {
  etat.vue = nom;
  if (!VUES[nom].photo) {
    imgPhoto.removeAttribute('src');
    requestAnimationFrame(appliquerVue);
  } else {
    imgPhoto.onload = appliquerVue;
    imgPhoto.src = `/assets/reference/msi/${VUES[nom].photo}`;
  }
  document.querySelectorAll('[data-vue]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.vue === nom));
}

function changerMode(mode) {
  etat.mode = mode;
  document.getElementById('volets').classList.toggle('superpose', mode === 'superpose');
  renderer.domElement.style.opacity = mode === 'superpose' ? document.getElementById('opacite').value : 1;
  document.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.mode === mode));
  requestAnimationFrame(appliquerVue);
}

// --- Interface -------------------------------------------------------------
const zoneVues = document.getElementById('vues');
for (const [cle, v] of Object.entries(VUES)) {
  const b = document.createElement('button');
  b.dataset.vue = cle;
  b.textContent = v.nom;
  b.onclick = () => changerVue(cle);
  zoneVues.append(b, ' ');
}
document.querySelectorAll('[data-mode]').forEach((b) => (b.onclick = () => changerMode(b.dataset.mode)));
const curseurEclate = document.getElementById('eclate');
const curseurMatiere = document.getElementById('matiere');
curseurEclate.value = etat.eclate;
curseurMatiere.value = etat.matiere;
curseurEclate.oninput = () => (etat.eclate = Number(curseurEclate.value));
curseurMatiere.oninput = () => (etat.matiere = Number(curseurMatiere.value));
document.getElementById('opacite').oninput = (e) => {
  if (etat.mode === 'superpose') renderer.domElement.style.opacity = e.target.value;
};
addEventListener('resize', appliquerVue);
addEventListener('keydown', (e) => {
  if (e.key === 'c') console.log(JSON.stringify({ pos: cameraPersp.position.toArray().map(Math.round), cible: controles.target.toArray().map(Math.round) }));
});

changerMode(etat.mode);
changerVue(etat.vue);

// --- Boucle ----------------------------------------------------------------
function boucle() {
  for (const p of carte.pieces) {
    p.eclatement = etat.eclate;
    p.remplissage = etat.matiere;
  }
  carte.placer();
  if (controles.enabled) controles.update();
  renderer.render(scene, camera);
  requestAnimationFrame(boucle);
}
boucle();

window.atelier = { carte, scene, cameraPersp, controles, etat, appliquerVue };
