import gsap from 'gsap';

// Curseur réticule (DESIGN.md, 6.2) : il suit la souris avec un léger retard,
// se rétracte en coins chanfreinés sur les boutons, et rend les boutons magnétiques.

export function creerCurseur({ son, reduit }) {
  const curseur = document.getElementById('curseur');
  const num = document.getElementById('curseur-num');
  const allerX = gsap.quickTo(curseur, 'x', { duration: reduit ? 0.01 : 0.12, ease: 'curseur' });
  const allerY = gsap.quickTo(curseur, 'y', { duration: reduit ? 0.01 : 0.12, ease: 'curseur' });
  let visible = false;

  addEventListener('pointermove', (e) => {
    if (!visible) {
      visible = true;
      gsap.set(curseur, { x: e.clientX, y: e.clientY });
      gsap.to(curseur, { opacity: 1, duration: 0.3, ease: 'traine' });
    }
    allerX(e.clientX);
    allerY(e.clientY);
    const cible = e.target.closest?.('[data-curseur]');
    curseur.classList.toggle('sur-bouton', cible?.dataset.curseur === 'bouton');
  });
  document.addEventListener('pointerleave', () => {
    visible = false;
    gsap.to(curseur, { opacity: 0, duration: 0.2 });
  });

  // Boutons magnétiques : attraction de 6 px au plus, retour lourd.
  for (const b of document.querySelectorAll('button[data-curseur="bouton"]')) {
    const bx = gsap.quickTo(b, 'x', { duration: 0.3, ease: 'masse' });
    const by = gsap.quickTo(b, 'y', { duration: 0.3, ease: 'masse' });
    b.addEventListener('pointermove', (e) => {
      if (reduit) return;
      const r = b.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      bx(dx * 6);
      by(dy * 4);
    });
    b.addEventListener('pointerleave', () => {
      bx(0);
      by(0);
    });
    b.addEventListener('pointerdown', () => gsap.to(b, { scale: 0.97, duration: 0.12, ease: 'traine' }));
    b.addEventListener('pointerup', () => gsap.to(b, { scale: 1, duration: 0.3, ease: 'masse' }));
    b.addEventListener('click', () => son.clic());
  }

  return {
    masquer(oui) {
      gsap.to(curseur, { opacity: oui ? 0 : 1, duration: 0.3 });
    },
    // numéro de la pièce survolée en vue éclatée
    numero(texte) {
      num.textContent = texte || '';
    },
  };
}
