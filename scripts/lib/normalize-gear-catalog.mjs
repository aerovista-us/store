function slugify(value, fallback = "item") {
  const slug = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

function moneyAmount(price) {
  const numeric = Number(price);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.round(numeric * 100) : 0;
}

function normalizedVisibility(value) {
  const visibility = String(value || "visible").toLowerCase();
  return ["draft", "visible", "hidden", "archived"].includes(visibility) ? visibility : "visible";
}

function variantOptionData(product, variant) {
  const sizeLabel = String(variant.size || "").trim();
  const colorLabel = String(variant.color || product.color || "").trim();
  const options = {};
  if (sizeLabel) options.size = slugify(sizeLabel, "one-size");
  if (colorLabel && colorLabel.toLowerCase() !== "default") options.color = slugify(colorLabel, "default");
  return { options, sizeLabel, colorLabel };
}

function optionGroupsFor(product) {
  const sizeLabels = uniqueStrings((product.variants || []).map((variant) => String(variant.size || "").trim()));
  const colorLabels = uniqueStrings((product.variants || []).map((variant) => String(variant.color || product.color || "").trim()))
    .filter((label) => label.toLowerCase() !== "default");
  const groups = [];
  if (sizeLabels.length) {
    groups.push({
      id: "size",
      label: "Size",
      values: sizeLabels.map((label) => ({ id: slugify(label, "one-size"), label }))
    });
  }
  if (colorLabels.length) {
    groups.push({
      id: "color",
      label: "Color",
      values: colorLabels.map((label) => ({ id: slugify(label, "default"), label }))
    });
  }
  return groups;
}

export function normalizeGearCatalog(source, options = {}) {
  const storeId = options.storeId || "aerovista-apparel";
  const currency = options.currency || "USD";
  const sourceProducts = Array.isArray(source) ? source : source?.products;
  if (!Array.isArray(sourceProducts)) throw new TypeError("Gear catalog must contain a products array");

  const sourceVersion = String(source?.meta?.exportedAt || source?.meta?.count || sourceProducts.length);
  const catalogVersion = options.catalogVersion || `gear-legacy-${slugify(sourceVersion, "catalog")}`;
  const mappingItems = [];

  const products = sourceProducts.map((product, productIndex) => {
    const productId = String(product.id || `legacy-product-${productIndex + 1}`);
    const title = String(product.name || productId);
    const visibility = normalizedVisibility(product.visibility);
    const seenVariantIds = new Map();

    const variants = (product.variants || []).map((variant, variantIndex) => {
      const { options: selectedOptions, sizeLabel, colorLabel } = variantOptionData(product, variant);
      const optionToken = Object.entries(selectedOptions)
        .map(([key, value]) => `${key}-${value}`)
        .join("-") || `option-${variantIndex + 1}`;
      const baseVariantId = `${productId}--${optionToken}`;
      const occurrence = (seenVariantIds.get(baseVariantId) || 0) + 1;
      seenVariantIds.set(baseVariantId, occurrence);
      const variantId = occurrence === 1 ? baseVariantId : `${baseVariantId}-${occurrence}`;
      const providerVariationId = String(variant.variation_id || "").trim();
      const hasSellableIdentity = providerVariationId.length > 0 && Number.isFinite(Number(variant.price));
      const compatibilityColor = colorLabel || "Default";
      const compatibilitySize = sizeLabel || "One Size";

      if (providerVariationId) {
        mappingItems.push({
          productId,
          variantId,
          providerVariationId,
          compatibilityCartKey: `${compatibilityColor}__${compatibilitySize}`
        });
      }

      const normalized = {
        id: variantId,
        options: selectedOptions,
        price: { amount: moneyAmount(variant.price), currency },
        availability: visibility === "visible" && hasSellableIdentity ? "available" : "unavailable"
      };
      const sku = String(variant.sku || "").trim();
      if (sku) normalized.sku = sku;
      return normalized;
    });

    const image = String(product.imagePath || product.image || "").trim();
    const collections = uniqueStrings([
      String(product.collection || "").trim(),
      ...(Array.isArray(product.collections) ? product.collections.map((value) => String(value).trim()) : [])
    ]);
    const productAvailable = visibility === "visible" && variants.some((variant) => variant.availability === "available");

    return {
      id: productId,
      slug: slugify(product.slug || productId, `product-${productIndex + 1}`),
      title,
      description: String(product.description_text || product.description || ""),
      visibility,
      availability: productAvailable ? "available" : "unavailable",
      collections,
      channels: [storeId],
      media: image ? [{ assetId: `legacy-${slugify(image)}`, alt: title, legacySrc: `img/${image}` }] : [],
      optionGroups: optionGroupsFor(product),
      variants
    };
  });

  return {
    catalog: {
      schemaVersion: "1.0.0-alpha.1",
      catalogVersion,
      storeId,
      currency,
      products
    },
    providerMappings: {
      schemaVersion: "1.0.0-alpha.1",
      mappingVersion: `${catalogVersion}-square`,
      storeId,
      provider: "square",
      items: mappingItems
    }
  };
}
