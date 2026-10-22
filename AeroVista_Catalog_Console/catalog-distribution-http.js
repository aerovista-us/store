const { CatalogDistributionError } = require("./catalog-distribution");
const { CatalogDistributionStoreError } = require("./catalog-distribution-store");
const { CatalogRoutingError } = require("./catalog-router");

function json(status, body) {
  return { status, body };
}

function errorResponse(error, defaultStatus = 500) {
  const status = Number(error?.status || defaultStatus);
  return json(status, {
    ok: false,
    code: error?.code || "catalog_distribution_error",
    error: status >= 500 ? "Catalog distribution operation failed." : String(error?.message || "Request failed."),
    ...(status < 500 && error?.details ? { details: error.details } : {}),
  });
}

async function handleCatalogDistributionHttp({ method, pathname, body = null, service }) {
  try {
    const authorityBacked = Boolean(service?.usesCanonicalAuthority?.());

    if (method === "GET" && pathname === "/api/catalog-distribution/status") {
      return json(200, { ok: true, ...service.status() });
    }

    if (method === "GET" && pathname === "/api/catalog-distribution") {
      const state = service.read();
      return json(200, {
        ok: true,
        exists: state.exists,
        etag: state.etag,
        updatedAt: state.updatedAt,
        distribution: state.distribution,
      });
    }

    if (method === "GET" && pathname === "/api/catalog-distribution/history") {
      return json(200, { ok: true, ...service.history() });
    }

    if (method === "POST" && pathname === "/api/catalog-distribution/restore") {
      if (!authorityBacked && !body?.catalog) {
        return json(400, { ok: false, code: "catalog_required", error: "catalog is required." });
      }
      if (!body?.backupId) {
        return json(400, {
          ok: false,
          code: "backup_id_required",
          error: "backupId is required.",
        });
      }
      if (!body?.expectedEtag) {
        return json(428, {
          ok: false,
          code: "expected_etag_required",
          error: "expectedEtag is required before restoring distribution metadata.",
        });
      }
      const restored = service.restore({
        catalog: authorityBacked ? null : body?.catalog,
        backupId: body.backupId,
        expectedEtag: body.expectedEtag,
      });
      return json(200, {
        ok: true,
        etag: restored.etag,
        updatedAt: restored.updatedAt,
        catalogSource: restored.catalogSource,
        catalogEtag: restored.catalogEtag,
        distribution: restored.distribution,
        preview: restored.preview,
        restoredFrom: restored.restoredFrom,
      });
    }

    if (method === "POST" && pathname === "/api/catalog-distribution/preview") {
      if (!authorityBacked && !body?.catalog) {
        return json(400, { ok: false, code: "catalog_required", error: "catalog is required." });
      }
      const preview = service.preview({
        catalog: authorityBacked ? null : body?.catalog,
        distribution: body?.distribution ?? null,
        previous: body?.previous ?? null,
        generatedAt: body?.generatedAt ?? null,
      });
      return json(200, { ok: true, ...preview });
    }

    if (method === "POST" && pathname === "/api/catalog-distribution/generate") {
      if (!authorityBacked && !body?.catalog) {
        return json(400, { ok: false, code: "catalog_required", error: "catalog is required." });
      }
      const generated = service.generate({
        catalog: authorityBacked ? null : body?.catalog,
        distribution: body?.distribution ?? null,
        generatedAt: body?.generatedAt ?? null,
      });
      return json(200, { ok: true, ...generated });
    }

    if (method === "PUT" && pathname === "/api/catalog-distribution") {
      if (!authorityBacked && !body?.catalog) {
        return json(400, { ok: false, code: "catalog_required", error: "catalog is required." });
      }
      if (!body?.distribution || typeof body.distribution !== "object" || Array.isArray(body.distribution)) {
        return json(400, {
          ok: false,
          code: "distribution_required",
          error: "distribution is required.",
        });
      }
      const saved = service.save({
        catalog: authorityBacked ? null : body?.catalog,
        distribution: body.distribution,
        expectedEtag: body.expectedEtag || null,
      });
      return json(200, {
        ok: true,
        etag: saved.etag,
        updatedAt: saved.updatedAt,
        catalogSource: saved.catalogSource,
        catalogEtag: saved.catalogEtag,
        distribution: saved.distribution,
        preview: saved.preview,
      });
    }

    return null;
  } catch (error) {
    if (error instanceof CatalogDistributionStoreError) return errorResponse(error);
    if (error instanceof CatalogDistributionError) return errorResponse(error, 400);
    if (error instanceof CatalogRoutingError) return errorResponse(error, 400);
    return errorResponse(error);
  }
}

module.exports = { handleCatalogDistributionHttp, errorResponse };
