(function initCatalogControlUiModel(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") root.AVCatalogControlModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function catalogControlModelFactory() {
  function plainObject(value) {
    return value && typeof value === "object" && !Array.isArray(value);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function uniqueStrings(values) {
    const seen = new Set();
    const output = [];
    for (const value of Array.isArray(values) ? values : []) {
      const text = String(value || "").trim();
      if (!text || seen.has(text)) continue;
      seen.add(text);
      output.push(text);
    }
    return output;
  }

  function destinationIds(destinations) {
    return (Array.isArray(destinations) ? destinations : [])
      .map((destination) => String(destination?.id || "").trim())
      .filter(Boolean);
  }

  function emptyDistribution(destinations = []) {
    return {
      schemaVersion: 1,
      productSets: {},
      destinations: Object.fromEntries(destinationIds(destinations).map((id) => [id, {}])),
    };
  }

  function normalizeDistribution(raw, destinations = []) {
    const source = plainObject(raw) ? clone(raw) : {};
    const normalized = emptyDistribution(destinations);
    normalized.productSets = plainObject(source.productSets) ? source.productSets : {};
    const known = new Set(destinationIds(destinations));
    for (const [destinationId, rules] of Object.entries(plainObject(source.destinations) ? source.destinations : {})) {
      if (!known.has(destinationId)) continue;
      normalized.destinations[destinationId] = plainObject(rules) ? rules : {};
    }
    return normalized;
  }

  // Keep configured order within each group. Favorites are a presentation
  // grouping only; they do not receive different routing semantics.
  function favoriteFirst(destinations = []) {
    return destinations
      .map((destination, index) => ({ destination, index }))
      .sort((a, b) => {
        const favoriteDelta = Number(Boolean(b.destination?.favorite)) - Number(Boolean(a.destination?.favorite));
        return favoriteDelta || a.index - b.index;
      })
      .map((entry) => entry.destination);
  }

  function safeSetId(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64);
  }

  function upsertProductSet(distribution, setId, { name = null, products = null } = {}) {
    const next = clone(distribution);
    const id = safeSetId(setId);
    if (!id) throw new Error("Product set id is required.");
    const current = plainObject(next.productSets?.[id]) ? next.productSets[id] : {};
    next.productSets = plainObject(next.productSets) ? next.productSets : {};
    next.productSets[id] = {
      ...current,
      name: String(name ?? current.name ?? id).trim() || id,
      products: products == null ? uniqueStrings(current.products) : uniqueStrings(products),
    };
    return next;
  }

  function removeProductSet(distribution, setId) {
    const next = clone(distribution);
    if (next.productSets) delete next.productSets[setId];
    for (const rules of Object.values(next.destinations || {})) {
      if (!plainObject(rules)) continue;
      rules.productSets = uniqueStrings(rules.productSets).filter((id) => id !== setId);
      if (!rules.productSets.length) delete rules.productSets;
    }
    return next;
  }

  function setProductSetMembership(distribution, setId, productId, enabled) {
    const current = plainObject(distribution.productSets?.[setId]) ? distribution.productSets[setId] : {};
    const members = new Set(uniqueStrings(current.products));
    if (enabled) members.add(productId);
    else members.delete(productId);
    return upsertProductSet(distribution, setId, {
      name: current.name || setId,
      products: [...members],
    });
  }

  function ensureDestinationRules(distribution, destinationId) {
    const next = clone(distribution);
    next.destinations = plainObject(next.destinations) ? next.destinations : {};
    next.destinations[destinationId] = plainObject(next.destinations[destinationId])
      ? next.destinations[destinationId]
      : {};
    return next;
  }

  function setDestinationProductSet(distribution, destinationId, setId, enabled) {
    const next = ensureDestinationRules(distribution, destinationId);
    const rules = next.destinations[destinationId];
    const ids = new Set(uniqueStrings(rules.productSets));
    if (enabled) ids.add(setId);
    else ids.delete(setId);
    if (ids.size) rules.productSets = [...ids];
    else delete rules.productSets;
    return next;
  }

  function setDestinationProductMode(distribution, destinationId, productId, mode) {
    const next = ensureDestinationRules(distribution, destinationId);
    const rules = next.destinations[destinationId];
    const includes = new Set(uniqueStrings(rules.includeProducts));
    const excludes = new Set(uniqueStrings(rules.excludeProducts));
    includes.delete(productId);
    excludes.delete(productId);
    if (mode === "include") includes.add(productId);
    if (mode === "exclude") excludes.add(productId);
    if (includes.size) rules.includeProducts = [...includes];
    else delete rules.includeProducts;
    if (excludes.size) rules.excludeProducts = [...excludes];
    else delete rules.excludeProducts;
    return next;
  }

  function destinationProductMode(distribution, destinationId, productId) {
    const rules = distribution?.destinations?.[destinationId] || {};
    if (uniqueStrings(rules.includeProducts).includes(productId)) return "include";
    if (uniqueStrings(rules.excludeProducts).includes(productId)) return "exclude";
    return "inherit";
  }

  function productPresentation(distribution, destinationId, productId) {
    const value = distribution?.destinations?.[destinationId]?.presentation?.products?.[productId];
    return plainObject(value) ? clone(value) : {};
  }

  function setProductPresentation(distribution, destinationId, productId, rawOverride = {}) {
    const next = ensureDestinationRules(distribution, destinationId);
    const rules = next.destinations[destinationId];
    const source = plainObject(rawOverride) ? rawOverride : {};
    const override = {};

    for (const field of ["title", "description", "badge"]) {
      const text = String(source[field] ?? "").trim();
      if (text) override[field] = text;
    }
    if (source.featured === true || source.featured === false) override.featured = source.featured;
    if (source.sortOrder != null && source.sortOrder !== "") {
      const sortOrder = Number(source.sortOrder);
      if (Number.isInteger(sortOrder)) override.sortOrder = sortOrder;
    }

    rules.presentation = plainObject(rules.presentation) ? rules.presentation : {};
    rules.presentation.products = plainObject(rules.presentation.products) ? rules.presentation.products : {};
    if (Object.keys(override).length) rules.presentation.products[productId] = override;
    else delete rules.presentation.products[productId];

    if (!Object.keys(rules.presentation.products).length) delete rules.presentation.products;
    if (!Object.keys(rules.presentation).length) delete rules.presentation;
    return next;
  }

  function setVariantMode(distribution, destinationId, variantRef, mode) {
    const next = ensureDestinationRules(distribution, destinationId);
    const rules = next.destinations[destinationId];
    rules.variants = plainObject(rules.variants) ? rules.variants : {};
    if (mode === "include") rules.variants[variantRef] = true;
    else if (mode === "exclude") rules.variants[variantRef] = false;
    else delete rules.variants[variantRef];
    if (!Object.keys(rules.variants).length) delete rules.variants;
    return next;
  }

  function variantMode(distribution, destinationId, variantRef) {
    const value = distribution?.destinations?.[destinationId]?.variants?.[variantRef];
    if (value === true) return "include";
    if (value === false) return "exclude";
    return "inherit";
  }

  function reviewSummary(review) {
    const summary = review?.summary || {};
    return {
      canApply: Boolean(review?.canApply),
      importedProducts: Number(summary.importedProducts || 0),
      matchedProducts: Number(summary.matchedProducts || 0),
      newProducts: Number(summary.newProducts || 0),
      newVariants: Number(summary.newVariants || 0),
      changedEntities: Number(summary.changedEntities || 0),
      missingProviderProducts: Number(summary.missingProviderProducts || 0),
      missingProviderVariants: Number(summary.missingProviderVariants || 0),
      conflicts: Number(summary.conflicts || 0),
    };
  }

  function manifestFileName(destinationId, manifest) {
    const version = String(manifest?.catalogVersion || "draft")
      .replace(/[:.]/g, "-")
      .replace(/[^a-zA-Z0-9_-]/g, "");
    return `${String(destinationId || "destination")}-catalog-${version || "draft"}.json`;
  }

  return {
    destinationProductMode,
    emptyDistribution,
    favoriteFirst,
    manifestFileName,
    normalizeDistribution,
    productPresentation,
    removeProductSet,
    reviewSummary,
    safeSetId,
    setDestinationProductMode,
    setDestinationProductSet,
    setProductPresentation,
    setProductSetMembership,
    setVariantMode,
    upsertProductSet,
    variantMode,
  };
});
