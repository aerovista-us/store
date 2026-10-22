const DEFAULT_CATEGORY_RULES = Object.freeze([
  Object.freeze({
    storeId: "horizon",
    patterns: Object.freeze(["art", "canvas", "metal print", "metal", "wall art"]),
  }),
  Object.freeze({
    storeId: "gear",
    patterns: Object.freeze([
      "tee",
      "t-shirt",
      "shirt",
      "hoodie",
      "apparel",
      "hat",
      "cap",
      "sticker",
      "sweatshirt",
      "jacket",
      "bomber",
    ]),
  }),
]);

function normalizedCategory(product) {
  return String(product?.category || product?.categoryName || "")
    .trim()
    .toLowerCase()
    .replace(/[_+&/]+/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Produce operator-review suggestions only.
 *
 * Existing product assignments are never overwritten and no suggestion is
 * persisted automatically. Northline intentionally has no default heuristic:
 * its products must be deliberately assigned until a trustworthy business
 * rule exists.
 */
function suggestProductRoutes({ catalog, assignments = {}, rules = DEFAULT_CATEGORY_RULES }) {
  const products = Array.isArray(catalog?.products) ? catalog.products : [];
  const existing = assignments?.products || {};
  const suggestions = [];

  for (const product of products) {
    const productId = String(product?.id || "").trim();
    if (!productId || Object.prototype.hasOwnProperty.call(existing, productId)) continue;
    const category = normalizedCategory(product);
    if (!category) continue;

    const matches = [];
    for (const rule of rules) {
      const matchedPattern = (rule.patterns || []).find((pattern) => {
        const needle = String(pattern || "").trim().toLowerCase();
        return needle && category.includes(needle);
      });
      if (matchedPattern) {
        matches.push({ storeId: rule.storeId, reason: `category:${matchedPattern}` });
      }
    }

    const uniqueStores = [...new Set(matches.map((match) => match.storeId))];
    if (uniqueStores.length !== 1) continue;
    const storeId = uniqueStores[0];
    suggestions.push({
      productId,
      name: String(product?.name || productId),
      category,
      suggestedStores: [storeId],
      reason: matches.find((match) => match.storeId === storeId)?.reason || "category",
    });
  }

  return suggestions;
}

module.exports = { DEFAULT_CATEGORY_RULES, normalizedCategory, suggestProductRoutes };
