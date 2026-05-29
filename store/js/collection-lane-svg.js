/**
 * Collection lane SVG — metallic chevron (/\) + full holographic backgrounds per lane.
 * Backgrounds match reference art: Core glow/blueprint, Shadow topo HUD, Apex prism bands,
 * Glitch scan/static, Architect draft grid + warm foil.
 */
(function (global) {
  const LANE_SVG_BUILD = "pro-v3-intent-frame";
  const LANE_INTENT_LABEL = {
    core: "FOUNDATION",
    shadow: "STEALTH LANE",
    apex: "SUMMIT MARK",
    glitch: "SIGNAL NOISE",
    architect: "BUILD ARCHIVE",
  };
  if (typeof console !== "undefined" && console.info) {
    console.info("[collection-lane-svg] build:", LANE_SVG_BUILD);
  }
  function rgba(rgb, a) {
    return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
  }

  /** High-detail chevron geometry (/\) — outer body, inset face, edge highlights */
  const CHEVRON = {
    L_body: "M -58,64 L -52,64 L -11,-54 L 0,-46 L -9,-44 L -46,64 Z",
    L_face: "M -48,58 L -14,-48 L -4,-40 L -8,-38 L -40,58 Z",
    L_rim: "M -58,64 L -11,-54 L -9,-44",
    R_body: "M 58,64 L 52,64 L 11,-54 L 0,-46 L 9,-44 L 46,64 Z",
    R_face: "M 48,58 L 14,-48 L 4,-40 L 8,-38 L 40,58 Z",
    R_rim: "M 58,64 L 11,-54 L 9,-44",
    peak: "M -12,-54 L 0,-46 L 12,-54 Z",
    peak_cap: "M -8,-52 L 0,-47 L 8,-52 Z",
    inner: "M -22,22 L 0,-12 L 22,22 Z",
    inner_rim: "M -18,18 L 0,-8 L 18,18 Z",
    split_void: "M -5,64 L 5,64 L 4,-42 L -4,-42 Z",
    orbit: "M 64,-34 C 34,-62 -18,-52 -48,-14 C -70,14 -62,52 -40,66",
    orbit_glow: "M 64,-34 C 34,-62 -18,-52 -48,-14 C -70,14 -62,52 -40,66",
  };

  /** Shared holographic defs (gradients, patterns, filters) */
  function holoDefs(id, lane) {
    const i = (n) => `${id}_${n}`;
    const palettes = {
      core: {
        holo: [[110, 231, 255], [167, 139, 250], [79, 209, 197]],
        sheen: [99, 179, 237],
      },
      shadow: {
        holo: [[110, 231, 255], [148, 163, 184], [71, 85, 105]],
        sheen: [148, 163, 184],
      },
      apex: {
        holo: [[167, 139, 250], [110, 231, 255], [236, 72, 153]],
        sheen: [59, 130, 246],
      },
      glitch: {
        holo: [[34, 211, 238], [236, 72, 153], [167, 139, 250]],
        sheen: [34, 211, 238],
      },
      architect: {
        holo: [[251, 191, 36], [245, 158, 11], [234, 179, 8]],
        sheen: [251, 191, 36],
      },
    };
    const pal = palettes[lane] || palettes.core;
    const [h0, h1, h2] = pal.holo;

    return `
      <linearGradient id="${i("holoFoil")}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${rgba(h0, 0)}"/>
        <stop offset="18%" stop-color="${rgba(h0, 0.22)}"/>
        <stop offset="38%" stop-color="${rgba(h1, 0.14)}"/>
        <stop offset="55%" stop-color="${rgba(h2, 0)}"/>
        <stop offset="72%" stop-color="${rgba(h1, 0.18)}"/>
        <stop offset="88%" stop-color="${rgba(h0, 0.12)}"/>
        <stop offset="100%" stop-color="${rgba(h2, 0)}"/>
      </linearGradient>
      <linearGradient id="${i("holoSweep")}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="transparent"/>
        <stop offset="42%" stop-color="${rgba(pal.sheen, 0)}"/>
        <stop offset="50%" stop-color="${rgba(pal.sheen, 0.35)}"/>
        <stop offset="58%" stop-color="${rgba(pal.sheen, 0)}"/>
        <stop offset="100%" stop-color="transparent"/>
      </linearGradient>
      <radialGradient id="${i("vignette")}" cx="50%" cy="45%" r="72%">
        <stop offset="0%" stop-color="transparent"/>
        <stop offset="68%" stop-color="rgba(0,0,0,0.15)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0.72)"/>
      </radialGradient>
      <radialGradient id="${i("centerLift")}" cx="50%" cy="42%" r="48%">
        <stop offset="0%" stop-color="${rgba(h0, 0.08)}"/>
        <stop offset="100%" stop-color="transparent"/>
      </radialGradient>
      <pattern id="${i("fineGrain")}" width="3" height="3" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="0.35" fill="rgba(255,255,255,0.04)"/>
      </pattern>
      <pattern id="${i("holoLines")}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
        <line x1="0" y1="0" x2="0" y2="8" stroke="${rgba(h0, 0.06)}" stroke-width="0.5"/>
      </pattern>
      <filter id="${i("softGlow")}" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="12" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>`;
  }

  function cardClipDef(p) {
    const id = (n) => `${p}_${n}`;
    return `<clipPath id="${id("cardClip")}"><rect width="400" height="300" rx="22" ry="22"/></clipPath>`;
  }

  function bgClip(p) {
    return `clip-path="url(#${p}_cardClip)"`;
  }

  function defsBlock(p, lane) {
    const id = (n) => `${p}_${n}`;
    const common = `
      ${cardClipDef(p)}
      ${holoDefs(p, lane)}
      <filter id="${id("shadow")}" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000" flood-opacity="0.55"/>
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.35"/>
      </filter>
      <filter id="${id("grain")}" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" result="n"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.55  0 0 0 0 0.58  0 0 0 0.14 0" in="n" result="g"/>
        <feBlend in="SourceGraphic" in2="g" mode="overlay"/>
      </filter>
      <filter id="${id("markGlow")}" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="2.5" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="${id("markDrop")}" x="-35%" y="-35%" width="170%" height="170%">
        <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000" flood-opacity="0.65"/>
        <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.4"/>
      </filter>
      ${markFilters(p, lane)}`;

    if (lane === "glitch") {
      return `${common}
      <filter id="${id("markDisplace")}" x="-15%" y="-15%" width="130%" height="130%">
        <feTurbulence type="fractalNoise" baseFrequency="0.04 0.8" numOctaves="2" result="t"/>
        <feDisplacementMap in="SourceGraphic" in2="t" scale="3" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
      <filter id="${id("glitch")}" x="-25%" y="-25%" width="150%" height="150%">
        <feOffset in="SourceGraphic" dx="-2" dy="0" result="c"/>
        <feColorMatrix in="c" type="matrix" values="0 0 1 0 0  0 1 1 0 0  1 1 1 0 0  0 0 0 0.85 0" result="cyan"/>
        <feOffset in="SourceGraphic" dx="2" dy="0" result="m"/>
        <feColorMatrix in="m" type="matrix" values="1 0 1 0 0  0 0 1 0 0  1 0 1 0 0  0 0 0 0.85 0" result="mag"/>
        <feMerge><feMergeNode in="cyan"/><feMergeNode in="mag"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <pattern id="${id("scan")}" width="3" height="3" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="3" y2="0" stroke="rgba(0,0,0,0.4)" stroke-width="1"/>
        <line x1="0" y1="1.5" x2="3" y2="1.5" stroke="rgba(34,211,238,0.04)" stroke-width="0.5"/>
      </pattern>
      <pattern id="${id("static")}" width="64" height="64" patternUnits="userSpaceOnUse">
        <circle cx="8" cy="12" r="1" fill="${rgba([34, 211, 238], 0.15)}"/>
        <circle cx="40" cy="28" r="1.2" fill="${rgba([236, 72, 153], 0.12)}"/>
        <rect x="20" y="44" width="6" height="2" fill="${rgba([34, 211, 238], 0.2)}"/>
        <rect x="48" y="8" width="4" height="3" fill="${rgba([236, 72, 153], 0.15)}"/>
      </pattern>`;
    }
    return common;
  }

  /** Mark-only filters: hero-tier glow, brushed metal, prism / glitch chromatic */
  function markFilters(p, lane) {
    const id = (n) => `${p}_${n}`;
    return `
      <filter id="${id("markGlowStrong")}" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="${id("metalBrush")}" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" result="n"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.48  0 0 0 0 0.52  0 0 0 0.18 0" in="n" result="g"/>
        <feBlend in="SourceGraphic" in2="g" mode="soft-light"/>
      </filter>
      <filter id="${id("prismEdge")}" x="-12%" y="-12%" width="124%" height="124%">
        <feOffset in="SourceGraphic" dx="-1.2" dy="0" result="c"/>
        <feColorMatrix in="c" type="matrix" values="0 0 1 0 0  0 0.5 1 0 0  1 1 1 0 0  0 0 0 0.7 0" result="cyan"/>
        <feOffset in="SourceGraphic" dx="1.2" dy="0" result="m"/>
        <feColorMatrix in="m" type="matrix" values="1 0 1 0 0  0 0 1 0 0  1 0 1 0 0  0 0 0 0.7 0" result="mag"/>
        <feMerge><feMergeNode in="cyan"/><feMergeNode in="mag"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="${id("markGlitchStatic")}" x="-20%" y="-20%" width="140%" height="140%">
        <feOffset in="SourceGraphic" dx="-1.5" dy="-0.5" result="cyanOffset"/>
        <feColorMatrix in="cyanOffset" type="matrix" values="0 0 1 0 0  0 1 1 0 0  1 1 1 0 0  0 0 0 0.85 0" result="cyan"/>
        <feOffset in="SourceGraphic" dx="1.5" dy="0.5" result="magentaOffset"/>
        <feColorMatrix in="magentaOffset" type="matrix" values="1 0 1 0 0  0 0 1 0 0  1 0 1 0 0  0 0 0 0.85 0" result="magenta"/>
        <feMerge><feMergeNode in="cyan"/><feMergeNode in="magenta"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="${id("markBevel")}" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1.8" result="blur"/>
        <feSpecularLighting in="blur" surfaceScale="2.8" specularConstant="1.15" specularExponent="28" lighting-color="#f8fafc" result="spec">
          <fePointLight x="-70" y="-55" z="100"/>
        </feSpecularLighting>
        <feComposite in="spec" in2="SourceGraphic" operator="in" result="lit"/>
        <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="lit"/></feMerge>
      </filter>`;
  }

  function holoStackIdle(id) {
    const i = (n) => `${id}_${n}`;
    return `
      <g class="laneHoloStackIdle" clip-path="url(#${id}_cardClip)">
        <ellipse cx="200" cy="158" rx="188" ry="138" fill="url(#${i("vignette")})" opacity="0.28"/>
      </g>`;
  }

  function holoStackActive(id) {
    const i = (n) => `${id}_${n}`;
    return `
      <g class="laneHoloStackActive" clip-path="url(#${id}_cardClip)">
        <ellipse class="laneHoloFoil" cx="200" cy="150" rx="200" ry="145" fill="url(#${i("holoFoil")})" style="mix-blend-mode:screen"/>
        <ellipse class="laneHoloShine" cx="200" cy="150" rx="240" ry="150" fill="url(#${i("holoSweep")})" style="mix-blend-mode:screen"/>
      </g>`;
  }

  function holoStack(id) {
    return holoStackIdle(id) + holoStackActive(id);
  }

  /** Shared card atmosphere + corner brackets (intentional HUD frame). */
  function laneAtmosphere(id, lane) {
    const i = (n) => `${id}_${n}`;
    const pal = {
      core: [110, 231, 255],
      shadow: [148, 163, 184],
      apex: [167, 139, 250],
      glitch: [34, 211, 238],
      architect: [251, 191, 36],
    }[lane] || [110, 231, 255];
    const label = LANE_INTENT_LABEL[lane] || "AEROVISTA";
    return `
      <g class="laneAtmosphere" ${bgClip(id)} pointer-events="none">
        <linearGradient id="${i("cardBase")}" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stop-color="#080b12"/>
          <stop offset="55%" stop-color="#0a0e16"/>
          <stop offset="100%" stop-color="#05070c"/>
        </linearGradient>
        <rect width="400" height="300" fill="url(#${i("cardBase")})"/>
        <ellipse cx="200" cy="248" rx="168" ry="52" fill="${rgba(pal, 0.06)}"/>
        <g class="laneIntentFrame" opacity="0.62" stroke="${rgba(pal, 0.42)}" fill="none" stroke-width="0.65" stroke-linecap="square">
          <path d="M 20 20 L 20 44 M 20 20 L 44 20"/>
          <path d="M 380 20 L 380 44 M 356 20 L 380 20"/>
          <path d="M 20 280 L 20 256 M 20 280 L 44 280"/>
          <path d="M 380 280 L 380 256 M 356 280 L 380 280"/>
        </g>
        <text x="200" y="292" text-anchor="middle" font-family="ui-monospace,Consolas,monospace" font-size="7.5" fill="${rgba(pal, 0.48)}" letter-spacing="0.22em">${label}</text>
      </g>`;
  }

  function bgCore(id) {
    const i = (n) => `${id}_${n}`;
    return `
      <g class="laneBg laneBg--core" ${bgClip(id)}>
        <g class="laneReticle" opacity="0.28" stroke="${rgba([110, 231, 255], 0.4)}" fill="none" stroke-width="0.55">
          <circle cx="200" cy="150" r="108" stroke-dasharray="2 4"/>
          <circle cx="200" cy="150" r="78"/>
          <circle cx="200" cy="150" r="48" opacity="0.6"/>
          <line x1="200" y1="12" x2="200" y2="288"/>
          <line x1="24" y1="150" x2="376" y2="150"/>
          <line x1="68" y1="68" x2="332" y2="232" opacity="0.35"/>
          <line x1="332" y1="68" x2="68" y2="232" opacity="0.35"/>
        </g>
        <radialGradient id="${i("baseGlow")}" cx="50%" cy="92%" r="50%">
          <stop offset="0%" stop-color="${rgba([99, 179, 237], 0.55)}"/>
          <stop offset="40%" stop-color="${rgba([79, 209, 197], 0.22)}"/>
          <stop offset="100%" stop-color="transparent"/>
        </radialGradient>
        <ellipse cx="200" cy="262" rx="140" ry="36" fill="url(#${i("baseGlow")})" filter="url(#${i("softGlow")})"/>
        <ellipse cx="200" cy="268" rx="90" ry="14" fill="${rgba([110, 231, 255], 0.12)}"/>
        <g opacity="0.2" fill="none" stroke="${rgba([110, 231, 255], 0.25)}" stroke-width="0.4">
          <path d="M 200 150 L 200 268"/><path d="M 160 248 Q 200 235 240 248"/>
        </g>
        <g opacity="0.18" stroke="${rgba([110, 231, 255], 0.35)}" fill="none" stroke-width="0.35">
          <line x1="120" y1="90" x2="128" y2="98"/><line x1="272" y1="200" x2="280" y2="208"/>
          <line x1="88" y1="210" x2="96" y2="218"/><line x1="304" y1="88" x2="312" y2="96"/>
        </g>
        ${holoStack(id)}
      </g>`;
  }

  function bgShadow(id) {
    const i = (n) => `${id}_${n}`;
    return `
      <g class="laneBg laneBg--shadow" ${bgClip(id)}>
        <g opacity="0.22" stroke="${rgba([148, 163, 184], 0.45)}" fill="none" stroke-width="0.45">
          <path d="M 260 30 Q 310 80 295 150 T 255 275"/>
          <path d="M 285 50 Q 335 100 318 165 T 278 255"/>
          <path d="M 305 70 Q 350 120 332 180 T 295 240"/>
          <path d="M 220 90 Q 250 130 235 170 T 210 230"/>
        </g>
        <g opacity="0.22" fill="none" stroke="${rgba([71, 85, 105], 0.35)}" stroke-width="0.6">
          <path d="M 320 20 Q 380 60 360 120 Q 340 80 300 40 Z"/>
          <path d="M 0 220 Q 40 200 80 230 Q 50 250 20 270 Z"/>
        </g>
        <g opacity="0.35" stroke="${rgba([148, 163, 184], 0.5)}" fill="none" stroke-width="0.5">
          <path d="M 28 128 L 108 126 L 188 130 L 268 127 L 368 129"/>
          <circle cx="58" cy="128" r="2.5" fill="${rgba([110, 231, 255], 0.55)}" stroke="none"/>
          <circle cx="118" cy="127" r="2" fill="${rgba([148, 163, 184], 0.5)}" stroke="none"/>
          <circle cx="178" cy="128" r="2" fill="${rgba([148, 163, 184], 0.45)}" stroke="none"/>
          <circle cx="238" cy="127" r="2" fill="${rgba([148, 163, 184], 0.4)}" stroke="none"/>
        </g>
        <path d="M -20 210 Q 120 185 200 200 T 420 215" fill="none" stroke="${rgba([71, 85, 105], 0.3)}" stroke-width="1"/>
        <g opacity="0.2" fill="${rgba([110, 231, 255], 0.25)}">
          <circle cx="48" cy="72" r="1.2"/><circle cx="92" cy="48" r="0.8"/><circle cx="340" cy="220" r="1"/>
          <circle cx="310" cy="180" r="0.7"/><circle cx="28" cy="240" r="1.1"/>
        </g>
        ${holoStack(id)}
      </g>`;
  }

  /** Apex card — prism diagonal stripes + reticle (no filled disc washes) */
  function bgApex(id) {
    const i = (n) => `${id}_${n}`;
    return `
      <g class="laneBg laneBg--apex" ${bgClip(id)}>
        <g class="laneReticle" opacity="0.22" stroke="${rgba([59, 130, 246], 0.38)}" fill="none" stroke-width="0.5" stroke-dasharray="10 14 6 14">
          <circle cx="200" cy="150" r="100"/>
          <circle cx="200" cy="150" r="68"/>
          <circle cx="200" cy="150" r="36" opacity="0.45"/>
        </g>
        <line x1="200" y1="20" x2="200" y2="280" stroke="${rgba([110, 231, 255], 0.1)}" stroke-width="0.4"/>
        <line x1="30" y1="150" x2="370" y2="150" stroke="${rgba([110, 231, 255], 0.08)}" stroke-width="0.4"/>
        <g class="laneApexStripes" opacity="0.22" style="mix-blend-mode:screen">
          <path d="M -60 340 L 140 -50" stroke="url(#${i("holoFoil")})" stroke-width="36" stroke-linecap="round"/>
          <path d="M 60 340 L 260 -50" stroke="${rgba([167, 139, 250], 0.38)}" stroke-width="28" stroke-linecap="round"/>
          <path d="M 180 340 L 380 -50" stroke="${rgba([110, 231, 255], 0.28)}" stroke-width="22" stroke-linecap="round"/>
        </g>
        <g class="laneApexStripeFine" opacity="0.32">
          <path d="M -40 320 L 120 -40" stroke="${rgba([167, 139, 250], 0.18)}" stroke-width="2"/>
          <path d="M -38 318 L 118 -38" stroke="${rgba([236, 72, 153], 0.14)}" stroke-width="1" transform="translate(3,2)"/>
          <path d="M -42 322 L 122 -42" stroke="${rgba([110, 231, 255], 0.14)}" stroke-width="1" transform="translate(-2,-1)"/>
        </g>
        <radialGradient id="${i("bgApexBloom")}" cx="72%" cy="28%" r="45%">
          <stop offset="0%" stop-color="${rgba([167, 139, 250], 0.16)}"/>
          <stop offset="100%" stop-color="transparent"/>
        </radialGradient>
        <ellipse cx="280" cy="80" rx="90" ry="62" fill="url(#${i("bgApexBloom")})" opacity="0.4"/>
        ${holoStackApex(id)}
      </g>`;
  }

  /** Apex holo: stripe-forward; no idle vignette disc */
  function holoStackApex(id) {
    const i = (n) => `${id}_${n}`;
    return `
      <g class="laneHoloStackActive" clip-path="url(#${id}_cardClip)">
        <path class="laneHoloFoil" d="M -60 340 L 140 -50" stroke="url(#${i("holoFoil")})" stroke-width="32" stroke-linecap="round" fill="none" style="mix-blend-mode:screen;opacity:0.35"/>
        <path class="laneHoloShine" d="M -80 320 L 480 -40" stroke="url(#${i("holoSweep")})" stroke-width="18" stroke-linecap="round" fill="none" style="mix-blend-mode:screen;opacity:0.4"/>
      </g>`;
  }

  function bgGlitch(id) {
    const i = (n) => `${id}_${n}`;
    return `
      <g class="laneBg laneBg--glitch" ${bgClip(id)}>
        <radialGradient id="${i("markHalo")}" cx="50%" cy="52%" r="42%">
          <stop offset="0%" stop-color="${rgba([34, 211, 238], 0.07)}"/>
          <stop offset="55%" stop-color="${rgba([236, 72, 153], 0.03)}"/>
          <stop offset="100%" stop-color="transparent"/>
        </radialGradient>
        <ellipse cx="200" cy="158" rx="130" ry="95" fill="url(#${i("markHalo")})"/>
        <g opacity="0.16" fill="none" stroke="${rgba([34, 211, 238], 0.35)}" stroke-width="0.35">
          <line x1="0" y1="52" x2="400" y2="52"/><line x1="0" y1="98" x2="400" y2="98"/>
          <line x1="0" y1="148" x2="400" y2="148"/><line x1="0" y1="198" x2="400" y2="198"/>
          <line x1="0" y1="248" x2="400" y2="248"/>
        </g>
        <g class="laneHoloAnim" opacity="0.28" style="mix-blend-mode:screen">
          <rect x="-8" y="72" width="416" height="2" fill="${rgba([34, 211, 238], 0.2)}">
            <animate attributeName="x" values="-10;6;-10" dur="3.2s" repeatCount="indefinite"/>
          </rect>
          <rect x="4" y="156" width="416" height="1.5" fill="${rgba([236, 72, 153], 0.16)}">
            <animate attributeName="x" values="6;-4;6" dur="2.8s" repeatCount="indefinite"/>
          </rect>
          <rect x="-4" y="212" width="416" height="2" fill="${rgba([34, 211, 238], 0.14)}">
            <animate attributeName="x" values="-6;3;-6" dur="3.6s" repeatCount="indefinite"/>
          </rect>
        </g>
        <g opacity="0.2">
          <rect x="24" y="40" width="18" height="6" fill="${rgba([34, 211, 238], 0.35)}"/>
          <rect x="310" y="180" width="22" height="5" fill="${rgba([236, 72, 153], 0.3)}"/>
          <rect x="180" y="260" width="14" height="8" fill="${rgba([34, 211, 238], 0.25)}"/>
        </g>
        ${holoStack(id)}
      </g>`;
  }

  function bgArchitect(id) {
    const i = (n) => `${id}_${n}`;
    return `
      <g class="laneBg laneBg--architect" ${bgClip(id)}>
        <pattern id="${i("bp")}" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="${rgba([251, 191, 36], 0.09)}" stroke-width="0.45"/>
          <circle cx="12" cy="12" r="0.6" fill="${rgba([251, 191, 36], 0.12)}"/>
        </pattern>
        <ellipse cx="200" cy="150" rx="190" ry="140" fill="url(#${i("bp")})" opacity="0.22"/>
        <g opacity="0.3" stroke="${rgba([220, 220, 220], 0.22)}" fill="none" stroke-width="0.45">
          <circle cx="200" cy="150" r="100"/>
          <line x1="200" y1="22" x2="200" y2="278"/>
          <line x1="28" y1="150" x2="372" y2="150"/>
          <path d="M 48 252 L 352 48" stroke-dasharray="4 6"/>
          <path d="M 80 268 L 320 72" stroke-dasharray="2 8" opacity="0.5"/>
        </g>
        <g opacity="0.12" font-family="ui-monospace,monospace" font-size="7" fill="${rgba([251, 191, 36], 0.5)}">
          <text x="42" y="58">AV-DRAFT</text><text x="280" y="242">REV.04</text><text x="52" y="228">SCALE 1:1</text>
        </g>
        <g opacity="0.2" stroke="${rgba([251, 191, 36], 0.28)}" fill="none" stroke-width="0.45">
          <path d="M 340 0 L 400 0 L 400 72 L 365 48 Z"/>
          <path d="M 0 228 L 0 300 L 72 300 L 48 268 Z"/>
        </g>
        <radialGradient id="${i("warmHalo")}" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stop-color="${rgba([251, 191, 36], 0.06)}"/>
          <stop offset="100%" stop-color="transparent"/>
        </radialGradient>
        <ellipse cx="200" cy="150" rx="195" ry="140" fill="url(#${i("warmHalo")})"/>
        ${holoStack(id)}
      </g>`;
  }

  function markGradients(id, lane) {
    const i = (n) => `${id}_${n}`;
    const P = {
      core: {
        L: ["#7a8a9e", "#3d4654", "#1a2029"],
        Li: ["#9aacbe", "#5a6575", "#2a323c"],
        R: ["#4a5563", "#252d38", "#12161c"],
        Pk: ["#b8c5d6", "#5a6a7a"],
        ac: [110, 231, 255],
        ac2: [79, 209, 197],
      },
      shadow: {
        L: ["#7c8794", "#3f4a57", "#1f2833"],
        Li: ["#9ca3af", "#6b7280", "#374151"],
        R: ["#374151", "#1f2937", "#0f1419"],
        Pk: ["#d1d5db", "#6b7280"],
        ac: [110, 231, 255],
        ac2: [148, 163, 184],
      },
      apex: {
        L: ["#ffffff", "#e2e8f0", "#94a3b8"],
        Li: ["#ffffff", "#f8fafc", "#cbd5e1"],
        R: ["#475569", "#1e293b", "#0b1120"],
        Pk: ["#ffffff", "#64748b"],
        ac: [59, 130, 246],
        ac2: [167, 139, 250],
      },
      glitch: {
        L: ["#b8c5d4", "#7a8a9a", "#3f4f5f"],
        Li: ["#e0f2fe", "#94a3b8", "#64748b"],
        R: ["#4a5568", "#2d3748", "#141c26"],
        Pk: ["#f1f5f9", "#64748b"],
        ac: [34, 211, 238],
        ac2: [236, 72, 153],
      },
      architect: {
        L: ["#f5f5f4", "#d6d3d1", "#78716c"],
        Li: ["#ffffff", "#e7e5e4", "#a8a29e"],
        R: ["#292524", "#1c1917", "#0a0908"],
        Pk: ["#e7e5e4", "#57534e"],
        ac: [251, 191, 36],
        ac2: [245, 158, 11],
      },
    };
    const m = P[lane] || P.core;
    const ac = m.ac;
    return `
      <linearGradient id="${i("faceL")}" x1="15%" y1="0%" x2="85%" y2="100%">
        <stop offset="0%" stop-color="${m.L[0]}"/><stop offset="55%" stop-color="${m.L[1]}"/><stop offset="100%" stop-color="${m.L[2]}"/>
      </linearGradient>
      <linearGradient id="${i("faceInL")}" x1="20%" y1="5%" x2="80%" y2="95%">
        <stop offset="0%" stop-color="${m.Li[0]}"/><stop offset="100%" stop-color="${m.Li[2]}"/>
      </linearGradient>
      <linearGradient id="${i("faceR")}" x1="85%" y1="0%" x2="15%" y2="100%">
        <stop offset="0%" stop-color="${m.R[0]}"/><stop offset="50%" stop-color="${m.R[1]}"/><stop offset="100%" stop-color="${m.R[2]}"/>
      </linearGradient>
      <linearGradient id="${i("peak")}" x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stop-color="${m.Pk[0]}"/><stop offset="100%" stop-color="${m.Pk[1]}"/>
      </linearGradient>
      <linearGradient id="${i("edgeL")}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${rgba(ac, 0.75)}"/><stop offset="100%" stop-color="${rgba(ac, 0)}"/>
      </linearGradient>
      <linearGradient id="${i("edgeR")}" x1="100%" y1="0%" x2="0%" y2="0%">
        <stop offset="0%" stop-color="${rgba(ac, 0.2)}"/><stop offset="100%" stop-color="transparent"/>
      </linearGradient>
      <linearGradient id="${i("innerFace")}" x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stop-color="${m.Li[0]}"/><stop offset="100%" stop-color="${m.R[2]}"/>
      </linearGradient>
      <radialGradient id="${i("electric")}" cx="50%" cy="100%" r="65%">
        <stop offset="0%" stop-color="${rgba(m.ac2, 0.7)}"/><stop offset="50%" stop-color="${rgba(ac, 0.25)}"/><stop offset="100%" stop-color="transparent"/>
      </radialGradient>
      <linearGradient id="${i("orbitGrad")}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${rgba(ac, 0.95)}"/><stop offset="50%" stop-color="${rgba(m.ac2, 0.8)}"/><stop offset="100%" stop-color="${rgba(ac, 0.4)}"/>
      </linearGradient>
      <linearGradient id="${i("prismC")}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${rgba([167, 139, 250], 0.5)}"/><stop offset="50%" stop-color="transparent"/><stop offset="100%" stop-color="${rgba([110, 231, 255], 0.4)}"/>
      </linearGradient>
      <radialGradient id="${i("faceRad")}" cx="30%" cy="25%" r="75%">
        <stop offset="0%" stop-color="${m.Li[0]}"/><stop offset="55%" stop-color="${m.L[1]}"/><stop offset="100%" stop-color="${m.L[2]}"/>
      </radialGradient>
      ${
        lane === "apex"
          ? `
      <radialGradient id="${i("peakHot")}" cx="50%" cy="20%" r="85%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="45%" stop-color="${m.Pk[0]}"/>
        <stop offset="100%" stop-color="${m.Pk[1]}"/>
      </radialGradient>
      <radialGradient id="${i("innerHot")}" cx="50%" cy="28%" r="75%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="55%" stop-color="${m.Li[1]}"/>
        <stop offset="100%" stop-color="${m.R[2]}"/>
      </radialGradient>`
          : ""
      }`;
  }

  /** Layered premium chevron — hero-style depth: extrude, glow, z-order */
  function detailedMark(id, lane, opts) {
    const i = (n) => `${id}_${n}`;
    const sc = opts.scale || 1.12;
    const C = CHEVRON;
    const faceFilters = [];
    if (opts.bevelMark) faceFilters.push(`url(#${i("markBevel")})`);
    if (opts.prismMark) faceFilters.push(`url(#${i("prismEdge")})`);
    else if (opts.metalBrush !== false) faceFilters.push(`url(#${i("metalBrush")})`);
    const faceFilter = faceFilters.length ? `filter="${faceFilters.join(" ")}"` : "";
    const glitchFxAttr = opts.markGlitchStatic
      ? `class="laneMarkGlitchFx" data-glitch-filter="${i("markGlitchStatic")}"`
      : "";
    let svg = `<g class="laneMark laneMark--${lane}" transform="translate(200,154) scale(${sc})">`;

    const contactOpacity = opts.innerSubtle ? 0.45 : 0.75;
    svg += `<ellipse class="laneMarkContact" cx="0" cy="66" rx="54" ry="11" fill="rgba(0,0,0,0.45)" opacity="${contactOpacity}"/>`;

    if (opts.electricBase) {
      svg += `<ellipse cx="0" cy="58" rx="62" ry="14" fill="url(#${i("electric")})" opacity="0.55"/>`;
      svg += `<ellipse cx="0" cy="62" rx="38" ry="6" fill="${rgba([110, 231, 255], 0.14)}"/>`;
    }

    const bodyDrop = opts.markDrop ? ` filter="url(#${i("markDrop")})"` : "";
    svg += `<g class="laneMarkBody"${bodyDrop}>`;
    if (opts.markDisplace) {
      svg += `<g class="laneMarkDisplace" data-mark-displace="${i("markDisplace")}">`;
    }

    if (opts.orbitBack) {
      svg += `<path d="${C.orbit_glow}" fill="none" stroke="url(#${i("orbitGrad")})" stroke-width="9" stroke-linecap="round" opacity="0.25" filter="url(#${i("softGlow")})"/>`;
    }

    svg += `<g class="laneMarkExtrude" opacity="0.9">`;
    svg += `<path d="${C.L_body}" fill="#0a0e14" transform="translate(2.5,3.5)"/>`;
    svg += `<path d="${C.R_body}" fill="#06080c" transform="translate(2.5,3.5)"/>`;
    svg += `</g>`;

    svg += `<g class="laneMarkFaces">`;
    svg += `<g ${glitchFxAttr || `class="laneMarkFaceGroup"`} ${faceFilter}>`;

    if (opts.innerShadow) {
      svg += `<path d="M -8,20 L 0,8 L 8,20 L 6,58 L -6,58 Z" fill="rgba(0,0,0,0.5)" opacity="0.55"/>`;
    }

    svg += `<path d="${C.L_body}" fill="url(#${i("faceL")})"/>`;
    svg += `<path d="${C.L_face}" fill="url(#${i("faceRad")})" opacity="0.92"/>`;
    svg += `<path d="${C.L_body}" fill="none" stroke="url(#${i("edgeL")})" stroke-width="1.6" stroke-linejoin="round"/>`;
    svg += `<path d="${C.L_rim}" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="0.85" stroke-linecap="round"/>`;

    if (opts.electricFeet) {
      svg += `<path d="M -52,64 L -10,64" fill="none" stroke="${rgba([110, 231, 255], 0.6)}" stroke-width="2.2" filter="url(#${i("markGlow")})"/>`;
      svg += `<path d="M 10,64 L 52,64" fill="none" stroke="${rgba([110, 231, 255], 0.28)}" stroke-width="1.2"/>`;
    }

    if (opts.split) {
      const voidFill = opts.splitSoft ? "rgba(5,6,8,0.12)" : "rgba(5,6,8,0.55)";
      svg += `<path d="${C.split_void}" fill="${voidFill}"/>`;
    }

    if (opts.orbit) {
      svg += `<path class="laneMarkOrbit" d="${C.orbit}" fill="none" stroke="url(#${i("orbitGrad")})" stroke-width="5.5" stroke-linecap="round" filter="url(#${i("markGlow")})"/>`;
    }

    svg += `<path d="${C.R_body}" fill="url(#${i("faceR")})"/>`;
    svg += `<path d="${C.R_face}" fill="url(#${i("faceR")})" opacity="0.38"/>`;
    svg += `<path d="${C.R_body}" fill="none" stroke="url(#${i("edgeR")})" stroke-width="1"/>`;
    svg += `<path d="${C.R_rim}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="0.7" stroke-linecap="round"/>`;

    if (opts.apexBeacon) {
      svg += `<ellipse cx="0" cy="2" rx="28" ry="20" fill="url(#${i("innerHot")})" opacity="0.35"/>`;
    }

    if (opts.innerChevron) {
      const innerFill = opts.apexBeacon ? `url(#${i("innerHot")})` : `url(#${i("innerFace")})`;
      const innerGlow = opts.innerSubtle ? "" : ` filter="url(#${i("markGlowStrong")})"`;
      const innerGroupOp = opts.innerSubtle ? 0.52 : 1;
      svg += `<g class="laneMarkInner" opacity="${innerGroupOp}">`;
      svg += `<path d="${C.inner}" fill="${innerFill}"${innerGlow}/>`;
      const rimOp = opts.innerSubtle ? 0.28 : 0.48;
      const rimW = opts.innerSubtle ? 0.55 : 0.8;
      svg += `<path d="${C.inner_rim}" fill="none" stroke="rgba(255,255,255,${rimOp})" stroke-width="${rimW}"/>`;
      if (!opts.innerSubtle) {
        svg += `<path d="${C.inner}" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="0.55" transform="translate(0,-1)"/>`;
      }
      if (opts.hotInner) {
        svg += `<path d="${C.inner}" fill="rgba(255,255,255,0.28)" filter="url(#${i("markGlowStrong")})"/>`;
        svg += `<path d="${C.peak_cap}" fill="rgba(255,255,255,0.15)" transform="translate(0,44) scale(1.6)" opacity="0.5"/>`;
      }
      svg += `</g>`;
    }

    const peakFill = opts.apexBeacon ? `url(#${i("peakHot")})` : `url(#${i("peak")})`;
    const peakGlow = opts.innerSubtle ? "" : ` filter="url(#${i("markGlowStrong")})"`;
    svg += `<path d="${C.peak}" fill="${peakFill}"${peakGlow}/>`;
    if (!opts.specularHigh) {
      svg += `<path d="${C.peak_cap}" fill="rgba(255,255,255,0.32)"/>`;
    }

    if (opts.prismRim) {
      svg += `<path d="${C.L_body}" fill="none" stroke="url(#${i("prismC")})" stroke-width="1.3" transform="translate(-1.2,-0.8)" opacity="0.8"/>`;
      svg += `<path d="${C.R_body}" fill="none" stroke="url(#${i("prismC")})" stroke-width="1.05" transform="translate(1,0.6)" opacity="0.6"/>`;
    }

    if (opts.specularHigh) {
      svg += `<path d="${C.L_body}" fill="none" stroke="rgba(255,255,255,0.38)" stroke-width="0.7" transform="translate(-1,-1.5)"/>`;
      svg += `<path d="${C.L_rim}" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="1.2" stroke-linecap="round"/>`;
      svg += `<path d="${C.peak_cap}" fill="rgba(255,255,255,0.5)"/>`;
      if (opts.apexBeacon) {
        svg += `<path d="${C.peak_cap}" fill="rgba(255,255,255,0.35)" transform="translate(0,-1.5) scale(1.08)"/>`;
        svg += `<path d="${C.L_face}" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="0.5"/>`;
      }
    }

    if (opts.architectTicks) {
      svg += `<g opacity="0.4" stroke="${rgba([251, 191, 36], 0.45)}" stroke-width="0.45">
        <line x1="-52" y1="20" x2="-48" y2="24"/><line x1="48" y2="24" x2="52" y2="20"/>
        <line x1="-4" y1="-50" x2="4" y2="-50"/>
      </g>`;
    }

    svg += `</g></g>`;

    if (opts.glitchSlices) {
      const gl = (n) => `${id}_${n}`;
      svg += `<g class="laneGlitchSlices" filter="url(#${gl("glitch")})" opacity="0.38">`;
      svg += `<rect x="-58" y="-46" width="116" height="3" fill="${rgba([34, 211, 238], 0.45)}" transform="translate(5,0)"/>`;
      svg += `<rect x="-58" y="-32" width="116" height="2" fill="${rgba([236, 72, 153], 0.35)}" transform="translate(-5,0)"/>`;
      svg += `<rect x="-58" y="-16" width="116" height="3" fill="${rgba([34, 211, 238], 0.38)}" transform="translate(-6,0)"/>`;
      svg += `<rect x="-58" y="2" width="116" height="2" fill="${rgba([236, 72, 153], 0.32)}" transform="translate(4,0)"/>`;
      svg += `<rect x="-58" y="14" width="116" height="3" fill="${rgba([34, 211, 238], 0.3)}" transform="translate(4,0)"/>`;
      svg += `<rect x="-58" y="28" width="116" height="2" fill="${rgba([236, 72, 153], 0.26)}" transform="translate(-3,0)"/>`;
      svg += `<rect x="-58" y="38" width="116" height="2" fill="${rgba([34, 211, 238], 0.24)}" transform="translate(3,0)"/>`;
      svg += `</g>`;
    }

    if (opts.spine) {
      svg += `<line x1="0" y1="-48" x2="0" y2="64" stroke="${rgba([251, 191, 36], 0.16)}" stroke-width="0.65"/>`;
    }

    if (opts.markDisplace) svg += `</g>`;
    svg += `</g></g>`;
    return svg;
  }

  /** Shared leg geometry — soft center void on non-hero lanes */
  const BASE_MARK = { split: true, splitSoft: true, markDrop: false };

  /** Subtle inner triangle (Core / Shadow / Architect) */
  const INNER_SUBTLE = { innerChevron: true, innerSubtle: true };

  /** Apex / Glitch hero mark */
  const APEX_MARK = {
    split: true,
    splitSoft: false,
    markDrop: true,
    innerChevron: true,
    prismRim: true,
    specularHigh: true,
    hotInner: true,
  };

  function markCore(id) {
    return detailedMark(id, "core", {
      ...BASE_MARK,
      ...INNER_SUBTLE,
      electricBase: true,
      electricFeet: true,
      prismMark: false,
      scale: 1.14,
    });
  }
  function markShadow(id) {
    return detailedMark(id, "shadow", {
      ...BASE_MARK,
      ...INNER_SUBTLE,
      innerShadow: true,
      prismMark: false,
      metalBrush: true,
      scale: 1.13,
    });
  }
  function markApex(id) {
    return detailedMark(id, "apex", {
      split: true,
      splitSoft: false,
      markDrop: false,
      innerChevron: true,
      innerSubtle: true,
      hotInner: false,
      prismRim: true,
      specularHigh: true,
      prismMark: true,
      bevelMark: true,
      apexBeacon: false,
      scale: 1.08,
    });
  }
  function markGlitch(id) {
    return detailedMark(id, "glitch", {
      ...APEX_MARK,
      split: true,
      orbit: true,
      orbitBack: true,
      glitchSlices: true,
      markGlitchStatic: true,
      markDisplace: true,
      prismMark: true,
      scale: 1.13,
    });
  }
  function markArchitect(id) {
    return detailedMark(id, "architect", {
      ...BASE_MARK,
      ...INNER_SUBTLE,
      spine: true,
      architectTicks: true,
      prismMark: false,
      scale: 1.12,
    });
  }

  const LANES = {
    core: { bg: bgCore, mark: markCore },
    shadow: { bg: bgShadow, mark: markShadow },
    apex: { bg: bgApex, mark: markApex },
    glitch: { bg: bgGlitch, mark: markGlitch },
    architect: { bg: bgArchitect, mark: markArchitect },
  };

  function collectionLaneSvg(laneId, uid) {
    const lane = String(laneId || "core").toLowerCase();
    const spec = LANES[lane] || LANES.core;
    const p = uid || `cl_${lane}`;

    return `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" class="laneMarkSvg laneMarkSvg--${lane}" preserveAspectRatio="xMidYMid meet" clip-path="url(#${p}_cardClip)" aria-hidden="true">
      <defs>
        ${defsBlock(p, lane)}
        ${markGradients(p, lane)}
      </defs>
      ${laneAtmosphere(p, lane)}
      ${spec.bg(p)}
      <g class="laneMarkParallax">${spec.mark(p)}</g>
    </svg>`;
  }

  function wrapLaneVisual(svgHtml) {
    return `<div class="doorScene"><div class="doorVisual"><div class="doorNoise" aria-hidden="true"></div><div class="doorHolo" aria-hidden="true"></div>${svgHtml}</div></div>`;
  }

  function mountCollectionDoorSvgs(root) {
    const scope = root || document;
    scope.querySelectorAll(".doorArtSvg[data-door-svg-lane]").forEach((el) => {
      const lane = el.getAttribute("data-door-svg-lane");
      if (!lane) return;
      el.innerHTML = wrapLaneVisual(collectionLaneSvg(lane, `door_${lane}`));
    });
    initCollectionDoorHolo(scope);
  }

  /** Hover-only shine + parallax (mirrors hero card behavior) */
  function initCollectionDoorHolo(root) {
    const scope = root || document;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const maxTilt = 9;

    scope.querySelectorAll(".collectionDoor.hasArt, #collectionViewHero").forEach((container) => {
      if (container.dataset.doorHoloBound === "1") return;
      const visual = container.querySelector(".doorVisual");
      if (!visual) return;
      container.dataset.doorHoloBound = "1";

      const holo = visual.querySelector(".doorHolo");
      const svg = visual.querySelector(".laneMarkSvg");
      const displaceEl = svg?.querySelector("[data-mark-displace]");
      const glitchFxEl = svg?.querySelector("[data-glitch-filter]");
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let pointerActive = false;
      let raf = null;

      function setMarkDisplace(active) {
        if (!displaceEl || reducedMotion) return;
        const fid = displaceEl.getAttribute("data-mark-displace");
        displaceEl.style.filter = active && fid ? `url(#${fid})` : "none";
      }

      function setGlitchFx(active) {
        if (!glitchFxEl || reducedMotion) return;
        const fid = glitchFxEl.getAttribute("data-glitch-filter");
        const base = glitchFxEl.getAttribute("data-base-filter");
        if (active && fid) {
          glitchFxEl.style.filter = `url(#${fid})`;
        } else if (base) {
          glitchFxEl.style.filter = `url(#${base})`;
        } else {
          glitchFxEl.style.filter = "none";
        }
      }

      function applyTilt(rotateX, rotateY, holoX, holoY, phase, holoNormX, holoNormY) {
        visual.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        if (holo) holo.style.transform = `translate(${holoX}px, ${holoY}px)`;
        const px = holoNormX != null ? holoNormX : 0.5;
        const py = holoNormY != null ? holoNormY : 0.5;
        visual.style.setProperty("--holo-phase", String(phase));
        visual.style.setProperty("--holo-x", String(px));
        visual.style.setProperty("--holo-y", String(py));
        if (svg) {
          svg.style.setProperty("--holo-phase", String(phase));
          svg.style.setProperty("--holo-x", String(px));
          svg.style.setProperty("--holo-y", String(py));
        }
      }

      function updateFromPointer(clientX, clientY) {
        const rect = container.getBoundingClientRect();
        const nx = rect.width ? clamp((clientX - rect.left) / rect.width, 0, 1) : 0.5;
        const ny = rect.height ? clamp((clientY - rect.top) / rect.height, 0, 1) : 0.5;
        const tiltX = (ny - 0.5) * -maxTilt;
        const tiltY = (nx - 0.5) * maxTilt + 2;
        const holoX = (0.5 - nx) * 48;
        const holoY = (0.5 - ny) * 48;
        applyTilt(tiltX, tiltY, holoX, holoY, nx, nx, ny);
      }

      function onLeave() {
        pointerActive = false;
        container.classList.remove("is-door-active");
        setMarkDisplace(false);
        setGlitchFx(false);
        applyTilt(0, 0, 0, 0, 0.5, 0.5, 0.5);
      }

      if (glitchFxEl) {
        const bf = glitchFxEl.getAttribute("filter");
        if (bf && bf.includes("url(#")) {
          const m = bf.match(/url\(#([^)]+)\)/);
          if (m) glitchFxEl.setAttribute("data-base-filter", m[1]);
        }
      }

      container.addEventListener("mouseenter", () => {
        pointerActive = true;
        container.classList.add("is-door-active");
        setMarkDisplace(true);
        setGlitchFx(true);
      });
      container.addEventListener("mouseleave", onLeave);
      container.addEventListener("mousemove", (e) => {
        if (!pointerActive) return;
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => updateFromPointer(e.clientX, e.clientY));
      });
      container.addEventListener("touchstart", (e) => {
        pointerActive = true;
        container.classList.add("is-door-active");
        setMarkDisplace(true);
        setGlitchFx(true);
        if (e.touches.length) updateFromPointer(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: true });
      container.addEventListener("touchmove", (e) => {
        if (e.touches.length) updateFromPointer(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: true });
      container.addEventListener("touchend", onLeave);
      container.addEventListener("touchcancel", onLeave);

      applyTilt(0, 0, 0, 0, 0.5, 0.5, 0.5);
    });
  }

  function mountCollectionPageArt(laneId, targetEl) {
    if (!targetEl || !laneId) return;
    const lane = String(laneId).toLowerCase();
    const hero = targetEl.closest("#collectionViewHero");
    if (hero) {
      delete hero.dataset.doorHoloBound;
      hero.setAttribute("data-lane", lane);
    }
    targetEl.innerHTML = wrapLaneVisual(collectionLaneSvg(lane, `cv_${lane}`));
    initCollectionDoorHolo(hero || targetEl);
  }

  global.collectionLaneSvg = collectionLaneSvg;
  global.mountCollectionDoorSvgs = mountCollectionDoorSvgs;
  global.initCollectionDoorHolo = initCollectionDoorHolo;
  global.mountCollectionPageArt = mountCollectionPageArt;
})(typeof window !== "undefined" ? window : globalThis);
