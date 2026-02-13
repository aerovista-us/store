import os, uuid, requests
from flask import Flask, request, jsonify
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

def square_env_from_request(payload=None):
    # Fail-closed: require an explicit, valid configured env to avoid accidentally
    # hitting production because of a missing/misspelled variable.
    configured = (os.getenv("SQUARE_ENV", "") or "").strip().lower()
    allow_override = (os.getenv("SQUARE_ALLOW_ENV_OVERRIDE", "0").strip() == "1")

    if not configured:
        raise ValueError("SQUARE_ENV is missing; set SQUARE_ENV=sandbox or SQUARE_ENV=production")
    if configured not in ("production", "sandbox"):
        raise ValueError(f"Invalid SQUARE_ENV={configured!r}; expected 'sandbox' or 'production'")

    requested = ""
    if allow_override:
        requested = (request.args.get("env", "") or request.args.get("mode", "")).strip().lower()
        if isinstance(payload, dict):
            requested = (str(payload.get("env") or payload.get("mode") or requested)).strip().lower()

    env = requested or configured
    if env not in ("production", "sandbox"):
        raise ValueError(f"Invalid Square env override={env!r}; expected 'sandbox' or 'production'")
    return env


def square_creds(env: str):
    if env == "sandbox":
        return {
            "env": "sandbox",
            "base": "https://connect.squareupsandbox.com",
            "access_token": os.getenv("SQUARE_ACCESS_TOKEN_SANDBOX", ""),
            "application_id": os.getenv("SQUARE_APP_ID_SANDBOX", ""),
            "location_id": os.getenv("SQUARE_LOCATION_ID_SANDBOX", ""),
        }

    return {
        "env": "production",
        "base": "https://connect.squareup.com",
        "access_token": os.getenv("SQUARE_ACCESS_TOKEN", ""),
        "application_id": os.getenv("SQUARE_APP_ID", ""),
        "location_id": os.getenv("SQUARE_LOCATION_ID", ""),
    }


def require_square_creds(env: str):
    c = square_creds(env)
    missing = [k for k in ("access_token", "application_id", "location_id") if not (c.get(k) or "").strip()]
    if missing:
        raise RuntimeError(f"Missing Square creds for env={env}: {', '.join(missing)}")
    return {k: (v.strip() if isinstance(v, str) else v) for k, v in c.items()}


def sq_headers(env: str):
    creds = require_square_creds(env)
    return {
        "Authorization": f"Bearer {creds['access_token']}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        # Pin a Square-Version. Update intentionally.
        "Square-Version": os.getenv("SQUARE_VERSION", "2025-01-16"),
    }


def money(amount_cents: int, currency: str):
    return {"amount": int(amount_cents), "currency": currency}

def allowed_origins():
    # Preferred: comma-separated ALLOWED_ORIGINS.
    raw = os.getenv("ALLOWED_ORIGINS", "").strip()
    if raw:
        return {o.strip() for o in raw.split(",") if o.strip()}
    # Backward compatibility with older single-origin variable.
    single = os.getenv("ALLOWED_ORIGIN", "").strip()
    return {single} if single else set()

# ---- CORS (allow ONLY your storefront origin) ----
@app.after_request
def add_cors(resp):
    allowed = allowed_origins()
    origin = request.headers.get("Origin", "")
    if origin and origin in allowed:
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Vary"] = "Origin"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
        resp.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return resp

@app.route("/api/square/checkout", methods=["OPTIONS"])
def preflight_checkout():
    return ("", 204)

@app.get("/api/health")
def health():
    # Keep this endpoint safe for public probes: no secrets, just runtime signals.
    return {
        "ok": True,
        "debug": bool(app.debug),
        "squareEnv": (os.getenv("SQUARE_ENV", "") or "").strip().lower(),
        "allowSquareEnvOverride": (os.getenv("SQUARE_ALLOW_ENV_OVERRIDE", "0").strip() == "1"),
    }

@app.route("/api/square/bootstrap", methods=["GET", "HEAD"])
def square_bootstrap():
    if request.method == "HEAD":
        return ("", 200)

    try:
        env = square_env_from_request()
    except ValueError as e:
        return jsonify({"ok": False, "error": "Invalid configuration", "details": str(e)}), 400
    try:
        creds = require_square_creds(env)
    except Exception as e:
        return jsonify({"ok": False, "error": "Square credentials not configured", "details": str(e)}), 500

    return {
        "env": env,
        "applicationId": creds["application_id"],
        "locationId": creds["location_id"],
        "currency": os.getenv("CHECKOUT_CURRENCY", "USD"),
        "flatShippingCents": int(os.getenv("SQUARE_FLAT_SHIPPING_CENTS", "0")),
    }

@app.post("/api/square/checkout")
def square_checkout():
    payload = request.get_json(force=True)

    try:
        env = square_env_from_request(payload)
    except ValueError as e:
        return jsonify({"ok": False, "error": "Invalid configuration", "details": str(e)}), 400
    try:
        creds = require_square_creds(env)
    except Exception as e:
        return jsonify({"ok": False, "error": "Square credentials not configured", "details": str(e)}), 500

    currency = payload.get("currency") or os.getenv("CHECKOUT_CURRENCY", "USD")
    location_id = creds["location_id"]
    flat_ship = int(os.getenv("SQUARE_FLAT_SHIPPING_CENTS", "0"))

    cart = payload.get("cart") or []
    buyer = payload.get("buyer") or {}
    shipping = payload.get("shipping") or {}
    addr = (shipping.get("address") or {})

    payment_token = payload.get("payment_token")
    if not payment_token:
        return jsonify({"ok": False, "error": "Missing payment_token"}), 400
    if not cart:
        return jsonify({"ok": False, "error": "Cart is empty"}), 400

    # Line items use Square variation IDs as catalog_object_id
    line_items = []
    for item in cart:
        var_id = item.get("variation_id")
        qty = item.get("qty", 1)
        if not var_id:
            return jsonify({"ok": False, "error": "Missing variation_id in cart"}), 400
        line_items.append({
            "catalog_object_id": var_id,
            "quantity": str(int(qty)),
        })

    # Flat shipping as service charge (simple and predictable)
    service_charges = []
    if flat_ship > 0:
        service_charges.append({
            "name": "Shipping",
            "amount_money": money(flat_ship, currency),
            "calculation_phase": "TOTAL_PHASE",
            "taxable": False,
        })

    # One shipment fulfillment for the whole order (single bundled shipment)
    fulfillments = [{
        "type": "SHIPMENT",
        "state": "PROPOSED",
        "shipment_details": {
            "recipient": {
                "display_name": buyer.get("name", ""),
                "email_address": buyer.get("email", ""),
                "phone_number": buyer.get("phone", ""),
                "address": addr
            },
            "shipping_note": shipping.get("shipping_note", "")
        }
    }]

    order_idempotency = str(uuid.uuid4())
    order_body = {
        "idempotency_key": order_idempotency,
        "order": {
            "location_id": location_id,
            "line_items": line_items,
            "fulfillments": fulfillments,
            "service_charges": service_charges,
            "reference_id": payload.get("reference_id") or f"av-{order_idempotency[:8]}",
            "note": payload.get("note", "")
        }
    }

    # 1) Create Order
    base = creds["base"]
    r = requests.post(f"{base}/v2/orders", headers=sq_headers(env), json=order_body, timeout=60)
    if r.status_code >= 300:
        return jsonify({"ok": False, "error": "CreateOrder failed", "details": r.text}), 502
    order = r.json().get("order", {})
    order_id = order.get("id")
    total_money = (order.get("total_money") or {})
    amount_cents = int(total_money.get("amount", 0))

    if not order_id or amount_cents <= 0:
        return jsonify({"ok": False, "error": "Invalid order total", "order": order}), 500

    # 2) Charge immediately
    pay_idempotency = str(uuid.uuid4())
    payment_body = {
        "idempotency_key": pay_idempotency,
        "source_id": payment_token,
        "amount_money": money(amount_cents, currency),
        "order_id": order_id,
        "location_id": location_id,
        "buyer_email_address": buyer.get("email", ""),
        "note": payload.get("note", "")
    }
    rp = requests.post(f"{base}/v2/payments", headers=sq_headers(env), json=payment_body, timeout=60)
    if rp.status_code >= 300:
        return jsonify({"ok": False, "error": "CreatePayment failed", "details": rp.text, "order_id": order_id}), 502

    payment = rp.json().get("payment", {})
    return jsonify({
        "ok": True,
        "order_id": order_id,
        "payment_id": payment.get("id"),
        "status": payment.get("status"),
        "amount_cents": amount_cents,
        "currency": currency
    })

if __name__ == "__main__":
    host = os.getenv("APP_HOST", "0.0.0.0")
    port = int(os.getenv("APP_PORT", "8088"))
    app.run(host=host, port=port)
