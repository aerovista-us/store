/** Quick check that gear.aerovista.us serves the variationId checkout fix. */
const url = process.argv[2] || "https://gear.aerovista.us/index.html";
const res = await fetch(url, { cache: "no-store" });
const html = await res.text();
const checks = [
  ["variationIdForCartLine", /function variationIdForCartLine/],
  ["cart stores variationId", /existing\.variationId = variationId/],
  ["resolveProduct by id only", /function resolveProduct\(id\)[\s\S]*?return null;\s*\}/],
  ["no name fallback in resolveProduct", /x\.name\.toLowerCase\(\)/],
];
console.log("URL:", url, res.status);
for (const [label, re] of checks) {
  const ok = re.test(html);
  console.log(ok ? "OK" : "MISSING", label);
}
if (/x\.name\.toLowerCase\(\)/.test(html)) {
  console.warn("WARN: resolveProduct may still match by display name");
}
