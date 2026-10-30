import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/projet-graphique-/',
  server: {
    port: 5173,
    strictPort: false,
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