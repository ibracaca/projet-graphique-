# Refonte de la carte : vers un rendu de film produit

Document de travail pour la refonte 3D (voir `REFONTE-3D.md`). Objectif : que la MSI GeForce RTX 5090 32G Gaming Trio OC ressemble, à l'écran, à un film produit tourné en studio, et qu'elle tienne la comparaison avec les photos de `assets/reference/msi/` à toutes les vues de l'atelier.

## 1. Pourquoi la carte actuelle ne fait pas réaliste

Diagnostic fait sur les captures de l'atelier et du site (`captures/carte/`, `captures/acte4/`).

1. **Aucune arête arrondie.** Toutes les pièces sont des boîtes et des extrusions à angles vifs (biseau de 0,3 à 0,6 mm sur une poignée de pièces seulement). Dans la réalité, chaque arête de plastique moulé ou de métal usiné a un rayon : c'est lui qui attrape un filet de lumière et qui fait lire la forme. Sans lui, tout paraît en carton.
2. **Formes trop simples.** Coque en trois plaques plates, ventilateurs aux pales en feuille mince, ailettes en pavés droits, PCB couvert de boîtes, connecteur en bloc : la silhouette est juste (les calages sont bons), le détail ne l'est pas.
3. **Matières uniformes.** Une couleur et une rugosité constantes par matériau : pas de micro-relief, pas de variation, pas de traces d'usinage, pas de grain de plastique. Le métal brossé est la seule texture.
4. **Pas d'occlusion ambiante.** Les creux (entre les pales, au fond des ailettes, sous les caloducs) ne s'assombrissent pas : la carte paraît plate et sans poids.
5. **Lumière pauvre.** HDR filtré et deux lumières directionnelles. Pas de grandes boîtes à lumière qui dessinent de longs reflets nets sur les surfaces brillantes, pas de lumière de découpe qui détache la silhouette du noir.
6. **Rendu brut.** Pas d'antialiasing temporel (les centaines d'ailettes crénellent et scintillent en mouvement), pas de profondeur de champ en gros plan, tone mapping neutre.
7. **Trop d'appels de dessin** (environ 800 par image) : chaque petite pièce est un maillage séparé. Il faut fusionner pour pouvoir ajouter du détail.

## 2. La carte à reproduire

Dimensions officielles : **359 × 149 × 70 mm** (fiche MSI, `assets/reference/msi-datasheet-5090-gaming-trio.pdf`). Repère du code : X le long de la carte (équerre à −X, écusson à +X), Y vers le haut (doigts PCIe en bas), Z vers l'avant (ventilateurs à +Z). Unité : 1 = 1 mm. Mesures existantes dans `src/carte/dimensions.js` (elles sont justes, calées au pixel sur les photos : les garder comme référence).

### Photos de référence et ce qu'elles montrent

| Fichier | À y relever |
|---|---|
| `produit-2.webp` | Face, de face. Contours de la coque, coin en verre fumé, barres « /// », trois ventilateurs. Échelle 0,427 mm par pixel. |
| `card-f-1.png`, `vga_body-1.png`, `kv_vga.png` | Face trois quarts : épaisseur et facettes de la coque, profil de l'embout droit, écusson, reflets. |
| `produit-4.webp`, `card-b-1.png` | Dos : backplate deux tons séparé par une diagonale, alu brossé, fenêtre ajourée, vis. |
| `vga_body-4.png`, `mwtal.png` | Backplate seul, flux d'air à travers la fenêtre. |
| `produit-3.webp` | Tranche du dessus : connecteur 16 broches, plaques, traits lumineux. |
| `produit-5.webp` | Côté ports : 3 DisplayPort, 1 HDMI, ouïes de l'équerre, flanc de la coque. |
| `vga_body-2.png`, `air.png`, `wave.png` | Radiateur nu : ailettes, bords en vagues (Wave Curved 4.0), découpes en V (Air Antegrade Fin 2.0), embouts ronds des caloducs. |
| `vga_body-3.png` | PCB nu : GPU, 16 modules mémoire, étages d'alimentation, connecteur. |
| `fan.png` | Ventilateur STORMFORCE : 7 pales, texture « griffes » près du bout des pales, anneau extérieur. |
| `core_pipes.png`, `copper_baseplate.png` | 9 Core Pipes à section carrée posés sur la plaque de base nickelée. |

Pour plus de détail, cherche aussi des photos de démontage de cette carte précise (tests en ligne), télécharge-les dans `assets/reference/` et regarde-les.

## 3. Pièce par pièce : de l'état actuel à la cible

Les onze pièces sont des objets séparés (nécessaire à la vue éclatée). Garde **les mêmes identifiants et numéros** (`PIECES` dans `src/carte/carte.js`).

| N° | Pièce (id) | Fichier actuel | Aujourd'hui | Cible |
|---|---|---|---|---|
| 01 | Coque (`coque`) | `coque.js` | Plaque extrudée percée, facettes posées à plat, coins fumés, embout en extrusion. | Coque moulée d'un seul tenant, épaisseur réelle (2 à 3 mm), facettes inclinées raccordées par des arêtes vives mais arrondies (rayon 0,5 à 1 mm), anneaux de ventilateur en relief, coin en verre fumé épais et biseauté, barres « /// » en diffuseurs dépolis (lumière diffuse, pas un aplat), écusson en relief avec bague lumineuse. Grain de plastique mat (micro-relief) sur l'anthracite, brillant sur le fumé. Flanc côté équerre avec ses rainures diagonales. |
| 02 | STORMFORCE ×3 (`ventilateurs`) | `ventilateurs.js` | Pales en surface paramétrique sans épaisseur, anneau en cylindre, moyeu disque. | 7 pales **épaisses** (1,2 à 1,8 mm), profil d'aile, bord d'attaque arrondi, bord de fuite plus fin, vrillage et cambrure réels, **texture « griffes »** près de l'extrémité (rainures en relief, voir `fan.png`), anneau extérieur qui relie les bouts de pales, moyeu avec léger dôme et liseré, cadre et bras de fixation visibles derrière. Plastique noir satiné, reflets longs sur les pales. |
| 03 | TRI FROZR 4 (`radiateur`) | `refroidissement.js` | Ailettes en pavés droits (instances), barrettes plates. | Ailettes de 0,3 mm avec **bords en vagues** et **découpes en V** (profil extrudé puis instancié), alternance haute et basse, brasure sur les caloducs, deux blocs, encoche au-dessus du connecteur. Aluminium légèrement satiné, l'occlusion ambiante creuse le fond entre les ailettes. |
| 04 | Core Pipes (`corePipes`) | `refroidissement.js` | 9 barres carrées puis tubes ronds Catmull-Rom. | 9 caloducs dont la **section passe du carré (contact GPU) au rond**, rayons de cintrage réalistes (environ 2 fois le diamètre), soudure sur la plaque, embouts écrasés et fermés qui dépassent du radiateur côté écusson. Cuivre nickelé brillant, reflets nets. |
| 05 | Plaque de base (`plaqueBase`) | `refroidissement.js` | Pavé et 4 cylindres. | Bloc usiné, surface de contact polie, pattes de vissage avec ressorts et vis, pads thermiques gris clair sur les zones mémoire. Nickel avec traces d'usinage concentriques. |
| 06 | PCB (`pcb`) | `electronique.js` | Extrusion noire, contacts dorés instanciés, quelques pavés. | Vernis épargne noir satiné avec pistes visibles en relief léger (texture générée), sérigraphie abstraite (aucun logo, aucun texte de marque), **étages d'alimentation** : selfs à dessus arrondi, condensateurs, MOSFET, petits composants CMS par milliers en instances, trous de vis métallisés, doigts PCIe dorés avec chanfrein. |
| 07 | GPU GB202 (`gpu`) | `electronique.js` | Deux pavés. | Substrat vert foncé avec petits condensateurs autour, renfort métallique (cadre) si visible sur les photos de démontage, die gris miroir de 750 mm². |
| 08 | GDDR7 (`memoire`) | `electronique.js` | 16 pavés plats. | 16 boîtiers BGA de 2 Go, noirs mats, arêtes arrondies, légère gravure abstraite (pas de marque lisible). Positions inchangées (`MODULES_MEMOIRE`). |
| 09 | Connecteur 16 broches (`connecteur`) | `electronique.js` | Bloc et alvéoles en pavés. | Boîtier plastique avec ses alvéoles carrées réelles (12 de puissance, 4 de signal), clip de verrouillage, broches dorées au fond. |
| 10 | Backplate (`backplate`) | `arriere.js` | Tôle extrudée, partie brossée posée par-dessus, barres découpées. | Tôle d'aluminium de 1,5 mm emboutie, rebords pliés, **deux tons** (alu brossé anisotrope à gauche, métal sombre à droite) avec une arête de transition nette, fenêtre ajourée aux barres obliques, vis à tête bombée, plaque d'about pliée et percée. |
| 11 | Sorties (`equerre`) | `arriere.js` | Tôle extrudée et ports en pavés. | Équerre en acier zingué satiné, ouïes en chevrons embouties, **ports DisplayPort et HDMI à leur vraie forme** (coque métallique pliée, languette de contact noire à l'intérieur), vis de fixation. |
| | Zones RGB | `coque.js` | Barres émissives, bague, traits. | Diffuseurs dépolis avec gradient interne, légère translucidité, halo dans le plastique autour. Rester marqué `userData.neon = true` (seuls les néons passent dans le bloom). |

## 4. Le rendu : la moitié du « look vidéo »

Modules disponibles dans Three.js r186 (vérifiés dans `node_modules/three/examples/jsm`) : `GTAOPass`, `SAOPass`, `SMAAPass`, `TAARenderPass`, `BokehPass`, `SSRPass`, `RoundedBoxGeometry`, `RectAreaLightUniformsLib`, `GLTFLoader`, `DRACOLoader`, `KTX2Loader`, `BufferGeometryUtils`, `MeshSurfaceSampler`. `AgXToneMapping` existe aussi.

Par ordre d'impact :

1. **Arêtes arrondies** sur toutes les pièces (voir 3).
2. **Occlusion ambiante** : cuite dans les textures (route Blender) ou `GTAOPass` en temps réel, réglé fin (rayon court, pour les creux de quelques millimètres).
3. **Boîtes à lumière** : deux ou trois `RectAreaLight` en studio (beats 11 et 13) qui dessinent de longs reflets nets sur la coque, les caloducs et le backplate, plus une lumière de découpe à l'arrière. Garder le HDR filtré pour les reflets d'ambiance. Le noir autour doit rester pur.
4. **Matières PBR texturées** : cartes de rugosité et de normales (ambientCG, Poly Haven, ou générées : bruit, traces d'usinage, grain de plastique). La variation de rugosité compte plus que la couleur.
5. **Antialiasing** : MSAA sur les cibles du composer (`samples: 4`) ou `TAARenderPass` à l'arrêt et `SMAAPass` en mouvement. Les ailettes ne doivent plus scintiller.
6. **Profondeur de champ** discrète (`BokehPass`) sur les gros plans (beats 1, 3, 11), mise au point sur la pièce visée.
7. **Tone mapping** : essayer `AgXToneMapping` contre `NeutralToneMapping` sur les mêmes plans, garder celui qui rend le mieux le métal et les néons.
8. **Ombres** plus douces et plus justes (rayon de flou, `shadow.radius` ou VSM), sans voile sur le noir.

Garder le bloom sélectif tel quel : son rayon est volontairement à 0 (voir le commentaire dans `rendu.js`), sinon il voile tout l'écran.

## 5. Contrats à respecter (le reste du site dépend de la carte)

Ne casse aucun de ces points ; teste-les tous (section 6 de `REFONTE-3D.md`).

1. **API de la carte** : `construireCarte()` renvoie `{ racine, pieces, placer, rotors, piece(id) }`. Chaque pièce garde `groupe`, `balayage`, `boite` (Box3 locale), `eclatement`, `remplissage`, `dz`, `eclate` (décalage de la vue éclatée). `placer()` applique `eclatement`, `dz` et `remplissage`.
2. **Les deux états, filaire et matière** (beats 1, 2, 3, 7, 11) : chaque matériau de pièce passe par `brancherBalayage()` (`src/carte/materiaux.js`) qui coupe la matière au-delà d'un front lumineux (`uRemplir`, `uDir`, `uPlage`). Le filaire actuel vient de `EdgesGeometry` (angle de 28°) : **sur des maillages détaillés et arrondis, il produirait des milliers de lignes illisibles.** Il faut fournir un filaire dédié par pièce : les lignes de construction de la pièce (contours, arêtes principales), tracées à part, ou issues d'un maillage simplifié. Le filaire doit rester un dessin d'ingénieur lisible, comme aujourd'hui en vue éclatée (`captures/acte1/1920-0860.png`).
3. **Néons** : tout ce qui émet porte `userData.neon = true` et ne dépend que de `balayage.uAllumage` (0 éteint, 1 allumé). Le reste du bloom en dépend.
4. **Dégradé sur les arêtes** (beat 11, `src/scene/aretes.js`) : il fabrique aujourd'hui des lignes à partir des maillages de `coque` et `backplate`. Sur un modèle détaillé, fournir là aussi un jeu d'arêtes vives choisies (les facettes de la coque, les bords du backplate).
5. **Rotors** : `carte.rotors` = les trois groupes qui tournent sur Z local, centrés sur les moyeux (`VENTILATEURS.centres`).
6. **Repères partagés** : `dimensions.js` (PCB, GPU, VENTILATEURS, Z) est lu par `courant.js` (pistes posées à Z = −29,3 sur le PCB), `memoire.js` (`MODULES_MEMOIRE`), `image.js` (`PORTS`, `PCB.doigts`), `souffle.js`, `thermique.js` (coupe à Y = `GPU.y`), `acte2.js` (décalages `COUCHES`), `acte3.js` (le dessus du die en coordonnées monde `{ x: -70, y: 2, z: -87.7 }`, PCB décalé de −60), `annotations.js` (points d'accroche par pièce), `hud.js` (boîte englobante pour la mise au point). Si une cote change, mets à jour ces fichiers.
7. **Vision thermique** (beat 6) : un matériau unique remplace tous les autres (`scene.overrideMaterial`), il a besoin de `position` et `normal`, gère l'instanciation, coupe tout au-dessus de Y = `GPU.y`. Coque et ventilateurs sont exclus par `userData.horsThermique`. Avec un `.glb`, garder des normales propres et les mêmes exclusions.
8. **Microscope** (beat 7) : la caméra plonge sur le die puis un shader prend le relais au même cadrage. Le die doit rester à la même place et à la même taille (25,5 × 29,4 mm).
9. **Performance** : viser moins de 250 appels de dessin et quelques centaines de milliers de triangles pour la carte, mesurés avec `renderer.info`. Fusionner par pièce et par matériau (`BufferGeometryUtils.mergeGeometries`), instancier ce qui se répète (ailettes, composants CMS, vis). La qualité adaptative (`NIVEAUX` dans `rendu.js`) doit pouvoir couper l'AO, la profondeur de champ et le MSAA si les images par seconde chutent.

## 6. Critères d'acceptation

- Dans l'atelier, à chaque vue (Face, Dos, Côté ports, 3/4 avant, 3/4 arrière), en mode Superposé : silhouettes toujours calées, et en Côte à côte, un œil non averti doit hésiter entre la photo et le rendu sur les zones éclairées.
- Gros plan d'un ventilateur et d'un coin de radiateur : pales épaisses, griffes visibles, ailettes en vagues sans crénelage.
- Vue éclatée : chaque pièce est crédible seule, et le filaire reste lisible.
- 60 images par seconde en 2560 × 1440 sur la RTX 5070, aucun beat sous 50 en 4K (la qualité adaptative peut descendre d'un niveau).
- Aucune régression sur les 14 beats (liste dans `REFONTE-3D.md`).
