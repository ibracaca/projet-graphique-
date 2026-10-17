// Capture toutes les vues de l'atelier de la carte en une fois.
// Usage : node outils/captures-carte.mjs [dossier] [vues séparées par des virgules] [paramètres en plus]
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const [, , dossier = 'captures/tmp', liste = 'face,dos,ports,avant,arriere,dessus', extra = ''] = process.argv;
mkdirSync(dossier, { recursive: true });

const navigateur = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await navigateur.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (e) => console.log('[erreur]', e.message));
page.on('console', (m) => (m.type() === 'error' || m.text().startsWith('calage')) && console.log('[console]', m.text()));
for (const vue of liste.split(',')) {
  await page.goto(`http://localhost:5173/dev/carte.html?vue=${vue}${extra}`);
  await page.waitForTimeout(3500);
  const sortie = `${dossier}/carte-${vue}.png`;
  await page.screenshot({ path: sortie });
  console.log(sortie);
}
await navigateur.close();
