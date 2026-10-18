// Contrôles dynamiques de non-régression : Mode film, retour en arrière, version calme.
// Usage : node outils/non-regression.mjs <dossier de sortie>
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const [, , dossier = 'captures/tmp/nr'] = process.argv;
mkdirSync(dossier, { recursive: true });
const nav = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const erreurs = [];
const attendre = (ms) => new Promise((f) => setTimeout(f, ms));

async function ouvrir(options = {}) {
  const page = await nav.newPage({ viewport: { width: 1920, height: 1080 }, ...options });
  page.on('pageerror', (e) => erreurs.push(e.message));
  page.on('console', (m) => m.type() === 'error' && erreurs.push(m.text().slice(0, 200)));
  await page.goto('http://localhost:5173/');
  await page.waitForSelector('#btn-allumer', { state: 'visible', timeout: 60000 });
  await page.click('#btn-allumer');
  await attendre(1800);
  return page;
}
const vh = (page) => page.evaluate(() => (scrollY / innerHeight) * 100);
const aller = (page, v) => page.evaluate((y) => window.salleNoire.lenis.scrollTo((y / 100) * innerHeight, { immediate: true, force: true }), v);

// 1. Mode film : le scroll doit avancer tout seul avec la musique.
{
  const page = await ouvrir();
  const avant = await vh(page);
  await page.click('#btn-film');
  await attendre(8000);
  const apres = await vh(page);
  const presse = await page.getAttribute('#btn-film', 'aria-pressed');
  await page.screenshot({ path: `${dossier}/film.png` });
  // une molette met en pause
  await page.mouse.wheel(0, 200);
  await attendre(500);
  const pause = await page.getAttribute('#btn-film', 'aria-pressed');
  console.log(`Mode film : ${avant.toFixed(0)} vh puis ${apres.toFixed(0)} vh en 8 s, bouton ${presse}, après molette ${pause}`);
  await page.close();
}

// 2. Retour en arrière, du bas jusqu'en haut, par paliers ; captures à comparer
//    avec celles de l'aller.
{
  const page = await ouvrir();
  for (let v = 0; v <= 5100; v += 300) {
    await aller(page, v);
    await attendre(250);
  }
  for (const v of [5100, 4520, 3850, 2040, 1200, 860, 330, 0]) {
    await aller(page, v);
    await attendre(2600);
    await page.screenshot({ path: `${dossier}/retour-${String(v).padStart(4, '0')}.png` });
  }
  const etat = await page.evaluate(() => ({ ville: window.salleNoire.ETAT.ville, neon: window.salleNoire.ETAT.neon, brouillard: window.salleNoire.rendu.scene.fog?.density }));
  console.log('Retour en haut :', JSON.stringify(etat));
  await page.close();
}

// 3. Version calme (prefers-reduced-motion).
{
  const page = await ouvrir({ reducedMotion: 'reduce' });
  for (const v of [330, 860, 1720, 3850, 4520]) {
    await aller(page, v);
    await attendre(2200);
    await page.screenshot({ path: `${dossier}/calme-${String(v).padStart(4, '0')}.png` });
  }
  console.log('Version calme : captures faites');
  await page.close();
}

console.log(erreurs.length ? `Erreurs :\n${[...new Set(erreurs)].join('\n')}` : 'Aucune erreur dans la console.');
await nav.close();
