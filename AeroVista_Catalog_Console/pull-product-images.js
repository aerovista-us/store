/**
 * Download product images from Square (preferred) or Printful (fallback)
 * into store/img/. Used by Catalog Console Bulk Cleanup + item editor.
 *
 * Credentials are read from process.env or an optional provider env file
 * (default: ../store/backend/.env). Do not put payment/fulfillment secrets
 * in console/.env.console.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const REPO_STORE_BACKEND_ENV = path.resolve(__dirname, "../store/backend/.env");

function loadDotEnv(filePath) {
  const out = {};
  if (!filePath || !fs.existsSync(filePath)) return out;
  for (const raw of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function providerEnv() {
  const filePath = process.env.AV_PROVIDER_ENV_FILE || REPO_STORE_BACKEND_ENV;
  const fileEnv = loadDotEnv(filePath);
  const get = (...keys) => {
    for (const key of keys) {
      const fromProc = (process.env[key] || "").trim();
      if (fromProc) return fromProc;
      const fromFile = (fileEnv[key] || "").trim();
      if (fromFile) return fromFile;
    }
    return "";
  };
  return {
    filePath: fs.existsSync(filePath) ? filePath : null,
    squareToken: get("SQUARE_ACCESS_TOKEN"),
    squareEnv: (get("SQUARE_ENV") || "production").toLowerCase(),
    squareVersion: get("SQUARE_VERSION") || "2024-01-18",
    printfulToken: get("PRINTFUL_API_TOKEN", "PRINTFUL_TOKEN"),
    printfulStoreId: get("PRINTFUL_STORE_ID") || "17064001",
  };
}

function squareBase(squareEnv) {
  return squareEnv === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
}

async function squareJson(env, apiPath, body) {
  const res = await fetch(`${squareBase(env.squareEnv)}${apiPath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.squareToken}`,
      "Square-Version": env.squareVersion,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "AeroVista-Catalog-Console-ImagePull/1.0",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      data?.errors?.[0]?.detail || data?.message || res.statusText || "Square request failed";
    const err = new Error(detail);
    err.statusCode = res.status;
    throw err;
  }
  return data;
}

async function squareBatchRetrieve(env, objectIds) {
  const ids = [...new Set(objectIds.map((id) => String(id || "").trim()).filter(Boolean))];
  const objects = [];
  const related = [];
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const data = await squareJson(env, "/v2/catalog/batch-retrieve", {
      object_ids: chunk,
      include_related_objects: true,
    });
    objects.push(...(data.objects || []));
    related.push(...(data.related_objects || []));
  }
  return { objects, related };
}

function extFromUrlOrType(url, contentType) {
  const fromType = String(contentType || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (fromType === "image/png") return ".png";
  if (fromType === "image/webp") return ".webp";
  if (fromType === "image/gif") return ".gif";
  if (fromType === "image/jpeg" || fromType === "image/jpg") return ".jpg";
  try {
    const pathname = new URL(url).pathname;
    const m = pathname.match(/\.(png|jpe?g|webp|gif)$/i);
    if (m) return `.${m[1].toLowerCase().replace("jpeg", "jpg")}`;
  } catch {
    /* ignore */
  }
  return ".png";
}

function safeFileBase(name, fallback) {
  const raw = String(name || "")
    .trim()
    .replace(/^\.?\/*(?:img\/|image\/|images\/)?/i, "");
  const bare = path.basename(raw).replace(/[<>:"|?*\u0000-\u001f]/g, "").trim();
  if (bare && /\.(png|jpe?g|webp|gif)$/i.test(bare)) return bare;
  const stem = (bare || fallback || "product")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-zA-Z0-9._ -]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
  return stem || "product";
}

function imageFileExists(imgRoot, fileName) {
  if (!fileName) return false;
  const base = path.basename(String(fileName).replace(/^\.?\/*(?:img\/|image\/|images\/)?/i, ""));
  if (!base) return false;
  try {
    return fs.existsSync(path.join(imgRoot, base)) && fs.statSync(path.join(imgRoot, base)).isFile();
  } catch {
    return false;
  }
}

async function downloadToFile(url, destPath) {
  const res = await fetch(url, {
    headers: { Accept: "image/*,*/*", "User-Agent": "AeroVista-Catalog-Console-ImagePull/1.0" },
    redirect: "follow",
  });
  if (!res.ok) {
    const err = new Error(`Image download failed (${res.status})`);
    err.statusCode = res.status;
    throw err;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) throw new Error("Image download returned an empty body.");
  const tmp = `${destPath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, buf, { mode: 0o640 });
  fs.renameSync(tmp, destPath);
  return {
    bytes: buf.length,
    contentType: res.headers.get("content-type") || "",
    sha256: crypto.createHash("sha256").update(buf).digest("hex"),
  };
}

function pickSquareImage(itemObj, imageById) {
  const data = itemObj?.item_data || {};
  const ids = [...(data.image_ids || [])];
  if (data.image_id) ids.unshift(data.image_id);
  for (const id of ids) {
    const img = imageById.get(String(id));
    const idata = img?.image_data || {};
    if (idata.url) {
      return {
        imageId: String(id),
        url: idata.url,
        name: idata.name || "",
        caption: idata.caption || "",
      };
    }
  }
  return null;
}

async function resolveSquareSources(env, items) {
  if (!env.squareToken) return { byProductId: new Map(), error: "SQUARE_ACCESS_TOKEN not configured." };

  const itemIds = [];
  const variationIds = [];
  for (const item of items) {
    if (item.square_item_id) itemIds.push(item.square_item_id);
    for (const v of item.variants || []) {
      if (v.variation_id) variationIds.push(v.variation_id);
    }
  }

  const first = await squareBatchRetrieve(env, [...itemIds, ...variationIds]);
  const catalog = new Map();
  for (const obj of [...first.objects, ...first.related]) {
    if (obj?.id) catalog.set(String(obj.id), obj);
  }

  const parentItemIds = [];
  for (const item of items) {
    if (item.square_item_id && catalog.has(String(item.square_item_id))) continue;
    for (const v of item.variants || []) {
      const vid = String(v.variation_id || "");
      const vobj = catalog.get(vid);
      const parent = vobj?.item_variation_data?.item_id;
      if (parent) parentItemIds.push(String(parent));
    }
  }

  if (parentItemIds.length) {
    const second = await squareBatchRetrieve(env, parentItemIds);
    for (const obj of [...second.objects, ...second.related]) {
      if (obj?.id) catalog.set(String(obj.id), obj);
    }
  }

  const imageById = new Map();
  for (const obj of catalog.values()) {
    if (obj.type === "IMAGE") imageById.set(String(obj.id), obj);
  }

  const byProductId = new Map();
  for (const item of items) {
    let itemObj = item.square_item_id ? catalog.get(String(item.square_item_id)) : null;
    if (!itemObj || itemObj.type !== "ITEM") {
      for (const v of item.variants || []) {
        const vobj = catalog.get(String(v.variation_id || ""));
        const parentId = vobj?.item_variation_data?.item_id;
        if (parentId) {
          itemObj = catalog.get(String(parentId));
          if (itemObj?.type === "ITEM") break;
        }
      }
    }
    if (!itemObj || itemObj.type !== "ITEM") continue;
    const picked = pickSquareImage(itemObj, imageById);
    if (picked) byProductId.set(item.id, { ...picked, squareItemId: itemObj.id });
  }
  return { byProductId, error: null };
}

async function printfulJson(token, storeId, apiPath) {
  const res = await fetch(`https://api.printful.com${apiPath}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-PF-Store-Id": String(storeId),
      Accept: "application/json",
      "User-Agent": "AeroVista-Catalog-Console-ImagePull/1.0",
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data?.error?.message || data?.result || res.statusText || "Printful request failed";
    const err = new Error(String(detail));
    err.statusCode = res.status;
    throw err;
  }
  return data;
}

async function resolvePrintfulSources(env, items) {
  const byProductId = new Map();
  const wantSkus = new Set();
  for (const item of items) {
    for (const v of item.variants || []) {
      const sku = String(v.sku || "").trim();
      if (sku) wantSkus.add(sku);
    }
  }
  if (!wantSkus.size) return { byProductId, error: null };

  // Fast path: local Printful snapshots (no live API).
  const snapshotRoots = [
    path.resolve(__dirname, "../horizon/commerce"),
    path.resolve(__dirname, "../store/commerce"),
  ];
  for (const root of snapshotRoots) {
    if (!fs.existsSync(root)) continue;
    const files = fs
      .readdirSync(root)
      .filter((n) => /printful-product-snapshot.*\.json$/i.test(n))
      .sort()
      .reverse();
    for (const name of files.slice(0, 3)) {
      try {
        const snap = JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));
        const products = snap.products || snap.result || [];
        for (const row of products) {
          const syncProduct = row.sync_product || row;
          const thumb = syncProduct.thumbnail_url || row.thumbnailUrl || row.thumbnail_url;
          for (const variant of row.variants || row.sync_variants || []) {
            const sku = String(variant.sku || "").trim();
            if (!sku || !wantSkus.has(sku)) continue;
            const file =
              (variant.files || []).find((f) => f.preview_url || f.thumbnail_url || f.url) || null;
            const url =
              (file && (file.preview_url || file.thumbnail_url || file.url)) || thumb || null;
            // Snapshots may only flag urlPresent — skip if no real URL.
            if (url && /^https?:\/\//i.test(String(url))) {
              for (const item of items) {
                if (byProductId.has(item.id)) continue;
                if ((item.variants || []).some((v) => String(v.sku || "").trim() === sku)) {
                  byProductId.set(item.id, {
                    url: String(url),
                    name: file?.filename || `${item.id}-printful`,
                    syncProductId: String(syncProduct.id || row.id || ""),
                  });
                }
              }
            }
          }
        }
      } catch {
        /* ignore bad snapshot */
      }
    }
  }

  const still = items.filter((item) => !byProductId.has(item.id));
  if (!still.length) return { byProductId, error: null };

  if (!env.printfulToken) {
    return {
      byProductId,
      error: byProductId.size
        ? null
        : "PRINTFUL_API_TOKEN not configured (and no usable Printful snapshot URLs).",
    };
  }

  const listed = [];
  let offset = 0;
  for (;;) {
    const data = await printfulJson(
      env.printfulToken,
      env.printfulStoreId,
      `/sync/products?limit=100&offset=${offset}`,
    );
    const batch = data.result || [];
    listed.push(...batch);
    if (batch.length < 100) break;
    offset += 100;
    if (offset > 5000) break;
  }

  const skuToThumb = new Map();
  const detailCache = new Map();

  async function detail(syncId) {
    if (detailCache.has(syncId)) return detailCache.get(syncId);
    const data = await printfulJson(env.printfulToken, env.printfulStoreId, `/sync/products/${syncId}`);
    detailCache.set(syncId, data.result || {});
    return detailCache.get(syncId);
  }

  let detailFetches = 0;
  for (const row of listed) {
    if (detailFetches >= 40) break;
    const syncId = String(row.id || "");
    if (!syncId) continue;
    detailFetches += 1;
    let result;
    try {
      result = await detail(syncId);
    } catch {
      continue;
    }
    const syncProduct = result.sync_product || {};
    const thumb = syncProduct.thumbnail_url || row.thumbnail_url || null;
    for (const variant of result.sync_variants || []) {
      const sku = String(variant.sku || "").trim();
      if (!sku || !wantSkus.has(sku)) continue;
      const file =
        (variant.files || []).find((f) => f.type === "preview" && f.preview_url) ||
        (variant.files || []).find((f) => f.preview_url || f.thumbnail_url || f.url);
      const url =
        (file && (file.preview_url || file.thumbnail_url || file.url)) || thumb || null;
      if (url) skuToThumb.set(sku, { url, syncProductId: syncId, filename: file?.filename || "" });
    }
  }

  for (const item of still) {
    for (const v of item.variants || []) {
      const sku = String(v.sku || "").trim();
      const hit = sku ? skuToThumb.get(sku) : null;
      if (hit) {
        byProductId.set(item.id, {
          url: hit.url,
          name: hit.filename || `${item.id}-printful`,
          syncProductId: hit.syncProductId,
        });
        break;
      }
    }
  }
  return { byProductId, error: null };
}

/**
 * @param {object} opts
 * @param {string} opts.imgRoot absolute path to store/img
 * @param {Array<object>} opts.items product stubs from the console
 * @param {boolean} [opts.onlyMissing=true]
 * @param {boolean} [opts.overwrite=false]
 * @param {boolean} [opts.allowPrintful=true]
 */
async function pullProductImages(opts) {
  const imgRoot = opts.imgRoot;
  const items = Array.isArray(opts.items) ? opts.items : [];
  const onlyMissing = opts.onlyMissing !== false;
  const overwrite = Boolean(opts.overwrite);
  const allowPrintful = opts.allowPrintful !== false;

  if (!items.length) {
    return { ok: false, error: "No products provided.", results: [] };
  }
  if (items.length > 200) {
    return { ok: false, error: "Limit is 200 products per request.", results: [] };
  }

  fs.mkdirSync(imgRoot, { recursive: true });
  const env = providerEnv();

  const candidates = [];
  for (const raw of items) {
    const item = {
      id: String(raw.id || "").trim(),
      name: String(raw.name || "").trim(),
      image: String(raw.image || "").trim(),
      square_item_id: String(raw.square_item_id || raw.squareItemId || "").trim(),
      variants: Array.isArray(raw.variants) ? raw.variants : [],
    };
    if (!item.id) continue;
    const hasFile = imageFileExists(imgRoot, item.image);
    if (onlyMissing && item.image && hasFile) {
      candidates.push({ ...item, skip: true, skipReason: "image_present" });
    } else {
      candidates.push({ ...item, skip: false });
    }
  }

  const need = candidates.filter((c) => !c.skip);
  let squareMap = new Map();
  let printfulMap = new Map();
  let squareError = null;
  let printfulError = null;

  if (need.length) {
    try {
      const square = await resolveSquareSources(env, need);
      squareMap = square.byProductId;
      squareError = square.error;
    } catch (err) {
      squareError = err.message || "Square lookup failed.";
    }
  }

  const stillNeed = need.filter((c) => !squareMap.has(c.id));
  if (allowPrintful && stillNeed.length) {
    try {
      const printful = await resolvePrintfulSources(env, stillNeed);
      printfulMap = printful.byProductId;
      printfulError = printful.error;
    } catch (err) {
      printfulError = err.message || "Printful lookup failed.";
    }
  }

  const results = [];
  for (const item of candidates) {
    if (item.skip) {
      results.push({
        id: item.id,
        status: "skipped",
        reason: item.skipReason,
        image: item.image,
      });
      continue;
    }

    const square = squareMap.get(item.id);
    const printful = printfulMap.get(item.id);
    const source = square ? "square" : printful ? "printful" : null;
    const picked = square || printful;
    if (!picked?.url) {
      results.push({
        id: item.id,
        status: "missing",
        reason: "no_provider_image",
        squareItemId: item.square_item_id || null,
      });
      continue;
    }

    const preferredName = item.image || picked.name || item.id;
    let base = safeFileBase(preferredName, item.id);
    if (!/\.(png|jpe?g|webp|gif)$/i.test(base)) {
      base = `${base}${extFromUrlOrType(picked.url, "")}`;
    }
    const dest = path.join(imgRoot, base);
    if (fs.existsSync(dest) && !overwrite && item.image && path.basename(item.image) === base) {
      results.push({
        id: item.id,
        status: "applied",
        source,
        image: base,
        reason: "file_exists",
      });
      continue;
    }
    if (fs.existsSync(dest) && !overwrite) {
      // Keep existing bytes; still apply filename to the product.
      results.push({
        id: item.id,
        status: "applied",
        source,
        image: base,
        reason: "file_exists_reused",
      });
      continue;
    }

    try {
      const saved = await downloadToFile(picked.url, dest);
      results.push({
        id: item.id,
        status: "downloaded",
        source,
        image: base,
        bytes: saved.bytes,
        squareItemId: square?.squareItemId || item.square_item_id || null,
      });
    } catch (err) {
      results.push({
        id: item.id,
        status: "error",
        source,
        error: err.message || "Download failed.",
      });
    }
  }

  const downloaded = results.filter((r) => r.status === "downloaded").length;
  const applied = results.filter((r) => r.status === "applied" || r.status === "downloaded").length;
  const missing = results.filter((r) => r.status === "missing").length;
  const errors = results.filter((r) => r.status === "error").length;

  return {
    ok: errors === 0,
    imgRoot,
    providers: {
      squareConfigured: Boolean(env.squareToken),
      printfulConfigured: Boolean(env.printfulToken),
      squareError,
      printfulError,
      providerEnvFile: env.filePath,
    },
    counts: {
      requested: candidates.length,
      downloaded,
      applied,
      missing,
      errors,
      skipped: results.filter((r) => r.status === "skipped").length,
    },
    results,
  };
}

module.exports = {
  pullProductImages,
  providerEnv,
  imageFileExists,
};
