# Mouvement, motion design et librairies

*Extrait de la base « Atelier Web » de l'utilisateur, instantané au 16 octobre 2026. Les librairies évoluent : vérifie version et licence par une recherche web avant de les utiliser.*

## 0. Ce que l'utilisateur veut dire par « animation » : du motion design

Quand l'utilisateur parle d'animation, il pense **motion design** : l'esthétique des génériques, des vidéos de marque et des animations faites dans After Effects, transposée dans un site. Pas de simples effets d'apparition : des **séquences chorégraphiées image par image**, où les formes, le texte et les couleurs se transforment avec un timing de film d'animation.

Ce qui distingue le motion design d'un site simplement « animé » :
- **Tout est enchaîné** : une forme se transforme en une autre, un trait devient un titre, un cercle s'ouvre pour révéler la section suivante. Rien n'apparaît ni ne disparaît « sec ».
- **Le timing est travaillé comme un graphe de vitesse** : accélérations franches, ralentis, dépassements, petits rebonds de fin (overshoot, follow-through), éléments qui « traînent » derrière le mouvement principal (overlapping action).
- **La typographie est animée comme un personnage** (kinetic typography) : mots qui s'assemblent, lettres qui tombent et rebondissent, titres qui se déforment, se masquent, se remplacent.
- **Les formes géométriques vivent** : cercles, barres, lignes qui se dessinent, se morphent, se divisent, balaient l'écran comme des transitions de vidéo.
- **Il y a des transitions de « montage »** : raccord par forme (match cut), balayage, masque qui s'ouvre, zoom à travers un élément vers la scène suivante.
- **Des boucles soignées** : éléments décoratifs qui tournent en boucle parfaite, sans à-coup.

### Le langage d'After Effects traduit en web

| Dans After Effects | Sur le web | Outil |
|---|---|---|
| Images clés (keyframes) sur une timeline | Timeline JavaScript avec positions relatives et labels | GSAP `timeline()` |
| Éditeur de courbes (graph editor) | Courbes de vitesse sur mesure | GSAP CustomEase, `cubic-bezier`, ressorts |
| Précompositions | Timelines imbriquées | GSAP (timelines dans des timelines) |
| Trim Paths (tracé qui se dessine) | Tracé SVG dessiné progressivement | GSAP DrawSVG, `stroke-dashoffset` |
| Morphing de calques de forme | Morphing de formes SVG | GSAP MorphSVG |
| Trajectoire (motion path) | Élément qui suit un tracé | GSAP MotionPathPlugin |
| Cache et track matte | Masques et découpes | `clip-path`, `mask-image`, SVG `<mask>` |
| Animateurs de texte | Texte découpé en lettres, mots, lignes | GSAP SplitText |
| Expression `wiggle` | Tremblement organique | GSAP CustomWiggle, bruit (noise) |
| Remappage temporel | Animation pilotée par le scroll | ScrollTrigger avec `scrub` |
| Caméra 3D | Perspective et caméra | CSS `perspective`, Three.js |
| Flou directionnel (motion blur) | Flou ou étirement selon la vitesse | filtre SVG, `scale` selon la vélocité |

**GSAP est le moteur le plus proche d'After Effects** (timelines, courbes, tous les plugins de forme et de texte, désormais gratuits). L'originalité viendra de la direction artistique et de la chorégraphie, pas du moteur.

Attention : le skill `motion-design` donne des durées pensées pour les interfaces (décalages de moins de 500 ms au total, par exemple). Elles valent pour les retours d'action. Pour les séquences de motion design (intro, transitions de scènes, scènes pilotées par le scroll), des séquences plus longues sont voulues.

## 1. Le piège du skill `frontend-design`

Claude charge souvent seul le skill `frontend-design` d'Anthropic quand il construit un site. Ce skill demande d'utiliser le mouvement non déclenché par l'utilisateur **avec parcimonie**. Il précise aussi que les mots du brief l'emportent toujours sur ses consignes. **Pour ce projet, le brief l'emporte : le site doit être riche en mouvement**, varié et chorégraphié, jamais le même fondu répété.

## 2. Beaucoup d'animations sans faire « cheap » : les 4 couches

1. **Ambiance** (toujours là, discrète) : grain qui scintille, objet 3D qui respire, poussière lumineuse. Ne doit jamais gêner la lecture.
2. **Réponse** (à chaque geste) : survol, clic, glisser. Courte (150 à 300 ms), précise, avec un easing soigné.
3. **Récit** (au scroll) : sections épinglées (pinned), progression, scènes qui se transforment. Chaque section entre **différemment** selon son contenu.
4. **Transition** (entre scènes ou pages) : rien ne « saute », tout se transforme.

Règles de chorégraphie :
- **Varier les entrées** : masque qui se lève (clip-path), lettres qui tombent, ligne qui se dessine, chiffre qui compte, élément qui arrive avec rebond.
- **Une seule vedette à la fois** : deux animations spectaculaires simultanées s'annulent.
- **Le texte se stabilise vite** : ce qui doit être lu est lisible en moins d'une seconde.
- **Un vocabulaire d'easing cohérent** : 2 ou 3 courbes signatures pour tout le site.
- **Le mouvement a une raison** : guider, répondre, raconter ou créer une ambiance.

## 3. Catalogue de techniques par déclencheur

**Au scroll** : révélation par masque plutôt que par fondu ; split text ; section épinglée (pin + scrub) ; défilement horizontal dans une section verticale ; parallaxe à plusieurs plans ; ligne SVG qui se dessine ; objet 3D qui tourne, se démonte ou change de forme ; déformation selon la vitesse du scroll (velocity skew) ; indicateur de progression créatif.

**Au curseur** : curseur personnalisé qui change selon ce qu'il survole ; boutons magnétiques ; révélation sous un masque circulaire ; inclinaison 3D (tilt) ; lumière qui suit la souris (spotlight).

**Au clic** : bouton qui se comprime puis rebondit (spring) ; élément qui s'agrandit en continuité (FLIP) ; compteurs qui roulent.

**Au temps (ambiance)** : bruit de Perlin, flow field, grain animé, poussière, texte brouillé puis décodé (scramble text).

## 4. Effets visuels « concours »

- **3D en temps réel** : matériaux métal, verre (transmission), chrome.
- **Post-traitement** : aberration chromatique, bloom, grain, vignettage, glitch, tramage (dithering), rendu ASCII.
- **Filtres SVG** (feTurbulence, feDisplacementMap) : déformations organiques sans WebGL, peu utilisés par les IA donc originaux.
- **Typographie variable animée** : graisse ou largeur qui ondule, réagit au curseur ou au scroll.

## 5. Librairies

| Besoin | Choix habituel | Alternatives |
|---|---|---|
| Animation | GSAP | Anime.js v4, Motion, Web Animations API |
| Scroll | GSAP ScrollTrigger | CSS scroll-driven animations, GSAP Observer |
| Défilement fluide | Lenis | GSAP ScrollSmoother |
| Texte animé | GSAP SplitText | GSAP ScrambleText, fontes variables |
| 3D | Three.js | OGL |
| Post-traitement | Three.js EffectComposer | pmndrs postprocessing |
| Son | Web Audio natif | Howler.js |

Faits vérifiés le 16/10/2026 : GSAP est **entièrement gratuit**, y compris SplitText, MorphSVG, DrawSVG, ScrambleText, depuis son rachat par Webflow. Mélanger plusieurs moteurs d'animation complique tout : en choisir un principal.

## 6. Performance et accessibilité

- **Animer `transform` et `opacity`**, jamais `width`, `top` ou `margin`.
- **WebGL a un coût** : une seule scène 3D, mise en pause quand elle n'est pas visible.
- **`prefers-reduced-motion`** : version calme pour ceux qui l'ont réglé.
- **Mobile** : pas de curseur ; équivalent tactile ou désactivation propre.
- **Smooth scroll** : tester ancres et recherche de page.

## Sources
- Skills GSAP officiels : https://github.com/greensock/gsap-skills
- Skill motion-design de LottieFiles : https://github.com/lottiefiles/motion-design-skill
- Skills Three.js : https://github.com/cloudai-x/threejs-skills
- GSAP : https://gsap.com
- Démos expérimentales avec code : https://tympanus.net/codrops
