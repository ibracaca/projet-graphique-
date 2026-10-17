# Textes des beats

Textes validés par l'utilisateur. Registre : **technique pur, professionnel**. Pas de poésie, pas de slogans, pas de superlatifs (« révolutionnaire », « ultime »). Des phrases courtes, des faits, des unités. Textes en français, labels techniques en anglais (comme les vraies marques de matériel).

**Chiffres.** Ceux marqués ✔ ont été relevés le 17 octobre 2026 sur la fiche officielle MSI de la carte et dans le test de KitGuru. Ceux marqués ⚠ sont à vérifier sur une source officielle avant affichage. Revérifie tout de même chaque chiffre au moment de construire et note la source dans `CREDITS.md`. Si un chiffre ne se confirme pas, corrige-le ou retire-le, n'invente jamais.

Sources de départ :
- Fiche MSI : https://storage-asset.msi.com/datasheet/vga/latam/GeForce-RTX-5090-32G-GAMING-TRIO-OC.pdf
- Test KitGuru : https://www.kitguru.net/components/graphic-cards/dominic-moass/nvidia-rtx-5090-review-ray-tracing-dlss-4-and-raw-power-explored/

Attention : le système de refroidissement de cette carte s'appelle **TRI FROZR 4** et ses ventilateurs **STORMFORCE** (7 pales). Ce ne sont pas des TORX.

---

## Acte I, l'objet

### 0. Démarrage
Label : `[ BOOT ]`
Lignes façon POST, qui s'écrivent une à une :
```
GPU ............ GB202            OK
VRAM ........... 32 GB GDDR7      OK
BUS ............ 512-BIT          OK
POWER .......... 16-PIN / 575 W   OK
COOLING ........ TRI FROZR 4      OK
```
Compteur : `000` à `100`.
Boutons : « Allumer » et « Sans son ».

### 1. L'ombre
Label : `[ 01 / OBJET ]`
Titre (se décode lettre par lettre) : **GeForce RTX 5090 Gaming Trio**
Sous-ligne : `359 × 149 × 70 mm` ✔

### 2. L'éclaté
Label : `[ 02 / VUE ÉCLATÉE ]`
Titre : **Vue éclatée.**
Annotations (numéro, nom, une ligne de détail) :
- `01` Coque, carénage en deux tons.
- `02` STORMFORCE ×3, ventilateurs à 7 pales. ✔
- `03` TRI FROZR 4, radiateur à ailettes. ✔
- `04` Core Pipes, caloducs à section carrée. ✔
- `05` Plaque de base, cuivre nickelé. ✔
- `06` PCB.
- `07` GPU GB202. ✔
- `08` GDDR7, 16 modules. ⚠ (32 Go, vérifie le nombre et la capacité des modules)
- `09` Connecteur 16 broches. ✔
- `10` Backplate, métal, ouïes de ventilation. ✔
- `11` Sorties : 3 × DisplayPort 2.1b, 1 × HDMI 2.1b. ✔

## Acte II, l'énergie

### 3. Le courant
Label : `[ 03 / POWER ]`
Titre : **575 W.** ✔
Texte : Un seul connecteur 16 broches. Alimentation recommandée : 1000 W. ✔

### 4. Le silence
Label : `[ 04 / IDLE ]`
Titre : **Charge faible.**
Texte : Ventilateurs à l'arrêt. ⚠ Vérifie que cette carte arrête bien ses ventilateurs au repos (fonction Zero Frozr de MSI, absente de la fiche officielle). Si ce n'est pas confirmé, écris « Régime minimal. » et garde l'immobilité visuelle.

### 5. Le souffle
Label : `[ 05 / AIRFLOW ]`
Titre : **STORMFORCE ×3.**
Texte : 7 pales par ventilateur. Le flux traverse le radiateur et ressort par les ouïes du backplate. ✔
Donnée vivante : vitesse de rotation en `RPM` qui monte avec le scroll (valeur maximale ⚠, sinon afficher un pourcentage de régime).

### 6. Vision thermique
Label : `[ VISION : THERMIQUE ]`
Titre : **Core Pipes.**
Texte : Caloducs à section carrée pour un contact maximal avec le GPU. Plaque de base en cuivre nickelé. ✔
Échelle de températures : prends la température en charge relevée par un test reconnu de cette carte précise ⚠. Si tu n'en trouves pas, affiche l'échelle sans chiffres (froid, chaud).

## Acte III, l'intérieur

### 7. Puissances de dix
Label : `[ 07 / ÉCHELLE ]`
Paliers, avec l'échelle qui défile en direct :
- `10⁻¹ m` Carte : 359 mm. ✔
- `10⁻² m` GPU GB202 : 750 mm². ✔
- `10⁻⁶ m` Procédé TSMC 4N. ✔
- `10⁻⁸ m` 92,2 milliards de transistors. ✔
(Ne prétends pas que les transistors mesurent 4 nm : « 4N » est un nom de procédé.)

### 8. La puce
Label : `[ 08 / GB202 ]`
Titre : **21 760 cœurs CUDA.** ✔
Données : 170 SM. 680 Tensor Cores. 170 RT Cores. ✔ Générations (Tensor 5e, RT 4e) ⚠.

### 9. La mémoire
Label : `[ 09 / VRAM ]`
Titre : **32 Go GDDR7.** ✔
Données : 28 Gbit/s. Bus 512 bits. 1 792 Go/s. ✔

### 10. 4,2 millisecondes
Label : `[ 10 / FRAME TIME ]`
Titre : **4,17 ms.**
Texte : À 240 images par seconde, chaque image dispose de 4,17 ms.
Étapes, avec un chronomètre en mono : Géométrie. Rastérisation. Ray tracing. Shading. DLSS. Affichage.

## Acte IV, le réveil

### 11. Reconstruction et allumage
Label : `[ SYSTEM READY ]`
Titre : **2 482 MHz.** ✔
Texte : Fréquence boost, modes Gaming et Silent. 2 497 MHz en mode Extreme Performance. ✔

### 12. Le rendu qui se calcule
Label : `[ 12 / RENDER ]`
Étapes : `01` Fil de fer. `02` Polygones. `03` Ombres. `04` Ray tracing. `05` DLSS 4.5, génération multi-images.
Texte final : Pour une image calculée, jusqu'à cinq images générées. ✔ (DLSS 4.5, mode 6X, nvidia.com ; validé le 17/10/2026)

### 13. Fiche technique
Label : `[ 13 / SPÉCIFICATIONS ]`
Tableau comparatif : RTX 5090 Gaming Trio, RTX 5080, RTX 4090, et la Radeon la plus puissante disponible en octobre 2026 : la RX 7900 XTX ✔ (devant la RX 9070 XT dans le classement 4K de TechPowerUp ; validé le 17/10/2026).
Lignes : cœurs, mémoire, bus, bande passante, consommation, boost, performances relatives.
Performances relatives : un seul test reconnu (par exemple le classement de performances relatives de TechPowerUp), cité sous le tableau, à une définition précise (par exemple 4K). Jamais de chiffres mélangés entre sources.
Valeurs RTX 4090 relevées ✔ : 16 384 cœurs CUDA, 24 Go GDDR6X, bus 384 bits, 1 008 Go/s, 450 W.

### 14. Footer
- Concept non officiel, sans lien avec MSI ni NVIDIA.
- Musique : Grimes, « Genesis ».
- Ressources et sources : lien vers les crédits.
Puis extinction, pixel par pixel, jusqu'au noir total.
