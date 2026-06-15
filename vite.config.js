import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: true, // abre el navegador solo al hacer `npm run dev`
    host: true, // accesible también desde otros dispositivos de tu red (móvil, etc.)
  },
  build: {
    target: 'esnext',
    sourcemap: true,
  },
  assetsInclude: ['**/*.ktx2', '**/*.hdr'],
});