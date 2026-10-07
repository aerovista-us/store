# AeroVista Apparel Integration Contract v1

**Status:** Corrected working contract. Current evidence and future flagship intent are labeled separately. This text is not locked until both sibling copies match it.  
**Application:** `apparel.aerovista.us`  
**Sibling copy:** `F:\aerovista-store\docs\APPAREL_INTEGRATION_CONTRACT_V1.md`  
**Scope:** The Apparel spatial storefront, and the shared authorities it must use.  
**Governing systems:** AeroVista Account, Identity Gateway, governed access grants, App Adapter, Connector Kit, the shared Store/Commerce backend, Square, Printful

## Documentation precedence

When documents disagree, prefer the higher source:

```text
Verified runtime and provider state
        ↓
Square Catalog and Square payment state
        ↓
Current deployed Store/Commerce backend evidence
        ↓
Current Git source and this contract
        ↓
Notion current-state summaries
        ↓
Older plans, audits, and historical docs
```

`STORE_SPACE_PLAN.md`, the 2026-08-29 `STATUS.md` catalog counts, older Notion product counts, and any note that describes intended same-origin routing as if it were already how Apparel calls checkout are historical. They are not equal to this contract or to the deployed Gear catalog.

## 1. Two different flagship statements

These statements are both true. They are not the same statement.

**Strategic.** `apparel.aerovista.us` is the flagship being built. Future shared store behavior should be defined here and then consumed by other AeroVista stores.

**Operational.** Gear (`gear.aerovista.us` and `api.aerovista.us`) remains the protected current production storefront and the legacy commerce reference while Apparel is promoted into that role. Apparel does not replace that reference by renaming itself the backend.

Cindy is a downstream regression store, not a second platform. Horizon is a downstream brand with its own customer catalog and its own deployment path. Seasons of Change and later brands follow the same rule: they inherit shared contracts and authorities. They do not inherit the Apparel room, the Apparel UI, or the Gear catalog console.

```text
Account
authentication and handoff

        ↓

Identity Gateway and governed grants
identity and capabilities

        ↓

App Adapter
integration seam, no authority of its own

        ↓

Apparel
presentation and local enforcement

        ↓

Shared Store / Commerce backend
Square projection, mapping, checkout policy,
promotions, order orchestration

        ↓

Square
catalog, retail price, and payment truth

        ↓

Printful
fulfillment execution
```

What a downstream store owns: branding, collection, copy, photography, artwork, layout, and store-specific merchandising.

What a downstream store inherits: Account authentication, identity and capability checks, the shared commerce projection, checkout policy, payment verification, and fulfillment authority. Horizon must not be published through the Gear catalog console. A shared commerce contract is not a shared storefront implementation.

Cindy's current checkout stays in place until a shared replacement is proven one capability at a time. Flagship work stops for a Cindy redesign only when Cindy has a customer-facing problem or a feature is being proved there on purpose.

## 2. Authority model

Apparel does not own authentication, capability grants, Square mapping, payment truth, or fulfillment execution.

| Domain | Authority | Standing |
|---|---|---|
| Authentication and profile doorway | AeroVista Account | Account proves authentication. It is also the human profile surface. It does not grant capabilities. |
| Identity and capabilities | Identity Gateway and governed access-grant services | Resolve shared identity and capability. Session-binding evidence is accepted outside Apparel. |
| Grant administration | AVCC Command Center | May govern grants. `avcc.aerocoreos.com` is not the request-time trust boundary. |
| Integration seam | App Adapter | Transports the identity result. No authority of its own. |
| Machine and service integration | Connector Kit | Separate from the relying-app path. |
| Presentation and local enforcement | Apparel | Spatial storefront. Enforces the capability it was given. Must not invent product identity, price, size, SKU, or Square variation. |
| Projection, mapping, checkout policy, promotions, order orchestration | Shared Store/Commerce backend at `api.aerovista.us` | Current production commerce path. Not an Apparel backend, unless an Apparel BFF is introduced on purpose later. |
| Catalog, retail price, payment, refund | Square | Commercial truth. |
| Normalized internal order ledger | Commerce v1 | Future normalization of a path the legacy API already operates. |
| Fulfillment execution | Printful | Execution authority. |

**Rule:** Account proves authentication. Identity grants capability. Applications enforce capability.

The server is authoritative to the browser. Square is authoritative to the server for the commercial catalog and the base retail price.

Commerce synchronizes and projects Square, rejects stale or inconsistent pricing, applies approved promotions and order policy, and creates checkout. It does not invent a competing base retail price.

**Catalog drift invariant:** A buyable AeroVista variant must map to a currently accepted Square item and variation. Its base price must equal the accepted Square catalog price. Any mismatch fails checkout readiness until reconciled. The Shadow Pants hold is this invariant: the October 4 Square-derived catalog says $52.00 and the live checkout map still charges $46.00. The storefront is not rewritten to match the stale map.

An `.xlsx` export is a dated intake snapshot. It can contain service rows, hidden items, and incomplete listings, and it is curated before publication. It is not Square, and it is not a second source of truth. `square_products_latest.json` is the public Gear projection of that curated Square state. Apparel reads the projection. It does not parse the workbook.

## 3. Identity contract

**Standing: required for Apparel. Not yet proven on `apparel.aerovista.us`.**

Account Session Security v1 is merged. PR #49 resolved exact session binding, stale-cookie recovery, one-successor behavior, handoff and exchange protections, and replay rejection outside Apparel. That evidence does not mean this host has passed `identity.describe()` → `identity.can()` → logout/revoke.

```text
Account
authentication and handoff
        ↓
Identity Gateway and governed grants
identity and capabilities
        ↓
App Adapter
        ↓
Apparel
local enforcement
```

Mandatory runtime pattern:

```text
Browser
   │ HTTPS
   ▼
Apparel
   │ HttpOnly + Secure app session, exact-origin CORS
   ▼
Server-side App Adapter
   │ identity.describe() / identity.can()
   ▼
Identity Gateway and governed grant services
```

The browser does not call Identity Gateway or AVCC internal APIs. The Command Center UI does not authorize an Apparel request.

Permanent session invariants:

- One-time handoff and code replay are rejected.
- The returned session binds exactly.
- The pending transaction is bound to the minted app session.
- A stale predecessor cookie is handled differently from a cookie replaced by another live session.
- Logout and revocation end protected access.
- An identity failure does not fall back to a loosely trusted cookie.

Apparel must not create a user or password database, a second profile system, or a path that treats email, UI state, or a self-selected role as authorization.

## 4. Profile contract

Profile information belongs to the shared AeroVista Profile Contract. Account is the human-facing surface for that profile. Apparel may display it and may request edits through approved Account and Profile interfaces.

Apparel must not directly modify global role, service role, capability, resource grant, identity ownership, identity lifecycle, or AVCC membership. Changing a display name, avatar, shipping preference, or favorite style must not change access.

## 5. App Adapter contract

`apparel.aerovista.us` is a relying application. App Adapter is the mandatory integration seam and has no authority of its own. Connector Kit remains the machine and service layer and is not a substitute for App Adapter.

These secrets must never enter client JavaScript, HTML, localStorage, browser bundles, or public environment variables: Identity Gateway and AVCC service secrets, HMAC secrets, Square access tokens, Square webhook secrets, Printful API secrets, and administrative credentials.

## 6. Authorization contract

Protected actions use capability checks through App Adapter:

```ts
const identity = await av.identity.describe();
const allowed = await av.identity.can("apparel.order.history.read");
```

The Identity Gateway and its governed grant services decide whether the current principal holds a registered capability. Apparel enforces that result. AVCC may administer the grants. The Command Center UI is not that decision.

### Proposed capability namespace

Registry becomes authoritative once these ids are registered. Until then the names below are examples, not canonical capability ids.

```text
apparel.account.access
apparel.order.create
apparel.order.read
apparel.order.history.read
apparel.promotion.use
apparel.member.pricing
apparel.support.manage
apparel.catalog.manage
apparel.order.manage
apparel.admin
```

These are application capabilities. They do not replace global roles.

## 7. Public store contract

Public merchandise discovery does not require authentication. Apparel may show the room, brand and story, listings, imagery, sizes, displayed prices, collections, and public policies.

Authentication is required for saved profile information, order history, member benefits, account-linked discounts, private collections, administrative tools, and other customer-specific resources. Public browsing must not grant protected capabilities.

## 8. Commerce authority contract

**Current production reference: Gear and the legacy Store API.** Apparel's browser calls `https://gear.aerovista.us` for the catalog and `https://gear.aerovista.us/api/square/checkout` for checkout. It does not use a same-origin Apparel API, and it skips bootstrap unless a commerce API base is configured. Same-origin `/api` and `/v1` routing is intended infrastructure. It is not the current Apparel path.

Mapping and checkout authority live in the shared Store/Commerce backend behind `api.aerovista.us`. Apparel sends product, variant, quantity, and the compatibility cart key. It does not send a base price, discount, tax, shipping charge, or paid flag.

```text
Browser
"this AeroVista product, this variant, this quantity"
        ↓
Shared Store / Commerce backend
resolve the AeroVista product
resolve the Square variation
verify it against the current Square-synchronized projection
read the Square base price
reject the checkout if that projection has drifted
apply an approved AeroVista promotion only when that promotion is actually enforced
        ↓
Square
payment truth
```

The legacy backend already receives verified Square webhooks, stores order data in Postgres, creates fulfillment jobs, and runs fulfillment and reconcile workers. That is the operational path. Commerce v1 is the normalized, versioned authority still to be accepted. It replaces and normalizes this path. It does not mean orders, webhooks, and fulfillment are being invented from zero.

**Cindy checkout admission, not a paid-order proof.** Cindy's production evidence is 5 products, 36 variants, CORS, server SKU and Square variation mapping, Square-hosted checkout creation, and Printful mappings, at the $68 offer that includes shipping and tax. No purchase was required for that admission. Checkout generation plus fulfillment mapping is proven. A Cindy paid order through webhook to fulfillment is not.

A redirect back from Square is navigation. It is not proof of payment. A variation that is missing, stale, or priced differently from the accepted Square catalog does not check out.

## 9. Payment contract

A successful browser redirect must not mark an order paid. Square is the authority for payment and refund. The legacy backend already accepts verified Square webhooks for the current Gear path. Commerce v1 still has to prove signature validation, order and payment id verification, amount and currency validation, idempotent processing, replay protection, duplicate-event handling, normalized order correlation, and durable audit history before Apparel is called Commerce-v1 integrated.

Unknown or contradictory payment states fail closed. Reaching a success URL does not release fulfillment.

## 10. Internal order contract

The legacy Store API already keeps operational order and fulfillment records. Commerce v1, once accepted, is the normalized internal identity: `av_order_id`, Square order and payment ids, `av_identity_id` when the shopper is authenticated, contact, items, variation ids, subtotal, discount, shipping, tax, total, payment status, fulfillment status, and timestamps.

Until that acceptance, Apparel must not pretend the normalized ledger exists, and it must not pretend the legacy backend stores nothing.

## 11. Product and variant contract

```text
AeroVista product id        shared catalog mapping
        ↓
AeroVista variant
        ↓
Square variation            Square
        ↓
Fulfillment variant         Printful
```

The shared Store/Commerce backend owns the mapping. Apparel merchandising only decides where a mapped product appears in the room. Square decides that the commercial item exists, which variation it is, and what the base price is.

## 12. Promotion contract

**Standing: required for a shared flagship promotion engine. Not proven on that engine.**

A downstream store may approve a promotion. It may not enforce that promotion in private code once the shared engine exists. The shared engine does not exist yet.

Cindy Connect Hoodies is an approved requirement, not evidence that shared redemption already runs:

```text
$25 off each distinct qualifying style
one order only
maximum total discount $125
no stacking
```

When that engine exists, the server decides eligibility, Square records the discount, creating a checkout does not consume the promotion, and redemption is final only after verified payment. Until then, this contract must not describe that path as live.

Refreshing the browser or editing the cart payload must not become the way a promotion is granted. When a promotion is tied to a person, usage follows canonical identity rather than email or browser storage.

## 13. Fulfillment contract

Payment and fulfillment are separate states. Printful is the execution authority for whether an item was accepted or shipped. The legacy backend already creates fulfillment jobs and reconciles them. Commerce v1 normalizes the link among the AeroVista order, the Square order and payment, the fulfillment order, and tracking. A paid order does not by itself mean Printful accepted it. Fulfillment failures stay recoverable without rewriting payment history.

Cindy's admission proof includes Printful mappings. It does not include a demonstrated Cindy paid-order fulfillment.

## 14. Session contract

An Apparel session is an application session tied to an AeroVista identity session. It is not a permanent independent credential.

```text
invalid session → deny protected action
expired identity → deny protected action
revoked identity or session → terminate app access
stale predecessor cookie → do not treat it as the replacement live session
logout → scoped session termination
```

A stale or malformed session does not downgrade into "probably authenticated."

## 15. Administrative contract

Showing or hiding an admin control is not security. Catalog changes, price changes, promotion changes, order adjustments, refunds, fulfillment intervention, customer inspection, and store configuration are checked on the server. Sensitive changes record actor, identity, action, target, previous state, new state, reason where required, timestamp, and result. A displayed price change does not let Apparel or Commerce override Square's base price.

## 16. Data separation

Authentication, profile, authorization, commerce, store preferences, orders, payments, and fulfillment may share an `identityId`. They do not collapse into one user record. Each statement keeps its own authority.

## 17. Failure contract

If identity, capability, Square variation, Square base price, payment verification, promotion state, or fulfillment mapping cannot be answered, the protected operation fails. Public browsing can remain available. Checkout fails closed on catalog drift.

## 18. No parallel authorities

No second authentication system. No Apparel user database. No second profile system. No frontend role authority. No direct browser-to-Identity or browser-to-AVCC internal requests. No client-held service secret. No client-supplied base price. No stale server map that overrides the accepted Square base price. No redirect treated as payment. No fulfillment released only because a success URL loaded. No Apparel-owned SKU map while mapping lives in the shared Store/Commerce backend. No requirement that Horizon, Cindy, or Seasons of Change render the Apparel room. No claim that Cindy's checkout admission was a paid end-to-end order. No claim that the Cindy promotion is already enforced by a shared flagship engine.

## 19. Production acceptance

`apparel.aerovista.us` is not called Identity-integrated until this host has production evidence for Account authentication, handoff, an HttpOnly app session, `identity.describe()`, `identity.can()`, and logout/revoke, including invalid identity, invalid session, missing capability, stale predecessor cookie, replayed handoff, and revoked session.

`apparel.aerovista.us` is not called Commerce-v1 integrated until the normalized ledger, reconciliation, order correlation, and fulfillment release have production evidence on this host. The legacy webhook and fulfillment workers are current Gear evidence. Cindy's checkout admission is current Cindy evidence. Neither is Apparel Commerce v1.

A variant is not checkout-ready until storefront identity, Square variation, the server price derived from the accepted Square catalog, and the provider checkout path reconcile in production.

Documentation, source, deployed runtime, and production evidence must describe the same behavior. Older plans do not outrank a newer verified runtime.

## Core rule

> Account proves authentication. Identity Gateway and governed grants resolve identity and capability. App Adapter transports that result and has no authority of its own. Apparel presents the shop and enforces the capability locally. The shared Store/Commerce backend projects Square, maps variations, validates checkout, applies approved promotions, and orchestrates orders. Square is commercial truth for catalog, retail price, and payment. Printful executes fulfillment. No layer may impersonate another layer's authority.
