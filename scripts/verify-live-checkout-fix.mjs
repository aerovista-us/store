/** Quick check that gear.aerovista.us serves the variationId checkout fix. */
const url = process.argv[2] || "https://gear.aerovista.us/index.html";
const res = await fetch(url, { cache: "no-store" });
const html = await res.text();
const checks = [
  ["variationIdForCartLine", /function variationIdForCartLine/],
  ["cart stores variationId", /existing\.variationId = variationId/],
  ["checkout prefers stored variationId", /const variation_id = storedVid \|\| mappedVid/],
  ["resolveProduct by id only", /function resolveProduct\(id\)[\s\S]*?return null;\s*\}/],
  ["no name fallback in resolveProduct", (source) => !/x\.name\.toLowerCase\(\)/.test(source)],
];
console.log("URL:", url, res.status);
let failed = res.ok ? 0 : 1;
for (const [label, check] of checks) {
  const ok = typeof check === "function" ? check(html) : check.test(html);
  if (!ok) failed++;
  console.log(ok ? "OK" : "MISSING", label);
}
if (/const variation_id = mappedVid \|\| storedVid/.test(html)) {
  failed++;
  console.log("FAIL", "checkout still uses mappedVid || storedVid (collision risk)");
}
if (/x\.name\.toLowerCase\(\)/.test(html)) {
  console.warn("WARN: resolveProduct may still match by display name");
}
process.exitCode = failed ? 1 : 0;
