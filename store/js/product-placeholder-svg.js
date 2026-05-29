/**
 * Lane-aware product card placeholders when catalog image is missing.
 */
(function (global) {
  const LANES = {
    core: { rgb: [110, 231, 255], rgb2: [79, 209, 197], tag: "CORE" },
    shadow: { rgb: [148, 163, 184], rgb2: [71, 85, 105], tag: "SHADOW" },
    apex: { rgb: [167, 139, 250], rgb2: [59, 130, 246], tag: "APEX" },
    glitch: { rgb: [34, 211, 238], rgb2: [236, 72, 153], tag: "GLITCH" },
    architect: { rgb: [251, 191, 36], rgb2: [245, 158, 11], tag: "ARCHITECT" },
  };

  function rgba(rgb, a) {
    return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
  }

  function laneFromProduct(p) {
    const c = String(p.collection || "").toLowerCase();
    if (/shadow|apex pattern/.test(c)) return "shadow";
    if (/glitch/.test(c)) return "glitch";
    if (/draft|architect|division/.test(c)) return "architect";
    if (/^apex$|apex/.test(c) && !/pattern/.test(c)) return "apex";
    if (/core/.test(c)) return "core";
    const n = String(p.name || "").toLowerCase();
    if (/glitch/.test(n)) return "glitch";
    if (/shadow|ghost|crypt/.test(n)) return "shadow";
    if (/architect|draft/.test(n)) return "architect";
    if (/apex/.test(n)) return "apex";
    return "core";
  }

  function categoryKind(p) {
    const cat = String(p.category || "").toLowerCase();
    if (cat === "hats") return "hat";
    if (cat === "tees" || cat === "long sleeve") return "tee";
    if (cat === "stickers") return "sticker";
    if (cat === "crewnecks") return "crew";
    if (/short|pant/.test(cat)) return "bottom";
    return "hoodie";
  }

  function categoryLabel(p) {
    const k = categoryKind(p);
    if (k === "hat") return "HAT";
    if (k === "tee") return "TEE";
    if (k === "sticker") return "STK";
    if (k === "crew") return "CREW";
    if (k === "bottom") return "BOTTOM";
    return "HOODIE";
  }

  function silhouette(kind, stroke, fill) {
    if (kind === "hat") {
      return `<path d="M310 118 C310 92 338 78 368 88 L398 98 L398 128 C398 148 378 158 352 158 L278 158 C252 158 232 148 232 128 L232 98 L262 88 C292 78 310 92 310 118 Z" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
        <path d="M248 158 L248 198 C248 212 260 222 276 222 L354 222 C370 222 382 212 382 198 L382 158" fill="none" stroke="${stroke}" stroke-width="1.6" opacity="0.7"/>`;
    }
    if (kind === "tee") {
      return `<path d="M268 108 L298 88 L338 108 L378 98 L418 128 L388 148 L388 248 C388 268 372 282 352 282 L298 282 C278 282 262 268 262 248 L262 148 L232 128 Z" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
    }
    if (kind === "sticker") {
      return `<rect x="280" y="168" width="200" height="140" rx="18" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
        <circle cx="380" cy="238" r="42" fill="none" stroke="${stroke}" stroke-width="1.5" opacity="0.55"/>`;
    }
    return `<path d="M268 118 L298 98 L338 118 L378 108 L418 138 L388 158 L388 268 C388 288 372 302 352 302 L298 302 C278 302 262 288 262 268 L262 158 L232 138 Z" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
      <path d="M318 118 C332 102 352 98 368 108 L368 138 C352 128 332 132 318 148 Z" fill="rgba(0,0,0,0.2)" stroke="none"/>`;
  }

  function chevronMark(rgb, rgb2) {
    return `<g transform="translate(450 248) scale(0.42)" opacity="0.92">
      <ellipse cx="0" cy="58" rx="48" ry="9" fill="${rgba(rgb, 0.12)}"/>
      <path d="M -42 50 L -6 -38 L 0 -32 L 6 -38 L 42 50 Z" fill="rgba(12,16,24,0.5)" stroke="${rgba(rgb, 0.55)}" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M -10 -38 L 0 -48 L 10 -38 Z" fill="${rgba(rgb2, 0.35)}" stroke="${rgba(rgb, 0.65)}" stroke-width="0.9"/>
    </g>`;
  }

  function productPlaceholderSvg(p, escapeHtmlFn) {
    const esc = escapeHtmlFn || ((s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])));
    const lane = laneFromProduct(p);
    const pal = LANES[lane] || LANES.core;
    const kind = categoryKind(p);
    const catLabel = categoryLabel(p);
    const title = esc((p && (p.name || p.title)) ? String(p.name || p.title) : "Product");
    const uid = "ph_" + Math.random().toString(36).slice(2, 9);

    return `<svg class="productPlaceholderSvg productPlaceholderSvg--${lane}" viewBox="0 0 900 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true" role="img">
      <title>${title}</title>
      <defs>
        <linearGradient id="${uid}_bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#06080c"/>
          <stop offset="55%" stop-color="#0c1018"/>
          <stop offset="100%" stop-color="#040608"/>
        </linearGradient>
        <radialGradient id="${uid}_glow" cx="32%" cy="28%" r="68%">
          <stop offset="0%" stop-color="${rgba(pal.rgb, 0.22)}"/>
          <stop offset="100%" stop-color="transparent"/>
        </radialGradient>
        <linearGradient id="${uid}_sheen" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="transparent"/>
          <stop offset="48%" stop-color="${rgba(pal.rgb2, 0.14)}"/>
          <stop offset="100%" stop-color="transparent"/>
        </linearGradient>
      </defs>
      <rect width="900" height="520" fill="url(#${uid}_bg)"/>
      <rect width="900" height="520" fill="url(#${uid}_glow)"/>
      <rect width="900" height="520" fill="url(#${uid}_sheen)" opacity="0.9"/>
      <g opacity="0.35" stroke="${rgba(pal.rgb, 0.2)}" fill="none" stroke-width="0.6">
        <line x1="0" y1="420" x2="900" y2="420"/>
        <line x1="120" y1="0" x2="120" y2="520" opacity="0.4"/>
        <line x1="780" y1="0" x2="780" y2="520" opacity="0.4"/>
      </g>
      <g opacity="0.5" stroke="${rgba(pal.rgb, 0.45)}" fill="none" stroke-width="0.8">
        <path d="M 28 32 L 28 52 M 28 32 L 48 32"/>
        <path d="M 872 32 L 872 52 M 852 32 L 872 32"/>
        <path d="M 28 488 L 28 468 M 28 488 L 48 488"/>
        <path d="M 872 488 L 872 468 M 852 488 L 872 488"/>
      </g>
      <g transform="translate(0,12)">
        ${silhouette(kind, rgba(pal.rgb, 0.42), "rgba(255,255,255,0.04)")}
      </g>
      ${chevronMark(pal.rgb, pal.rgb2)}
      <text x="450" y="468" text-anchor="middle" font-family="ui-monospace,Consolas,monospace" font-size="11" fill="${rgba(pal.rgb, 0.55)}" letter-spacing="0.28em">${pal.tag} · ${catLabel}</text>
      <text x="450" y="492" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" fill="rgba(231,237,246,0.42)">Image coming online</text>
    </svg>`;
  }

  global.productPlaceholderSvg = productPlaceholderSvg;
})(typeof window !== "undefined" ? window : globalThis);
