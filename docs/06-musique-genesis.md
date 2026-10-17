# La musique : Grimes, « Genesis »

Fichier : `assets/audio/genesis.mp3` (4 min 17 s, choisi par l'utilisateur). Usage privé, site non publié.

## 1. Analyse du morceau

Analyse faite avec librosa (énergie, basses sous 150 Hz, aigus au-dessus de 4 kHz, par fenêtres de 4 s). La courbe complète, toutes les 2 secondes, est dans `docs/genesis-energie.csv` (valeurs normalisées de 0 à 1).

- **Tempo** : environ 83 BPM, soit un temps toutes les **0,72 s**. Premier temps détecté vers **1,37 s**.
- **0:00 à 0:32** : presque uniquement des sous-basses. Le centre de gravité du spectre reste autour de 400 Hz : le son est **étouffé**, comme entendu à travers un boîtier fermé.
- **0:32 à 1:04** : le son s'entrouvre (centre du spectre vers 1 200 Hz), les premiers aigus arrivent.
- **1:04** : **explosion des aigus**, le morceau s'ouvre en grand.
- **1:16 à 1:50** : basses pleines, section dense.
- **1:52 à 2:12** : les basses disparaissent, les aigus sont au maximum. Section aérienne, en apesanteur.
- **2:14 à 2:30** : retour des basses.
- **2:32 à 2:46** : creux, respiration avant le sommet.
- **2:48 à 3:10** : **le sommet absolu du morceau** (énergie et basses au maximum).
- **3:12 à 3:34** : basses coupées, aigus seuls.
- **3:36 à 4:08** : outro qui s'amincit.
- **4:08 à 4:17** : extinction.

La voix de Grimes est un souffle traité comme un instrument : elle ne gêne pas la lecture. Le titre veut dire « naissance » : celle de la carte qui s'allume, celle d'une image qui se calcule.

## 2. Cue sheet (feuille de synchro)

| Temps | Musique | Beat du site |
|---|---|---|
| 0:00 | sous-basses étouffées | 0. Démarrage |
| 0:16 | | 1. L'ombre |
| 0:33 | le son s'entrouvre | 2. L'éclaté |
| 1:04 | explosion des aigus | 3. Le courant |
| 1:16 | basses pleines | 4. Le silence (bref) puis 5. Le souffle |
| 1:28 | section dense | 6. Vision thermique |
| 1:52 | basses absentes, aigus aériens | 7. Puissances de dix |
| 2:14 | retour des basses | 8. La puce |
| 2:32 | creux | 9. La mémoire, puis 10. 4,2 ms (vers 2:40) |
| **2:48** | **le sommet** | **11. Reconstruction et allumage RGB** |
| 3:12 | basses coupées | 12. Le rendu qui se calcule |
| 3:36 | outro qui s'amincit | 13. Fiche technique, comme un générique |
| 4:08 | extinction | 14. Footer, puis tout s'éteint |

Ces temps sont des repères à affiner : vérifie-les toi-même sur la courbe CSV ou par ta propre analyse, et cale chaque début de beat sur le temps musical le plus proche (multiple de 0,72 s à partir de 1,37 s).

## 3. Comment le site et la musique se parlent

Le visiteur scrolle à sa vitesse, la musique avance à la sienne. Trois mécanismes combinés :

**a. Le site réagit au son (toujours actif).** Web Audio API : `audio` → `MediaElementAudioSourceNode` → `BiquadFilterNode` (lowpass) → `GainNode` → `AnalyserNode` → sortie. On lit l'analyseur à chaque image :
- basses : vitesse des ventilateurs, pulsation des liserés lumineux, respiration du bloom ;
- aigus : scintillement des annotations, poussière lumineuse, particules de la puce ;
- détection des temps : les vagues de cœurs CUDA et certains labels HUD tombent sur les temps.
Lisse les valeurs (moyenne glissante) pour que rien ne tremble nerveusement.

**b. Le scroll ouvre le son (acte I).** De la première section jusqu'au beat « Le courant », la fréquence de coupure du filtre passe d'environ 350 Hz à pleine ouverture (20 kHz), sur une courbe exponentielle. On entend la musique à travers le boîtier, puis le boîtier s'ouvre. Au beat « Le silence », le gain baisse pendant 2 secondes (vers 25 %) avec un filtre qui se referme un peu, puis tout revient quand les ventilateurs s'éveillent.

**c. Le « Mode film ».** Un bouton fait défiler le site tout seul, au rythme du morceau : la position du scroll est calculée à partir de `audio.currentTime`, par interpolation entre les points de la cue sheet (chaque beat a un temps musical et une position de scroll). Résultat : l'allumage RGB tombe pile sur le sommet de 2:48. Si le visiteur touche à la molette ou au clavier, le mode film se met en pause proprement et le scroll libre reprend.

## 4. Contraintes

- Les navigateurs bloquent le son avant un geste du visiteur : le bouton « Allumer » de l'écran de démarrage lance l'`AudioContext` et la lecture d'un même clic.
- Ouvert en `file://`, Chrome rend l'analyseur muet (origine locale) : le site doit tourner sur un serveur local (voir `CLAUDE.md`).
- Bouton son visible en permanence (couper, remettre), et une option « sans son » à l'écran de démarrage.
