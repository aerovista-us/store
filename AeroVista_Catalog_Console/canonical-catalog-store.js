const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const {
  CanonicalCatalogError,
  applyProviderImport,
  canonicalState,
  reviewProviderImport,
} = require("./canonical-catalog");

class CanonicalCatalogStoreError extends Error {
  constructor(message, { code = "canonical_catalog_store_error", status = 500, details = null } = {}) {
    super(message);
    this.name = "CanonicalCatalogStoreError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stableValue(value[key])]),
  );
}

function serializeState(value) {
  return `${JSON.stringify(stableValue(canonicalState(value)), null, 2)}\n`;
}

function stateEtag(value) {
  return crypto.createHash("sha256").update(serializeState(value)).digest("hex");
}

function atomicWrite(filePath, text) {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });
  const tempPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${crypto.randomBytes(4).toString("hex")}.tmp`,
  );
  try {
    fs.writeFileSync(tempPath, text, { encoding: "utf8", mode: 0o640, flag: "wx" });
    canonicalState(JSON.parse(fs.readFileSync(tempPath, "utf8")));
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    throw error;
  }
}

function createCanonicalCatalogStore({
  directory,
  fileName = "canonical-catalog-state.json",
  maxBackups = 30,
}) {
  if (!directory) {
    throw new CanonicalCatalogStoreError("Canonical catalog persistence requires an explicit directory.", {
      code: "canonical_catalog_directory_required",
    });
  }
  const root = path.resolve(directory);
  if (root === path.parse(root).root) {
    throw new CanonicalCatalogStoreError("Refusing to use a filesystem root for canonical catalog state.", {
      code: "unsafe_canonical_catalog_directory",
    });
  }

  const filePath = path.join(root, fileName);
  const backupDirectory = path.join(root, "backups");

  function read() {
    if (!fs.existsSync(filePath)) {
      const state = canonicalState();
      return {
        exists: false,
        state,
        etag: stateEtag(state),
        updatedAt: null,
      };
    }

    try {
      const state = canonicalState(JSON.parse(fs.readFileSync(filePath, "utf8")));
      const stat = fs.statSync(filePath);
      return {
        exists: true,
        state,
        etag: stateEtag(state),
        updatedAt: stat.mtime.toISOString(),
      };
    } catch (error) {
      if (error instanceof CanonicalCatalogError || error instanceof CanonicalCatalogStoreError) throw error;
      throw new CanonicalCatalogStoreError("Stored canonical catalog state is invalid.", {
        code: "invalid_stored_canonical_catalog",
        details: { error: error.message },
      });
    }
  }

  function pruneBackups() {
    if (!fs.existsSync(backupDirectory)) return;
    const files = fs
      .readdirSync(backupDirectory)
      .map((name) => ({ name, fullPath: path.join(backupDirectory, name) }))
      .filter((entry) => fs.statSync(entry.fullPath).isFile())
      .sort((a, b) => fs.statSync(b.fullPath).mtimeMs - fs.statSync(a.fullPath).mtimeMs);
    for (const entry of files.slice(Math.max(1, maxBackups))) fs.unlinkSync(entry.fullPath);
  }

  function writeState({ state, expectedEtag = null }) {
    const current = read();
    if (expectedEtag && expectedEtag !== current.etag) {
      throw new CanonicalCatalogStoreError("Canonical catalog changed since it was loaded.", {
        code: "canonical_catalog_conflict",
        status: 409,
        details: { expectedEtag, currentEtag: current.etag },
      });
    }

    const normalized = canonicalState(state);
    const text = serializeState(normalized);
    fs.mkdirSync(root, { recursive: true });
    if (fs.existsSync(filePath)) {
      fs.mkdirSync(backupDirectory, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      fs.copyFileSync(filePath, path.join(backupDirectory, `${stamp}-${fileName}`));
    }
    atomicWrite(filePath, text);
    pruneBackups();
    return read();
  }

  function reviewImport({ catalog, provider = "square" }) {
    const current = read();
    return {
      etag: current.etag,
      review: reviewProviderImport({ state: current.state, catalog, provider }),
    };
  }

  function applyImport({ catalog, provider = "square", expectedEtag = null, now = null }) {
    const current = read();
    if (expectedEtag && expectedEtag !== current.etag) {
      throw new CanonicalCatalogStoreError("Canonical catalog changed since it was loaded.", {
        code: "canonical_catalog_conflict",
        status: 409,
        details: { expectedEtag, currentEtag: current.etag },
      });
    }

    const result = applyProviderImport({
      state: current.state,
      catalog,
      provider,
      ...(now ? { now } : {}),
    });
    const saved = writeState({ state: result.state, expectedEtag: current.etag });
    return {
      ...saved,
      review: result.review,
      providerMap: result.providerMap,
    };
  }

  return Object.freeze({
    root,
    filePath,
    read,
    writeState,
    reviewImport,
    applyImport,
  });
}

module.exports = {
  CanonicalCatalogStoreError,
  createCanonicalCatalogStore,
  serializeState,
  stateEtag,
};
