import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const root = path.dirname(fileURLToPath(import.meta.url));
const storeDir = path.join(root, 'store');
const consoleDir = path.join(root, 'console');

/** `/` locally; `/repo-name/` on GitHub Pages (set BASE_PATH in CI). */
function viteBase(): string {
  const raw = process.env.BASE_PATH?.trim() || '/';
  if (raw === '/') return '/';
  return raw.endsWith('/') ? raw : `${raw}/`;
}

/** Dev-only: serve catalog console at /console/ (avoids SPA fallback to root index.html). */
function serveConsoleDir(): Plugin {
  const indexFile = path.join(consoleDir, 'aerovista_catalog_console_v2.html');
  return {
    name: 'av-serve-console-dir',
    configureServer(server) {
      server.middlewares.use('/console', (req, res, next) => {
        const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
        const rel = urlPath.replace(/^\/+/, '') || 'index.html';
        const filePath =
          rel === 'index.html' && fs.existsSync(indexFile)
            ? indexFile
            : path.join(consoleDir, rel);
        if (!filePath.startsWith(consoleDir)) {
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
            '.html': 'text/html; charset=utf-8',
            '.js': 'text/javascript; charset=utf-8',
            '.json': 'application/json; charset=utf-8',
          };
          res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
          res.end(data);
        });
      });
    },
  };
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
  plugins: [react(), serveConsoleDir(), serveStoreDir()],
  server: {
    port: 5174,
    strictPort: false,
    open: '/app.html',
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: path.resolve(root, 'app.html'),
    },
  },
});
