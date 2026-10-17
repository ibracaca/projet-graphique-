import {
  EquirectangularReflectionMapping,
  FloatType,
  HalfFloatType,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  ShaderMaterial,
  WebGLRenderTarget,
} from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

// « Salle noire » : on garde le vrai studio photographié (HDR Poly Haven) mais on
// éteint ses murs. Seules les sources plus lumineuses que le seuil subsistent
// (boîtes à lumière, bandes LED), ce qui donne de longs reflets nets sur du noir.
export function filtrerHDR(renderer, hdr, { seuil = 2.5, gain = 1, plancher = 0.015 } = {}) {
  const { width, height } = hdr.image;
  const cible = new WebGLRenderTarget(width, height, {
    type: HalfFloatType,
    magFilter: LinearFilter,
    minFilter: LinearFilter,
    depthBuffer: false,
  });
  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const materiau = new ShaderMaterial({
    uniforms: { tHDR: { value: hdr }, uSeuil: { value: seuil }, uGain: { value: gain }, uPlancher: { value: plancher } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: /* glsl */ `
      uniform sampler2D tHDR;
      uniform float uSeuil, uGain, uPlancher;
      varying vec2 vUv;
      void main() {
        vec3 c = texture2D(tHDR, vUv).rgb;
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        float garde = smoothstep(uSeuil * 0.8, uSeuil * 1.25, l);
        gl_FragColor = vec4(c * (garde * uGain + uPlancher), 1.0);
      }
    `,
    depthTest: false,
  });
  scene.add(new Mesh(new PlaneGeometry(2, 2), materiau));
  const avant = renderer.getRenderTarget();
  renderer.setRenderTarget(cible);
  renderer.render(scene, camera);
  renderer.setRenderTarget(avant);
  materiau.dispose();
  cible.texture.mapping = EquirectangularReflectionMapping;
  return cible;
}

export function chargerEnvironnement(renderer, options) {
  return new Promise((ok, echec) => {
    const chargeur = new HDRLoader();
    chargeur.setDataType(FloatType);
    chargeur.load(
      new URL('../../assets/hdri/studio_small_08_2k.hdr', import.meta.url).href,
      (hdr) => {
        const pmrem = new PMREMGenerator(renderer);
        const filtre = filtrerHDR(renderer, hdr, options);
        const env = pmrem.fromEquirectangular(filtre.texture).texture;
        filtre.dispose();
        hdr.dispose();
        pmrem.dispose();
        ok(env);
      },
      undefined,
      echec,
    );
  });
}
