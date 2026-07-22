# Store-Aware Commerce Schema Alpha

**Status:** `1.0.0-alpha.1` proposal and compatibility proof

**Production effect:** None
**Purpose:** Validate Gear and Horizon through one generic model before adding `/v1` routes or changing the console

## What this milestone proves

- Gear and Horizon can use distinct store IDs, catalog channels, cart namespaces, hostnames, themes, and release versions.
- Apparel sizes/colors and Horizon dimensions/materials use the same generic option-group structure.
- All money values in the normalized contract are integer minor units.
- Current Gear product and variant counts survive read-only normalization.
- Public normalized variants use stable public IDs while Square variation IDs move into a private mapping sidecar.
- Existing Gear image paths can remain as compatibility URLs while the future media manifest introduces stable asset IDs.
- Normalization is deterministic and does not write back to `store/square_products_latest.json`.

## Files

| Path | Purpose |
|---|---|
| `schemas/store-config.schema.json` | Store identity, channel, cart namespace, homepage composition, API paths, and policies |
| `schemas/catalog.schema.json` | Generic products, option groups, variants, minor-unit prices, visibility, and availability |
| `schemas/provider-mappings.schema.json` | Private mapping from public variants to provider variation IDs and legacy cart keys |
| `schemas/merchandising.schema.json` | Store-scoped featured products, section order, collections, and presentation overrides |
| `schemas/media-manifest.schema.json` | Stable asset metadata, dimensions, focal point, checksum, and store/product assignments |
| `scripts/lib/normalize-gear-catalog.mjs` | Read-only adapter from the current Gear catalog to the alpha contracts |
| `scripts/audit-commerce-schemas.mjs` | Schema, isolation, identity, parity, and determinism checks |

## Boundary between public catalog and private mappings

The browser-facing catalog does not need Square variation IDs. The adapter therefore returns two artifacts:

```text
normalized catalog
  -> public product and variant IDs
  -> generic selected options
  -> display price in integer minor units

private provider mapping
  -> public product ID
  -> public variant ID
  -> Square variation ID
  -> legacy Color__Size compatibility key
```

This separation prevents a generic key such as `Default__M` from becoming a product identity and gives the future quote/checkout service one authoritative place to resolve provider IDs.

## Media approach

The catalog uses stable `assetId` references. During migration, a Gear asset may also include `legacySrc` so current `store/img/` URLs remain valid. The media manifest is intended for product photography and generated renditions; logos, icons, and small design assets can remain source controlled.

The fixture manifest deliberately models metadata only. Selecting object storage/CDN, upload credentials, retention, rendition sizes, and URL migration remains a later media phase and must not be implied by this alpha.

## Deliberately unresolved before approval

- Final Horizon production hostname
- Whether every storefront uses a same-origin Worker or the central API directly
- Public variant ID persistence/storage strategy beyond the deterministic compatibility adapter
- Final catalog-version format and release storage
- Provider mapping repository/service ownership
- Mixed-store checkout, which remains explicitly unsupported
- Media storage vendor and migration schedule

## Validation

Run:

```bash
npm run audit:commerce-schemas
```

This validates current Gear through the compatibility reader and validates Horizon fixtures with `dimensions` and `material` option groups. The audit is offline, deterministic, and does not modify production data.

## Approval gate

Treat `1.0.0-alpha.1` as reviewable, not final. Before implementing `/v1` or adapting the operator console, approve:

1. Store/channel/cart namespace semantics.
2. Public variant IDs versus private provider mappings.
3. Generic option-group representation.
4. Integer minor-unit price representation.
5. Version fields and compatibility/deprecation policy.

Compatibility writers remain intentionally absent until round-trip preservation requirements are approved and tested.
