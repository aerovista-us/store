import os
import json
import uuid
import hmac
import hashlib
import base64
import requests
from flask import Flask, request, jsonify, make_response, render_template
from werkzeug.exceptions import BadRequest
from datetime import datetime

from db import (
    engine,
    get_session,
    WebhookEvent,
    Order,
    OrderItem,
    FulfillmentJob,
)
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.orm import selectinload


app = Flask(__name__, template_folder="templates")


# --------------------------
# Config helpers
# --------------------------
def _csv_env(name: str, default: str = "") -> list[str]:
    raw = os.getenv(name, default).strip()
    if not raw:
        return []
    return [x.strip() for x in raw.split(",") if x.strip()]


ALLOWED_ORIGINS = set(_csv_env("ALLOWED_ORIGINS")) or set(_csv_env("ALLOWED_ORIGIN"))
# Recommended default: only your storefronts (override in .env)
if not ALLOWED_ORIGINS:
    ALLOWED_ORIGINS = {
        "https://aerovista-us.github.io",
        "https://aerovista.us",
        "https://www.aerovista.us",
    }


def add_cors(resp):
    origin = request.headers.get("Origin", "")
    if origin and origin in ALLOWED_ORIGINS:
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Vary"] = "Origin"
        resp.headers["Access-Control-Allow-Credentials"] = "true"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS, HEAD"
    return resp


@app.after_request
def _after(resp):
    return add_cors(resp)


def require_env(name: str) -> str:
    val = os.getenv(name, "").strip()
    if not val:
        raise RuntimeError(f"Missing required env var: {name}")
    return val


def square_env() -> str:
    env = os.getenv("SQUARE_ENV", "").strip().lower()
    if env not in ("sandbox", "production"):
        raise RuntimeError("SQUARE_ENV must be 'sandbox' or 'production'")
    return env


def require_square_creds():
    # Always require these for /bootstrap and /checkout
    require_env("SQUARE_APP_ID")
    require_env("SQUARE_LOCATION_ID")
    require_env("SQUARE_ACCESS_TOKEN")
    square_env()


def _coerce_percent_rate(raw) -> float | None:
    try:
        value = float(raw)
    except (TypeError, ValueError):
        return None
    if value <= 0:
        return None
    if value > 1:
        value = value / 100.0
    if value <= 0 or value >= 1:
        return None
    return value


def load_promo_rules() -> dict[str, dict]:
    raw = os.getenv("PROMO_CODES_JSON", "").strip()
    if not raw:
        return {
            "SEED10": {"type": "percent", "rate": 0.10, "label": "10% off"},
            "CREW15": {"type": "percent", "rate": 0.15, "label": "15% off"},
        }

    try:
        data = json.loads(raw)
    except Exception:
        return {}
    if not isinstance(data, dict):
        return {}

    out: dict[str, dict] = {}
    for code, raw_rule in data.items():
        promo_code = str(code or "").strip().upper()
        if not promo_code:
            continue

        rule: dict | None = None
        if isinstance(raw_rule, (int, float)):
            rate = _coerce_percent_rate(raw_rule)
            if rate is not None:
                rule = {"type": "percent", "rate": rate}
        elif isinstance(raw_rule, dict):
            raw_type = str(raw_rule.get("type") or raw_rule.get("kind") or "percent").strip().lower()
            if raw_type in ("percent", "percentage", "fixed_percentage"):
                rate = _coerce_percent_rate(
                    raw_rule.get("rate", raw_rule.get("value", raw_rule.get("percent")))
                )
                if rate is not None:
                    rule = {"type": "percent", "rate": rate}
            elif raw_type in ("fixed_amount", "fixed", "amount"):
                raw_cents = raw_rule.get("amount_cents", raw_rule.get("cents", raw_rule.get("value")))
                try:
                    amount_cents = int(raw_cents)
                except (TypeError, ValueError):
                    amount_cents = 0
                if amount_cents > 0:
                    rule = {"type": "fixed_amount", "amount_cents": amount_cents}

            if rule is not None:
                label = str(raw_rule.get("label") or raw_rule.get("name") or "").strip()
                if label:
                    rule["label"] = label

        if rule is None:
            continue
        out[promo_code] = rule

    return out


def public_promo_rules() -> dict[str, dict]:
    out: dict[str, dict] = {}
    for code, rule in load_promo_rules().items():
        promo_type = rule.get("type")
        if promo_type == "percent":
            rate = float(rule.get("rate") or 0)
            out[code] = {
                "type": "percent",
                "rate": rate,
                "label": rule.get("label") or f"{int(round(rate * 100))}% off",
            }
        elif promo_type == "fixed_amount":
            amount_cents = int(rule.get("amount_cents") or 0)
            out[code] = {
                "type": "fixed_amount",
                "amountCents": amount_cents,
                "label": rule.get("label") or f"${amount_cents / 100:.2f} off",
            }
    return out


# --------------------------
# Square Payment Links (Option A: hosted checkout URL)
# --------------------------
def square_base_url() -> str:
    env = (os.getenv("SQUARE_ENV") or "production").lower()
    return "https://connect.squareupsandbox.com" if env == "sandbox" else "https://connect.squareup.com"


def square_headers() -> dict:
    env = (os.getenv("SQUARE_ENV") or "production").lower()
    token = os.getenv("SQUARE_ACCESS_TOKEN_SANDBOX") if env == "sandbox" else os.getenv("SQUARE_ACCESS_TOKEN")
    if not token:
        raise RuntimeError("Missing Square access token for current env")
    version = os.getenv("SQUARE_VERSION") or "2025-01-16"
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Square-Version": version,
    }


def money(amount_cents: int, currency: str) -> dict:
    return {"amount": int(amount_cents), "currency": currency}


def load_sku_map() -> dict:
    raw = os.getenv("SQUARE_SKU_MAP_JSON", "").strip()
    if raw:
        try:
            m = json.loads(raw)
            if isinstance(m, dict):
                return m
        except Exception:
            pass

    map_file = os.getenv("SQUARE_SKU_MAP_FILE", "").strip() or os.path.join(os.path.dirname(__file__), "sku_map.generated.json")
    try:
        with open(map_file, "r", encoding="utf-8") as f:
            m = json.load(f)
            return m if isinstance(m, dict) else {}
    except Exception:
        return {}


def build_line_items_from_cart(cart: list, currency: str) -> list:
    """
    Build Square line items from cart. Price is always from sku_map (Square authoritative).
    Client-sent price/cents are ignored to guarantee what you charge matches Square catalog.
    """
    sku_map = load_sku_map()
    variation_index = {}
    for _, meta in sku_map.items():
        if isinstance(meta, dict):
            vid = str(meta.get("variationId", "")).strip()
            if vid:
                variation_index[vid] = meta
            nested = meta.get("variationsById")
            if isinstance(nested, dict):
                for nested_vid, nested_meta in nested.items():
                    nested_vid = str(nested_vid or "").strip()
                    if nested_vid and isinstance(nested_meta, dict):
                        variation_index[nested_vid] = nested_meta
    line_items = []

    for idx, item in enumerate(cart):
        sku = str(item.get("sku", "")).strip()
        variation_id = str(item.get("variationId") or item.get("variation_id") or "").strip()
        qty = item.get("qty", 0)
        # Log if client sent price (we ignore it; Square/sku_map is authoritative)
        if "price" in item or "cents" in item:
            import logging
            logging.getLogger(__name__).warning(
                "Checkout: ignoring client-sent price for sku=%s (variationId=%s); using sku_map.",
                sku or "(none)", variation_id or "(none)"
            )

        if not sku:
            raise ValueError(f"cart[{idx}].sku required")
        try:
            qty_i = int(qty)
        except Exception:
            raise ValueError(f"cart[{idx}].qty must be int")
        if qty_i <= 0:
            raise ValueError(f"cart[{idx}].qty must be > 0")

        meta = variation_index.get(variation_id) if variation_id else None
        if not meta:
            meta = sku_map.get(sku)
        if not meta:
            if variation_id:
                raise ValueError(
                    f"Unknown SKU '{sku}' (variationId: {variation_id}). "
                    "Add this key to SQUARE_SKU_MAP_JSON on the server with name and cents."
                )
            raise ValueError(
                f"Unknown SKU '{sku}'. "
                "Add this key to SQUARE_SKU_MAP_JSON on the server with \"name\" and \"cents\"."
            )

        name = str(meta.get("name") or sku)
        cents = int(meta.get("cents"))
        if cents < 0:
            raise ValueError(f"Invalid cents for SKU {sku}")

        line_items.append({
            "name": name,
            "quantity": str(qty_i),
            "base_price_money": money(cents, currency),
            "note": f"sku:{sku}",
        })

    return line_items


def build_order_discount_for_promo(promo_code: str | None, subtotal_cents: int, currency: str) -> dict | None:
    code = str(promo_code or "").strip().upper()
    if not code:
        return None

    rule = load_promo_rules().get(code)
    if not rule:
        raise ValueError("Invalid promo code")

    discount_cents = 0
    promo_type = rule.get("type")
    if promo_type == "percent":
        rate = float(rule.get("rate") or 0)
        discount_cents = int(round(subtotal_cents * rate))
    elif promo_type == "fixed_amount":
        discount_cents = int(rule.get("amount_cents") or 0)

    if discount_cents <= 0:
        raise ValueError("Promo code does not apply to this cart")

    discount_cents = min(discount_cents, max(0, subtotal_cents))
    if discount_cents <= 0:
        raise ValueError("Promo code does not apply to this cart")

    return {
        "uid": f"promo-{code.lower()}",
        "name": f"Promo ({code})",
        "type": "FIXED_AMOUNT",
        "amount_money": money(discount_cents, currency),
        "scope": "ORDER",
    }


def square_create_payment_link(payload: dict) -> dict:
    url = f"{square_base_url()}/v2/online-checkout/payment-links"
    r = requests.post(url, headers=square_headers(), json=payload, timeout=20)
    data = r.json() if r.content else {}
    if r.status_code >= 400:
        raise RuntimeError(f"Square error {r.status_code}: {data}")
    return data


# --------------------------
# Routes
# --------------------------
@app.route("/api/health", methods=["GET"])
def health():
    # No secrets, just readiness flags
    ok = True
    issues = []

    try:
        env = square_env()
    except Exception as e:
        ok = False
        issues.append(str(e))
        env = None

    have = {
        "SQUARE_APP_ID": bool(os.getenv("SQUARE_APP_ID")),
        "SQUARE_LOCATION_ID": bool(os.getenv("SQUARE_LOCATION_ID")),
        "SQUARE_ACCESS_TOKEN": bool(os.getenv("SQUARE_ACCESS_TOKEN")),
    }
    if not all(have.values()):
        ok = False
        issues.append("Square creds incomplete")

    return jsonify(
        {
            "ok": ok,
            "time": datetime.utcnow().isoformat() + "Z",
            "square_env": env,
            "have": have,
            "allowed_origins": sorted(list(ALLOWED_ORIGINS)),
        }
    )


@app.route("/api/square/bootstrap", methods=["GET", "HEAD", "OPTIONS"])
def square_bootstrap():
    if request.method == "OPTIONS":
        return ("", 204)
    try:
        require_square_creds()
        return jsonify(
            {
                "env": os.getenv("SQUARE_ENV").lower(),
                "appId": os.getenv("SQUARE_APP_ID"),
                "locationId": os.getenv("SQUARE_LOCATION_ID"),
                "currency": os.getenv("SQUARE_CURRENCY", os.getenv("CHECKOUT_CURRENCY", "USD")),
                "flatShippingCents": int(os.getenv("SQUARE_FLAT_SHIPPING_CENTS", "0") or "0"),
                "promoCodes": public_promo_rules(),
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/square/checkout", methods=["POST", "OPTIONS"])
def square_checkout():
    if request.method == "OPTIONS":
        return ("", 204)

    # Avoid get_json(silent=False) so we never raise; return clear JSON 400 if body missing/invalid
    payload = request.get_json(force=True, silent=True)
    if payload is None:
        return jsonify({
            "ok": False,
            "error": "Missing or invalid JSON body",
            "detail": "Send Content-Type: application/json and a valid JSON body with cart and optional currency.",
        }), 400
    if not isinstance(payload, dict):
        payload = {}

    # This endpoint is the "bridge" from your store UI to Square checkout.
    try:
        require_square_creds()

        cart = payload.get("cart", [])
        if not isinstance(cart, list) or len(cart) == 0:
            return jsonify({"ok": False, "error": "cart must be a non-empty list"}), 400

        currency = (payload.get("currency") or os.getenv("CHECKOUT_CURRENCY") or "USD").upper()
        env = (os.getenv("SQUARE_ENV") or "production").lower()
        location_id = os.getenv("SQUARE_LOCATION_ID_SANDBOX") if env == "sandbox" else os.getenv("SQUARE_LOCATION_ID")
        if not location_id:
            return jsonify({"ok": False, "error": "Missing Square locationId for current env"}), 500

        line_items = build_line_items_from_cart(cart, currency)
        subtotal_cents = sum(
            int((li.get("base_price_money") or {}).get("amount") or 0) * int(li.get("quantity") or "1")
            for li in line_items
        )
        promo_code = payload.get("promo_code") or payload.get("promoCode")
        order_discount = build_order_discount_for_promo(promo_code, subtotal_cents, currency)

        flat_ship = int(os.getenv("SQUARE_FLAT_SHIPPING_CENTS") or "0")
        if flat_ship > 0:
            line_items.append({
                "name": "Shipping",
                "quantity": "1",
                "base_price_money": money(flat_ship, currency),
            })

        idempotency_key = str(uuid.uuid4())

        pl_payload = {
            "idempotency_key": idempotency_key,
            "order": {
                "location_id": location_id,
                "line_items": line_items,
            },
            "checkout_options": {
                "ask_for_shipping_address": True,
            },
        }
        if order_discount:
            pl_payload["order"]["discounts"] = [order_discount]

        result = square_create_payment_link(pl_payload)

        link = (result.get("payment_link") or {})
        checkout_url = link.get("url")

        if not checkout_url:
            return jsonify({"ok": False, "error": "Square did not return a checkout URL", "raw": result}), 502

        return jsonify({
            "ok": True,
            "checkoutUrl": checkout_url,
            "idempotencyKey": idempotency_key,
        }), 200

    except ValueError as ve:
        return jsonify({"ok": False, "error": str(ve)}), 400
    except BadRequest as e:
        return jsonify({"ok": False, "error": "Invalid or missing JSON body", "detail": str(e)}), 400
    except Exception as e:
        return jsonify({"ok": False, "error": f"{type(e).__name__}: {str(e)}"}), 500


def _square_retrieve_order(order_id: str) -> dict | None:
    """Fetch a single order from Square Orders API. Returns order dict or None on error."""
    if not order_id or not order_id.strip():
        return None
    url = f"{square_base_url()}/v2/orders/{order_id.strip()}"
    try:
        r = requests.get(url, headers=square_headers(), timeout=15)
        data = r.json() if r.content else {}
        if r.status_code != 200:
            return None
        return (data.get("order") or {}) if isinstance(data.get("order"), dict) else None
    except Exception:
        return None


def _verify_square_signature(body: bytes, provided: str | None) -> bool:
    """Verify Square webhook using HMAC-SHA256(notification_url + body), base64. Header: x-square-hmacsha256-signature."""
    key = os.getenv("SQUARE_WEBHOOK_SIGNATURE_KEY", "").strip()
    if not key or not provided:
        return False
    notification_url = (
        os.getenv("SQUARE_WEBHOOK_NOTIFICATION_URL", "").strip()
        or "https://api.aerovista.us/api/webhooks/square"
    )
    message = notification_url.encode("utf-8") + body
    digest = hmac.new(key.encode("utf-8"), message, hashlib.sha256).digest()
    expected = base64.b64encode(digest).decode("ascii")
    return hmac.compare_digest(expected, provided.strip())


def _extract_square_payment(payload: dict) -> dict | None:
    """Return the payment object from a Square payment webhook payload."""
    data = payload.get("data") or {}
    obj = data.get("object") or {}
    if not isinstance(obj, dict):
        return None

    payment = obj.get("payment")
    if isinstance(payment, dict):
        return payment

    if obj.get("type") == "payment":
        return obj

    if "status" in obj or "order_id" in obj:
        return obj

    return None


def _extract_sku_from_note(note: str | None) -> str | None:
    raw = str(note or "").strip()
    if not raw:
        return None
    if not raw.lower().startswith("sku:"):
        return None
    raw = raw[4:].strip()
    return raw or None


def _resolve_square_variation_id_from_line_item(li: dict, sku_map: dict | None = None) -> str | None:
    """Recover Square variation id from webhook/order line items."""
    direct = li.get("variation_id") or li.get("catalog_object_id")
    if direct is not None and str(direct).strip():
        return str(direct).strip()

    candidates: list[dict] = []
    sku = _extract_sku_from_note(li.get("note"))
    if sku:
        meta = (sku_map or load_sku_map()).get(sku)
        if isinstance(meta, dict):
            nested = meta.get("variationsById")
            if isinstance(nested, dict):
                for vid, variant_meta in nested.items():
                    if isinstance(variant_meta, dict):
                        row = dict(variant_meta)
                        row.setdefault("variationId", vid)
                        candidates.append(row)
            if not candidates and meta.get("variationId"):
                candidates.append(meta)

    seen: set[str] = set()
    normalized: list[dict] = []
    for candidate in candidates:
        vid = str(candidate.get("variationId") or "").strip()
        if not vid or vid in seen:
            continue
        seen.add(vid)
        normalized.append(candidate)

    if not normalized:
        return None
    if len(normalized) == 1:
        return str(normalized[0].get("variationId")).strip()

    target_name = str(li.get("name") or "").strip()
    price_money = (li.get("base_price_money") or li.get("gross_sales_money") or {})
    target_amount = price_money.get("amount")

    exact_name = [
        c for c in normalized
        if str(c.get("name") or "").strip() == target_name
    ]
    if len(exact_name) == 1:
        return str(exact_name[0].get("variationId")).strip()

    exact_name_and_price = [
        c for c in exact_name
        if target_amount is not None and c.get("cents") == target_amount
    ]
    if len(exact_name_and_price) == 1:
        return str(exact_name_and_price[0].get("variationId")).strip()

    exact_price = [
        c for c in normalized
        if target_amount is not None and c.get("cents") == target_amount
    ]
    if len(exact_price) == 1:
        return str(exact_price[0].get("variationId")).strip()

    return None


def _upsert_order_from_square_payload(db: Session, payload: dict) -> Order:
    """
    Normalize a Square order webhook payload into Order + OrderItem rows.
    This assumes the payload contains `data.object.order` (Orders API shape).
    """
    data = payload.get("data") or {}
    obj = data.get("object") or {}
    order = obj.get("order") or {}
    if not isinstance(order, dict):
        raise ValueError("Webhook payload missing order")

    order_id = order.get("id") or order.get("order_id")
    if not order_id:
        raise ValueError("Webhook order missing id")

    source_provider = "square"

    stmt = select(Order).where(
        Order.source_provider == source_provider,
        Order.source_order_id == str(order_id),
    )
    existing = db.execute(stmt).scalar_one_or_none()

    if existing is None:
        o = Order(
            store_id=order.get("location_id"),
            source_provider=source_provider,
            source_order_id=str(order_id),
            currency=(order.get("total_money") or {}).get("currency", "USD"),
            order_total=(order.get("total_money") or {}).get("amount"),
            raw_order_json=order,
        )
        db.add(o)
        db.flush()
    else:
        o = existing
        o.raw_order_json = order
        money = order.get("total_money") or {}
        o.currency = money.get("currency", o.currency)
        o.order_total = money.get("amount", o.order_total)

    fulfillments = order.get("fulfillments") or []
    if isinstance(fulfillments, list) and fulfillments:
        f = fulfillments[0] or {}
        recip = (f.get("shipment_details") or {}).get("recipient") or {}
        addr = recip.get("address") or {}
        o.customer_name = recip.get("display_name") or ""
        o.customer_email = recip.get("email_address") or ""
        o.customer_phone = recip.get("phone_number") or ""
        o.ship_name = recip.get("display_name") or ""
        o.ship_addr1 = addr.get("address_line_1") or ""
        o.ship_addr2 = addr.get("address_line_2") or ""
        o.ship_city = addr.get("locality") or ""
        o.ship_state = addr.get("administrative_district_level_1") or ""
        o.ship_postal_code = addr.get("postal_code") or ""
        o.ship_country = addr.get("country") or ""

    db.query(OrderItem).filter(OrderItem.order_id == o.id).delete()

    sku_map = load_sku_map()
    line_items = order.get("line_items") or []
    for li in line_items:
        if not isinstance(li, dict):
            continue
        qty_raw = li.get("quantity", "0")
        try:
            qty_int = int(qty_raw)
        except Exception:
            qty_int = 0
        if qty_int <= 0:
            continue
        price_money = (li.get("base_price_money") or li.get("gross_sales_money") or {})
        unit_price = price_money.get("amount")
        catalog_id = li.get("catalog_object_id")
        for uid in li.get("catalog_object_ids") or []:
            catalog_id = uid
        square_variation_id = _resolve_square_variation_id_from_line_item(li, sku_map=sku_map)
        sku = _extract_sku_from_note(li.get("note"))

        item = OrderItem(
            order_id=o.id,
            line_item_uid=li.get("uid"),
            square_catalog_object_id=catalog_id,
            square_variation_id=square_variation_id,
            sku=sku,
            title=(li.get("name") or ""),
            variant_name=li.get("variation_name") or "",
            quantity=qty_int,
            unit_price=unit_price,
            raw_line_json=li,
        )
        db.add(item)

    return o


def _ensure_fulfillment_job(db: Session, order: Order) -> FulfillmentJob:
    job = db.execute(
        select(FulfillmentJob).where(
            FulfillmentJob.order_id == order.id,
            FulfillmentJob.provider == "printful",
        )
    ).scalar_one_or_none()
    if job is None:
        job = FulfillmentJob(order_id=order.id, provider="printful", job_status="pending")
        db.add(job)
    return job


@app.route("/api/webhooks/square", methods=["POST"])
def square_webhook():
    raw_body = request.get_data(cache=False) or b""
    provided_sig = (
        request.headers.get("x-square-hmacsha256-signature")
        or request.headers.get("x-square-hmacsha256", "")
    )

    verified = _verify_square_signature(raw_body, provided_sig)

    try:
        payload = json.loads(raw_body.decode("utf-8") or "{}")
    except Exception:
        payload = {}

    with get_session() as db:
        ev = WebhookEvent(
            source_provider="square",
            source_event_id=str(((payload.get("event_id") or payload.get("id")) or "")),
            signature_verified=bool(verified),
            event_type=str(payload.get("type") or ""),
            payload_json=payload or {},
        )
        db.add(ev)
        db.commit()

        if not verified:
            return jsonify({"ok": False, "error": "invalid signature"}), 400

        event_type = str(payload.get("type") or "").strip()
        try:
            if event_type == "payment.updated":
                payment = _extract_square_payment(payload)
                if not isinstance(payment, dict):
                    return jsonify({"ok": False, "error": "payment.updated missing object"}), 400
                status = (payment.get("status") or "").upper()
                if status not in ("COMPLETED", "APPROVED"):
                    return jsonify({"ok": True}), 200
                order_id = (payment.get("order_id") or "").strip()
                if not order_id:
                    return jsonify({"ok": False, "error": "payment.updated missing order_id"}), 400
                order_obj = _square_retrieve_order(order_id)
                if not order_obj:
                    return jsonify({"ok": False, "error": f"Square order {order_id} not found"}), 400
                order_payload = {"data": {"object": {"order": order_obj}}}
                order = _upsert_order_from_square_payload(db, order_payload)
                _ensure_fulfillment_job(db, order)
            else:
                order = _upsert_order_from_square_payload(db, payload)
                _ensure_fulfillment_job(db, order)
            db.commit()
        except Exception as e:
            db.rollback()
            return jsonify({"ok": False, "error": str(e)}), 400

    return jsonify({"ok": True}), 200


def _serialize_order(o: Order) -> dict:
    """Order + items for JSON response."""
    items = []
    for i in (o.items or []):
        items.append({
            "id": i.id,
            "sku": i.sku,
            "title": i.title,
            "variant_name": i.variant_name,
            "quantity": i.quantity,
            "unit_price": i.unit_price,
            "created_at": i.created_at.isoformat() if i.created_at else None,
        })
    return {
        "id": o.id,
        "store_id": o.store_id,
        "source_provider": o.source_provider,
        "source_order_id": o.source_order_id,
        "customer_name": o.customer_name,
        "customer_email": o.customer_email,
        "customer_phone": o.customer_phone,
        "ship_name": o.ship_name,
        "ship_addr1": o.ship_addr1,
        "ship_addr2": o.ship_addr2,
        "ship_city": o.ship_city,
        "ship_state": o.ship_state,
        "ship_postal_code": o.ship_postal_code,
        "ship_country": o.ship_country,
        "currency": o.currency,
        "order_total": o.order_total,
        "order_status": o.order_status,
        "fulfillment_status": o.fulfillment_status,
        "created_at": o.created_at.isoformat() if o.created_at else None,
        "updated_at": o.updated_at.isoformat() if o.updated_at else None,
        "items": items,
    }


def _serialize_webhook_event(ev: WebhookEvent) -> dict:
    out = {
        "id": ev.id,
        "source_provider": ev.source_provider,
        "source_event_id": ev.source_event_id,
        "signature_verified": ev.signature_verified,
        "event_type": ev.event_type,
        "created_at": ev.created_at.isoformat() if ev.created_at else None,
    }
    # For payment.updated, expose why order may not have been created
    if ev.event_type == "payment.updated" and isinstance(ev.payload_json, dict):
        payment = _extract_square_payment(ev.payload_json)
        if isinstance(payment, dict):
            out["payload_summary"] = {
                "payment_status": (payment.get("status") or "").upper() or None,
                "order_id": (payment.get("order_id") or "").strip() or None,
            }
    return out


def _serialize_fulfillment_job(j: FulfillmentJob) -> dict:
    return {
        "id": j.id,
        "order_id": j.order_id,
        "provider": j.provider,
        "job_status": j.job_status,
        "attempt_count": j.attempt_count,
        "last_attempt_at": j.last_attempt_at.isoformat() if j.last_attempt_at else None,
        "next_attempt_at": j.next_attempt_at.isoformat() if j.next_attempt_at else None,
        "error_text": j.error_text,
        "created_at": j.created_at.isoformat() if j.created_at else None,
        "updated_at": j.updated_at.isoformat() if j.updated_at else None,
    }


@app.route("/api/ops/db", methods=["GET"])
def api_ops_db():
    """Read-only JSON: last N orders, webhook_events, fulfillment_jobs for Console DB view."""
    limit = request.args.get("limit", "50", type=str).strip()
    try:
        n = min(int(limit), 100) if limit else 50
    except ValueError:
        n = 50
    n = max(1, n)

    try:
        with get_session() as db:
            orders = (
                db.execute(
                    select(Order)
                    .options(selectinload(Order.items))
                    .order_by(Order.created_at.desc())
                    .limit(n)
                )
                .scalars().all()
            )
            webhook_events = (
                db.execute(
                    select(WebhookEvent).order_by(WebhookEvent.created_at.desc()).limit(n)
                )
                .scalars().all()
            )
            fulfillment_jobs = (
                db.execute(
                    select(FulfillmentJob).order_by(FulfillmentJob.created_at.desc()).limit(n)
                )
                .scalars().all()
            )
            # Serialize while session is open so relationships (e.g. order.items) are available
            payload = {
                "orders": [_serialize_order(o) for o in orders],
                "webhook_events": [_serialize_webhook_event(ev) for ev in webhook_events],
                "fulfillment_jobs": [_serialize_fulfillment_job(j) for j in fulfillment_jobs],
            }
        return jsonify(payload)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/ops/printful", methods=["GET"])
def ops_printful():
    # Optional admin dashboard page (you can protect later)
    return render_template("printful_ops_dashboard.html")


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8088"))
    app.run(host="0.0.0.0", port=port)
