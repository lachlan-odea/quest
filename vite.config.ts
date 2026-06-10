import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Base path for asset URLs. GitHub Pages serves a project repo from a
// subpath (e.g. /quest/), so the CI deploy sets VITE_BASE=/quest/. Local dev
// and root-based hosts (Firebase) leave it as '/'.
const base = process.env.VITE_BASE || '/';

// https://vitejs.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true, // expose on LAN so you can test on a phone during the buck's weekend
    port: 5173,
  },
});
