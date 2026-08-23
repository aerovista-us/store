import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const horizonRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(horizonRoot, "catalog.json");
const statesPath = path.join(
  horizonRoot,
  "migrations",
  "curated-2026-07-27",
  "visibility-states.json",
);
const profileArgument = process.argv.find((argument) => argument.startsWith("--profile="));
const profileName = profileArgument?.split("=")[1] || "gallery-balanced";
const apply = process.argv.includes("--apply");

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const states = JSON.parse(fs.readFileSync(statesPath, "utf8"));
const profile = states.profiles?.[profileName];

if (!profile) {
  throw new Error(`Unknown visibility profile: ${profileName}`);
}

const productsById = new Map((catalog.products || []).map((product) => [product.id, product]));
const missing = Object.keys(profile).filter((id) => !productsById.has(id));
const unprofiled = [...productsById.keys()].filter((id) => !profile[id]);
if (missing.length || unprofiled.length) {
  throw new Error(
    `Visibility profile mismatch. Missing catalog IDs: ${missing.join(", ") || "none"}; ` +
    `unprofiled catalog IDs: ${unprofiled.join(", ") || "none"}`,
  );
}

const changes = [];
for (const [id, target] of Object.entries(profile)) {
  const product = productsById.get(id);
  const next = { ...target, published: target.publicVisible, preserveRecord: true };
  const changedFields = {};
  for (const [field, value] of Object.entries(next)) {
    if (product[field] !== value) {
      changedFields[field] = { from: product[field] ?? null, to: value };
      if (apply) product[field] = value;
    }
  }
  if (Object.keys(changedFields).length) changes.push({ id, changedFields });
}

console.log(JSON.stringify({ profile: profileName, apply, changes }, null, 2));
if (apply) {
  catalog.updated = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
}
