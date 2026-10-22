(function catalogControlUi() {
  "use strict";

  const model = window.AVCatalogControlModel;
  const squareImport = window.AVCatalogSquareImport;
  const config = window.CATALOG_CONSOLE_CONFIG || {};
  if (!model || !squareImport) {
    console.error("Catalog Control UI dependencies are unavailable.");
    return;
  }

  const state = {
    authorityStatus: null,
    authorityCatalog: { products: [] },
    authorityEtag: null,
    providerImport: null,
    providerFileName: "",
    providerReview: null,
    distributionStatus: null,
    distribution: null,
    distributionEtag: null,
    distributionDirty: false,
    distributionHistory: null,
    preview: null,
    generated: null,
    activeDestinationId: null,
    productSearch: "",
    busy: false,
    message: null,
  };

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function jsonClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function products() {
    return Array.isArray(state.authorityCatalog?.products) ? state.authorityCatalog.products : [];
  }

  function variants() {
    const rows = [];
    for (const product of products()) {
      for (const variant of Array.isArray(product?.variants) ? product.variants : []) {
        rows.push({ product, variant, ref: `${product.id}::${variant.id}` });
      }
    }
    return rows;
  }

  function destinations() {
    const api = state.distributionStatus?.destinations;
    const source = Array.isArray(api) && api.length ? api : (config.destinations || []);
    return model.favoriteFirst(source);
  }

  function activeDestination() {
    const list = destinations();
    if (!state.activeDestinationId || !list.some((item) => item.id === state.activeDestinationId)) {
      state.activeDestinationId = list[0]?.id || null;
    }
    return list.find((item) => item.id === state.activeDestinationId) || null;
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      credentials: "same-origin",
      cache: "no-store",
      ...options,
      headers: {
        accept: "application/json",
        ...(options.body ? { "content-type": "application/json" } : {}),
        ...(options.headers || {}),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || `${response.status} ${response.statusText}`);
      error.status = response.status;
      error.code = data.code || "request_failed";
      error.details = data.details || null;
      throw error;
    }
    return data;
  }

  function setMessage(text, kind = "info") {
    state.message = text ? { text, kind } : null;
    renderMessage();
  }

  function renderMessage() {
    const node = document.getElementById("catalogControlMessage");
    if (!node) return;
    if (!state.message) {
      node.innerHTML = "";
      node.classList.add("hide");
      return;
    }
    node.classList.remove("hide");
    node.className = `ccMessage ${state.message.kind}`;
    node.textContent = state.message.text;
  }

  function setBusy(value) {
    state.busy = Boolean(value);
    document.querySelectorAll("#tab-catalog-control button, #tab-catalog-control input, #tab-catalog-control select, #tab-catalog-control textarea")
      .forEach((element) => {
        if (element.dataset.keepEnabled === "true") return;
        element.disabled = state.busy;
      });
  }

  function injectStyles() {
    if (document.getElementById("catalog-control-styles")) return;
    const style = document.createElement("style");
    style.id = "catalog-control-styles";
    style.textContent = `
      #tab-catalog-control{display:block}
      #tab-catalog-control.hide{display:none!important}
      .ccHero{padding:18px;background:linear-gradient(135deg,rgba(0,229,255,.08),rgba(157,184,255,.05));border:1px solid rgba(0,229,255,.2);border-radius:18px}
      .ccGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
      .ccTwo{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px}
      .ccCard{border:1px solid rgba(255,255,255,.11);border-radius:16px;background:rgba(255,255,255,.03);padding:14px}
      .ccCard.favorite{border-color:rgba(0,229,255,.26)}
      .ccCard.active{outline:2px solid rgba(0,229,255,.45);outline-offset:1px}
      .ccPhase{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--cyan);font-weight:800}
      .ccMessage{margin-top:12px;padding:11px 13px;border-radius:12px;border:1px solid rgba(255,255,255,.12)}
      .ccMessage.info{background:rgba(157,184,255,.08)}
      .ccMessage.ok{background:rgba(130,255,200,.08);border-color:rgba(130,255,200,.25)}
      .ccMessage.warn{background:rgba(255,224,138,.08);border-color:rgba(255,224,138,.25)}
      .ccMessage.bad{background:rgba(255,138,168,.08);border-color:rgba(255,138,168,.25)}
      .ccScroll{overflow:auto;max-height:420px;border:1px solid rgba(255,255,255,.08);border-radius:12px}
      .ccRow{display:grid;grid-template-columns:minmax(200px,1fr) minmax(130px,220px);gap:10px;align-items:center;padding:9px 10px;border-bottom:1px solid rgba(255,255,255,.07)}
      .ccRow:last-child{border-bottom:none}
      .ccCheck{display:flex;gap:8px;align-items:flex-start;padding:6px 0}
      .ccDestinations{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}
      .ccDestination{width:100%;text-align:left}
      .ccDestination .star{color:var(--warn)}
      .ccSet{margin-top:10px}
      .ccSetHead{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}
      .ccCode{font-family:var(--mono);font-size:11px;color:var(--muted);word-break:break-all}
      .ccManifest{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center}
      .ccPresentationRow{padding:12px;border-bottom:1px solid rgba(255,255,255,.07)}
      .ccPresentationRow:last-child{border-bottom:none}
      .ccPresentationFields{display:grid;grid-template-columns:minmax(180px,1.2fr) minmax(120px,.65fr) minmax(110px,.45fr) minmax(140px,.55fr);gap:8px;margin-top:10px}
      .ccPresentationDescription{grid-column:1/-1;min-height:70px;resize:vertical}
      .ccHistoryRow{display:grid;grid-template-columns:minmax(220px,1fr) auto;gap:12px;align-items:center;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.07)}
      .ccHistoryRow:last-child{border-bottom:none}
      .ccDangerNote{border-left:4px solid var(--warn);padding:10px 12px;background:rgba(255,224,138,.05);border-radius:12px}
      @media(max-width:900px){.ccTwo{grid-template-columns:1fr}.ccRow{grid-template-columns:1fr}.ccPresentationFields{grid-template-columns:1fr 1fr}.ccPresentationDescription{grid-column:1/-1}}
    `;
    document.head.appendChild(style);
  }

  function mount() {
    if (document.getElementById("tab-catalog-control")) return;
    injectStyles();

    const tabs = document.querySelector(".tabs");
    const toolbar = document.querySelector(".toolbar");
    if (!tabs || !toolbar) return;

    const button = document.createElement("button");
    button.className = "btn tab";
    button.dataset.tab = "catalog-control";
    button.textContent = "Catalog Control";
    button.title = "Canonical catalog authority and destination distribution";
    const editorButton = tabs.querySelector('[data-tab="editor"]');
    if (editorButton?.nextSibling) tabs.insertBefore(button, editorButton.nextSibling);
    else tabs.appendChild(button);

    const pane = document.createElement("section");
    pane.id = "tab-catalog-control";
    pane.className = "glass panel section tabpane hide";
    pane.innerHTML = `
      <div class="ccHero between">
        <div>
          <div class="ccPhase">Private AVCC control plane</div>
          <h2 class="h1" style="margin-top:5px">Canonical Catalog & Distribution</h2>
          <div class="muted small">Accept provider evidence into stable AeroVista product IDs, then distribute versioned subsets to Gear, Apparel, Horizon, Northline, and future apps.</div>
        </div>
        <div class="row"><button id="ccRefresh" class="btn primary">Refresh control plane</button></div>
      </div>
      <div id="catalogControlMessage" class="hide"></div>
      <div id="ccStatus" class="statusGrid section"></div>

      <div class="ccTwo section">
        <section class="ccCard">
          <div class="ccPhase">Phase 1</div>
          <div class="between"><div><h3 class="h2">Import & Accept</h3><div class="muted small">Square is provider evidence. Acceptance creates or preserves stable <code>avp_*</code> / <code>avv_*</code> identity.</div></div></div>
          <div class="section"><input id="ccProviderFile" class="field" type="file" accept=".xlsx,.xls,.xlsm,.csv" /></div>
          <div id="ccImportSummary" class="section"></div>
          <div class="row section"><button id="ccReviewImport" class="btn primary">Review provider import</button><button id="ccAcceptImport" class="btn">Accept reviewed import</button></div>
          <div id="ccReview" class="section"></div>
        </section>

        <section class="ccCard">
          <div class="ccPhase">Canonical authority</div>
          <div class="between"><div><h3 class="h2">Current AeroVista Catalog</h3><div class="muted small">Browser-safe catalog only. Provider mappings are never exposed here.</div></div></div>
          <div id="ccCanonicalSummary" class="row section"></div>
          <div id="ccCanonicalProducts" class="ccScroll section"></div>
        </section>
      </div>

      <section class="ccCard section">
        <div class="ccPhase">Phase 2</div>
        <div class="between">
          <div><h3 class="h2">Destination Distribution</h3><div class="muted small">Favorites are visual shortcuts only. Every destination uses the same catalog-generation path.</div></div>
          <div class="row"><button id="ccPreviewDistribution" class="btn">Preview</button><button id="ccSaveDistribution" class="btn primary">Save distribution</button><button id="ccGenerate" class="btn">Generate draft manifests</button></div>
        </div>
        <div class="ccDangerNote section"><b>No production publish action exists here.</b><div class="small muted">Generated manifests are draft/static artifacts. Publication and checkout activation remain separate gates.</div></div>
        <div id="ccDistributionSummary" class="row section"></div>
        <div id="ccDestinations" class="ccDestinations section"></div>
        <div class="ccTwo section">
          <div class="ccCard"><div class="between"><div><h4 class="h2">Reusable Product Sets</h4><div class="muted small">Build named groups once, then attach them to any destination.</div></div></div><div class="row section"><input id="ccNewSetName" class="field" style="max-width:320px" placeholder="e.g. Apparel Core"><button id="ccAddSet" class="btn">Add set</button></div><div id="ccProductSets"></div></div>
          <div class="ccCard"><h4 class="h2">Active Destination Rules</h4><div id="ccDestinationRules" class="section"></div></div>
        </div>
        <div class="section"><label class="tiny muted">Filter canonical products / variants</label><input id="ccProductSearch" class="field" placeholder="product, AV ID, SKU, size, color…"></div>
        <div class="ccCard section">
          <div class="between"><div><h4 class="h2">Destination Presentation Overrides</h4><div class="muted small">Add destination-only merchandising without cloning or renaming the canonical product. Draft manifests keep the canonical AV ID and carry these fields under <code>presentation</code>.</div></div><span class="chip">Canonical ID preserved</span></div>
          <div id="ccPresentationOverrides" class="ccScroll section"></div>
        </div>
        <div class="ccTwo section">
          <div class="ccCard"><h4 class="h2">Direct Product Exceptions</h4><div class="muted small">Inherit from product sets, force include, or force exclude.</div><div id="ccDirectProducts" class="ccScroll section"></div></div>
          <div class="ccCard"><h4 class="h2">Variant Overrides</h4><div class="muted small">Overrides are stored by canonical <code>productId::variantId</code>, never Square Token.</div><div id="ccVariantOverrides" class="ccScroll section"></div></div>
        </div>
        <div id="ccGenerated" class="section"></div>
      </section>

      <section class="ccCard section">
        <div class="ccPhase">Phase 3 · Safety</div>
        <div class="between"><div><h3 class="h2">Distribution History & Rollback</h3><div class="muted small">Review recoverable prior distribution states and restore one through the same current-catalog validation used by Save. Rollback changes control-plane metadata only.</div></div><span class="chip">No storefront publish</span></div>
        <div class="ccDangerNote section"><b>Rollback is ETag-protected and reversible.</b><div class="small muted">The current saved distribution is backed up before a historical revision replaces it. Unsaved editor changes are not part of that backup.</div></div>
        <div id="ccDistributionHistory" class="ccScroll section"></div>
      </section>
    `;
    toolbar.insertAdjacentElement("afterend", pane);

    button.onclick = () => activateTab();
    document.getElementById("ccRefresh").onclick = () => refreshAll(true);
    document.getElementById("ccProviderFile").onchange = (event) => loadProviderFile(event.target.files?.[0]);
    document.getElementById("ccReviewImport").onclick = () => reviewImport();
    document.getElementById("ccAcceptImport").onclick = () => acceptImport();
    document.getElementById("ccPreviewDistribution").onclick = () => previewDistribution();
    document.getElementById("ccSaveDistribution").onclick = () => saveDistribution();
    document.getElementById("ccGenerate").onclick = () => generateDraftManifests();
    document.getElementById("ccAddSet").onclick = () => addProductSet();
    document.getElementById("ccProductSearch").oninput = (event) => {
      state.productSearch = event.target.value || "";
      renderPresentationOverrides();
      renderDestinationEditors();
    };

    renderAll();
    refreshAll(false);
  }

  function activateTab() {
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === "catalog-control"));
    document.querySelectorAll(".tabpane").forEach((pane) => pane.classList.toggle("hide", pane.id !== "tab-catalog-control"));
    refreshAll(false);
  }

  async function loadProviderFile(file) {
    if (!file) return;
    try {
      setBusy(true);
      setMessage(`Reading ${file.name}…`);
      if (!window.XLSX) throw new Error("SheetJS is unavailable; reload the Console before importing.");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
      const headerIndex = rows.findIndex((row) => (row || []).some((cell) => String(cell || "").trim().toLowerCase() === "reference handle"));
      if (headerIndex < 0) throw new Error("Could not find the Square 'Reference Handle' header row.");
      state.providerImport = squareImport.normalizeSquareRows(rows.slice(headerIndex), { sourceName: file.name });
      state.providerFileName = file.name;
      state.providerReview = null;
      setMessage(`Loaded ${state.providerImport.summary.products} products and ${state.providerImport.summary.variants} variants from ${file.name}.`, "ok");
      renderImport();
    } catch (error) {
      state.providerImport = null;
      state.providerReview = null;
      setMessage(error.message || "Provider import could not be read.", "bad");
      renderImport();
    } finally {
      setBusy(false);
    }
  }

  async function reviewImport() {
    if (!state.providerImport) return setMessage("Load a Square export before reviewing it.", "warn");
    try {
      setBusy(true);
      const result = await api("/api/catalog-authority/provider-import/review", {
        method: "POST",
        body: JSON.stringify({ catalog: state.providerImport, provider: "square" }),
      });
      state.providerReview = result;
      const summary = model.reviewSummary(result.review);
      setMessage(
        summary.canApply
          ? `Review clean: ${summary.newProducts} new products, ${summary.newVariants} new variants, ${summary.changedEntities} changed entities.`
          : `Review has ${summary.conflicts} identity conflict(s). Acceptance remains blocked.`,
        summary.canApply ? "ok" : "bad",
      );
      renderImport();
    } catch (error) {
      state.providerReview = null;
      setMessage(error.message, "bad");
      renderImport();
    } finally {
      setBusy(false);
    }
  }

  async function acceptImport() {
    const review = state.providerReview;
    if (!state.providerImport || !review?.review?.canApply || !review?.etag) {
      return setMessage("Run a clean provider review before accepting the import.", "warn");
    }
    try {
      setBusy(true);
      const result = await api("/api/catalog-authority/provider-import", {
        method: "PUT",
        body: JSON.stringify({
          catalog: state.providerImport,
          provider: "square",
          expectedEtag: review.etag,
        }),
      });
      state.providerReview = null;
      setMessage(`Canonical catalog accepted: ${result.catalog.products.length} products. Stable AV IDs are now authoritative.`, "ok");
      await refreshAll(false);
    } catch (error) {
      setMessage(
        error.status === 409
          ? "Canonical catalog changed after review. Refresh and review the import again."
          : error.message,
        "bad",
      );
    } finally {
      setBusy(false);
    }
  }

  async function refreshAll(announce) {
    try {
      setBusy(true);
      const [authorityStatus, authorityCatalog, distributionStatus, distributionState, distributionHistory] = await Promise.all([
        api("/api/catalog-authority/status"),
        api("/api/catalog-authority/catalog"),
        api("/api/catalog-distribution/status"),
        api("/api/catalog-distribution"),
        api("/api/catalog-distribution/history"),
      ]);
      state.authorityStatus = authorityStatus;
      state.authorityCatalog = authorityCatalog.catalog || { products: [] };
      state.authorityEtag = authorityCatalog.etag || authorityStatus.etag || null;
      state.distributionStatus = distributionStatus;
      state.distributionEtag = distributionState.etag || null;
      state.distribution = model.normalizeDistribution(distributionState.distribution, destinations());
      state.distributionHistory = distributionHistory;
      state.distributionDirty = false;
      state.preview = null;
      state.generated = null;
      if (announce) setMessage("Catalog control state refreshed.", "ok");
      renderAll();
    } catch (error) {
      setMessage(error.message || "Catalog control state could not be loaded.", "bad");
    } finally {
      setBusy(false);
    }
  }

  function renderAll() {
    renderStatus();
    renderImport();
    renderCanonical();
    renderDistribution();
    renderDistributionHistory();
    renderMessage();
  }

  function renderStatus() {
    const node = document.getElementById("ccStatus");
    if (!node) return;
    const authority = state.authorityStatus;
    const distribution = state.distributionStatus;
    const cards = [
      ["Canonical authority", authority?.exists ? `${authority.productCount} products · ${authority.variantCount} variants` : "Awaiting first accepted import", authority?.exists],
      ["Distribution state", distribution?.exists ? `Saved · ${distribution.destinations?.length || 0} destinations` : "Not saved yet", Boolean(distribution?.exists)],
      ["Catalog source", distribution?.catalogSource || "canonical-authority", distribution?.catalogSource === "canonical-authority"],
      ["Publication", "Separate gate · no auto-publish", true],
    ];
    node.innerHTML = cards.map(([label, value, ok]) => `<div class="glass panel"><div class="muted tiny">${esc(label)}</div><b class="${ok ? "ok" : "warn"}">${esc(value)}</b></div>`).join("");
  }

  function renderImport() {
    const summaryNode = document.getElementById("ccImportSummary");
    const reviewNode = document.getElementById("ccReview");
    const acceptButton = document.getElementById("ccAcceptImport");
    if (!summaryNode || !reviewNode || !acceptButton) return;

    if (!state.providerImport) {
      summaryNode.innerHTML = '<div class="muted small">Load the latest Square XLSX/CSV to begin. Nothing is written during file load or review.</div>';
    } else {
      const s = state.providerImport.summary;
      summaryNode.innerHTML = `<div class="row">${[
        `Source: ${state.providerFileName}`,
        `Products: ${s.products}`,
        `Variants: ${s.variants}`,
        `Identity review: ${s.unresolvedProducts}`,
        `Warnings: ${s.warnings}`,
      ].map((value) => `<span class="chip">${esc(value)}</span>`).join("")}</div>${
        state.providerImport.warnings?.length
          ? `<div class="issue warnline section"><b>Import warnings</b><div class="small muted">${state.providerImport.warnings.slice(0, 8).map((warning) => esc(`${warning.code}${warning.row ? ` · row ${warning.row}` : ""}${warning.itemName ? ` · ${warning.itemName}` : ""}`)).join("<br>")}${state.providerImport.warnings.length > 8 ? "<br>…" : ""}</div></div>`
          : ""
      }`;
    }

    const result = state.providerReview;
    acceptButton.disabled = state.busy || !result?.review?.canApply;
    if (!result) {
      reviewNode.innerHTML = '<div class="muted small">Review compares provider evidence against the current canonical authority without writing anything.</div>';
      return;
    }

    const s = model.reviewSummary(result.review);
    reviewNode.innerHTML = `<div class="row">${[
      `Matched: ${s.matchedProducts}`,
      `New products: ${s.newProducts}`,
      `New variants: ${s.newVariants}`,
      `Changes: ${s.changedEntities}`,
      `Provider-missing products: ${s.missingProviderProducts}`,
      `Provider-missing variants: ${s.missingProviderVariants}`,
      `Conflicts: ${s.conflicts}`,
    ].map((value) => `<span class="chip ${s.conflicts && value.startsWith("Conflicts") ? "pillRed" : ""}">${esc(value)}</span>`).join("")}</div>
      ${result.review.conflicts?.length ? `<div class="issue section"><b>Identity conflicts</b><div class="small muted">${result.review.conflicts.slice(0, 12).map((item) => esc(item.message || item.code || JSON.stringify(item))).join("<br>")}</div></div>` : ""}
      <div class="small ${s.canApply ? "ok" : "warn"} section">${s.canApply ? "Clean review. Accept uses this exact canonical ETag." : "Acceptance blocked until identity conflicts are resolved."}</div>`;
  }

  function renderCanonical() {
    const summary = document.getElementById("ccCanonicalSummary");
    const list = document.getElementById("ccCanonicalProducts");
    if (!summary || !list) return;
    const catalogProducts = products();
    const variantCount = catalogProducts.reduce((count, product) => count + (product.variants?.length || 0), 0);
    summary.innerHTML = [
      `Products: ${catalogProducts.length}`,
      `Variants: ${variantCount}`,
      `ETag: ${state.authorityEtag ? state.authorityEtag.slice(0, 12) : "—"}`,
    ].map((value) => `<span class="chip">${esc(value)}</span>`).join("");
    list.innerHTML = catalogProducts.length
      ? catalogProducts.map((product) => `<div class="ccRow"><div><b>${esc(product.name || product.id)}</b><div class="ccCode">${esc(product.id)}</div></div><div class="small muted">${product.variants?.length || 0} variants</div></div>`).join("")
      : '<div class="panel muted small">No accepted canonical catalog yet.</div>';
  }

  function ensureDistribution() {
    if (!state.distribution) state.distribution = model.emptyDistribution(destinations());
    return state.distribution;
  }

  function markDistribution(next) {
    state.distribution = next;
    state.distributionDirty = true;
    state.preview = null;
    state.generated = null;
    renderDistribution();
  }

  function renderDistribution() {
    ensureDistribution();
    renderDistributionSummary();
    renderDestinations();
    renderProductSets();
    renderDestinationRules();
    renderPresentationOverrides();
    renderDestinationEditors();
    renderGenerated();
  }

  function renderDistributionSummary() {
    const node = document.getElementById("ccDistributionSummary");
    if (!node) return;
    const preview = state.preview;
    const values = [
      state.distributionDirty ? "Unsaved changes" : (state.distributionStatus?.exists ? "Saved state" : "New state"),
      `Sets: ${Object.keys(state.distribution?.productSets || {}).length}`,
      `Destinations: ${destinations().length}`,
      preview ? `Unassigned: ${preview.unassigned?.length || 0}` : "Preview not run",
    ];
    node.innerHTML = values.map((value, index) => `<span class="chip ${index === 0 && state.distributionDirty ? "pillYellow" : ""}">${esc(value)}</span>`).join("");
  }

  function renderDestinations() {
    const node = document.getElementById("ccDestinations");
    if (!node) return;
    const current = activeDestination();
    node.innerHTML = destinations().map((destination) => {
      const summary = state.preview?.summary?.[destination.id];
      return `<button class="btn ccDestination ccCard ${destination.favorite ? "favorite" : ""} ${current?.id === destination.id ? "active" : ""}" data-destination="${esc(destination.id)}">
        <div class="between"><b>${destination.favorite ? '<span class="star">★</span> ' : ""}${esc(destination.name)}</b><span class="chip">${esc(destination.type || "app")}</span></div>
        <div class="tiny muted section">${esc(destination.origin || "No public origin")}</div>
        <div class="small section">${summary ? `${summary.products} products · ${summary.variants} variants` : "Preview for counts"}</div>
      </button>`;
    }).join("");
    node.querySelectorAll("[data-destination]").forEach((button) => {
      button.onclick = () => {
        state.activeDestinationId = button.dataset.destination;
        renderDistribution();
      };
    });
  }

  function addProductSet() {
    const input = document.getElementById("ccNewSetName");
    const name = input?.value?.trim();
    if (!name) return setMessage("Enter a product-set name first.", "warn");
    const id = model.safeSetId(name);
    if (!id) return setMessage("Product-set name needs at least one letter or number.", "warn");
    markDistribution(model.upsertProductSet(ensureDistribution(), id, { name, products: [] }));
    input.value = "";
    setMessage(`Product set '${name}' added.`, "ok");
  }

  function renderProductSets() {
    const node = document.getElementById("ccProductSets");
    if (!node) return;
    const entries = Object.entries(state.distribution?.productSets || {});
    if (!entries.length) {
      node.innerHTML = '<div class="muted small section">No product sets yet. Add one, then select canonical products for it.</div>';
      return;
    }
    node.innerHTML = entries.map(([setId, set]) => {
      const members = new Set(set.products || []);
      return `<div class="ccSet ccCard" data-set="${esc(setId)}">
        <div class="ccSetHead"><div><input class="field ccSetName" value="${esc(set.name || setId)}"><div class="ccCode">${esc(setId)} · ${members.size} products</div></div><button class="btn danger ccRemoveSet">Remove</button></div>
        <details class="section"><summary class="small">Choose products</summary><div class="ccScroll section">${products().map((product) => `<label class="ccCheck ccRow"><span><input class="ccSetProduct" type="checkbox" data-product="${esc(product.id)}" ${members.has(product.id) ? "checked" : ""}> <b>${esc(product.name || product.id)}</b><div class="ccCode">${esc(product.id)}</div></span><span class="small muted">${product.variants?.length || 0} variants</span></label>`).join("")}</div></details>
      </div>`;
    }).join("");

    node.querySelectorAll("[data-set]").forEach((card) => {
      const setId = card.dataset.set;
      card.querySelector(".ccSetName").onchange = (event) => {
        markDistribution(model.upsertProductSet(ensureDistribution(), setId, { name: event.target.value }));
      };
      card.querySelector(".ccRemoveSet").onclick = () => {
        if (!confirm(`Remove product set '${setId}' from all destinations?`)) return;
        markDistribution(model.removeProductSet(ensureDistribution(), setId));
      };
      card.querySelectorAll(".ccSetProduct").forEach((checkbox) => {
        checkbox.onchange = () => markDistribution(model.setProductSetMembership(
          ensureDistribution(),
          setId,
          checkbox.dataset.product,
          checkbox.checked,
        ));
      });
    });
  }

  function renderDestinationRules() {
    const node = document.getElementById("ccDestinationRules");
    if (!node) return;
    const destination = activeDestination();
    if (!destination) {
      node.innerHTML = '<div class="muted small">No destination configured.</div>';
      return;
    }
    const rules = state.distribution?.destinations?.[destination.id] || {};
    const attached = new Set(rules.productSets || []);
    const sets = Object.entries(state.distribution?.productSets || {});
    node.innerHTML = `<div class="between"><div><b>${destination.favorite ? "★ " : ""}${esc(destination.name)}</b><div class="ccCode">${esc(destination.id)} → commerce ${esc(destination.commerceStoreId || destination.id)}</div></div><span class="chip">${destination.favorite ? "Favorite" : "Destination"}</span></div>
      <div class="section"><div class="tiny muted">Attached product sets</div>${sets.length ? sets.map(([setId, set]) => `<label class="ccCheck"><input class="ccDestinationSet" type="checkbox" data-set="${esc(setId)}" ${attached.has(setId) ? "checked" : ""}> <span>${esc(set.name || setId)} <span class="muted tiny">(${set.products?.length || 0})</span></span></label>`).join("") : '<div class="muted small section">Create a product set first, or use direct product exceptions below.</div>'}</div>`;
    node.querySelectorAll(".ccDestinationSet").forEach((checkbox) => {
      checkbox.onchange = () => markDistribution(model.setDestinationProductSet(
        ensureDistribution(),
        destination.id,
        checkbox.dataset.set,
        checkbox.checked,
      ));
    });
  }

  function matchesSearch(product, variant = null) {
    const query = state.productSearch.trim().toLowerCase();
    if (!query) return true;
    const haystack = [
      product?.id,
      product?.name,
      product?.category,
      variant?.id,
      variant?.sku,
      variant?.size,
      variant?.color,
      variant?.name,
    ].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(query);
  }

  function modeOptions(current) {
    return [
      ["inherit", "Inherit"],
      ["include", "Force include"],
      ["exclude", "Force exclude"],
    ].map(([value, label]) => `<option value="${value}" ${current === value ? "selected" : ""}>${label}</option>`).join("");
  }

  function featuredOptions(override) {
    const current = Object.prototype.hasOwnProperty.call(override, "featured")
      ? String(override.featured)
      : "inherit";
    return [
      ["inherit", "Default"],
      ["true", "Featured"],
      ["false", "Not featured"],
    ].map(([value, label]) => `<option value="${value}" ${current === value ? "selected" : ""}>${label}</option>`).join("");
  }

  function renderPresentationOverrides() {
    const node = document.getElementById("ccPresentationOverrides");
    const destination = activeDestination();
    if (!node || !destination) return;

    const filteredProducts = products().filter((product) => matchesSearch(product));
    if (!filteredProducts.length) {
      node.innerHTML = '<div class="panel muted small">No matching canonical products.</div>';
      return;
    }

    node.innerHTML = filteredProducts.slice(0, 120).map((product) => {
      const override = model.productPresentation(state.distribution, destination.id, product.id);
      const hasOverride = Object.keys(override).length > 0;
      return `<div class="ccPresentationRow" data-presentation-product="${esc(product.id)}">
        <div class="between"><div><b>${esc(product.name || product.id)}</b><div class="ccCode">${esc(product.id)} → ${esc(destination.id)}</div></div><button class="btn ccClearPresentation" ${hasOverride ? "" : "disabled"}>Clear override</button></div>
        <div class="ccPresentationFields">
          <input class="field ccPresentationTitle" maxlength="160" value="${esc(override.title || "")}" placeholder="Destination title (canonical: ${esc(product.name || product.id)})">
          <input class="field ccPresentationBadge" maxlength="80" value="${esc(override.badge || "")}" placeholder="Badge / eyebrow">
          <input class="field ccPresentationSort" type="number" min="-100000" max="100000" step="1" value="${override.sortOrder ?? ""}" placeholder="Sort order">
          <select class="field ccPresentationFeatured">${featuredOptions(override)}</select>
          <textarea class="field ccPresentationDescription" maxlength="4000" placeholder="Destination-specific description; blank keeps canonical copy.">${esc(override.description || "")}</textarea>
        </div>
      </div>`;
    }).join("");

    node.querySelectorAll("[data-presentation-product]").forEach((row) => {
      const productId = row.dataset.presentationProduct;
      const saveRow = () => {
        const featuredValue = row.querySelector(".ccPresentationFeatured").value;
        const sortValue = row.querySelector(".ccPresentationSort").value;
        markDistribution(model.setProductPresentation(
          ensureDistribution(),
          destination.id,
          productId,
          {
            title: row.querySelector(".ccPresentationTitle").value,
            description: row.querySelector(".ccPresentationDescription").value,
            badge: row.querySelector(".ccPresentationBadge").value,
            featured: featuredValue === "inherit" ? null : featuredValue === "true",
            sortOrder: sortValue === "" ? null : Number(sortValue),
          },
        ));
      };
      row.querySelectorAll("input, textarea, select").forEach((control) => {
        control.onchange = saveRow;
      });
      row.querySelector(".ccClearPresentation").onclick = () => {
        if (!Object.keys(model.productPresentation(state.distribution, destination.id, productId)).length) return;
        markDistribution(model.setProductPresentation(
          ensureDistribution(),
          destination.id,
          productId,
          {},
        ));
        setMessage(`Presentation override cleared for ${productId} in ${destination.name}.`, "ok");
      };
    });
  }

  function renderDestinationEditors() {
    const productNode = document.getElementById("ccDirectProducts");
    const variantNode = document.getElementById("ccVariantOverrides");
    const destination = activeDestination();
    if (!productNode || !variantNode || !destination) return;

    const filteredProducts = products().filter((product) => matchesSearch(product));
    productNode.innerHTML = filteredProducts.length
      ? filteredProducts.slice(0, 250).map((product) => {
          const mode = model.destinationProductMode(state.distribution, destination.id, product.id);
          return `<div class="ccRow"><div><b>${esc(product.name || product.id)}</b><div class="ccCode">${esc(product.id)}</div></div><select class="field ccProductMode" data-product="${esc(product.id)}">${modeOptions(mode)}</select></div>`;
        }).join("")
      : '<div class="panel muted small">No matching canonical products.</div>';

    productNode.querySelectorAll(".ccProductMode").forEach((select) => {
      select.onchange = () => markDistribution(model.setDestinationProductMode(
        ensureDistribution(),
        destination.id,
        select.dataset.product,
        select.value,
      ));
    });

    const filteredVariants = variants().filter(({ product, variant }) => matchesSearch(product, variant));
    variantNode.innerHTML = filteredVariants.length
      ? filteredVariants.slice(0, 300).map(({ product, variant, ref }) => {
          const mode = model.variantMode(state.distribution, destination.id, ref);
          const label = [variant.color, variant.size, variant.name].filter(Boolean).join(" / ") || variant.sku || variant.id;
          return `<div class="ccRow"><div><b>${esc(product.name || product.id)}</b><div class="small muted">${esc(label)}</div><div class="ccCode">${esc(ref)}${variant.sku ? ` · ${esc(variant.sku)}` : ""}</div></div><select class="field ccVariantMode" data-ref="${esc(ref)}">${modeOptions(mode)}</select></div>`;
        }).join("")
      : '<div class="panel muted small">No matching canonical variants.</div>';

    variantNode.querySelectorAll(".ccVariantMode").forEach((select) => {
      select.onchange = () => markDistribution(model.setVariantMode(
        ensureDistribution(),
        destination.id,
        select.dataset.ref,
        select.value,
      ));
    });
  }

  async function previewDistribution() {
    if (!state.authorityStatus?.exists) return setMessage("Accept a canonical catalog before previewing distribution.", "warn");
    try {
      setBusy(true);
      state.preview = await api("/api/catalog-distribution/preview", {
        method: "POST",
        body: JSON.stringify({ distribution: ensureDistribution() }),
      });
      setMessage(`Distribution preview complete. ${state.preview.unassigned?.length || 0} canonical products are unassigned.`, "ok");
      renderDistribution();
    } catch (error) {
      setMessage(error.message, "bad");
    } finally {
      setBusy(false);
    }
  }

  async function saveDistribution() {
    if (!state.authorityStatus?.exists) return setMessage("Accept a canonical catalog before saving distribution.", "warn");
    if (!state.distributionEtag) return setMessage("Refresh distribution state before saving.", "warn");
    try {
      setBusy(true);
      const result = await api("/api/catalog-distribution", {
        method: "PUT",
        body: JSON.stringify({
          distribution: ensureDistribution(),
          expectedEtag: state.distributionEtag,
        }),
      });
      state.distribution = model.normalizeDistribution(result.distribution, destinations());
      state.distributionEtag = result.etag;
      state.distributionDirty = false;
      state.preview = { summary: result.preview?.summary || {}, unassigned: result.preview?.unassigned || [] };
      setMessage("Distribution metadata saved. No storefront was published or replaced.", "ok");
      await Promise.all([refreshDistributionStatus(), refreshDistributionHistory()]);
      renderDistribution();
      renderDistributionHistory();
    } catch (error) {
      setMessage(
        error.status === 409
          ? "Distribution changed in another session. Refresh before saving again."
          : error.message,
        "bad",
      );
    } finally {
      setBusy(false);
    }
  }

  async function refreshDistributionStatus() {
    state.distributionStatus = await api("/api/catalog-distribution/status");
  }

  async function refreshDistributionHistory() {
    state.distributionHistory = await api("/api/catalog-distribution/history");
  }

  function renderDistributionHistory() {
    const node = document.getElementById("ccDistributionHistory");
    if (!node) return;
    const history = state.distributionHistory;
    if (!history) {
      node.innerHTML = '<div class="panel muted small">History has not been loaded yet.</div>';
      return;
    }

    const current = history.current || {};
    const backups = Array.isArray(history.backups) ? history.backups : [];
    const currentSummary = current.exists
      ? `Current · ${current.updatedAt || "saved"} · ETag ${String(current.etag || "").slice(0, 12)}`
      : "No saved distribution yet";
    node.innerHTML = `<div class="ccHistoryRow"><div><b>${esc(currentSummary)}</b><div class="small muted">Current control-plane distribution metadata</div></div><span class="chip">Current</span></div>${
      backups.length
        ? backups.map((backup) => `<div class="ccHistoryRow" data-history-backup="${esc(backup.id)}" data-history-valid="${backup.valid ? "true" : "false"}"><div><b>${esc(backup.createdAt || backup.id)}</b><div class="ccCode">ETag ${esc(backup.etag ? backup.etag.slice(0, 16) : "unavailable")} · ${Number(backup.sizeBytes || 0).toLocaleString()} bytes</div><div class="tiny ${backup.valid ? "muted" : "warn"}">${backup.valid ? "Recoverable distribution revision" : "Backup failed validation and cannot be restored"}</div></div><button class="btn ccRestoreDistribution" ${backup.valid ? "" : "disabled"}>Restore revision</button></div>`).join("")
        : '<div class="panel muted small">No prior revisions yet. The first recoverable backup is created when an existing saved distribution is replaced.</div>'
    }`;

    node.querySelectorAll("[data-history-backup]").forEach((row) => {
      row.querySelector(".ccRestoreDistribution").onclick = () => {
        if (row.dataset.historyValid !== "true") return;
        restoreDistributionBackup(row.dataset.historyBackup);
      };
    });
  }

  async function restoreDistributionBackup(backupId) {
    if (!state.distributionEtag) return setMessage("Refresh distribution state before restoring history.", "warn");
    const warning = state.distributionDirty
      ? "This will discard your unsaved distribution edits, then restore the selected saved revision. The currently saved revision will be backed up first. No storefront will be published. Continue?"
      : "Restore this saved distribution revision? The current saved revision will be backed up first. No storefront will be published.";
    if (!confirm(warning)) return;

    try {
      setBusy(true);
      const restored = await api("/api/catalog-distribution/restore", {
        method: "POST",
        body: JSON.stringify({ backupId, expectedEtag: state.distributionEtag }),
      });
      await refreshAll(false);
      state.preview = {
        summary: restored.preview?.summary || {},
        unassigned: restored.preview?.unassigned || [],
      };
      renderDistribution();
      renderDistributionHistory();
      setMessage(`Distribution restored from ${restored.restoredFrom?.createdAt || backupId}. No storefront was published.`, "ok");
    } catch (error) {
      setMessage(
        error.status === 409
          ? "Rollback could not be applied because the current distribution or selected backup is no longer valid. Refresh and review history again."
          : error.message,
        "bad",
      );
    } finally {
      setBusy(false);
    }
  }

  async function generateDraftManifests() {
    if (!state.authorityStatus?.exists) return setMessage("Accept a canonical catalog before generating manifests.", "warn");
    try {
      setBusy(true);
      state.generated = await api("/api/catalog-distribution/generate", {
        method: "POST",
        body: JSON.stringify({ distribution: ensureDistribution(), generatedAt: new Date().toISOString() }),
      });
      setMessage(`Generated ${Object.keys(state.generated.manifests || {}).length} draft destination manifests. Nothing was published.`, "ok");
      renderGenerated();
    } catch (error) {
      setMessage(error.message, "bad");
    } finally {
      setBusy(false);
    }
  }

  function downloadManifest(destinationId) {
    const manifest = state.generated?.manifests?.[destinationId];
    if (!manifest) return;
    const blob = new Blob([`${JSON.stringify(manifest, null, 2)}\n`], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = model.manifestFileName(destinationId, manifest);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(link.href);
      link.remove();
    }, 500);
  }

  function renderGenerated() {
    const node = document.getElementById("ccGenerated");
    if (!node) return;
    const manifests = state.generated?.manifests || {};
    const entries = Object.entries(manifests);
    if (!entries.length) {
      node.innerHTML = "";
      return;
    }
    node.innerHTML = `<div class="ccCard"><div class="between"><div><h4 class="h2">Draft Manifests</h4><div class="muted small">Version ${esc(state.generated.catalogVersion || "draft")} · browser-safe catalog subsets only.</div></div><span class="chip">Not published</span></div><div class="ccGrid section">${entries.map(([destinationId, manifest]) => `<div class="ccCard ccManifest"><div><b>${esc(manifest.destination?.name || destinationId)}</b><div class="small muted">${manifest.count || manifest.products?.length || 0} products · commerce ${esc(manifest.commerceStoreId || destinationId)}</div><div class="ccCode">${esc(destinationId)}</div></div><button class="btn ccDownloadManifest" data-destination="${esc(destinationId)}">Download JSON</button></div>`).join("")}</div></div>`;
    node.querySelectorAll(".ccDownloadManifest").forEach((button) => {
      button.onclick = () => downloadManifest(button.dataset.destination);
    });
  }

  mount();
})();
