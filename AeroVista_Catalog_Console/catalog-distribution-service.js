const {
  CatalogDistributionError,
  distributeCatalog,
  normalizeDestinationProfiles,
} = require("./catalog-distribution");
const { reviewCatalogImport } = require("./catalog-import-review");
const {
  CatalogDistributionStoreError,
  createCatalogDistributionStore,
} = require("./catalog-distribution-store");
const { createCanonicalCatalogService } = require("./canonical-catalog-service");

function publicDestination(profile) {
  return {
    id: profile.id,
    name: profile.name,
    origin: profile.origin,
    type: profile.type,
    commerceStoreId: profile.commerceStoreId,
    favorite: profile.favorite,
  };
}

function createCatalogDistributionService({
  directory,
  destinations,
  catalogAuthority = null,
  canonicalCatalogDirectory = process.env.AV_CANONICAL_CATALOG_DIR || null,
  provider = "square",
}) {
  const profiles = normalizeDestinationProfiles(destinations);
  const store = createCatalogDistributionStore({ directory, destinations: profiles });
  const authority = catalogAuthority || (canonicalCatalogDirectory
    ? createCanonicalCatalogService({ directory: canonicalCatalogDirectory })
    : null);
  const authorityBacked = Boolean(
    authority &&
      typeof authority.readCatalog === "function" &&
      typeof authority.providerMap === "function",
  );

  function resolveCatalogContext({ catalog = null, providerMap = null } = {}) {
    if (authorityBacked) {
      const current = authority.readCatalog();
      const products = current?.catalog?.products;
      if (!current?.exists || !Array.isArray(products) || !products.length) {
        throw new CatalogDistributionError(
          "Canonical catalog authority has no accepted catalog to distribute.",
          {
            code: "canonical_catalog_unavailable",
          },
        );
      }
      return {
        catalog: current.catalog,
        providerMap: authority.providerMap(provider),
        catalogEtag: current.etag,
        catalogUpdatedAt: current.updatedAt,
        source: "canonical-authority",
      };
    }

    if (!catalog || !Array.isArray(catalog?.products)) {
      throw new CatalogDistributionError("A catalog is required when canonical authority is not attached.", {
        code: "catalog_required",
      });
    }
    return {
      catalog,
      providerMap,
      catalogEtag: null,
      catalogUpdatedAt: catalog?.updatedAt || catalog?.generated_at || null,
      source: "request",
    };
  }

  function preview({
    catalog = null,
    providerMap = null,
    distribution = null,
    previous = null,
    generatedAt = null,
  } = {}) {
    const context = resolveCatalogContext({ catalog, providerMap });
    const state = distribution ? { distribution } : store.read();
    const result = distributeCatalog({
      catalog: context.catalog,
      providerMap: context.providerMap,
      distribution: state.distribution,
      destinations: profiles,
      generatedAt: generatedAt || new Date().toISOString(),
    });

    return {
      etag: distribution ? null : state.etag,
      catalogVersion: result.catalogVersion,
      catalogSource: context.source,
      catalogEtag: context.catalogEtag,
      catalogUpdatedAt: context.catalogUpdatedAt,
      summary: result.summary,
      unassigned: result.unassigned,
      destinations: profiles.map(publicDestination),
      importReview: previous ? reviewCatalogImport({ previous, next: context.catalog }) : null,
    };
  }

  function generate({
    catalog = null,
    providerMap = null,
    distribution = null,
    generatedAt = null,
  } = {}) {
    const context = resolveCatalogContext({ catalog, providerMap });
    const state = distribution ? { distribution } : store.read();
    const result = distributeCatalog({
      catalog: context.catalog,
      providerMap: context.providerMap,
      distribution: state.distribution,
      destinations: profiles,
      generatedAt: generatedAt || new Date().toISOString(),
    });

    return {
      catalogVersion: result.catalogVersion,
      catalogSource: context.source,
      catalogEtag: context.catalogEtag,
      sourceCatalogGeneratedAt: result.sourceCatalogGeneratedAt,
      summary: result.summary,
      unassigned: result.unassigned,
      manifests: Object.fromEntries(
        Object.entries(result.destinations).map(([destinationId, output]) => [destinationId, output.catalog]),
      ),
    };
  }

  function save({
    catalog = null,
    providerMap = null,
    distribution,
    expectedEtag = null,
  }) {
    const context = resolveCatalogContext({ catalog, providerMap });
    const saved = store.save({
      catalog: context.catalog,
      providerMap: context.providerMap,
      distribution,
      expectedEtag,
    });
    return {
      ...saved,
      catalogSource: context.source,
      catalogEtag: context.catalogEtag,
    };
  }

  function history({ limit = 20 } = {}) {
    const current = store.read();
    return {
      current: {
        exists: current.exists,
        etag: current.etag,
        updatedAt: current.updatedAt,
      },
      backups: store.history({ limit }),
    };
  }

  function restore({
    catalog = null,
    providerMap = null,
    backupId,
    expectedEtag,
  }) {
    if (!expectedEtag) {
      throw new CatalogDistributionStoreError("expectedEtag is required before restoring distribution metadata.", {
        code: "expected_etag_required",
        status: 428,
      });
    }
    const context = resolveCatalogContext({ catalog, providerMap });
    const backup = store.readBackup(backupId);
    const saved = store.save({
      catalog: context.catalog,
      providerMap: context.providerMap,
      distribution: backup.distribution,
      expectedEtag,
    });
    return {
      ...saved,
      catalogSource: context.source,
      catalogEtag: context.catalogEtag,
      restoredFrom: {
        id: backup.id,
        etag: backup.etag,
        createdAt: backup.createdAt,
      },
    };
  }

  function status() {
    const state = store.read();
    const authorityStatus = authorityBacked && typeof authority.status === "function"
      ? authority.status()
      : null;
    return {
      configured: true,
      exists: state.exists,
      etag: state.etag,
      updatedAt: state.updatedAt,
      catalogSource: authorityBacked ? "canonical-authority" : "request",
      catalogAuthority: authorityStatus
        ? {
            exists: authorityStatus.exists,
            etag: authorityStatus.etag,
            updatedAt: authorityStatus.updatedAt,
            productCount: authorityStatus.productCount,
            variantCount: authorityStatus.variantCount,
          }
        : null,
      destinations: profiles.map(publicDestination),
      favorites: profiles.filter((profile) => profile.favorite).map((profile) => profile.id),
    };
  }

  return Object.freeze({
    status,
    preview,
    generate,
    save,
    history,
    restore,
    read: store.read,
    usesCanonicalAuthority: () => authorityBacked,
  });
}

module.exports = { createCatalogDistributionService };
