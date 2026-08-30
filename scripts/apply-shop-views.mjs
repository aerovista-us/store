/**
 * One-shot: remove inline collectionPages, add collectionView, close homeLanding.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = path.join(root, 'store', 'index.html');
let html = fs.readFileSync(p, 'utf8');

html = html.replace(
  /\s*<section class="landingSection" id="collectionPages">[\s\S]*?<\/section>\s*(?=<section class="landingSection" id="signalLab">)/,
  '\n'
);

const collectionView = fs.readFileSync(path.join(root, 'scripts', 'collection-view-snippet.html'), 'utf8');

if (!html.includes('id="collectionView"')) {
  html = html.replace(/(\s*<section id="productsSection")/, `${collectionView}\n$1`);
}

html = html.replace(/<motion\.motion\.div id="homeLanding">/g, '<div id="homeLanding">');
html = html.replace(/<motion\.div id="homeLanding">/g, '<div id="homeLanding">');

html = html.replace(
  '<p>Full catalog: search, filter by collection, and open product pages when you are ready.</p>',
  '<p>Search and filter by category. Every piece in one flat grid — no collection grouping.</p>'
);

fs.writeFileSync(p, html);
console.log('[apply-shop-views] collectionPages removed:', !html.includes('id="collectionPages"'));
console.log('[apply-shop-views] collectionView added:', html.includes('id="collectionView"'));
