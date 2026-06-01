import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Vite powers the interactive web demo in `web/`. The library itself is built
// separately with tsup (see `tsup.config.ts`).
export default defineConfig({
  root: 'web',
  base: './',
  build: {
    outDir: resolve(__dirname, 'dist-web'),
    emptyOutDir: true,
  },
});
