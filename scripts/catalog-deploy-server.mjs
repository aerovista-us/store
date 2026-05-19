#!/usr/bin/env node
/**
 * Local deploy API for Catalog Console v2 ("Export → Deploy" button).
 * Binds to localhost only — writes into this repo's store/ folder.
 *
 *   npm run deploy:server
 *   POST http://127.0.0.1:5199/deploy  { "catalog": { ... }, "overlay": { ... }? }
 */
import http from 'node:http';
import { deployStoreCatalog } from './lib/deploy-store.mjs';

const PORT = Number(process.env.AV_DEPLOY_PORT || 5199);
const HOST = process.env.AV_DEPLOY_HOST || '127.0.0.1';

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    send(res, 204, {});
    return;
  }

  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    send(res, 200, { ok: true, service: 'av-store-catalog-deploy', port: PORT });
    return;
  }

  if (req.method === 'POST' && req.url === '/deploy') {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw || '{}');
      if (!body.catalog) {
        send(res, 400, { ok: false, error: 'Missing catalog in body' });
        return;
      }
      const result = deployStoreCatalog({
        catalog: body.catalog,
        overlay: body.overlay ?? null,
        runSync: body.runSync !== false,
      });
      send(res, 200, result);
    } catch (err) {
      send(res, 500, { ok: false, error: err?.message || String(err) });
    }
    return;
  }

  send(res, 404, { ok: false, error: 'Not found' });
});

server.listen(PORT, HOST, () => {
  console.log(`[deploy:server] http://${HOST}:${PORT} (POST /deploy)`);
});
