const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { routeMasterCatalog } = require("./catalog-router");

class CatalogRoutingStoreError extends Error {
  constructor(message, { code = "catalog_routing_store_error", status = 500, details = null } = {}) {
    super(message);
    this.name = "CatalogRoutingStoreError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function canonicalAssignments(value) {
  const assignments = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const normalized = {
    schemaVersion: 1,
    products: {},
    variants: {},
  };
  for (const [productId, stores] of Object.entries(assignments.products || {})) {
    normalized.products[String(productId)] = Array.isArray(stores) ? [...stores] : [stores];
  }
  for (const [variationId, stores] of Object.entries(assignments.variants || {})) {
    normalized.variants[String(variationId)] = Array.isArray(stores) ? [...stores] : [stores];
  }
  return normalized;
}

function serialize(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function routingEtag(assignments) {
  return sha256(serialize(canonicalAssignments(assignments)));
}

function atomicWrite(filePath, text) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const temp = path.join(dir, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  try {
    fs.writeFileSync(temp, text, { encoding: "utf8", mode: 0o640, flag: "wx" });
    JSON.parse(fs.readFileSync(temp, "utf8"));
    fs.renameSync(temp, filePath);
  } catch (error) {
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
    throw error;
  }
}

function createCatalogRoutingStore({ directory, storeIds, fileName = "catalog-routing.json", maxBackups = 20 }) {
  if (!directory) {
    throw new CatalogRoutingStoreError("Catalog routing persistence requires an explicit directory.", {
      code: "routing_directory_required",
    });
  }
  const root = path.resolve(directory);
  if (root === path.parse(root).root) {
    throw new CatalogRoutingStoreError("Refusing to use a filesystem root for catalog routing persistence.", {
      code: "unsafe_routing_directory",
    });
  }
  const filePath = path.join(root, fileName);
  const backupDir = path.join(root, "backups");

  function read() {
    if (!fs.existsSync(filePath)) {
      const assignments = canonicalAssignments({});
      return { exists: false, assignments, etag: routingEtag(assignments), updatedAt: null };
    }
    let assignments;
    try {
      assignments = canonicalAssignments(JSON.parse(fs.readFileSync(filePath, "utf8")));
    } catch (error) {
      throw new CatalogRoutingStoreError("Stored catalog routing metadata is invalid JSON.", {
        code: "invalid_stored_routing",
        details: { error: error.message },
      });
    }
    const stat = fs.statSync(filePath);
    return {
      exists: true,
      assignments,
      etag: routingEtag(assignments),
      updatedAt: stat.mtime.toISOString(),
    };
  }

  function pruneBackups() {
    if (!fs.existsSync(backupDir)) return;
    const files = fs.readdirSync(backupDir)
      .map((name) => ({ name, full: path.join(backupDir, name) }))
      .filter((entry) => fs.statSync(entry.full).isFile())
      .sort((a, b) => fs.statSync(b.full).mtimeMs - fs.statSync(a.full).mtimeMs);
    for (const entry of files.slice(Math.max(1, maxBackups))) fs.unlinkSync(entry.full);
  }

  function save({ assignments, catalog, expectedEtag = null }) {
    const current = read();
    if (expectedEtag && expectedEtag !== current.etag) {
      throw new CatalogRoutingStoreError("Catalog routing assignments changed since they were loaded.", {
        code: "routing_conflict",
        status: 409,
        details: { expectedEtag, currentEtag: current.etag },
      });
    }

    const normalized = canonicalAssignments(assignments);
    // The routing engine is the single validation authority. A save cannot
    // persist stale products/variations or unknown stores even if a client
    // bypasses UI checks.
    const preview = routeMasterCatalog({ catalog, assignments: normalized, storeIds });
    const text = serialize(normalized);

    fs.mkdirSync(root, { recursive: true });
    if (fs.existsSync(filePath)) {
      fs.mkdirSync(backupDir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      fs.copyFileSync(filePath, path.join(backupDir, `${stamp}-${fileName}`));
    }
    atomicWrite(filePath, text);
    pruneBackups();

    const saved = read();
    return {
      ...saved,
      preview: {
        summary: preview.summary,
        unassigned: preview.unassigned,
      },
    };
  }

  return Object.freeze({ root, filePath, read, save });
}

module.exports = {
  CatalogRoutingStoreError,
  canonicalAssignments,
  createCatalogRoutingStore,
  routingEtag,
};
