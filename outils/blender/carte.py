# Construit le modèle de la carte et l'exporte dans assets/models/carte.glb.
# Usage (depuis la racine du projet) :
#   node outils/blender/dimensions.mjs
#   "C:\Program Files\Blender Foundation\Blender 5.0\blender.exe" --background --factory-startup --python outils/blender/carte.py
# Les pièces absentes du .glb restent construites par l'ancien code (src/carte/).
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import commun  # noqa: E402
import arriere  # noqa: E402
import coque  # noqa: E402
import ventilateurs  # noqa: E402

debut = time.time()
commun.vider()
ventilateurs.construire()
coque.construire()
arriere.construire()
commun.exporter('carte.glb')
print(f'carte.glb construit en {time.time() - debut:.1f} s')
