/**
 * Audit production backend .env shape (no secret values printed).
 * Run on nxcore: node audit-backend-env.mjs
 * Or via ssh with path to backend/.env
 */
import fs from "node:fs";

const envPath = process.argv[2] || "/srv/Collab/mini.shops/AV-PNW.com/av_storefront/backend/.env";

function parseEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function mask(val, show = 4) {
  if (!val) return "(empty)";
  if (val.length <= show * 2) return `(${val.length} chars)`;
  return `${val.slice(0, show)}…${val.slice(-show)} (${val.length} chars)`;
}

const required = [
  "SQUARE_ENV",
  "SQUARE_ACCESS_TOKEN",
  "SQUARE_APP_ID",
  "SQUARE_LOCATION_ID",
  "DATABASE_URL",
];

const recommended = [
  "ALLOWED_ORIGINS",
  "CHECKOUT_CURRENCY",
  "SQUARE_FLAT_SHIPPING_CENTS",
  "SQUARE_VERSION",
  "OPS_SECRET",
];

let raw;
try {
  raw = fs.readFileSync(envPath, "utf8");
} catch (e) {
  console.error("Cannot read", envPath, e.message);
  process.exit(1);
}

const env = parseEnv(raw);
console.log("=== Backend .env audit ===");
console.log("Path:", envPath);
console.log("Keys:", Object.keys(env).length);

const issues = [];
const warnings = [];

for (const k of required) {
  if (!env[k]?.trim()) issues.push(`Missing or empty: ${k}`);
}

for (const k of recommended) {
  if (!env[k]?.trim()) warnings.push(`Missing or empty: ${k}`);
}

if (env.SQUARE_ENV !== "production") {
  warnings.push(`SQUARE_ENV=${env.SQUARE_ENV || "(empty)"} — expected production on nxcore`);
}

const origins = (env.ALLOWED_ORIGINS || env.ALLOWED_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const needOrigins = ["https://gear.aerovista.us", "https://aerovista-us.github.io"];
for (const o of needOrigins) {
  if (!origins.includes(o)) warnings.push(`ALLOWED_ORIGINS missing ${o}`);
}

if (env.SQUARE_SKU_MAP_JSON?.trim()) {
  try {
    const map = JSON.parse(env.SQUARE_SKU_MAP_JSON);
    const keys = Object.keys(map);
    const collisionKeys = keys.filter((k) => k.includes("__") && !k.includes("/"));
    console.log("\nSQUARE_SKU_MAP_JSON: parsed OK,", keys.length, "top-level keys");
    if (map.Default__M) {
      warnings.push(
        `SQUARE_SKU_MAP_JSON has Default__M → "${String(map.Default__M.name || "").slice(0, 50)}" (primary variationId: ${map.Default__M.variationId || "?"}) — checkout now uses client variationId + catalog mount; stale map can still affect bootstrap sellableCartKeys`
      );
    }
    const withNested = collisionKeys.filter((k) => map[k]?.variationsById).length;
    console.log("  Cart-key entries with variationsById:", withNested);
  } catch (e) {
    issues.push(`SQUARE_SKU_MAP_JSON invalid JSON: ${e.message}`);
  }
} else if (!env.SQUARE_SKU_MAP_FILE?.trim()) {
  warnings.push("No SQUARE_SKU_MAP_JSON or SQUARE_SKU_MAP_FILE — relies on catalog mount only");
}

if (!env.STORE_CATALOG_JSON?.trim()) {
  console.log("\nSTORE_CATALOG_JSON: (not set — uses default ../square_products_latest.json paths + /app mount)");
}

console.log("\n--- Values (masked) ---");
for (const k of [...new Set([...required, ...recommended, "SQUARE_SKU_MAP_JSON", "SQUARE_WEBHOOK_SIGNATURE_KEY", "OPS_SECRET", "PRINTFUL_API_TOKEN"])]) {
  if (!(k in env)) continue;
  if (k === "SQUARE_SKU_MAP_JSON") {
    console.log(k + ":", env[k]?.trim() ? `(inline JSON, ${env[k].length} chars)` : "(empty)");
  } else if (/TOKEN|SECRET|PASSWORD|KEY|DATABASE_URL|SQUARE_ACCESS/i.test(k)) {
    console.log(k + ":", mask(env[k]));
  } else {
    console.log(k + ":", env[k]?.slice(0, 120) || "(empty)");
  }
}

console.log("\nALLOWED_ORIGINS:", origins.length ? origins.join(", ") : "(empty — app.py defaults apply)");

if (issues.length) {
  console.log("\n[ERRORS]");
  issues.forEach((x) => console.log(" ", x));
}
if (warnings.length) {
  console.log("\n[WARNINGS]");
  warnings.forEach((x) => console.log(" ", x));
}
if (!issues.length && !warnings.length) console.log("\n[ok] No issues found");
process.exit(issues.length ? 1 : 0);
