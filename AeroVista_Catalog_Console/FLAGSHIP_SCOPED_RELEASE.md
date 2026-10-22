# Flagship scoped catalog release contract

Status: **staged, not deployed**. This contract must be satisfied before any live publication.

## Source and destinations
- **Authoritative Square catalog/checkout:** unchanged. Never write price or product updates to Square from this service.
- **Shared Gear/Cindy master:** unchanged. Never call the existing global `POST /api/deploy` for a Flagship release.
- **Assignments:** server-side reviewed 115-product assignment file, exact ID set; currently 85 Flagship-assigned products.
- **Scoped release writer:** `scoped-release.py` writes only `<ledger>/flagship.json` and `<ledger>/snapshots/flagship/*`.
- **Public read adapter:** not yet deployed. Do not enable `VITE_FLAGSHIP_SCOPED_CATALOG_URL` until a safe public projection URL is live.
- **Authentication:** `server-aerocore.js` checks AeroVista capabilities before accepting release operations. Basic breakglass is not a bypass for the new route.

## Required server configuration
All four paths must be supplied by server configuration, not incoming request JSON:
- `AV_FLAGSHIP_MASTER`: read-only master catalog JSON
- `AV_FLAGSHIP_CANDIDATE`: reviewed, immutable candidate catalog JSON
- `AV_FLAGSHIP_ASSIGNMENTS`: reviewed approvals file
- `AV_FLAGSHIP_LEDGER`: Flagship-only release directory

Further gates:
- `AV_FLAGSHIP_RELEASE_CAPABILITY` (default `catalog.flagship.publish`): registered and tested in AeroVista Identity/AVCC
- `AV_FLAGSHIP_RELEASE_ENABLED=true`: explicit release switch; default off
- `AV_FLAGSHIP_DESTINATION_VERIFIED=true`: set only after public projection/reader smoke checks

Do not configure those enable switches merely to bypass a failed test.

## API
These are POST endpoints on Catalog Console; they require the Console origin and an authenticated, authorized AeroVista capability:
- `/api/flagship/release/plan`: review field-level diff without publication
- `/api/flagship/release/publish`: create before/after snapshot then atomically write scoped projection
- `/api/flagship/release/rollback`: restore `snapshot` (a server-side Flagship snapshot path) if current hash matches

No endpoint accepts arbitrary source/destination paths or target store IDs.

## Required acceptance before production
1. Pin the same master SHA, approved assignment SHA, candidate SHA and PR commit for tests.
2. Verify 115 assignments / 85 Flagship selections and only the expected eight changed product IDs.
3. Compare exact Square variation IDs and approved prices (six Lumina hoodie variations must match live Square).
4. Run authorized and unauthorized Console requests including CSRF-origin and capability denial.
5. Publish into dedicated staging ledger, verify 85-product JSON and public reader on desktop/mobile.
6. Test the complete Square handoff without payment or order capture.
7. Roll back staging to the exact pre-publish hash; verify Gear and Cindy/master unchanged.
8. Configure and promote scoped public projection **separately**, then activate the Apparel reader and verify live revision.
9. Keep products without verified images in the review queue, not silently replaced.

Current validation: package Docker build, isolated Console health and auth-disabled deny, JS denial tests, Python writer tests, and sandbox publish/rollback passed. **Authenticated live publish and public projection reader are NOT validated.**
