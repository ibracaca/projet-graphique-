Crée un site concept de motion design, du niveau des Sites of the Day d'Awwwards : un récit au scroll autour de la carte graphique MSI GeForce RTX 5090 Gaming Trio, sur la musique « Genesis » de Grimes. Comme si nous étions la marque et lancions la carte, en concept non officiel. Site privé, pour PC uniquement : je veux voir jusqu'où tu peux aller, vise l'exceptionnel. Lis d'abord `CLAUDE.md` et tous les documents de `docs/` : ils contiennent mes règles, ma façon de voir le design, l'analyse de la musique et les textes validés.

## L'idée en une phrase

Dans le noir total, une carte graphique naît de la lumière : on la découvre par fragments, on la démonte, on entre dans sa puce, puis elle se reconstruit et s'allume, inondée du dégradé MSI.

## Direction artistique : « Salle noire »

La rigueur d'une salle blanche de semi-conducteurs (vue éclatée, annotations d'ingénieur, réticules, précision chirurgicale), posée sur un noir absolu, et éclairée par des néons. Références : la vue éclatée annotée d'igloo.inc, le passage du filaire au réel de lightweight.info, les plans techniques et notices de montage, les outils de diagnostic matériel, les interfaces sobres des films de science-fiction (culture FUI, voir `docs/05`).

**Le noir OLED.** Mon écran est un OLED. Fond en `#000` pur : ces pixels sont éteints, la carte flotte dans le vide. Rien n'existe tant que ce n'est pas éclairé ; chaque section se rallume au lieu d'apparaître. Pour éviter le black smear (le blanc pur sur noir pur bave en violet au scroll sur certains OLED) : texte en blanc cassé (vers `#e6e6e6`), pas de grands aplats clairs, des fondus plutôt que des allumages instantanés de grandes zones.

**Le dégradé MSI, en néon.** J'adore le dégradé de MSI : bleu, violet, rose. C'est la lumière signature du site, traitée comme de vrais tubes LED sur le noir. Va regarder des photos de la Gaming Trio et des visuels MSI pour relever les teintes exactes et le sens du dégradé, puis définis-les en tokens `oklch`.
- **Dès le début, en filets fins et rares** : la barre lumineuse de la carte, le rail de progression, et des **griffures lumineuses** (entailles nettes et obliques, comme taillées dans le noir) qui servent de transitions entre les actes. Abstraites : pas de dragon ni de logo MSI.
- **Au climax (beat 11), il inonde tout** : le dégradé coule le long des arêtes de la carte reconstruite.
- **La vision thermique (beat 6) est construite avec lui** : bleu pour le froid, violet, rose pour le chaud, blanc pour le brûlant.
- **La ville du beat 12** est le seul endroit où le néon a le droit de déborder.
- **Bloom sélectif** (selective bloom) : seuls les néons brillent, le reste de la scène reste net. C'est ce qui donne l'effet LED réel.
- En dehors de ce dégradé, tout est monochrome : noir pur, blanc cassé, gris métal.

**Typographie.** Choisis le couple toi-même et justifie-le dans `DESIGN.md` : une grotesque très large pour les titres, comme une gravure d'ingénierie, et une mono technique pour les labels et les chiffres. Pistes : Archivo en largeur Expanded et Martian Mono, toutes deux variables. Évite les polices typiques des sites d'IA (Inter, Space Grotesk, JetBrains Mono, Orbitron et compagnie, voir `docs/02`). Exploite les axes variables : un titre qui s'élargit quand la charge monte, des chiffres qui s'épaississent avec la puissance.

**Lumière.** Rasante à l'ouverture (un faisceau qui ne révèle que ce qu'il touche), filaire lumineux puis matière réelle pendant le récit, studio complet au final. Éclairage HDR de studio réel (Poly Haven), métal et PCB texturés.

**Interface.** Labels mono en capitales entre crochets (« [ STORMFORCE ×3 ] »), réticules « + » aux coins de l'écran, rail de progression vertical à 4 actes, curseur en réticule qui s'adapte à ce qu'il survole. Choisis les courbes d'easing signatures (2 ou 3, voir `docs/03`), les tokens de gris et l'échelle typographique, et justifie-les dans `DESIGN.md`.

## La carte

Elle doit être **très fidèle à la vraie RTX 5090 Gaming Trio**. Aucun modèle libre n'existe : construis-la par code dans Three.js. Avant de modéliser :
1. Cherche toi-même des photos de cette carte précise (page produit MSI, fiche technique, tests en ligne), télécharge-les avec `curl` dans `assets/reference/` et **regarde chacune** : face, dos, profil, tranche du dessus avec la barre RGB, côté des ports, RGB allumé.
2. Complète avec les photos que j'ai pu déposer dans `assets/reference/`.
3. Relève les dimensions réelles (359 × 149 × 70 mm) et les proportions de chaque pièce sur les photos.

Pièces séparées pour la vue éclatée : coque aux arêtes taillées, trois ventilateurs STORMFORCE à 7 pales (pas des TORX), radiateur TRI FROZR 4 à ailettes, Core Pipes à section carrée, plaque de base en cuivre nickelé, PCB avec le GPU au centre et les modules de mémoire autour, connecteur 16 broches, backplate en métal à ouïes, équerre avec 3 DisplayPort et 1 HDMI, zones RGB. Chaque pièce existe en deux états : filaire lumineux et matière réelle ; on passe de l'un à l'autre par un balayage lumineux qui « remplit » la pièce. Montre-moi une capture de la carte assemblée, de face et de profil, à côté des photos de référence, avant d'aller plus loin.

## Le récit : 15 beats en 4 actes

Ce site doit s'apparenter à du motion design façon After Effects : séquences chorégraphiées, formes qui se morphent, typographie cinétique, transitions de montage. Le scroll est la tête de lecture d'un film (ScrollTrigger avec `scrub`) : rien ne défile, tout se transforme. Chaque beat entre différemment. **Les textes de chaque beat sont dans `docs/07-textes-des-beats.md`** : utilise-les tels quels, après vérification des chiffres.

**Acte I, l'objet**
0. **Démarrage** : écran noir, lignes façon POST de BIOS qui s'écrivent, compteur à 3 chiffres, boutons « Allumer » (lance le son et le site d'un même geste) et « Sans son ».
1. **L'ombre** : un faisceau rasant balaie lentement la carte et n'en révèle que des fragments. Le nom se décode lettre par lettre.
2. **L'éclaté** : la carte se démonte en pièces filaires qui s'écartent dans l'espace, chacune annotée d'un numéro et d'un label relié par une ligne fine qui se dessine.

**Acte II, l'énergie**
3. **Le courant** : 575 W entrent par le connecteur 16 broches, un fleuve de lumière qui se ramifie dans le PCB vers la puce.
4. **Le silence** : charge faible, tout s'immobilise et la musique baisse 2 secondes.
5. **Le souffle** : les trois ventilateurs s'éveillent et accélèrent avec le scroll, le flux d'air devient visible et ressort par le backplate.
6. **Vision thermique** : le site bascule en caméra infrarouge aux couleurs du dégradé MSI, la puce chauffe, puis les Core Pipes et le radiateur évacuent la chaleur.

**Acte III, l'intérieur**
7. **Puissances de dix** : zoom continu de la carte jusqu'aux transistors, l'échelle affichée en direct.
8. **La puce** : le GB202, ses cœurs CUDA qui s'allument par vagues, sur les temps de la musique.
9. **La mémoire** : 32 Go de GDDR7 sur 512 bits, des autoroutes de données entre les modules et la puce.
10. **4,17 ms** : la vie d'une image à 240 images par seconde, suivie de bout en bout à travers la carte, chronomètre en mono.

**Acte IV, le réveil**
11. **Reconstruction et allumage** : les pièces reviennent en place, la matière se remplit, la carte apparaît entière en pleine lumière de studio, puis le dégradé MSI s'allume et inonde ses arêtes. C'est la pièce maîtresse, calée sur le sommet de la musique (2:48).
12. **Le rendu qui se calcule** : une ville cyberpunk nocturne et inventée, sous la pluie, éclairée par les néons du dégradé MSI. Elle se calcule sous nos yeux : fil de fer, polygones, ombres, ray tracing (les reflets dans les flaques), puis DLSS 4 et ses images générées. Cyberpunk élégant : architecture dense, pluie, reflets, enseignes abstraites, pas de clichés (pas de texte japonais décoratif, pas de glitch partout).
13. **Fiche technique** : tableau comparatif avec la RTX 5080, la RTX 4090 et la Radeon la plus puissante du moment, chiffres qui roulent, présenté comme un générique de fin de film.
14. **Footer** : mention du concept non officiel, crédits, puis tout s'éteint pixel par pixel jusqu'au noir OLED total.

## Le son

La musique est dans `assets/audio/genesis.mp3`. Tout est dans `docs/06-musique-genesis.md` : analyse, cue sheet, et les trois mécanismes à construire (le site réagit au son, le scroll ouvre le son pendant l'acte I, le Mode film). Le Mode film est un bouton facultatif : le scroll libre reste le mode par défaut. Ajoute des sons d'interface très discrets (clic, souffle court), synthétisés en Web Audio, et un bouton son toujours visible.

## Mouvement

- Personnalité : précise, lourde et feutrée, comme une machine de grande valeur. Pas de rebonds cartoon. Les pièces ont du poids, les lumières ont de la traîne.
- Quatre couches (voir `docs/01`) : ambiance (grain très léger, poussière dans le faisceau), réponse (curseur réticule, boutons magnétiques), récit (le scroll), transitions entre actes (une griffure lumineuse par passage d'acte, comme un match cut).
- Les séquences de motion design peuvent durer longtemps ; les retours d'action restent courts et nets (150 à 300 ms).
- Post-traitement sobre : bloom sélectif sur les néons, grain, légère aberration chromatique sur les bords seulement pendant la plongée dans la puce.
- Version calme quand le système demande moins de mouvement : mêmes contenus, transitions en fondus, pas de Mode film.
- Utilise les skills `motion-design`, `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-plugins`, `gsap-performance`, `threejs-fundamentals`, `threejs-shaders` et `threejs-postprocessing`.

## Écrans et performance

PC uniquement, aucune version téléphone. Mais le site s'adapte à toute définition d'écran de PC, de 1366 px de large à la 4K, ultrawide compris. Qualité adaptative : mesure les images par seconde et allège la scène toute seule si elles chutent (résolution de rendu, particules, ombres). `devicePixelRatio` plafonné. Vise 60 images par seconde sur une RTX 5070.

## Technique et livraison

Travaille dans ce dossier. Projet Vite en JavaScript simple, avec un `LANCER.bat` pour l'ouvrir d'un double-clic, et un `LISEZMOI.md` en français pour un débutant (détails dans `CLAUDE.md`). Va chercher les vraies ressources sur internet comme décrit dans `CLAUDE.md`, et tiens `CREDITS.md` à jour.

## Méthode et points de contrôle

1. Rédige `DESIGN.md` (charte et autocritique) et **arrête-toi pour que je le valide**.
2. Construis la carte et montre-moi la comparaison avec les photos de référence. **Arrête-toi.**
3. Construis la colonne vertébrale (scène, scroll, audio), puis l'acte I. Vérifie le rendu dans un vrai navigateur, envoie-moi des captures, et **arrête-toi** pour que je valide. Même chose après chaque acte.
4. Enregistre chaque étape avec git (voir `CLAUDE.md`).
Ne rapporte comme fait que ce que tu as vérifié.

## Règles

N'utilise jamais le tiret cadratin (le grand tiret), ni dans les textes du site, ni dans le code, ni dans tes réponses : je le trouve laid et c'est une signature des textes d'IA. Reformule avec une virgule, deux-points ou une nouvelle phrase, sans le remplacer par un tiret moyen.
Le néon est réservé au dégradé MSI, et il reste rare jusqu'au climax : pas de cyan ni de vert néon, pas de dégradés décoratifs, pas de cartes arrondies. Ce site doit ressembler à un instrument de précision dans une salle noire, pas à une page de jeu vidéo générique.
