# Boîte à outils des sites primés

*Extrait de la base « Atelier Web » : synthèse du 17 octobre 2026, tirée de l'analyse de 21 sites que l'utilisateur trouve magnifiques. Pour inspirer, jamais pour copier : on reprend des principes et des techniques, jamais le code, les images ou les polices payantes d'un site.*

## 1. Ce que les meilleurs sites ont en commun

1. **Une idée, pas une liste de sections.** Un concept qui se raconte en une phrase.
2. **Un fil rouge visuel** qui traverse tout le site. L'œil suit un personnage, pas des blocs.
3. **Une palette courte et assumée.**
4. **Un duo typographique contrasté**, dont un très expressif.
5. **Des micro-détails d'interface** soignés : labels en mono, compteurs, réticules, boutons ronds.
6. **Le mouvement raconte**, il ne décore pas.
7. **La sobriété autour de la pièce maîtresse.**

## 2. Librairies réellement utilisées (sur 21 sites)

| Librairie | Sites | Rôle |
|---|---|---|
| GSAP (+ ScrollTrigger, SplitText, CustomEase, Flip) | 19 | Animation, scroll, texte |
| Three.js | 14 | 3D, souvent avec Draco et KTX2 |
| Lenis | 10 | Défilement fluide |
| Howler.js ou Web Audio | 5 | Son |

## 3. Courbes d'easing relevées

À utiliser avec GSAP CustomEase (`CustomEase.create("nom", "0.16,1,0.3,1")`) ou en CSS. Choisir **2 ou 3 courbes signatures** et s'y tenir.

| Courbe | Vue chez | Caractère |
|---|---|---|
| `0.16, 1, 0.3, 1` | Lightweight, Lusion | Expo-out : départ franc, arrivée longue et feutrée. |
| `0.19, 1, 0.22, 1` | Green Chameleon, Lando Norris | Encore plus de traîne, luxueux. |
| `0.4, 0, 0.1, 1` | Lusion | Élégante et précise, interfaces. |
| `0.33, 0, 0, 1` | Lightweight | Mécanique de précision. |
| `0.20, 0, 0.10, 1` | Serotoninn | Curseur qui suit la souris avec retard. |
| `0.76, 0, 0.24, 1` | Sondaven | Accélération et freinage francs, rideau. |
| `0.65, 0.05, 0, 1` | Lando Norris | Démarrage lent, fin brutale et nette. |

Durées relevées : réponses d'interface 0,16 à 0,7 s ; transitions de scène 1,4 à 3,5 s.

## 4. Polices gratuites de qualité

| Rôle | Équivalents gratuits |
|---|---|
| Grotesque neutre | General Sans, Satoshi, Cabinet Grotesk (Fontshare), Hanken Grotesk |
| Grotesque variable | Mona Sans, Hubot Sans, Archivo (axe de largeur) |
| Mono technique | IBM Plex Mono, Azeret Mono, Martian Mono, DM Mono |

## 5. Motifs récurrents (en prendre un ou deux, pas tous)

- **Labels en mono entre crochets ou après des barres** : « [ NOISE CONTROL ] », « //// Manifesto ».
- **Réticules « + » aux coins** d'un cadre ou de l'écran.
- **Compteur de chargement à 3 chiffres** (« 090 »).
- **Texte qui se décode** lettre par lettre.
- **Boutons ronds** à fin contour.
- **Rail de chapitres** latéral.
- **Grain de film** sur presque tous les sites sombres.

## 6. Le son

- **Coupé par défaut ou lancé par un geste explicite**, avec un bouton visible (« Sound: Off » chez igloo.inc).
- **Une ambiance + un effet par événement** (clic, transition).
- Web Audio natif ou Howler.js.
