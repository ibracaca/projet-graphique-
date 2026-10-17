import gsap from 'gsap';

// Beat 0, le démarrage (docs/07) : des lignes façon POST de BIOS s'écrivent.
// Chaque « OK » attend la fin d'un vrai chargement ; le compteur suit les octets reçus.

const LIGNES = [
  { cle: 'GPU', valeur: 'GB202' },
  { cle: 'VRAM', valeur: '32 GB GDDR7' },
  { cle: 'BUS', valeur: '512-BIT' },
  { cle: 'POWER', valeur: '16-PIN / 575 W' },
  { cle: 'COOLING', valeur: 'TRI FROZR 4' },
];

// etapes : une promesse par ligne, dans l'ordre de LIGNES.
// progression() : renvoie la part chargée, de 0 à 1.
export function lancerDemarrage({ etapes, progression, reduit }) {
  const ecran = document.getElementById('demarrage');
  const liste = document.getElementById('post');
  const compteur = document.getElementById('compteur');
  const choix = document.getElementById('choix');

  const lignes = LIGNES.map((l) => {
    const li = document.createElement('li');
    li.innerHTML = '<span class="post-cle"></span><span class="post-points"></span><span class="post-valeur"></span><span class="post-etat"></span>';
    liste.append(li);
    const [elCle, elPoints, elValeur, elEtat] = li.children;
    return { ...l, li, elCle, elPoints, elValeur, elEtat };
  });

  // Machine à écrire : le texte arrive caractère par caractère.
  const ecrire = (el, texte, duree) => {
    const o = { n: 0 };
    return gsap.to(o, {
      n: texte.length,
      duration: reduit ? 0 : duree,
      ease: 'none',
      onUpdate: () => (el.textContent = texte.slice(0, Math.round(o.n))),
    });
  };

  const frappe = gsap.timeline({ delay: 0.5 });
  lignes.forEach((l, i) => {
    frappe.add(ecrire(l.elCle, l.cle, 0.12), i * 0.5);
    frappe.add(ecrire(l.elPoints, '.'.repeat(60), 0.22), i * 0.5 + 0.1);
    frappe.add(ecrire(l.elValeur, l.valeur, 0.18), i * 0.5 + 0.28);
    frappe.call(() => attendre(l, etapes[i]), null, i * 0.5 + 0.46);
  });

  // Points de suspension qui tournent tant que la ressource n'est pas prête.
  const attentes = [];
  function attendre(l, promesse) {
    let k = 0;
    const roue = setInterval(() => (l.elEtat.textContent = ['.  ', '.. ', '...'][k++ % 3]), 180);
    attentes.push(
      promesse.then(() => {
        clearInterval(roue);
        l.elEtat.textContent = 'OK';
        l.elEtat.classList.add('ok');
      }),
    );
  }

  // Compteur 000 à 100.
  const affiche = { v: 0 };
  const tick = () => {
    const cible = Math.round(progression() * 100);
    if (cible > affiche.v) affiche.v += Math.max(1, Math.round((cible - affiche.v) * 0.2));
    compteur.textContent = String(Math.min(100, affiche.v)).padStart(3, '0');
  };
  gsap.ticker.add(tick);

  return new Promise((ok) => {
    frappe.then(async () => {
      await Promise.all(attentes);
      // laisse le compteur atteindre 100
      await new Promise((r) => {
        const verif = () => (affiche.v >= 100 ? r() : setTimeout(verif, 50));
        verif();
      });
      gsap.ticker.remove(tick);
      compteur.textContent = '100';
      gsap.set(choix, { visibility: 'visible' });
      gsap.fromTo(
        choix.children,
        { clipPath: 'inset(0 100% 0 0)' },
        { clipPath: 'inset(0 0% 0 0)', duration: 0.6, ease: 'traine', stagger: 0.12 },
      );
      document.getElementById('btn-allumer').focus({ preventScroll: true });

      const choisir = (avecSon) => () => {
        sortir();
        ok(avecSon);
      };
      document.getElementById('btn-allumer').addEventListener('click', choisir(true), { once: true });
      document.getElementById('btn-sans-son').addEventListener('click', choisir(false), { once: true });
    });
  });

  // Sortie : rien ne s'éteint d'un coup sur un OLED, on fond au noir.
  function sortir() {
    const tl = gsap.timeline({ onComplete: () => ecran.remove() });
    tl.to(choix.children, { opacity: 0, duration: 0.25, ease: 'traine', stagger: 0.05 })
      .to(liste.children, { opacity: 0, duration: 0.5, ease: 'traine', stagger: 0.06 }, 0)
      .to(compteur, { opacity: 0, duration: 0.6, ease: 'traine' }, 0.1)
      .to(ecran.querySelector('.demarrage-label'), { opacity: 0, duration: 0.4 }, 0.1)
      .to(ecran, { opacity: 0, duration: 0.8, ease: 'masse' }, 0.45);
  }
}
