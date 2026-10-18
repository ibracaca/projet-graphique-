# Refonte 3D : brief pour la session suivante

À coller dans Claude Code, ouvert dans ce dossier :

> Lis REFONTE-3D.md et exécute-le.

---

## 1. La mission

Le site est terminé et validé : un récit au scroll en 4 actes autour de la MSI GeForce RTX 5090 Gaming Trio, sur « Genesis » de Grimes (voir `PROMPT.md`, `DESIGN.md`, `LISEZMOI.md`). Sa mise en scène, son interface, son son et sa chorégraphie sont **validés et ne doivent pas changer**.

Ce qui ne va pas : **les modèles 3D**. L'utilisateur les trouve très mauvais. La carte graphique et la ville cyberpunk du beat 12 doivent devenir **beaucoup plus réalistes, à la limite d'une vidéo** (un film produit filmé en studio, un plan de film en pluie nocturne), tout en restant en temps réel dans le navigateur.

Deux documents détaillent le travail :

| Document | Contenu |
|---|---|
| `docs/08-refonte-carte.md` | La carte : état actuel pièce par pièce, ce qui la trahit, la cible, les techniques, les contrats à respecter. |
| `docs/09-refonte-ville.md` | La ville du beat 12 : même structure. |

Lis aussi, avant de commencer : `CLAUDE.md` (règles fermes), `DESIGN.md` (charte, sections 2, 5 et 7), `docs/02-sortir-du-look-ia.md`, et les photos de `assets/reference/msi/`. Regarde-les vraiment : la fidélité se juge contre elles.

## 2. Règles fermes (rappel de `CLAUDE.md`)

1. **Jamais de tiret cadratin** (U+2014), nulle part : textes, code, commentaires, réponses. Reformuler avec virgule, deux-points, parenthèses.
2. **Pas de logos officiels** MSI ni NVIDIA, pas de texte « GEFORCE RTX » ni de dragon sur les pièces. Les plaques restent lisses ou gravées de motifs abstraits.
3. **Ressources réelles, licences propres** : Poly Haven et ambientCG (CC0), 1k ou 2k, chaque fichier listé dans `CREDITS.md` avec source et licence. Regarder chaque image téléchargée avant de l'utiliser.
4. **Ne rapporter comme fait que ce qui est vérifié dans un vrai navigateur.**
5. **Noir OLED** : le fond reste `#000` pur, pas de grands aplats clairs, brouillard noir.
6. **Néon = dégradé MSI uniquement** (bleu, indigo, violet, rose, tokens dans `src/couleurs.js`), rare sur la carte avant le climax, libre dans la ville.
7. **Git** : un commit par étape validée, message en français, avec la ligne `Co-Authored-By` habituelle.
8. **60 images par seconde sur une RTX 5070** en 2560 × 1440, et le site doit rester fluide de 1366 px à la 4K. La qualité adaptative existe (`src/scene/rendu.js`, `NIVEAUX`) : la prolonger plutôt que la contourner.

## 3. Méthode et points de contrôle

1. **Diagnostic** (sans coder) : ouvre l'atelier `dev/carte.html` (voir section 5), compare chaque vue aux photos, relis `docs/08` et `docs/09`. Rédige un plan court : route technique choisie (voir 4), budget, ordre des pièces. **Arrête-toi pour validation.**
2. **Une pièce témoin** : refais d'abord un seul ventilateur STORMFORCE au niveau final (géométrie, matière, lumière), compare-le en gros plan à `assets/reference/msi/fan.png` et `card-f-1.png`. **Arrête-toi** : c'est là que l'utilisateur valide le niveau de réalisme visé.
3. **La carte complète**, pièce par pièce, puis le rendu (lumière, AO, antialiasing, profondeur de champ). Comparaison côte à côte avec les photos dans l'atelier, à toutes les vues. **Arrête-toi.**
4. **La ville.** **Arrête-toi.**
5. **Non-régression** sur tout le site (section 6), à 1366, 1920, 2560 et 3840 px. **Arrête-toi.**

## 4. Route technique : à décider au point 1

Deux routes possibles. Les deux restent « construites par code », comme le demande `CLAUDE.md`.

**Route A (recommandée pour un rendu proche de la vidéo) : modéliser dans Blender par script Python, exporter en glTF.**
- Blender n'est **pas installé** sur ce PC (vérifié le 18/10/2026). Il est gratuit (blender.org) ; demande à l'utilisateur de l'installer avant de choisir cette route. Il s'utilise en ligne de commande : `blender --background --python script.py`.
- Avantages décisifs : modificateurs Bevel et Subdivision (des arêtes arrondies qui accrochent la lumière, c'est la première source de réalisme), vraies surfaces de pales, baking d'occlusion ambiante, de courbure et de normales haute définition sur des maillages légers, export `.glb` compressé (Draco pour la géométrie, KTX2 pour les textures).
- Les scripts `.py` sont rangés dans `outils/blender/` et versionnés : le modèle reste reproductible et modifiable par code. Le `.glb` va dans `assets/models/`.
- Le chargement passe par `GLTFLoader` (avec `DRACOLoader` et `KTX2Loader` de `three/addons`), et le compteur du démarrage doit compter ses octets (voir `src/main.js`, objet `octets`).

**Route B : rester en Three.js procédural**, mais monter fortement le niveau : `RoundedBoxGeometry`, `ExtrudeGeometry` avec biseaux à plusieurs segments, surfaces paramétriques épaisses pour les pales, textures PBR, occlusion ambiante calculée une fois au chargement. Plus rapide à démarrer, plafond de réalisme plus bas.

Quelle que soit la route, le rendu doit progresser lui aussi (voir `docs/08`, section 4) : c'est la moitié du « look vidéo ».

## 5. Comment le site est construit (l'essentiel à savoir)

Projet Vite en JavaScript simple, Three.js r186, GSAP, Lenis. `LANCER.bat` lance tout ; en développement : `npm run dev` puis `http://localhost:5173`.

- **Une seule scène WebGL** (`src/scene/rendu.js`) : rendu HDR, bloom **sélectif** (seuls les objets `userData.neon = true` brillent ; les autres matériaux sont masqués par `colorWrite = false` pendant la passe des néons), tone mapping `NeutralToneMapping`, ombres PCF mises à jour une fois par image, grain, vignette, griffures, DLSS simulé, vision thermique.
- **L'objet `ETAT`** (`src/scene/plateau.js`) porte tout ce qui bouge (caméra, lumières, progression de chaque effet). Les timelines GSAP des actes (`src/recit/acte1.js` à `acte4.js`) l'animent au scroll ; `plateau.appliquer()` le recopie dans la scène à chaque image.
- **La carte** est dans `src/carte/` (unités : millimètres). **La ville** dans `src/scene/ville.js`.
- **L'éclairage studio** : HDR Poly Haven `studio_small_08` filtré (seules les sources lumineuses sont gardées, murs éteints, `src/scene/environnement.js`), plus des lumières directionnelles et un projecteur rasant (`plateau.js`).

### Outils de vérification déjà en place

| Outil | Usage |
|---|---|
| `dev/carte.html` | Atelier de la carte : vues **calées au pixel** sur les photos MSI (Face, Dos, Côté ports en orthographique ; 3/4 avant et 3/4 arrière par calage de caméra), modes Côte à côte et Superposé, curseurs Éclaté et Matière. Paramètres d'URL : `?vue=face&mode=superpose&eclate=1&matiere=0&plancher=0.06`. |
| `node outils/captures-carte.mjs <dossier> <vues> <params>` | Captures Playwright de l'atelier, sur le vrai GPU. |
| `node outils/captures-site.mjs <dossier> <définitions> <positions en vh>` | Captures du site à des positions de scroll (ex. `1920x1080 400,860,3850`). Affiche les images par seconde et le niveau de qualité. |
| `node outils/sonde.mjs <png> "<code JS>"` | Ouvre le site, allume, exécute du code (accès à `window.salleNoire` : `tl`, `ETAT`, `carte`, `rendu`, `son`, `lenis`), capture. |
| `node outils/planche.mjs <png> <colonnes> <images…>` | Planche contact de plusieurs captures. |
| `node outils/noir.mjs <png>` | Part des pixels strictement noirs (contrôle OLED). |

Mesure de coût (à refaire avant et après) : dans une sonde, `renderer.info.render.calls` et `.triangles` sur une image. Point de départ mesuré le 18/10/2026 : **carte environ 800 appels de dessin et 100 000 triangles par image** (passes bloom et principale comprises : trop d'appels, car chaque petite pièce est un maillage séparé), **ville environ 35 appels et 26 000 triangles**.

## 6. Non-régression : ce qui doit encore marcher à la fin

Positions de scroll (en vh) à capturer avant et après, à comparer :

| vh | Moment | À vérifier |
|---|---|---|
| 0, 130, 210, 330 | Beat 1, faisceau rasant | La lumière ne révèle que des fragments ; 100 % de noir pur hors faisceau au départ (`noir.mjs`). |
| 470, 650, 860 | Beat 2, éclaté filaire | Le passage matière vers filaire par balayage ; les onze pièces s'écartent ; les annotations s'accrochent aux bonnes pièces. |
| 1100, 1200 | Beat 3, le courant | Les pistes lumineuses courent sur la surface du PCB, du connecteur au GPU. |
| 1640, 1720 | Beat 5, le souffle | Les trois rotors tournent, l'air traverse les ailettes. |
| 1880, 2040 | Beat 6, thermique | Vue en coupe à la hauteur du GPU : puce, plaque de base, Core Pipes en section carrée, ailettes. |
| 2250, 2330 | Beat 7, plongée | La caméra plonge sur le die, le microscope prend le relais au même cadrage. |
| 3060, 3300 | Beats 9 et 10 | Pistes mémoire autour du GPU, image qui traverse la carte. |
| 3520, 3720, 3850 | Beat 11, climax | Reconstruction, matière, studio, néons, dégradé sur les arêtes. |
| 4030 à 4520 | Beat 12, la ville | Les cinq passes par tuiles (fil de fer, polygones, ombres, ray tracing, DLSS). |
| 4760, 5100 | Beats 13 et 14 | Carte allumée derrière le générique, extinction. |

Et : Mode film (bouton `[ MODE FILM ]`), retour en arrière du bas jusqu'en haut, version calme (`prefers-reduced-motion`), 60 images par seconde aux quatre définitions.

## 7. Livrables

- Modèles et scripts dans le dépôt, ressources listées dans `CREDITS.md`.
- `DESIGN.md` section 7 et `LISEZMOI.md` mis à jour (où modifier les modèles, comment régénérer le `.glb` si route A).
- Captures avant / après dans `captures/refonte/`, planches de comparaison avec les photos.
- Aucun tiret cadratin : `grep -rn $'\u2014' --exclude-dir=node_modules --exclude-dir=.git .` doit être vide (les binaires, images et audio, peuvent contenir l'octet par hasard : ne compter que les fichiers texte).
