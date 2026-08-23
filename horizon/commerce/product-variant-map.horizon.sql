-- Horizon Square -> Printful mapping preparation.
-- Review on NXCore before execution. Applying these rows does not make a
-- Horizon variant checkout-ready; catalog proof, size, Square-production, and
-- controlled-order gates remain independent.

BEGIN;

INSERT INTO product_variant_map
  (square_variation_id, sku, provider, provider_variant_id, is_active, notes)
VALUES
  (
    'DZHQKOUSDEIQIAK4HISEGWMX',
    '6A654A4D9263E_19312',
    'printful',
    '5413416117',
    true,
    'Horizon CDA-CAN-001 — Autumn Over Coeur d’Alene'
  ),
  (
    '75ED3TP2HPJ7AWUSU5O5ROXU',
    '6A65534A3A86E_19312',
    'printful',
    '5413449116',
    true,
    'Horizon CDA-CAN-002 — The Road to the Lake'
  ),
  (
    'QNGEHC2XEGDTJC3GMEJREHR5',
    '6A65A829A4D4E_19323',
    'printful',
    '5413807138',
    true,
    'Horizon CDA-CAN-003 — Harbor at the Heart; Printful confirms 30x40'
  ),
  (
    'UE2R6GEZM73GJYVDEIK56XA7',
    '6A65B1DB8CB92_19317',
    'printful',
    '5413829524',
    true,
    'Horizon CDA-CAN-005 — Fairways Along the Lake; Printful confirms 24x48'
  ),
  (
    '4YFQ5YTYAVKDFFZTL5J34VQR',
    '6A65B415A97A5_19317',
    'printful',
    '5413833942',
    true,
    'Horizon CDA-CAN-006 — Lake, Links, and the Floating Green; Printful confirms 24x48'
  ),
  (
    'TSVZMVYNXIABNBTROMOH2WZ3',
    '6A65B8ADCD01D_19317',
    'printful',
    '5413839257',
    true,
    'Horizon CDA-CAN-007 — The Clock at Resort Circle; Printful confirms 24x48'
  ),
  (
    'HM7W4RFQAJOTW4F7VCCPDQSK',
    '6A662E0C9B07F_19310',
    'printful',
    '5414120260',
    true,
    'Horizon CDA-CAN-010 — Mahogany Wake; Printful confirms 20x28'
  ),
  (
    '7GHIQT64RIQ7FG75JXRY4WXM',
    '6A673A0192677_19300',
    'printful',
    '5415090955',
    true,
    'Horizon CDA-CAN-014 — Last Light Over the Resort; Printful confirms 12x24'
  )
ON CONFLICT (provider, square_variation_id)
DO UPDATE SET
  provider_variant_id = EXCLUDED.provider_variant_id,
  sku = EXCLUDED.sku,
  is_active = EXCLUDED.is_active,
  notes = EXCLUDED.notes,
  updated_at = NOW();

COMMIT;
