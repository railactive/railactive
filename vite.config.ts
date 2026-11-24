import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    svelte(),
    {
      name: 'production-docs-placeholder',
      closeBundle() {
        if (mode !== 'production') return;
        const distDocs = path.resolve(__dirname, 'dist/docs');
        const placeholderSrc = path.resolve(__dirname, 'src/docs-placeholder.html');
        fs.rmSync(distDocs, { recursive: true, force: true });
        fs.mkdirSync(distDocs, { recursive: true });
        fs.copyFileSync(placeholderSrc, path.join(distDocs, 'index.html'));
      }
    }
  ],
  server: {
    port: 5173
  },
  resolve: {
    conditions: ['browser', 'module', 'import', 'default']
  }
}));
