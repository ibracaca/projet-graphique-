// Recopie les cotes de src/carte/dimensions.js dans outils/blender/dimensions.json,
// pour que Blender et le site lisent exactement les mêmes repères.
// Usage : node outils/blender/dimensions.mjs (lancé aussi par outils/blender/construire.bat)
import { writeFileSync } from 'node:fs';
import * as D from '../../src/carte/dimensions.js';

const sortie = new URL('./dimensions.json', import.meta.url);
writeFileSync(sortie, JSON.stringify(D, null, 2));
console.log('dimensions.json écrit');
