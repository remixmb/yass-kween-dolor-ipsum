import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// A second, tiny build that emits the self-contained "Ipsumize the web"
// bookmarklet payload (web/ipsumize.ts) as dist-web/ipsumize.js — a single
// IIFE the bookmarklet injects into any page. Runs after the main demo build
// (`emptyOutDir: false` so it lands alongside it).
export default defineConfig({
  build: {
    outDir: resolve(__dirname, 'dist-web'),
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'web/ipsumize.ts'),
      formats: ['iife'],
      name: 'YassIpsumize',
      fileName: () => 'ipsumize.js',
    },
  },
});
