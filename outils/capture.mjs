// Capture d'écran d'une page du serveur de développement, en pleine définition.
// Usage : node outils/capture.mjs "/dev/carte.html?vue=face" captures/face.png 1920 1080 3000
import { chromium } from 'playwright';

const [, , chemin = '/', sortie = 'captures/tmp/capture.png', largeur = '1920', hauteur = '1080', attente = '3000'] = process.argv;

const navigateur = await chromium.launch({
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
});
const page = await navigateur.newPage({ viewport: { width: Number(largeur), height: Number(hauteur) }, deviceScaleFactor: 1 });
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && console.log(`[page ${m.type()}]`, m.text()));
page.on('pageerror', (e) => console.log('[erreur]', e.message));
await page.goto(`http://localhost:5173${chemin}`);
await page.waitForTimeout(Number(attente));
const renduGPU = await page.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl2');
  const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'inconnu';
});
await page.screenshot({ path: sortie });
console.log(`${sortie} (${largeur}×${hauteur}, rendu : ${renduGPU})`);
await navigateur.close();
