import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
const backend = { target:process.env.XGSZ_API_TARGET || 'http://127.0.0.1:8080', changeOrigin:false };
export default defineConfig({ server: { proxy: { '/api': backend, '/media': backend } }, build: { rollupOptions: { input: { main: fileURLToPath(new URL('./index.html', import.meta.url)), admin: fileURLToPath(new URL('./admin.html', import.meta.url)) } } } });
