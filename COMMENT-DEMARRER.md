# Comment démarrer

0. (Conseillé) Dépose 6 à 10 photos de la RTX 5090 Gaming Trio dans `assets/reference/` : face, dos, profil, tranche du dessus, côté des ports, RGB allumé. Claude Code en cherchera aussi tout seul, mais les tiennes garantissent la fidélité.
1. Ouvre Claude Code dans ce dossier (« Projet Graphique »). Il lira tout seul `CLAUDE.md`, qui lui donne tes règles, tes documents et tes skills.
2. Colle-lui ce message :

   > Lis PROMPT.md et exécute-le.

3. Il s'arrêtera à chaque point de contrôle : sa charte `DESIGN.md`, la carte 3D comparée aux photos, puis la fin de chaque acte. Relis, corrige ce qui ne te plaît pas, puis dis-lui de continuer.

## Ce que contient le dossier

| Élément | Rôle |
|---|---|
| `CLAUDE.md` | Les règles permanentes, lues à chaque session. |
| `PROMPT.md` | Le brief complet du site. |
| `docs/` | Ta base de connaissances sur le design, plus l'analyse de la musique. |
| `skills/` | Tes skills GSAP, Three.js et motion-design (Claude Code les copiera dans `.claude/skills/` au démarrage ; s'il te demande la permission, accepte). |
| `assets/audio/genesis.mp3` | La musique. |
| `assets/` (autres dossiers) | Vides pour l'instant : Claude Code y rangera les ressources téléchargées. |

## Conseils

- Prends le modèle le plus puissant disponible et une réflexion élevée (dans Claude Code : `/model`).
- Le site est long à construire : laisse-le avancer acte par acte et vérifie à chaque fois.
- Si tu trouves un beau modèle 3D de la carte (fichier `.glb`), dépose-le dans `assets/models/` et dis-le à Claude Code.
