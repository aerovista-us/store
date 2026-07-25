# Horizon Store Definition

**Status:** Phase 0 decision record — not approved for preview or production

**Updated:** July 24, 2026 PT

## Purpose

This document turns the Horizon storefront concept into an explicit approval
checklist. It separates verified platform capability from placeholder business
decisions so synthetic fixture data cannot be mistaken for a launch catalog.

Horizon will be an independently branded storefront using the shared AeroVista
operator console, catalog contracts, Commerce API, and maintained storefront
source. It will not be a public tab inside Gear and will not share Gear's cart,
catalog publication target, hostname, or rollback path.

## Current verified foundation

- Store ID `horizon`, catalog channel `horizon`, and cart namespace `horizon`
  are reserved and distinct from Gear.
- The private console has an isolated Horizon draft workspace with separate
  catalog, overlay, images, backups, and browser state.
- Horizon cannot call the Gear publisher or write Gear workspace files.
- Generic non-apparel options validate through the shared schemas.
- Synthetic Horizon catalog, quote, Square sandbox checkout, signed webhook,
  and persistent rate-limit tests pass in the unpublished NXCore sandbox.
- Production `/v1` is not deployed, and no Horizon hostname is attached to a
  customer-facing release.

## Fixture boundary

The following values are test fixtures, not business approvals:

| Fixture value | Current use | Launch status |
|---|---|---|
| `AeroVista Horizon` | Working display name | Requires brand approval |
| `horizon-preview.aerovista.us` | Schema-valid placeholder hostname | No DNS or hosting approval |
| `Coastal Ridge Study` | Synthetic catalog product | Not sellable |
| `18 × 24 in`, `24 × 36 in` | Generic dimensions test | Requires provider/product validation |
| Archival paper and canvas | Generic material test | Requires sourcing and policy approval |
| `$129.00`, `$249.00` | Integer-money contract test | Not approved pricing |
| `fixture-horizon-coastal-ridge` | Media relationship test | Zero-checksum placeholder; no launch asset |

Files containing fixture-only data:

```text
stores/horizon/store.fixture.json
tests/fixtures/commerce/normalized-horizon-catalog.json
tests/fixtures/commerce/merchandising-horizon.json
tests/fixtures/commerce/media-manifest-horizon.json
```

Do not rename these files to production names or set `environment` to
`preview`/`production` until every decision below has an owner and evidence.

## Required business decisions

| Decision | Owner | Approved value | Status / evidence required |
|---|---|---|---|
| Public store name | Unassigned | — | Brand approval |
| Preview hostname | Unassigned | — | Hosting target and DNS ownership |
| Production hostname | Unassigned | — | DNS, TLS, canonical URL, monitoring |
| Legal seller identity | Unassigned | — | Entity shown at checkout and in policies |
| Support email | Unassigned | — | Monitored mailbox and response owner |
| Initial product types | Unassigned | — | Print, canvas, metal, digital, limited edition, or other |
| Payment provider | Unassigned | — | Production account/location and reconciliation owner |
| Production/fulfillment provider | Unassigned | — | Product-level provider capability and SLA |
| Shipping regions and rates | Unassigned | — | Provider evidence and customer wording |
| Tax handling | Unassigned | — | Provider/platform responsibility |
| Damage/return policy | Unassigned | — | Material-specific approval |
| Edition/authenticity terms | Unassigned | — | Required only if limited editions are sold |
| Licensing/digital rights | Unassigned | — | Required before any digital product |
| Analytics/consent | Unassigned | — | Approved tags and privacy wording |
| Launch approver | Unassigned | — | Named go/no-go authority |

## Initial catalog intake

For each proposed product, provide:

1. Stable public product ID and customer-facing title.
2. Product type and collection assignment.
3. Final description and policy-sensitive claims.
4. Option groups such as dimensions, material, frame, finish, orientation, or
   edition.
5. Every sellable option combination with a stable public variant ID and SKU.
6. Authoritative price, currency, availability, weight, and shipping behavior.
7. Private payment, production, and fulfillment provider identifiers.
8. Source image, checksum, dimensions, rights/ownership confirmation, alt text,
   crop/focal point, and storefront role.
9. Packaging, production time, shipping estimate, damage handling, and return
   eligibility.
10. Whether the product is fixture-only, previewable, or approved for launch.

No browser-supplied price or private provider identifier becomes catalog truth.
The backend remains authoritative for sellability, price, quote totals, and
checkout eligibility.

## Store package to create after approval

The first real Horizon package should contain:

```text
stores/horizon/store.preview.json
stores/horizon/catalog.preview.json
stores/horizon/merchandising.preview.json
stores/horizon/media.preview.json
stores/horizon/theme.css
stores/horizon/content/
```

The package must:

- validate against the shared schemas;
- use only Horizon IDs, copy, media, and provider mappings;
- generate a deterministic preview artifact;
- use a Horizon-specific cart namespace;
- target only an isolated preview host;
- contain exact preview CORS and redirect allowlists;
- include a release manifest and rollback identifier; and
- leave the Gear source artifact and catalog hashes unchanged.

## Preview gate

Phase 0 is complete only when:

- every required business decision has an owner and approved value;
- at least one real product has complete variants, provider mappings, media,
  price, availability, and policies;
- no placeholder hostname, price, checksum, product, policy, or fulfillment
  behavior remains in the proposed preview package;
- the preview target and rollback owner are approved; and
- the production `/v1` release remains separately gated.

After Phase 0 approval, the next engineering checkpoint is to build the
deterministic Horizon preview package from the shared storefront core. Creating
this decision record does not authorize DNS, provider, production API, or
customer-facing changes.
