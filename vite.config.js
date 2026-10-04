import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0'
  },
  base: '/moon-autoparts/' // <--- Tambahkan baris ini (jangan lupa tanda koma di atasnya)
});
