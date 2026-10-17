// Recopie les cotes de src/carte/dimensions.js (et les contours de façade relevés
// dans src/carte/coque.js) dans outils/blender/dimensions.json, pour que Blender et
// le site lisent exactement les mêmes repères.
// Usage : node outils/blender/dimensions.mjs (lancé aussi par outils/blender/construire.bat)
import { writeFileSync } from 'node:fs';
import * as D from '../../src/carte/dimensions.js';
import { BARRES, FACADE, X_EMBOUT } from '../../src/carte/coque.js';
import { FENETRE, PORTS } from '../../src/carte/arriere.js';

const sortie = new URL('./dimensions.json', import.meta.url);
writeFileSync(sortie, JSON.stringify({ ...D, FACADE, BARRES, X_EMBOUT, FENETRE, PORTS }, null, 2));
console.log('dimensions.json écrit');
