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
| 2. Carte 3D construite par code | Validée |
| 3. Colonne vertébrale (scène, scroll, son), puis acte I | En validation |
| 4. Actes II, III et IV | À venir |

## Ce que fait le site aujourd'hui

1. **Démarrage** : des lignes de BIOS s'écrivent ; chaque « OK » attend le vrai chargement de la ressource, le compteur suit les octets reçus. Deux boutons : « Allumer » (lance la musique) et « Sans son ».
2. **Acte I** : un faisceau rasant révèle la carte par fragments, son nom se décode, puis elle se démonte en vue éclatée filaire, avec les onze pièces annotées.
3. **Griffure** : trois entailles de lumière ferment l'acte I. L'acte II n'est pas encore construit.

Pendant l'acte I, le son est d'abord étouffé, comme entendu à travers le boîtier, puis il s'ouvre à mesure qu'on descend.

En bas à gauche : **[ SON ]** coupe ou remet la musique (avec un petit oscilloscope du signal réel), **[ MODE FILM ]** fait défiler le site tout seul au rythme de la musique (un coup de molette le met en pause). Le rail à gauche montre les quatre actes ; un clic sur un acte y amène.

Si Windows est réglé pour réduire les animations, le site passe en version calme : mêmes contenus, fondus au lieu des griffures, pas de Mode film.

## L'atelier de la carte

Page `dev/carte.html` (ouvre `http://localhost:5173/dev/carte.html` quand le site tourne). Elle sert à comparer la carte 3D aux photos officielles MSI.

- **Boutons de vue** : Face, Dos, 3/4 avant, 3/4 arrière, Côté ports, Libre.
- **Côte à côte / Superposé** : la photo à gauche et le rendu à droite, ou le rendu posé par-dessus la photo (réglage d'opacité).
- **Éclaté** : démonte la carte pièce par pièce.
- **Matière** : passe du filaire lumineux (0) à la matière réelle (1).
- En vue **Libre**, on tourne autour de la carte à la souris.

## Où modifier quoi

| Je veux changer... | Fichier |
|---|---|
| Les couleurs de l'interface (tokens oklch) | `src/styles/site.css`, tout en haut (`:root`) |
| Les couleurs dans la 3D (néons, griffures) | `src/couleurs.js` (mêmes valeurs ; `DESIGN.md` pour la justification) |
| Les tailles de texte, les marges | `src/styles/site.css` (`--fs-...`, `--marge`) |
| Les courbes d'animation | `src/main.js` (`masse`, `traine`, `coupe`) et `src/styles/site.css` |
| Les textes affichés (titres, cotes) | `index.html` |
| Les lignes du démarrage | `src/recit/demarrage.js` (liste `LIGNES`) |
| Les noms des pièces de la vue éclatée | `src/carte/carte.js` (liste `PIECES`) |
| La cue sheet : ordre des beats, durée de scroll, temps musical | `src/recit/cue.js` (liste `BEATS`) |
| La chorégraphie de l'acte I | `src/recit/acte1.js` (positions en vh de scroll) |
| Les mesures de la carte | `src/carte/dimensions.js` |
| Les matières (métal, plastique, verre fumé) | `src/carte/materiaux.js` |
| Une pièce de la carte | `src/carte/` : `coque.js`, `ventilateurs.js`, `refroidissement.js`, `electronique.js`, `arriere.js` |
| Les textes de référence et l'état des chiffres | `docs/07-textes-des-beats.md` |

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
