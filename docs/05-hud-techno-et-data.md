# Interfaces techniques, HUD, data et futurisme élégant

*Extrait de la base « Atelier Web », d'après l'analyse du 17 octobre 2026 de aether1.ai, animejs.com, dragonfly2.studiofreight.dev, igloo.inc, lightweight.info, activetheory.net et cornrevolution.resn.global.*

## 1. Le principe : le futurisme élégant

Aucun de ces sites n'utilise le cliché cyberpunk (néon rose et cyan, glitch partout, police « Orbitron »). Leur futurisme est **sobre, précis et monochrome** :
- **Une seule couleur vive**, sur un fond très sombre ou très clair.
- **Beaucoup de petites informations** : numéros, unités, coordonnées, pourcentages, labels.
- **Des formes d'instruments** : cercles concentriques, graduations, cadrans, réticules, grilles.
- **De la donnée qui devient image** : particules, lignes reliées, ASCII, trames.

Le bon futurisme vient des **instruments réels** (cockpit, oscilloscope, terminal, radar, outil de diagnostic), pas de l'imaginaire du néon. L'utilisateur trouve laids les sites « cyberpunk » génériques.

## 2. Le vocabulaire visuel du HUD

| Élément | Exemple vu | Effet |
|---|---|---|
| Labels en mono entre crochets | « [ NOISE CONTROL ] » (Aether) | Chaque information devient une donnée système. |
| Préfixes en barres obliques | « //// Manifesto » (Igloo) | Effet commentaire de code, terminal. |
| Compteurs à 3 chiffres | « [ 090 ] » (Aether) | Machine qui calcule. |
| Cercles concentriques et orbites | Loader sonar d'Aether | Radar, onde, instrument. |
| Graduations | Anneau gradué d'Anime.js | Instrument de mesure. |
| Réticules et « + » aux coins | Lightweight, Lusion | Viseur, cadre de visée. |
| Points numérotés reliés par des lignes | Blocs annotés de l'igloo | Schéma technique. |
| Rendu en caractères | ASCII tramé de Dragonfly | Terminal, sans cliché. |
| Rail de chapitres numérotés | « 01 PHILOSOPHY / 02 CRAFT » (Lightweight) | Mode d'emploi. |

## 3. La culture FUI

FUI signifie **Fictional User Interface** : les écrans inventés pour les films de science-fiction. Galerie de référence : HUDS+GUIS (hudsandguis.com). Ce qu'on y prend : grilles fines, typographies techniques, données qui défilent, cercles qui tournent à des vitesses différentes, couleurs limitées, petites animations en boucle parfaite.

## 4. Recettes techniques

- **Labels HUD** : police mono en capitales, `letter-spacing` léger, 10 à 12 px, couleur à 60 % d'opacité, crochets dans le texte.
- **Cercles concentriques animés** : SVG avec plusieurs `<circle>` à `stroke-dasharray` différents, chacun qui tourne à sa vitesse (`rotation` GSAP en `repeat: -1`, `ease: "none"`).
- **Graduations** : `stroke-dasharray: 1 6` donne des petits traits réguliers.
- **Compteur de chargement** : `gsap.to(obj, { val: 100, snap: "val" })`, affiché en mono sur 3 chiffres.
- **Constellation annotée** : points, lignes entre eux, petits numéros en mono ; lignes animées avec `stroke-dashoffset`.
- **Texte qui se décode** : GSAP ScrambleText avec un jeu de caractères techniques (`"01<>/#*+"`).
- **Sons d'interface** : petits clics et souffles courts (moins de 300 ms), volume bas.
