import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Build de un solo archivo: todo el CSS y el JS quedan inlineados dentro de
 * dist-standalone/index.html, sin ninguna referencia a ./assets ni imports
 * externos. Útil para desplegar o abrir el archivo suelto.
 */
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist-standalone',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    sourcemap: false,
  },
});
