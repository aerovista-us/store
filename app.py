import os
import uuid
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

# ----------------------------
# Helpers
# ----------------------------

def env_required(key: str) -> str:
    v = os.getenv(key)
    if not v:
        raise RuntimeError(f"Missing required env var: {key}")
    return v

def allowed_origins_set():
    raw = os.getenv("ALLOWED_ORIGINS", "").strip()
    if not raw:
        return set()
    return {o.strip() for o in raw.split(",") if o.strip()}

@app.after_request
def add_cors(resp):
    allowed = allowed_origins_set()
    req_origin = request.headers.get("Origin", "")
    # If ALLOWED_ORIGINS is empty, allow nothing (safe default).
    if req_origin and req_origin in allowed:
        resp.headers["Access-Control-Allow-Origin"] = req_origin
        resp.headers["Vary"] = "Origin"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
        resp.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return resp

@app.route("/api/<path:_p>", methods=["OPTIONS"])
def preflight(_p):
    return ("", 204)

def sq_base():
    # For production, this is correct. (Sandbox uses same host but sandbox token.)
    return "https://connect.squareup.com"

def sq_headers():
    return {
        "Authorization": f"Bearer {env_required('SQUARE_ACCESS_TOKEN')}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        # Pin a Square-Version and keep it consistent.
        # You can update later after testing.
        "Square-Version": os.getenv("SQUARE_VERSION", "2025-01-16"),
    }

def money(amount_cents: int, currency: str):
    return {"amount": int(amount_cents), "currency": currency}

def sq_post(path: str, body: dict, timeout: int = 60):
    url = f"{sq_base()}{path}"
    r = requests.post(url, headers=sq_headers(), json=body, timeout=timeout)
    return r

# ----------------------------
# Routes
# ----------------------------

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/api/square/bootstrap")
def square_bootstrap():
    """
    Safe config for the browser. Never return PAT.
    """
    return {
        "env": os.getenv("SQUARE_ENV", "production"),
        "applicationId": env_required("SQUARE_APP_ID"),
        "locationId": env_required("SQUARE_LOCATION_ID"),
        "currency": os.getenv("CHECKOUT_CURRENCY", "USD"),
        "flatShippingCents": int(os.getenv("SQUARE_FLAT_SHIPPING_CENTS", "0")),
    }

@app.post("/api/square/checkout")
def square_checkout():
    """
    Expects JSON like:
    {
      "buyer": {"name":"", "email":"", "phone":""},
      "shipping": {"address": {...}, "shipping_note": ""},
      "cart": [{"variation_id":"<SQUARE_VARIATION_ID>", "qty":1}, ...],
      "payment_token": "<token from Square Web Payments SDK>",
      "note": "optional"
    }
    """
    data = request.get_json(force=True) or {}

    currency = os.getenv("CHECKOUT_CURRENCY", "USD")
    location_id = env_required("SQUARE_LOCATION_ID")
    flat_ship = int(os.getenv("SQUARE_FLAT_SHIPPING_CENTS", "0"))

    buyer = data.get("buyer") or {}
    shipping = data.get("shipping") or {}
    addr = (shipping.get("address") or {})
    cart = data.get("cart") or []
    payment_token = data.get("payment_token")

    if not payment_token:
        return jsonify({"ok": False, "error": "Missing payment_token"}), 400
    if not cart:
        return jsonify({"ok": False, "error": "Cart is empty"}), 400

    # Build line items (Square variation IDs)
    line_items = []
    for item in cart:
        var_id = item.get("variation_id")
        qty = item.get("qty", 1)
        if not var_id:
            return jsonify({"ok": False, "error": "Missing variation_id in cart"}), 400
        try:
            qty_i = int(qty)
            if qty_i <= 0:
                raise ValueError()
        except Exception:
            return jsonify({"ok": False, "error": f"Invalid qty for {var_id}"}), 400

        line_items.append({
            "catalog_object_id": var_id,
            "quantity": str(qty_i),
        })

    # Shipping: simplest v1 is a service charge (flat)
    service_charges = []
    if flat_ship > 0:
        service_charges.append({
            "name": "Shipping",
            "amount_money": money(flat_ship, currency),
            "calculation_phase": "TOTAL_PHASE",
            "taxable": False,
        })

    # One bundled shipment fulfillment
    fulfillments = [{
        "type": "SHIPMENT",
        "state": "PROPOSED",
        "shipment_details": {
            "recipient": {
                "display_name": buyer.get("name", ""),
                "email_address": buyer.get("email", ""),
                "phone_number": buyer.get("phone", ""),
                "address": addr,
            },
            "shipping_note": shipping.get("shipping_note", ""),
        },
    }]

    # 1) Create Order
    order_key = str(uuid.uuid4())
    order_body = {
        "idempotency_key": order_key,
        "order": {
            "location_id": location_id,
            "line_items": line_items,
            "fulfillments": fulfillments,
            "service_charges": service_charges,
            "reference_id": (data.get("reference_id") or f"av-{order_key[:8]}"),
            "note": (data.get("note") or ""),
        }
    }

    r_order = sq_post("/v2/orders", order_body)
    if r_order.status_code >= 300:
        return jsonify({"ok": False, "error": "CreateOrder failed", "details": r_order.text}), 502

    order = (r_order.json() or {}).get("order") or {}
    order_id = order.get("id")
    total_money = order.get("total_money") or {}
    amount_cents = int(total_money.get("amount") or 0)

    if not order_id or amount_cents <= 0:
        return jsonify({"ok": False, "error": "Invalid order total", "order": order}), 500

    # 2) Charge immediately
    pay_key = str(uuid.uuid4())
    payment_body = {
        "idempotency_key": pay_key,
        "source_id": payment_token,
        "amount_money": money(amount_cents, currency),
        "order_id": order_id,
        "location_id": location_id,
        "buyer_email_address": buyer.get("email", ""),
        "note": (data.get("note") or ""),
    }

    r_pay = sq_post("/v2/payments", payment_body)
    if r_pay.status_code >= 300:
        # Optional: cancel order here if you want strict cleanup
        return jsonify({
            "ok": False,
            "error": "CreatePayment failed",
            "details": r_pay.text,
            "order_id": order_id
        }), 502

    payment = (r_pay.json() or {}).get("payment") or {}
    return jsonify({
        "ok": True,
        "order_id": order_id,
        "payment_id": payment.get("id"),
        "status": payment.get("status"),
        "amount_cents": amount_cents,
        "currency": currency,
    })

if __name__ == "__main__":
    host = os.getenv("APP_HOST", "0.0.0.0")
    port = int(os.getenv("APP_PORT", "8088"))
    app.run(host=host, port=port, debug=(os.getenv("FLASK_DEBUG", "0") == "1"))
