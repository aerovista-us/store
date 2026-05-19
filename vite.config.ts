import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const root = path.dirname(fileURLToPath(import.meta.url));
const storeDir = path.join(root, 'store');

/** `/` locally; `/repo-name/` on GitHub Pages (set BASE_PATH in CI). */
function viteBase(): string {
  const raw = process.env.BASE_PATH?.trim() || '/';
  if (raw === '/') return '/';
  return raw.endsWith('/') ? raw : `${raw}/`;
}

/** Dev-only: expose canonical store/ at /store for console v2 fetch paths (JSON; images use /shop/img/). */
function serveStoreDir(): Plugin {
  return {
    name: 'av-serve-store-dir',
    configureServer(server) {
      server.middlewares.use('/store', (req, res, next) => {
        const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
        const rel = urlPath.replace(/^\/+/, '');
        const filePath = path.join(storeDir, rel);
        if (!filePath.startsWith(storeDir)) {
          res.statusCode = 403;
          res.end('Forbidden');
          return;
        }
        fs.readFile(filePath, (err, data) => {
          if (err) {
            next();
            return;
          }
          const ext = path.extname(filePath).toLowerCase();
          const types: Record<string, string> = {
            '.json': 'application/json',
            '.js': 'text/javascript',
            '.html': 'text/html',
          };
          res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
          res.end(data);
        });
      });
    },
  };
}

export default defineConfig({
  base: viteBase(),
  plugins: [react(), serveStoreDir()],
  server: {
    port: 5174,
    strictPort: false,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
