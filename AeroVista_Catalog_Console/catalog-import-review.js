function productId(product) {
  return String(product?.id || product?.itemId || product?.item_id || "").trim();
}

function providerId(variant) {
  return String(
    variant?.squareVariationId || variant?.providerVariationId || variant?.variation_id || "",
  ).trim();
}

function variantIdentity(variant) {
  const provider = providerId(variant);
  if (provider) return `square:${provider}`;
  const sku = String(variant?.sku || "").trim();
  if (sku) return `sku:${sku}`;
  const id = String(variant?.variantId || variant?.id || "").trim();
  if (id) return `id:${id}`;
  return null;
}

function numberOrNull(value) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function comparableProduct(product) {
  return {
    name: String(product?.name || ""),
    category: String(product?.category || ""),
    visibility: String(product?.visibility || ""),
    price: numberOrNull(product?.price),
  };
}

function shallowChanges(before, after) {
  const left = comparableProduct(before);
  const right = comparableProduct(after);
  const changes = [];
  for (const key of Object.keys(left)) {
    if (left[key] !== right[key]) changes.push({ field: key, before: left[key], after: right[key] });
  }
  return changes;
}

function indexVariants(product) {
  const map = new Map();
  for (const variant of Array.isArray(product?.variants) ? product.variants : []) {
    const identity = variantIdentity(variant);
    if (!identity) continue;
    map.set(identity, variant);
  }
  return map;
}

function reviewCatalogImport({ previous, next }) {
  const previousProducts = new Map();
  const nextProducts = new Map();
  for (const product of Array.isArray(previous?.products) ? previous.products : []) {
    const id = productId(product);
    if (id) previousProducts.set(id, product);
  }
  for (const product of Array.isArray(next?.products) ? next.products : []) {
    const id = productId(product);
    if (id) nextProducts.set(id, product);
  }

  const addedProducts = [];
  const removedProducts = [];
  const changedProducts = [];
  const variantChanges = [];

  for (const [id, product] of nextProducts) {
    if (!previousProducts.has(id)) {
      addedProducts.push({ productId: id, name: String(product.name || id) });
      continue;
    }
    const before = previousProducts.get(id);
    const changes = shallowChanges(before, product);
    if (changes.length) changedProducts.push({ productId: id, changes });

    const beforeVariants = indexVariants(before);
    const afterVariants = indexVariants(product);
    for (const [identity, variant] of afterVariants) {
      if (!beforeVariants.has(identity)) {
        variantChanges.push({ type: "added", productId: id, variant: identity });
        continue;
      }
      const prior = beforeVariants.get(identity);
      const beforePrice = numberOrNull(prior?.price);
      const afterPrice = numberOrNull(variant?.price);
      if (beforePrice !== afterPrice) {
        variantChanges.push({
          type: "price_changed",
          productId: id,
          variant: identity,
          before: beforePrice,
          after: afterPrice,
        });
      }
    }
    for (const identity of beforeVariants.keys()) {
      if (!afterVariants.has(identity)) {
        variantChanges.push({ type: "removed", productId: id, variant: identity });
      }
    }
  }

  for (const [id, product] of previousProducts) {
    if (!nextProducts.has(id)) removedProducts.push({ productId: id, name: String(product.name || id) });
  }

  return {
    previousProducts: previousProducts.size,
    nextProducts: nextProducts.size,
    addedProducts,
    removedProducts,
    changedProducts,
    variantChanges,
    hasChanges: Boolean(
      addedProducts.length || removedProducts.length || changedProducts.length || variantChanges.length,
    ),
  };
}

module.exports = { reviewCatalogImport, productId, variantIdentity };
