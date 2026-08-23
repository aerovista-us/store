# Horizon Word-style bevel and wall-label release

**Date:** 2026-07-27  
**Target:** `https://horizon.aerovista.us`  
**State:** public `noindex`; commerce remains fail-closed

## Outcome

The proportional gallery wall retains its photographic room and physical size
relationships while reducing purchasing-interface clutter.

- Each canvas uses a restrained five-degree horizontal perspective treatment
  inspired by Microsoft Word's beveled picture presentation.
- The continuous image-derived wrap remains intact; no detached side or bottom
  polygon, reflection, offset slab, or external drop shadow was added.
- Title, subtitle, made-to-order state, canvas size, finish, and price are
  typeset directly onto the green wall in warm ivory.
- A fine wall-colored rule separates the description from the offer.
- Only View the Piece retains a rectangular control surface: a quiet,
  high-contrast outlined button under the wall text.
- Desktop still shows one finite four-piece wall.
- Mobile still provides one proportional wall bay at a time with previous,
  next, and position controls.

## Commerce and recovery boundary

- 5 public products
- 4 consumer wall pieces
- 1 Harbor business-placement feature
- 0 checkout-ready variants
- no catalog, price, cart-key, visibility-profile, Square, Printful, Postgres,
  Worker, DNS, or API mutation

## Verification

- sanitized artifact build and audit passed
- desktop presentation verified at 1440 × 1200
- mobile presentation verified at 390 × 844
- View the Piece opens the correct product details
- mobile wall controls remain available
- browser console: 0 errors, 0 warnings

## Deployment evidence

- public repository commit:
  `e35d6eba7d3be24eb4d5248c0324cd95b6a2e2ec`
- GitHub Pages run: `30255642320`
- versioned stylesheet URL: `css/styles.css?v=20260727-bevel`
- production CSS includes the five-degree bevel and direct-on-wall label rules
- production white placard rule is absent
- `https://horizon.aerovista.us/api/health`: HTTP `200`
- `noindex`: present
- production browser console: 0 errors, 0 warnings
- production screenshot:
  `output/playwright/horizon-word-bevel-production-e35d6eb.png`
