(function initSquareImportNormalizer(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") root.AVCatalogSquareImport = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function squareImportFactory() {
  class SquareImportError extends Error {
    constructor(message, { code = "square_import_error", details = null } = {}) {
      super(message);
      this.name = "SquareImportError";
      this.code = code;
      this.details = details;
    }
  }

  function text(value) {
    return value == null ? "" : String(value).trim();
  }

  function normalizedHeader(value) {
    return text(value).toLowerCase().replace(/[\s_\-./]+/g, " ").trim();
  }

  function headerLookup(headers) {
    const lookup = new Map();
    for (let index = 0; index < headers.length; index += 1) {
      const key = normalizedHeader(headers[index]);
      if (key && !lookup.has(key)) lookup.set(key, index);
    }
    return lookup;
  }

  function column(lookup, names, required = false) {
    for (const name of names) {
      const index = lookup.get(normalizedHeader(name));
      if (index != null) return index;
    }
    if (required) {
      throw new SquareImportError(`Square import is missing required column '${names[0]}'.`, {
        code: "missing_square_column",
        details: { column: names[0], aliases: names },
      });
    }
    return null;
  }

  function value(row, index) {
    return index == null ? "" : text(row[index]);
  }

  function parsePrice(raw) {
    const cleaned = text(raw).replace(/[$,]/g, "");
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function parseBoolean(raw) {
    const normalized = text(raw).toLowerCase();
    if (!normalized) return null;
    if (["true", "yes", "y", "1", "enabled"].includes(normalized)) return true;
    if (["false", "no", "n", "0", "disabled"].includes(normalized)) return false;
    return null;
  }

  function splitList(raw) {
    return text(raw)
      .split(/[,;|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function parseVariationOptions(raw, variationName, namedOptions = []) {
    const options = {};
    for (const [rawName, rawValue] of namedOptions) {
      const name = text(rawName).toLowerCase();
      const optionValue = text(rawValue);
      if (name && optionValue) options[name] = optionValue;
    }

    const source = text(raw);
    if (source) {
      for (const part of source.split(/[;,|]/)) {
        const match = part.match(/^\s*([^:=]+)\s*[:=]\s*(.+?)\s*$/);
        if (!match) continue;
        options[text(match[1]).toLowerCase()] = text(match[2]);
      }
    }

    const variation = text(variationName);
    if (!options.size && !options.color && variation) {
      const chunks = variation.split(/\s*\/\s*|\s*[·|]\s*/).filter(Boolean);
      if (chunks.length === 1) options.name = chunks[0];
      else if (chunks.length >= 2) {
        options.size = chunks[0];
        options.color = chunks.slice(1).join(" / ");
      }
    }
    return options;
  }

  function productIdentityKey({ itemName, rowIndex, previous }) {
    if (itemName && previous?.itemName === itemName && previous?.productKey) {
      return previous.productKey;
    }
    return `group:${rowIndex}`;
  }

  /**
   * Convert SheetJS-style rows (first row = headers) into a provider import.
   *
   * This is intentionally NOT a canonical catalog converter. It preserves
   * Square identity evidence (`Reference Handle`, `Token`) for the server-side
   * canonical authority to reconcile against stable AeroVista IDs.
   */
  function normalizeSquareRows(rows, { sourceName = null } = {}) {
    if (!Array.isArray(rows) || rows.length < 2) {
      throw new SquareImportError("Square import must include a header row and at least one data row.", {
        code: "empty_square_import",
      });
    }

    const headers = rows[0].map(text);
    const lookup = headerLookup(headers);
    const columns = {
      referenceHandle: column(lookup, ["Reference Handle", "ReferenceHandle", "Item Reference Handle"]),
      token: column(lookup, ["Token", "Variation Token", "Variation ID"], true),
      itemName: column(lookup, ["Item Name", "Name"], true),
      customerName: column(lookup, ["Customer-facing Name", "Customer Facing Name"]),
      variationName: column(lookup, ["Variation Name", "Variation"]),
      sku: column(lookup, ["SKU"]),
      description: column(lookup, ["Description"]),
      categories: column(lookup, ["Categories", "Category"]),
      reportingCategory: column(lookup, ["Reporting Category"]),
      seoTitle: column(lookup, ["SEO Title"]),
      seoDescription: column(lookup, ["SEO Description"]),
      visibility: column(lookup, ["Square Online Item Visibility", "Visibility"]),
      price: column(lookup, ["Price"]),
      archived: column(lookup, ["Archived"]),
      sellable: column(lookup, ["Sellable"]),
      stockable: column(lookup, ["Stockable"]),
      options: column(lookup, ["Options", "Option"]),
      optionName1: column(lookup, ["Option Name 1"]),
      optionValue1: column(lookup, ["Option Value 1"]),
      optionName2: column(lookup, ["Option Name 2"]),
      optionValue2: column(lookup, ["Option Value 2"]),
      imageName: column(lookup, ["Image Name", "Image"]),
    };

    const productsByKey = new Map();
    const providerTokens = new Set();
    const seenItemNames = new Set();
    const warnings = [];
    let previous = null;

    for (let sourceIndex = 1; sourceIndex < rows.length; sourceIndex += 1) {
      const row = rows[sourceIndex] || [];
      const token = value(row, columns.token);
      const rawItemName = value(row, columns.itemName);
      const rawReferenceHandle = value(row, columns.referenceHandle);
      if (!token && !rawItemName && !rawReferenceHandle) continue;

      if (!token) {
        warnings.push({
          code: "row_missing_token",
          row: sourceIndex + 1,
          itemName: rawItemName || null,
        });
        continue;
      }
      if (providerTokens.has(token)) {
        throw new SquareImportError(`Square Token '${token}' appears more than once in the import.`, {
          code: "duplicate_square_token",
          details: { token, row: sourceIndex + 1 },
        });
      }
      providerTokens.add(token);

      let itemName = rawItemName;
      if (!itemName && previous?.itemName) itemName = previous.itemName;

      const key = productIdentityKey({
        itemName,
        rowIndex: sourceIndex + 1,
        previous,
      });
      let product = productsByKey.get(key);
      if (!product) {
        if (itemName && seenItemNames.has(itemName)) {
          throw new SquareImportError(`Square item name '${itemName}' appears in multiple non-contiguous groups.`, {
            code: "ambiguous_square_item_grouping",
            details: { itemName, row: sourceIndex + 1 },
          });
        }
        if (itemName) seenItemNames.add(itemName);
        product = {
          providerRefs: {
            square: { grouping: "contiguous-item-name", itemName: itemName || null },
          },
          name: value(row, columns.customerName) || itemName || `Unresolved Square item row ${sourceIndex + 1}`,
          description: value(row, columns.description) || "",
          categories: splitList(value(row, columns.categories)),
          reportingCategory: value(row, columns.reportingCategory) || null,
          seoTitle: value(row, columns.seoTitle) || null,
          seoDescription: value(row, columns.seoDescription) || null,
          visibility: value(row, columns.visibility) || null,
          image: value(row, columns.imageName) || null,
          variants: [],
        };
        if (!itemName) {
          product.identityReviewRequired = true;
          warnings.push({
            code: "product_missing_item_name",
            row: sourceIndex + 1,
            itemName: null,
          });
        }
        productsByKey.set(key, product);
      } else {
        if (!product.description) product.description = value(row, columns.description) || "";
        if (!product.image) product.image = value(row, columns.imageName) || null;
      }

      const variationName = value(row, columns.variationName);
      const options = parseVariationOptions(
        value(row, columns.options),
        variationName,
        [
          [value(row, columns.optionName1), value(row, columns.optionValue1)],
          [value(row, columns.optionName2), value(row, columns.optionValue2)],
        ],
      );
      const variant = {
        providerRefs: {
          square: {
            variationId: token,
            ...(rawReferenceHandle ? { referenceHandle: rawReferenceHandle } : {}),
          },
        },
        variation_id: token,
        variationName: variationName || null,
        sku: value(row, columns.sku) || null,
        price: parsePrice(value(row, columns.price)),
        archived: parseBoolean(value(row, columns.archived)),
        sellable: parseBoolean(value(row, columns.sellable)),
        stockable: parseBoolean(value(row, columns.stockable)),
        options,
      };
      if (options.size) variant.size = options.size;
      if (options.color) variant.color = options.color;
      product.variants.push(variant);

      previous = { itemName, productKey: key };
    }

    return {
      schemaVersion: 1,
      provider: "square",
      sourceName,
      importedAt: new Date().toISOString(),
      products: [...productsByKey.values()],
      warnings,
      summary: {
        products: productsByKey.size,
        variants: providerTokens.size,
        unresolvedProducts: [...productsByKey.values()].filter((product) => product.identityReviewRequired).length,
        warnings: warnings.length,
      },
    };
  }

  return {
    SquareImportError,
    normalizeSquareRows,
  };
});
