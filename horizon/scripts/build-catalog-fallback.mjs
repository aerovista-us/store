import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const horizonRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(horizonRoot, "catalog.json");
const outputPath = path.join(horizonRoot, "catalog.generated.js");
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const output = [
  "/* Generated from catalog.json. Do not edit directly. */",
  "window.HORIZON_CATALOG = " + JSON.stringify(catalog, null, 2) + ";",
  "",
].join("\n");

fs.writeFileSync(outputPath, output, "utf8");
console.log(`Wrote ${outputPath}`);
