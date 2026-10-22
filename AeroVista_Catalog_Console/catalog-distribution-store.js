const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { distributeCatalog } = require("./catalog-distribution");

class CatalogDistributionStoreError extends Error {
  constructor(message, { code = "catalog_distribution_store_error", status = 500, details = null } = {}) {
    super(message);
    this.name = "CatalogDistributionStoreError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function plainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function canonicalDistribution(value) {
  const source = plainObject(value) ? JSON.parse(JSON.stringify(value)) : {};
  if (source.schemaVersion != null && Number(source.schemaVersion) !== 1) {
    throw new CatalogDistributionStoreError("Unsupported catalog distribution schema version.", {
      code: "unsupported_distribution_schema",
      status: 400,
      details: { schemaVersion: source.schemaVersion },
    });
  }
  source.schemaVersion = 1;
  if (!plainObject(source.productSets)) source.productSets = {};
  if (!plainObject(source.destinations)) source.destinations = {};
  return source;
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!plainObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stableValue(value[key])]),
  );
}

function serialize(value) {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

function distributionEtag(distribution) {
  return crypto.createHash("sha256").update(serialize(canonicalDistribution(distribution))).digest("hex");
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

function createCatalogDistributionStore({
  directory,
  destinations,
  fileName = "catalog-distribution.json",
  maxBackups = 20,
}) {
  if (!directory) {
    throw new CatalogDistributionStoreError("Catalog distribution persistence requires an explicit directory.", {
      code: "distribution_directory_required",
    });
  }

  const root = path.resolve(directory);
  if (root === path.parse(root).root) {
    throw new CatalogDistributionStoreError("Refusing to use a filesystem root for catalog distribution persistence.", {
      code: "unsafe_distribution_directory",
    });
  }

  const filePath = path.join(root, fileName);
  const backupDir = path.join(root, "backups");

  function read() {
    if (!fs.existsSync(filePath)) {
      const distribution = canonicalDistribution({});
      return {
        exists: false,
        distribution,
        etag: distributionEtag(distribution),
        updatedAt: null,
      };
    }

    let distribution;
    try {
      distribution = canonicalDistribution(JSON.parse(fs.readFileSync(filePath, "utf8")));
    } catch (error) {
      if (error instanceof CatalogDistributionStoreError) throw error;
      throw new CatalogDistributionStoreError("Stored catalog distribution metadata is invalid JSON.", {
        code: "invalid_stored_distribution",
        details: { error: error.message },
      });
    }

    const stat = fs.statSync(filePath);
    return {
      exists: true,
      distribution,
      etag: distributionEtag(distribution),
      updatedAt: stat.mtime.toISOString(),
    };
  }

  function backupFiles() {
    if (!fs.existsSync(backupDir)) return [];
    return fs.readdirSync(backupDir)
      .filter((name) => name.endsWith(`-${fileName}`))
      .map((name) => ({ name, full: path.join(backupDir, name) }))
      .filter((entry) => fs.lstatSync(entry.full).isFile())
      .sort((a, b) => fs.statSync(b.full).mtimeMs - fs.statSync(a.full).mtimeMs);
  }

  function pruneBackups() {
    for (const entry of backupFiles().slice(Math.max(1, maxBackups))) fs.unlinkSync(entry.full);
  }

  function readBackup(backupId) {
    const id = String(backupId || "").trim();
    if (!id || path.basename(id) !== id || !id.endsWith(`-${fileName}`)) {
      throw new CatalogDistributionStoreError("Invalid catalog distribution backup id.", {
        code: "invalid_distribution_backup_id",
        status: 400,
      });
    }
    const full = path.join(backupDir, id);
    if (!fs.existsSync(full) || !fs.lstatSync(full).isFile()) {
      throw new CatalogDistributionStoreError("Catalog distribution backup was not found.", {
        code: "distribution_backup_not_found",
        status: 404,
        details: { backupId: id },
      });
    }

    const stat = fs.statSync(full);
    try {
      const distribution = canonicalDistribution(JSON.parse(fs.readFileSync(full, "utf8")));
      return {
        id,
        createdAt: stat.mtime.toISOString(),
        sizeBytes: stat.size,
        etag: distributionEtag(distribution),
        distribution,
      };
    } catch (error) {
      if (error instanceof CatalogDistributionStoreError) throw error;
      throw new CatalogDistributionStoreError("Catalog distribution backup is not usable.", {
        code: "invalid_distribution_backup",
        status: 409,
        details: { backupId: id },
      });
    }
  }

  function history({ limit = maxBackups } = {}) {
    const boundedLimit = Math.max(1, Math.min(100, Number(limit) || maxBackups));
    return backupFiles().slice(0, boundedLimit).map((entry) => {
      try {
        const record = readBackup(entry.name);
        return {
          id: record.id,
          createdAt: record.createdAt,
          sizeBytes: record.sizeBytes,
          etag: record.etag,
          valid: true,
        };
      } catch (error) {
        const stat = fs.statSync(entry.full);
        return {
          id: entry.name,
          createdAt: stat.mtime.toISOString(),
          sizeBytes: stat.size,
          etag: null,
          valid: false,
        };
      }
    });
  }

  function save({ distribution, catalog, providerMap = null, expectedEtag = null }) {
    const current = read();
    if (expectedEtag && expectedEtag !== current.etag) {
      throw new CatalogDistributionStoreError("Catalog distribution changed since it was loaded.", {
        code: "distribution_conflict",
        status: 409,
        details: { expectedEtag, currentEtag: current.etag },
      });
    }

    const normalized = canonicalDistribution(distribution);
    const preview = distributeCatalog({
      catalog,
      providerMap,
      distribution: normalized,
      destinations,
      generatedAt: new Date().toISOString(),
    });
    const text = serialize(normalized);

    fs.mkdirSync(root, { recursive: true });
    if (fs.existsSync(filePath)) {
      fs.mkdirSync(backupDir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const nonce = crypto.randomBytes(3).toString("hex");
      fs.copyFileSync(filePath, path.join(backupDir, `${stamp}-${nonce}-${fileName}`));
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

  return Object.freeze({ root, filePath, read, save, history, readBackup });
}

module.exports = {
  CatalogDistributionStoreError,
  canonicalDistribution,
  createCatalogDistributionStore,
  distributionEtag,
};
