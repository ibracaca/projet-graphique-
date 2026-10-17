import { AdditiveBlending, EdgesGeometry, LineSegments, ShaderMaterial } from 'three';
import { DEGRADE_MSI } from '../couleurs.js';

// Beat 11, le climax : le dégradé MSI coule le long des arêtes de la carte
// reconstruite. Les arêtes vives de la coque et du backplate deviennent des tubes
// de lumière ; le dégradé avance le long de la carte comme un fluide (bleu au
// bord, rose au cœur, le motif glisse dans le temps). E.aretes (0 à 1) : front
// d'allumage, de l'équerre vers l'écusson.

const PIECES = ['coque', 'backplate'];
const ANGLE = 35; // degrés : seules les arêtes franches s'allument

export function creerAretes(carte) {
  const materiau = new ShaderMaterial({
    uniforms: {
      uFront: { value: 0 },
      uTemps: { value: 0 },
      uIntensite: { value: 1 },
      uC0: { value: DEGRADE_MSI[0] },
      uC1: { value: DEGRADE_MSI[1] },
      uC2: { value: DEGRADE_MSI[2] },
      uC3: { value: DEGRADE_MSI[3] },
    },
    vertexShader: /* glsl */ `
      varying vec3 vMonde;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vMonde = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
        // légèrement vers la caméra : la ligne ne se bat pas avec la surface
        gl_Position.z -= 0.0008 * gl_Position.w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uFront, uTemps, uIntensite;
      uniform vec3 uC0, uC1, uC2, uC3;
      varying vec3 vMonde;
      vec3 degrade(float t) {
        t = clamp(t, 0.0, 1.0) * 3.0;
        if (t < 1.0) return mix(uC0, uC1, t);
        if (t < 2.0) return mix(uC1, uC2, t - 1.0);
        return mix(uC2, uC3, t - 2.0);
      }
      void main() {
        // position le long de la carte, de 0 (équerre) à 1 (écusson)
        float s = clamp((vMonde.x + 180.0) / 361.0, 0.0, 1.0);
        float f = uFront * 1.25 - 0.1;
        if (s > f + 0.02) discard;
        // le front : une goutte plus claire qui avance
        float tete = exp(-pow((f - s) / 0.025, 2.0)) * step(uFront, 0.999);
        // le dégradé : bleu aux extrémités, rose au cœur, et il glisse
        float coeur = 1.0 - abs(s - 0.5) * 2.0;
        float flux = 0.5 + 0.5 * sin((s * 3.0 - uTemps * 0.35) * 6.2832);
        vec3 c = degrade(clamp(coeur * 0.8 + flux * 0.25, 0.0, 1.0));
        float a = (0.22 + 0.1 * flux + tete * 1.0) * uIntensite;
        gl_FragColor = vec4(c * a, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });

  const lignes = [];
  for (const id of PIECES) {
    const piece = carte.piece(id);
    const maillages = [];
    piece.groupe.traverse((o) => o.isMesh && !o.userData.neon && maillages.push(o));
    for (const m of maillages) {
      if (m.isInstancedMesh) continue;
      const l = new LineSegments(new EdgesGeometry(m.geometry, ANGLE), materiau);
      l.userData.neon = true;
      l.userData.horsThermique = true;
      l.visible = false;
      l.frustumCulled = false;
      m.add(l);
      lignes.push(l);
    }
  }

  return {
    maj(dt, E) {
      const visible = E.aretes > 0.001;
      for (const l of lignes) l.visible = visible;
      if (!visible) return;
      materiau.uniforms.uFront.value = E.aretes;
      materiau.uniforms.uTemps.value += dt;
      materiau.uniforms.uIntensite.value = E.aretesIntensite;
    },
  };
}
