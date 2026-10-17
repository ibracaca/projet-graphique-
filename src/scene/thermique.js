import { DoubleSide, HalfFloatType, ShaderMaterial, WebGLRenderTarget } from 'three';
import { COULEURS, DEGRADE_MSI } from '../couleurs.js';
import { GPU } from '../carte/dimensions.js';

// Beat 6, vision thermique : la scène est rendue une seconde fois avec un matériau
// unique qui calcule une température à partir de la position (repère monde) :
//  - la puce chauffe (tache centrée sur le GB202, sur le PCB et la plaque de base) ;
//  - puis les Core Pipes emportent la chaleur vers les deux extrémités ;
//  - les ailettes du radiateur tiédissent, l'avant (côté ventilateurs) reste plus froid.
// Palette construite avec le dégradé MSI : noir, bleu (froid), violet, rose (chaud),
// blanc (brûlant). Pas de chiffres : aucun test reconnu de cette carte précise
// n'en donne (voir DESIGN.md, section 11).

// Vue en coupe : tout ce qui dépasse le plan y = uCoupe (hauteur du centre de la
// puce) est retiré. Vu d'en haut, on lit la carte comme un plan de coupe : les faces
// intérieures, aplaties, dessinent les sections (dont les Core Pipes carrés).
export function creerThermique() {
  const materiau = new ShaderMaterial({
    side: DoubleSide,
    uniforms: {
      uCoupe: { value: GPU.y },
      uChauffe: { value: 0 },
      uEvacuation: { value: 0 },
      uTemps: { value: 0 },
      uC0: { value: DEGRADE_MSI[0] },
      uC1: { value: DEGRADE_MSI[1] },
      uC2: { value: DEGRADE_MSI[2] },
      uC3: { value: DEGRADE_MSI[3] },
      uBlanc: { value: COULEURS.msiIncandescent },
    },
    vertexShader: /* glsl */ `
      varying vec3 vMonde;
      varying vec3 vNormale;
      void main() {
        vec4 p = vec4(position, 1.0);
        vec3 n = normal;
        #ifdef USE_INSTANCING
          p = instanceMatrix * p;
          n = mat3(instanceMatrix) * n;
        #endif
        vec4 w = modelMatrix * p;
        vMonde = w.xyz;
        vNormale = normalize(mat3(modelMatrix) * n);
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uChauffe, uEvacuation, uTemps, uCoupe;
      uniform vec3 uC0, uC1, uC2, uC3, uBlanc;
      varying vec3 vMonde;
      varying vec3 vNormale;

      // noir -> bleu -> indigo -> violet -> rose -> brûlant
      vec3 palette(float t) {
        t = clamp(t, 0.0, 1.0);
        vec3 c = mix(vec3(0.0), uC0 * 0.5, smoothstep(0.0, 0.18, t));
        c = mix(c, uC1, smoothstep(0.18, 0.38, t));
        c = mix(c, uC2, smoothstep(0.38, 0.58, t));
        c = mix(c, uC3 * 1.25, smoothstep(0.58, 0.8, t));
        c = mix(c, uBlanc * 2.2, smoothstep(0.8, 1.0, t));
        return c;
      }

      void main() {
        vec3 p = vMonde;
        if (p.y > uCoupe) discard;
        float dx = abs(p.x - (${GPU.x.toFixed(1)}));
        float dy = p.y - (${GPU.y.toFixed(1)});

        // la puce : tache chaude, qui baisse un peu quand les caloducs évacuent
        float tache = exp(-(dx * dx) / (30.0 * 30.0) - (dy * dy) / (28.0 * 28.0));
        float puce = tache * uChauffe * (1.0 - 0.35 * uEvacuation);

        // les caloducs : la chaleur part de la puce vers les extrémités
        float front = mix(10.0, 270.0, uEvacuation);
        float porte = smoothstep(front, front - 80.0, dx) * uEvacuation;
        float decroit = 0.82 - 0.45 * clamp(dx / 250.0, 0.0, 1.0);
        float bande = 1.0 - smoothstep(55.0, 80.0, abs(dy + 4.0));
        float conduit = porte * decroit * bande * uChauffe;

        // le PCB ne prend qu'une partie de la chaleur évacuée
        float profondeur = smoothstep(-80.0, -48.0, p.z);
        float t = max(puce, conduit * mix(0.35, 1.0, profondeur));
        // l'avant des ailettes, dans l'air frais des ventilateurs, reste plus froid
        t *= 1.0 - 0.3 * smoothstep(-10.0, 14.0, p.z);

        // vibration de capteur, légère
        t += (fract(sin(dot(floor(p.xy * 0.5), vec2(12.9898, 78.233)) + uTemps) * 43758.5453) - 0.5) * 0.015;
        t = 0.1 + t * 0.9;

        // faces intérieures (vues à travers la coupe) : aplat de section, plein ;
        // faces extérieures : un peu de modelé pour lire les volumes
        float lum = gl_FrontFacing
          ? 0.5 + 0.3 * max(dot(normalize(vNormale), normalize(vec3(-0.3, 0.9, 0.3))), 0.0)
          : 1.0;
        gl_FragColor = vec4(palette(t) * lum, 1.0);
      }
    `,
  });

  const cible = new WebGLRenderTarget(4, 4, { type: HalfFloatType, depthBuffer: true });
  return { materiau, cible };
}
