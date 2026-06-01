import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Vite powers the interactive web demo in `web/` (a React app). The library
// itself is built separately with tsup (see `tsup.config.ts`) and stays
// dependency-free — React lives only in this demo.
export default defineConfig({
  root: 'web',
  base: './',
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, 'dist-web'),
    emptyOutDir: true,
  },
});
