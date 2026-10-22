const fs = require("fs");
const path = require("path");

const STORE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;
const PUBLISH_STRATEGIES = new Set(["legacy-catalog-api", "draft-files-only"]);

function resolvePath(root, value) {
  if (!value) return null;
  return path.isAbsolute(value) ? path.normalize(value) : path.resolve(root, value);
}

function envList(env, key) {
  if (!key || !env[key]) return null;
  return String(env[key])
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function loadStoreRegistry({ configPath, root, env = process.env }) {
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  if (!Array.isArray(config.stores) || !config.stores.length) {
    throw new Error("Store profile configuration must define at least one store.");
  }

  const profiles = new Map();
  for (const raw of config.stores) {
    const id = String(raw.id || "").trim().toLowerCase();
    if (!STORE_ID_PATTERN.test(id)) throw new Error(`Invalid store id: ${raw.id || "(blank)"}`);
    if (profiles.has(id)) throw new Error(`Duplicate store id: ${id}`);
    if (!PUBLISH_STRATEGIES.has(raw.publishStrategy)) {
      throw new Error(`Invalid publish strategy for ${id}.`);
    }

    const configuredRoot = raw.storeRootEnv && env[raw.storeRootEnv];
    const storeRoot = resolvePath(root, configuredRoot || raw.defaultStoreRoot);
    if (!storeRoot) throw new Error(`Store ${id} has no storage root.`);

    const configuredImages = envList(env, raw.imageDirsEnv);
    const imageDirs = (configuredImages || raw.defaultImageDirs || [path.join(storeRoot, "img")])
      .map((value) => resolvePath(root, value));
    const configuredBackup = raw.backupRootEnv && env[raw.backupRootEnv];
    const backupRoot = resolvePath(
      root,
      configuredBackup || raw.defaultBackupRoot || path.join(storeRoot, ".console-backups"),
    );

    profiles.set(id, Object.freeze({
      id,
      name: String(raw.name || id),
      mode: raw.mode === "live" ? "live" : "draft",
      shopUrl: String(raw.shopUrl || ""),
      storeRoot,
      imageDirs: Object.freeze(imageDirs),
      backupRoot,
      publishStrategy: raw.publishStrategy,
      requireCatalogApiSync: Boolean(raw.requireCatalogApiSync),
      checkoutChecks: Boolean(raw.checkoutChecks),
    }));
  }

  const defaultStoreId = String(config.defaultStoreId || "").trim().toLowerCase();
  if (!profiles.has(defaultStoreId)) throw new Error("The default store profile does not exist.");

  return Object.freeze({
    defaultStoreId,
    profiles,
    get(storeId) {
      const id = String(storeId || defaultStoreId).trim().toLowerCase();
      return profiles.get(id) || null;
    },
    publicProfiles() {
      return [...profiles.values()].map((profile) => ({
        id: profile.id,
        name: profile.name,
        mode: profile.mode,
        shopUrl: profile.shopUrl,
        publishStrategy: profile.publishStrategy,
        checkoutChecks: profile.checkoutChecks,
      }));
    },
  });
}

module.exports = { loadStoreRegistry, STORE_ID_PATTERN };

