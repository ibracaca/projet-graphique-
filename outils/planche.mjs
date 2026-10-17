// Planche contact : assemble plusieurs captures en une image (grille), via le navigateur.
// Usage : node outils/planche.mjs <sortie.png> <colonnes> <image1> <image2> ...
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
const [, , sortie, colonnes, ...images] = process.argv;
const imgs = images.map((f) => `<figure><img src="data:image/png;base64,${readFileSync(f).toString('base64')}"><figcaption>${f.split('/').pop()}</figcaption></figure>`).join('');
const html = `<style>body{margin:0;background:#111;display:grid;grid-template-columns:repeat(${colonnes},1fr);gap:6px;padding:6px;font:12px monospace;color:#999}figure{margin:0}img{width:100%;display:block}</style>${imgs}`;
const nav = await chromium.launch();
const page = await nav.newPage({ viewport: { width: 1920, height: 400 } });
await page.setContent(html);
await page.waitForTimeout(300);
await page.screenshot({ path: sortie, fullPage: true });
await nav.close();
console.log(sortie);
