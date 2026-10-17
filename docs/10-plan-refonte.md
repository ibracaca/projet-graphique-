# Plan de la refonte 3D (point de contrôle 1)

Diagnostic du 18/10/2026, fait sans toucher au code. Captures de départ dans `captures/refonte/avant/` (atelier en côte à côte, vues Face, Dos, Côté ports, 3/4 avant, 3/4 arrière, et le site à vh 4520).

## 1. Ce que montre la comparaison avec les photos

| Vue | Ce qui trahit le rendu actuel |
|---|---|
| 3/4 avant | Coque gris bleuté clair et plate (la vraie est un anthracite chaud, presque noir, avec des facettes qui tournent du gris moyen au noir selon la lumière). Le coin en verre fumé ne se lit pas du tout. Les barres « /// » flottent comme des autocollants posés sur la coque au lieu d'être des diffuseurs encastrés sous le verre. Moyeux en disques gris clair plats. Aucune arête n'accroche la lumière. |
| Face | Les silhouettes sont calées, mais les ventilateurs paraissent en papier (pales sans épaisseur, rayures parasites des ailettes vues à travers). L'écusson et sa bague manquent presque entièrement. |
| 3/4 arrière | La partie « brossée » du backplate est un dégradé brillant uniforme, comme du plastique miroir : aucune anisotropie, aucun trait de brossage. Le bas de la coque sort en gris argent très clair alors qu'il est anthracite. Têtes de vis absentes. |
| Côté ports | L'équerre est un rectangle blanc uni, sans ses pattes ni ses ouïes en chevrons ; les ports sont des rectangles sombres. C'est la vue la plus éloignée de la photo. |
| Site, beat 12 | Des murs plats violets sous la pluie : aucune architecture, aucune rue, des enseignes en traits. |

Mesures sur une image (site, 1920 × 1080, sonde Playwright sur le vrai GPU) :

| Moment | Appels de dessin | Triangles |
|---|---|---|
| vh 210 (beat 1) | 828 | 122 000 |
| vh 860 (éclaté) | 784 | 97 000 |
| vh 2040 (thermique) | 868 | 130 000 |
| vh 3850 (climax) | 926 | 97 000 |
| vh 4520 (ville, fin DLSS) | 31 | 22 000 |

La carte compte 457 objets séparés : c'est la cause des 800 à 900 appels. Le site tourne aujourd'hui à 60 images par seconde (plafond de l'écran), ce qui laisse de la marge mais pas une marge connue.

À noter : `antialias: true` est demandé au renderer, mais tout passe par le composer dont les cibles n'ont pas de MSAA. **Le site n'a donc aucun antialiasing aujourd'hui**, d'où le scintillement des ailettes.

## 2. Route technique : A (Blender par script)

Blender 5.0.1 est installé sur ce PC (`C:\Program Files\Blender Foundation\Blender 5.0\blender.exe`), testé en ligne de commande, et son export glTF propose Draco. Je choisis la route A, parce que les trois sources principales du réalisme manquant (arêtes arrondies, pales épaisses à profil d'aile, occlusion ambiante) sont exactement ce que Blender fait bien et que Three.js fait mal.

Organisation :

- `outils/blender/commun.py` : outils partagés (biseau et normales pondérées, matériaux nommés, rangement des objets, export).
- `outils/blender/carte.py` : construit les onze pièces, une collection par pièce, et exporte `assets/models/carte.glb`. Une commande : `blender --background --python outils/blender/carte.py`. Je l'ajoute à `LISEZMOI.md`.
- Les cotes viennent d'un fichier commun : `outils/blender/dimensions.json`, généré depuis `src/carte/dimensions.js`, pour que Blender et le site lisent les mêmes repères.

Conventions dans le `.glb` (ce qui permet de garder tous les contrats de `docs/08`, section 5) :

- Onze nœuds racines aux noms des pièces (`coque`, `ventilateurs`, etc.). Dans chaque pièce, **un maillage par matériau** (fusionné), plus les pièces répétées en instances (ailettes, composants CMS, vis) via l'extension `EXT_mesh_gpu_instancing` que `GLTFLoader` transforme en `InstancedMesh`.
- Les matériaux portent des noms fixes (`plastique_coque`, `plastique_pales`, `verre_fume`, `alu_brosse`, `metal_sombre`, `nickel`, `alu_ailettes`, `vernis_pcb`, `or`, etc.). Au chargement, le site remplace chaque matériau par le sien (construit en JS, branché sur `brancherBalayage()`), en reprenant les textures du `.glb`. Le balayage filaire/matière, la vision thermique et l'instanciation continuent donc de marcher sans changement de shader.
- `<piece>__filaire` : des arêtes seules (lignes de construction choisies dans Blender), exportées en lignes. Elles remplacent `EdgesGeometry`, qui produirait des milliers de traits sur un modèle arrondi.
- `<piece>__neon_*` : les zones lumineuses, marquées `userData.neon` au chargement.
- `<piece>__aretes` : les arêtes vives choisies pour le dégradé du beat 11 (`aretes.js`).
- Les trois rotors sont des nœuds `rotor_0..2` centrés sur leurs moyeux.

Occlusion ambiante : **cuite dans Blender** (Cycles, dans un attribut de couleur par sommet pour les pièces denses, dans une texture pour les grandes surfaces de la coque et du backplate), multipliée dans le shader. En plus, un `GTAOPass` léger en temps réel pour les ombres de contact entre pièces, que la qualité adaptative peut couper.

Textures : métal brossé, plastique grainé, rugosité et normales en 1k ou 2k (ambientCG et Poly Haven, CC0, listées dans `CREDITS.md`), plus des cartes générées dans Blender (griffes des pales, brossage, traces d'usinage). Format WebP dans le `.glb`. KTX2 demanderait l'outil `toktx` (non installé) : je le propose seulement si la mémoire graphique ou le temps de chargement le justifient.

Chargement : `GLTFLoader` avec `DRACOLoader` (décodeur copié depuis `three/examples/jsm/libs/draco/`), octets comptés dans l'objet `octets` de `src/main.js`. **Pendant la refonte, chaque pièce absente du `.glb` reste construite par l'ancien code** : on remplace pièce par pièce, le site marche à chaque étape.

## 3. Le rendu

Dans `src/scene/rendu.js`, par ordre d'impact :

1. **MSAA ×4** sur les cibles du composer principal (le bloom n'en a pas besoin).
2. **Occlusion ambiante** : cuite (ci-dessus) plus `GTAOPass` à rayon court (quelques millimètres).
3. **Boîtes à lumière** : deux ou trois `RectAreaLight` pour les beats 11 et 13 (longs reflets nets sur la coque, les caloducs et le backplate) et une lumière de découpe ; elles restent éteintes dans l'acte I, où le faisceau rasant doit rester seul.
4. **Profondeur de champ** discrète (`BokehPass`) sur les gros plans des beats 1, 3 et 11, pilotée par `ETAT`.
5. **Tone mapping** : comparaison `AgXToneMapping` contre `NeutralToneMapping` sur les mêmes plans, je garde le meilleur pour le métal et les néons.
6. **Ombres** plus douces (`shadow.radius`, éventuellement VSM), sans voile sur le noir.

`NIVEAUX` gagne trois réglages (`msaa`, `ao`, `dof`) : en descendant, on coupe d'abord la profondeur de champ, puis le GTAO, puis le MSAA passe de 4 à 2, avant de toucher à la résolution comme aujourd'hui.

## 4. Budget

| | Aujourd'hui | Cible |
|---|---|---|
| Carte, appels de dessin par image | 784 à 926 | moins de 250 |
| Carte, triangles | 100 000 à 130 000 | 400 000 à 700 000 |
| `carte.glb` (Draco + WebP) | | moins de 12 Mo |
| Ville, appels de dessin | 31 | moins de 400 |
| Ville, triangles | 22 000 | 1 à 2 millions |
| Images par seconde | 60 en 1920 | 60 en 2560 × 1440, 50 minimum en 4K |

Estimation des appels de la carte : 11 pièces × 2 à 4 matériaux, plus filaire et néons, soit environ 60 maillages, rendus dans la passe principale, la passe des néons et la passe d'ombres : environ 180 appels.

## 5. Ordre de travail

1. **Pièce témoin (point de contrôle 2)** : un ventilateur STORMFORCE complet. Sept pales épaisses à profil d'aile (vrillage, cambrure, bord d'attaque arrondi), anneau extérieur, moyeu à dôme en plastique sombre satiné (sans dragon : une gravure concentrique fine), cadre et bras derrière, occlusion cuite. Branché dans le site par le `.glb` (les deux autres ventilateurs en copies), avec MSAA activé. J'ajoute à l'atelier une vue **Ventilateur** en gros plan, comparée à `fan.png` et au ventilateur de `card-f-1.png`. **Arrêt pour valider le niveau de réalisme.**
2. **La carte complète**, dans l'ordre du temps passé à l'écran : coque (et verre fumé, barres, écusson), backplate, radiateur et Core Pipes, plaque de base, équerre et ports, PCB, GPU, mémoire, connecteur. Puis le rendu (section 3). Comparaison à toutes les vues de l'atelier. **Arrêt.**
3. **La ville** : un kit de modules modélisés dans Blender (corniches, cadres de fenêtres, balcons, escaliers de secours, climatiseurs, conduits, réservoirs, supports d'enseignes, lampadaires), exporté en `ville-kit.glb`, assemblé et instancié par règles en JS. Fenêtres en « interior mapping », asphalte mouillé PBR (ambientCG), néons en tubes, brouillard en couches, lumière volumétrique en post-traitement, pluie éclairée. Toutes les passes par tuiles gardées, avec un filaire par coordonnées barycentriques. **Arrêt.**
4. **Non-régression** sur tout le site (section 6 de `REFONTE-3D.md`), à 1366, 1920, 2560 et 3840 px. **Arrêt.**

## 6. Risques repérés

- **Filaire de l'acte I** : il faut que les lignes de construction choisies restent aussi lisibles que l'éclaté actuel (`captures/acte1/1920-0860.png`). Je les vérifie dès la pièce témoin.
- **Draco et les lignes** : Draco ne compresse que les triangles ; les lignes du filaire partent non compressées (elles sont légères).
- **Coût du MSAA avec les cibles en demi-flottant** en 4K : à mesurer ; le niveau adaptatif le réduit si besoin.
- **Cotes partagées** : si une pièce change de forme, `courant.js`, `thermique.js`, `acte3.js` et `annotations.js` lisent ses repères ; je garde `dimensions.js` comme référence unique.

## 7. Outils remis en état

Playwright avait été mis à jour sans son navigateur : `npx playwright install chromium` relancé, les scripts de capture fonctionnent de nouveau.
