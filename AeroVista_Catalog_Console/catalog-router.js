const STORE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;

class CatalogRoutingError extends Error {
  constructor(message, { code = "catalog_routing_error", details = null } = {}) {
    super(message);
    this.name = "CatalogRoutingError";
    this.code = code;
    this.details = details;
  }
}

function normalizeStoreIds(storeIds) {
  if (!Array.isArray(storeIds) || !storeIds.length) {
    throw new CatalogRoutingError("At least one storefront must be registered.", {
      code: "no_stores",
    });
  }
  const ids = storeIds.map((value) => String(value || "").trim().toLowerCase());
  const unique = new Set();
  for (const id of ids) {
    if (!STORE_ID_PATTERN.test(id)) {
      throw new CatalogRoutingError(`Invalid store id: ${id || "(blank)"}`, {
        code: "invalid_store_id",
        details: { storeId: id },
      });
    }
    if (unique.has(id)) {
      throw new CatalogRoutingError(`Duplicate store id: ${id}`, {
        code: "duplicate_store_id",
        details: { storeId: id },
      });
    }
    unique.add(id);
  }
  return ids;
}

function normalizeAssignmentStores(value, knownStores, context) {
  const raw = Array.isArray(value) ? value : value == null ? [] : [value];
  const stores = [];
  const seen = new Set();
  for (const item of raw) {
    const id = String(item || "").trim().toLowerCase();
    if (!id) continue;
    if (!knownStores.has(id)) {
      throw new CatalogRoutingError(`Assignment references unknown store '${id}'.`, {
        code: "unknown_assignment_store",
        details: { ...context, storeId: id },
      });
    }
    if (!seen.has(id)) {
      seen.add(id);
      stores.push(id);
    }
  }
  return stores;
}

function variantKey(variant) {
  const explicit = String(variant?.variantId || variant?.id || "").trim();
  if (explicit) return explicit;
  const sku = String(variant?.sku || "").trim();
  if (sku) return `sku:${sku}`;
  return null;
}

function squareVariationId(variant) {
  return String(
    variant?.squareVariationId ||
      variant?.providerVariationId ||
      variant?.variation_id ||
      "",
  ).trim();
}

function cleanPublicVariant(variant) {
  const cleaned = { ...variant };
  delete cleaned.variation_id;
  delete cleaned.squareVariationId;
  delete cleaned.providerVariationId;
  delete cleaned.square_variation_id;
  return cleaned;
}

function cloneProductForStore(product, variants) {
  const copy = { ...product, variants };
  delete copy.squareVariationId;
  delete copy.providerVariationId;
  delete copy.variation_id;
  return copy;
}

/**
 * Route one normalized Square master catalog into isolated storefront outputs.
 *
 * Assignment format (persistent overlay, kept outside Square exports):
 * {
 *   products: { "product-id": ["gear"] },
 *   variants: { "SQUARE_VARIATION_TOKEN": ["gear", "northline"] }
 * }
 *
 * Variant assignments override product assignments. An assigned variant must
 * have a stable variant key (variantId/id/SKU) and a private Square variation
 * ID. The Square ID is removed from the public catalog and emitted only in the
 * provider map.
 */
function routeMasterCatalog({ catalog, assignments = {}, storeIds }) {
  const ids = normalizeStoreIds(storeIds);
  const knownStores = new Set(ids);
  const products = Array.isArray(catalog?.products) ? catalog.products : null;
  if (!products) {
    throw new CatalogRoutingError("Master catalog must contain a products array.", {
      code: "invalid_catalog",
    });
  }

  const productAssignments = assignments?.products || {};
  const variantAssignments = assignments?.variants || {};
  const knownProductIds = new Set(products.map((product) => String(product?.id || "").trim()).filter(Boolean));
  const knownVariationIds = new Set();
  const variationOwners = new Map();

  for (const productId of Object.keys(productAssignments)) {
    if (!knownProductIds.has(productId)) {
      throw new CatalogRoutingError(`Assignment references unknown product '${productId}'.`, {
        code: "unknown_assignment_product",
        details: { productId },
      });
    }
  }

  const outputs = Object.fromEntries(
    ids.map((id) => [id, {
      catalog: {
        generated_from: catalog.generated_from || null,
        generated_at: catalog.generated_at || null,
        storeId: id,
        count: 0,
        products: [],
      },
      providerMap: {
        storeId: id,
        generated_at: catalog.generated_at || null,
        variants: {},
      },
    }]),
  );

  for (const product of products) {
    const productId = String(product?.id || "").trim();
    if (!productId) {
      throw new CatalogRoutingError("Every master catalog product must have an id.", {
        code: "missing_product_id",
      });
    }
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const productStores = normalizeAssignmentStores(
      productAssignments[productId],
      knownStores,
      { productId },
    );
    const publicVariantsByStore = new Map(ids.map((id) => [id, []]));

    for (const variant of variants) {
      const providerId = squareVariationId(variant);
      if (providerId) {
        knownVariationIds.add(providerId);
        const owner = variationOwners.get(providerId);
        const currentOwner = `${productId}/${variantKey(variant) || "(unkeyed)"}`;
        if (owner && owner !== currentOwner) {
          throw new CatalogRoutingError(
            `Square variation '${providerId}' is attached to more than one canonical variant.`,
            {
              code: "duplicate_square_variation",
              details: { squareVariationId: providerId, first: owner, second: currentOwner },
            },
          );
        }
        variationOwners.set(providerId, currentOwner);
      }

      const hasVariantOverride = providerId && Object.prototype.hasOwnProperty.call(variantAssignments, providerId);
      const stores = hasVariantOverride
        ? normalizeAssignmentStores(variantAssignments[providerId], knownStores, { productId, squareVariationId: providerId })
        : productStores;
      if (!stores.length) continue;

      const key = variantKey(variant);
      if (!key) {
        throw new CatalogRoutingError(`Assigned variant in '${productId}' has no stable variant key or SKU.`, {
          code: "missing_variant_key",
          details: { productId },
        });
      }
      if (!providerId) {
        throw new CatalogRoutingError(`Assigned variant '${productId}/${key}' has no Square variation ID.`, {
          code: "missing_square_variation",
          details: { productId, variantKey: key },
        });
      }

      for (const storeId of stores) {
        publicVariantsByStore.get(storeId).push(cleanPublicVariant(variant));
        const mappingKey = `${productId}::${key}`;
        outputs[storeId].providerMap.variants[mappingKey] = {
          productId,
          variantKey: key,
          sku: String(variant?.sku || "").trim() || null,
          squareVariationId: providerId,
        };
      }
    }

    for (const storeId of ids) {
      const routedVariants = publicVariantsByStore.get(storeId);
      if (!routedVariants.length) continue;
      outputs[storeId].catalog.products.push(cloneProductForStore(product, routedVariants));
    }
  }

  for (const providerId of Object.keys(variantAssignments)) {
    if (!knownVariationIds.has(providerId)) {
      throw new CatalogRoutingError(`Variant assignment references unknown Square variation '${providerId}'.`, {
        code: "unknown_assignment_variant",
        details: { squareVariationId: providerId },
      });
    }
  }

  const unassigned = [];
  for (const product of products) {
    const productId = String(product.id || "").trim();
    const assigned = ids.some((storeId) => outputs[storeId].catalog.products.some((item) => item.id === productId));
    if (!assigned) unassigned.push(productId);
  }

  for (const storeId of ids) {
    outputs[storeId].catalog.count = outputs[storeId].catalog.products.length;
    outputs[storeId].providerMap.count = Object.keys(outputs[storeId].providerMap.variants).length;
  }

  return {
    schemaVersion: 1,
    stores: outputs,
    unassigned,
    summary: Object.fromEntries(
      ids.map((storeId) => [storeId, {
        products: outputs[storeId].catalog.count,
        variants: outputs[storeId].providerMap.count,
      }]),
    ),
  };
}

module.exports = {
  CatalogRoutingError,
  routeMasterCatalog,
  variantKey,
  squareVariationId,
};
