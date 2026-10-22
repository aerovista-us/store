const { buildProviderMap } = require("./canonical-catalog");
const { createCanonicalCatalogStore } = require("./canonical-catalog-store");

function publicCatalogState(record) {
  return {
    exists: record.exists,
    etag: record.etag,
    updatedAt: record.updatedAt,
    catalog: record.state.catalog,
  };
}

function createCanonicalCatalogService({ directory }) {
  const store = createCanonicalCatalogStore({ directory });

  function status() {
    const current = store.read();
    const products = current.state.catalog.products || [];
    const variantCount = products.reduce(
      (total, product) => total + (Array.isArray(product?.variants) ? product.variants.length : 0),
      0,
    );
    return {
      configured: true,
      exists: current.exists,
      etag: current.etag,
      updatedAt: current.updatedAt,
      productCount: products.length,
      variantCount,
      providers: Object.keys(current.state.providers || {}).sort(),
    };
  }

  function readCatalog() {
    return publicCatalogState(store.read());
  }

  function reviewProviderImport({ catalog, provider = "square" }) {
    const result = store.reviewImport({ catalog, provider });
    return {
      etag: result.etag,
      review: result.review,
    };
  }

  function applyProviderImport({ catalog, provider = "square", expectedEtag = null, now = null }) {
    const result = store.applyImport({ catalog, provider, expectedEtag, now });
    return {
      ...publicCatalogState(result),
      review: result.review,
    };
  }

  // Internal-only adapter surface. Do not expose this through browser HTTP.
  function providerMap(provider = "square") {
    const current = store.read();
    return buildProviderMap({ state: current.state, provider });
  }

  return Object.freeze({
    status,
    readCatalog,
    reviewProviderImport,
    applyProviderImport,
    providerMap,
    readPrivateState: store.read,
  });
}

module.exports = { createCanonicalCatalogService };
