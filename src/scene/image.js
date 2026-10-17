import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Group,
  Line,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
} from 'three';
import { COULEURS, DEGRADE_MSI } from '../couleurs.js';
import { GPU, PCB } from '../carte/dimensions.js';
import { PORTS } from '../carte/arriere.js';

// Beat 10, 4,17 ms : la vie d'une image à 240 images par seconde.
// Une petite image (16:9) entre par le connecteur PCIe (les commandes du
// processeur), monte jusqu'à la puce où elle se calcule en cinq étapes
// (géométrie, rastérisation, ray tracing, shading, DLSS), passe par la mémoire,
// puis sort par le premier DisplayPort (affichage). Une traîne lumineuse la suit.
// Le contenu de l'image change avec l'étape : fil de fer, pixels grossiers,
// rayons, ombrage lisse, puis définition fine.

export const ETAPES = ['Géométrie', 'Rastérisation', 'Ray tracing', 'Shading', 'DLSS', 'Affichage'];
// progression E.image : arrivée 0 à 0,12 ; cinq étapes de 0,14 ; sortie de 0,82 à 1
export const etapeDe = (t) => (t < 0.82 ? Math.min(4, Math.max(0, Math.floor((t - 0.12) / 0.14))) : 5);

const Z = -16; // l'image flotte au-dessus de la carte (repère local du PCB)

export function creerImage(pcb) {
  const groupe = new Group();
  groupe.visible = false;
  pcb.add(groupe);

  const port = PORTS[0];
  const chemin = new CatmullRomCurve3(
    [
      [-90, PCB.doigts.yMin + 4, Z],
      [-92, -40, Z],
      [GPU.x, GPU.y, Z + 4],
      [GPU.x - 30, GPU.y + 6, Z],
      [GPU.x - 43.5, GPU.y + 15, Z - 2],
      [-150, 40, Z],
      [-181, port.y, -26],
    ].map((p) => new Vector3(...p)),
    false,
    'centripetal',
  );
  // paramètre du chemin pour chaque phase : arrivée sur la puce à u = 0,3,
  // départ de la puce, mémoire, sortie
  const U_PUCE = 0.3;

  // --- l'image ---------------------------------------------------------------
  const mat = new ShaderMaterial({
    uniforms: { uEtape: { value: 0 }, uAvance: { value: 0 }, uBlanc: { value: COULEURS.blanc }, uAcier: { value: COULEURS.acier } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */ `
      uniform float uEtape, uAvance;
      uniform vec3 uBlanc, uAcier;
      varying vec2 vUv;

      // la scène de l'image : un sol qui file vers l'horizon et une sphère éclairée
      float scene(vec2 uv, out float masqueSphere) {
        vec2 p = (uv - 0.5) * vec2(16.0 / 9.0, 1.0);
        vec2 c = vec2(0.18, 0.02);
        float r = 0.22;
        float d = length(p - c);
        masqueSphere = 1.0 - smoothstep(r - 0.004, r, d);
        vec3 n = vec3((p - c) / r, 0.0);
        n.z = sqrt(max(0.0, 1.0 - dot(n.xy, n.xy)));
        float lum = max(dot(n, normalize(vec3(-0.6, 0.7, 0.5))), 0.0);
        float sol = smoothstep(-0.02, -0.5, p.y) * 0.55 + 0.04;
        float ombre = 1.0 - 0.6 * (1.0 - smoothstep(0.0, 0.18, length((p - vec2(0.24, -0.26)) * vec2(1.0, 3.0))));
        return mix(sol * ombre, 0.08 + 0.92 * lum, masqueSphere);
      }

      float fil(vec2 uv) {
        // maillage triangulé : trois familles de lignes
        vec2 g = uv * vec2(16.0, 9.0) * 1.2;
        float a = abs(fract(g.x) - 0.5);
        float b = abs(fract(g.y) - 0.5);
        float c = abs(fract(g.x + g.y) - 0.5);
        float w = 0.06;
        return max(max(1.0 - smoothstep(0.5 - w, 0.5, a), 1.0 - smoothstep(0.5 - w, 0.5, b)), 1.0 - smoothstep(0.5 - w, 0.5, c));
      }

      void main() {
        float m;
        float v = scene(vUv, m);
        float e = uEtape;
        vec3 c;
        if (e < 0.5) {
          // géométrie : seulement les arêtes du maillage, plus fortes sur la sphère
          c = uAcier * fil(vUv) * (0.35 + 0.65 * m);
        } else if (e < 1.5) {
          // rastérisation : la scène en gros pixels, sans éclairage
          vec2 q = (floor(vUv * vec2(32.0, 18.0)) + 0.5) / vec2(32.0, 18.0);
          float mq;
          scene(q, mq);
          c = uAcier * (0.25 + 0.6 * mq);
        } else if (e < 2.5) {
          // ray tracing : des rayons partent de la source vers la scène
          vec2 s = vec2(0.08, 0.95);
          vec2 d = vUv - s;
          float ang = atan(d.y, d.x);
          float rayons = 1.0 - smoothstep(0.0, 0.02, abs(fract(ang * 6.0 + uAvance * 2.0) - 0.5) - 0.46);
          c = uAcier * 0.25 * v + uBlanc * rayons * 0.45 * smoothstep(0.0, 0.15, length(d));
        } else if (e < 3.5) {
          // shading : l'image lisse, en basse définition (flou)
          vec2 q = (floor(vUv * vec2(64.0, 36.0)) + 0.5) / vec2(64.0, 36.0);
          float mq;
          c = uBlanc * scene(q, mq) * 0.9;
        } else {
          // DLSS puis affichage : pleine définition
          c = uBlanc * v;
        }
        // cadre fin de l'image
        vec2 b = abs(vUv - 0.5);
        float cadre = step(0.488, max(b.x * 1.0, b.y * 1.0 + 0.0));
        c = mix(c, uBlanc * 0.8, cadre);
        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });
  const image = new Mesh(new PlaneGeometry(28.8, 16.2), mat);
  groupe.add(image);

  // --- la traîne -------------------------------------------------------------
  const N = 240;
  const pos = new Float32Array(N * 3);
  const u = new Float32Array(N);
  const tmp = new Vector3();
  for (let i = 0; i < N; i++) {
    chemin.getPoint(i / (N - 1), tmp);
    pos.set([tmp.x, tmp.y, tmp.z], i * 3);
    u[i] = i / (N - 1);
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('u', new BufferAttribute(u, 1));
  const matTraine = new ShaderMaterial({
    uniforms: { uTete: { value: 0 }, uC0: { value: DEGRADE_MSI[0] }, uC3: { value: DEGRADE_MSI[3] } },
    vertexShader: 'attribute float u; varying float vU; void main() { vU = u; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */ `
      uniform float uTete;
      uniform vec3 uC0, uC3;
      varying float vU;
      void main() {
        if (vU > uTete) discard;
        float a = exp(-(uTete - vU) * 9.0);
        gl_FragColor = vec4(mix(uC0, uC3, vU) * a * 1.4, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const traine = new Line(geo, matTraine);
  traine.userData.neon = true;
  traine.frustumCulled = false;
  groupe.add(traine);

  // E.image (0 à 1) : position de l'image sur le chemin
  function uDe(t) {
    if (t < 0.12) return (t / 0.12) * U_PUCE;
    if (t < 0.82) return U_PUCE;
    return U_PUCE + ((t - 0.82) / 0.18) * (1 - U_PUCE);
  }

  function maj(dt, E) {
    groupe.visible = E.imageVisible > 0.001;
    if (!groupe.visible) return;
    const t = E.image;
    const uu = uDe(t);
    chemin.getPoint(uu, image.position);
    // pendant le calcul, l'image monte un peu et grandit au-dessus de la puce
    const calcul = t > 0.12 && t < 0.82 ? Math.sin(Math.PI * Math.min(1, (t - 0.12) / 0.7)) : 0;
    image.position.z += 5 * calcul;
    image.scale.setScalar(E.imageVisible * (1 + 0.5 * calcul));
    mat.uniforms.uEtape.value = etapeDe(t);
    mat.uniforms.uAvance.value = t * 20;
    matTraine.uniforms.uTete.value = uu;
  }
  return { maj, ETAPES };
}
