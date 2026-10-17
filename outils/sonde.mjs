// Sonde : ouvre le site, allume, exécute un script dans la page puis capture.
// Usage : node outils/sonde.mjs <sortie.png> "<code JS>" [largeur] [hauteur]
import { chromium } from 'playwright';
const [, , sortie, code = '', l = '1920', h = '1080'] = process.argv;
const nav = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await nav.newPage({ viewport: { width: +l, height: +h } });
page.on('pageerror', (e) => console.log('[erreur]', e.message));
page.on('console', (m) => ['error', 'log'].includes(m.type()) && console.log('[console]', m.text().slice(0, 400)));
await page.goto('http://localhost:5173/');
await page.waitForSelector('#btn-allumer', { state: 'visible', timeout: 60000 });
await page.click('#btn-allumer');
await page.waitForTimeout(1500);
const r = await page.evaluate(`(async () => { ${code} })()`);
if (r !== undefined) console.log('=>', JSON.stringify(r));
await page.waitForTimeout(1200);
await page.screenshot({ path: sortie });
await nav.close();
