const { CatalogRoutingError } = require("./catalog-router");
const { CatalogRoutingStoreError } = require("./catalog-routing-store");

function json(status, body) {
  return { status, body };
}

function errorResponse(error, defaultStatus = 500) {
  const status = Number(error?.status || defaultStatus);
  return json(status, {
    ok: false,
    code: error?.code || "catalog_routing_error",
    error: status >= 500 ? "Catalog routing operation failed." : String(error?.message || "Request failed."),
    ...(status < 500 && error?.details ? { details: error.details } : {}),
  });
}

/**
 * Pure request contract for the authenticated Console server.
 *
 * It performs no authentication itself. The mature Console server must call
 * this only after its existing auth boundary succeeds (or, later, the accepted
 * AeroCore session boundary). Keeping auth outside this module prevents a
 * second/weaker credential implementation from appearing here.
 */
async function handleCatalogRoutingHttp({ method, pathname, body = null, service }) {
  try {
    if (method === "GET" && pathname === "/api/catalog-routing/status") {
      return json(200, { ok: true, ...service.status() });
    }

    if (method === "GET" && pathname === "/api/catalog-routing") {
      const state = service.read();
      return json(200, {
        ok: true,
        exists: state.exists,
        etag: state.etag,
        updatedAt: state.updatedAt,
        assignments: state.assignments,
      });
    }

    if (method === "POST" && pathname === "/api/catalog-routing/preview") {
      if (!body?.catalog) return json(400, { ok: false, code: "catalog_required", error: "catalog is required." });
      const preview = service.preview({
        catalog: body.catalog,
        assignments: body.assignments ?? null,
        previous: body.previous ?? null,
      });
      return json(200, { ok: true, ...preview });
    }

    if (method === "PUT" && pathname === "/api/catalog-routing") {
      if (!body?.catalog) return json(400, { ok: false, code: "catalog_required", error: "catalog is required." });
      if (!body?.assignments || typeof body.assignments !== "object" || Array.isArray(body.assignments)) {
        return json(400, { ok: false, code: "assignments_required", error: "assignments is required." });
      }
      const saved = service.save({
        catalog: body.catalog,
        assignments: body.assignments,
        expectedEtag: body.expectedEtag || null,
      });
      return json(200, {
        ok: true,
        etag: saved.etag,
        updatedAt: saved.updatedAt,
        assignments: saved.assignments,
        preview: saved.preview,
      });
    }

    return null;
  } catch (error) {
    if (error instanceof CatalogRoutingStoreError) return errorResponse(error);
    if (error instanceof CatalogRoutingError) return errorResponse(error, 400);
    return errorResponse(error);
  }
}

module.exports = { handleCatalogRoutingHttp, errorResponse };
