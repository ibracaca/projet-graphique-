// Captures du site à plusieurs définitions et positions de scroll.
// Usage : node outils/captures-site.mjs <dossier> <définitions> <positions en vh>
//   ex. : node outils/captures-site.mjs captures/acte1 1920x1080,1366x768 boot,0,120,300
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const [, , dossier = 'captures/tmp/site', defs = '1920x1080', liste = 'boot,0,150,300'] = process.argv;
mkdirSync(dossier, { recursive: true });

const navigateur = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
for (const def of defs.split(',')) {
  const [l, h] = def.split('x').map(Number);
  const page = await navigateur.newPage({ viewport: { width: l, height: h } });
  page.on('pageerror', (e) => console.log('[erreur]', e.message));
  page.on('console', (m) => m.type() === 'error' && console.log('[console]', m.text().slice(0, 300)));
  await page.goto('http://localhost:5173/');
  const positions = liste.split(',');
  if (positions[0] === 'boot') {
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `${dossier}/${l}-boot.png` });
    positions.shift();
  }
  await page.waitForSelector('#btn-allumer', { state: 'visible', timeout: 60000 });
  await page.waitForTimeout(900);
  if (positions[0] === 'choix') {
    await page.screenshot({ path: `${dossier}/${l}-choix.png` });
    positions.shift();
  }
  await page.click('#btn-allumer');
  await page.waitForTimeout(1800);
  for (const p of positions) {
    const px = (Number(p) / 100) * h;
    await page.evaluate((y) => window.salleNoire.lenis.scrollTo(y, { immediate: true, force: true }), px);
    await page.waitForTimeout(2600);
    await page.screenshot({ path: `${dossier}/${l}-${String(p).padStart(4, '0')}.png` });
  }
  const ips = await page.evaluate(() => window.salleNoire.rendu.qualite.ips?.toFixed(1));
  console.log(`${def} : ${positions.length} captures, ${ips} images/s, niveau ${await page.evaluate(() => window.salleNoire.rendu.qualite.niveau())}`);
  await page.close();
}
await navigateur.close();
