/**
 * GitHub Pages postbuild: SPA 404, Jekyll off, custom domain CNAME.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const index = path.join(dist, 'index.html');
const cname = (process.env.PAGES_CNAME || 'gear.aerovista.us').trim();

if (!fs.existsSync(index)) {
  console.error('[gh-pages] Missing dist/index.html — run npm run build:pages first.');
  process.exit(1);
}

// Real 404 — do not mirror shop index (that would make /console/ etc. return 200 on Pages).
fs.writeFileSync(
  path.join(dist, '404.html'),
  `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>404</title></head>
<body><h1>404 Not Found</h1></body>
</html>
`,
  'utf8',
);
fs.writeFileSync(path.join(dist, '.nojekyll'), '\n');
fs.writeFileSync(path.join(dist, 'CNAME'), `${cname}\n`);

console.log(`[gh-pages] Wrote 404.html (minimal), .nojekyll, CNAME (${cname})`);
