/**
 * Wide panoramic SVG banners for collection page headers (`#cvArtSvg`).
 * Lanes: core, shadow, glitch, architect, apex — full-width panoramic band (replaces cropping `cardImg`).
 */
(function (global) {
  function uid() {
    return "hdr_" + Math.random().toString(36).slice(2, 10);
  }

  function glitchBanner() {
    const p = uid();
    const def = (n) => `${p}_${n}`;
    const cyan = "rgba(34,211,238,";
    const mag = "rgba(236,72,153,";

    return `
<svg class="collectionHeaderBanner collectionHeaderBanner--glitch" viewBox="0 0 1600 380" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true" role="img">
  <defs>
    <linearGradient id="${def("sky")}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#020408"/>
      <stop offset="38%" stop-color="#0c1522"/>
      <stop offset="100%" stop-color="#05070c"/>
    </linearGradient>
    <radialGradient id="${def("pulse")}" cx="52%" cy="48%" r="58%">
      <stop offset="0%" stop-color="${cyan}0.18)"/>
      <stop offset="45%" stop-color="${mag}0.06)"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
    <radialGradient id="${def("rim")}" cx="50%" cy="50%" r="72%">
      <stop offset="65%" stop-color="transparent"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.85)"/>
    </radialGradient>
    <pattern id="${def("scan")}" width="8" height="8" patternUnits="userSpaceOnUse">
      <rect width="8" height="1.5" fill="rgba(255,255,255,0.025)"/>
    </pattern>
    <pattern id="${def("grid")}" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(34,211,238,0.06)" stroke-width="0.6"/>
    </pattern>
    <linearGradient id="${def("beam")}" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="${cyan}0)"/>
      <stop offset="42%" stop-color="${cyan}0.35)"/>
      <stop offset="58%" stop-color="${mag}0.28)"/>
      <stop offset="100%" stop-color="${mag}0)"/>
    </linearGradient>
    <filter id="${def("soft")}" x="-5%" y="-5%" width="110%" height="110%">
      <feGaussianBlur stdDeviation="18" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <linearGradient id="${def("wave")}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${cyan}0.65)"/>
      <stop offset="50%" stop-color="rgba(167,139,250,0.55)"/>
      <stop offset="100%" stop-color="${mag}0.55)"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="380" fill="url(#${def("sky")})"/>
  <rect width="1600" height="380" fill="url(#${def("grid")})" opacity="0.55"/>
  <rect width="1600" height="380" fill="url(#${def("scan")})" opacity="0.45"/>
  <ellipse cx="820" cy="190" rx="720" ry="200" fill="url(#${def("pulse")})" filter="url(#${def("soft")})"/>
  <!-- Horizon glitch bands -->
  <g opacity="0.35">
    <rect x="-40" y="112" width="1680" height="4" fill="${cyan}0.35)" transform="skewX(-12)"/>
    <rect x="-40" y="198" width="1680" height="3" fill="${mag}0.28)" transform="skewX(8)"/>
    <rect x="-40" y="268" width="1680" height="5" fill="${cyan}0.22)" transform="skewX(-6)"/>
  </g>
  <!-- Chromatic split silhouette hint -->
  <g opacity="0.55" style="mix-blend-mode:screen">
    <path d="M 520 285 L 620 118 L 980 118 L 1080 285 Z" fill="none" stroke="${cyan}0.45)" stroke-width="2.5" transform="translate(-6,0)"/>
    <path d="M 520 285 L 620 118 L 980 118 L 1080 285 Z" fill="none" stroke="${mag}0.4)" stroke-width="2.5" transform="translate(6,2)"/>
    <path d="M 520 285 L 620 118 L 980 118 L 1080 285 Z" fill="rgba(12,18,28,0.55)" stroke="rgba(230,240,255,0.15)" stroke-width="1"/>
  </g>
  <!-- Waveform spine -->
  <path d="M 80 205 Q 240 155 420 205 T 760 185 T 1120 215 T 1520 175 L 1520 235 Q 1360 275 1180 235 T 760 265 T 380 245 T 80 285 Z"
        fill="url(#${def("beam")})" opacity="0.22"/>
  <path d="M 60 188 L 220 162 L 380 198 L 540 148 L 720 208 L 920 138 L 1120 218 L 1320 152 L 1540 198"
        fill="none" stroke="url(#${def("wave")})" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.65"/>
  <path d="M 60 218 L 280 238 L 460 192 L 680 248 L 860 208 L 1060 258 L 1260 188 L 1540 228"
        fill="none" stroke="${cyan}0.35)" stroke-width="1.4" stroke-linecap="round" opacity="0.8"/>
  <!-- Scan shards -->
  <g opacity="0.22">
    <rect x="140" y="40" width="120" height="10" fill="${cyan}0.6)"/>
    <rect x="1180" y="72" width="90" height="8" fill="${mag}0.55)"/>
    <rect x="980" y="310" width="140" height="6" fill="${cyan}0.45)"/>
  </g>
  <!-- Animated glitch ticks -->
  <g class="collectionGlitchHdrAnim" opacity="0.55">
    <rect x="200" y="96" width="220" height="2.5" fill="${cyan}0.5)">
      <animate attributeName="x" values="190;210;190" dur="0.35s" repeatCount="indefinite"/>
    </rect>
    <rect x="980" y="220" width="180" height="2" fill="${mag}0.45)">
      <animate attributeName="x" values="975;995;975" dur="0.28s" repeatCount="indefinite"/>
    </rect>
    <rect x="620" y="300" width="260" height="3" fill="${cyan}0.4)">
      <animate attributeName="x" values="615;630;615" dur="0.42s" repeatCount="indefinite"/>
    </rect>
  </g>
  <rect width="1600" height="380" fill="url(#${def("rim")})" pointer-events="none"/>
</svg>`;
  }

  function architectBanner() {
    const p = uid();
    const d = (n) => `${p}_${n}`;
    const amber = "rgba(251,191,36,";
    const dim = "rgba(220,220,220,";

    return `
<svg class="collectionHeaderBanner collectionHeaderBanner--architect" viewBox="0 0 1600 380" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true" role="img">
  <defs>
    <linearGradient id="${d("bg")}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070504"/>
      <stop offset="100%" stop-color="#0f0d08"/>
    </linearGradient>
    <radialGradient id="${d("spot")}" cx="50%" cy="42%" r="65%">
      <stop offset="0%" stop-color="${amber}0.12)"/>
      <stop offset="55%" stop-color="transparent"/>
    </radialGradient>
    <radialGradient id="${d("vig")}" cx="50%" cy="50%" r="72%">
      <stop offset="55%" stop-color="transparent"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.88)"/>
    </radialGradient>
    <pattern id="${d("grid")}" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${amber}0.11)" stroke-width="0.5"/>
    </pattern>
  </defs>
  <rect width="1600" height="380" fill="url(#${d("bg")})"/>
  <rect width="1600" height="380" fill="url(#${d("grid")})" opacity="0.35"/>
  <ellipse cx="800" cy="175" rx="620" ry="165" fill="url(#${d("spot")})"/>
  <!-- Construction frame -->
  <g fill="none" stroke="${dim}0.2)" stroke-width="0.45" opacity="0.85">
    <line x1="800" y1="20" x2="800" y2="360"/>
    <line x1="120" y1="190" x2="1480" y2="190"/>
    <line x1="280" y1="72" x2="1320" y2="308"/>
    <line x1="1320" y1="72" x2="280" y2="308"/>
    <circle cx="800" cy="190" r="148" opacity="0.7"/>
    <circle cx="800" cy="190" r="228" opacity="0.35"/>
    <circle cx="800" cy="190" r="88" opacity="0.85"/>
    <ellipse cx="800" cy="190" rx="280" ry="72" opacity="0.25"/>
  </g>
  <!-- Golden accent rulers -->
  <g fill="none" stroke="${amber}0.45)" stroke-width="0.7" opacity="0.75">
    <path d="M 88 298 L 88 284 M 82 284 L 94 284" stroke-linecap="round"/>
    <path d="M 1512 98 L 1512 84 M 1506 84 L 1518 84" stroke-linecap="round"/>
    <path d="M 240 332 L 360 332" stroke-dasharray="3 6"/>
    <path d="M 1240 48 L 1360 48" stroke-dasharray="3 6"/>
  </g>
  <!-- Stylized drafted A + sweep -->
  <g opacity="0.92" transform="translate(800 198) scale(1.06)">
    <path d="M -118 92 L -24 -108 L -6 -104 L -6 92 Z"
          fill="rgba(248,248,252,0.04)" stroke="${dim}0.35)" stroke-width="1"/>
    <path d="M -20 -108 L -4 -148 L 12 -108 L -4 -72 Z"
          fill="${amber}0.08)" stroke="${amber}0.55)" stroke-width="1"/>
    <path d="M 118 92 L 24 -108 L 6 -104 L 6 92 Z"
          fill="rgba(248,248,252,0.04)" stroke="${dim}0.35)" stroke-width="1"/>
    <path d="M -6 -108 L 6 -108 L 42 72 L -42 72 Z"
          fill="none" stroke="${dim}0.45)" stroke-width="0.8"/>
    <path d="M -160 96 Q 80 -148 340 124"
          fill="none" stroke="${amber}0.5)" stroke-width="2.2" stroke-linecap="round"/>
    <!-- Base footing -->
    <path d="M -28 88 L -8 116 L 8 116 L 28 88 Z" fill="none" stroke="${amber}0.4)" stroke-width="0.8"/>
    <circle cx="-4" cy="-128" r="3" fill="${amber}0.85)"/>
  </g>
  <path d="M 80 52 L 120 52 L 132 76 L 80 76 Z"
        fill="${amber}0.04)" stroke="${amber}0.25)" stroke-width="0.5" opacity="0.7"/>
  <text x="88" y="68" fill="${dim}0.5)" font-family="ui-monospace,monospace" font-size="9" letter-spacing="0.08em">AV-DRAFT</text>
  <text x="1340" y="328" fill="${dim}0.4)" font-family="ui-monospace,monospace" font-size="8" letter-spacing="0.06em">REV BUILD</text>
  <rect width="1600" height="380" fill="url(#${d("vig")})"/>
</svg>`;
  }

  function coreBanner() {
    const p = uid();
    const id = (n) => `${p}_${n}`;
    const c = [110, 231, 255];
    const t = [79, 209, 197];
    const rx = (a, alpha) => `rgba(${a[0]},${a[1]},${a[2]},${alpha})`;

    return `
<svg class="collectionHeaderBanner collectionHeaderBanner--core" viewBox="0 0 1600 380" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true" role="img">
  <defs>
    <linearGradient id="${id("sky")}" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#060a11"/>
      <stop offset="100%" stop-color="#080c14"/>
    </linearGradient>
    <radialGradient id="${id("deck")}" cx="50%" cy="88%" r="58%">
      <stop offset="0%" stop-color="${rx(c, 0.32)}"/>
      <stop offset="45%" stop-color="${rx(t, 0.12)}"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
    <radialGradient id="${id("halo")}" cx="50%" cy="45%" r="52%">
      <stop offset="0%" stop-color="${rx(c, 0.06)}"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
    <radialGradient id="${id("rim")}" cx="50%" cy="50%" r="70%">
      <stop offset="62%" stop-color="transparent"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.86)"/>
    </radialGradient>
    <pattern id="${id("grid")}" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M 32 0 L 0 0 0 32" fill="none" stroke="${rx(c, 0.07)}" stroke-width="0.45"/>
    </pattern>
  </defs>
  <rect width="1600" height="380" fill="url(#${id("sky")})"/>
  <rect width="1600" height="380" fill="url(#${id("grid")})" opacity="0.5"/>
  <ellipse cx="800" cy="312" rx="720" ry="160" fill="url(#${id("deck")})"/>
  <ellipse cx="800" cy="172" rx="420" ry="130" fill="url(#${id("halo")})"/>
  <!-- Reticle rings -->
  <g fill="none" stroke="${rx(c, 0.22)}" stroke-width="0.55">
    <circle cx="800" cy="178" r="148" stroke-dasharray="4 10 2 10"/>
    <circle cx="800" cy="178" r="196" opacity="0.65"/>
    <circle cx="800" cy="178" r="268" opacity="0.38" stroke-dasharray="14 22"/>
    <line x1="800" y1="42" x2="800" y2="338"/>
    <line x1="160" y1="178" x2="1440" y2="178"/>
    <path d="M 420 108 L 1180 248" opacity="0.35" stroke-width="0.4"/>
    <path d="M 1180 108 L 420 248" opacity="0.35" stroke-width="0.4"/>
  </g>
  <!-- Lock nodes -->
  <g opacity="0.75">
    <circle cx="648" cy="178" r="3" fill="${rx(c, 0.85)}" stroke="none"/>
    <circle cx="952" cy="178" r="2.5" fill="${rx([148,163,184], 0.55)}" stroke="none"/>
    <circle cx="800" cy="328" r="2" fill="${rx(t, 0.65)}" stroke="none"/>
  </g>
  <!-- Center chevron / issued mark -->
  <g opacity="0.88" transform="translate(800 186) scale(1.05)">
    <path d="M -72 94 L -20 -132 L -2 -126 L -2 94 Z"
          fill="rgba(248,252,255,0.04)" stroke="${rx(c, 0.45)}" stroke-width="1"/>
    <path d="M 72 94 L 20 -132 L 2 -126 L 2 94 Z"
          fill="rgba(20,26,38,0.35)" stroke="${rx([148,163,184], 0.22)}" stroke-width="1"/>
    <path d="M -12 -138 L 0 -128 L 12 -138 Z" fill="${rx(c, 0.15)}" stroke="${rx(c, 0.65)}" stroke-width="1"/>
    <path d="M -36 108 L -4 134 L 4 134 L 36 108" fill="none" stroke="${rx(t, 0.45)}" stroke-width="2" stroke-linecap="round"/>
  </g>
  <!-- Frame copy -->
  <text x="64" y="56" fill="${rx(c, 0.52)}" font-family="ui-monospace,monospace" font-size="9" letter-spacing="0.2em">FOUNDATION ISSUE · ISSUED</text>
  <text x="1204" y="324" fill="${rx([148,163,184], 0.4)}" font-family="ui-monospace,monospace" font-size="8" letter-spacing="0.13em">OP READINESS GREEN</text>
  <rect width="1600" height="380" fill="url(#${id("rim")})" pointer-events="none"/>
</svg>`;
  }

  function shadowBanner() {
    const p = uid();
    const s = (n) => `${p}_${n}`;
    const slate = [148, 163, 184];
    const ink = [71, 85, 105];
    const edge = [110, 231, 255];
    const r = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;

    return `
<svg class="collectionHeaderBanner collectionHeaderBanner--shadow" viewBox="0 0 1600 380" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true" role="img">
  <defs>
    <linearGradient id="${s("bg")}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070809"/>
      <stop offset="55%" stop-color="#0d1116"/>
      <stop offset="100%" stop-color="#050608"/>
    </linearGradient>
    <radialGradient id="${s("mist")}" cx="50%" cy="95%" r="65%">
      <stop offset="0%" stop-color="${r(ink, 0.35)}"/>
      <stop offset="60%" stop-color="transparent"/>
    </radialGradient>
    <radialGradient id="${s("veil")}" cx="48%" cy="38%" r="55%">
      <stop offset="0%" stop-color="${r(slate, 0.07)}"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
    <radialGradient id="${s("rim")}" cx="50%" cy="50%" r="72%">
      <stop offset="58%" stop-color="transparent"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.9)"/>
    </radialGradient>
    <pattern id="${s("grain")}" width="5" height="5" patternUnits="userSpaceOnUse">
      <circle cx="1.2" cy="2" r="0.35" fill="rgba(255,255,255,0.04)"/>
      <circle cx="3.8" cy="3.4" r="0.25" fill="rgba(148,163,184,0.06)"/>
    </pattern>
  </defs>
  <rect width="1600" height="380" fill="url(#${s("bg")})"/>
  <rect width="1600" height="380" fill="url(#${s("grain")})" opacity="0.35"/>
  <ellipse cx="800" cy="360" rx="780" ry="220" fill="url(#${s("mist")})"/>
  <ellipse cx="760" cy="160" rx="520" ry="140" fill="url(#${s("veil")})"/>
  <!-- Topo / ridge lines -->
  <g fill="none" stroke="${r(slate, 0.22)}" stroke-width="0.55" stroke-linecap="round" opacity="0.9">
    <path d="M -20 248 Q 180 198 420 228 T 820 208 T 1220 242 T 1620 216"/>
    <path d="M 40 268 Q 280 212 520 252 T 960 224 T 1380 258 T 1580 232" opacity="0.55"/>
    <path d="M 80 188 Q 340 128 600 168 T 1100 138 T 1520 178" opacity="0.4"/>
  </g>
  <!-- HUD trace -->
  <g fill="none" stroke="${r(slate, 0.35)}" stroke-width="0.45">
    <line x1="140" y1="210" x2="1460" y2="210"/>
    <circle cx="268" cy="210" r="2.2" fill="${r(edge, 0.45)}" stroke="none"/>
    <circle cx="612" cy="210" r="1.5" fill="${r(slate, 0.5)}" stroke="none"/>
    <circle cx="988" cy="210" r="1.6" fill="${r(slate, 0.45)}" stroke="none"/>
    <circle cx="1332" cy="210" r="2" fill="${r(edge, 0.28)}" stroke="none"/>
  </g>
  <!-- Black-on-black mark hint -->
  <g opacity="0.55" transform="translate(800 200)">
    <path d="M -88 86 L -22 -118 L 0 -108 L 22 -118 L 88 86 L 58 86 L 36 -28 L -36 -28 L -58 86 Z"
          fill="rgba(8,10,14,0.75)" stroke="${r(slate, 0.18)}" stroke-width="0.8"/>
    <path d="M -22 -118 L 0 -132 L 22 -118" fill="none" stroke="${r(edge, 0.22)}" stroke-width="0.9"/>
  </g>
  <!-- Edge catch -->
  <path d="M 100 72 L 240 72" stroke="${r(edge, 0.16)}" stroke-width="0.6" fill="none" opacity="0.8"/>
  <path d="M 1360 308 L 1500 308" stroke="${r(edge, 0.12)}" stroke-width="0.6" fill="none" opacity="0.7"/>
  <text x="58" y="54" fill="${r(slate, 0.48)}" font-family="ui-monospace,monospace" font-size="9" letter-spacing="0.18em">STEALTH LANE · LOW SIGNAL</text>
  <text x="1156" y="332" fill="${r(ink, 0.55)}" font-family="ui-monospace,monospace" font-size="8" letter-spacing="0.12em">WASHED BLACK · PATTERN HEAVY</text>
  <rect width="1600" height="380" fill="url(#${s("rim")})" pointer-events="none"/>
</svg>`;
  }

  function apexBanner() {
    const p = uid();
    const a = (n) => `${p}_${n}`;
    const violet = [167, 139, 250];
    const cyan = [110, 231, 255];
    const rose = [236, 72, 153];
    const blue = [59, 130, 246];
    const rx = (rgb, alpha) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;

    return `
<svg class="collectionHeaderBanner collectionHeaderBanner--apex" viewBox="0 0 1600 380" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true" role="img">
  <defs>
    <linearGradient id="${a("bg")}" x1="8%" y1="0%" x2="92%" y2="100%">
      <stop offset="0%" stop-color="#0a0812"/>
      <stop offset="45%" stop-color="#100c18"/>
      <stop offset="100%" stop-color="#05060e"/>
    </linearGradient>
    <radialGradient id="${a("prism")}" cx="52%" cy="42%" r="58%">
      <stop offset="0%" stop-color="${rx(violet, 0.16)}"/>
      <stop offset="38%" stop-color="${rx(blue, 0.06)}"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
    <radialGradient id="${a("floor")}" cx="50%" cy="102%" r="62%">
      <stop offset="0%" stop-color="${rx(cyan, 0.22)}"/>
      <stop offset="35%" stop-color="${rx(rose, 0.08)}"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
    <radialGradient id="${a("rim")}" cx="50%" cy="50%" r="70%">
      <stop offset="60%" stop-color="transparent"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.88)"/>
    </radialGradient>
    <linearGradient id="${a("foil")}" x1="0%" y1="30%" x2="100%" y2="70%">
      <stop offset="0%" stop-color="${rx(violet, 0)}"/>
      <stop offset="48%" stop-color="${rx(cyan, 0.09)}"/>
      <stop offset="100%" stop-color="${rx(rose, 0.05)}"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="380" fill="url(#${a("bg")})"/>
  <rect width="1600" height="380" fill="url(#${a("foil")})" opacity="0.95"/>
  <ellipse cx="820" cy="160" rx="540" ry="200" fill="url(#${a("prism")})"/>
  <ellipse cx="800" cy="368" rx="760" ry="200" fill="url(#${a("floor")})"/>
  <!-- Summit grid -->
  <g fill="none" stroke="${rx(violet, 0.12)}" stroke-width="0.4" opacity="0.85">
    <path d="M 0 220 L 1600 220"/>
    <path d="M 0 260 L 1600 260" opacity="0.5"/>
    <path d="M 620 40 L 620 340"/>
    <path d="M 980 40 L 980 340" opacity="0.55"/>
    <path d="M 500 340 L 800 118 L 1100 340" stroke="${rx(cyan, 0.18)}" stroke-width="0.55"/>
  </g>
  <!-- Orbit rings -->
  <g fill="none" stroke="${rx(cyan, 0.2)}" stroke-width="0.55" transform="translate(800 198)">
    <circle r="118" stroke-dasharray="6 16 3 16"/>
    <circle r="168" opacity="0.55" stroke="${rx(violet, 0.22)}"/>
    <circle r="244" opacity="0.35" stroke-dasharray="22 26"/>
    <line x1="-320" y1="0" x2="320" y2="0" opacity="0.4" stroke="${rx(blue, 0.35)}"/>
  </g>
  <!-- Apex mark — lowered like door art -->
  <g transform="translate(800 224) scale(1.12)">
    <path d="M -102 98 L -28 -112 L 0 -98 L 28 -112 L 102 98 L 70 98 L 44 -12 L -44 -12 L -70 98 Z"
          fill="rgba(12,10,22,0.72)" stroke="${rx(violet, 0.35)}" stroke-width="1"/>
    <path d="M -28 -112 L 0 -132 L 28 -112 L 14 -72 L -14 -72 Z"
          fill="${rx(cyan, 0.08)}" stroke="${rx(cyan, 0.45)}" stroke-width="0.9"/>
    <path d="M -44 -12 L 0 22 L 44 -12" fill="none" stroke="${rx(rose, 0.28)}" stroke-width="0.8" stroke-linejoin="round"/>
  </g>
  <circle cx="612" cy="198" r="2.8" fill="${rx(cyan, 0.65)}" stroke="none"/>
  <circle cx="988" cy="198" r="2.2" fill="${rx(violet, 0.55)}" stroke="none"/>
  <path d="M 96 74 L 226 74" stroke="${rx(cyan, 0.35)}" stroke-width="0.55" fill="none"/>
  <path d="M 1374 306 L 1504 306" stroke="${rx(rose, 0.22)}" stroke-width="0.55" fill="none"/>
  <text x="56" y="52" fill="${rx(cyan, 0.52)}" font-family="ui-monospace,monospace" font-size="9" letter-spacing="0.2em">APEX PATTERN · SUMMIT WINDOW</text>
  <text x="1044" y="330" fill="${rx(violet, 0.42)}" font-family="ui-monospace,monospace" font-size="8" letter-spacing="0.14em">PRISM FOIL · HIGH CONTRAST MARKS</text>
  <rect width="1600" height="380" fill="url(#${a("rim")})" pointer-events="none"/>
</svg>`;
  }

  function collectionHeaderBannerSvg(laneId) {
    const lane = String(laneId || "").toLowerCase();
    if (lane === "glitch") return glitchBanner();
    if (lane === "architect") return architectBanner();
    if (lane === "core") return coreBanner();
    if (lane === "shadow") return shadowBanner();
    if (lane === "apex") return apexBanner();
    return "";
  }

  global.collectionHeaderBannerSvg = collectionHeaderBannerSvg;
})(typeof window !== "undefined" ? window : globalThis);
