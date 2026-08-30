SELECT fj.id, fj.job_status, left(fj.error_text, 80) AS error,
       oi.square_variation_id, left(oi.title, 60) AS title, oi.sku
FROM fulfillment_jobs fj
JOIN orders o ON o.id = fj.order_id
JOIN order_items oi ON oi.order_id = o.id
WHERE fj.job_status IN ('needs_review', 'failed')
ORDER BY fj.id DESC
LIMIT 15;

SELECT count(*) AS active_printful_maps
FROM product_variant_map
WHERE provider = 'printful' AND is_active = true;
