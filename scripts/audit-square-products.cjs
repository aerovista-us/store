const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const jsonPath = path.join(root, "store/square_products_latest.json");
const imgDir = path.join(root, "store/img");

const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const products = data.products || [];

const isVisible = (p) => String(p.visibility || "").toLowerCase() === "visible";
const visible = products.filter(isVisible);

console.log("=== 1. Total visible products ===");
console.log("count:", visible.length);

const missingVariation = [];
for (const p of visible) {
  for (const v of p.variants || []) {
    const vid = v.variation_id;
    if (vid == null || String(vid).trim() === "") {
      missingVariation.push({
        productId: p.id,
        productName: p.name,
        sku: v.sku,
        size: v.size,
        color: v.color,
      });
    }
  }
}
console.log("\n=== 2. Visible variants missing variation_id ===");
console.log("count:", missingVariation.length);
console.log("examples (up to 10):");
console.log(JSON.stringify(missingVariation.slice(0, 10), null, 2));

const imageIssues = [];
for (const p of visible) {
  const img = p.image;
  let reason = null;
  if (img == null || String(img).trim() === "") {
    reason = "missing image field";
  } else if (!fs.existsSync(path.join(imgDir, img))) {
    reason = "file not found in store/img/";
  }
  if (reason) {
    imageIssues.push({ id: p.id, name: p.name, image: img ?? "", reason });
  }
}
console.log("\n=== 3. Visible products with image issues ===");
console.log("count:", imageIssues.length);
console.log("examples (first 10):");
console.log(JSON.stringify(imageIssues.slice(0, 10), null, 2));

const emptyCollection = visible.filter(
  (p) => p.collection == null || String(p.collection).trim() === ""
);
console.log("\n=== 4. Visible products with empty collection ===");
console.log("count:", emptyCollection.length);
console.log(
  "examples (up to 10):",
  JSON.stringify(
    emptyCollection.slice(0, 10).map((p) => ({ id: p.id, name: p.name })),
    null,
    2
  )
);

const skuMap = new Map();
for (const p of products) {
  for (const v of p.variants || []) {
    const sku = v.sku;
    if (sku == null || String(sku).trim() === "") continue;
    if (!skuMap.has(sku)) skuMap.set(sku, []);
    skuMap.get(sku).push({
      productId: p.id,
      productName: p.name,
      visibility: p.visibility,
    });
  }
}
const dupSkus = [...skuMap.entries()]
  .filter(([, refs]) => refs.length > 1)
  .map(([sku, refs]) => ({ sku, count: refs.length, products: refs }));

console.log("\n=== 5. Duplicate merchant SKUs across products ===");
console.log("duplicate SKU count:", dupSkus.length);
console.log("examples (up to 10):");
console.log(JSON.stringify(dupSkus.slice(0, 10), null, 2));

console.log("\n--- meta ---");
console.log("total products in file:", products.length);
console.log("meta.count:", data.meta?.count);
