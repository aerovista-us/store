const crypto = require("node:crypto");

class CanonicalCatalogError extends Error {
  constructor(message, { code = "canonical_catalog_error", details = null } = {}) {
    super(message);
    this.name = "CanonicalCatalogError";
    this.code = code;
    this.details = details;
  }
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function newCanonicalId(kind) {
  const prefix = kind === "product" ? "avp" : "avv";
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function canonicalState(value = {}) {
  const source = isObject(value) ? clone(value) : {};
  const catalog = isObject(source.catalog) ? source.catalog : {};
  if (!Array.isArray(catalog.products)) catalog.products = [];
  catalog.schemaVersion = 1;

  const providers = isObject(source.providers) ? source.providers : {};
  for (const provider of Object.values(providers)) {
    if (!isObject(provider)) continue;
    if (!isObject(provider.products)) provider.products = {};
    if (!isObject(provider.variants)) provider.variants = {};
  }

  return {
    schemaVersion: 1,
    catalog,
    providers,
  };
}

function providerProductRef(product, provider) {
  const nested = product?.providerRefs?.[provider];
  return String(
    nested?.productId ||
      nested?.itemId ||
      product?.providerProductId ||
      product?.referenceHandle ||
      product?.reference_handle ||
      (provider === "square" ? product?.squareReferenceHandle : "") ||
      "",
  ).trim();
}

function providerVariantRef(variant, provider) {
  const nested = variant?.providerRefs?.[provider];
  return String(
    nested?.variantId ||
      nested?.variationId ||
      variant?.providerVariationId ||
      (provider === "square"
        ? variant?.squareVariationId || variant?.square_variation_id || variant?.variation_id
        : "") ||
      "",
  ).trim();
}

function catalogIndex(catalog) {
  const products = new Map();
  const variants = new Map();
  const variantProduct = new Map();

  for (const product of catalog?.products || []) {
    const productId = String(product?.id || "").trim();
    if (!productId) {
      throw new CanonicalCatalogError("Canonical catalog product is missing an id.", {
        code: "missing_canonical_product_id",
      });
    }
    if (products.has(productId)) {
      throw new CanonicalCatalogError(`Duplicate canonical product id '${productId}'.`, {
        code: "duplicate_canonical_product_id",
        details: { productId },
      });
    }
    products.set(productId, product);

    for (const variant of Array.isArray(product?.variants) ? product.variants : []) {
      const variantId = String(variant?.id || "").trim();
      if (!variantId) {
        throw new CanonicalCatalogError(`Canonical product '${productId}' has a variant without an id.`, {
          code: "missing_canonical_variant_id",
          details: { productId },
        });
      }
      if (variants.has(variantId)) {
        throw new CanonicalCatalogError(`Duplicate canonical variant id '${variantId}'.`, {
          code: "duplicate_canonical_variant_id",
          details: { variantId },
        });
      }
      variants.set(variantId, variant);
      variantProduct.set(variantId, productId);
    }
  }

  return { products, variants, variantProduct };
}

function providerIndex(state, provider) {
  const providerState = state.providers?.[provider] || { products: {}, variants: {} };
  const productRefs = new Map(Object.entries(providerState.products || {}));
  const variantRefs = new Map(Object.entries(providerState.variants || {}));
  return { productRefs, variantRefs };
}

function ensureProviderMappingsPointToCatalog(state, provider) {
  const index = catalogIndex(state.catalog);
  const refs = providerIndex(state, provider);
  const conflicts = [];

  for (const [providerRef, productId] of refs.productRefs) {
    if (!index.products.has(productId)) {
      conflicts.push({
        code: "stale_product_mapping",
        provider,
        providerRef,
        productId,
      });
    }
  }
  for (const [providerRef, variantId] of refs.variantRefs) {
    if (!index.variants.has(variantId)) {
      conflicts.push({
        code: "stale_variant_mapping",
        provider,
        providerRef,
        variantId,
      });
    }
  }

  return { index, refs, conflicts };
}

function importProviderIndexes(catalog, provider) {
  const productRefs = new Map();
  const variantRefs = new Map();
  const conflicts = [];

  for (const [productIndex, product] of (catalog?.products || []).entries()) {
    const productRef = providerProductRef(product, provider);
    if (productRef) {
      if (productRefs.has(productRef)) {
        conflicts.push({
          code: "duplicate_import_product_ref",
          provider,
          providerRef: productRef,
          firstIndex: productRefs.get(productRef),
          secondIndex: productIndex,
        });
      } else {
        productRefs.set(productRef, productIndex);
      }
    }

    for (const [variantIndex, variant] of (Array.isArray(product?.variants) ? product.variants : []).entries()) {
      const variantRef = providerVariantRef(variant, provider);
      if (!variantRef) {
        conflicts.push({
          code: "missing_import_variant_ref",
          provider,
          productIndex,
          variantIndex,
        });
        continue;
      }
      if (variantRefs.has(variantRef)) {
        conflicts.push({
          code: "duplicate_import_variant_ref",
          provider,
          providerRef: variantRef,
          first: variantRefs.get(variantRef),
          second: { productIndex, variantIndex },
        });
      } else {
        variantRefs.set(variantRef, { productIndex, variantIndex });
      }
    }
  }

  return { productRefs, variantRefs, conflicts };
}

function diffFields(before, next, fields) {
  const changes = [];
  for (const field of fields) {
    const a = before?.[field] ?? null;
    const b = next?.[field] ?? null;
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changes.push({ field, before: a, after: b });
    }
  }
  return changes;
}

function matchImportedProduct({ product, provider, refs, index }) {
  const productRef = providerProductRef(product, provider);
  const directProductId = productRef ? refs.productRefs.get(productRef) : null;
  const variantProductIds = new Set();

  for (const variant of Array.isArray(product?.variants) ? product.variants : []) {
    const variantRef = providerVariantRef(variant, provider);
    const variantId = variantRef ? refs.variantRefs.get(variantRef) : null;
    if (variantId) {
      const productId = index.variantProduct.get(variantId);
      if (productId) variantProductIds.add(productId);
    }
  }

  if (directProductId && variantProductIds.size && !variantProductIds.has(directProductId)) {
    return {
      conflict: {
        code: "product_variant_mapping_conflict",
        provider,
        providerProductRef: productRef,
        mappedProductId: directProductId,
        variantProductIds: [...variantProductIds],
      },
    };
  }
  if (variantProductIds.size > 1) {
    return {
      conflict: {
        code: "variants_map_to_multiple_products",
        provider,
        providerProductRef: productRef || null,
        variantProductIds: [...variantProductIds],
      },
    };
  }

  return {
    productId: directProductId || [...variantProductIds][0] || null,
    productRef,
  };
}

/**
 * Review a provider import against the Console-owned canonical catalog.
 *
 * Provider IDs are matching evidence, never canonical IDs. Renaming a product,
 * editing a SKU, or changing a price therefore cannot change product/variant
 * identity once a provider mapping has been accepted.
 */
function reviewProviderImport({ state: rawState, catalog, provider = "square" }) {
  if (!Array.isArray(catalog?.products)) {
    throw new CanonicalCatalogError("Provider import must contain a products array.", {
      code: "invalid_provider_catalog",
    });
  }
  const state = canonicalState(rawState);
  const { index, refs, conflicts: staleMappings } = ensureProviderMappingsPointToCatalog(state, provider);
  const imported = importProviderIndexes(catalog, provider);
  const conflicts = [...staleMappings, ...imported.conflicts];
  const matchedProducts = [];
  const newProducts = [];
  const newVariants = [];
  const changes = [];
  const seenCanonicalProducts = new Set();
  const seenCanonicalVariants = new Set();

  for (const [productIndex, product] of catalog.products.entries()) {
    const match = matchImportedProduct({ product, provider, refs, index });
    if (match.conflict) {
      conflicts.push({ ...match.conflict, productIndex });
      continue;
    }

    if (!match.productId) {
      const stableVariantRefs = (Array.isArray(product?.variants) ? product.variants : [])
        .map((variant) => providerVariantRef(variant, provider))
        .filter(Boolean);
      if (product?.identityReviewRequired || (!match.productRef && !stableVariantRefs.length)) {
        conflicts.push({
          code: product?.identityReviewRequired
            ? "provider_product_identity_review_required"
            : "new_product_missing_provider_identity",
          provider,
          productIndex,
          name: product?.name || null,
        });
      }
      newProducts.push({
        productIndex,
        providerProductRef: match.productRef || null,
        name: product?.name || null,
        variantCount: Array.isArray(product?.variants) ? product.variants.length : 0,
      });
      continue;
    }

    const canonicalProduct = index.products.get(match.productId);
    if (!canonicalProduct) continue;
    seenCanonicalProducts.add(match.productId);
    matchedProducts.push({
      productIndex,
      productId: match.productId,
      providerProductRef: match.productRef || null,
      name: product?.name || null,
    });

    const productChanges = diffFields(canonicalProduct, product, [
      "name",
      "description",
      "category",
      "collection",
      "visibility",
      "image",
      "tags",
      "seoTitle",
      "seoDescription",
    ]);
    if (productChanges.length) {
      changes.push({ type: "product", productId: match.productId, changes: productChanges });
    }

    for (const [variantIndex, variant] of (Array.isArray(product?.variants) ? product.variants : []).entries()) {
      const variantRef = providerVariantRef(variant, provider);
      if (!variantRef) continue;
      const variantId = refs.variantRefs.get(variantRef);
      if (!variantId) {
        newVariants.push({
          productIndex,
          variantIndex,
          productId: match.productId,
          providerVariantRef: variantRef,
          sku: variant?.sku || null,
        });
        continue;
      }
      const owningProductId = index.variantProduct.get(variantId);
      if (owningProductId !== match.productId) {
        conflicts.push({
          code: "variant_mapped_to_other_product",
          provider,
          providerVariantRef: variantRef,
          variantId,
          mappedProductId: owningProductId,
          importProductId: match.productId,
        });
        continue;
      }
      seenCanonicalVariants.add(variantId);
      const canonicalVariant = index.variants.get(variantId);
      const variantChanges = diffFields(canonicalVariant, variant, [
        "sku",
        "size",
        "color",
        "price",
        "visibility",
      ]);
      if (variantChanges.length) {
        changes.push({
          type: "variant",
          productId: match.productId,
          variantId,
          changes: variantChanges,
        });
      }
    }
  }

  const missingProviderProducts = [];
  for (const [providerRef, productId] of refs.productRefs) {
    if (!imported.productRefs.has(providerRef)) {
      missingProviderProducts.push({ providerProductRef: providerRef, productId });
    }
  }

  const missingProviderVariants = [];
  for (const [providerRef, variantId] of refs.variantRefs) {
    if (!imported.variantRefs.has(providerRef)) {
      missingProviderVariants.push({
        providerVariantRef: providerRef,
        variantId,
        productId: index.variantProduct.get(variantId) || null,
      });
    }
  }

  return {
    schemaVersion: 1,
    provider,
    canApply: conflicts.length === 0,
    conflicts,
    matchedProducts,
    newProducts,
    newVariants,
    changes,
    missingProviderProducts,
    missingProviderVariants,
    summary: {
      importedProducts: catalog.products.length,
      matchedProducts: matchedProducts.length,
      newProducts: newProducts.length,
      newVariants: newVariants.length,
      changedEntities: changes.length,
      missingProviderProducts: missingProviderProducts.length,
      missingProviderVariants: missingProviderVariants.length,
      conflicts: conflicts.length,
    },
  };
}

function stripProductProviderFields(product) {
  const cleaned = clone(product || {});
  delete cleaned.providerRefs;
  delete cleaned.providerProductId;
  delete cleaned.referenceHandle;
  delete cleaned.reference_handle;
  delete cleaned.squareReferenceHandle;
  delete cleaned.squareItemId;
  delete cleaned.square_item_id;
  return cleaned;
}

function stripVariantProviderFields(variant) {
  const cleaned = clone(variant || {});
  delete cleaned.providerRefs;
  delete cleaned.providerVariationId;
  delete cleaned.squareVariationId;
  delete cleaned.square_variation_id;
  delete cleaned.variation_id;
  delete cleaned.squareVariantId;
  return cleaned;
}

function variantById(product, variantId) {
  return (product?.variants || []).find((variant) => variant.id === variantId) || null;
}

/**
 * Accept a reviewed provider import into Console authority.
 *
 * Existing canonical IDs are preserved. New products/variants receive new AV
 * IDs. Canonical entities missing from the provider import are retained rather
 * than deleted; the review result is where an operator decides whether to hide,
 * retire, relink, or otherwise change lifecycle state.
 */
function applyProviderImport({
  state: rawState,
  catalog,
  provider = "square",
  idFactory = newCanonicalId,
  now = new Date().toISOString(),
}) {
  const state = canonicalState(rawState);
  const review = reviewProviderImport({ state, catalog, provider });
  if (!review.canApply) {
    throw new CanonicalCatalogError("Provider import has unresolved identity conflicts.", {
      code: "provider_import_conflict",
      details: { conflicts: review.conflicts },
    });
  }

  if (!state.providers[provider]) state.providers[provider] = { products: {}, variants: {} };
  const providerState = state.providers[provider];
  const index = catalogIndex(state.catalog);
  const refs = providerIndex(state, provider);

  for (const importedProduct of catalog.products) {
    const match = matchImportedProduct({ product: importedProduct, provider, refs, index });
    const importedProductRef = match.productRef;
    let productId = match.productId;
    let canonicalProduct = productId ? index.products.get(productId) : null;

    if (!canonicalProduct) {
      const stableVariantRefs = (Array.isArray(importedProduct?.variants) ? importedProduct.variants : [])
        .map((variant) => providerVariantRef(variant, provider))
        .filter(Boolean);
      if (importedProduct?.identityReviewRequired || (!importedProductRef && !stableVariantRefs.length)) {
        throw new CanonicalCatalogError("New provider product requires reviewable provider identity evidence.", {
          code: "new_product_missing_provider_identity",
          details: { provider, name: importedProduct?.name || null },
        });
      }
      productId = idFactory("product");
      if (!String(productId || "").trim() || index.products.has(productId)) {
        throw new CanonicalCatalogError("Canonical product id factory returned an invalid or duplicate id.", {
          code: "invalid_generated_product_id",
          details: { productId },
        });
      }
      canonicalProduct = {
        ...stripProductProviderFields(importedProduct),
        id: productId,
        status: "draft",
        createdAt: now,
        updatedAt: now,
        variants: [],
      };
      state.catalog.products.push(canonicalProduct);
      index.products.set(productId, canonicalProduct);
      if (importedProductRef) {
        providerState.products[importedProductRef] = productId;
        refs.productRefs.set(importedProductRef, productId);
      }
    } else {
      const preserved = {
        id: canonicalProduct.id,
        status: canonicalProduct.status || "draft",
        createdAt: canonicalProduct.createdAt || now,
        variants: canonicalProduct.variants || [],
      };
      Object.assign(canonicalProduct, stripProductProviderFields(importedProduct), preserved, { updatedAt: now });
      if (importedProductRef && !providerState.products[importedProductRef]) {
        providerState.products[importedProductRef] = productId;
        refs.productRefs.set(importedProductRef, productId);
      }
    }

    const currentVariants = new Map((canonicalProduct.variants || []).map((variant) => [variant.id, variant]));
    for (const importedVariant of Array.isArray(importedProduct?.variants) ? importedProduct.variants : []) {
      const importedVariantRef = providerVariantRef(importedVariant, provider);
      if (!importedVariantRef) {
        throw new CanonicalCatalogError("Provider variant cannot be accepted without a stable provider reference.", {
          code: "missing_import_variant_ref",
          details: { provider, productId },
        });
      }

      let variantId = providerState.variants[importedVariantRef] || null;
      let canonicalVariant = variantId ? index.variants.get(variantId) : null;
      if (canonicalVariant) {
        const owningProductId = index.variantProduct.get(variantId);
        if (owningProductId !== productId) {
          throw new CanonicalCatalogError("Provider variant is already mapped to another canonical product.", {
            code: "variant_mapped_to_other_product",
            details: { provider, importedVariantRef, variantId, owningProductId, productId },
          });
        }
        const preserved = {
          id: canonicalVariant.id,
          status: canonicalVariant.status || "active",
          createdAt: canonicalVariant.createdAt || now,
        };
        Object.assign(canonicalVariant, stripVariantProviderFields(importedVariant), preserved, { updatedAt: now });
      } else {
        variantId = idFactory("variant");
        if (!String(variantId || "").trim() || index.variants.has(variantId)) {
          throw new CanonicalCatalogError("Canonical variant id factory returned an invalid or duplicate id.", {
            code: "invalid_generated_variant_id",
            details: { variantId },
          });
        }
        canonicalVariant = {
          ...stripVariantProviderFields(importedVariant),
          id: variantId,
          status: "active",
          createdAt: now,
          updatedAt: now,
        };
        canonicalProduct.variants.push(canonicalVariant);
        currentVariants.set(variantId, canonicalVariant);
        index.variants.set(variantId, canonicalVariant);
        index.variantProduct.set(variantId, productId);
        providerState.variants[importedVariantRef] = variantId;
        refs.variantRefs.set(importedVariantRef, variantId);
      }
    }
  }

  state.catalog.updatedAt = now;
  state.catalog.count = state.catalog.products.length;

  return {
    state,
    review,
    providerMap: buildProviderMap({ state, provider }),
  };
}

function buildProviderMap({ state: rawState, provider = "square" }) {
  const state = canonicalState(rawState);
  const index = catalogIndex(state.catalog);
  const refs = providerIndex(state, provider);
  const products = {};
  const variants = {};

  for (const [providerProductId, productId] of refs.productRefs) {
    products[productId] = { providerProductId };
  }
  for (const [providerVariantId, variantId] of refs.variantRefs) {
    const productId = index.variantProduct.get(variantId);
    const variant = index.variants.get(variantId);
    variants[variantId] = {
      productId,
      sku: String(variant?.sku || "").trim() || null,
      providerVariantId,
    };
  }

  return {
    schemaVersion: 1,
    provider,
    products,
    variants,
  };
}

module.exports = {
  CanonicalCatalogError,
  applyProviderImport,
  buildProviderMap,
  canonicalState,
  newCanonicalId,
  providerProductRef,
  providerVariantRef,
  reviewProviderImport,
};
