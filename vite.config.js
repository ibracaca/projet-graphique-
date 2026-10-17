import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Deux pages : le site (index.html) et l'atelier de la carte (dev/carte.html),
// qui sert à comparer le modèle 3D aux photos de référence.
export default defineConfig({
  server: {
    port: 5173,
    strictPort: false, // si le port est pris (site déjà ouvert), Vite prend le suivant
    open: false,
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        site: resolve(import.meta.dirname, 'index.html'),
        carte: resolve(import.meta.dirname, 'dev/carte.html'),
      },
    },
  },
});
