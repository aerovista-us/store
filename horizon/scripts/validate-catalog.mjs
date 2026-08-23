import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const horizonRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(horizonRoot, "catalog.json");
const generatedCatalogPath = path.join(horizonRoot, "catalog.generated.js");
const squareMapPath = path.join(horizonRoot, "commerce", "square-sku-map.horizon.json");
const printfulMapPath = path.join(horizonRoot, "commerce", "printful-variant-map.horizon.json");
const printfulSnapshotPath = path.join(horizonRoot, "commerce", "printful-product-snapshot-2026-07-27.json");
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const squareMap = JSON.parse(fs.readFileSync(squareMapPath, "utf8"));
const printfulMap = JSON.parse(fs.readFileSync(printfulMapPath, "utf8"));
const printfulSnapshot = JSON.parse(fs.readFileSync(printfulSnapshotPath, "utf8"));
const printfulEvidenceByProductId = new Map(
  (printfulSnapshot.products || []).map((product) => [product.productId, product]),
);
const errors = [];
const productIds = new Set();
const variantIds = new Set();
const cartKeys = new Set();
const allowedCollectionStatuses = new Set([
  "featured",
  "conditional",
  "b2b_only",
  "hidden_archive",
  "seasonal_hold",
  "custom_only",
  "skip_print",
  "retired",
]);
const expectedGeneratedCatalog = [
  "/* Generated from catalog.json. Do not edit directly. */",
  "window.HORIZON_CATALOG = " + JSON.stringify(catalog, null, 2) + ";",
  "",
].join("\n");

if (!fs.existsSync(generatedCatalogPath)) {
  errors.push("catalog.generated.js is missing; run scripts/build-catalog-fallback.mjs");
} else if (fs.readFileSync(generatedCatalogPath, "utf8") !== expectedGeneratedCatalog) {
  errors.push("catalog.generated.js is stale; run scripts/build-catalog-fallback.mjs");
}

function requireValue(value, message) {
  if (value === undefined || value === null || value === "") errors.push(message);
}

for (const product of catalog.products || []) {
  requireValue(product.id, "Product is missing id");
  if (productIds.has(product.id)) errors.push(`Duplicate product id: ${product.id}`);
  productIds.add(product.id);
  requireValue(product.collectionStatus, `${product.id}: collectionStatus is required`);
  if (!allowedCollectionStatuses.has(product.collectionStatus)) {
    errors.push(`${product.id}: unsupported collectionStatus ${product.collectionStatus}`);
  }
  if (typeof product.publicVisible !== "boolean") {
    errors.push(`${product.id}: publicVisible must be boolean`);
  }
  if (typeof product.consumerVisible !== "boolean") {
    errors.push(`${product.id}: consumerVisible must be boolean`);
  }
  if (product.consumerVisible && !product.publicVisible) {
    errors.push(`${product.id}: consumerVisible requires publicVisible`);
  }
  if (typeof product.b2bVisible !== "boolean") {
    errors.push(`${product.id}: b2bVisible must be boolean`);
  }
  if (product.preserveRecord !== true) {
    errors.push(`${product.id}: preserveRecord must be true`);
  }
  if (product.published !== product.publicVisible) {
    errors.push(`${product.id}: published must mirror publicVisible during the compatibility transition`);
  }
  if (product.publicVisible && (product.collectionStatus !== "featured" || product.featured !== true)) {
    errors.push(`${product.id}: publicVisible products must be featured`);
  }
  if (!product.publicVisible && product.featured === true) {
    errors.push(`${product.id}: hidden products cannot be featured`);
  }

  if (!Array.isArray(product.variants) || product.variants.length === 0) {
    errors.push(`${product.id}: at least one variant is required`);
  }

  if (product.published) {
    for (const field of ["slug", "title", "subtitle", "collection", "location", "image", "alt", "story"]) {
      requireValue(product[field], `${product.id}: published product is missing ${field}`);
    }
    if (!product.imageConfirmed && !product.placeholder) {
      errors.push(`${product.id}: published product requires a confirmed image or explicit placeholder`);
    }
    if (product.placeholder && product.imageConfirmed) {
      errors.push(`${product.id}: placeholder must not be marked imageConfirmed`);
    }
    if (product.placeholder && (product.variants || []).some((variant) => variant.checkoutReady)) {
      errors.push(`${product.id}: placeholder product cannot be checkout-ready`);
    }
  }
  if (product.imageConfirmed || product.placeholder) {
    requireValue(product.image, `${product.id}: image or placeholder requires image path`);
    if (product.image && !fs.existsSync(path.join(horizonRoot, product.image))) {
      errors.push(`${product.id}: image does not exist: ${product.image}`);
    }
  }
  for (const mediaField of ["wallImage", "secondaryImage", "sourceImage"]) {
    if (product[mediaField] && !fs.existsSync(path.join(horizonRoot, product[mediaField]))) {
      errors.push(`${product.id}: ${mediaField} does not exist: ${product[mediaField]}`);
    }
  }
  if (product.sourceArtworkConfirmed) {
    requireValue(product.sourceImage, `${product.id}: sourceArtworkConfirmed requires sourceImage`);
  }
  if (product.sourceSha256 && product.sourceImage) {
    const localSourcePath = path.join(horizonRoot, product.sourceImage);
    if (fs.existsSync(localSourcePath)) {
      const localSha256 = crypto.createHash("sha256")
        .update(fs.readFileSync(localSourcePath))
        .digest("hex");
      if (localSha256 !== product.sourceSha256) {
        errors.push(`${product.id}: local source artwork disagrees with sourceSha256`);
      }
    }
  }
  if (product.presentation === "diptych" && !product.secondaryImage) {
    errors.push(`${product.id}: diptych presentation requires secondaryImage`);
  }

  for (const variant of product.variants || []) {
    requireValue(variant.id, `${product.id}: variant is missing id`);
    if (variantIds.has(variant.id)) errors.push(`Duplicate variant id: ${variant.id}`);
    variantIds.add(variant.id);
    if (!Number.isInteger(variant.priceCents) || variant.priceCents <= 0) {
      errors.push(`${variant.id}: priceCents must be a positive integer`);
    }
    if (variant.cartKey) {
      if (cartKeys.has(variant.cartKey)) errors.push(`Duplicate cartKey: ${variant.cartKey}`);
      cartKeys.add(variant.cartKey);
    }
    if (variant.squareMapped) {
      for (const field of ["catalogSku", "cartKey", "squareVariationId"]) {
        requireValue(variant[field], `${variant.id}: squareMapped requires ${field}`);
      }
      const mapped = squareMap[variant.cartKey];
      if (!mapped) {
        errors.push(`${variant.id}: cartKey is missing from square-sku-map.horizon.json`);
      } else {
        if (mapped.variationId !== variant.squareVariationId) {
          errors.push(`${variant.id}: Square variation ID disagrees with the Horizon Square map`);
        }
        if (mapped.cents !== variant.priceCents) {
          errors.push(`${variant.id}: price disagrees with the Horizon Square map`);
        }
      }
    }
    if (variant.printfulSyncVerified) {
      requireValue(variant.printfulSyncVariantId, `${variant.id}: printfulSyncVerified requires printfulSyncVariantId`);
      if (printfulMap[variant.squareVariationId] !== variant.printfulSyncVariantId) {
        errors.push(`${variant.id}: Printful sync ID disagrees with the verified Printful map`);
      }
      const evidence = printfulEvidenceByProductId.get(product.id);
      if (!evidence) {
        errors.push(`${variant.id}: product is missing from the sanitized Printful snapshot`);
      } else {
        if (!evidence.expectedVariantFound) {
          errors.push(`${variant.id}: expected variant was not found in the Printful snapshot`);
        }
        const providerVariant = (evidence.matchedVariants || [])
          .find((item) => String(item.id) === String(variant.printfulSyncVariantId));
        if (!providerVariant) {
          errors.push(`${variant.id}: sync variant is missing from matched Printful snapshot variants`);
        } else {
          if (providerVariant.enabled !== true || providerVariant.availabilityStatus !== "active") {
            errors.push(`${variant.id}: Printful snapshot variant is not active and enabled`);
          }
          if (Math.round(Number(providerVariant.retailPrice) * 100) !== variant.priceCents) {
            errors.push(`${variant.id}: price disagrees with the Printful snapshot`);
          }
          if (providerVariant.externalId !== variant.squareVariationId) {
            errors.push(`${variant.id}: Square variation ID disagrees with Printful externalId`);
          }
          if (providerVariant.sku !== variant.catalogSku) {
            errors.push(`${variant.id}: catalog SKU disagrees with the Printful snapshot`);
          }
          if (Number(providerVariant.catalogVariantId) !== Number(variant.printfulCatalogVariantId)) {
            errors.push(`${variant.id}: catalog variant ID disagrees with the Printful snapshot`);
          }
          const files = providerVariant.files || [];
          if (!files.some((file) => file.type === "default" && file.filename === variant.printfulDefaultFileName)) {
            errors.push(`${variant.id}: default file disagrees with the Printful snapshot`);
          }
          if (!files.some((file) => file.type === "preview" && file.filename === variant.printfulPreviewFileName)) {
            errors.push(`${variant.id}: preview file disagrees with the Printful snapshot`);
          }
          if (product.mockupConfirmed && product.image) {
            const previewFile = files.find(
              (file) => file.type === "preview" && file.filename === variant.printfulPreviewFileName,
            );
            const localImagePath = path.join(horizonRoot, product.image);
            if (previewFile?.hash && fs.existsSync(localImagePath)) {
              const localMd5 = crypto.createHash("md5")
                .update(fs.readFileSync(localImagePath))
                .digest("hex");
              if (localMd5 !== previewFile.hash) {
                errors.push(`${variant.id}: local storefront mockup disagrees with the Printful preview hash`);
              }
            }
          }
          if (product.providerSourceMatchConfirmed && product.sourceArtworkConfirmed && product.sourceImage) {
            const defaultFile = files.find(
              (file) => file.type === "default" && file.filename === variant.printfulDefaultFileName,
            );
            const localSourcePath = path.join(horizonRoot, product.sourceImage);
            if (defaultFile?.hash && fs.existsSync(localSourcePath)) {
              const localMd5 = crypto.createHash("md5")
                .update(fs.readFileSync(localSourcePath))
                .digest("hex");
              if (localMd5 !== defaultFile.hash) {
                errors.push(`${variant.id}: local source artwork disagrees with the Printful default-file hash`);
              }
            }
          }
        }
      }
    }
    if (variant.checkoutReady) {
      for (const flag of ["sizeConfirmed", "squareMapped", "squareProductionReady", "printfulMapped"]) {
        if (variant[flag] !== true) errors.push(`${variant.id}: checkoutReady requires ${flag}=true`);
      }
      for (const field of ["catalogSku", "cartKey", "squareVariationId"]) {
        requireValue(variant[field], `${variant.id}: checkoutReady requires ${field}`);
      }
      const proofGatePassed = product.proofApproved === true ||
        (product.commerceApproved === true && typeof product.proofWaiver === "string" && product.proofWaiver.trim());
      if (!proofGatePassed) {
        errors.push(`${variant.id}: checkoutReady requires proofApproved=true or a recorded commerce proof waiver`);
      }
    }
  }
}

if (errors.length) {
  console.error(`Horizon catalog validation failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const published = (catalog.products || []).filter((product) => product.published).length;
const checkoutReady = (catalog.products || []).flatMap((product) => product.variants || [])
  .filter((variant) => variant.checkoutReady).length;
console.log(`Horizon catalog valid: ${productIds.size} products, ${variantIds.size} variants, ${published} published, ${checkoutReady} checkout-ready.`);
