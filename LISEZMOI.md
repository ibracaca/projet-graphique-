# Salle noire : site concept RTX 5090 Gaming Trio

Site de motion design au scroll, construit avec Vite, Three.js, GSAP et Lenis. Concept non officiel, sans lien avec MSI ni NVIDIA.

## Lancer le site

1. Double-clique sur **`LANCER.bat`**.
2. La première fois, il installe tout seul les dépendances (environ une minute, il faut internet).
3. Le navigateur s'ouvre sur le site. Pour arrêter, ferme la fenêtre noire du serveur.

Le site ne marche pas en double-cliquant sur `index.html` : le navigateur bloque alors le chargement des modèles, des éclairages et l'analyse de la musique. Il faut passer par `LANCER.bat`, qui démarre un petit serveur local (Vite).

## Où en est le projet

| Étape | État |
|---|---|
| 1. Charte (`DESIGN.md`) | Validée |
| 2. Carte 3D construite par code | En validation : ouvre l'atelier depuis la page d'accueil |
| 3. Colonne vertébrale (scène, scroll, son), puis acte I | À venir |
| 4. Actes II, III et IV | À venir |

## L'atelier de la carte

Page `dev/carte.html` (lien sur la page d'accueil). Elle sert à comparer la carte 3D aux photos officielles MSI.

- **Boutons de vue** : Face, Dos, 3/4 avant, 3/4 arrière, Côté ports, Libre.
- **Côte à côte / Superposé** : la photo à gauche et le rendu à droite, ou le rendu posé par-dessus la photo (réglage d'opacité).
- **Éclaté** : démonte la carte pièce par pièce.
- **Matière** : passe du filaire lumineux (0) à la matière réelle (1).
- En vue **Libre**, on tourne autour de la carte à la souris.

## Où modifier quoi

| Je veux changer... | Fichier |
|---|---|
| Les couleurs de la charte (tokens oklch) | `src/couleurs.js` (et `DESIGN.md` pour la justification) |
| Les mesures de la carte | `src/carte/dimensions.js` |
| Les matières (métal, plastique, verre fumé) | `src/carte/materiaux.js` |
| Une pièce de la carte | `src/carte/` : `coque.js`, `ventilateurs.js`, `refroidissement.js`, `electronique.js`, `arriere.js` |
| Les noms des pièces de la vue éclatée | `src/carte/carte.js` (liste `PIECES`) |
| Les textes du site | `docs/07-textes-des-beats.md` (version de référence) ; les fichiers du site seront indiqués ici quand ils existeront |
| La cue sheet (synchro avec la musique) | `DESIGN.md`, section 5 ; le fichier de code sera indiqué ici |

## Les dossiers

| Dossier | Contenu |
|---|---|
| `src/` | Le code du site |
| `dev/` | Pages d'atelier (outils de mise au point, pas le site) |
| `assets/` | Musique, éclairage HDR, textures, photos de référence (non intégrées au site) |
| `captures/` | Captures d'écran des points de contrôle |
| `outils/` | Scripts de capture d'écran automatique (Playwright) |
| `docs/` | La base de connaissances et les textes validés |

## Revenir en arrière

Chaque étape validée est enregistrée avec git. Pour voir l'historique, ouvre un terminal dans ce dossier et tape `git log --oneline`.
