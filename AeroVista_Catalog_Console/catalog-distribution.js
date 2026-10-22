const {
  CatalogRoutingError,
  routeMasterCatalog,
  squareVariationId,
  variantKey,
} = require("./catalog-router");

const DESTINATION_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;
const PRODUCT_SET_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

class CatalogDistributionError extends Error {
  constructor(message, { code = "catalog_distribution_error", details = null } = {}) {
    super(message);
    this.name = "CatalogDistributionError";
    this.code = code;
    this.details = details;
  }
}

function normalizeStringArray(value) {
  const raw = Array.isArray(value) ? value : value == null ? [] : [value];
  const output = [];
  const seen = new Set();
  for (const item of raw) {
    const normalized = String(item || "").trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
  }
  return output;
}

function normalizeDestinationProfiles(input) {
  const source = Array.isArray(input) ? input : input?.destinations;
  if (!Array.isArray(source) || !source.length) {
    throw new CatalogDistributionError("At least one catalog destination must be registered.", {
      code: "no_destinations",
    });
  }

  const seen = new Set();
  return source.map((raw) => {
    const id = String(raw?.id || "").trim().toLowerCase();
    if (!DESTINATION_ID_PATTERN.test(id)) {
      throw new CatalogDistributionError(`Invalid destination id: ${id || "(blank)"}`, {
        code: "invalid_destination_id",
        details: { destinationId: id },
      });
    }
    if (seen.has(id)) {
      throw new CatalogDistributionError(`Duplicate destination id: ${id}`, {
        code: "duplicate_destination_id",
        details: { destinationId: id },
      });
    }
    seen.add(id);

    const origin = raw?.origin ? String(raw.origin).trim() : null;
    if (origin) {
      let parsed;
      try {
        parsed = new URL(origin);
      } catch {
        throw new CatalogDistributionError(`Invalid origin for destination '${id}'.`, {
          code: "invalid_destination_origin",
          details: { destinationId: id, origin },
        });
      }
      if (parsed.protocol !== "https:" || parsed.origin !== origin.replace(/\/$/, "")) {
        throw new CatalogDistributionError(`Destination '${id}' must use an exact HTTPS origin.`, {
          code: "invalid_destination_origin",
          details: { destinationId: id, origin },
        });
      }
    }

    return Object.freeze({
      id,
      name: String(raw?.name || id).trim() || id,
      origin,
      type: String(raw?.type || "app").trim().toLowerCase(),
      commerceStoreId: String(raw?.commerceStoreId || id).trim().toLowerCase(),
      favorite: Boolean(raw?.favorite),
    });
  });
}

function canonicalVariantRef(productId, variant) {
  const key = variantKey(variant);
  return key ? `${productId}::${key}` : null;
}

function canonicalVariantId(variant) {
  return String(variant?.variantId || variant?.id || "").trim();
}

function providerVariantId({ productId, variant, providerMap = null }) {
  const canonicalId = canonicalVariantId(variant);
  if (canonicalId && providerMap?.variants?.[canonicalId]) {
    const mapping = providerMap.variants[canonicalId];
    const mappedProductId = String(mapping?.productId || "").trim();
    if (mappedProductId && mappedProductId !== productId) {
      throw new CatalogDistributionError(
        `Private provider mapping for variant '${canonicalId}' points to another product.`,
        {
          code: "provider_map_product_mismatch",
          details: { variantId: canonicalId, productId, mappedProductId },
        },
      );
    }
    return String(
      mapping?.providerVariantId ||
        mapping?.squareVariationId ||
        mapping?.providerVariationId ||
        "",
    ).trim();
  }

  // Transitional compatibility for the legacy normalized Square catalog. Once
  // the canonical authority is migrated, provider identity should arrive only
  // through the private providerMap argument.
  return squareVariationId(variant);
}

function buildCatalogIndex(catalog, providerMap = null) {
  const products = Array.isArray(catalog?.products) ? catalog.products : null;
  if (!products) {
    throw new CatalogDistributionError("Master catalog must contain a products array.", {
      code: "invalid_catalog",
    });
  }

  const productIds = new Set();
  const variants = new Map();
  for (const product of products) {
    const productId = String(product?.id || "").trim();
    if (!productId) {
      throw new CatalogDistributionError("Every master catalog product must have an id.", {
        code: "missing_product_id",
      });
    }
    if (productIds.has(productId)) {
      throw new CatalogDistributionError(`Duplicate canonical product id '${productId}'.`, {
        code: "duplicate_product_id",
        details: { productId },
      });
    }
    productIds.add(productId);

    for (const variant of Array.isArray(product?.variants) ? product.variants : []) {
      const ref = canonicalVariantRef(productId, variant);
      if (!ref) continue;
      if (variants.has(ref)) {
        throw new CatalogDistributionError(`Duplicate canonical variant reference '${ref}'.`, {
          code: "duplicate_variant_ref",
          details: { variantRef: ref },
        });
      }
      variants.set(ref, {
        productId,
        variant,
        providerId: providerVariantId({ productId, variant, providerMap }),
      });
    }
  }

  return { products, productIds, variants };
}

const PRESENTATION_FIELDS = new Set(["title", "description", "badge", "featured", "sortOrder"]);
const PRESENTATION_TEXT_LIMITS = Object.freeze({
  title: 160,
  description: 4000,
  badge: 80,
});

function normalizePresentationText(value, field, { destinationId, productId }) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const maxLength = PRESENTATION_TEXT_LIMITS[field];
  if (text.length > maxLength) {
    throw new CatalogDistributionError(
      `Presentation ${field} for '${productId}' in '${destinationId}' exceeds ${maxLength} characters.`,
      {
        code: "presentation_text_too_long",
        details: { destinationId, productId, field, maxLength },
      },
    );
  }
  return text;
}

function normalizeDestinationPresentation(rawPresentation, productIds, destinationId) {
  if (rawPresentation == null) return { products: {} };
  if (!rawPresentation || typeof rawPresentation !== "object" || Array.isArray(rawPresentation)) {
    throw new CatalogDistributionError(
      `Presentation overrides for '${destinationId}' must be an object.`,
      { code: "invalid_destination_presentation", details: { destinationId } },
    );
  }

  for (const key of Object.keys(rawPresentation)) {
    if (key !== "products") {
      throw new CatalogDistributionError(
        `Unsupported presentation section '${key}' for '${destinationId}'.`,
        { code: "unsupported_presentation_section", details: { destinationId, section: key } },
      );
    }
  }

  const rawProducts = rawPresentation.products == null ? {} : rawPresentation.products;
  if (!rawProducts || typeof rawProducts !== "object" || Array.isArray(rawProducts)) {
    throw new CatalogDistributionError(
      `Presentation product overrides for '${destinationId}' must be an object.`,
      { code: "invalid_presentation_products", details: { destinationId } },
    );
  }

  const products = {};
  for (const [productId, rawOverride] of Object.entries(rawProducts)) {
    if (!productIds.has(productId)) {
      throw new CatalogDistributionError(
        `Presentation for '${destinationId}' references unknown product '${productId}'.`,
        { code: "unknown_presentation_product", details: { destinationId, productId } },
      );
    }
    if (!rawOverride || typeof rawOverride !== "object" || Array.isArray(rawOverride)) {
      throw new CatalogDistributionError(
        `Presentation override for '${productId}' in '${destinationId}' must be an object.`,
        { code: "invalid_product_presentation", details: { destinationId, productId } },
      );
    }

    for (const field of Object.keys(rawOverride)) {
      if (!PRESENTATION_FIELDS.has(field)) {
        throw new CatalogDistributionError(
          `Unsupported presentation field '${field}' for '${productId}' in '${destinationId}'.`,
          {
            code: "unsupported_presentation_field",
            details: { destinationId, productId, field },
          },
        );
      }
    }

    const override = {};
    for (const field of ["title", "description", "badge"]) {
      if (rawOverride[field] == null) continue;
      const text = normalizePresentationText(rawOverride[field], field, { destinationId, productId });
      if (text) override[field] = text;
    }
    if (rawOverride.featured != null) {
      if (typeof rawOverride.featured !== "boolean") {
        throw new CatalogDistributionError(
          `Presentation featured flag for '${productId}' in '${destinationId}' must be boolean.`,
          {
            code: "invalid_presentation_featured",
            details: { destinationId, productId },
          },
        );
      }
      override.featured = rawOverride.featured;
    }
    if (rawOverride.sortOrder != null && rawOverride.sortOrder !== "") {
      const sortOrder = Number(rawOverride.sortOrder);
      if (!Number.isInteger(sortOrder) || sortOrder < -100000 || sortOrder > 100000) {
        throw new CatalogDistributionError(
          `Presentation sortOrder for '${productId}' in '${destinationId}' must be an integer between -100000 and 100000.`,
          {
            code: "invalid_presentation_sort_order",
            details: { destinationId, productId },
          },
        );
      }
      override.sortOrder = sortOrder;
    }

    if (Object.keys(override).length) products[productId] = override;
  }

  return { products };
}

function normalizeProductSets(rawSets, productIds) {
  const source = rawSets && typeof rawSets === "object" && !Array.isArray(rawSets) ? rawSets : {};
  const sets = new Map();

  for (const [rawId, rawSet] of Object.entries(source)) {
    const id = String(rawId || "").trim().toLowerCase();
    if (!PRODUCT_SET_ID_PATTERN.test(id)) {
      throw new CatalogDistributionError(`Invalid product set id: ${id || "(blank)"}`, {
        code: "invalid_product_set_id",
        details: { productSetId: id },
      });
    }

    const products = normalizeStringArray(rawSet?.products);
    for (const productId of products) {
      if (!productIds.has(productId)) {
        throw new CatalogDistributionError(
          `Product set '${id}' references unknown product '${productId}'.`,
          {
            code: "unknown_product_set_product",
            details: { productSetId: id, productId },
          },
        );
      }
    }

    sets.set(id, Object.freeze({
      id,
      name: String(rawSet?.name || id).trim() || id,
      products,
    }));
  }

  return sets;
}

function compileDistributionAssignments({ catalog, distribution = {}, destinations, providerMap = null }) {
  const profiles = normalizeDestinationProfiles(destinations);
  const destinationIds = profiles.map((profile) => profile.id);
  const knownDestinations = new Set(destinationIds);
  const index = buildCatalogIndex(catalog, providerMap);
  const productSets = normalizeProductSets(distribution?.productSets, index.productIds);
  const destinationRules = distribution?.destinations && typeof distribution.destinations === "object"
    ? distribution.destinations
    : {};

  for (const destinationId of Object.keys(destinationRules)) {
    if (!knownDestinations.has(destinationId)) {
      throw new CatalogDistributionError(
        `Distribution references unknown destination '${destinationId}'.`,
        {
          code: "unknown_destination",
          details: { destinationId },
        },
      );
    }
  }

  const selectedProducts = new Map(destinationIds.map((id) => [id, new Set()]));
  const variantOverrides = new Map();
  const presentation = {};

  for (const destinationId of destinationIds) {
    const rules = destinationRules[destinationId] || {};
    const selected = selectedProducts.get(destinationId);
    presentation[destinationId] = normalizeDestinationPresentation(
      rules.presentation,
      index.productIds,
      destinationId,
    );

    for (const productSetId of normalizeStringArray(rules.productSets).map((id) => id.toLowerCase())) {
      const productSet = productSets.get(productSetId);
      if (!productSet) {
        throw new CatalogDistributionError(
          `Destination '${destinationId}' references unknown product set '${productSetId}'.`,
          {
            code: "unknown_product_set",
            details: { destinationId, productSetId },
          },
        );
      }
      for (const productId of productSet.products) selected.add(productId);
    }

    for (const productId of normalizeStringArray(rules.includeProducts)) {
      if (!index.productIds.has(productId)) {
        throw new CatalogDistributionError(
          `Destination '${destinationId}' includes unknown product '${productId}'.`,
          {
            code: "unknown_destination_product",
            details: { destinationId, productId },
          },
        );
      }
      selected.add(productId);
    }

    for (const productId of normalizeStringArray(rules.excludeProducts)) {
      if (!index.productIds.has(productId)) {
        throw new CatalogDistributionError(
          `Destination '${destinationId}' excludes unknown product '${productId}'.`,
          {
            code: "unknown_destination_product",
            details: { destinationId, productId },
          },
        );
      }
      selected.delete(productId);
    }

    const rawVariantOverrides = rules?.variants && typeof rules.variants === "object"
      ? rules.variants
      : {};
    for (const [variantRef, enabled] of Object.entries(rawVariantOverrides)) {
      if (!index.variants.has(variantRef)) {
        throw new CatalogDistributionError(
          `Destination '${destinationId}' references unknown canonical variant '${variantRef}'.`,
          {
            code: "unknown_destination_variant",
            details: { destinationId, variantRef },
          },
        );
      }
      if (typeof enabled !== "boolean") {
        throw new CatalogDistributionError(
          `Variant override '${variantRef}' for '${destinationId}' must be boolean.`,
          {
            code: "invalid_variant_override",
            details: { destinationId, variantRef },
          },
        );
      }
      if (!variantOverrides.has(variantRef)) variantOverrides.set(variantRef, new Map());
      variantOverrides.get(variantRef).set(destinationId, enabled);
    }
  }

  const products = {};
  for (const productId of index.productIds) {
    const assigned = destinationIds.filter((destinationId) => selectedProducts.get(destinationId).has(productId));
    if (assigned.length) products[productId] = assigned;
  }

  const variants = {};
  for (const [variantRef, overrides] of variantOverrides.entries()) {
    const entry = index.variants.get(variantRef);
    const providerId = entry.providerId;
    if (!providerId) {
      throw new CatalogDistributionError(
        `Canonical variant '${variantRef}' has no private provider mapping.`,
        {
          code: "missing_provider_mapping",
          details: { variantRef },
        },
      );
    }

    const base = new Set(products[entry.productId] || []);
    for (const [destinationId, enabled] of overrides.entries()) {
      if (enabled) base.add(destinationId);
      else base.delete(destinationId);
    }
    variants[providerId] = destinationIds.filter((id) => base.has(id));
  }

  return {
    profiles,
    productSets,
    assignments: { products, variants },
    presentation,
  };
}

function catalogWithPrivateProviderIds(catalog, providerMap = null) {
  if (!providerMap) return catalog;
  return {
    ...catalog,
    products: (catalog?.products || []).map((product) => {
      const productId = String(product?.id || "").trim();
      return {
        ...product,
        variants: (product?.variants || []).map((variant) => {
          const providerId = providerVariantId({ productId, variant, providerMap });
          return providerId ? { ...variant, providerVariationId: providerId } : { ...variant };
        }),
      };
    }),
  };
}

function applyDestinationPresentation(catalog, presentation = null) {
  const overrides = presentation?.products || {};
  const rows = (catalog.products || []).map((product, index) => {
    const override = overrides[product.id] || null;
    return {
      index,
      sortOrder: Number.isInteger(override?.sortOrder) ? override.sortOrder : null,
      product: override ? { ...product, presentation: { ...override } } : product,
    };
  });
  rows.sort((a, b) => {
    if (a.sortOrder == null && b.sortOrder == null) return a.index - b.index;
    if (a.sortOrder == null) return 1;
    if (b.sortOrder == null) return -1;
    return a.sortOrder - b.sortOrder || a.index - b.index;
  });
  return { ...catalog, products: rows.map((row) => row.product) };
}

function toDestinationOutput({ routed, profile, catalogVersion, presentation = null }) {
  const source = routed.stores[profile.id];
  const catalog = applyDestinationPresentation({ ...source.catalog }, presentation);
  delete catalog.storeId;
  catalog.schemaVersion = 1;
  catalog.catalogVersion = catalogVersion;
  catalog.destinationId = profile.id;
  catalog.commerceStoreId = profile.commerceStoreId;
  catalog.destination = {
    name: profile.name,
    origin: profile.origin,
    type: profile.type,
    favorite: profile.favorite,
  };

  const providerMap = { ...source.providerMap };
  delete providerMap.storeId;
  providerMap.schemaVersion = 1;
  providerMap.catalogVersion = catalogVersion;
  providerMap.destinationId = profile.id;
  providerMap.commerceStoreId = profile.commerceStoreId;

  return { catalog, providerMap };
}

/**
 * Distribute one canonical catalog to any number of destinations.
 *
 * Persistent distribution state references canonical product IDs and canonical
 * variant refs. Provider identity is supplied separately through a private
 * provider map and is injected only into the lower-level router in memory.
 * Public destination manifests never receive those provider IDs.
 *
 * A provider-ID-bearing catalog remains supported temporarily for legacy tests
 * and migration, but it is not the target authority model.
 */
function distributeCatalog({
  catalog,
  distribution = {},
  destinations,
  providerMap = null,
  generatedAt = new Date().toISOString(),
}) {
  const catalogVersion = String(generatedAt || "").trim();
  if (!catalogVersion) {
    throw new CatalogDistributionError("A catalog version timestamp is required.", {
      code: "missing_catalog_version",
    });
  }

  const compiled = compileDistributionAssignments({
    catalog,
    distribution,
    destinations,
    providerMap,
  });
  const routingCatalog = catalogWithPrivateProviderIds(catalog, providerMap);
  let routed;
  try {
    routed = routeMasterCatalog({
      catalog: routingCatalog,
      assignments: compiled.assignments,
      storeIds: compiled.profiles.map((profile) => profile.id),
    });
  } catch (error) {
    if (error instanceof CatalogRoutingError) throw error;
    throw error;
  }

  const output = {};
  for (const profile of compiled.profiles) {
    output[profile.id] = toDestinationOutput({
      routed,
      profile,
      catalogVersion,
      presentation: compiled.presentation[profile.id],
    });
  }

  return {
    schemaVersion: 1,
    catalogVersion,
    sourceCatalogGeneratedAt: catalog?.generated_at || catalog?.updatedAt || null,
    destinations: output,
    unassigned: routed.unassigned,
    summary: routed.summary,
  };
}

module.exports = {
  CatalogDistributionError,
  applyDestinationPresentation,
  canonicalVariantRef,
  catalogWithPrivateProviderIds,
  compileDistributionAssignments,
  distributeCatalog,
  normalizeDestinationPresentation,
  normalizeDestinationProfiles,
  providerVariantId,
};
