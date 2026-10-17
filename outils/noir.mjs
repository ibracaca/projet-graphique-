// Mesure le noir OLED : part des pixels strictement noirs dans une capture,
// en excluant les bords où vit le HUD. Usage : node outils/noir.mjs <image.png>
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
const fichier = process.argv[2];
const nav = await chromium.launch();
const page = await nav.newPage();
const r = await page.evaluate(async (b64) => {
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const x0 = Math.round(img.width * 0.12), x1 = Math.round(img.width * 0.88), y0 = Math.round(img.height * 0.08), y1 = Math.round(img.height * 0.85);
  const d = g.getImageData(x0, y0, x1 - x0, y1 - y0).data;
  let noirs = 0, max = 0;
  for (let i = 0; i < d.length; i += 4) {
    const m = Math.max(d[i], d[i + 1], d[i + 2]);
    if (m === 0) noirs++;
    if (m > max) max = m;
  }
  return { pixelsNoirs: ((100 * noirs) / (d.length / 4)).toFixed(2) + ' %', valeurMax: max };
}, readFileSync(fichier).toString('base64'));
console.log(fichier, JSON.stringify(r));
await nav.close();
