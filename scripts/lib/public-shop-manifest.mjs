/**
 * Customer-safe paths under store/ → public/shop → dist (GitHub Pages).
 * Everything else is operator-only and must not ship on gear.aerovista.us.
 */
export const PUBLIC_SHOP_ROOT_FILES = new Set([
  'index.html',
  'collection.html',
  'catalog.html',
  'policies.html',
  'about.html',
  'content-pages.css',
  'policy-content.js',
  'favicon.svg',
  'square_products_latest.json',
  'storefront_overlay.json',
  'checkout_ready_keys.json',
]);

/** Directories copied recursively (README.md excluded). */
export const PUBLIC_SHOP_DIRS = new Set(['img', 'js', 'audio']);

export function normalizeRelPath(rel) {
  return String(rel || '')
    .replace(/\\/g, '/')
    .replace(/^\.\/?/, '')
    .replace(/\/+$/, '');
}

/**
 * @param {string} relPath path relative to store/ (posix)
 */
export function isPublicShopPath(relPath) {
  const norm = normalizeRelPath(relPath);
  if (!norm || norm === '.') return true;

  const segments = norm.split('/');
  const root = segments[0];

  if (segments.length === 1) {
    if (PUBLIC_SHOP_DIRS.has(root)) return true;
    if (root === 'FOLDER_ROLE.md') return true;
    return PUBLIC_SHOP_ROOT_FILES.has(root);
  }

  if (!PUBLIC_SHOP_DIRS.has(root)) return false;

  const base = segments[segments.length - 1].toLowerCase();
  if (base === 'readme.md') return false;

  return true;
}

export const FORBIDDEN_PUBLIC_PATTERNS = [
  /(?:^|\/)_internal(?:\/|$)/i,
  /(?:^|\/)scripts(?:\/|$)/i,
  /(?:^|\/)commerce(?:\/|$)/i,
  /(?:^|\/)backend(?:\/|$)/i,
  /(?:^|\/)tools(?:\/|$)/i,
  /(?:^|\/)docs(?:\/|$)/i,
  /\.md$/i,
  /\.(py|pyc|sql|bat|sh|ps1)$/i,
  /\.(xlsx|csv|xlsm)$/i,
  /handoffnotes/i,
  /catalog_alignment_report/i,
  /^sot(?:_|\.)/i,
  /square_products_(?!latest\.json)/i,
  /square_products_latest(?:\.backup|2|_pre|_merged)/i,
  /square_products_cleaned/i,
  /storefront_overlay\.backup/i,
  /cart_sku_map/i,
  /howto_|store_health_dashboard|av_gear_shop_/i,
  /docker logs/i,
  /hook\.js/i,
  /package(-lock)?\.json$/i,
  /requirements\.txt$/i,
  /margin_reference|operator_margin|square_private_config/i,
  /\.env$/i,
];

export function isForbiddenPublicArtifact(relPath) {
  const norm = normalizeRelPath(relPath);
  if (!norm || norm === 'FOLDER_ROLE.md') return false;
  return FORBIDDEN_PUBLIC_PATTERNS.some((re) => re.test(norm));
}
