const { CanonicalCatalogError } = require("./canonical-catalog");
const { CanonicalCatalogStoreError } = require("./canonical-catalog-store");

function json(status, body) {
  return { status, body };
}

function errorResponse(error, defaultStatus = 500) {
  const status = Number(error?.status || defaultStatus);
  return json(status, {
    ok: false,
    code: error?.code || "canonical_catalog_error",
    error: status >= 500 ? "Canonical catalog operation failed." : String(error?.message || "Request failed."),
    ...(status < 500 && error?.details ? { details: error.details } : {}),
  });
}

async function handleCanonicalCatalogHttp({ method, pathname, body = null, service }) {
  try {
    if (method === "GET" && pathname === "/api/catalog-authority/status") {
      return json(200, { ok: true, ...service.status() });
    }

    if (method === "GET" && pathname === "/api/catalog-authority/catalog") {
      return json(200, { ok: true, ...service.readCatalog() });
    }

    if (method === "POST" && pathname === "/api/catalog-authority/provider-import/review") {
      if (!body?.catalog) {
        return json(400, { ok: false, code: "catalog_required", error: "catalog is required." });
      }
      const result = service.reviewProviderImport({
        catalog: body.catalog,
        provider: body.provider || "square",
      });
      return json(200, { ok: true, ...result });
    }

    if (method === "PUT" && pathname === "/api/catalog-authority/provider-import") {
      if (!body?.catalog) {
        return json(400, { ok: false, code: "catalog_required", error: "catalog is required." });
      }
      if (!body?.expectedEtag) {
        return json(428, {
          ok: false,
          code: "expected_etag_required",
          error: "expectedEtag is required before accepting a provider import.",
        });
      }
      const result = service.applyProviderImport({
        catalog: body.catalog,
        provider: body.provider || "square",
        expectedEtag: body.expectedEtag,
        now: body.now || null,
      });
      return json(200, { ok: true, ...result });
    }

    return null;
  } catch (error) {
    if (error instanceof CanonicalCatalogStoreError) return errorResponse(error);
    if (error instanceof CanonicalCatalogError) return errorResponse(error, 400);
    return errorResponse(error);
  }
}

module.exports = { handleCanonicalCatalogHttp, errorResponse };
