import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const horizonRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.resolve(horizonRoot, "dist");
const manifestPath = path.resolve(horizonRoot, "release", "horizon-pages-manifest.json");
const auditOnly = process.argv.includes("--audit-only");
const maxPublicFileBytes = 10 * 1024 * 1024;

const productFields = [
  "id",
  "slug",
  "title",
  "subtitle",
  "collection",
  "location",
  "orientation",
  "className",
  "image",
  "wallImage",
  "secondaryImage",
  "alt",
  "story",
  "specs",
  "finishes",
  "featured",
  "collectionStatus",
  "publicVisible",
  "consumerVisible",
  "releasePriority",
  "status",
  "presentation",
  "placeholder",
  "published",
  "imageConfirmed",
];

const variantFields = [
  "id",
  "label",
  "priceCents",
  "cartKey",
  "squareVariationId",
  "sizeConfirmed",
  "squareMapped",
  "squareProductionReady",
  "checkoutReady",
];

const fixedFiles = [
  "index.html",
  "favicon.svg",
  "css/styles.css",
  "js/gallery.js",
  "gallery/room/horizon-lakehouse-room-v1.webp",
  "gallery/wall/gallery-interior.webp",
];

function assertInside(root, target) {
  const rootWithSeparator = path.resolve(root) + path.sep;
  const resolved = path.resolve(target);
  if (!resolved.startsWith(rootWithSeparator)) {
    throw new Error(`Refusing path outside ${root}: ${resolved}`);
  }
  return resolved;
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function copyPublicFile(relativePath) {
  const source = assertInside(horizonRoot, path.join(horizonRoot, relativePath));
  const destination = assertInside(distRoot, path.join(distRoot, relativePath));
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
    throw new Error(`Required public source is missing: ${relativePath}`);
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function pick(source, fields) {
  const result = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      result[field] = source[field];
    }
  }
  return result;
}

function publicCatalog(sourceCatalog) {
  return {
    schemaVersion: sourceCatalog.schemaVersion,
    channel: sourceCatalog.channel,
    currency: sourceCatalog.currency,
    updated: sourceCatalog.updated,
    products: (sourceCatalog.products || [])
      .filter((product) => product.publicVisible === true)
      .sort((left, right) => (left.releasePriority ?? 999) - (right.releasePriority ?? 999))
      .map((product) => {
        const customerProduct = pick(product, productFields);
        customerProduct.variants = (product.variants || [])
          .filter((variant) => variant.customerVisible !== false)
          .map((variant) => pick(variant, variantFields));
        return customerProduct;
      }),
  };
}

function listFiles(root, current = root) {
  const files = [];
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(root, absolute));
    else if (entry.isFile()) files.push(path.relative(root, absolute).replaceAll("\\", "/"));
  }
  return files.sort();
}

function expectedPublicFiles(catalog) {
  const media = new Set();
  for (const product of catalog.products || []) {
    for (const field of ["image", "wallImage", "secondaryImage"]) {
      if (product[field]) media.add(product[field].replaceAll("\\", "/"));
    }
  }
  return new Set([
    ".nojekyll",
    "catalog.generated.js",
    "catalog.json",
    ...fixedFiles,
    ...media,
  ]);
}

function audit() {
  if (!fs.existsSync(distRoot)) throw new Error("horizon/dist does not exist; build it first");

  const catalogPath = path.join(distRoot, "catalog.json");
  const generatedPath = path.join(distRoot, "catalog.generated.js");
  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  const serialized = JSON.stringify(catalog, null, 2);
  const expectedGenerated = [
    "/* Generated from the customer-safe catalog.json. Do not edit directly. */",
    `window.HORIZON_CATALOG = ${serialized};`,
    "",
  ].join("\n");
  if (fs.readFileSync(generatedPath, "utf8") !== expectedGenerated) {
    throw new Error("Public catalog.generated.js does not match public catalog.json");
  }

  const forbiddenCatalogTerms = [
    "issues",
    "sourceImage",
    "sourceSha256",
    "printfulMapped",
    "printfulSyncVariantId",
    "printfulDefaultFileName",
    "printfulPreviewFileName",
    "printfulCatalogVariantId",
    "providerSource",
  ];
  for (const term of forbiddenCatalogTerms) {
    if (serialized.includes(`\"${term}\"`)) {
      throw new Error(`Private catalog field reached the public artifact: ${term}`);
    }
  }

  if ((catalog.products || []).some((product) => product.publicVisible !== true || !product.published)) {
    throw new Error("Non-public product reached the public catalog");
  }

  const expected = expectedPublicFiles(catalog);
  const actual = listFiles(distRoot);
  for (const relativePath of actual) {
    if (!expected.has(relativePath)) {
      throw new Error(`Unexpected file in public artifact: ${relativePath}`);
    }
    const stat = fs.statSync(path.join(distRoot, relativePath));
    if (stat.size > maxPublicFileBytes) {
      throw new Error(`Public file exceeds 10 MiB: ${relativePath}`);
    }
  }
  for (const relativePath of expected) {
    if (!actual.includes(relativePath)) {
      throw new Error(`Expected public file is missing: ${relativePath}`);
    }
  }

  const manifest = {
    schemaVersion: 1,
    hostname: "horizon.aerovista.us",
    catalogUpdated: catalog.updated,
    products: catalog.products.length,
    checkoutReadyVariants: catalog.products
      .flatMap((product) => product.variants || [])
      .filter((variant) => variant.checkoutReady).length,
    files: actual.map((relativePath) => {
      const bytes = fs.readFileSync(path.join(distRoot, relativePath));
      return { path: relativePath, bytes: bytes.length, sha256: sha256(bytes) };
    }),
  };
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(
    `Horizon public artifact valid: ${actual.length} files, ${manifest.products} products, ` +
      `${manifest.checkoutReadyVariants} checkout-ready variants.`,
  );
}

function build() {
  if (distRoot !== path.resolve(horizonRoot, "dist")) {
    throw new Error(`Unexpected dist target: ${distRoot}`);
  }
  if (fs.existsSync(distRoot)) fs.rmSync(distRoot, { recursive: true, force: true });
  fs.mkdirSync(distRoot, { recursive: true });

  const sourceCatalog = JSON.parse(
    fs.readFileSync(path.join(horizonRoot, "catalog.json"), "utf8"),
  );
  const catalog = publicCatalog(sourceCatalog);
  if (catalog.products.length === 0) throw new Error("Public catalog has no products");

  for (const relativePath of fixedFiles) copyPublicFile(relativePath);
  for (const product of catalog.products) {
    for (const field of ["image", "wallImage", "secondaryImage"]) {
      if (product[field]) copyPublicFile(product[field]);
    }
  }

  const serialized = JSON.stringify(catalog, null, 2);
  fs.writeFileSync(path.join(distRoot, "catalog.json"), `${serialized}\n`, "utf8");
  fs.writeFileSync(
    path.join(distRoot, "catalog.generated.js"),
    [
      "/* Generated from the customer-safe catalog.json. Do not edit directly. */",
      `window.HORIZON_CATALOG = ${serialized};`,
      "",
    ].join("\n"),
    "utf8",
  );
  fs.writeFileSync(path.join(distRoot, ".nojekyll"), "", "utf8");
}

if (!auditOnly) build();
audit();
