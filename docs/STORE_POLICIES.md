# Store policies & support contact

Customer-facing FAQ, shipping, returns, and contact copy for the static storefront (`store/index.html` and variants).

## Source of truth

| File | Role |
|------|------|
| `store/policy-content.js` | Shared HTML policy pack (`window.AV_STORE_POLICY_PACK`) |
| `store/index.html` | Canonical shop; loads `policy-content.js` and merges into `STORE` (inline copy also present as fallback) |
| `store/av_gear_shop_pages.html` | Collection-pages variant; uses policy pack only |
| `store/av_gear_shop_landing.html` | Landing variant; uses policy pack only |

After edits, run `npm run sync:store` so `public/shop/` matches `store/`.

## Support email

- **orders@aerovista.us** — `STORE.emailFallback`, `STORE.supportEmail`, and mailto links in Returns / Contact modals.

## Policy summary (POD)

### FAQ
- Apparel runs true to size on POD blanks; size up for relaxed fit.
- Every piece is made to order (no finished-goods inventory).
- Care: cold wash inside-out; low heat; spot-clean hats.

### Shipping (US)
- **Production:** ~2–5 business days after checkout.
- **Transit:** ~3–7 business days after production.
- **Typical total:** ~5–12 business days door-to-door.
- International (where offered): often 10–20 business days after production; duties/taxes on buyer.

### Returns & exchanges
- **Final sale** except defects, wrong item, or transit damage (report within **7 days** with photos).
- **Size exchanges** may be available within **14 days** if unworn/unwashed; buyer pays return shipping unless our error.
- Contact **orders@aerovista.us** before sending returns.

### Contact
- Email **orders@aerovista.us** with order number; aim to reply in 1–2 business days (Mon–Fri US).

## UI behavior

Footer links open modals with class `modal--policy`, which hides add-to-cart, size/color, and price controls. Product quick-view still uses the standard modal.

Product detail shipping blurb points shoppers to footer **Shipping** for full timelines.

## Updating copy

1. Edit `store/policy-content.js` (all storefront HTML files that load it).
2. If you maintain inline policies in `store/index.html`, keep them in sync or switch `STORE` to `_policyPack` only.
3. `npm run sync:store` and verify footer modals on `/shop/index.html`.
