/**
 * Panoramic collection page headers (`#cvArtSvg`) — v2 unified design system.
 * Lanes: core, shadow, apex, glitch, architect.
 */
(function (global) {
  const HDR_BUILD = "v2-unified-pro-audit";
  if (typeof console !== "undefined" && console.info) {
    console.info("[collection-header-svg] build:", HDR_BUILD);
  }

  const W = 1600;
  const H = 380;
  const CX = 800;
  const CY = 198;

  function uid() {
    return "hdr_" + Math.random().toString(36).slice(2, 10);
  }

  function rgba(rgb, a) {
    return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
  }

  /** Shared chevron geometry (banner scale) */
  const MARK = {
    L: "M -82 98 L -22 -128 L -2 -120 L -2 98 Z",
    R: "M 82 98 L 22 -128 L 2 -120 L 2 98 Z",
    peak: "M -14 -128 L 0 -118 L 14 -128 Z",
    inner: "M -28 18 L 0 -18 L 28 18 Z",
    orbit: "M 92 -38 C 52 -72 -14 -60 -46 -18 C -64 14 -56 56 -36 70",
    split: "M -6 98 L 6 98 L 5 -118 L -5 -118 Z",
  };

  const META = {
    core: {
      kicker: "FOUNDATION ISSUE",
      footer: "OPERATOR READY · CORE LINE",
      sky: ["#050810", "#081018", "#060a12"],
      accent: [110, 231, 255],
      accent2: [79, 209, 197],
    },
    shadow: {
      kicker: "STEALTH LANE",
      footer: "LOW SIGNAL · PATTERN FORWARD",
      sky: ["#050608", "#0c1016", "#060809"],
      accent: [148, 163, 184],
      accent2: [110, 231, 255],
    },
    apex: {
      kicker: "APEX SUMMIT",
      footer: "PRISM FOIL · ICON SYSTEM",
      sky: ["#07060e", "#110d1a", "#05060c"],
      accent: [167, 139, 250],
      accent2: [110, 231, 255],
      accent3: [236, 72, 153],
    },
    glitch: {
      kicker: "SIGNAL INTERFERENCE",
      footer: "SCAN CARD · BROKEN TRANSMISSION",
      sky: ["#020408", "#0c1520", "#05070c"],
      accent: [34, 211, 238],
      accent2: [236, 72, 153],
    },
    architect: {
      kicker: "BUILD ARCHIVE",
      footer: "DRAFT SERIES · BUILT DIFFERENT",
      sky: ["#060504", "#0e0c08", "#080604"],
      accent: [251, 191, 36],
      accent2: [245, 158, 11],
    },
  };

  function defsCommon(p, m, extraDefs) {
    const d = (n) => `${p}_${n}`;
    const a = m.accent;
    const a2 = m.accent2 || a;
    return `
    <linearGradient id="${d("sky")}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${m.sky[0]}"/>
      <stop offset="48%" stop-color="${m.sky[1]}"/>
      <stop offset="100%" stop-color="${m.sky[2]}"/>
    </linearGradient>
    <radialGradient id="${d("halo")}" cx="50%" cy="42%" r="58%">
      <stop offset="0%" stop-color="${rgba(a, 0.14)}"/>
      <stop offset="45%" stop-color="${rgba(a2, 0.05)}"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
    <radialGradient id="${d("floor")}" cx="50%" cy="100%" r="58%">
      <stop offset="0%" stop-color="${rgba(a, 0.2)}"/>
      <stop offset="55%" stop-color="rgba(0,0,0,0.15)"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
    <radialGradient id="${d("rim")}" cx="50%" cy="50%" r="74%">
      <stop offset="58%" stop-color="transparent"/>
      <stop offset="88%" stop-color="rgba(0,0,0,0.45)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.92)"/>
    </radialGradient>
    <linearGradient id="${d("foil")}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${rgba(a, 0)}"/>
      <stop offset="22%" stop-color="${rgba(a, 0.16)}"/>
      <stop offset="50%" stop-color="${rgba(a2, 0.08)}"/>
      <stop offset="78%" stop-color="${rgba(a, 0.12)}"/>
      <stop offset="100%" stop-color="${rgba(a, 0)}"/>
    </linearGradient>
    <linearGradient id="${d("edgeTop")}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="transparent"/>
      <stop offset="20%" stop-color="${rgba(a, 0.45)}"/>
      <stop offset="50%" stop-color="${rgba(a2, 0.55)}"/>
      <stop offset="80%" stop-color="${rgba(a, 0.45)}"/>
      <stop offset="100%" stop-color="transparent"/>
    </linearGradient>
    <pattern id="${d("grain")}" width="4" height="4" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1.5" r="0.35" fill="rgba(255,255,255,0.035)"/>
    </pattern>
    <filter id="${d("soft")}" x="-8%" y="-8%" width="116%" height="116%">
      <feGaussianBlur stdDeviation="14" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="${d("markGlow")}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3" result="g"/>
      <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    ${extraDefs || ""}`;
  }

  function frameHud(p, m) {
    const a = m.accent;
    const dim = [148, 163, 184];
    const d = (n) => `${p}_${n}`;
    return `
    <line x1="0" y1="0" x2="${W}" y2="0" stroke="url(#${d("edgeTop")})" stroke-width="1.2" opacity="0.85"/>
    <g class="hdrFrame" opacity="0.7" stroke="${rgba(a, 0.42)}" fill="none" stroke-width="0.7" stroke-linecap="square">
      <path d="M 36 28 L 36 52 M 36 28 L 60 28"/>
      <path d="M ${W - 36} 28 L ${W - 36} 52 M ${W - 60} 28 L ${W - 36} 28"/>
      <path d="M 36 ${H - 28} L 36 ${H - 52} M 36 ${H - 28} L 60 ${H - 28}"/>
      <path d="M ${W - 36} ${H - 28} L ${W - 36} ${H - 52} M ${W - 60} ${H - 28} L ${W - 36} ${H - 28}"/>
    </g>
    <text x="52" y="48" fill="${rgba(a, 0.58)}" font-family="ui-monospace,Consolas,monospace" font-size="10" letter-spacing="0.22em">${m.kicker}</text>
    <text x="${W - 52}" y="${H - 24}" text-anchor="end" fill="${rgba(dim, 0.45)}" font-family="ui-monospace,Consolas,monospace" font-size="9" letter-spacing="0.16em">${m.footer}</text>`;
  }

  function markChevron(p, m, opts) {
    const d = (n) => `${p}_${n}`;
    const a = m.accent;
    const a2 = m.accent2 || a;
    const sc = opts.scale || 1.08;
    const split = opts.split !== false;
    const orbit = opts.orbit !== false;
    const y = opts.cy != null ? opts.cy : CY;
    let g = `<g transform="translate(${CX} ${y}) scale(${sc})" filter="url(#${d("markGlow")})">`;
    g += `<ellipse cx="0" cy="62" rx="58" ry="10" fill="rgba(0,0,0,0.5)" opacity="0.65"/>`;
    g += `<ellipse cx="0" cy="56" rx="64" ry="12" fill="url(#${d("foil")})" opacity="0.35"/>`;
    if (orbit) {
      g += `<path d="${MARK.orbit}" fill="none" stroke="${rgba(a, 0.55)}" stroke-width="2.8" stroke-linecap="round" opacity="0.35"/>`;
    }
    g += `<path d="${MARK.L}" fill="rgba(18,24,34,0.55)" stroke="${rgba(a, 0.5)}" stroke-width="1.1" stroke-linejoin="round"/>`;
    g += `<path d="${MARK.R}" fill="rgba(8,10,14,0.65)" stroke="${rgba(a2, 0.22)}" stroke-width="0.9" stroke-linejoin="round"/>`;
    if (split) {
      g += `<path d="${MARK.split}" fill="rgba(0,0,0,0.35)"/>`;
    }
    g += `<path d="${MARK.peak}" fill="${rgba(a, 0.12)}" stroke="${rgba(a, 0.72)}" stroke-width="1.1"/>`;
    if (opts.inner !== false) {
      g += `<path d="${MARK.inner}" fill="none" stroke="${rgba(a2, 0.35)}" stroke-width="0.8" opacity="0.7"/>`;
    }
    g += `<path d="M -38 108 L -6 132 L 6 132 L 38 108" fill="none" stroke="${rgba(a2, 0.4)}" stroke-width="1.6" stroke-linecap="round"/>`;
    g += `</g>`;
    return g;
  }

  function baseLayers(p, m, gridStroke) {
    const d = (n) => `${p}_${n}`;
    return `
  <rect width="${W}" height="${H}" fill="url(#${d("sky")})"/>
  <rect width="${W}" height="${H}" fill="url(#${d("grain")})" opacity="0.4"/>
  <ellipse cx="${CX}" cy="${CY - 18}" rx="640" ry="180" fill="url(#${d("halo")})" filter="url(#${d("soft")})"/>
  <ellipse cx="${CX}" cy="${H + 40}" rx="820" ry="200" fill="url(#${d("floor")})"/>
  ${gridStroke || ""}`;
  }

  function finish(p) {
    const d = (n) => `${p}_${n}`;
    return `<rect width="${W}" height="${H}" fill="url(#${d("rim")})" pointer-events="none"/>`;
  }

  function coreBanner() {
    const p = uid();
    const m = META.core;
    const d = (n) => `${p}_${n}`;
    const a = m.accent;
    const defs = defsCommon(p, m, `
    <pattern id="${d("grid")}" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${rgba(a, 0.08)}" stroke-width="0.5"/>
    </pattern>`);
    const grid = `<rect width="${W}" height="${H}" fill="url(#${d("grid")})" opacity="0.55"/>`;
    const scene = `
  ${baseLayers(p, m, grid)}
  <g fill="none" stroke="${rgba(a, 0.24)}" stroke-width="0.55" opacity="0.9">
    <circle cx="${CX}" cy="${CY}" r="132" stroke-dasharray="3 9 2 9"/>
    <circle cx="${CX}" cy="${CY}" r="188" opacity="0.55"/>
    <circle cx="${CX}" cy="${CY}" r="248" stroke-dasharray="16 24" opacity="0.35"/>
    <line x1="${CX}" y1="48" x2="${CX}" y2="${H - 48}"/>
    <line x1="120" y1="${CY}" x2="${W - 120}" y2="${CY}"/>
    <path d="M 380 118 L 1220 278" opacity="0.3" stroke-width="0.4"/>
    <path d="M 1220 118 L 380 278" opacity="0.3" stroke-width="0.4"/>
  </g>
  <g opacity="0.8">
    <circle cx="620" cy="${CY}" r="3.2" fill="${rgba(a, 0.9)}"/>
    <circle cx="980" cy="${CY}" r="2.4" fill="${rgba([148,163,184], 0.55)}"/>
    <circle cx="${CX}" cy="318" r="2" fill="${rgba(m.accent2, 0.7)}"/>
  </g>
  <path d="M 120 318 Q ${CX} 288 ${W - 120} 318" fill="none" stroke="${rgba(m.accent2, 0.35)}" stroke-width="1.2" opacity="0.6"/>
  ${markChevron(p, m, { scale: 1.1, cy: CY })}
  ${frameHud(p, m)}
  ${finish(p)}`;
    return `
<svg class="collectionHeaderBanner collectionHeaderBanner--core" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true" role="img">
  <defs>${defs}</defs>${scene}
</svg>`;
  }

  function shadowBanner() {
    const p = uid();
    const m = META.shadow;
    const d = (n) => `${p}_${n}`;
    const a = m.accent;
    const edge = m.accent2;
    const defs = defsCommon(p, m, "");
    const scene = `
  ${baseLayers(p, m, "")}
  <g fill="none" stroke="${rgba(a, 0.2)}" stroke-width="0.6" stroke-linecap="round" opacity="0.95">
    <path d="M -30 252 Q 200 202 480 232 T ${CX} 212 T 1180 246 T 1630 220"/>
    <path d="M 60 272 Q 300 218 560 258 T 980 230 T 1400 262 T 1580 238" opacity="0.55"/>
    <path d="M 100 178 Q 360 128 640 168 T 1120 142 T 1540 182" opacity="0.38"/>
    <path d="M 280 88 Q 420 140 520 96 T 720 120" opacity="0.28"/>
  </g>
  <g fill="none" stroke="${rgba(a, 0.32)}" stroke-width="0.5">
    <line x1="100" y1="218" x2="${W - 100}" y2="218"/>
    <circle cx="248" cy="218" r="2.4" fill="${rgba(edge, 0.5)}" stroke="none"/>
    <circle cx="520" cy="218" r="1.8" fill="${rgba(a, 0.45)}" stroke="none"/>
    <circle cx="${CX}" cy="218" r="2" fill="${rgba(a, 0.4)}" stroke="none"/>
    <circle cx="1080" cy="218" r="1.7" fill="${rgba(a, 0.42)}" stroke="none"/>
    <circle cx="1352" cy="218" r="2.2" fill="${rgba(edge, 0.32)}" stroke="none"/>
  </g>
  <g opacity="0.35" stroke="${rgba(edge, 0.2)}" fill="none">
    <path d="M 180 68 L 340 68"/><path d="M ${W - 340} 312 L ${W - 180} 312"/>
  </g>
  ${markChevron(p, m, { scale: 1.08, cy: CY + 6, split: true, orbit: false })}
  ${frameHud(p, m)}
  ${finish(p)}`;
    return `
<svg class="collectionHeaderBanner collectionHeaderBanner--shadow" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true" role="img">
  <defs>${defs}</defs>${scene}
</svg>`;
  }

  function apexBanner() {
    const p = uid();
    const m = META.apex;
    const d = (n) => `${p}_${n}`;
    const v = m.accent;
    const c = m.accent2;
    const r = m.accent3;
    const defs = defsCommon(p, m, `
    <linearGradient id="${d("prism")}" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${rgba(v, 0.38)}"/>
      <stop offset="45%" stop-color="${rgba(c, 0.22)}"/>
      <stop offset="100%" stop-color="${rgba(r, 0.14)}"/>
    </linearGradient>`);
    const scene = `
  ${baseLayers(p, m, "")}
  <g class="hdrApexStripes" opacity="0.2" style="mix-blend-mode:screen">
    <path d="M -80 ${H + 20} L 420 -60" stroke="url(#${d("prism")})" stroke-width="48" stroke-linecap="round"/>
    <path d="M 180 ${H + 20} L 680 -60" stroke="${rgba(v, 0.35)}" stroke-width="36" stroke-linecap="round"/>
    <path d="M 440 ${H + 20} L 940 -60" stroke="${rgba(c, 0.28)}" stroke-width="28" stroke-linecap="round"/>
  </g>
  <g fill="none" stroke="${rgba(v, 0.14)}" stroke-width="0.45" opacity="0.85">
    <line x1="0" y1="228" x2="${W}" y2="228"/>
    <line x1="0" y1="268" x2="${W}" y2="268" opacity="0.45"/>
    <line x1="600" y1="36" x2="600" y2="${H - 36}"/>
    <line x1="1000" y1="36" x2="1000" y2="${H - 36}" opacity="0.55"/>
    <path d="M 480 ${H - 20} L ${CX} 108 L 1120 ${H - 20}" stroke="${rgba(c, 0.22)}" stroke-width="0.6"/>
  </g>
  <g fill="none" stroke="${rgba(c, 0.22)}" stroke-width="0.55" transform="translate(${CX} ${CY + 6})">
    <circle r="112" stroke-dasharray="5 14 3 14"/>
    <circle r="162" stroke="${rgba(v, 0.25)}"/>
    <circle r="228" stroke-dasharray="20 28" opacity="0.4"/>
    <line x1="-300" y1="0" x2="300" y2="0" opacity="0.35"/>
  </g>
  ${markChevron(p, m, { scale: 1.14, cy: CY + 12, split: true, orbit: true })}
  <circle cx="580" cy="${CY}" r="3" fill="${rgba(c, 0.7)}" stroke="none"/>
  <circle cx="1020" cy="${CY}" r="2.4" fill="${rgba(v, 0.6)}" stroke="none"/>
  ${frameHud(p, m)}
  ${finish(p)}`;
    return `
<svg class="collectionHeaderBanner collectionHeaderBanner--apex" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true" role="img">
  <defs>${defs}</defs>${scene}
</svg>`;
  }

  function glitchBanner() {
    const p = uid();
    const m = META.glitch;
    const d = (n) => `${p}_${n}`;
    const cyan = m.accent;
    const mag = m.accent2;
    const defs = defsCommon(p, m, `
    <pattern id="${d("scan")}" width="6" height="6" patternUnits="userSpaceOnUse">
      <rect width="6" height="1.2" fill="rgba(255,255,255,0.03)"/>
    </pattern>
    <pattern id="${d("grid")}" width="56" height="56" patternUnits="userSpaceOnUse">
      <path d="M 56 0 L 0 0 0 56" fill="none" stroke="${rgba(cyan, 0.07)}" stroke-width="0.55"/>
    </pattern>
    <linearGradient id="${d("beam")}" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="${rgba(cyan, 0)}"/>
      <stop offset="45%" stop-color="${rgba(cyan, 0.28)}"/>
      <stop offset="55%" stop-color="${rgba(mag, 0.22)}"/>
      <stop offset="100%" stop-color="${rgba(mag, 0)}"/>
    </linearGradient>
    <linearGradient id="${d("wave")}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${rgba(cyan, 0.7)}"/>
      <stop offset="50%" stop-color="rgba(167,139,250,0.5)"/>
      <stop offset="100%" stop-color="${rgba(mag, 0.6)}"/>
    </linearGradient>`);
    const scene = `
  ${baseLayers(p, m, `<rect width="${W}" height="${H}" fill="url(#${d("grid")})" opacity="0.5"/><rect width="${W}" height="${H}" fill="url(#${d("scan")})" opacity="0.55"/>`)}
  <g opacity="0.32">
    <rect x="-40" y="108" width="1680" height="2.5" fill="${rgba(cyan, 0.35)}" transform="skewX(-10)"/>
    <rect x="-40" y="198" width="1680" height="2" fill="${rgba(mag, 0.28)}" transform="skewX(6)"/>
    <rect x="-40" y="278" width="1680" height="3" fill="${rgba(cyan, 0.2)}" transform="skewX(-4)"/>
  </g>
  <path d="M 60 200 Q 280 160 520 200 T ${CX} 180 T 1120 210 T 1540 170 L 1540 240 Q 1320 280 1080 240 T ${CX} 260 T 400 238 T 60 278 Z"
        fill="url(#${d("beam")})" opacity="0.2"/>
  <path d="M 48 182 L 240 158 L 420 198 L 600 148 L 780 208 L 980 136 L 1180 216 L 1380 148 L 1552 192"
        fill="none" stroke="url(#${d("wave")})" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.62"/>
  <g opacity="0.5" style="mix-blend-mode:screen" transform="translate(${CX} ${CY})">
    <path d="M -120 88 L -40 -72 L 40 -72 L 120 88 Z" fill="rgba(10,16,24,0.6)" stroke="${rgba(cyan, 0.35)}" stroke-width="1" transform="translate(-5,0)"/>
    <path d="M -120 88 L -40 -72 L 40 -72 L 120 88 Z" fill="none" stroke="${rgba(mag, 0.32)}" stroke-width="1.2" transform="translate(5,2)"/>
    <path d="M -120 88 L -40 -72 L 40 -72 L 120 88 Z" fill="rgba(12,18,28,0.55)" stroke="rgba(230,240,255,0.18)" stroke-width="0.9"/>
  </g>
  ${markChevron(p, m, { scale: 1.02, cy: CY + 6, inner: false })}
  <g class="collectionGlitchHdrAnim" opacity="0.36">
    <rect x="180" y="92" width="240" height="1.5" fill="${rgba(cyan, 0.45)}">
      <animate attributeName="x" values="176;184;176" dur="4.5s" repeatCount="indefinite"/>
    </rect>
    <rect x="1020" y="228" width="200" height="1.2" fill="${rgba(mag, 0.38)}">
      <animate attributeName="x" values="1016;1024;1016" dur="3.8s" repeatCount="indefinite"/>
    </rect>
  </g>
  ${frameHud(p, m)}
  ${finish(p)}`;
    return `
<svg class="collectionHeaderBanner collectionHeaderBanner--glitch" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true" role="img">
  <defs>${defs}</defs>${scene}
</svg>`;
  }

  function architectBanner() {
    const p = uid();
    const m = META.architect;
    const d = (n) => `${p}_${n}`;
    const amber = m.accent;
    const dim = [200, 198, 190];
    const defs = defsCommon(p, m, `
    <pattern id="${d("bp")}" width="36" height="36" patternUnits="userSpaceOnUse">
      <path d="M 36 0 L 0 0 0 36" fill="none" stroke="${rgba(amber, 0.1)}" stroke-width="0.5"/>
      <circle cx="18" cy="18" r="0.7" fill="${rgba(amber, 0.14)}"/>
    </pattern>`);
    const scene = `
  ${baseLayers(p, m, `<rect width="${W}" height="${H}" fill="url(#${d("bp")})" opacity="0.4"/>`)}
  <g fill="none" stroke="${rgba(dim, 0.18)}" stroke-width="0.45" opacity="0.88">
    <line x1="${CX}" y1="24" x2="${CX}" y2="${H - 24}"/>
    <line x1="100" y1="${CY}" x2="${W - 100}" y2="${CY}"/>
    <line x1="260" y1="68" x2="${W - 260}" y2="${H - 68}"/>
    <line x1="${W - 260}" y1="68" x2="260" y2="${H - 68}"/>
    <circle cx="${CX}" cy="${CY}" r="142"/>
    <circle cx="${CX}" cy="${CY}" r="220" opacity="0.38"/>
    <circle cx="${CX}" cy="${CY}" r="82" opacity="0.75"/>
    <ellipse cx="${CX}" cy="${CY}" rx="300" ry="78" opacity="0.22"/>
  </g>
  <g fill="none" stroke="${rgba(amber, 0.48)}" stroke-width="0.65" opacity="0.8">
    <path d="M 72 302 L 72 286 M 66 286 L 78 286" stroke-linecap="round"/>
    <path d="M ${W - 72} 88 L ${W - 72} 72 M ${W - 78} 72 L ${W - 66} 72" stroke-linecap="round"/>
    <path d="M 220 336 L 380 336" stroke-dasharray="4 7"/>
    <path d="M ${W - 380} 44 L ${W - 220} 44" stroke-dasharray="4 7"/>
  </g>
  <g transform="translate(${CX} ${CY + 4}) scale(1.12)" filter="url(#${d("markGlow")})">
    <path d="M -128 96 Q 60 -152 320 118" fill="none" stroke="${rgba(amber, 0.55)}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="${MARK.L}" fill="rgba(248,246,240,0.05)" stroke="${rgba(dim, 0.38)}" stroke-width="1"/>
    <path d="${MARK.R}" fill="rgba(20,18,14,0.5)" stroke="${rgba(dim, 0.28)}" stroke-width="0.9"/>
    <path d="M -18 -128 L 0 -148 L 18 -128 Z" fill="${rgba(amber, 0.1)}" stroke="${rgba(amber, 0.62)}" stroke-width="1"/>
    <path d="M -6 -120 L 6 -120 L 44 76 L -44 76 Z" fill="none" stroke="${rgba(dim, 0.4)}" stroke-width="0.75"/>
    <circle cx="0" cy="-138" r="3.5" fill="${rgba(amber, 0.9)}"/>
    <path d="M -32 92 L -10 118 L 10 118 L 32 92" fill="none" stroke="${rgba(amber, 0.42)}" stroke-width="0.85"/>
  </g>
  <rect x="72" y="44" width="88" height="28" rx="2" fill="${rgba(amber, 0.05)}" stroke="${rgba(amber, 0.22)}" stroke-width="0.5"/>
  <text x="82" y="62" fill="${rgba(dim, 0.55)}" font-family="ui-monospace,Consolas,monospace" font-size="9" letter-spacing="0.12em">AV-DRAFT · S01</text>
  ${frameHud(p, m)}
  ${finish(p)}`;
    return `
<svg class="collectionHeaderBanner collectionHeaderBanner--architect" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true" role="img">
  <defs>${defs}</defs>${scene}
</svg>`;
  }

  function collectionHeaderBannerSvg(laneId) {
    const lane = String(laneId || "").toLowerCase();
    if (lane === "glitch") return glitchBanner();
    if (lane === "architect") return architectBanner();
    if (lane === "core") return coreBanner();
    if (lane === "shadow") return shadowBanner();
    if (lane === "apex") return apexBanner();
    return coreBanner();
  }

  global.collectionHeaderBannerSvg = collectionHeaderBannerSvg;
  global.COLLECTION_HEADER_SVG_BUILD = HDR_BUILD;
})(typeof window !== "undefined" ? window : globalThis);
