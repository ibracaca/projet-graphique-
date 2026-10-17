// Le son du site (docs/06-musique-genesis.md, section 3).
// Chaîne : <audio> -> passe-bas (le scroll l'ouvre pendant l'acte I) -> gain de scène
// (le « silence » du beat 4) -> analyseur (les visuels réagissent) -> gain général
// (bouton son) -> sortie. Les sons d'interface passent à côté du filtre.

const URL_MUSIQUE = new URL('../../assets/audio/genesis.mp3', import.meta.url).href;

export function creerSon() {
  const audio = new Audio();
  audio.preload = 'auto';
  audio.loop = false;

  let ctx = null;
  let filtre;
  let gainScene;
  let analyseur;
  let gainGeneral;
  let gainInterface;
  let frequences;
  let onde;
  let bruit;

  const niveaux = { basses: 0, aigus: 0, volume: 0, temps: false, moyenneBasses: 0 };
  let dernierTemps = 0;

  const etat = {
    pret: false, // le fichier est chargé
    allume: false, // l'AudioContext tourne et la musique joue
    muet: false,
  };

  // Chargement avec progression réelle (octets reçus), pour le compteur du démarrage.
  async function charger(progression) {
    const reponse = await fetch(URL_MUSIQUE);
    const total = Number(reponse.headers.get('content-length')) || 6.2e6;
    const lecteur = reponse.body.getReader();
    const morceaux = [];
    let recu = 0;
    for (;;) {
      const { done, value } = await lecteur.read();
      if (done) break;
      morceaux.push(value);
      recu += value.length;
      progression?.(recu, total);
    }
    audio.src = URL.createObjectURL(new Blob(morceaux, { type: 'audio/mpeg' }));
    await new Promise((ok) => {
      if (audio.readyState >= 3) ok();
      else audio.addEventListener('canplaythrough', ok, { once: true });
      audio.load();
    });
    etat.pret = true;
  }

  function construireGraphe() {
    ctx = new AudioContext();
    const source = ctx.createMediaElementSource(audio);
    filtre = ctx.createBiquadFilter();
    filtre.type = 'lowpass';
    filtre.frequency.value = 350;
    filtre.Q.value = 0.7;
    gainScene = ctx.createGain();
    analyseur = ctx.createAnalyser();
    analyseur.fftSize = 2048;
    analyseur.smoothingTimeConstant = 0.6;
    gainGeneral = ctx.createGain();
    gainInterface = ctx.createGain();
    gainInterface.gain.value = 1;
    source.connect(filtre).connect(gainScene).connect(analyseur).connect(gainGeneral).connect(ctx.destination);
    gainInterface.connect(gainGeneral);
    frequences = new Uint8Array(analyseur.frequencyBinCount);
    onde = new Uint8Array(analyseur.fftSize);
    // tampon de bruit blanc pour les sons d'interface
    bruit = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = bruit.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  // À appeler dans un geste du visiteur (clic) : les navigateurs l'exigent.
  async function allumer({ muet = false } = {}) {
    if (!ctx) construireGraphe();
    await ctx.resume();
    etat.muet = muet;
    gainGeneral.gain.value = muet ? 0 : 1;
    if (audio.paused) await audio.play();
    etat.allume = true;
  }

  function basculerMuet() {
    if (!ctx) return;
    etat.muet = !etat.muet;
    gainGeneral.gain.setTargetAtTime(etat.muet ? 0 : 1, ctx.currentTime, 0.08);
  }

  // Ouverture du filtre (Hz), lissée pour éviter les craquements.
  function coupure(hz) {
    if (!ctx) return;
    filtre.frequency.setTargetAtTime(Math.min(20000, Math.max(60, hz)), ctx.currentTime, 0.06);
  }

  function gainDeScene(g, duree = 0.4) {
    if (!ctx) return;
    gainScene.gain.setTargetAtTime(g, ctx.currentTime, duree / 3);
  }

  // Lecture de l'analyseur, valeurs lissées (moyenne glissante d'environ 150 ms).
  function analyser(dt) {
    if (!ctx || !etat.allume) {
      niveaux.basses *= 0.9;
      niveaux.aigus *= 0.9;
      niveaux.temps = false;
      return niveaux;
    }
    analyseur.getByteFrequencyData(frequences);
    const hz = ctx.sampleRate / analyseur.fftSize;
    const bande = (a, b) => {
      let s = 0;
      const i0 = Math.max(1, Math.floor(a / hz));
      const i1 = Math.min(frequences.length - 1, Math.floor(b / hz));
      for (let i = i0; i <= i1; i++) s += frequences[i];
      return s / ((i1 - i0 + 1) * 255);
    };
    const basses = bande(20, 150);
    const aigus = bande(4000, 11000);
    const k = 1 - Math.exp(-dt / 0.15);
    niveaux.basses += (basses - niveaux.basses) * k;
    niveaux.aigus += (Math.min(1, aigus * 3) - niveaux.aigus) * k;
    niveaux.volume = basses;
    // détection des temps : pic de basses au-dessus de la moyenne récente
    niveaux.moyenneBasses += (basses - niveaux.moyenneBasses) * (1 - Math.exp(-dt / 1.2));
    const maintenant = ctx.currentTime;
    niveaux.temps = basses > niveaux.moyenneBasses * 1.18 && basses > 0.25 && maintenant - dernierTemps > 0.4;
    if (niveaux.temps) dernierTemps = maintenant;
    return niveaux;
  }

  function formeOnde() {
    if (!ctx) return null;
    analyseur.getByteTimeDomainData(onde);
    return onde;
  }

  // --- Sons d'interface, synthétisés, très discrets ------------------------
  function impulsion({ duree, freqDebut, freqFin, q, volume }) {
    if (!ctx || etat.muet) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = bruit;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = q;
    bp.frequency.setValueAtTime(freqDebut, t);
    bp.frequency.exponentialRampToValueAtTime(freqFin, t + duree);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + Math.min(0.004, duree / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    src.connect(bp).connect(g).connect(gainInterface);
    src.start(t);
    src.stop(t + duree + 0.02);
  }

  // Clic de relais : 25 ms de bruit filtré autour de 3 kHz.
  const clic = () => impulsion({ duree: 0.025, freqDebut: 3200, freqFin: 2600, q: 3, volume: 0.06 });
  // Souffle court : bruit qui glisse de 700 Hz à 2,4 kHz.
  const souffle = () => impulsion({ duree: 0.28, freqDebut: 700, freqFin: 2400, q: 1.2, volume: 0.04 });
  // Obturateur d'une caméra thermique : deux claquements secs, 45 ms d'écart.
  const obturateur = () => {
    impulsion({ duree: 0.018, freqDebut: 1900, freqFin: 1300, q: 2.5, volume: 0.08 });
    setTimeout(() => impulsion({ duree: 0.012, freqDebut: 4200, freqFin: 3000, q: 3, volume: 0.05 }), 45);
  };

  return {
    audio,
    etat,
    charger,
    allumer,
    basculerMuet,
    coupure,
    gainDeScene,
    analyser,
    formeOnde,
    clic,
    souffle,
    obturateur,
    temps: () => audio.currentTime,
    // pour vérifier la chaîne : fréquence de coupure actuelle et gain de scène
    mesures: () => (ctx ? { coupure: Math.round(filtre.frequency.value), gainScene: gainScene.gain.value, contexte: ctx.state, lecture: !audio.paused } : null),
  };
}
