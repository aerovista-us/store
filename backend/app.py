import os
import json
import uuid
import requests
from flask import Flask, request, jsonify, make_response, render_template
from werkzeug.exceptions import BadRequest
from datetime import datetime

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

        meta = sku_map.get(sku)
        if not meta and variation_id:
            meta = variation_index.get(variation_id)
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
        }

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


@app.route("/ops/printful", methods=["GET"])
def ops_printful():
    # Optional admin dashboard page (you can protect later)
    return render_template("printful_ops_dashboard.html")


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8088"))
    app.run(host="0.0.0.0", port=port)