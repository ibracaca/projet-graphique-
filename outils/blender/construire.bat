@echo off
rem Reconstruit assets/models/carte.glb depuis les scripts Blender.
rem Double-clic, ou depuis la racine du projet : outils\blender\construire.bat
cd /d "%~dp0\..\.."
node outils/blender/dimensions.mjs
"C:\Program Files\Blender Foundation\Blender 5.0\blender.exe" --background --factory-startup --python outils/blender/carte.py
pause
