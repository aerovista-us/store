import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const common = readJson("schemas/commerce-common.schema.json");
const schemaFiles = {
  quoteRequest: "schemas/cart-quote-request.schema.json",
  quoteResponse: "schemas/cart-quote-response.schema.json",
  checkoutRequest: "schemas/checkout-session-request.schema.json",
  checkoutResponse: "schemas/checkout-session-response.schema.json",
  checkoutStatus: "schemas/checkout-session-status.schema.json",
  error: "schemas/error-response.schema.json"
};

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
ajv.addSchema(common);
const validators = Object.fromEntries(
  Object.entries(schemaFiles).map(([name, schemaPath]) => [name, ajv.compile(readJson(schemaPath))])
);

let failures = 0;
function check(label, condition, detail = "") {
  if (condition) {
    console.log(`[ok] ${label}`);
    return;
  }
  failures += 1;
  console.error(`[error] ${label}${detail ? `: ${detail}` : ""}`);
}

function validate(label, validator, value) {
  const valid = validator(value);
  check(label, valid, valid ? "" : ajv.errorsText(validator.errors, { separator: "; " }));
}

console.log("=== Commerce API /v1 contract audit ===\n");

const decisions = readJson("contracts/commerce-api-v1-decisions.json");
const openapi = readJson("contracts/commerce-api-v1.openapi.json");
const quoteRequest = readJson("tests/fixtures/commerce/v1-quote-request.json");
const quoteResponse = readJson("tests/fixtures/commerce/v1-quote-response.json");
const checkoutRequest = readJson("tests/fixtures/commerce/v1-checkout-session-request.json");
const checkoutResponse = readJson("tests/fixtures/commerce/v1-checkout-session-response.json");
const checkoutStatus = readJson("tests/fixtures/commerce/v1-checkout-session-status.json");
const errorResponse = readJson("tests/fixtures/commerce/v1-error-response.json");
const idempotency = readJson("tests/fixtures/commerce/v1-idempotency-cases.json");

validate("quote request fixture validates", validators.quoteRequest, quoteRequest);
validate("quote response fixture validates", validators.quoteResponse, quoteResponse);
validate("checkout-session request fixture validates", validators.checkoutRequest, checkoutRequest);
validate("checkout-session response fixture validates", validators.checkoutResponse, checkoutResponse);
validate("checkout-session status fixture validates", validators.checkoutStatus, checkoutStatus);
validate("structured error fixture validates", validators.error, errorResponse);

const expectedPaths = [
  "/v1/storefront/{storeId}/catalog",
  "/v1/cart/quote",
  "/v1/checkout/session",
  "/v1/checkout/{sessionId}"
];
check("OpenAPI version is 3.1", openapi.openapi === "3.1.0");
check("OpenAPI contract version matches decisions", openapi.info.version === decisions.contractVersion);
check("all required /v1 paths are present", expectedPaths.every((routePath) => Object.hasOwn(openapi.paths, routePath)));
check("OpenAPI contract contains no legacy /api route", Object.keys(openapi.paths).every((routePath) => !routePath.startsWith("/api/")));

const checkoutOperation = openapi.paths["/v1/checkout/session"].post;
const idempotencyParameter = checkoutOperation.parameters
  .map((entry) => entry.$ref)
  .find((ref) => ref === "#/components/parameters/IdempotencyKey");
const idempotencySchema = openapi.components.parameters.IdempotencyKey.schema;
check("checkout requires the Idempotency-Key header", Boolean(idempotencyParameter) && openapi.components.parameters.IdempotencyKey.required === true);
check("idempotency key bounds match the decision record", idempotencySchema.minLength === decisions.checkout.idempotencyKeyMinimumLength && idempotencySchema.maxLength === decisions.checkout.idempotencyKeyMaximumLength);
check("checkout documents replay and conflict responses", Object.hasOwn(checkoutOperation.responses, "200") && Object.hasOwn(checkoutOperation.responses, "201") && Object.hasOwn(checkoutOperation.responses, "409"));
check("checkout retention matches the decision record", checkoutOperation["x-aerovista-idempotency-retention-seconds"] === decisions.checkout.idempotencyRetentionSeconds);
check("redirect targets are explicitly store-allowlisted", checkoutOperation["x-aerovista-redirect-policy"].includes("selected store"));
check("idempotency scope includes the store", decisions.checkout.idempotencyScope.includes("storeId"));
check("canonical checkout fields are pinned", decisions.checkout.canonicalRequestFields.join(",") === "storeId,quoteId,successUrl,cancelUrl");
check("canonical requests use a deterministic digest", decisions.checkout.canonicalization.includes("SHA-256") && decisions.checkout.providerIdempotencyKey.includes("deterministic"));
check("crash-safe provider retry sequence is pinned", decisions.checkout.persistenceSequence.some((step) => step.includes("uniqueness constraint")) && decisions.checkout.persistenceSequence.some((step) => step.includes("same provider key")));
check("public session IDs require at least 128 bits of entropy", decisions.checkout.sessionIdMinimumEntropyBits >= 128);
check("checkout status is explicitly PII-free", decisions.checkout.statusResponseContainsPii === false);

const requestText = JSON.stringify(quoteRequest);
check("quote request sends no client price", !requestText.includes("price") && !requestText.includes("amount"));
check("quote request sends no provider or legacy cart identity", !/provider|square|variationId|variation_id|cartKey|sku/i.test(requestText));
check("collision fixture uses distinct public variants", new Set(quoteRequest.items.map((item) => item.variantId)).size === quoteRequest.items.length);
check("quote line IDs are unique", new Set(quoteRequest.items.map((item) => item.lineId)).size === quoteRequest.items.length);

const subtotal = quoteResponse.items.reduce((sum, item) => sum + item.lineSubtotal.amount, 0);
const discount = quoteResponse.totals.discount.amount;
const expectedTotal = subtotal - discount + quoteResponse.totals.shipping.amount + quoteResponse.totals.tax.amount;
const currencies = [
  ...quoteResponse.items.flatMap((item) => [item.unitPrice.currency, item.lineSubtotal.currency]),
  ...Object.values(quoteResponse.totals).map((money) => money.currency)
];
check("quote subtotal equals its authoritative lines", quoteResponse.totals.subtotal.amount === subtotal);
check("quote total follows subtotal - discount + shipping + tax", quoteResponse.totals.total.amount === expectedTotal);
check("all quote money uses the response currency", currencies.every((currency) => currency === quoteResponse.currency));
check("quote expiry follows the 15-minute decision", (Date.parse(quoteResponse.expiresAt) - Date.parse(quoteResponse.createdAt)) / 1000 === decisions.quote.ttlSeconds);
check("checkout request is bound to the quoted store", checkoutRequest.storeId === quoteResponse.storeId && checkoutRequest.quoteId === quoteResponse.quoteId);
check("checkout response is bound to the same store and quote", checkoutResponse.storeId === checkoutRequest.storeId && checkoutResponse.quoteId === checkoutRequest.quoteId);
check("checkout response exposes no raw provider data", !/raw|exception|accessToken|providerResponse/i.test(JSON.stringify(checkoutResponse)));
check("structured error exposes no raw provider or exception detail", !/raw|exception|stack|providerResponse/i.test(JSON.stringify(errorResponse)));

const cases = new Map(idempotency.cases.map((item) => [item.id, item]));
const replay = cases.get("same-key-same-request");
const conflict = cases.get("same-key-different-request");
const concurrent = cases.get("concurrent-same-key");
const expired = cases.get("expired-key");
check("idempotency fixture retention matches decisions", idempotency.retentionSeconds === decisions.checkout.idempotencyRetentionSeconds);
check("identical replay returns one session with one provider call", replay.expectedProviderCalls === 1 && new Set(replay.expectedSessionIds).size === 1 && replay.expectedStatuses.join(",") === "201,200");
check("different request with reused key conflicts without another provider call", conflict.expectedProviderCalls === 1 && conflict.expectedStatuses.at(-1) === 409 && conflict.expectedErrorCode === "IDEMPOTENCY_CONFLICT");
check("concurrent identical requests serialize to one provider call", concurrent.concurrent === true && concurrent.expectedProviderCalls === 1 && new Set(concurrent.expectedSessionIds).size === 1);
check("expired idempotency key may create a new session", expired.elapsedSeconds > idempotency.retentionSeconds && expired.expectedProviderCalls === 2 && new Set(expired.expectedSessionIds).size === 2);

console.log(`\n=== Done (${failures} error(s)) ===`);
process.exitCode = failures ? 1 : 0;
