# AeroVista Apparel Integration Contract v1

**Status:** Locked source of truth for future Apparel changes.  
**Application:** `apparel.aerovista.us`  
**Sibling copy:** `F:\aerovista_apparel\docs\APPAREL_INTEGRATION_CONTRACT_V1.md`  
**Scope:** AeroVista flagship store platform. Cindy Santi, Seasons of Change, Horizon Aerial Prints, and future AeroVista brands are downstream storefronts.  
**Governing systems:** AeroVista Account, Identity Gateway, AVCC, App Adapter, Connector Kit, Commerce, Square, fulfillment providers

This document keeps required architecture separate from paths that already have production evidence.

## 1. Store platform hierarchy

The AeroVista flagship defines the store platform. Cindy validates that platform. Cindy does not define a second platform.

```text
AeroVista Flagship Store
        │
        ├── Commerce contracts
        ├── Identity / App Adapter integration
        ├── Cart / checkout behavior
        ├── promotions engine
        ├── order/account UX
        ├── fulfillment integration
        └── shared storefront components
                │
                ├── Cindy Santi
                ├── Seasons of Change
                ├── Horizon Aerial Prints
                └── future AeroVista brands
```

The flagship owns the shared contracts and runtime: Commerce contracts, Identity and App Adapter integration, cart and checkout behavior, the promotions engine, order and account UX, fulfillment integration, and shared storefront components.

A downstream store owns branding, product collection, copy, photography and artwork, collection layout, store-specific merchandising, and approved promotions.

A downstream store inherits identity, App Adapter, account integration, the cart engine, the checkout engine, the order model, payment verification, promotion enforcement, fulfillment plumbing, customer order history, security rules, and audit behavior.

Cindy is the live regression reference. It is not a parallel platform under active development. A flagship milestone is checked by asking whether Cindy can consume it through the shared contract without a Cindy-specific hack. Cindy's working checkout stays in place until that shared replacement is proven. Migration replaces one capability at a time.

Development priority stays on the flagship. Flagship work stops for a Cindy redesign only when Cindy has a customer-facing problem or when a feature is being proved there on purpose.

## 2. Authority model

The storefront does not own identity, authentication, authorization, roles, payment truth, or fulfillment execution.

| Domain | Authority | Standing |
|---|---|---|
| Human doorway and profile UX | AeroVista Account | Built. Account is not the identity authority. |
| Identity and capabilities | Identity Gateway / AVCC | Authority. Session-binding machinery is accepted outside Apparel. |
| Relying-app integration | App Adapter | Required boundary for Apparel. |
| Machine and service integration | Connector Kit | Separate from the relying-app path. |
| Store catalog presentation | Apparel flagship | Local presentation is allowed. |
| Cart UX | Apparel flagship | Shared engine. Downstream stores configure, they do not fork it. |
| Product and SKU mapping | Apparel backend / Commerce | Server-side. |
| Pricing authority | Commerce backend for the transaction being priced | The browser is not the authority. |
| Payment authority | Square | Proven for Cindy's direct checkout. |
| Internal order and correlation | AeroVista Commerce | Target, once Commerce v1 is accepted. Not current production authority. |
| Fulfillment execution | Fulfillment provider (Printful for the live Cindy path) | Execution authority. |
| Store-specific preferences | The downstream store | Branding, collection, copy, artwork, layout, merchandising, approved promotions. |

**Rule:** presentation may be local. Authority may not.

## 3. Identity contract

**Standing: required for Apparel. Not yet proven on `apparel.aerovista.us`.**

Account Session Security v1 is merged. PR #49 resolved exact AVCC session binding, stale-cookie recovery, one-successor behavior, handoff and exchange protections, and replay concerns. That evidence belongs to Account and AVCC. It does not mean Apparel has passed `identity.describe()` → `identity.can()` → logout/revoke.

Authentication answers who the person is. It does not answer what they may do.

Required Apparel flow:

```text
Account doorway
      ↓
registered app callback
      ↓
one-time handoff
      ↓
Apparel server session
      ↓
identity.describe()
      ↓
identity.can()
      ↓
authorized action
```

Mandatory runtime pattern:

```text
Browser
   │
   │ HTTPS
   ▼
Apparel Application
   │
   │ HttpOnly + Secure app session
   │ exact-origin CORS
   ▼
Server-side App Adapter
   │
   ├── identity.describe()
   ├── identity.can(...)
   │
   ▼
Identity Gateway / AVCC
```

The browser does not call AVCC internal APIs.

Permanent session invariants:

- One-time handoff and code replay are rejected.
- The returned session binds exactly.
- The pending transaction is bound to the minted app session.
- A stale predecessor cookie is handled differently from a cookie replaced by another live session.
- Logout and revocation end protected access.
- An identity failure does not fall back to a loosely trusted cookie.

Apparel must use the canonical AeroVista identity, the registered application id, and the approved Account → handoff → application-session flow. Protected actions are authorized on the server. Identity or authorization that cannot be verified fails closed.

Apparel must not create an independent user or password database, create a second profile system, treat an email address as authorization, infer permissions from UI state or profile labels, accept roles supplied by the browser, or let a person self-select Founder, Admin, or Staff. Authentication is not authorization.

## 4. Profile contract

Profile information belongs to the shared AeroVista Profile Contract. Account is the human-facing surface for that profile. Apparel may display appropriate profile information and may request edits through approved Account and Profile interfaces.

Apparel must not directly modify global role, service role, capability, resource grant, identity ownership, identity lifecycle, account authority, or AVCC membership authority.

Changing a display name, avatar, shipping preference, or favorite style must not change access permissions.

## 5. App Adapter contract

`apparel.aerovista.us` is a relying application. App Adapter is the mandatory integration boundary. Connector Kit remains the machine and service integration layer and is not a substitute for App Adapter.

These secrets must never enter client JavaScript, HTML, localStorage, browser bundles, or public environment variables: AVCC service secrets, Identity Gateway service secrets, HMAC secrets, Square access tokens, Square webhook secrets, Printful API secrets, and administrative credentials.

## 6. Authorization contract

Protected actions use authoritative capability checks through App Adapter:

```ts
const identity = await av.identity.describe();
const allowed = await av.identity.can("apparel.order.history.read");
```

### Proposed capability namespace

Registry becomes authoritative once these ids are registered. Until then the names below are examples, not canonical AVCC capability ids.

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

These are application capabilities. They do not replace AVCC global roles. AVCC decides whether the current principal possesses a registered capability. Apparel decides what an authorized capability means inside Apparel.

## 7. Public store contract

Public merchandise discovery does not require authentication. The flagship may expose landing pages, brand and story content, product listings, imagery, size information, general pricing, public collection pages, and public policies.

Authentication is required when the feature depends on a known AeroVista user or a protected resource: saved profile information, order history, member benefits, account-linked discounts, private collections, administrative tools, and customer-specific information.

Public browsing must not grant protected capabilities.

## 8. Commerce authority contract

Two commerce statements are both true, and they are not the same statement.

**Live reference, Cindy direct checkout.** This path is in production and is not being replaced in this pass:

```text
Cindy storefront
      ↓
api.aerovista.us
      ↓
server-authoritative SKU / Square variation mapping
      ↓
Square hosted checkout
      ↓
Printful
```

Five Cindy products and 36 variants at $68, including shipping and tax, were matched, and that direct checkout is live. That price is Cindy catalog configuration. It is not the price of the flagship assortment.

**Target, not current production authority.** Shared Commerce v1 will own the internal order ledger, webhook reconciliation, and order correlation. "Commerce owns the order" is the target architecture. It is not a description of the authority that already runs Cindy checkout.

The browser may send product, variant, quantity, a promotion request, and shipping information. The browser must not authoritatively send final price, discount value, tax, shipping charge, payment status, paid status, fulfillment eligibility, or entitlement result.

Shared purchase path the flagship is building:

```text
Browser
   │ product / variant / qty only
   ▼
Apparel Backend
   │
   ├── authoritative SKU lookup
   ├── authoritative price
   ├── promotion eligibility
   └── Square variation verification
   │
   ▼
Square Hosted Checkout
   │
   ▼
VERIFIED SERVER EVENT / RECONCILIATION   ← target, not yet the accepted Cindy authority
   │
   ├── payment confirmed
   ├── promotion redeemed
   ├── AV order correlated
   └── fulfillment released
   │
   ▼
Printful
```

A redirect back from Square is navigation. It is not proof of payment. A malformed or unknown variation mapping means no checkout.

## 9. Payment contract

A successful browser redirect must not mark an order paid. Only verified server-side payment evidence may move a payment to paid. For the current Cindy path, that evidence is whatever `api.aerovista.us` already accepts for its live checkout. For shared Commerce v1, webhook processing must still provide signature validation, order and payment id verification, amount and currency validation, idempotent processing, replay protection, duplicate-event handling, internal order correlation, and durable audit history.

Unknown or contradictory payment states fail closed. No fulfillment is released because a customer reached a success URL.

## 10. Internal order contract

Once Commerce v1 is accepted, AeroVista Commerce keeps the internal order identity: `av_order_id`, Square order and payment ids, `av_identity_id` when the shopper is authenticated, customer contact, items, variation ids, subtotal, discount, shipping, tax, total, payment status, fulfillment status, and timestamps.

Until that acceptance, Square remains payment authority and the Cindy direct-checkout record remains the live operational path. The flagship must not pretend a shared ledger already exists.

## 11. Product and variant contract

```text
AeroVista Product
      ↓
AeroVista Variant
      ↓
Square Variation
      ↓
Fulfillment Variant
```

Mappings belong on the server. The October 4 Square export is the item authority for what exists. The storefront reads the Gear projection `square_products_latest.json`. It does not parse the workbook in the browser.

## 12. Promotion contract

Promotions are server policy on the flagship engine. A downstream store may approve a promotion. It may not enforce that promotion in private code.

Cindy Connect Hoodies, as an approved promotion:

```text
$25 off each distinct qualifying style
one order only
maximum total discount $125
no stacking
```

AeroVista's server decides eligibility. Square applies and records the resulting discount. Creating a checkout does not consume the promotion. Redemption becomes final only after verified successful payment.

Refreshing the browser, editing JavaScript, or changing the cart payload must not bypass those limits. When a promotion is tied to a person, usage follows canonical identity rather than email or browser storage.

## 13. Fulfillment contract

Payment and fulfillment are separate states. A paid order does not mean the fulfillment provider accepted it. Printful is the execution authority on the live Cindy path. Commerce retains the relationship between the AeroVista order, the Square order and payment, the fulfillment order, and tracking once Commerce v1 is accepted. Fulfillment failures stay recoverable without rewriting payment history.

## 14. Session contract

An Apparel session is an application session tied to an authoritative AeroVista identity session. It is not a permanent independent credential.

```text
invalid session → deny protected action
expired identity → deny protected action
revoked identity or session → terminate app access
stale predecessor cookie → do not treat it as the replacement live session
logout → scoped session termination
```

A stale or malformed session does not downgrade into "probably authenticated."

## 15. Administrative contract

Showing or hiding an admin control is not security. Catalog changes, price changes, promotion changes, order adjustments, refunds, fulfillment intervention, customer inspection, and store configuration are checked on the server. Sensitive changes record actor, identity, action, target, previous state, new state, reason where required, timestamp, and result.

## 16. Data separation

Authentication, profile, authorization, commerce, store preferences, orders, payments, and fulfillment may share an `identityId`. They do not collapse into one user record. Each statement keeps its own authority.

## 17. Failure contract

If identity, capability, price mapping, Square response, payment verification, promotion state, variant mapping, or fulfillment mapping cannot be answered, the protected operation fails. Public storefront content can remain available. Protected operations fail closed.

## 18. No parallel authorities

No second authentication system. No Apparel-specific master profile database. No frontend role authority. No duplicated global roles. No direct browser-to-AVCC internal requests. No client-held HMAC or service secret. No client-authoritative pricing. No redirect-based payment confirmation. No fulfillment before verified payment. No user-created privileged permissions. No role or grant mutations from profile editing. No checkout SKU supplied by the browser without server validation. No second commerce platform for Cindy, Seasons of Change, or Horizon.

## 19. Production acceptance

`apparel.aerovista.us` is not called Identity-integrated until this host has production evidence for:

```text
ACCOUNT DOORWAY
     ↓
HANDOFF
     ↓
APP SESSION
     ↓
identity.describe()
     ↓
identity.can()
     ↓
LOGOUT / REVOKE
```

Including invalid identity, invalid session, missing capability, stale predecessor cookie, replayed handoff, and revoked session.

`apparel.aerovista.us` is not called Commerce-v1 integrated until the shared ledger, verified reconciliation, order correlation, and fulfillment release have production evidence. Cindy's direct checkout remains a separate, already live reference and is not that evidence.

Documentation, source, tests, deployed runtime, and production evidence must describe the same behavior.

## Core rule

> Account is the human-facing doorway and profile surface. Identity Gateway / AVCC establish authoritative identity and capabilities. App Adapter carries that authority into Apparel. Apparel owns the customer shopping experience and server-side catalog mapping. Square is authoritative for payment. AeroVista Commerce will become the authoritative internal order and correlation layer once Commerce v1 is accepted. Fulfillment providers are authoritative for fulfillment execution. No layer may impersonate another layer's authority.
