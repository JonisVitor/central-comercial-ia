import { defineConfig } from 'vite';

const proxy = { '/api/agent-runtime': { target: 'http://127.0.0.1:4174', changeOrigin: false } };

export default defineConfig({
  server: { host: '127.0.0.1', port: 4175, strictPort: true, proxy },
  preview: { host: '127.0.0.1', port: 4175, strictPort: true, proxy }
});
