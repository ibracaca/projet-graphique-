# DESIGN.md : charte « Salle noire »

Site concept non officiel autour de la MSI GeForce RTX 5090 32G Gaming Trio OC, sur « Genesis » de Grimes.
Version 1, 17 octobre 2026. À valider avant toute ligne de code.

**L'idée en une phrase** : dans le noir total, une carte graphique naît de la lumière ; on la découvre par fragments, on la démonte, on entre dans sa puce, puis elle se reconstruit et s'allume, inondée du dégradé MSI.

**Le fil rouge** : la lumière. Elle est d'abord un faisceau qui cherche (acte I), puis un courant qui circule (acte II), puis un signal qui calcule (acte III), enfin un éclairage qui révèle tout (acte IV). L'œil suit toujours une seule source lumineuse.

---

## 1. Ce que j'ai relevé sur la vraie carte

Photos regardées une par une (liste dans `CREDITS.md`, dossier `assets/reference/msi/`) : face, dos, profil trois quarts, côté ports, tranche du dessus, PCB nu, radiateur nu, backplate nu, ventilateur, Core Pipes, plaque de base.

Ce qui fait l'identité visuelle de la Gaming Trio, et que le site reprend :

| Observation sur les photos | Ce que le site en fait |
|---|---|
| Coque gris anthracite mat, taillée en facettes planes, avec un coin coupé net à chaque extrémité. Un **coin gauche** sur le trapèze du bas, un **pan coupé** à droite. | Le **chanfrein** est la forme signature de l'interface : boutons, cadres, rail et curseur ont des angles coupés, jamais arrondis. |
| Un **coin sombre brillant** (trapèze en verre fumé) traverse la face en diagonale entre les ventilateurs. | Les blocs de texte importants reposent sur un aplat noir avec un seul bord biseauté, comme ce coin. |
| **Trois barres lumineuses obliques « /// »** au-dessus du ventilateur central, trois autres en dessous. Le dégradé y va du bleu (bout extérieur) au rose (bout tourné vers le centre). | Motif des **griffures** : toujours par trois, toujours parallèles, à l'angle de ces barres. C'est la seule « forme » lumineuse du site avant le climax. |
| Backplate en deux tons séparés par **une diagonale** (alu brossé à gauche, métal lisse à droite), avec une grande **fenêtre ajourée** à droite sur le radiateur (le PCB s'arrête avant, l'air traverse). | La diagonale du backplate donne **l'angle signature** de la mise en page, environ **32°** (à remesurer sur le modèle 3D). La fenêtre ajourée est le point de sortie du flux d'air au beat 5. |
| Ventilateur à **7 pales** larges en faucille, anneau extérieur fermé, moyeu rond. | Modélisé tel quel. Le moyeu reste un disque lisse, sans dragon. |
| **9 Core Pipes** à section carrée posés côte à côte sur la plaque de base, qui partent ensuite en caloducs ronds dans les ailettes. | Pièce vedette du beat 6. |
| Radiateur : ailettes fines en vagues (Wave Curved 4.0), découpes en V (Air Antegrade Fin 2.0), embouts de caloducs ronds qui dépassent à droite. | Ailettes en instances (une seule géométrie répétée), embouts visibles en vue éclatée. |
| PCB court : GPU carré au centre, modules mémoire autour, connecteur 16 broches en haut à droite, équerre argent avec 3 DisplayPort et 1 HDMI à gauche. | Plan du beat 3 (le courant entre par le 16 broches) et des beats 8 et 9. |
| Écusson lumineux au bout droit (bague RGB autour d'un logo). | On garde la bague lumineuse, le logo est remplacé par une plaque lisse gravée « 5090 » dans notre police. |

Dimensions officielles : **359 × 149 × 70 mm** (fiche MSI). Proportions relevées sur la vue de face (photo `produit-2`) : chaque ventilateur occupe environ 0,30 de la longueur, le moyeu environ un quart du diamètre du ventilateur. Ces mesures seront affinées au point de contrôle 2.

---

## 2. Palette

Tout est monochrome, sauf le dégradé MSI. Les tokens sont en `oklch`.

### 2.1 Neutres (noir OLED, métal)

Gris très légèrement froids (teinte 260, chroma minuscule), relevés sur l'acier de l'équerre et l'alu brossé du backplate.

| Token | Valeur | Rôle |
|---|---|---|
| `--noir` | `oklch(0 0 0)` (`#000`) | Fond partout. Pixels OLED éteints. |
| `--graphite` | `oklch(0.30 0.005 260)` | Filets inactifs, graduations, grille de fond. Jamais en aplat. |
| `--acier` | `oklch(0.52 0.006 260)` | Labels HUD secondaires, unités. |
| `--alu` | `oklch(0.74 0.005 260)` | Texte courant. |
| `--blanc` | `oklch(0.91 0.003 260)` (≈ `#e3e4e6`) | Titres et chiffres vedettes. **Jamais de `#fff`** (black smear). |

### 2.2 Le dégradé MSI, en néon

Teintes mesurées pixel par pixel sur les barres RGB des photos MSI (`card-f-1.png`, `vga_body-1.png`), puis converties en oklch. Les photos sont un peu ternies par le rendu ; les tokens poussent la chroma de 10 à 15 % pour se comporter comme de vraies LED sur le noir.

| Token | Mesuré sur la photo | Valeur retenue | Rôle |
|---|---|---|---|
| `--msi-bleu` | `#4B9BD5`, oklch(0.66 0.12 243) | `oklch(0.70 0.14 245)` | Bout froid du dégradé. |
| `--msi-indigo` | `#7E74E7`, oklch(0.62 0.17 284) | `oklch(0.63 0.19 284)` | Passage bleu vers violet. |
| `--msi-violet` | `#9C51D2`, oklch(0.58 0.20 308) | `oklch(0.60 0.22 308)` | Cœur du dégradé. |
| `--msi-rose` | `#D155E2`, oklch(0.66 0.23 323) | `oklch(0.67 0.25 328)` | Bout chaud. |
| `--msi-incandescent` | (extrapolé) | `oklch(0.95 0.04 330)` | Uniquement pour le « brûlant » de la vision thermique et le cœur des tubes LED. |

**Sens du dégradé** : sur la carte, chaque barre va du bleu (côté bord de la carte) au rose (côté centre). Le site garde cette logique : **le bleu est à l'extérieur, le rose est au cœur**. Une griffure s'allume du bleu vers le rose ; le courant du beat 3 arrive bleu et devient rose en atteignant la puce.

Le dégradé est interpolé **en oklch** (pas en sRGB, qui grise le milieu) : `linear-gradient(in oklch, ...)` en CSS, et la même interpolation dans les shaders.

### 2.3 Rampe thermique (beat 6)

Construite avec les mêmes tokens, dans l'ordre physique : `--noir` (ambiant) → `--msi-bleu` (froid) → `--msi-violet` → `--msi-rose` (chaud) → `--msi-incandescent` (brûlant). Appliquée en shader sur la luminance d'une carte de chaleur, comme une vraie caméra infrarouge en palette « fer chaud », mais aux couleurs MSI.

### 2.4 Règles d'usage du néon

- **Actes I à III** : le néon couvre moins de 2 % des pixels à l'écran. Il n'existe qu'en filets de 1 à 2 px, dans les griffures, la barre lumineuse de la carte et le segment actif du rail.
- **Beat 6** : seule exception avant le climax, parce que la vision thermique est une mesure, pas une décoration.
- **Beat 11** : le dégradé coule le long des arêtes de la carte reconstruite.
- **Beat 12** : la ville, seul endroit où il déborde.
- Jamais de cyan, de vert néon, de dégradé en fond, de halo flou décoratif.

---

## 3. Typographie

### 3.1 Le couple

- **Archivo** (Omnibus-Type, licence OFL, variable : largeur `wdth` de 62 à 125, graisse `wght` de 100 à 900, vérifié sur l'API Fontsource) pour les titres et les grands chiffres.
- **Martian Mono** (Evil Martians, licence OFL, variable : `wdth` de 75 à 112,5, `wght` de 100 à 800) pour les labels HUD, les unités et les compteurs.

Toutes deux auto-hébergées via Fontsource (paquets npm `@fontsource-variable/archivo` et `@fontsource-variable/martian-mono`), aucune requête vers Google Fonts.

**Pourquoi ce couple, pour ce sujet** :
- Les marquages gravés sur les pièces usinées (équerres, plaques, châssis de serveurs) sont des grotesques larges en capitales. Archivo en largeur 125 a exactement cette carrure de gravure laser, et reste lisible en français avec ses accents.
- L'**axe de largeur d'Archivo raconte la charge électrique** : 62 (condensé, comprimé) au beat 4 « Charge faible », 125 (étiré) à « 575 W » et au climax. Aucune autre grotesque gratuite n'offre un écart aussi grand sur un seul axe : c'est ce qui rend l'effet visible.
- Martian Mono est une mono **large**, aux formes carrées, dessinée pour les interfaces de données. Son axe de largeur sert à **épaissir et élargir les chiffres avec la puissance** (RPM, MHz, °), sans changer de police.
- Ni Inter, ni Space Grotesk, ni JetBrains Mono, ni Orbitron.

### 3.2 Rôles

| Rôle | Police | Réglages |
|---|---|---|
| Titre de beat (« Vue éclatée. ») | Archivo | `wdth 125`, `wght 300`, capitales et minuscules, interlettrage -0,02 em |
| Grand chiffre (« 575 W », « 4,17 ms ») | Archivo | `wdth` et `wght` pilotés par la donnée, chiffres tabulaires |
| Texte courant (1 à 2 phrases) | Archivo | `wdth 100`, `wght 380`, interligne 1,45 |
| Label HUD (« [ 05 / AIRFLOW ] ») | Martian Mono | `wdth 100`, `wght 400`, capitales, interlettrage +0,06 em, opacité 60 % |
| Données vivantes (RPM, chrono) | Martian Mono | `wdth` et `wght` pilotés par la donnée, chiffres tabulaires |

La mono n'est utilisée **que** pour ce qui est mesuré ou adressé (chiffres, unités, numéros de pièces, labels système). Jamais pour une phrase.

### 3.3 Échelle

Rapport 1,5 entre les niveaux (quinte), pour un contraste net entre les minuscules labels et les titres. Valeurs fluides `clamp()` sur la largeur de fenêtre, calées pour 1366, 1920, 2560 et 3840 px.

| Token | 1366 px | 1920 px | 3840 px |
|---|---|---|---|
| `--fs-hud` | 10 px | 11 px | 16 px |
| `--fs-texte` | 15 px | 17 px | 26 px |
| `--fs-lead` | 22 px | 26 px | 40 px |
| `--fs-titre` | 44 px | 60 px | 110 px |
| `--fs-display` | 140 px | 200 px | 380 px |

Sur ultrawide (21:9, 32:9), la typographie suit la **hauteur** de l'écran et non la largeur, pour ne pas gonfler démesurément.

---

## 4. Mouvement

### 4.1 Personnalité

**Précise, lourde, feutrée.** Une machine de grande valeur : elle ne rebondit jamais, elle s'installe. Zéro dépassement (overshoot 0 %). Les pièces ont de l'inertie ; les lumières ont de la **traîne** (elles s'éteignent trois fois plus lentement qu'elles ne s'allument, comme un phosphore).

Règle d'or : **rien n'apparaît, tout s'allume.** Aucun élément ne « fade-in » depuis le vide : il est révélé par une lumière (faisceau, balayage, courant, griffure).

### 4.2 Les trois courbes signatures

Créées avec GSAP CustomEase. Tout le site n'utilise que celles-ci (plus `none` pour ce qui est piloté linéairement par le scroll ou par la musique).

| Nom | Courbe | Caractère | Usage |
|---|---|---|---|
| `masse` | `0.33, 0, 0, 1` | Départ retenu (l'inertie), puis long freinage de précision. | Tout ce qui a du poids : pièces 3D, caméra, panneaux. |
| `traine` | `0.19, 1, 0.22, 1` | Démarrage instantané, arrivée très longue. Une lumière qui s'allume puis s'installe. | Lumières, révélations de texte, retours d'interface (avec durée courte). |
| `coupe` | `0.76, 0, 0.24, 1` | Accélération franche, freinage franc. Un rideau, une lame. | Griffures entre actes, bascules d'état (vision thermique). |

### 4.3 Durées

| Usage | Durée |
|---|---|
| Survol, pression | 150 ms (`traine`) |
| Retour d'action (bouton, curseur qui change) | 240 à 300 ms |
| Texte qui se stabilise | moins de 700 ms : ce qui doit être lu est lisible en moins d'une seconde |
| Griffure entre actes | 1,4 s équivalent scroll |
| Séquences de motion design | libres, pilotées par le scroll (scrub) |

### 4.4 Les quatre couches

1. **Ambiance** : grain de capteur (voir 6.3), poussière dans le faisceau (beat 1), légère respiration de la lumière sur les basses de la musique.
2. **Réponse** : curseur réticule, boutons magnétiques (attraction de 6 px maximum, retour en `masse`), sons d'interface.
3. **Récit** : le scroll est la tête de lecture (ScrollTrigger `scrub` lissé à 1,2 s, Lenis pour l'inertie de la molette).
4. **Transition** : une griffure triple par passage d'acte, en raccord de forme (voir 5.3).

**Une seule vedette à la fois** : quand la 3D bouge fort, le texte est immobile, et inversement.

### 4.5 Version calme (`prefers-reduced-motion`)

Mêmes contenus, mêmes images clés. Les mouvements de caméra deviennent des fondus enchaînés entre plans fixes, les griffures deviennent des fondus au noir de 400 ms, le décodage de texte est remplacé par un affichage direct, ventilateurs et particules ralentis à 20 %. Le bouton Mode film est masqué.

---

## 5. Le récit : 15 beats en 4 actes

### 5.1 Calage musical

Tempo mesuré dans `docs/06` : 83 BPM, soit un temps toutes les 0,7229 s, premier temps à 1,37 s. Chaque début de beat est calé sur le temps le plus proche de la cue sheet (formule `1,37 + 0,7229 × n`). J'ai relu la courbe `genesis-energie.csv` et je propose **deux retouches** :

- **Le silence (beat 4)** : la cue sheet le place à 1:16, sur les basses pleines. Or la courbe montre un vrai creux des basses entre 1:22 et 1:26 (basses de 0,96 à 0,48) puis leur retour à 1:28. Je cale donc le silence à **1:21,6** et l'éveil des ventilateurs à **1:26,7**, juste avant le retour des basses : les ventilateurs démarrent avec elles.
- **Le sommet (beat 11)** : l'énergie atteint 0,98 à 2:50. Je cale l'allumage du dégradé à **2:48,4**, avec la reconstruction qui commence dans le creux d'avant (2:31,7).

### 5.2 Table des beats

Durée de scroll en hauteurs d'écran (`vh`). Total : environ 54 écrans, soit 4 à 6 minutes de lecture libre, et 4 min 17 s en Mode film.

| # | Beat | Temps musical | Scroll | Comment il entre (jamais deux fois pareil) |
|---|---|---|---|---|
| | **Acte I, l'objet** | | | |
| 0 | Démarrage | 0:00 | écran fixe | Lignes POST tapées caractère par caractère, chaque « OK » correspond à un vrai chargement terminé (HDR, textures, audio). Compteur `000` à `100` = octets réellement chargés. |
| 1 | L'ombre | 0:15,8 | 400 | **Révélation par la lumière** : un faisceau rasant balaie la carte, seules les arêtes touchées existent. Le nom se décode lettre par lettre avec un jeu de caractères tiré du sujet (`0-9 A-F` hexadécimal). |
| 2 | L'éclaté | 0:33,2 | 500 | **Démontage** : les pièces filaires s'écartent sur l'axe de profondeur, une par une, avec du poids. Lignes d'annotation qui se tracent (trim path), numéros `01` à `11`. |
| | *Griffure I → II* | 1:03,5 | | |
| | **Acte II, l'énergie** | | | |
| 3 | Le courant | 1:03,5 | 350 | **Par la donnée** : un fleuve de particules entre par le 16 broches, bleu à l'entrée, rose en arrivant à la puce. « 575 W » s'élargit (`wdth` 62 à 125) au rythme du flux. |
| 4 | Le silence | 1:21,6 | 120 | **Par soustraction** : tout ralentit, le titre se comprime (`wdth` 62, `wght` 200), la musique baisse à 25 % pendant 2 s. |
| 5 | Le souffle | 1:26,7 | 300 | **Par la rotation** : les trois ventilateurs démarrent l'un après l'autre (décalage d'un temps musical), lignes de flux d'air qui traversent le radiateur et ressortent par la fenêtre du backplate. Régime en % qui monte. |
| 6 | Vision thermique | 1:39,0 | 350 | **Par bascule d'instrument** : une ligne de balayage horizontale passe et convertit l'image en caméra infrarouge, avec le petit « clac » d'un obturateur de caméra thermique. La puce chauffe, puis les Core Pipes évacuent. |
| | *Griffure II → III* | 1:52,0 | | |
| | **Acte III, l'intérieur** | | | |
| 7 | Puissances de dix | 1:52,0 | 500 | **Par l'échelle** : zoom continu, les paliers de texte se remplacent par raccord d'échelle ; règle graduée qui défile en direct (`10⁻¹ m` à `10⁻⁸ m`). |
| 8 | La puce | 2:13,7 | 300 | **Par la grille** : les 170 SM s'allument par vagues, sur les temps détectés de la musique. Le titre compte jusqu'à 21 760. |
| 9 | La mémoire | 2:31,7 | 250 | **Par le tracé** : 16 autoroutes de données se dessinent entre les modules et la puce, des paquets lumineux y circulent. |
| 10 | 4,17 ms | 2:39,7 | 250 | **Par le chronomètre** : une image traverse la carte, les six étapes s'allument en séquence, le chrono en mono compte de `0,00` à `4,17`. |
| | *Griffure III → IV* | 2:48,4 | | |
| | **Acte IV, le réveil** | | | |
| 11 | Reconstruction et allumage | 2:48,4 | 600 | **Par l'assemblage** : les pièces reviennent en place (inverse lourd du beat 2), la matière se remplit par balayage, la lumière de studio s'allume, puis le dégradé coule le long des arêtes. Pièce maîtresse. |
| 12 | Le rendu qui se calcule | 3:12,2 | 600 | **Par passes de rendu** : la ville se calcule par tuiles, comme un moteur de rendu (fil de fer, polygones, ombres, ray tracing, puis images générées). |
| 13 | Fiche technique | 3:36,1 | 300 | **Par le générique** : les lignes du tableau montent comme un générique de fin de film, chiffres qui roulent. |
| 14 | Footer | 4:07,9 | 200 | **Par l'extinction** : tout s'éteint pixel par pixel (tramage ordonné) jusqu'au noir OLED total. |

**Ajouts de construction (acte II).** Pendant l'acte II, la carte est en vue « semi-éclatée » : les couches restent séparées en profondeur pour qu'on voie le courant, l'air et la chaleur les traverser, et la vraie reconstruction reste la pièce maîtresse du beat 11. La vision thermique (beat 6) est une **vue en coupe** à hauteur de la puce, regardée d'en haut, comme un plan de coupe d'ingénieur : on y lit la puce, la plaque de base, la rangée des Core Pipes en section carrée et les ailettes.

### 5.3 Les griffures (transitions entre actes)

Trois entailles lumineuses parallèles, nettes, à l'angle signature, qui traversent l'écran en `coupe`. Elles reprennent les trois barres « /// » de la carte : ce n'est pas un effet ajouté, c'est la carte qui signe la transition. Chaque griffure est un **raccord de forme** : la dernière forme lumineuse de l'acte (le faisceau, le flux, le signal) se tend en lame et ouvre l'acte suivant. Elles sont dessinées en shader plein écran (pas en image), avec une traîne de phosphore.

### 5.4 Les quatre lumières

| Acte | Lumière | Matière de la carte |
|---|---|---|
| I | Faisceau rasant unique, puis lumière d'atelier faible | Filaire lumineux (arêtes en `--alu`) |
| II | Le courant lui-même éclaire de l'intérieur | Filaire, puis matière qui se remplit pièce par pièce |
| III | Lumière émise par la puce (on est dedans) | Gros plans procéduraux (grille SM, modules) |
| IV | Studio complet (HDR Poly Haven), puis néons MSI | Matière réelle : métal anthracite, alu brossé, PCB, cuivre nickelé |

Passage filaire vers matière : un **balayage lumineux** traverse chaque pièce ; derrière lui, la matière est remplie ; sur son front, une fine ligne incandescente. Réalisé par un shader commun à toutes les pièces (un uniform de progression par pièce).

---

## 6. Interface

### 6.1 Éléments permanents

- **Réticules « + » aux quatre coins** de l'écran. Ils ont une fonction : ce sont les marques de cadrage de la caméra. Au beat 1, ils se resserrent sur la carte (mise au point) ; en bas à droite, la position de la caméra s'affiche en millimètres (`CAM X 0182 Y -040 Z 0610`).
- **Rail de progression vertical**, à gauche : 4 segments (les actes), séparés par des encoches à l'angle signature. Le segment de l'acte en cours est un filet du dégradé MSI qui se remplit avec le scroll. Le reste en `--graphite`. Survol : le nom de l'acte en mono ; clic : saut à l'acte.
- **Bouton son**, en bas à gauche, toujours visible : « [ SON : ON ] » / « [ SON : OFF ] », avec un mini oscilloscope de 40 px qui trace le signal réel.
- **Bouton Mode film**, à côté : « [ MODE FILM ] ».
- **Mention** discrète dans le footer : « Concept non officiel, sans lien avec MSI ni NVIDIA. »

### 6.2 Curseur réticule

Croix fine de 24 px avec un point central, qui suit la souris avec retard (`0.20, 0, 0.10, 1`, 120 ms). Il s'adapte :
- sur une pièce 3D (vue éclatée) : les branches s'écartent en crochets autour de la pièce et affichent son numéro ;
- sur un bouton : il se rétracte en quatre coins chanfreinés qui encadrent le bouton ;
- sur du texte : il devient une barre fine verticale ;
- pendant le Mode film : il disparaît.

### 6.3 Formes

- **Aucun arrondi** dans tout le site. Les cadres et boutons ont un **chanfrein** à 45° sur un ou deux coins (celui de la coque de la carte), en SVG ou `clip-path`.
- Les filets font 1 px (2 px physiques sur écran HiDPI au maximum).
- Lignes d'annotation : un segment oblique à l'angle signature, puis un segment horizontal, terminé par un point de 3 px. Comme une cote sur un plan technique.

### 6.4 Grain et post-traitement

- **Grain de capteur**, pas de « grain de film » décoratif : son intensité dépend de la lumière de la scène, fort dans le noir du beat 1 (on pousse la sensibilité), quasi nul en studio au beat 11.
- **Bloom sélectif** : seuls les objets marqués « néon » (barres RGB, griffures, courant, filaments thermiques) passent dans le bloom ; le métal reste net.
- **Aberration chromatique** sur les bords de l'écran **uniquement** pendant la plongée dans la puce (beats 7 et 8).
- Vignettage léger, aucune autre correction de couleur sur la 3D.

---

## 7. La carte 3D (construite par code)

Unité : 1 unité Three.js = 1 mm. Chaque pièce est un objet séparé avec une position assemblée, une position éclatée et deux états (filaire lumineux, matière réelle).

| N° | Pièce | Construction |
|---|---|---|
| 01 | Coque | Formes 2D extrudées avec biseaux : grand panneau à facettes, coin sombre en verre fumé, pans coupés aux extrémités. |
| 02 | STORMFORCE ×3 | 7 pales en faucille (surface paramétrique), anneau extérieur fermé, moyeu lisse. Instances. |
| 03 | TRI FROZR 4 | Ailettes fines en instances (des centaines, une seule géométrie), profil ondulé dans le shader de sommets. |
| 04 | Core Pipes | 9 barres à section carrée sur la plaque de base, puis tubes ronds courbés (`TubeGeometry`) vers les ailettes, embouts ronds qui dépassent. |
| 05 | Plaque de base | Bloc nickelé usiné, vis aux coins. |
| 06 | PCB | Plaque noire mate, contacts PCIe dorés. |
| 07 | GPU GB202 | Substrat et die au centre du PCB. |
| 08 | GDDR7 | 16 modules autour du GPU. |
| 09 | Connecteur 16 broches | Bloc à 12 + 4 broches en haut à droite du PCB. |
| 10 | Backplate | Deux tons séparés par la diagonale, fenêtre ajourée à barres obliques (sans dragon). |
| 11 | Sorties | Équerre argent ajourée, 3 DisplayPort, 1 HDMI. |
| | Zones RGB | Barres « /// » haut et bas, bague de l'écusson, liseré du dessus. Matériau émissif marqué « néon ». |

Matières : environnement HDR de studio Poly Haven (CC0, 2k), textures ambientCG ou Poly Haven (CC0) pour l'alu brossé et le métal, normal map procédurale pour le PCB. Les textes « GEFORCE RTX » et logos de la vraie carte ne sont pas reproduits.

---

## 8. Le son

Chaîne Web Audio comme décrit dans `docs/06` : `audio` → filtre passe-bas → gain → analyseur → sortie.

- **Le site réagit** (toujours actif) : basses → vitesse des ventilateurs, respiration du bloom, pulsation des liserés ; aigus → scintillement des annotations, poussière, particules de la puce ; temps détectés → vagues de cœurs CUDA et apparition de certains labels. Toutes les valeurs sont lissées (moyenne glissante de 150 ms).
- **Le scroll ouvre le son** (acte I) : la fréquence de coupure passe de 350 Hz à 20 kHz sur une courbe exponentielle, du beat 1 au beat 3. Au beat 4, gain à 25 % pendant 2 s.
- **Mode film** : la position de scroll est calculée à partir de `audio.currentTime` en interpolant la table du 5.2. Molette ou clavier : pause propre, retour au scroll libre.
- **Sons d'interface**, synthétisés (aucun fichier) : un **clic de relais** (bruit filtré à 3 kHz, 25 ms) sur les boutons, un **souffle court** (bruit filtré passe-bande, 180 ms) sur les griffures. Volume à -30 dB environ, coupés avec le son.

---

## 9. Écrans et performance

- PC uniquement, de 1366 px à 3840 px de large, ultrawide compris. La carte reste cadrée dans une zone 16:9 centrale ; le HUD s'accroche aux bords réels de l'écran ; le champ de vision horizontal de la caméra s'élargit sur ultrawide pour ne jamais couper la carte.
- Une seule scène WebGL, mise en pause quand l'onglet est caché.
- `devicePixelRatio` plafonné à 1,5 (2 sur les écrans de moins de 1600 px de large).
- **Qualité adaptative** : moyenne des images par seconde sur 2 s ; en dessous de 50, on baisse dans l'ordre la résolution de rendu, le nombre de particules, la qualité du bloom, puis les ombres. On remonte prudemment au-dessus de 58.
- Cible : 60 images par seconde sur une RTX 5070 en 2560 px.

---

## 10. Autocritique

Pour chaque choix : est-ce que je le ferais pour n'importe quel site similaire ? Si oui, je le remplace ou je l'ancre dans le sujet.

| Choix | Générique ? | Verdict |
|---|---|---|
| Fond noir avec un seul accent coloré | **Oui**, c'est un tic connu (fond quasi noir + accent sans raison). | **Ancré** : le noir est `#000` pur parce que l'écran est OLED (pixels éteints) et que le récit est « rien n'existe tant que ce n'est pas éclairé ». L'accent n'est pas choisi, il est **mesuré** sur les LED de la carte. Et il reste sous 2 % de l'écran jusqu'au climax. |
| Dégradé bleu, violet, rose | **Oui**, le dégradé violet est la première empreinte IA de `docs/02`. | **Ancré** : c'est la lumière physique de la carte, jamais un fond ni un décor. Il n'existe que dans des objets qui émettent (tubes, courant, chaleur). Interdit en aplat, en texte, en bouton. |
| Labels mono entre crochets | **Oui**, motif très répandu sur les sites primés comme chez les IA. | **Restreint** : uniquement pour ce qui est une donnée système (numéro de beat, unité, état). Pas d'« eyebrow » au-dessus de chaque titre : les titres de beat n'ont pas de label décoratif, le label est dans le HUD, à un endroit fixe. |
| Réticules « + » aux coins | Oui, vu partout. | **Rendu fonctionnel** : ce sont les marques de cadrage de la caméra, ils se resserrent pour la mise au point et affichent la position de la caméra. |
| Compteur de chargement `000` | Oui. | **Rendu vrai** : il compte les octets réellement chargés, et chaque ligne POST passe à « OK » quand la ressource correspondante est prête. |
| Texte qui se décode | Oui, motif répandu. | **Limité** au seul nom de la carte (beat 1), avec un jeu de caractères hexadécimal (le langage d'un BIOS), pas des symboles au hasard. |
| Easing expo-out partout | Oui. | **Remplacé** par trois courbes nommées d'après la physique de l'objet (`masse`, `traine`, `coupe`), avec 0 % de dépassement. |
| Grain de film | Oui, sur presque tous les sites sombres. | **Transformé** en bruit de capteur qui dépend de la lumière : il raconte quelque chose (on voit dans le noir) et disparaît en studio. |
| Archivo Expanded | En partie : les grotesques larges sont à la mode sur les sites tech. | **Gardé** parce que l'axe de largeur porte du sens (la charge électrique) et que la gravure sur pièce usinée est la bonne référence. Alternative envisagée : Hubot Sans (plus mécanique, mais écart de largeur 75 à 125 seulement, moins expressif). |
| Martian Mono | Non, rare. | Gardé. Son axe de largeur sert les données vivantes. |
| Rail de chapitres | Oui (lightweight.info). | **Ancré** : segments séparés par des encoches à l'angle signature, remplissage au dégradé comme la barre lumineuse de la carte. |
| Boutons ronds à fin contour | Oui. | **Remplacés** par des cadres chanfreinés, la forme exacte de la coque. |
| Griffures lumineuses | Le principe d'un balayage est courant. | **Ancré** : par trois, à l'angle des barres « /// » de la carte, avec raccord de forme. |
| Vision thermique en palette « fer chaud » | Le rendu IR rouge/jaune est un cliché. | **Remplacé** par la rampe MSI (bleu froid, rose chaud, blanc brûlant), exigée par le brief et cohérente avec le dégradé. |
| Ville cyberpunk | **Oui**, cliché maximal. | **Cadré** : architecture dense et sobre, pluie, reflets dans les flaques ; enseignes abstraites (rectangles et barres de lumière, pas de lettres) ; pas de texte japonais, pas de glitch. Le vrai sujet du beat est le calcul de l'image par passes, la ville n'est que le modèle. |
| Chiffres qui roulent dans le tableau final | Oui. | **Gardé** mais justifié par la forme « générique de fin » : les lignes montent comme un générique, les chiffres roulent une seule fois, sans effet de compteur de casino. |
| Tableau comparatif | Pas générique en soi. | Une seule source pour les performances relatives (TechPowerUp, 4K), citée sous le tableau. |

---

## 11. Chiffres : état de la vérification

Toutes les sources sont dans `CREDITS.md`.

| Donnée | Valeur | État |
|---|---|---|
| Dimensions | 359 × 149 × 70 mm | ✔ fiche MSI |
| STORMFORCE, 7 pales ; TRI FROZR 4 ; Core Pipes carrés ; plaque cuivre nickelé ; backplate métal à ouïes | | ✔ fiche MSI |
| Sorties | 3 × DisplayPort 2.1b, 1 × HDMI 2.1b | ✔ fiche MSI |
| Consommation, alimentation recommandée | 575 W, 1000 W | ✔ fiche MSI |
| Fréquences | 2 482 MHz (Gaming et Silent), 2 497 MHz (Extreme Performance) | ✔ fiche MSI |
| Ventilateurs à l'arrêt au repos | Zero Frozr | ✔ page produit msi.com : « Ventilateurs à l'arrêt. » est confirmé |
| GDDR7 : 16 modules | 16 × 2 Go | ✔ cohérent avec le bus 512 bits (16 puces de 32 bits) ; relevé sur photo du PCB (Guru3D) |
| Mémoire | 32 Go GDDR7, 28 Gbit/s, 512 bits, 1 792 Go/s | ✔ MSI, KitGuru, TechPowerUp |
| GB202 | 750 mm², 92,2 milliards de transistors, TSMC 4N | ✔ KitGuru, TechPowerUp |
| Cœurs | 21 760 CUDA, 170 SM, 680 Tensor, 170 RT | ✔ nvidia.com, KitGuru |
| Générations | Tensor 5e génération, RT 4e génération | ✔ nvidia.com |
| Vitesse maximale des ventilateurs (RPM) | introuvable sur une source officielle ou un test reconnu | ✘ affichage en **% de régime** |
| Température en charge de cette carte précise | aucun test reconnu trouvé (TechPowerUp n'a pas testé la Gaming Trio, seulement des avis d'acheteurs) | ✘ **échelle sans chiffres** (froid, chaud) |
| DLSS (beat 12) | Depuis mars 2026, DLSS 4.5 et son mode 6X génèrent **jusqu'à cinq images** par image calculée sur les RTX 50 (nvidia.com). Textes retenus : « DLSS 4.5, génération multi-images » et « Pour une image calculée, jusqu'à cinq images générées. » | ✔ validé par l'utilisateur le 17/10/2026 |
| Radeon la plus puissante | Aucune nouvelle Radeon depuis la RX 9070 XT (RDNA 5 attendue en 2027). Dans le classement TechPowerUp en 4K, la **RX 7900 XTX (58 %)** devance la RX 9070 XT (55 %) : c'est elle qui figure au tableau. | ✔ validé par l'utilisateur le 17/10/2026 |
| Performances relatives (4K, TechPowerUp) | RTX 5090 100 %, RTX 4090 76 %, RTX 5080 66 %, RX 7900 XTX 58 % | ✔ base GPU TechPowerUp, consultée le 17/10/2026. Valeurs de la RTX 5090 de référence, pas de la Gaming Trio (pas testée), ce que la note sous le tableau précisera. |
| RTX 5080 | 10 752 cœurs, 16 Go GDDR7, 256 bits, 960 Go/s, 360 W, 2 617 MHz | ✔ nvidia.com, TechPowerUp |
| RTX 4090 | 16 384 cœurs, 24 Go GDDR6X, 384 bits, 1 008 Go/s, 450 W, 2 520 MHz | ✔ KitGuru |
| RX 7900 XTX | 6 144 processeurs de flux, 24 Go GDDR6, 384 bits, 960 Go/s, 355 W, jusqu'à 2 500 MHz | ✔ amd.com (bus 384 bits : TechPowerUp) |

Note pour le tableau : AMD compte des « processeurs de flux » et NVIDIA des « cœurs CUDA ». Ce ne sont pas des unités comparables ; la ligne s'appellera « Unités de calcul » avec le nom exact de chaque constructeur, et une note le dira.
