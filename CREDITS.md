# Crédits et sources

Site concept non officiel, sans lien avec MSI ni NVIDIA. Usage privé, non publié.

## Musique

- Grimes, « Genesis » (`assets/audio/genesis.mp3`), fourni par l'utilisateur pour un usage privé.

## Photos de référence (non intégrées au site)

Servent uniquement de modèle pour construire la carte en 3D. Images © MSI, téléchargées le 17/10/2026, non redistribuées.

| Fichier | Source | Contenu |
|---|---|---|
| `assets/reference/msi-datasheet-5090-gaming-trio.pdf` | https://storage-asset.msi.com/datasheet/vga/latam/GeForce-RTX-5090-32G-GAMING-TRIO-OC.pdf | Fiche technique officielle |
| `assets/reference/msi/card-f-1.png`, `vga_body-1.png`, `kv_vga.png`, `zero_frozr.png` | Page produit msi.com (dossier `storage-asset.msi.com/.../gb202-300-gaming-trio/images/`) | Face trois quarts, barres RGB |
| `assets/reference/msi/card-b-1.png`, `vga_body-4.png`, `mwtal.png` | idem | Dos, backplate seul, flux d'air |
| `assets/reference/msi/vga_body-2.png`, `air.png`, `wave.png` | idem | Radiateur nu, ailettes, embouts de caloducs |
| `assets/reference/msi/vga_body-3.png` | idem | PCB nu avec GPU, mémoire, 16 broches, équerre |
| `assets/reference/msi/fan.png`, `core_pipes.png`, `copper_baseplate.png` | idem | Ventilateur STORMFORCE, Core Pipes, plaque de base |
| `assets/reference/msi/produit-1.webp` à `produit-5.webp` | Galerie de la page produit (`storage-asset.msi.com/global/picture/product/`) | Boîte, face, tranche du dessus, dos, côté ports |

## Sources des chiffres (consultées le 17/10/2026)

| Chiffre | Source |
|---|---|
| Dimensions, mémoire, bus, fréquences 2 482 / 2 497 MHz, 575 W, 1000 W, 16 broches, sorties, technologies TRI FROZR 4, STORMFORCE, Core Pipes, plaque cuivre nickelé, backplate | Fiche MSI (ci-dessus) |
| Zero Frozr (ventilateurs à l'arrêt à basse température) | https://www.msi.com/Graphics-Card/GeForce-RTX-5090-32G-GAMING-TRIO-OC |
| 21 760 CUDA, Tensor 5e génération, RT 4e génération, 575 W, DLSS 4.5 jusqu'à 5 images générées | https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/ |
| 170 SM, 680 Tensor, 170 RT, 92,2 milliards de transistors, 750 mm², 1 792 Go/s ; RTX 4090 | Test KitGuru : https://www.kitguru.net/components/graphic-cards/dominic-moass/nvidia-rtx-5090-review-ray-tracing-dlss-4-and-raw-power-explored/ |
| TSMC 4N, performances relatives en 4K | Base GPU TechPowerUp : https://www.techpowerup.com/gpu-specs/geforce-rtx-5090.c4216 |
| RTX 5080 | https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5080/ et https://www.techpowerup.com/gpu-specs/geforce-rtx-5080.c4217 |
| RX 7900 XTX | https://www.amd.com/en/products/graphics/desktops/radeon/7000-series/amd-radeon-rx-7900xtx.html (bus 384 bits : https://www.techpowerup.com/gpu-specs/radeon-rx-7900-xtx.c3941) |
| RX 9070 XT (écartée du tableau, 55 % contre 58 %) | https://www.amd.com/en/products/graphics/desktops/radeon/9000-series/amd-radeon-rx-9070xt.html |
| 16 modules GDDR7 de 2 Go | Photo du PCB : https://www.guru3d.com/story/photo-shows-nvidia-rtx-5090-pcb-with-gb202-gpu/ (et cohérence avec le bus 512 bits) |
| Plan de la puce (beat 8) : 12 GPC de 16 SM, soit 192 SM sur la puce complète, dont 170 actifs sur la RTX 5090 ; 128 cœurs CUDA par SM (21 760 / 170) | Analyse de photo de la puce, Guru3D : https://www.guru3d.com/story/nvidia-gb202-blackwell-die-analysis-reveals-24576-cuda-core-configuration/ (organisation déduite de l'image, non publiée par NVIDIA ; elle sert au dessin, aucun de ces chiffres n'est affiché sauf 170 SM et 21 760 cœurs, vérifiés plus haut) |
| DLSS 4.5, mode 6X (mars 2026) | https://www.neowin.net/news/nvidia-introduces-dlss-45-dynamic-multi-frame-generation-and-a-6x-mode/ |

## Polices

| Police | Auteur | Licence | Source |
|---|---|---|---|
| Archivo (variable) | Omnibus-Type | SIL Open Font License 1.1 | Fontsource (à installer par npm) |
| Martian Mono (variable) | Evil Martians | SIL Open Font License 1.1 | Fontsource (à installer par npm) |

## Éclairage et textures

| Fichier | Source | Licence |
|---|---|---|
| `assets/hdri/studio_small_08_2k.hdr` | Poly Haven, « Studio Small 08 » : https://polyhaven.com/a/studio_small_08 (téléchargé via l'API publique, 2k) | CC0 |
| `assets/textures/metal009/` (`color.jpg`, `roughness.jpg`, `normal.jpg`) | ambientCG, « Metal 009 » (métal brossé) : https://ambientcg.com/view?id=Metal009 (1K-JPG) | CC0 |

| `assets/models/carte.glb` | Modélisé pour ce projet par scripts Blender (`outils/blender/`) ; la texture du PCB est générée par le script (`electronique.py`), sans ressource extérieure | Création du projet |
| `public/draco/` | Décodeur Draco fourni avec Three.js (`three/examples/jsm/libs/draco/gltf/`) | Apache 2.0 |

Le HDR est filtré à l'exécution (`src/scene/environnement.js`) : seules ses sources lumineuses sont gardées, les murs du studio sont éteints.

## Bibliothèques

| Bibliothèque | Licence |
|---|---|
| Three.js | MIT |
| GSAP | Licence standard GSAP (gratuite, y compris les plugins) |
| Lenis | MIT |
| Vite | MIT |
| Playwright (outil de capture, pas dans le site) | Apache 2.0 |
