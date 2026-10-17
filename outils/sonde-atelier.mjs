// Sonde de l'atelier : ouvre une vue, exécute du code dans la page, capture.
// Usage : node outils/sonde-atelier.mjs <vue et paramètres> "<code JS>" [sortie.png]
import { chromium } from 'playwright';
const [, , requete = 'vue=face', code = '', sortie] = process.argv;
const nav = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await nav.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('console', (m) => m.type() === 'error' && console.log('[erreur]', m.text()));
await page.goto(`http://localhost:5173/dev/carte.html?${requete}`);
await page.waitForTimeout(3500);
const r = await page.evaluate(code || 'null');
if (r != null) console.log(typeof r === 'string' ? r : JSON.stringify(r));
await page.waitForTimeout(500);
if (sortie) await page.screenshot({ path: sortie });
await nav.close();
