// Acte IV, le réveil : beats 11 (reconstruction et allumage), 12 (le rendu qui
// se calcule), 13 (fiche technique), 14 (footer et extinction).
// Timeline en vh de scroll.

const ORDRE_RECONSTRUCTION = ['plaqueBase', 'gpu', 'memoire', 'connecteur', 'corePipes', 'pcb', 'radiateur', 'equerre', 'ventilateurs', 'backplate', 'coque'];
const ORDRE_MATIERE = ['backplate', 'pcb', 'equerre', 'plaqueBase', 'corePipes', 'radiateur', 'ventilateurs', 'coque', 'gpu', 'memoire', 'connecteur'];

export function construireActe4({ tl, E, carte, positions, son, reduit }) {
  const R = positions.reveil;
  const V = positions.rendu;
  const F = positions.fiche;
  const Z = positions.fin;
  const piece = (id) => carte.piece(id);

  // ------------------------------------------------------------------------
  // Raccord : on rouvre sur la vue éclatée filaire, celle du beat 2.
  // ------------------------------------------------------------------------
  tl.set(E, { griffure: 0, micro: 0, traces: 0, donnees: 0, image: 0, imageVisible: 0, aberration: 0, coeurs: 0, vagues: 0, atelier: 0.15, env: 0.12, grain: 0.06, bloom: 1 }, R);
  tl.set(E.cam, { x: 700, y: 330, z: 430, cx: -10, cy: -6, cz: 10, fov: 32 }, R);
  for (const p of carte.pieces) {
    tl.set(p.groupe, { visible: true }, R);
    tl.set(p, { eclatement: 1, dz: 0, remplissage: 0 }, R);
    tl.set(p.balayage.uOpaciteFilaire, { value: 0.55 }, R);
  }
  tl.set(piece('pcb').balayage.uDir.value, { x: 1 }, R);
  tl.to(E, { noir: 0, duration: 30, ease: 'traine' }, R);

  // ------------------------------------------------------------------------
  // Beat 11 : les pièces reviennent en place, lourdes, du cœur vers l'extérieur ;
  // la matière se remplit ; le studio s'allume ; puis le dégradé MSI s'allume et
  // coule le long des arêtes.
  // ------------------------------------------------------------------------
  tl.to(ORDRE_RECONSTRUCTION.map(piece), { eclatement: 0, duration: 120, ease: 'masse', stagger: 8 }, R + 20)
    .to(E.cam, { x: 300, y: 140, z: 520, cx: 8, cy: -4, cz: 0, fov: 30, duration: 200, ease: 'masse' }, R + 20)
    .to(ORDRE_MATIERE.map(piece), { remplissage: 1, duration: 70, ease: 'masse', stagger: 6 }, R + 170)
    .to(E, { atelier: 0.85, env: 1.2, grain: 0.035, vignette: 0.3, duration: 70, ease: 'traine' }, R + 230)
    .to(E, { neon: 1, duration: 25, ease: 'traine' }, R + 300)
    .fromTo(E, { aretes: 0 }, { aretes: 1, duration: 110, ease: 'none' }, R + 305)
    .set(E, { aretesIntensite: 1 }, R + 305)
    .to(E.cam, { x: 230, y: 100, z: 420, cx: 4, duration: 260, ease: 'none' }, R + 300);

  // « 2 482 MHz. » : le chiffre monte, la police s'élargit avec la fréquence.
  const mhz = document.getElementById('mhz');
  const compteur = { v: 0 };
  tl.set('#t-reveil', { visibility: 'visible' }, R + 320)
    .fromTo('#titre-mhz', { '--wdth': 62, '--wght': 200, clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 20, ease: 'traine' }, R + 320)
    .to('#titre-mhz', { '--wdth': 125, '--wght': 380, duration: 100, ease: 'none' }, R + 325)
    .fromTo(
      compteur,
      { v: 0 },
      { v: 2482, duration: 100, ease: 'power2.out', onUpdate: () => (mhz.textContent = Math.round(compteur.v).toLocaleString('fr-FR')) },
      R + 325,
    )
    .fromTo('#t-reveil .texte-beat', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 30, ease: 'traine' }, R + 430)
    .to('#t-reveil', { clipPath: 'inset(0 0 100% 0)', duration: 20, ease: 'coupe' }, R + 535)
    .set('#t-reveil', { visibility: 'hidden' }, R + 556);

  // sortie : l'image se décompose en tuiles noires, comme un moteur de rendu qui repart de zéro
  tl.fromTo(E, { noirTuiles: 0 }, { noirTuiles: 1, duration: 40, ease: 'none' }, R + 556);

  // ------------------------------------------------------------------------
  // Beat 12 : la ville se calcule, passe après passe, tuile après tuile.
  // ------------------------------------------------------------------------
  tl.set(E, { ville: 1, etape: -1, noirTuiles: 0, atelier: 0, env: 0.15, neon: 0, aretes: 0, grain: 0.05 }, V);
  tl.set(E.cam, { x: 0, y: 60, z: 560, cx: 0, cy: 90, cz: -800, fov: 40 }, V);
  tl.to(E.cam, { z: 140, y: 42, cy: 120, duration: 600, ease: 'none' }, V)
    .to(E, { etape: 0, duration: 60, ease: 'none' }, V + 10)
    .to(E, { etape: 1, duration: 60, ease: 'none' }, V + 110)
    .to(E, { etape: 2, duration: 60, ease: 'none' }, V + 210)
    .to(E, { lune: 1.4, neonsVille: 1, duration: 60, ease: 'none' }, V + 210)
    .to(E, { pluie: 1, duration: 40, ease: 'traine' }, V + 240)
    .to(E, { etape: 3, duration: 60, ease: 'none' }, V + 310)
    .to(E, { brut: 1, duration: 30, ease: 'none' }, V + 310)
    .to(E, { dlss: 1, duration: 60, ease: 'none' }, V + 410)
    .set(E, { brut: 0, dlss: 0 }, V + 472);

  tl.set('#passes', { visibility: 'visible' }, V + 10)
    .fromTo('#passes', { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 25, ease: 'traine' }, V + 10)
    .set('#t-rendu', { visibility: 'visible' }, V + 480)
    .fromTo('#t-rendu .image-cadre', { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 12, ease: 'traine', stagger: 4 }, V + 480)
    .fromTo('#t-rendu .texte-beat', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 30, ease: 'traine' }, V + 505)
    .to(['#t-rendu', '#passes'], { opacity: 0, duration: 20, ease: 'none' }, V + 565)
    .set(['#t-rendu', '#passes'], { visibility: 'hidden' }, F)
    .to(E, { noir: 1, duration: 30, ease: 'masse' }, V + 570);

  // ------------------------------------------------------------------------
  // Beat 13 : la fiche technique monte comme un générique de fin. Derrière, la
  // carte allumée tourne lentement, à peine éclairée.
  // ------------------------------------------------------------------------
  tl.set(E, { ville: 0, etape: -1, lune: 0, neonsVille: 0, pluie: 0, neon: 0.7, aretes: 1, aretesIntensite: 0.6, atelier: 0.25, env: 0.4 }, F);
  tl.set(E.cam, { x: 0, y: 30, z: 820, cx: 0, cy: 0, cz: 0, fov: 30 }, F);
  tl.to(E, { noir: 0.82, duration: 30, ease: 'traine' }, F)
    .fromTo(E, { tourne: 0 }, { tourne: -0.9, duration: 300, ease: 'none' }, F);
  const generique = document.querySelector('.generique');
  tl.set('#t-fiche', { visibility: 'visible' }, F)
    .fromTo(generique, { xPercent: -50, y: () => innerHeight }, { xPercent: -50, y: () => -generique.offsetHeight - 40, duration: 290, ease: 'none' }, F + 5)
    .set('#t-fiche', { visibility: 'hidden' }, Z);

  // les chiffres roulent une fois, quand leur ligne entre dans l'écran
  const lignes = [...generique.querySelectorAll('tbody tr')];
  lignes.forEach((tr, i) => {
    const nombres = [];
    for (const td of tr.querySelectorAll('td')) {
      for (const n of [...td.childNodes]) {
        if (n.nodeType === 3 && /\d/.test(n.textContent)) {
          const s = document.createElement('span');
          s.textContent = n.textContent;
          n.replaceWith(s);
          nombres.push(s);
        }
      }
    }
    for (const s of nombres) {
      if (reduit) continue;
      tl.to(s, { duration: 14, ease: 'none', scrambleText: { text: s.textContent, chars: '0123456789', revealDelay: 0.4, speed: 0.8 } }, F + 40 + i * 13);
    }
    tl.fromTo(tr.querySelectorAll('.barre'), { scaleX: 0, transformOrigin: 'right center' }, { scaleX: 1, duration: 18, ease: 'masse' }, F + 40 + i * 13);
  });

  // ------------------------------------------------------------------------
  // Beat 14 : le footer, puis tout s'éteint pixel par pixel. Le son se referme
  // dans le boîtier, comme au début.
  // ------------------------------------------------------------------------
  tl.set('#t-fin', { visibility: 'visible' }, Z)
    .fromTo('#t-fin .fin-ligne', { opacity: 0 }, { opacity: 1, duration: 15, ease: 'traine', stagger: 8 }, Z + 5)
    .to(E, { neon: 0, aretesIntensite: 0, duration: 50, ease: 'masse' }, Z + 30)
    .to(E, { noir: 1, duration: 40, ease: 'none' }, Z + 60)
    .to(E, { ouverture: 0.15, duration: 80, ease: 'none' }, Z + 100)
    .fromTo(E, { extinction: 0 }, { extinction: 1, duration: 70, ease: 'none' }, Z + 120);

  // État des passes de rendu et des six images (appelé à chaque image).
  const passes = [...document.querySelectorAll('#passes li')];
  const cadres = [...document.querySelectorAll('#t-rendu .image-cadre')];
  let derniere = null;
  let derniereImage = -1;
  return {
    maj(temps) {
      let active = -1;
      if (E.dlss > 0 || (E.etape >= 3 && E.brut === 0 && E.ville > 0.5 && tl.time() > V + 470)) active = 4;
      else if (E.etape > -1) active = Math.min(3, Math.ceil(E.etape - 0.001));
      if (active !== derniere) {
        derniere = active;
        passes.forEach((li, i) => {
          li.classList.toggle('active', i === active);
          li.classList.toggle('faite', active >= 0 && i < active);
        });
      }
      // 6 images à la suite : une calculée, cinq générées (au ralenti, lisible)
      const k = Math.floor(temps * 7) % 6;
      if (k !== derniereImage) {
        derniereImage = k;
        cadres.forEach((c, i) => c.classList.toggle('allumee', i === k));
      }
    },
  };
}
