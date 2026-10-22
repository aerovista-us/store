#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { routeMasterCatalog } = require("./catalog-router");
const { suggestProductRoutes } = require("./catalog-routing-suggestions");
const { reviewCatalogImport } = require("./catalog-import-review");

function usage() {
  return [
    "Usage:",
    "  node route-catalog.js --catalog <master.json> --assignments <routing.json> --out <directory> [--previous <prior-master.json>] [--stores gear,horizon,northline]",
    "",
    "Writes only beneath the explicit --out directory:",
    "  <out>/<store>/storefront.json",
    "  <out>/<store>/provider-map.json",
    "  <out>/routing-summary.json",
  ].join("\n");
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for --${key}`);
    args[key] = value;
    i += 1;
  }
  return args;
}

function readJson(filePath, label) {
  const resolved = path.resolve(filePath);
  let text;
  try {
    text = fs.readFileSync(resolved, "utf8");
  } catch (error) {
    throw new Error(`Unable to read ${label}: ${resolved} (${error.message})`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${resolved} (${error.message})`);
  }
}

function atomicJson(target, data) {
  const directory = path.dirname(target);
  fs.mkdirSync(directory, { recursive: true });
  const temporary = path.join(
    directory,
    `.${path.basename(target)}.${process.pid}.${Date.now()}.tmp`,
  );
  const text = `${JSON.stringify(data, null, 2)}\n`;
  try {
    fs.writeFileSync(temporary, text, { encoding: "utf8", mode: 0o640, flag: "wx" });
    JSON.parse(fs.readFileSync(temporary, "utf8"));
    fs.renameSync(temporary, target);
  } catch (error) {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    throw error;
  }
}

function ensureExplicitOutputDirectory(value) {
  if (!value) throw new Error("--out is required; the router never chooses a production output path implicitly.");
  const resolved = path.resolve(value);
  const root = path.parse(resolved).root;
  if (resolved === root) throw new Error("Refusing to use a filesystem root as --out.");
  return resolved;
}

function generateArtifacts({ catalogPath, assignmentsPath, outDir, stores, previousPath = null }) {
  const catalog = readJson(catalogPath, "master catalog");
  const assignments = readJson(assignmentsPath, "routing assignments");
  const storeIds = String(stores || "gear,horizon,northline")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const outputRoot = ensureExplicitOutputDirectory(outDir);
  const result = routeMasterCatalog({ catalog, assignments, storeIds });
  const suggestions = suggestProductRoutes({ catalog, assignments })
    .filter((suggestion) => storeIds.includes(suggestion.suggestedStores[0]));
  const importReview = previousPath
    ? reviewCatalogImport({ previous: readJson(previousPath, "previous master catalog"), next: catalog })
    : null;

  for (const storeId of storeIds) {
    const store = result.stores[storeId];
    atomicJson(path.join(outputRoot, storeId, "storefront.json"), store.catalog);
    atomicJson(path.join(outputRoot, storeId, "provider-map.json"), store.providerMap);
  }
  atomicJson(path.join(outputRoot, "routing-summary.json"), {
    schemaVersion: result.schemaVersion,
    generatedAt: new Date().toISOString(),
    source: catalog.generated_from || path.basename(catalogPath),
    summary: result.summary,
    unassigned: result.unassigned,
    suggestions,
    importReview,
  });

  return { ...result, suggestions, importReview };
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.catalog || !args.assignments || !args.out) {
      throw new Error(usage());
    }
    const result = generateArtifacts({
      catalogPath: args.catalog,
      assignmentsPath: args.assignments,
      outDir: args.out,
      stores: args.stores,
      previousPath: args.previous || null,
    });
    process.stdout.write(`${JSON.stringify({
      ok: true,
      summary: result.summary,
      unassigned: result.unassigned,
      suggestions: result.suggestions,
      importReview: result.importReview,
    }, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = { generateArtifacts, atomicJson, ensureExplicitOutputDirectory, parseArgs };
