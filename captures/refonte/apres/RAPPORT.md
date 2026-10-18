# Non-régression après la refonte 3D (18/10/2026)

Vérifié dans Chromium (Playwright) sur le vrai GPU de ce PC.

| Contrôle | Résultat |
|---|---|
| vh 0, noir pur (`noir.mjs`) à 1366, 1920, 2560 et 3840 px | 100,00 % de pixels noirs, valeur maximale 0 |
| 25 positions des 14 beats à 1920 px, 11 positions à 1366, 2560 et 3840 px | Captures dans ce dossier, planches `planche-1920-a.png` et `planche-1920-b.png` |
| Éclaté filaire (vh 860) | Lignes de construction lisibles, onze annotations accrochées |
| Courant (vh 1100, 1200) | Pistes sur le PCB, du connecteur au GPU |
| Souffle (vh 1640, 1720) | Rotors en rotation (13,5 rad mesurés en 1 s à plein régime), flux d'air |
| Thermique (vh 1880, 2040) | Coupe à hauteur du GPU, Core Pipes en section carrée |
| Plongée et microscope (vh 2250, 2330) | Die au même cadrage |
| Mémoire, image (vh 3060, 3300) | Pistes mémoire, image qui traverse la carte |
| Climax (vh 3520 à 3850) | Reconstruction, matière, studio, néons, dégradé sur les arêtes |
| Ville (vh 4030 à 4520) | Cinq passes par tuiles distinctes |
| Fiche, extinction (vh 4760, 5100) | Inchangées |
| Mode film | La musique avance (21,5 s) et le scroll suit (137 vh) ; une molette met en pause |
| Retour du bas jusqu'en haut | Images identiques à l'aller ; ville, néons et brouillard remis à 0 ; noir pur en haut |
| Version calme (`prefers-reduced-motion`) | Contenus présents, sans animation brusque |
| Console | Aucune erreur |
| Images par seconde (`mesure.mjs`, 8 moments chargés) | 59 à 62 à 1366, 1920, 2560 et 3840 px |
| Appels de dessin par image | Carte : 160 à 254 (dont la passe d'occlusion) ; ville : 62 à 80 |
