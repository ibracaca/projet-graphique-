# Refonte de la ville du beat 12 : une rue de film sous la pluie

Document de travail pour la refonte 3D (voir `REFONTE-3D.md`). Le beat 12 montre une image qui se calcule : une ville nocturne inventée, sous la pluie, éclairée par les néons du dégradé MSI, calculée passe après passe (fil de fer, polygones, ombres, ray tracing, DLSS 4.5). La mise en scène est validée ; **la ville elle-même doit devenir aussi crédible qu'un plan de film** quand la dernière passe est terminée.

## 1. Pourquoi la ville actuelle ne fait pas réaliste

Code : `src/scene/ville.js`. Captures : `captures/acte4/1920-4100.png` à `1920-4520.png`.

1. **Des boîtes.** Les immeubles sont 346 pavés instanciés (volumes et gradins) avec une grille de fenêtres dessinée en shader ; les 40 enseignes sont aussi des pavés. Pas de corniches, de retraits, de balcons, de cadres de fenêtres, d'escaliers de secours, de climatiseurs, de tuyaux, de toits encombrés.
2. **Façades plates.** Les fenêtres n'ont pas de profondeur ; au loin, elles crénellent (fondues en lueur moyenne pour le cacher).
3. **Une rue vide.** Pas de trottoirs, de bordures, de lampadaires, de câbles tendus entre les immeubles, de mobilier, de vapeur.
4. **Enseignes en pavés.** Des barres émissives sans tube, sans support, sans halo dans l'air.
5. **Atmosphère pauvre.** Brouillard exponentiel uniforme, pluie en traits fins, pas de lumière volumétrique (les néons ne dessinent pas de cônes dans la pluie), pas de gouttes ni d'éclaboussures.
6. **Sol uniforme.** Un plan sombre et un plan réfléchissant (flaques en bruit). Pas d'asphalte texturé, de marquages, de rigoles, de reflets étirés par la rugosité.

## 2. La cible

Une rue étroite et profonde, bordée d'immeubles hauts et denses, la nuit, sous une pluie fine. Architecture crédible et sobre, plutôt inspirée des grandes villes asiatiques et nord-américaines modernes, sans clichés (cadrage de `PROMPT.md`, beat 12) :

- **Interdits** : texte décoratif (japonais ou autre), lettres ou logos sur les enseignes, glitch, néons cyan ou vert. Les enseignes sont des formes abstraites (barres, cadres, bandes) aux couleurs du dégradé MSI (`src/couleurs.js`) ; c'est le seul endroit du site où le néon a le droit de déborder.
- **Noir OLED** : le ciel et le fond restent noirs ; le brouillard est noir ; pas de grands aplats clairs.
- **Échelle** : unités de la scène (la carte mesure 359). La rue fait environ 190 de large, la caméra avance de z = 560 à z = 140 à hauteur d'yeux (y de 60 à 42) en regardant vers le fond (−Z), champ vertical de 40°. Les immeubles s'étendent jusqu'à z ≈ −2900. Tu peux revoir ces échelles si la rue gagne en crédibilité, en gardant la durée et le rythme du plan (`src/recit/acte4.js`, beat 12).

### Ce qui fait la différence à l'écran

1. **Géométrie modulaire** générée par code : un kit de modules (étages, corniches, cadres de fenêtres en creux, balcons, escaliers de secours, climatiseurs, conduits, antennes, réservoirs, enseignes, lampadaires, câbles en chaînettes), assemblé par règles et instancié. Une façade crédible = des retraits, des ruptures, de la répétition imparfaite.
2. **Fenêtres avec intérieur** : le « interior mapping » (un shader qui simule une pièce derrière chaque vitre, avec parallaxe) donne une profondeur réelle pour presque rien. Quelques pièces éclairées en blanc cassé chaud, très faiblement.
3. **Asphalte mouillé** : textures PBR (ambientCG : asphalte, béton, métal peint ; Poly Haven), carte de rugosité avec flaques, marquages au sol usés, bordures de trottoir. Les reflets doivent s'étirer verticalement sur l'asphalte rugueux et devenir nets dans les flaques.
4. **Néons crédibles** : tubes (`TubeGeometry`) dans des supports, verre légèrement visible, halo dans l'air humide, lumière qui tombe sur les façades et le sol voisins (quelques `RectAreaLight` ou lumières ponctuelles bien placées ; au-delà, de l'émissif et des cartes de lumière).
5. **Atmosphère** : brouillard en couches (plus dense au loin et en bas), **lumière volumétrique** en post-traitement (marche de rayons dans le brouillard depuis les principales enseignes, à partir de la profondeur), pluie en traînées de longueurs variées éclairées par les néons, éclaboussures au sol, vapeur qui sort d'une grille.
6. **Profondeur** : silhouettes d'immeubles lointains en couches de plus en plus sombres, quelques fenêtres allumées très loin.

Références de qualité visuelle (à décrire, ne rien copier) : les rues pluvieuses des films de science-fiction récents, les plans nocturnes en longue focale.

## 3. Le contrat à respecter : les passes par tuiles

C'est le cœur du beat : l'image se calcule **tuile par tuile** (56 px), passe après passe. `ETAT.etape` va de −1 à 3 en continu ; pour chaque tuile, `etapeLocale()` (GLSL dans `ville.js`) décide si elle est déjà passée à l'étape suivante, avec un liseré au moment du calcul. Tout nouveau matériau de la ville doit respecter ces cinq états :

| Étape | Rendu attendu | Aujourd'hui |
|---|---|---|
| −1 | Rien (noir) | `discard` |
| 0 | **Fil de fer** : les arêtes des maillages, en lignes fines gris alu | Bords des faces de boîtes et lignes d'étages, calculés en shader |
| 1 | **Polygones** : facettes grises, éclairage plat, sans ombres ni textures | Gris selon la normale |
| 2 | **Ombres** : rendu complet (textures, lumières, ombres, néons, pluie) | Rendu standard |
| 3 | **Ray tracing** : reflets dans les flaques et sur les surfaces mouillées | Plan `Reflector` (`FlaquesShader`), visible à partir de l'étape 3 |
| DLSS | Post-traitement dans `rendu.js` : l'image du ray tracing est bruitée et en basse définition, puis DLSS reprend les tuiles une à une | `uBrut`, `uDlss` dans la passe de composition |

Recommandations pour garder ce contrat avec une géométrie riche :

- **Fil de fer** : sur des maillages détaillés, dessiner les vraies arêtes des triangles avec un attribut barycentrique (un `vec3` par sommet, géométrie non indexée), plutôt que des bords de faces devinés. C'est le rendu d'un vrai moteur en mode filaire, et c'est très lisible en tuiles.
- **Polygones** : forcer la normale de face (`dFdx`/`dFdy`) pour un rendu facetté franc.
- **Une seule fonction d'injection** (comme `brancherEtapes()` aujourd'hui) partagée par tous les matériaux de la ville, y compris les enseignes, la pluie et les effets d'atmosphère (eux n'apparaissent qu'à partir de l'étape 2).
- **Ray tracing** : garder le `Reflector` pour le sol (il est masqué pendant la passe des néons via `userData.horsBloom`) ; on peut ajouter `SSRPass` pour les façades vitrées, à condition de l'activer seulement à l'étape 3 et de rester à 60 images par seconde.

Autres points à préserver :

- `creerVille(scene, renderer)` renvoie `{ groupe, maj(dt, E), redimensionner }`. `maj` lit `E.ville`, `E.etape`, `E.pluie`, `E.lune`, `E.neonsVille`.
- Les enseignes et tubes lumineux portent `userData.neon = true` (bloom sélectif).
- La ville n'est visible que si `E.ville > 0.5` ; la carte est cachée à ce moment-là. Le brouillard de scène (`scene.fog`, `FogExp2`) est remis à densité 0 hors de la ville : il ne doit pas toucher la carte.
- La passe d'ombres est mise à jour une fois par image (pendant la passe des néons) : une seule lumière directionnelle avec ombres (la « lune ») ; ne pas multiplier les lumières qui projettent des ombres.

## 4. Budget

Mesuré le 18/10/2026 : environ 35 appels de dessin et 26 000 triangles par image. On peut monter beaucoup : viser moins de 400 appels de dessin et 1 à 2 millions de triangles, avec instanciation massive des modules, LOD pour les immeubles lointains, textures 2k en KTX2. Tenir 60 images par seconde en 2560 × 1440 sur la RTX 5070 à l'étape 3 (la plus chère, avec les reflets) ; la qualité adaptative peut baisser la résolution du `Reflector`, la lumière volumétrique et la densité de pluie.

## 5. Critères d'acceptation

- À la fin du DLSS (vh 4520 environ), une capture de la rue doit pouvoir passer pour une image de film de science-fiction sobre : profondeur, pluie éclairée, reflets étirés, façades riches, néons abstraits aux couleurs MSI.
- Chaque passe reste lisible et distincte quand on fait défiler lentement de vh 4000 à 4520 : fil de fer net, polygones francs, ombres, reflets, DLSS.
- Aucun texte, aucun glitch, aucun cyan ni vert.
- 60 images par seconde en 2560 × 1440, captures à 1366, 1920, 2560 et 3840 px.
- Toutes les sources dans `CREDITS.md`.
