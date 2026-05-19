/**
 * Shared storefront policies (FAQ, shipping, returns, contact).
 * Include before the main inline script: <script src="./policy-content.js"></script>
 */
(function () {
  const email = "orders@aerovista.us";
  const wrap = (body) => `<div class="policyBody">${body}</div>`;

  window.AV_STORE_POLICY_PACK = {
    emailFallback: email,
    supportEmail: email,
    policies: {
      faq: wrap(`
          <h4>Sizing &amp; fit</h4>
          <p>Most apparel runs <strong>true to size</strong> on premium print-on-demand blanks. Hoodies and crewnecks are comfort-forward; size up if you want a looser drape. Hats are structured or adjustable per style (see product notes).</p>
          <ul>
            <li>Between sizes → size up for relaxed fit, stay true for a cleaner line.</li>
            <li>Check size and color on the product page before checkout — every piece is made to order.</li>
            <li>Print placement is designed per garment; slight position variance (within about ¼″) is normal for fulfillment.</li>
          </ul>
          <h4>Made to order</h4>
          <p>We do not hold finished inventory. Your order is produced after purchase (see <strong>Shipping</strong> for timelines).</p>
          <h4>Care</h4>
          <p>Wash cold, inside-out. Low heat or hang dry to protect print and embroidery. Spot-clean hats; avoid machine washing structured caps.</p>`),
      shipping: wrap(`
          <h4>How it works</h4>
          <p>Every order is <strong>printed or embroidered on demand</strong> through our fulfillment partner, then handed to the carrier. You will receive a tracking email when the package ships.</p>
          <h4>United States</h4>
          <ul>
            <li><strong>Production:</strong> typically 2–5 business days after checkout</li>
            <li><strong>Transit:</strong> typically 3–7 business days after production (carrier-dependent)</li>
            <li><strong>Total estimate:</strong> about 5–12 business days door-to-door in most US locations</li>
          </ul>
          <p>Alaska, Hawaii, and remote areas may take longer. Peak seasons and weather can add delay after the handoff to the carrier.</p>
          <h4>International</h4>
          <p>Where available, international delivery is often <strong>10–20 business days</strong> after production. Duties, taxes, and customs fees (if any) are the buyer’s responsibility.</p>
          <h4>Address issues</h4>
          <p>Confirm your shipping address at checkout. We cannot change an address once production has started. Undeliverable packages returned by the carrier may require a reship fee.</p>`),
      returns: wrap(`
          <h4>Made-to-order items</h4>
          <p>Because each piece is produced for you, <strong>all sales are final</strong> except for the cases below. Please review size, color, and design before ordering.</p>
          <h4>Defects &amp; fulfillment errors</h4>
          <p>Contact us within <strong>7 days of delivery</strong> with your order number and photos if you receive:</p>
          <ul>
            <li>A misprint, stain, or material flaw from production</li>
            <li>The wrong item, size, or color versus what you ordered</li>
            <li>A package that arrived damaged in transit (photo of box and garment)</li>
          </ul>
          <p>After review, we will offer a <strong>replacement or refund</strong> at no extra cost for verified production or fulfillment errors.</p>
          <h4>Size exchanges</h4>
          <p>Size exchanges may be available within <strong>14 days of delivery</strong> if the item is unworn, unwashed, and in original condition. You are responsible for return shipping unless we made an error. Contact <a href="mailto:orders@aerovista.us">orders@aerovista.us</a> before sending anything back.</p>
          <h4>Non-returnable</h4>
          <p>We cannot accept returns for buyer’s remorse, incorrect size selection, or normal color variation between screens and fabric.</p>`),
      contact: wrap(`
          <p>Questions about sizing, an order, or a production issue? We are here to help.</p>
          <p><strong>Email:</strong> <a href="mailto:orders@aerovista.us">orders@aerovista.us</a></p>
          <p>Include your <strong>order number</strong> and any photos for defect claims. We aim to reply within <strong>1–2 business days</strong> (Mon–Fri, US time).</p>
          <p>For fastest help, use subject line: <em>Order #[number] — [short issue]</em>.</p>`)
    }
  };
})();
