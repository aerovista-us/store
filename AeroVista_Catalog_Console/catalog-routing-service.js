const { routeMasterCatalog } = require("./catalog-router");
const { suggestProductRoutes } = require("./catalog-routing-suggestions");
const { reviewCatalogImport } = require("./catalog-import-review");
const { createCatalogRoutingStore } = require("./catalog-routing-store");

function createCatalogRoutingService({ directory, storeIds }) {
  const store = createCatalogRoutingStore({ directory, storeIds });

  function preview({ catalog, assignments = null, previous = null }) {
    const state = assignments ? { assignments } : store.read();
    const routed = routeMasterCatalog({
      catalog,
      assignments: state.assignments,
      storeIds,
    });
    return {
      etag: assignments ? null : state.etag,
      summary: routed.summary,
      unassigned: routed.unassigned,
      suggestions: suggestProductRoutes({ catalog, assignments: state.assignments })
        .filter((item) => storeIds.includes(item.suggestedStores[0])),
      importReview: previous ? reviewCatalogImport({ previous, next: catalog }) : null,
    };
  }

  function save({ catalog, assignments, expectedEtag = null }) {
    return store.save({ catalog, assignments, expectedEtag });
  }

  function status() {
    const state = store.read();
    return {
      configured: true,
      exists: state.exists,
      etag: state.etag,
      updatedAt: state.updatedAt,
      stores: [...storeIds],
    };
  }

  return Object.freeze({ status, preview, save, read: store.read });
}

module.exports = { createCatalogRoutingService };
