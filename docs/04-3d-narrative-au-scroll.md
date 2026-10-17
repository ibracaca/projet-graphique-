# La 3D narrative au scroll

*Extrait de la base « Atelier Web », d'après l'analyse du 17 octobre 2026 de igloo.inc, lightweight.info, 2018.craftedbygc.com, aether1.ai, lusion.co, noomoagency.com, cornrevolution.resn.global et landonorris.com.*

## 1. Le principe

Dans ces sites, **le scroll n'est pas un défilement de page : c'est une télécommande de film**. Chaque cran de molette fait avancer une animation (caméra, objet, lumière). Le texte arrive par-dessus, au bon moment, comme des sous-titres de documentaire.

Ce qui sépare un grand site 3D d'une démo technique :
- **Un seul objet héros**, traité comme une star de cinéma : éclairage studio, matières crédibles, lent.
- **Une transformation** pendant le scroll (il s'assemble, s'ouvre, change de monde), pas juste une rotation.
- **Une ambiance de lumière** forte.
- **Du texte très sobre** autour, petit, aligné, pour laisser la scène respirer.

## 2. Les six manières de raconter en 3D

| Manière | Ce qui se passe au scroll | Exemple |
|---|---|---|
| L'assemblage | L'objet arrive en pièces détachées annotées et se construit. | igloo.inc : blocs de glace numérotés reliés par des lignes. |
| Le voyage de caméra | La caméra avance dans un décor, traverse des objets. | 2018.craftedbygc.com : on traverse les chiffres « 2018 ». |
| Le changement de monde | Le même objet passe d'un univers à l'autre. | lightweight.info : roue en filaire dans le noir, puis réaliste en studio. |
| L'ouverture | L'objet s'ouvre et révèle son intérieur. | aether1.ai : le boîtier s'ouvre. |
| Le bestiaire | Un objet par section. | noomoagency.com |
| Le jouet | La scène réagit à la souris, physiquement. | lusion.co |

## 3. Fiches utiles pour ce projet

**igloo.inc** : blocs éclatés dans l'espace, chacun avec un petit numéro relié par des lignes fines (constellation de données), puis ils s'assemblent. Interface en mono façon terminal : « //// Manifesto », « Sound: Off », « Scroll down to discover. ». Monochrome froid. L'objet éclaté annoté est une manière brillante d'expliquer un système.

**lightweight.info** : hero noir, la roue apparaît comme une gravure filaire ; au scroll, roue réaliste qui tourne et se place, titres qui se décodent lettre par lettre. Réticules « + » aux coins, rail vertical de chapitres. Une seule police, capitales, interlettrage négatif. Environnement HDR de studio pour l'éclairage. À retenir : le passage filaire vers réaliste, du plan technique à l'objet fini.

**aether1.ai** : loader en cercles concentriques type sonar, compteur « [ 090 ] », boîtier en verre qui s'ouvre, sons d'interface sur chaque action, labels HUD entre crochets.

**cornrevolution.resn.global** : la donnée scientifique devient un paysage lumineux (ADN en milliers de filaments de particules sur noir).

**2018.craftedbygc.com** : la caméra traverse les grands titres, qui passent de chaque côté.

## 4. Recettes techniques

- **Scroll qui pilote une animation** : GSAP ScrollTrigger avec `scrub` sur une timeline (la position du scroll devient la tête de lecture).
- **Caméra sur un chemin** : une courbe `CatmullRomCurve3` et la progression du scroll qui donne la position.
- **Objet éclaté qui s'assemble** : chaque pièce a une position « éclatée » et une position finale ; interpolation avec la progression du scroll, en décalant chaque pièce (stagger).
- **Éclairage studio crédible** : une image d'environnement HDR (Poly Haven, CC0) plutôt que des lumières posées à la main.
- **Particules** : `THREE.Points` avec un shader simple.
- **Texte qui se décode** : GSAP ScrambleText.
- **Rendu cinéma** : grain léger en post-traitement, un peu de vignettage, jamais de couleurs saturées sur la 3D.
- **Performance** : une seule scène 3D, pause quand elle n'est pas visible, version calme si `prefers-reduced-motion`.

## 5. Sans modèle 3D téléchargé

Remplacer l'objet modélisé par des formes procédurales que Three.js crée seul (boîtes, cylindres, tores, extrusions de formes 2D), des lignes et des points, du texte 3D. Pour une vue éclatée, un modèle construit par code est même préférable : ses pièces sont séparées par nature.
