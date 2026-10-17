import texteCredits from '../../CREDITS.md?raw';

// Beat 14 : le footer, les crédits complets, et l'extinction finale.

// --- Crédits : CREDITS.md mis en page (titres, tableaux, paragraphes, liens) ---
function echapper(t) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function enLigne(t) {
  return echapper(t)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(https?:\/\/[^\s)|]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
}
function versHtml(md) {
  const lignes = md.split(/\r?\n/);
  const html = [];
  for (let i = 0; i < lignes.length; i++) {
    const l = lignes[i];
    if (/^#\s/.test(l)) html.push(`<h1>${enLigne(l.slice(2))}</h1>`);
    else if (/^##\s/.test(l)) html.push(`<h2>${enLigne(l.slice(3))}</h2>`);
    else if (/^\|/.test(l)) {
      const rangs = [];
      while (i < lignes.length && /^\|/.test(lignes[i])) rangs.push(lignes[i++]);
      i--;
      const cellules = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const [entete, , ...corps] = rangs;
      html.push(
        `<table><thead><tr>${cellules(entete).map((c) => `<th>${enLigne(c)}</th>`).join('')}</tr></thead><tbody>${corps
          .map((r) => `<tr>${cellules(r).map((c) => `<td>${enLigne(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table>`,
      );
    } else if (/^-\s/.test(l)) {
      const items = [];
      while (i < lignes.length && /^-\s/.test(lignes[i])) items.push(`<li>${enLigne(lignes[i++].slice(2))}</li>`);
      i--;
      html.push(`<ul>${items.join('')}</ul>`);
    } else if (l.trim()) html.push(`<p>${enLigne(l)}</p>`);
  }
  return html.join('\n');
}

export function creerFin({ lenis }) {
  const panneau = document.getElementById('credits');
  const contenu = document.getElementById('credits-contenu');
  contenu.innerHTML = versHtml(texteCredits);
  document.getElementById('btn-credits').addEventListener('click', () => {
    panneau.hidden = false;
    panneau.scrollTop = 0;
    lenis.stop();
  });
  document.getElementById('btn-fermer-credits').addEventListener('click', () => {
    panneau.hidden = true;
    lenis.start();
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panneau.hidden) {
      panneau.hidden = true;
      lenis.start();
    }
  });

  // --- Extinction : des pixels de 3 px s'éteignent dans un ordre tramé (matrice de
  // Bayer 8 × 8), jusqu'au noir total. Un calque noir par-dessus tout le site. ---
  const toile = document.getElementById('extinction');
  const ctx = toile.getContext('2d');
  const BAYER = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21];
  let ordre = null;
  let image = null;
  let dernier = -1;
  function preparer() {
    const l = Math.ceil(innerWidth / 3);
    const h = Math.ceil(innerHeight / 3);
    toile.width = l;
    toile.height = h;
    image = ctx.createImageData(l, h);
    ordre = new Float32Array(l * h);
    // un peu de hasard par-dessus la trame, pour que l'extinction ne dessine pas de motif
    for (let y = 0; y < h; y++) for (let x = 0; x < l; x++) ordre[y * l + x] = (BAYER[(y % 8) * 8 + (x % 8)] + Math.random() * 6) / 70;
    dernier = -1;
  }
  preparer();
  addEventListener('resize', preparer);

  return {
    maj(E) {
      const v = Math.round(E.extinction * 400) / 400;
      if (v === dernier) return;
      dernier = v;
      toile.style.display = v > 0 ? 'block' : 'none';
      if (v <= 0) return;
      const d = image.data;
      for (let i = 0; i < ordre.length; i++) d[i * 4 + 3] = ordre[i] < v ? 255 : 0;
      ctx.putImageData(image, 0, 0);
    },
  };
}
