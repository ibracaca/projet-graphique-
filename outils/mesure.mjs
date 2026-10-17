// Mesure le coût de rendu (appels de dessin, triangles par image) à des positions de scroll.
// Usage : node outils/mesure.mjs [positions en vh séparées par des virgules] [largeur] [hauteur]
import { chromium } from 'playwright';
const [, , liste = '210,860,2040,3850,4520', l = '1920', h = '1080'] = process.argv;
const nav = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await nav.newPage({ viewport: { width: +l, height: +h } });
page.on('pageerror', (e) => console.log('[erreur]', e.message));
await page.goto('http://localhost:5173/');
await page.waitForSelector('#btn-allumer', { state: 'visible', timeout: 60000 });
await page.click('#btn-allumer');
await page.waitForTimeout(1500);
const res = await page.evaluate(async (positions) => {
  const S = window.salleNoire;
  const r = S.rendu.renderer;
  const out = {};
  const att = (ms) => new Promise((f) => setTimeout(f, ms));
  for (const vh of positions) {
    S.lenis.scrollTo((vh / 100) * innerHeight, { immediate: true, force: true });
    await att(2500);
    r.info.autoReset = false;
    r.info.reset();
    let n = 0;
    const t0 = performance.now();
    await new Promise((f) => {
      const b = () => (n++, performance.now() - t0 < 1000 ? requestAnimationFrame(b) : f());
      requestAnimationFrame(b);
    });
    out[vh] = { appels: Math.round(r.info.render.calls / n), triangles: Math.round(r.info.render.triangles / n), ips: n };
    r.info.autoReset = true;
  }
  out.niveau = S.rendu.qualite.niveau();
  return out;
}, liste.split(',').map(Number));
console.log(JSON.stringify(res));
await nav.close();
