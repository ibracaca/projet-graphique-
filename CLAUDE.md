# Projet Graphique : site concept RTX 5090 Gaming Trio

Ce dossier sert à construire un site de motion design du niveau des sites primés sur Awwwards : un récit au scroll autour de la carte graphique MSI GeForce RTX 5090 Gaming Trio, sur la musique « Genesis » de Grimes. Le brief complet est dans `PROMPT.md`. Ce fichier contient les règles permanentes, valables à chaque session.

## Pour qui

L'utilisateur est étudiant en prépa scientifique. Il connaît HTML, CSS et JavaScript, pas Node.js, Vite ni TypeScript : choisis la technique pour lui et explique-la simplement quand elle compte. Il parle français. Il adore le motion design façon After Effects et ne supporte plus le « look IA ». Site privé, non publié, fait pour le plaisir et pour tester ce que tu sais faire. Il regarde le site sur un **écran OLED**, avec une **RTX 5070**. Le site vise **uniquement le PC** (aucune version téléphone), mais s'adapte à toutes les définitions d'écran de PC.

## Règles fermes

1. **Jamais de tiret cadratin** (le grand tiret, U+2014) : ni dans les textes du site, ni dans le code, ni dans les commentaires, ni dans tes réponses. L'utilisateur le trouve laid et c'est une signature des textes d'IA. Reformule avec une virgule, deux-points, des parenthèses ou une nouvelle phrase, sans le remplacer par un tiret moyen.
2. **Chiffres vrais** : chaque caractéristique technique affichée (cœurs CUDA, mémoire, consommation, transistors, dimensions, technologies MSI) doit être vérifiée par une recherche web sur une source officielle (nvidia.com, msi.com) ou un test reconnu. Note la source dans `CREDITS.md`. Si un chiffre est introuvable, ne l'invente pas : retire-le.
3. **Ressources réelles, licences propres** : tu as le droit et le devoir d'aller chercher de vraies ressources sur internet (voir plus bas). Chaque fichier téléchargé est listé dans `CREDITS.md` avec sa source et sa licence.
4. **Concept non officiel** : pas de fichiers de logo officiels MSI ou NVIDIA. Le nom de la carte s'écrit dans nos propres polices. Une ligne discrète dans le footer : « Concept non officiel, sans lien avec MSI ni NVIDIA. »
5. **Ne rapporte comme fait que ce que tu as vérifié** dans un vrai navigateur.
6. **Langue** : textes du site en français, registre technique et professionnel ; labels techniques en anglais (noms de technologies, unités, en-têtes HUD), comme les vraies marques de matériel.

## Documents à lire

Lis-les avant de concevoir, puis reviens-y quand une question se pose. Ils viennent de la base de connaissances que l'utilisateur a construite pour apprendre à Claude à faire de beaux sites.

| Fichier | Quand le lire |
|---|---|
| `docs/01-mouvement-et-motion-design.md` | Avant toute animation : ce que « motion design » veut dire ici, les 4 couches, le piège du skill frontend-design. |
| `docs/02-sortir-du-look-ia.md` | Avant la charte de design, et pendant l'autocritique. |
| `docs/03-boite-a-outils-des-pros.md` | Pour les courbes d'easing, les polices, les motifs d'interface. |
| `docs/04-3d-narrative-au-scroll.md` | Avant de construire la scène 3D et le récit au scroll. |
| `docs/05-hud-techno-et-data.md` | Pour les annotations, labels, compteurs, cadrans. |
| `docs/06-musique-genesis.md` | Analyse du morceau, cue sheet, liaison son et image. Données dans `docs/genesis-energie.csv`. |
| `docs/07-textes-des-beats.md` | Les textes validés de chaque beat, avec l'état de vérification de chaque chiffre. |

## Skills

Une copie des skills de l'utilisateur est dans le dossier `skills/` (un sous-dossier par skill, avec son `SKILL.md` et ses fichiers de référence). **Au premier démarrage, copie ce dossier vers `.claude/skills/`** pour que Claude Code les détecte comme skills du projet ; en attendant, lis directement le `SKILL.md` concerné. Utilise `motion-design`, `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-plugins`, `gsap-performance`, `threejs-fundamentals`, `threejs-shaders` et `threejs-postprocessing`. Charge chacun au moment où il sert.

## Ressources à aller chercher

- **Éclairage HDR de studio, textures** (métal brossé, PCB, cuivre) : Poly Haven (polyhaven.com, tout en CC0, API publique documentée sur github.com/Poly-Haven/Public-API) et ambientCG (CC0). Prends des tailles raisonnables (1k ou 2k).
- **Photos** si une scène en a besoin : Unsplash ou Pexels (licences gratuites), en vérifiant la licence de chaque image.
- **Photos de référence de la carte** : cherche toi-même des photos de la RTX 5090 32G Gaming Trio (page produit MSI, fiche technique, tests en ligne), télécharge-les avec `curl` dans `assets/reference/` et regarde chacune. L'utilisateur a pu y déposer les siennes : utilise les deux. Si un site bloque le téléchargement, essaie une autre source (revendeurs, tests) avant d'abandonner. Ces photos servent de référence pour toi, elles ne sont pas intégrées au site.
- **Regarde chaque image téléchargée** avant de l'utiliser, pour vérifier qu'elle convient vraiment.
- Range tout dans `assets/` (`reference/`, `hdri/`, `textures/`, `images/`, `models/`, `audio/`, `fonts/`).
- Le modèle 3D de la carte est **construit par code** (pièces séparées, nécessaires à la vue éclatée). Si l'utilisateur dépose un jour un modèle `.glb` dans `assets/models/`, propose de l'utiliser pour le rendu final.

## Technique

- Le site charge des modèles, des HDR, des textures et analyse l'audio : il ne peut pas fonctionner en double-clic (`file://` bloque ces chargements et rend l'analyseur audio muet). Utilise donc un **projet Vite** en JavaScript simple (pas de TypeScript, pas de React), avec GSAP, Three.js et Lenis installés par npm.
- Vérifie que Node.js est installé (`node -v`). S'il manque, explique à l'utilisateur en deux lignes comment installer la version LTS depuis nodejs.org, et attends.
- Crée un fichier **`LANCER.bat`** à la racine : un double-clic installe les dépendances si besoin, lance le serveur et ouvre le navigateur. C'est la seule chose que l'utilisateur doit savoir faire.
- Écris un `LISEZMOI.md` en français pour un débutant : comment lancer, ce que contient le site, où modifier les textes, les couleurs et la cue sheet.
- Polices auto-hébergées dans `assets/fonts/` (ou via Fontsource), pas de dépendance à Google Fonts au chargement.
- Vise 60 images par seconde sur une RTX 5070 : une seule scène WebGL, pause hors écran, `devicePixelRatio` plafonné, qualité adaptative si les images par seconde chutent.
- **Git** : initialise un dépôt git local au démarrage et fais un commit à chaque étape validée (message clair en français), pour pouvoir revenir en arrière. Ajoute `node_modules/` au `.gitignore`. Pas de dépôt distant.

## Méthode

1. Lis `PROMPT.md` et les documents.
2. Écris `DESIGN.md` : la charte (palette nommée en tokens, polices et rôles, courbes signatures, principes de mouvement, découpage des beats avec leur durée de scroll) et l'autocritique de chaque choix (« est-ce que je ferais ce choix pour n'importe quel site similaire ? Si oui, je le remplace »).
3. Construis par étapes, en commençant par la colonne vertébrale : scène 3D, scroll, audio. Puis beat par beat.
4. Après chaque étape importante, lance le site et **vérifie le rendu dans un vrai navigateur** (captures d'écran avec Playwright si tu peux l'installer), à plusieurs définitions de PC (1366, 1920, 2560 et 3840 px de large), puis corrige ce qui ne correspond pas à la charte. Respecte les points de contrôle de `PROMPT.md` : arrête-toi et attends la validation de l'utilisateur.
5. À la fin, cherche dans tout le dossier le caractère U+2014 et supprime chaque occurrence en reformulant.
