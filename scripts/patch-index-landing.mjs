/**
 * One-shot patch: collection-first landing on store/index.html
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const indexPath = path.join(root, "store", "index.html");
const pagesPath = path.join(root, "store", "av_gear_shop_pages.html");

let html = fs.readFileSync(indexPath, "utf8");
const pages = fs.readFileSync(pagesPath, "utf8");

// Fix accidental React syntax
html = html.replace(/<motion\.div className="note">/g, '<motion.div class="note">');
html = html.replace(/<motion\.motion\.div/g, "<motion.div");
html = html.replace(/<motion\.div className="note">/g, '<div class="note">');
html = html.replace(/<motion\.motion\.div class="note">/g, '<div class="note">');
html = html.replace(/<motion\.div class="note">/g, '<div class="note">');

// Remove hero-inline catalog controls (moved into hidden catalog section)
html = html.replace(
  /(\s*<div class="heroRow">[\s\S]*?<\/motion\.div>\s*<\/div>\s*)\s*<div class="controls" aria-label="Store controls">[\s\S]*?<div id="tagChips"[^>]*><\/div>\s*/,
  `$1
          <div class="heroStats" aria-label="Collection lanes">
            <div class="heroStat"><b>Core</b><span>Clean essentials and disciplined marks.</span></div>
            <div class="heroStat"><b>Glitch</b><span>Signal interference and tech-forward art.</span></div>
            <div class="heroStat"><b>Apex</b><span>Emblem-led identity pieces.</span></div>
          </div>

`
);

// Fix note tag if still broken
html = html.replace(
  /<motion\.div class="note">([\s\S]*?)<\/div>/,
  '<div class="note">$1</div>'
);

// Extract landing + catalog + footer from pages (apparel copy tweaks)
const landingStart = pages.indexOf('<section class="landingSection" id="collectionsLanding">');
const landingEnd = pages.indexOf('<footer class="foot">', landingStart);
if (landingStart < 0 || landingEnd < 0) throw new Error("Could not find landing block in pages file");

let landing = pages.slice(landingStart, landingEnd);
landing = landing
  .replace(/gear vault/gi, "curated storefront")
  .replace(/Browse All Gear/g, "Browse All Apparel")
  .replace(/Full catalog mode: search, filter by collection, and open product pages without losing the landing-page brand flow\./,
    "Full catalog: search, filter by collection, and open product pages when you are ready.")
  .replace(/Grab the vault\./g, "Open the full catalog.")
  .replace(/Browse All Gear when/g, "Browse All Apparel when");

// Collection page background images
landing = landing.replace(
  'id="page-core" style="--pageGlow:rgba(110,231,255,.12)"',
  'id="page-core" style="--pageGlow:rgba(110,231,255,.12);--pageBg:url(./img/AeroVista_GoldCore_PrintReady_Transparent_HiRes.png)"'
);
landing = landing.replace(
  'id="page-shadow" style="--pageGlow:rgba(148,163,184,.13)"',
  'id="page-shadow" style="--pageGlow:rgba(148,163,184,.13);--pageBg:url(./img/aerovista_A_ultra_600dpi.png)"'
);
landing = landing.replace(
  'id="page-apex" style="--pageGlow:rgba(59,130,246,.14)"',
  'id="page-apex" style="--pageGlow:rgba(59,130,246,.14);--pageBg:url(./img/aerovista_ultra_detail_600dpi.png)"'
);
landing = landing.replace(
  'id="page-glitch" style="--pageGlow:rgba(34,211,238,.13)"',
  'id="page-glitch" style="--pageGlow:rgba(34,211,238,.13);--pageBg:url(./img/2026-4-14__4-11-44__file_00000000567071f596baf080b322b9e6.webp)"'
);
landing = landing.replace(
  'id="page-architect" style="--pageGlow:rgba(251,191,36,.12)"',
  'id="page-architect" style="--pageGlow:rgba(251,191,36,.12);--pageBg:url(./img/adrafted.png)"'
);

// Door art paths -> img/
landing = landing.replace(/src="\.\/([^"]+)"/g, (m, file) => {
  if (file.startsWith("img/")) return m;
  return `src="./img/${file}"`;
});

// Insert landing before productsSection (replace old bare products section)
html = html.replace(
  /\s*<section id="productsSection">[\s\S]*?<\/section>\s*(?=<footer class="foot">)/,
  `\n${landing}\n`
);

// Nav JS: reveal catalog instead of scroll-only grid
const navOld = `$("#scrollToProducts").onclick = ()=> $("#productsSection").scrollIntoView({ behavior:"smooth", block:"start" });
    $("#homeLink").onclick = (e)=>{ e.preventDefault(); window.scrollTo({top:0, behavior:"smooth"}); };`;

const navNew = `function revealCatalog(opts = {}){
      const sec = $("#productsSection");
      if(!sec) return;
      sec.classList.remove("is-hidden");
      if(opts.collection){ state.collection = opts.collection; setActiveCollection(opts.collection); }
      if(typeof opts.search === "string"){
        state.search = opts.search;
        const searchEl = $("#search");
        if(searchEl) searchEl.value = opts.search;
      }
      if(opts.cat){ state.cat = opts.cat; setActiveChip(opts.cat); }
      renderGrid();
      sec.scrollIntoView({ behavior:"smooth", block:"start" });
    }
    function hideCatalog(){ const sec = $("#productsSection"); if(sec) sec.classList.add("is-hidden"); }
    $("#scrollToProducts").onclick = ()=> revealCatalog();
    const footerBrowseBtn = $("#footerBrowseBtn"); if(footerBrowseBtn) footerBrowseBtn.onclick = ()=> revealCatalog();
    const exploreCollectionsBtn = $("#exploreCollectionsBtn"); if(exploreCollectionsBtn) exploreCollectionsBtn.onclick = ()=> $("#collectionsLanding").scrollIntoView({ behavior:"smooth", block:"start" });
    const hideCatalogBtn = $("#hideCatalogBtn"); if(hideCatalogBtn) hideCatalogBtn.onclick = hideCatalog;
    $$('[data-landing-collection]').forEach(el => { el.onclick = () => revealCatalog({ collection: el.getAttribute('data-landing-collection') || 'all' }); });
    $$('[data-landing-search]').forEach(el => { el.onclick = () => revealCatalog({ search: el.getAttribute('data-landing-search') || '' }); });
    $$('[data-page-target]').forEach(el => { el.onclick = () => { const target = document.getElementById(el.getAttribute('data-page-target') || ''); if(target) target.scrollIntoView({ behavior:'smooth', block:'start' }); }; });
    $("#homeLink").onclick = (e)=>{ e.preventDefault(); hideCatalog(); window.scrollTo({top:0, behavior:"smooth"}); };`;

if (html.includes(navOld)) {
  html = html.replace(navOld, navNew);
} else if (!html.includes("function revealCatalog")) {
  html = html.replace(
    /\$\("#scrollToProducts"\)\.onclick[\s\S]*?\$\("#homeLink"\)\.onclick[\s\S]*?;\s*;/,
    navNew
  );
}

// Extra CSS from pages if missing
const extraCss = `
    .doorTop,.doorBottom{ position:relative; z-index:1; }
    .pageBullets{ display:grid; grid-template-columns:1fr; gap:8px; margin-top:14px; }
    @media (min-width:650px){ .pageBullets{ grid-template-columns:1fr 1fr; } }
    .pageBullet{ border:1px solid rgba(255,255,255,.09); background:rgba(0,0,0,.16); border-radius:14px; padding:10px; font-size:13px; color:var(--muted); line-height:1.35; }
    .pageBullet b{ display:block; color:var(--text); margin-bottom:3px; }
    .pageNameExamples{ margin-top:14px; display:flex; flex-wrap:wrap; gap:8px; }
    .nameChip{ font-family:var(--mono); font-size:11px; color:rgba(231,237,246,.8); border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.03); border-radius:999px; padding:7px 9px; }
    .signalLabGrid{ display:grid; grid-template-columns:repeat(12,1fr); gap:12px; }
    .signalCard{ grid-column:span 12; border:1px dashed rgba(255,255,255,.14); background:rgba(255,255,255,.018); border-radius:20px; padding:15px; position:relative; overflow:hidden; }
    .signalCard:before{ content:""; position:absolute; inset:-2px; background:radial-gradient(300px 180px at 0% 0%, rgba(251,191,36,.09), transparent 60%); pointer-events:none; }
    .signalCard > *{ position:relative; z-index:1; }
    .signalCard .status{ display:inline-flex; font-family:var(--mono); font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:rgba(251,191,36,.9); border:1px solid rgba(251,191,36,.18); border-radius:999px; padding:5px 8px; background:rgba(251,191,36,.06); }
    .signalCard h3{ margin:10px 0 0; font-size:17px; }
    .signalCard p{ margin:8px 0 0; color:var(--muted); font-size:13px; line-height:1.42; }
    @media (min-width:760px){ .signalCard{ grid-column:span 6; } }
    @media (min-width:1040px){ .signalCard{ grid-column:span 3; } }
`;

if (!html.includes(".signalLabGrid")) {
  html = html.replace(/\s*\/\* Grid \*\//, `${extraCss}\n\n    /* Grid */`);
}

fs.writeFileSync(indexPath, html, "utf8");
console.log("Patched", indexPath);
