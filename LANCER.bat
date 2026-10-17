@echo off
rem Double-clic : installe les dependances si besoin, lance le serveur local et ouvre le navigateur.
cd /d "%~dp0"
title Salle noire - serveur local

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js est introuvable.
  echo Installe la version LTS depuis https://nodejs.org puis relance ce fichier.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Premiere ouverture : installation des dependances, une minute environ...
  call npm install
  if errorlevel 1 (
    echo L'installation a echoue. Verifie ta connexion internet puis relance.
    pause
    exit /b 1
  )
)

echo Le site s'ouvre dans ton navigateur. Ferme cette fenetre pour arreter le serveur.
call npm run dev -- --open
pause
