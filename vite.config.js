import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Esta configuración detecta si estamos en GitHub Actions o en local/Firebase
export default defineConfig({
  plugins: [react()],
  // Si está en GitHub Actions, usa la subcarpeta. Si no, usa la raíz.
  base: process.env.GITHUB_ACTIONS ? '/facturas_seveter/' : '/',
  server: {
    port: 5173
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  optimizeDeps: {
    include: ['xlsx']
  }
});
