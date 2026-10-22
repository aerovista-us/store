const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");
const { pullProductImages, providerEnv } = require("./pull-product-images");

const PORT = Number(process.env.PORT || 80);
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = __dirname;
const STORE_ROOT = process.env.AV_STORE_DIR || path.resolve(ROOT, "../store");
const PUBLIC_ROOT = process.env.AV_PUBLIC_DIR || path.resolve(ROOT, "../public");
const BACKUP_ROOT =
  process.env.AV_CONSOLE_BACKUP_DIR || path.resolve(ROOT, "../console-backups");
const SCRIPT_DIR = process.env.AV_SCRIPT_DIR || path.resolve(ROOT, "../store/scripts");
const SCRIPT_PATH = path.join(SCRIPT_DIR, "bulk_remove_bg.py");
const DEFAULT_IN = process.env.AV_REMOVE_BG_IN || path.join(STORE_ROOT, "bg_remove_in");
const DEFAULT_OUT = process.env.AV_REMOVE_BG_OUT || path.join(STORE_ROOT, "bg_remove_out");
const IMG_WRITE_ROOT = process.env.AV_IMG_WRITE_DIR || path.join(STORE_ROOT, "img");
const API_BOOTSTRAP =
  process.env.AV_API_BOOTSTRAP || "https://api.aerovista.us/api/square/bootstrap";
const STORE_API_URL = (process.env.AV_STORE_API_URL || "http://av-store-api:8088").replace(
  /\/+$/,
  "",
);
const CATALOG_API_TOKEN = (process.env.AV_CATALOG_API_TOKEN || "").trim();
const REQUIRE_CATALOG_API_SYNC =
  String(process.env.CONSOLE_REQUIRE_CATALOG_API_SYNC || "true").toLowerCase() !== "false";
const AUTH_USER = (process.env.CONSOLE_AUTH_USER || "operator").trim();
const AUTH_PASSWORD = (process.env.CONSOLE_AUTH_PASSWORD || "").trim();
const MAX_BODY_BYTES = Math.max(
  1024,
  Number(process.env.CONSOLE_MAX_BODY_BYTES || 12 * 1024 * 1024),
);
const IMAGE_DIRS = (
  process.env.AV_IMAGE_DIRS || `${path.join(STORE_ROOT, "img")},${IMG_WRITE_ROOT}`
)
  .split(",")
  .map((dir) => dir.trim())
  .filter(Boolean);
const ALLOWED_ORIGINS = new Set(
  (
    process.env.CONSOLE_ALLOWED_ORIGINS ||
    "https://store-console.aerocoreos.com,https://avcc.aerocoreos.com"
  )
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean),
);

let running = null;
let lastDeploy = null;
let lastCatalogSync = null;

function securityHeaders(req) {
  const headers = {
    "cache-control": "no-store",
    "content-security-policy":
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://api.aerovista.us http://127.0.0.1:5199; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self' https://avcc.aerocoreos.com",
    "cross-origin-opener-policy": "same-origin",
    "permissions-policy": "camera=(), geolocation=(), microphone=()",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
  };
  const origin = String(req.headers.origin || "").replace(/\/+$/, "");
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["access-control-allow-origin"] = origin;
    headers["access-control-allow-credentials"] = "true";
    headers.vary = "Origin";
  }
  return headers;
}

function sendJson(req, res, status, data) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    ...securityHeaders(req),
    "content-type": "application/json; charset=utf-8",
  });
  if (req.method === "HEAD") return res.end();
  res.end(body);
}

function sendText(req, res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    ...securityHeaders(req),
    "content-type": type,
  });
  if (req.method === "HEAD") return res.end();
  res.end(body);
}

function safeEqual(actual, expected) {
  const actualBuffer = Buffer.from(String(actual));
  const expectedBuffer = Buffer.from(String(expected));
  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function isAuthorized(req) {
  if (!AUTH_USER || !AUTH_PASSWORD) return false;
  const header = String(req.headers.authorization || "");
  if (!header.startsWith("Basic ")) return false;
  let decoded = "";
  try {
    decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  } catch {
    return false;
  }
  const separator = decoded.indexOf(":");
  if (separator < 0) return false;
  return (
    safeEqual(decoded.slice(0, separator), AUTH_USER) &&
    safeEqual(decoded.slice(separator + 1), AUTH_PASSWORD)
  );
}

function requireAuth(req, res) {
  if (!AUTH_USER || !AUTH_PASSWORD) {
    sendJson(req, res, 503, {
      ok: false,
      error: "Console authentication is not configured; service remains fail-closed.",
    });
    return false;
  }
  if (!isAuthorized(req)) {
    res.writeHead(401, {
      ...securityHeaders(req),
      "content-type": "application/json; charset=utf-8",
      "www-authenticate": 'Basic realm="AeroVista Catalog Console", charset="UTF-8"',
    });
    res.end(JSON.stringify({ ok: false, error: "Authentication required." }));
    return false;
  }
  return true;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let rejected = false;
    req.on("data", (chunk) => {
      if (rejected) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        rejected = true;
        const error = new Error("Request body exceeds the configured limit.");
        error.statusCode = 413;
        reject(error);
        req.resume();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!rejected) resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}

function safeStaticPath(urlPath) {
  let clean;
  try {
    clean = decodeURIComponent(urlPath.split("?")[0]);
  } catch {
    return null;
  }
  const rel = clean === "/" ? "aerovista_catalog_console_v2.html" : clean.replace(/^\/+/, "");
  const resolved = path.resolve(ROOT, rel);
  return resolved === ROOT || resolved.startsWith(`${ROOT}${path.sep}`) ? resolved : null;
}

function serveStatic(req, res) {
  const filePath = safeStaticPath(req.url || "/");
  if (!filePath) return sendText(req, res, 403, "Forbidden");
  fs.readFile(filePath, (err, data) => {
    if (err) return sendText(req, res, 404, "Not found");
    const ext = path.extname(filePath).toLowerCase();
    const types = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
    };
    res.writeHead(200, {
      ...securityHeaders(req),
      "content-type": types[ext] || "application/octet-stream",
    });
    if (req.method === "HEAD") return res.end();
    res.end(data);
  });
}

function productList(catalog) {
  if (Array.isArray(catalog)) return catalog;
  if (catalog && Array.isArray(catalog.products)) return catalog.products;
  if (catalog && Array.isArray(catalog.items)) return catalog.items;
  return null;
}

function productCount(catalog) {
  return productList(catalog)?.length || 0;
}

function validateCatalog(catalog) {
  const products = productList(catalog);
  if (!products) throw Object.assign(new Error("Catalog must contain a product array."), { statusCode: 400 });
  if (!products.length) throw Object.assign(new Error("Catalog cannot be empty."), { statusCode: 400 });
  if (products.length > 5000) {
    throw Object.assign(new Error("Catalog exceeds the 5,000-product safety limit."), { statusCode: 400 });
  }
  for (let index = 0; index < products.length; index += 1) {
    const product = products[index];
    if (!product || typeof product !== "object" || Array.isArray(product)) {
      throw Object.assign(new Error(`Catalog product ${index + 1} is not an object.`), { statusCode: 400 });
    }
    const identity = product.id || product.itemId || product.item_id || product.name;
    if (!String(identity || "").trim()) {
      throw Object.assign(new Error(`Catalog product ${index + 1} has no identity or name.`), { statusCode: 400 });
    }
  }
  JSON.stringify(catalog);
  return products.length;
}

function normalizeJson(data) {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  JSON.parse(text);
  return text.endsWith("\n") ? text : `${text}\n`;
}

function storeWritable() {
  try {
    fs.accessSync(STORE_ROOT, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function fileStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function pruneBackups(maxFiles = 60) {
  if (!fs.existsSync(BACKUP_ROOT)) return;
  const files = fs
    .readdirSync(BACKUP_ROOT)
    .map((name) => ({ name, full: path.join(BACKUP_ROOT, name) }))
    .filter((item) => fs.statSync(item.full).isFile())
    .sort((a, b) => fs.statSync(b.full).mtimeMs - fs.statSync(a.full).mtimeMs);
  for (const item of files.slice(maxFiles)) fs.unlinkSync(item.full);
}

function deployFiles(catalog, overlay) {
  const catalogPath = path.join(STORE_ROOT, "square_products_latest.json");
  const overlayPath = path.join(STORE_ROOT, "storefront_overlay.json");
  const catalogText = normalizeJson(catalog);
  const overlayText = overlay == null ? null : normalizeJson(overlay);
  const stamp = fileStamp();
  fs.mkdirSync(STORE_ROOT, { recursive: true });
  fs.mkdirSync(BACKUP_ROOT, { recursive: true });

  const entries = [
    { target: catalogPath, text: catalogText },
    ...(overlayText == null ? [] : [{ target: overlayPath, text: overlayText }]),
  ].map((entry) => ({
    ...entry,
    temp: path.join(STORE_ROOT, `.${path.basename(entry.target)}.${process.pid}.${Date.now()}.tmp`),
    backup: fs.existsSync(entry.target)
      ? path.join(BACKUP_ROOT, `${stamp}-${path.basename(entry.target)}`)
      : null,
  }));

  const replaced = [];
  try {
    for (const entry of entries) {
      fs.writeFileSync(entry.temp, entry.text, { encoding: "utf8", mode: 0o640 });
      JSON.parse(fs.readFileSync(entry.temp, "utf8"));
      if (entry.backup) fs.copyFileSync(entry.target, entry.backup);
    }
    for (const entry of entries) {
      fs.renameSync(entry.temp, entry.target);
      replaced.push(entry);
    }
    pruneBackups();
  } catch (error) {
    for (const entry of replaced.reverse()) {
      if (entry.backup && fs.existsSync(entry.backup)) fs.copyFileSync(entry.backup, entry.target);
    }
    for (const entry of entries) {
      if (fs.existsSync(entry.temp)) fs.unlinkSync(entry.temp);
    }
    throw error;
  }

  return {
    releaseId: `catalog-${stamp}`,
    catalogSha256: sha256(catalogText),
    overlaySha256: overlayText == null ? null : sha256(overlayText),
    overlayWritten: overlayText != null,
  };
}

function listImageFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isFile() && /\.(png|jpe?g|webp|gif|svg)$/i.test(name)) files.push(name);
  }
  return files.sort();
}

function listAllImageFiles() {
  const seen = new Set();
  const files = [];
  for (const dir of IMAGE_DIRS.length ? IMAGE_DIRS : [path.join(STORE_ROOT, "img")]) {
    for (const name of listImageFiles(dir)) {
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      files.push(name);
    }
  }
  return files.sort();
}

function resolveStoreProductFile(urlPath) {
  let rel = String(urlPath || "").split("?")[0];
  try {
    rel = decodeURIComponent(rel);
  } catch {
    return null;
  }
  const match = rel.match(/^(?:\/img)?\/store\/products\/([a-z0-9][a-z0-9_-]*)\/([^/]+)$/i);
  if (!match) return null;
  const productId = match[1];
  const fileName = match[2];
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.(?:webp|png|jpe?g|gif|svg|json)$/i.test(fileName)) return null;
  const root = path.resolve(STORE_ROOT, "products");
  const full = path.resolve(root, productId, fileName);
  if (full !== root && !full.startsWith(`${root}${path.sep}`)) return null;
  return full;
}

function resolveImagePath(fileName) {
  const gallery = resolveStoreProductFile(
    String(fileName || "").startsWith("/") ? fileName : `/img/${fileName}`,
  );
  if (gallery && fs.existsSync(gallery) && fs.statSync(gallery).isFile()) return gallery;
  const base = path.basename(String(fileName || "").replace(/^\.?\/*(?:img\/|image\/|images\/)?/i, ""));
  if (!base || base.includes("..")) return null;
  for (const dir of IMAGE_DIRS.length ? IMAGE_DIRS : [path.join(STORE_ROOT, "img")]) {
    const full = path.join(dir, base);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) return full;
  }
  return null;
}

async function storeApiFetch(apiPath, opts = {}) {
  const headers = { accept: "application/json", ...(opts.headers || {}) };
  if (CATALOG_API_TOKEN) headers["X-Ops-Token"] = CATALOG_API_TOKEN;
  const upstream = await fetch(`${STORE_API_URL}${apiPath}`, { ...opts, headers });
  const data = await upstream.json().catch(() => ({}));
  return { upstream, data };
}

function handleHealth(req, res) {
  const deploymentEnabled = storeWritable() && (!REQUIRE_CATALOG_API_SYNC || Boolean(CATALOG_API_TOKEN));
  sendJson(req, res, 200, {
    ok: true,
    service: "av-catalog-console",
    storeWritable: storeWritable(),
    deploymentEnabled,
    authentication: "basic",
    catalogPublishConfigured: Boolean(CATALOG_API_TOKEN),
    catalogPublishRequired: REQUIRE_CATALOG_API_SYNC,
    lastDeploy,
    lastCatalogSync,
  });
}

function handleStoreImages(req, res) {
  sendJson(req, res, 200, { ok: true, files: listAllImageFiles(), writeRoot: IMG_WRITE_ROOT });
}

function handlePullProductImagesStatus(req, res) {
  const env = providerEnv();
  sendJson(req, res, 200, {
    ok: true,
    writeRoot: IMG_WRITE_ROOT,
    storeWritable: storeWritable(),
    providers: {
      squareConfigured: Boolean(env.squareToken),
      printfulConfigured: Boolean(env.printfulToken),
      providerEnvFile: env.filePath,
    },
  });
}

async function handlePullProductImages(req, res) {
  if (!storeWritable()) {
    return sendJson(req, res, 503, {
      ok: false,
      error: "The store catalog volume is read-only; cannot write images.",
    });
  }
  try {
    const body = JSON.parse((await readBody(req)) || "{}");
    const items = Array.isArray(body.items)
      ? body.items
      : Array.isArray(body.products)
        ? body.products
        : body.item
          ? [body.item]
          : [];
    const report = await pullProductImages({
      imgRoot: IMG_WRITE_ROOT,
      items,
      onlyMissing: body.onlyMissing !== false && body.mode !== "all" && body.mode !== "force",
      overwrite: Boolean(body.overwrite) || body.mode === "force",
      allowPrintful: body.allowPrintful !== false,
    });
    sendJson(req, res, report.ok || report.counts ? 200 : 400, report);
  } catch (error) {
    const status = Number(error.statusCode || 500);
    sendJson(req, res, status >= 400 && status < 600 ? status : 500, {
      ok: false,
      error: status >= 500 ? "Image pull failed." : error.message,
    });
  }
}

async function handleCatalogLive(req, res) {
  try {
    const { upstream, data } = await storeApiFetch("/api/catalog/live");
    if (upstream.ok) {
      lastCatalogSync = {
        at: new Date().toISOString(),
        source: data.source || "catalog-api",
        productCount: Array.isArray(data.products) ? data.products.length : null,
      };
    }
    sendJson(req, res, upstream.ok ? 200 : upstream.status, data);
  } catch {
    sendJson(req, res, 502, { ok: false, error: "Catalog service is unavailable." });
  }
}

async function handleCatalogMeta(req, res) {
  try {
    const { upstream, data } = await storeApiFetch("/api/catalog/meta");
    sendJson(req, res, upstream.ok ? 200 : upstream.status, data);
  } catch {
    sendJson(req, res, 502, { ok: false, error: "Catalog metadata service is unavailable." });
  }
}

function sendImageFile(req, res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) return sendText(req, res, 404, "Image not found");
    const type = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".json": "application/json; charset=utf-8",
    }[path.extname(filePath).toLowerCase()];
    res.writeHead(200, {
      ...securityHeaders(req),
      "cache-control": "private, max-age=3600",
      "content-type": type || "application/octet-stream",
    });
    if (req.method === "HEAD") return res.end();
    res.end(data);
  });
}

function serveProductImage(req, res) {
  const urlPath = (req.url || "").split("?")[0];
  let fileName;
  try {
    fileName = decodeURIComponent(urlPath.replace(/^\/img\//, ""));
  } catch {
    return sendText(req, res, 400, "Invalid image path");
  }
  const filePath = resolveImagePath(fileName);
  if (!filePath) return sendText(req, res, 404, "Image not found");
  return sendImageFile(req, res, filePath);
}

function handleStoreCatalogMeta(req, res) {
  const catalogPath = path.join(STORE_ROOT, "square_products_latest.json");
  const overlayPath = path.join(STORE_ROOT, "storefront_overlay.json");
  const catalogStat = fs.existsSync(catalogPath) ? fs.statSync(catalogPath) : null;
  const overlayStat = fs.existsSync(overlayPath) ? fs.statSync(overlayPath) : null;
  const catalog = readJsonFile(catalogPath);
  sendJson(req, res, 200, {
    ok: true,
    catalog: catalogStat
      ? { mtime: catalogStat.mtime.toISOString(), size: catalogStat.size, productCount: productCount(catalog) }
      : null,
    overlay: overlayStat ? { mtime: overlayStat.mtime.toISOString(), size: overlayStat.size } : null,
    lastCatalogSync,
  });
}

function handleBridgeManifest(req, res) {
  const candidates = [
    path.join(PUBLIC_ROOT, "build-source-manifest.json"),
    path.join(ROOT, "build-source-manifest.json"),
  ];
  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    const stat = fs.statSync(filePath);
    return sendJson(req, res, 200, {
      ok: true,
      mtime: stat.mtime.toISOString(),
      manifest: readJsonFile(filePath),
    });
  }
  sendJson(req, res, 404, { ok: false, error: "Build source manifest is unavailable." });
}

async function handleProxyBootstrap(req, res) {
  try {
    const upstream = await fetch(API_BOOTSTRAP, { headers: { accept: "application/json" } });
    const data = await upstream.json().catch(() => ({}));
    sendJson(req, res, upstream.ok ? 200 : upstream.status, { ok: upstream.ok, bootstrap: data });
  } catch {
    sendJson(req, res, 502, { ok: false, error: "Store bootstrap service is unavailable." });
  }
}

async function handleDeploy(req, res) {
  if (REQUIRE_CATALOG_API_SYNC && !CATALOG_API_TOKEN) {
    return sendJson(req, res, 503, {
      ok: false,
      error: "Catalog publishing is temporarily disabled until a scoped backend credential is configured.",
    });
  }
  if (!storeWritable()) {
    return sendJson(req, res, 503, { ok: false, error: "The store catalog volume is read-only." });
  }
  try {
    const body = JSON.parse((await readBody(req)) || "{}");
    if (body.catalog == null) {
      return sendJson(req, res, 400, { ok: false, error: "Missing catalog in request body." });
    }
    const count = validateCatalog(body.catalog);
    const release = deployFiles(body.catalog, body.overlay);
    lastDeploy = { at: new Date().toISOString(), productCount: count, ...release };

    let catalogSync = { configured: Boolean(CATALOG_API_TOKEN), attempted: false };
    if (CATALOG_API_TOKEN) {
      try {
        const imageManifest = {};
        for (const name of listAllImageFiles()) imageManifest[name.toLowerCase()] = { name };
        const { upstream, data } = await storeApiFetch("/api/catalog/publish", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            catalog: body.catalog,
            overlay: body.overlay ?? undefined,
            imageManifest,
            source: "console:deploy",
          }),
        });
        catalogSync = {
          configured: true,
          attempted: true,
          ok: upstream.ok,
          status: upstream.status,
          productCount: data.productCount ?? count,
          syncedAt: data.syncedAt || null,
        };
        if (upstream.ok) {
          lastCatalogSync = {
            at: new Date().toISOString(),
            source: data.source || "console:deploy",
            productCount: catalogSync.productCount,
          };
        }
      } catch {
        catalogSync = { configured: true, attempted: true, ok: false, error: "Catalog sync failed." };
      }
    }

    sendJson(req, res, 200, {
      ok: true,
      productCount: count,
      release,
      catalogSync,
      note: "Catalog files were validated, backed up, and atomically replaced.",
    });
  } catch (error) {
    const status = Number(error.statusCode || 500);
    sendJson(req, res, status, {
      ok: false,
      error: status >= 500 ? "Catalog deployment failed without replacing the previous catalog." : error.message,
    });
  }
}

function runBulkRemoveBg(req, res) {
  if (running) {
    return sendJson(req, res, 409, { ok: false, error: "Background removal is already running.", ...running });
  }
  if (!fs.existsSync(SCRIPT_PATH)) {
    return sendJson(req, res, 503, { ok: false, error: "Background removal is not configured." });
  }
  fs.mkdirSync(DEFAULT_IN, { recursive: true });
  fs.mkdirSync(DEFAULT_OUT, { recursive: true });
  const args = [
    SCRIPT_PATH,
    "--in",
    DEFAULT_IN,
    "--out",
    DEFAULT_OUT,
    "--square",
    "--size",
    "1024",
    "--trim",
    "--matte",
    "2",
  ];
  const startedAt = new Date().toISOString();
  running = { startedAt };
  const child = spawn(process.env.PYTHON || "python3", args, { cwd: SCRIPT_DIR, env: process.env });
  let stdout = "";
  let stderr = "";
  let responded = false;
  child.stdout.on("data", (chunk) => {
    stdout = `${stdout}${chunk}`.slice(-20_000);
  });
  child.stderr.on("data", (chunk) => {
    stderr = `${stderr}${chunk}`.slice(-20_000);
  });
  child.on("error", () => {
    responded = true;
    running = null;
    sendJson(req, res, 500, { ok: false, error: "Background removal could not start." });
  });
  child.on("close", (code) => {
    if (responded) return;
    responded = true;
    const finishedAt = new Date().toISOString();
    running = null;
    let report = null;
    const reportPath = path.join(DEFAULT_OUT, "report.json");
    if (fs.existsSync(reportPath)) {
      try {
        report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
      } catch {}
    }
    if (code !== 0) console.error("bulk_remove_bg failed", { code, stdout, stderr });
    sendJson(req, res, code === 0 ? 200 : 500, {
      ok: code === 0,
      code,
      startedAt,
      finishedAt,
      report,
      ...(code === 0 ? {} : { error: "Background removal failed; inspect container logs." }),
    });
  });
}

function handleOptions(req, res) {
  const origin = String(req.headers.origin || "").replace(/\/+$/, "");
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return sendJson(req, res, 403, { ok: false, error: "Origin is not allowed." });
  }
  res.writeHead(204, {
    ...securityHeaders(req),
    "access-control-allow-headers": "Authorization, Content-Type",
    "access-control-allow-methods": "GET, HEAD, POST, OPTIONS",
    "access-control-max-age": "600",
  });
  res.end();
}

const server = http.createServer(async (req, res) => {
  const url = (req.url || "/").split("?")[0];
  if (req.method === "OPTIONS") return handleOptions(req, res);
  if (req.method === "GET" && url === "/healthz") {
    return sendJson(req, res, 200, { ok: true, service: "av-catalog-console" });
  }
  if (!requireAuth(req, res)) return;

  if (req.method === "GET" && (url === "/api/health" || url === "/health")) return handleHealth(req, res);
  if (req.method === "GET" && url === "/api/store/images") return handleStoreImages(req, res);
  if (req.method === "GET" && url === "/api/catalog/live") return handleCatalogLive(req, res);
  if (req.method === "GET" && url === "/api/catalog/meta") return handleCatalogMeta(req, res);
  if (req.method === "GET" && url === "/api/store/catalog-meta") return handleStoreCatalogMeta(req, res);
  if (req.method === "GET" && (url === "/api/bridge/manifest" || url === "/api/avcc/manifest")) {
    return handleBridgeManifest(req, res);
  }
  if (req.method === "GET" && url === "/api/proxy/bootstrap") return handleProxyBootstrap(req, res);
  if (req.method === "POST" && url === "/api/deploy") return handleDeploy(req, res);
  if (req.method === "POST" && url === "/api/pull-product-images") {
    return handlePullProductImages(req, res);
  }
  if (req.method === "GET" && url === "/api/pull-product-images/status") {
    return handlePullProductImagesStatus(req, res);
  }
  if (req.method === "POST" && url === "/api/run-bulk-remove-bg") return runBulkRemoveBg(req, res);
  if (req.method === "GET" && url === "/api/run-bulk-remove-bg/status") {
    return sendJson(req, res, 200, { running: Boolean(running), ...(running || {}) });
  }
  if ((req.method === "GET" || req.method === "HEAD") && url.startsWith("/store/products/")) {
    const galleryPath = resolveStoreProductFile(url);
    if (!galleryPath) return sendText(req, res, 404, "Image not found");
    return sendImageFile(req, res, galleryPath);
  }
  if ((req.method === "GET" || req.method === "HEAD") && url.startsWith("/img/")) {
    return serveProductImage(req, res);
  }
  if (req.method === "GET" || req.method === "HEAD") return serveStatic(req, res);
  sendText(req, res, 405, "Method not allowed");
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`AeroVista Catalog Console listening on ${HOST}:${PORT}`);
    console.log(`authentication: ${AUTH_USER && AUTH_PASSWORD ? "configured" : "MISSING (fail-closed)"}`);
    console.log(`store writable: ${storeWritable()}`);
    console.log(`catalog publish credential: ${CATALOG_API_TOKEN ? "configured" : "not configured"}`);
  });
}

module.exports = { server };
