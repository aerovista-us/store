/**
 * Structural guardrails for the Plan 1A commerce-first Gear storefront.
 * This complements browser checks and the existing catalog/checkout audits.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const storeDir = path.join(root, "store");
const indexPath = path.join(storeDir, "index.html");
const aboutPath = path.join(storeDir, "about.html");
const policiesPath = path.join(storeDir, "policies.html");
const html = fs.readFileSync(indexPath, "utf8");

let failures = 0;
function check(label, condition) {
  if (condition) {
    console.log(`[ok] ${label}`);
    return;
  }
  failures += 1;
  console.error(`[error] ${label}`);
}

console.log("=== Plan 1A storefront conversion audit ===\n");

const featuredAt = html.indexOf('id="featuredProducts"');
const collectionsAt = html.indexOf('id="collectionsLanding"');

check("homepage featured-products section exists", featuredAt >= 0);
check("homepage product grid exists", /id="homeProductGrid"/.test(html));
check("homepage product status live region exists", /id="homeProductStatus"/.test(html));
check("featured products precede collection gateways", featuredAt >= 0 && collectionsAt >= 0 && featuredAt < collectionsAt);
check("featured product renderer exists", /function renderHomeProducts\s*\(/.test(html));
check("homepage renderer reuses productCardHtml", /function renderHomeProducts[\s\S]*?productCardHtml\(p[,)]/.test(html));
check("homepage renderer runs after catalog load", /renderHomeProducts\(\)/.test(html));
check("pre-product hero statistics were removed", !/<div class="heroStats"/.test(html));
check("pre-product curation system was removed", !/<div class="system"/.test(html));
check("Signal Lab moved off the shopping homepage", !/id="signalLab"/.test(html));
check("visitor-map guide moved off the shopping homepage", !/<div class="guideGrid"/.test(html));
check("header includes Collections", /href="index\.html#collectionsLanding"[^>]*>Collections</.test(html));
check("header includes About", /href="about\.html"[^>]*>About</.test(html));
check("brand uses a stable home URL", /class="brand" href="index\.html" id="homeLink"/.test(html));
check("catalog secondary tags use a disclosure", /<details[^>]*id="moreFilters"/.test(html));
check("footer has no placeholder links", !/<footer[\s\S]*?href="#"/.test(html));
check("About/Story page exists", fs.existsSync(aboutPath));
check("Policies page exists", fs.existsSync(policiesPath));

if (fs.existsSync(aboutPath)) {
  const about = fs.readFileSync(aboutPath, "utf8");
  check("About page contains story landmark", /id="story"/.test(about));
  check("About page returns to products", /catalog\.html/.test(about));
}

if (fs.existsSync(policiesPath)) {
  const policies = fs.readFileSync(policiesPath, "utf8");
  for (const id of ["faq", "shipping", "returns", "contact"]) {
    check(`Policies page contains ${id}`, new RegExp(`id="${id}"`).test(policies));
  }
}

const storedFirstMatches = html.match(/storedVid\s*\|\|\s*mappedVid/g) || [];
check("checkout continues to prefer stored variation IDs", storedFirstMatches.length >= 2);
check("legacy mapped-first checkout pattern is absent", !/mappedVid\s*\|\|\s*storedVid/.test(html));

console.log(`\n=== Done (${failures} error(s)) ===`);
process.exit(failures ? 1 : 0);
