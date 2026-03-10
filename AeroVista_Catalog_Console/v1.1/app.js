/* AeroVista Catalog Console
 * Local-first importer/editor/exporter for Square-style product JSON catalogs.
 * No dependencies besides Tailwind (CDN) in index.html.
 */
(function(){
  const $ = (id) => document.getElementById(id);

  // ---- State ----
  const state = {
    catalog: { meta: {}, products: [] },   // canonical in-app format
    selectedId: null,
    dirtyIds: new Set(),
    lastImportedName: null,
    projectDirHandle: null,    // File System Access API handle (session)
    existingOverlay: null,     // Loaded storefront_overlay.json for merge
  };

  // Preset tags for multi-select dropdown; used for grouping/filtering on storefront
  const PRESET_TAGS = ['featured', 'hoodies', 'crewnecks', 'tees', 'hats', 'stickers', 'echoverse', 'nxcore', 'aerovista', 'limited'];

  // ---- Helpers ----
  const nowIso = () => new Date().toISOString();
  const slugify = (s) => (s || '')
    .toLowerCase()
    .replace(/['"]/g,'')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'')
    .slice(0,80) || 'item';

  const uuid = () => {
    // good enough for local ids
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random()*16|0, v = c==='x'?r:(r&0x3|0x8);
      return v.toString(16);
    });
  };

  const toast = (msg) => {
    const t = $('toast');
    t.classList.remove('hidden');
    t.firstElementChild.textContent = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(()=>t.classList.add('hidden'), 2200);
  };

  const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

  const normalizeIncoming = (data) => {
    // Accept either:
    // - { products: [...] } where products are already product objects
    // - [...] array treated as products
    // - Square-like export objects (best-effort)
    let products = [];
    let meta = {};

    if (Array.isArray(data)) products = data;
    else if (data && Array.isArray(data.products)) { products = data.products; meta = {...(data.meta||{})}; }
    else if (data && Array.isArray(data.items)) { products = data.items; meta = {...(data.meta||{})}; } // alternate key
    else throw new Error('Unrecognized JSON shape. Expected {products:[...]} or an array.');

    // Ensure each product has id, title, variants array
    products = products.map((p, idx) => {
      const out = {...p};

      // Attempt to map Square objects if present
      // If it looks like Square's catalog object:
      if (out.type && out.id && out.present_at_all_locations !== undefined && out.item_data) {
        const item = out.item_data;
        const vars = (item.variations || []).map(v => {
          const vd = v.item_variation_data || {};
          return {
            id: v.id || uuid(),
            sku: vd.sku || '',
            color: '',
            size: '',
            price: centsToPrice(vd.price_money?.amount ?? null),
            inventory: vd.inventory_alert_type ? '' : '',
            raw: deepClone(v)
          };
        });
        return {
          id: out.id,
          key: slugify(item.name || `item-${idx+1}`),
          title: item.name || `Item ${idx+1}`,
          description: item.description || '',
          group: '',
          type: '',
          tags: [],
          status: 'active',
          variants: vars,
          source: 'square_catalog_object'
        };
      }

      // Generic product object compatibility
      out.id = out.id || out.product_id || uuid();
      out.title = out.title || out.name || `Item ${idx+1}`;
      out.description = out.description || out.desc || '';
      out.group = out.group || '';
      out.type = out.type || out.product_type || '';
      out.tags = Array.isArray(out.tags) ? out.tags : (typeof out.tags === 'string' ? out.tags.split(',').map(s=>s.trim()).filter(Boolean) : []);
      out.status = out.status || out.visibility || 'active';

      if (!Array.isArray(out.variants)) {
        // best effort: if variations exist
        if (Array.isArray(out.variations)) out.variants = out.variations;
        else out.variants = [];
      }

      // Normalize variants
      out.variants = out.variants.map((v, vidx) => {
        const vv = {...v};
        vv.id = vv.id || vv.variation_id || uuid();
        vv.sku = vv.sku || vv.SKU || '';
        vv.color = vv.color || vv.Color || '';
        vv.size = vv.size || vv.Size || '';
        vv.price = vv.price ?? vv.Price ?? '';
        vv.inventory = vv.inventory ?? vv.Inventory ?? '';
        return vv;
      });

      out.key = out.key || out.handle || slugify(out.title);
      return out;
    });

    // meta defaults
    meta = {
      ...meta,
      importedAt: nowIso(),
      tool: meta.tool || 'AeroVista Catalog Console',
      version: meta.version || '1.0'
    };

    return {meta, products};
  };

  const centsToPrice = (cents) => {
    if (cents === null || cents === undefined || Number.isNaN(Number(cents))) return '';
    return (Number(cents)/100).toFixed(2);
  };

  const toCents = (priceStr) => {
    const n = Number(String(priceStr).replace(/[^\d.]/g,''));
    if (!Number.isFinite(n)) return null;
    return Math.round(n*100);
  };

  const computeStats = () => {
    const items = state.catalog.products.length;
    const variants = state.catalog.products.reduce((a,p)=>a+(p.variants?.length||0),0);
    $('statItems').textContent = String(items);
    $('statVariants').textContent = String(variants);
    $('statDirty').textContent = String(state.dirtyIds.size);
    $('badgeDirty').classList.toggle('hidden', state.dirtyIds.size===0);
  };

  const fillFilters = () => {
    const groups = new Set(['(all)']);
    const types = new Set(['(all)']);
    const tags = new Set(['(all)']);
    for (const p of state.catalog.products){
      if (p.group) groups.add(p.group);
      if (p.type) types.add(p.type);
      for (const t of (p.tags || [])) if (t) tags.add(t);
    }
    for (const t of PRESET_TAGS) tags.add(t);
    const setOptions = (sel, set) => {
      if (!sel) return;
      sel.innerHTML = '';
      [...set].sort((a,b)=>a.localeCompare(b)).forEach(v=>{
        const o = document.createElement('option');
        o.value = v;
        o.textContent = v;
        sel.appendChild(o);
      });
    };
    setOptions($('filterGroup'), groups);
    setOptions($('filterType'), types);
    setOptions($('filterTags'), tags);
  };

  const matches = (p, q) => {
    const hay = [
      p.title, p.description, p.group, p.type,
      (p.tags||[]).join(' '),
      ...(p.variants||[]).map(v=>[v.sku,v.color,v.size,v.price].join(' '))
    ].join(' ').toLowerCase();
    return hay.includes(q);
  };

  const renderList = () => {
    const list = $('list');
    const q = $('q').value.trim().toLowerCase();
    const fg = $('filterGroup').value;
    const ft = $('filterType').value;
    const ftag = ($('filterTags') && $('filterTags').value) || '(all)';

    const items = state.catalog.products
      .filter(p => (fg==='(all)' || (p.group||'')===fg))
      .filter(p => (ft==='(all)' || (p.type||'')===ft))
      .filter(p => (ftag==='(all)' || (Array.isArray(p.tags) && p.tags.some(t=>String(t).toLowerCase()===ftag.toLowerCase()))))
      .filter(p => (q==='' || matches(p,q)))
      .map(p => ({
        p,
        variants: p.variants?.length||0,
        minPrice: minVariantPrice(p),
      }))
      .sort((a,b) => (a.p.title||'').localeCompare(b.p.title||''));

    list.innerHTML = '';
    if (items.length===0){
      list.innerHTML = `<div class="hint text-sm p-3">No matches.</div>`;
      return;
    }

    for (const it of items){
      const p = it.p;
      const isSel = p.id === state.selectedId;
      const isDirty = state.dirtyIds.has(p.id);
      const row = document.createElement('button');
      row.className = `w-full text-left rounded-2xl px-3 py-3 mb-2 border ${isSel?'border-[rgba(0,229,255,.45)] bg-[rgba(0,229,255,.09)]':'border-[rgba(255,255,255,.10)] bg-[rgba(255,255,255,.03)]'} hover:bg-[rgba(255,255,255,.06)] transition`;
      row.innerHTML = `
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <div class="font-medium truncate">${escapeHtml(p.title||'')}</div>
              ${isDirty?`<span class="chip text-[11px] px-2 py-0.5 rounded-lg warn">dirty</span>`:''}
              ${p.status==='hidden'?`<span class="chip text-[11px] px-2 py-0.5 rounded-lg danger">hidden</span>`:''}
            </div>
            <div class="hint text-xs mt-1 truncate">${escapeHtml((p.group||'') + (p.group&&p.type?' • ':'') + (p.type||''))}</div>
          </div>
          <div class="text-right">
            <div class="mono text-xs">${it.minPrice?`$${it.minPrice}`:''}</div>
            <div class="hint text-xs">${it.variants} var</div>
          </div>
        </div>
        <div class="mt-2 flex flex-wrap gap-2">
          ${(p.tags||[]).slice(0,4).map(t=>`<span class="chip text-[11px] px-2 py-0.5 rounded-lg">${escapeHtml(t)}</span>`).join('')}
          ${(p.tags||[]).length>4?`<span class="hint text-[11px]">+${(p.tags||[]).length-4}</span>`:''}
        </div>
      `;
      row.addEventListener('click', ()=>selectProduct(p.id));
      list.appendChild(row);
    }
  };

  const escapeHtml = (s) => String(s ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#039;");

  const minVariantPrice = (p) => {
    const prices = (p.variants||[])
      .map(v=>Number(String(v.price||'').replace(/[^\d.]/g,'')))
      .filter(n=>Number.isFinite(n) && n>0);
    if (!prices.length) return '';
    return (Math.min(...prices)).toFixed(2);
  };

  const renderTagPresets = (p) => {
    const container = $('p_tagPresets');
    if (!container) return;
    container.innerHTML = '';
    const tags = Array.isArray(p?.tags) ? p.tags.map(t=>String(t).toLowerCase()) : [];
    for (const tag of PRESET_TAGS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `chip text-[11px] px-2 py-1 rounded-lg tagToggle ${tags.includes(tag) ? 'active border-[rgba(0,229,255,.4)] bg-[rgba(0,229,255,.12)]' : ''}`;
      btn.textContent = tag;
      btn.dataset.tag = tag;
      btn.addEventListener('click', () => {
        const prod = getSelected();
        if (!prod) return;
        prod.tags = prod.tags || [];
        const idx = prod.tags.map(t=>String(t).toLowerCase()).indexOf(tag);
        if (idx >= 0) prod.tags.splice(idx, 1);
        else prod.tags.push(tag);
        setDirty(prod.id, true);
        rebuildRaw(prod);
        renderList();
        renderTagPresets(prod);
        const custom = (prod.tags||[]).filter(t=>!PRESET_TAGS.includes(String(t).toLowerCase()));
        if ($('p_tagsCustom')) $('p_tagsCustom').value = custom.join(', ');
      });
      container.appendChild(btn);
    }
  };

  const setDirty = (pid, dirty=true) => {
    if (!pid) return;
    if (dirty) state.dirtyIds.add(pid);
    else state.dirtyIds.delete(pid);
    computeStats();
  };

  const setEditorEnabled = (enabled) => {
    $('editor').classList.toggle('hidden', !enabled);
    $('emptyState').classList.toggle('hidden', enabled);
    $('btnDelete').disabled = !enabled;
    $('btnDuplicate').disabled = !enabled;
  };

  const selectProduct = (pid) => {
    state.selectedId = pid;
    const p = state.catalog.products.find(x=>x.id===pid);
    if (!p){
      setEditorEnabled(false);
      return;
    }
    setEditorEnabled(true);

    $('p_title').value = p.title||'';
    $('p_group').value = p.group||'';
    $('p_type').value = p.type||'';
    $('p_desc').value = p.description||'';
    renderTagPresets(p);
    const customTags = (p.tags||[]).filter(t=>!PRESET_TAGS.includes(String(t).toLowerCase()));
    if ($('p_tagsCustom')) $('p_tagsCustom').value = customTags.join(', ');
    $('p_key').value = p.key||'';
    $('p_status').value = p.status||'active';

    renderVariants(p);
    rebuildRaw(p);
    renderList();
  };

  const renderVariants = (p) => {
    const tbody = $('vars');
    tbody.innerHTML = '';
    const vars = p.variants || [];
    vars.forEach((v, i) => {
      const tr = document.createElement('tr');
      tr.className = 'border-t border-[rgba(255,255,255,.08)]';
      tr.innerHTML = `
        <td class="py-2 pr-2"><input data-k="sku" data-i="${i}" class="field w-full rounded-xl px-2 py-1 text-xs mono" value="${escapeHtml(v.sku||'')}" /></td>
        <td class="py-2 pr-2"><input data-k="color" data-i="${i}" class="field w-full rounded-xl px-2 py-1 text-xs" value="${escapeHtml(v.color||'')}" placeholder="Black" /></td>
        <td class="py-2 pr-2"><input data-k="size" data-i="${i}" class="field w-full rounded-xl px-2 py-1 text-xs" value="${escapeHtml(v.size||'')}" placeholder="M" /></td>
        <td class="py-2 pr-2"><input data-k="price" data-i="${i}" class="field w-full rounded-xl px-2 py-1 text-xs mono" value="${escapeHtml(v.price||'')}" placeholder="34.99" /></td>
        <td class="py-2 pr-2"><input data-k="inventory" data-i="${i}" class="field w-full rounded-xl px-2 py-1 text-xs mono" value="${escapeHtml(v.inventory||'')}" placeholder="" /></td>
        <td class="py-2 text-right">
          <button type="button" data-del="${i}" class="btn px-2 py-1 rounded-xl text-xs danger">Remove</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // bind inputs
    tbody.querySelectorAll('input').forEach(inp=>{
      inp.addEventListener('input', (e)=>{
        const i = Number(e.target.getAttribute('data-i'));
        const k = e.target.getAttribute('data-k');
        const p = getSelected();
        if (!p) return;
        p.variants[i][k] = e.target.value;
        setDirty(p.id,true);
        rebuildRaw(p);
        computeStats();
        renderList();
      });
    });

    // bind removes
    tbody.querySelectorAll('button[data-del]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const i = Number(btn.getAttribute('data-del'));
        const p = getSelected();
        if (!p) return;
        p.variants.splice(i,1);
        setDirty(p.id,true);
        renderVariants(p);
        rebuildRaw(p);
        renderList();
      });
    });
  };

  const rebuildRaw = (p) => {
    $('p_raw').value = JSON.stringify(p, null, 2);
  };

  const applyRaw = () => {
    const p = getSelected();
    if (!p) return;
    try{
      const obj = JSON.parse($('p_raw').value);
      // preserve id if missing
      obj.id = obj.id || p.id;
      obj.variants = Array.isArray(obj.variants) ? obj.variants : [];
      // normalize tags to array
      obj.tags = Array.isArray(obj.tags) ? obj.tags : (typeof obj.tags==='string' ? obj.tags.split(',').map(s=>s.trim()).filter(Boolean) : []);
      // ensure variants shape
      obj.variants = obj.variants.map(v=>({
        id: v.id || v.variation_id || uuid(),
        sku: v.sku || '',
        color: v.color || '',
        size: v.size || '',
        price: v.price ?? '',
        inventory: v.inventory ?? ''
      }));
      // overwrite p fields
      Object.assign(p, obj);
      // update form
      selectProduct(p.id);
      setDirty(p.id,true);
      toast('Applied raw JSON.');
    }catch(err){
      toast('Raw JSON invalid: ' + err.message);
    }
  };

  const getSelected = () => state.catalog.products.find(x=>x.id===state.selectedId) || null;

  const addVariant = () => {
    const p = getSelected();
    if (!p) return;
    p.variants = p.variants || [];
    p.variants.push({ id: uuid(), sku:'', color:'', size:'', price:'', inventory:'' });
    setDirty(p.id,true);
    renderVariants(p);
    rebuildRaw(p);
    renderList();
  };

  const autoSplitVariants = () => {
    const p = getSelected();
    if (!p) return;
    let changed = 0;
    for (const v of (p.variants||[])){
      // If size looks like "Black, L" or "Black / L"
      const s = String(v.size||'').trim();
      if (s && (s.includes(',') || s.includes('/')) && (!v.color || !v.sizeOnly)){
        const parts = s.split(/[,/]/).map(x=>x.trim()).filter(Boolean);
        if (parts.length>=2){
          // Heuristic: first is color, second is size
          v.color = v.color || parts[0];
          v.size = parts[1];
          changed++;
        }
      }
      // If sku has embedded color/size e.g. "TEE-BLK-L"
    }
    if (changed){
      setDirty(p.id,true);
      renderVariants(p);
      rebuildRaw(p);
      renderList();
      toast(`Auto-split ${changed} variants.`);
    } else {
      toast('No variants needed splitting.');
    }
  };

  const deleteSelected = () => {
    const p = getSelected();
    if (!p) return;
    const ok = confirm(`Delete "${p.title}"? This cannot be undone (unless you re-import).`);
    if (!ok) return;
    state.catalog.products = state.catalog.products.filter(x=>x.id!==p.id);
    state.dirtyIds.delete(p.id);
    state.selectedId = null;
    setEditorEnabled(false);
    fillFilters();
    renderList();
    computeStats();
    toast('Deleted product.');
  };

  const duplicateSelected = () => {
    const p = getSelected();
    if (!p) return;
    const copy = deepClone(p);
    copy.id = uuid();
    copy.key = slugify(copy.title) + '-' + copy.id.slice(0,6);
    // new variant ids
    copy.variants = (copy.variants||[]).map(v=>({ ...v, id: uuid() }));
    state.catalog.products.push(copy);
    setDirty(copy.id,true);
    fillFilters();
    renderList();
    selectProduct(copy.id);
    toast('Duplicated product.');
  };

  const newProduct = () => {
    const p = {
      id: uuid(),
      key: '',
      title: 'New Product',
      description: '',
      group: '',
      type: '',
      tags: [],
      status: 'active',
      variants: [
        { id: uuid(), sku:'', color:'', size:'', price:'', inventory:'' }
      ]
    };
    state.catalog.products.push(p);
    fillFilters();
    renderList();
    selectProduct(p.id);
    setDirty(p.id,true);
    toast('New product created.');
  };

  const importJson = async (file) => {
    const text = await file.text();
    const data = JSON.parse(text);
    const norm = normalizeIncoming(data);
    state.catalog = { meta: norm.meta, products: norm.products };
    state.selectedId = null;
    state.dirtyIds.clear();
    state.lastImportedName = file.name;
    setEditorEnabled(false);
    fillFilters();
    renderList();
    computeStats();
    toast(`Imported ${norm.products.length} products.`);
  };

  // Convert Console internal format to storefront catalog format
  const toStoreCatalogFormat = (products) => {
    const isSquareId = (s) => s && /^[A-Z0-9]{20,}$/i.test(String(s).trim());
    return (products || []).map((p) => {
      const desc = (p.description || '').trim();
      const descHtml = desc ? (desc.includes('<') ? desc : '<p>' + desc.replace(/\n/g,'</p><p>') + '</p>') : '';
      const productColor = (p.variants && p.variants[0] && p.variants[0].color) ? p.variants[0].color : '';
      const variants = (p.variants || []).map((v) => {
        const vid = (v.id || v.variation_id || '').toString().trim();
        const priceNum = Number(String(v.price || '').replace(/[^\d.]/g, ''));
        return {
          size: (v.size || '').trim() || 'One Size',
          sku: (v.sku || '').trim(),
          price: Number.isFinite(priceNum) ? priceNum : (p.price ? Number(p.price) : 0),
          variation_id: isSquareId(vid) ? vid : ''
        };
      });
      return {
        id: p.id || slugify(p.title),
        name: (p.title || '').trim() || 'Untitled',
        color: productColor,
        category: (p.group || p.type || p.category || '').trim(),
        price: variants[0]?.price ?? 0,
        visibility: p.status === 'hidden' ? 'hidden' : 'visible',
        shipping_enabled: p.shipping_enabled || '',
        description_text: desc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
        description_html: descHtml,
        variants
      };
    });
  };

  const exportJson = () => {
    const storeProducts = toStoreCatalogFormat(state.catalog.products);
    const payload = {
      meta: {
        ...(state.catalog.meta||{}),
        exportedAt: nowIso(),
        exportedBy: 'AeroVista Catalog Console',
        sourceFile: state.lastImportedName || null,
        count: storeProducts.length
      },
      products: storeProducts
    };
    const name = (state.lastImportedName ? state.lastImportedName.replace(/\.json$/i,'') : 'square_products_latest')
      + '_edited.json';
    download(name, JSON.stringify(payload, null, 2), 'application/json');
    toast('Exported JSON.');
  };

  const exportEditsCsv = () => {
    // Emits an "overlay" CSV that can be used to reapply edits after a new conversion.
    // Includes product key, title, group, type, status, tags, description, plus variant rows.
    const rows = [];
    rows.push([
      'product_id','product_key','title','group','type','status','tags','description',
      'variant_id','sku','color','size','price','inventory'
    ]);
    for (const p of state.catalog.products){
      const tags = (p.tags||[]).join('|');
      const desc = (p.description||'').replace(/\r?\n/g,'\\n');
      const vars = (p.variants && p.variants.length) ? p.variants : [null];
      for (const v of vars){
        rows.push([
          p.id, p.key||'', p.title||'', p.group||'', p.type||'', p.status||'active', tags, desc,
          v? (v.id||'') : '', v? (v.sku||''):'', v? (v.color||''):'', v? (v.size||''):'', v? (v.price??''):'', v? (v.inventory??''):''
        ]);
      }
    }
    const csv = rows.map(r=>r.map(csvCell).join(',')).join('\n');
    download('catalog_edits_overlay.csv', csv, 'text/csv');
    toast('Exported edits CSV.');
  };

  const DEFAULT_OVERLAY_TEMPLATE = () => ({
    version: 1,
    meta: { updatedAt: nowIso(), schemaVersion: 1, notes: 'Exported from Catalog Console' },
    rules: {
      titleFormat: '{brand} • {collection} • {productType} • {color}',
      defaultBrand: 'AeroVista',
      priceLadders: { tee: { base: 34.99 }, hoodie_pullover: { base: 59.99 }, hoodie_zip: { base: 64.99 }, trucker_hat: { base: 34.99 }, crewneck: { base: 48.99 } },
      fees: { processorPct: 0.03, processorFixedCents: 30 },
      shipBufferCents: 400,
      costByLadder: {}
    },
    overrides: {},
    itemsByVariationId: {},
    itemsByCartKey: {},
    collections: [],
    ads: []
  });

  const buildOverlayFromCatalog = () => {
    const base = state.existingOverlay ? { ...state.existingOverlay } : DEFAULT_OVERLAY_TEMPLATE();
    const overrides = { ...(base.overrides || {}) };
    const itemsByCartKey = { ...(base.itemsByCartKey || {}) };
    const itemsByVariationId = { ...(base.itemsByVariationId || {}) };
    const isSquareId = (s) => s && /^[A-Z0-9]{20,}$/i.test(String(s).trim());

    for (let order = 0; order < state.catalog.products.length; order++) {
      const p = state.catalog.products[order];
      const rawId = (p.id || '').toString().trim();
      const productKey = rawId ? ('sq_' + rawId) : (p.key || slugify(p.title) || 'item').trim() || 'item';
      const color = (p.variants && p.variants[0] && p.variants[0].color) ? p.variants[0].color : '';
      const desc = (p.description || '').trim();
      overrides[productKey] = {
        collection: (p.group || '').trim(),
        productType: (p.type || '').trim(),
        color: color || 'Default',
        descriptionShort: desc.slice(0, 120) + (desc.length > 120 ? '…' : ''),
        description: desc
      };

      for (const v of (p.variants || [])) {
        const vColor = (v.color || color || 'Default').trim();
        const vSize = (v.size || 'One Size').trim();
        const cartKey = `${vColor}__${vSize}`;
        itemsByCartKey[cartKey] = {
          title: (p.title || '').trim(),
          tags: p.tags || [],
          order: order * 100 + (p.variants.indexOf(v) || 0),
          visible: p.status !== 'hidden'
        };
        const vid = (v.id || v.variation_id || '').toString().trim();
        if (isSquareId(vid)) {
          itemsByVariationId[vid] = {
            cartKey,
            title: (p.title || '').trim(),
            tags: p.tags || [],
            order: order * 100,
            visible: p.status !== 'hidden'
          };
        }
      }
    }

    return { ...base, overrides, itemsByCartKey, itemsByVariationId };
  };

  const exportOverlayJson = () => {
    const overlay = buildOverlayFromCatalog();
    overlay.meta = { ...overlay.meta, updatedAt: nowIso(), exportedBy: 'AeroVista Catalog Console' };
    const name = state.existingOverlay ? 'storefront_overlay_export.json' : 'storefront_overlay.json';
    download(name, JSON.stringify(overlay, null, 2), 'application/json');
    toast('Exported overlay JSON.');
  };

  const csvCell = (v) => {
    const s = String(v ?? '');
    if (/[",\n]/.test(s)) return `"${s.replaceAll('"','""')}"`;
    return s;
  };

  const download = (filename, content, mime) => {
    const blob = new Blob([content], {type: mime});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href), 500);
  };

  const hasFileSystemAccess = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  const getProjectDir = async () => {
    if (!hasFileSystemAccess()) return null;
    try {
      state.projectDirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      return state.projectDirHandle;
    } catch (e) {
      if (e.name === 'AbortError') return null;
      throw e;
    }
  };

  const backupAndWrite = async (dirHandle, filename, content) => {
    const ts = new Date().toISOString().slice(0,16).replace(/[T:]/g,'-');
    const backupName = `backups/${filename.replace('.json','')}-${ts}.json`;
    try {
      const fileHandle = await dirHandle.getFileHandle(filename, { create: false });
      const f = await fileHandle.getFile();
      const existing = await f.text();
      const backupsDir = await dirHandle.getDirectoryHandle('backups', { create: true });
      const backupHandle = await backupsDir.getFileHandle(backupName.split('/')[1], { create: true });
      const w = await backupHandle.createWritable();
      await w.write(existing);
      await w.close();
    } catch (e) {
      if (e.name !== 'NotFoundError') console.warn('Backup failed:', e);
    }
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
    const w = await fileHandle.createWritable();
    await w.write(content);
    await w.close();
  };

  const saveToProject = async () => {
    if (!hasFileSystemAccess()) {
      toast('Save to Project requires Chrome/Edge. Downloading both files instead.');
      const catalogPayload = {
        meta: { ...(state.catalog.meta||{}), exportedAt: nowIso(), exportedBy: 'AeroVista Catalog Console', sourceFile: state.lastImportedName || null, count: toStoreCatalogFormat(state.catalog.products).length },
        products: toStoreCatalogFormat(state.catalog.products)
      };
      const overlay = buildOverlayFromCatalog();
      overlay.meta = { ...overlay.meta, updatedAt: nowIso(), exportedBy: 'AeroVista Catalog Console' };
      download('square_products_edited.json', JSON.stringify(catalogPayload, null, 2), 'application/json');
      setTimeout(() => download('storefront_overlay.json', JSON.stringify(overlay, null, 2), 'application/json'), 300);
      return;
    }
    let dir = state.projectDirHandle;
    if (!dir) {
      dir = await getProjectDir();
      if (!dir) { toast('No folder selected.'); return; }
    }
    try {
      const catalogPayload = {
        meta: {
          ...(state.catalog.meta||{}),
          exportedAt: nowIso(),
          exportedBy: 'AeroVista Catalog Console',
          sourceFile: state.lastImportedName || null,
          count: toStoreCatalogFormat(state.catalog.products).length
        },
        products: toStoreCatalogFormat(state.catalog.products)
      };
      const overlay = buildOverlayFromCatalog();
      overlay.meta = { ...overlay.meta, updatedAt: nowIso(), exportedBy: 'AeroVista Catalog Console' };

      await backupAndWrite(dir, 'square_products_edited.json', JSON.stringify(catalogPayload, null, 2));
      await backupAndWrite(dir, 'storefront_overlay.json', JSON.stringify(overlay, null, 2));
      state.dirtyIds.clear();
      computeStats();
      toast('Saved to project with backup.');
    } catch (e) {
      if (e.name === 'NotAllowedError') {
        state.projectDirHandle = null;
        toast('Permission lost. Select folder again.');
      } else {
        toast('Save failed: ' + (e.message || 'Unknown error'));
        console.error(e);
      }
    }
  };

  const loadExistingOverlay = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      state.existingOverlay = data;
      toast('Loaded overlay for merge.');
    } catch (e) {
      toast('Failed to load overlay: ' + (e.message || 'Invalid JSON'));
    }
  };

  // ---- Square table import/export (Excel/CSV, same schema in and out) ----
  const SQUARE_TABLE_HEADERS = [
    'Reference Handle','Token','Item Name','Customer-facing Name','Variation Name','SKU','Description','Categories','Reporting Category','SEO Title','SEO Description','Permalink','GTIN','Square Online Item Visibility','Item Type','Weight (lb)','Social Media Link Title','Social Media Link Description','Shipping Enabled','Self-serve Ordering Enabled','Delivery Enabled','Pickup Enabled','Price','Online Sale Price','Archived','Sellable','Contains Alcohol','Stockable','Skip Detail Screen in POS','Option Name 1','Option Value 1','Option Name 2','Option Value 2','Current Quantity AeroVista','New Quantity AeroVista','Stock Alert Enabled AeroVista','Stock Alert Count AeroVista','Modifier Set - Trial'
  ];

  async function fileToRows(file) {
    const name = (file.name || '').toLowerCase();
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      if (typeof XLSX === 'undefined') throw new Error('XLSX parser not loaded. Refresh and try again.');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    }
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    const sep = lines[0] && lines[0].includes('\t') ? '\t' : ',';
    const rows = [];
    for (const line of lines) {
      const out = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
          else inQuotes = !inQuotes;
        } else if (ch === sep && !inQuotes) {
          out.push(cur);
          cur = '';
        } else {
          cur += ch;
        }
      }
      out.push(cur);
      rows.push(out);
    }
    return rows;
  }

  function rowsToProducts(tableRows) {
    if (!tableRows.length) throw new Error('No rows in file.');
    const hint = (s) => s.toLowerCase().replace(/\s+/g, ' ');
    const rowHasHeader = (row) => {
      const joined = (row || []).map(c => String(c || '').toLowerCase()).join(' ');
      return /reference\s*handle|item\s*name|sku|variation\s*name|price/.test(joined);
    };
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(5, tableRows.length); i++) {
      if (rowHasHeader(tableRows[i])) { headerRowIdx = i; break; }
    }
    const rawHeader = (tableRows[headerRowIdx] || []).map(h => String(h || '').trim());
    const headerLower = rawHeader.map(h => hint(h));
    const dataRows = tableRows.slice(headerRowIdx + 1);
    const colIndex = (name) => {
      const n = hint(name);
      const i = headerLower.findIndex(h => hint(h) === n);
      if (i >= 0) return i;
      const partial = rawHeader.findIndex(h => hint(h).includes(n) || n.includes(hint(h)));
      return partial >= 0 ? partial : -1;
    };
    const col = (row, name) => {
      const i = colIndex(name);
      return i >= 0 && row[i] != null ? String(row[i]).trim() : '';
    };
    const productsByHandle = new Map();
    for (const row of dataRows) {
      if (!row || !Array.isArray(row)) continue;
      const refHandle = col(row, 'Reference Handle') || col(row, 'Item Name') || col(row, 'Customer-facing Name');
      const sku = col(row, 'SKU');
      const hasData = refHandle || sku || col(row, 'Price') || col(row, 'Variation Name');
      if (!hasData) continue;
      const handle = refHandle || 'unnamed';
      let p = productsByHandle.get(handle);
      if (!p) {
        p = {
          id: uuid(),
          key: slugify(col(row, 'Reference Handle') || col(row, 'Item Name') || handle),
          title: col(row, 'Item Name') || col(row, 'Customer-facing Name') || '(untitled)',
          description: col(row, 'Description') || '',
          group: col(row, 'Categories') || '',
          type: col(row, 'Reporting Category') || col(row, 'Item Type') || '',
          tags: [],
          status: col(row, 'Archived') === 'true' || col(row, 'Archived') === '1' ? 'archived' : 'active',
          variants: [],
          _tableRow: {}
        };
        rawHeader.forEach((h, i) => { p._tableRow[h] = row[i] != null ? String(row[i]) : ''; });
        productsByHandle.set(handle, p);
      }
      const color = col(row, 'Option Value 1') || col(row, 'Variation Name') || '';
      const size = col(row, 'Option Value 2') || '';
      const price = col(row, 'Price') || col(row, 'Online Sale Price') || '';
      const inv = col(row, 'New Quantity AeroVista') || col(row, 'Current Quantity AeroVista') || '';
      const v = {
        id: uuid(),
        sku: col(row, 'SKU') || '',
        color: color,
        size: size,
        price: price,
        inventory: inv,
        _tableRow: {}
      };
      rawHeader.forEach((h, i) => { v._tableRow[h] = row[i] != null ? String(row[i]) : ''; });
      p.variants.push(v);
    }
    const out = Array.from(productsByHandle.values());
    if (!out.length && dataRows.length) {
      const preview = rawHeader.slice(0, 8).join(', ') || '(no headers)';
      throw new Error(`No products parsed. Headers found: ${preview}… Check column names match Square export.`);
    }
    return out;
  }

  async function importTableFile(file) {
    const rows = await fileToRows(file);
    const products = rowsToProducts(rows);
    state.catalog = {
      meta: { tool: 'AeroVista Catalog Console', version: '1.1', source: 'table', importedAt: nowIso(), fileName: file.name || '' },
      products
    };
    state.selectedId = products[0]?.id || null;
    state.dirtyIds = new Set(products.map(p => p.id));
    state.lastImportedName = file.name || null;
    computeStats();
    fillFilters();
    renderList();
    selectProduct(state.selectedId);
    toast(`Imported ${products.length} products from table.`);
  }

  function productsToTableRows() {
    const header = SQUARE_TABLE_HEADERS;
    const rows = [header];
    for (const p of state.catalog.products) {
      const base = (p._tableRow && typeof p._tableRow === 'object') ? { ...p._tableRow } : {};
      base['Reference Handle'] = base['Reference Handle'] || p.key || '';
      base['Item Name'] = base['Item Name'] || p.title || '';
      base['Customer-facing Name'] = base['Customer-facing Name'] || p.title || '';
      base['Description'] = base['Description'] || p.description || '';
      base['Categories'] = base['Categories'] || p.group || '';
      base['Reporting Category'] = base['Reporting Category'] || p.type || '';
      base['Item Type'] = base['Item Type'] || p.type || '';
      base['Archived'] = p.status === 'archived' ? 'true' : (base['Archived'] || 'false');
      if (!Array.isArray(p.variants) || !p.variants.length) {
        base['Variation Name'] = '';
        base['SKU'] = '';
        base['Option Value 1'] = '';
        base['Option Value 2'] = '';
        base['Price'] = '';
        base['Online Sale Price'] = '';
        base['New Quantity AeroVista'] = '';
        base['Current Quantity AeroVista'] = '';
        rows.push(header.map(h => base[h] != null ? base[h] : ''));
        continue;
      }
      for (const v of p.variants) {
        const r = (v._tableRow && typeof v._tableRow === 'object') ? { ...base, ...v._tableRow } : { ...base };
        r['Variation Name'] = r['Variation Name'] || (v.color && v.size ? `${v.color}, ${v.size}` : v.color || v.size || '');
        r['SKU'] = v.sku || r['SKU'] || '';
        r['Option Value 1'] = v.color || r['Option Value 1'] || '';
        r['Option Value 2'] = v.size || r['Option Value 2'] || '';
        r['Price'] = v.price != null && v.price !== '' ? v.price : r['Price'] || '';
        r['Online Sale Price'] = r['Online Sale Price'] || r['Price'] || '';
        r['New Quantity AeroVista'] = v.inventory != null && v.inventory !== '' ? v.inventory : r['New Quantity AeroVista'] || '';
        r['Current Quantity AeroVista'] = r['Current Quantity AeroVista'] || r['New Quantity AeroVista'] || '';
        rows.push(header.map(h => r[h] != null ? r[h] : ''));
      }
    }
    return rows;
  }

  function exportTableCsv() {
    const rows = productsToTableRows();
    const escapeCell = (v) => {
      const s = String(v ?? '');
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const csv = rows.map(r => r.map(escapeCell).join(',')).join('\n');
    download('catalog_table_export.csv', csv, 'text/csv');
    toast('Exported table CSV.');
  }

  const saveLocal = () => {
    const payload = {
      meta: { ...(state.catalog.meta||{}), savedAt: nowIso() },
      products: state.catalog.products
    };
    localStorage.setItem('av.catalog.console.v1', JSON.stringify(payload));
    state.dirtyIds.clear();
    computeStats();
    toast('Saved to localStorage.');
  };

  const loadLocal = () => {
    const raw = localStorage.getItem('av.catalog.console.v1');
    if (!raw){ toast('No local save found.'); return; }
    const data = JSON.parse(raw);
    const norm = normalizeIncoming(data);
    state.catalog = { meta: norm.meta, products: norm.products };
    state.selectedId = null;
    state.dirtyIds.clear();
    state.lastImportedName = (data.meta && data.meta.sourceFile) ? data.meta.sourceFile : null;
    setEditorEnabled(false);
    fillFilters();
    renderList();
    computeStats();
    toast(`Loaded ${norm.products.length} products from local.`);
  };

  const resetAll = () => {
    const ok = confirm('Reset the app state? (Local save remains unless you clear site data.)');
    if (!ok) return;
    state.catalog = { meta: {}, products: [] };
    state.selectedId = null;
    state.dirtyIds.clear();
    state.lastImportedName = null;
    setEditorEnabled(false);
    fillFilters();
    renderList();
    computeStats();
    toast('Reset done.');
  };

  const loadSample = () => {
    const sample = {
      meta: { tool: 'sample', version: '1.0' },
      products: [
        {
          id: uuid(),
          key: 'echopulse-tee',
          title: 'Echo Pulse Tee',
          group: 'EchoVerse',
          type: 'tee',
          status: 'active',
          tags: ['glitch','minimal','echopulse'],
          description: 'A clean EchoVerse tee with subtle pulse-line energy. Soft feel, durable print, daily-driver fit.',
          variants: [
            { id: uuid(), sku: 'EP-TEE-BLK-S', color:'Black', size:'S', price:'29.99', inventory:'' },
            { id: uuid(), sku: 'EP-TEE-BLK-M', color:'Black', size:'M', price:'29.99', inventory:'' },
            { id: uuid(), sku: 'EP-TEE-WHT-S', color:'White', size:'S', price:'29.99', inventory:'' }
          ]
        }
      ]
    };
    const norm = normalizeIncoming(sample);
    state.catalog = { meta: norm.meta, products: norm.products };
    state.selectedId = null;
    state.dirtyIds.clear();
    setEditorEnabled(false);
    fillFilters();
    renderList();
    computeStats();
    toast('Loaded sample catalog.');
  };

  // ---- Bind editor fields ----
  const bindField = (el, fn) => el.addEventListener('input', fn);

  const bindProductFields = () => {
    bindField($('p_title'), ()=>{
      const p = getSelected(); if (!p) return;
      p.title = $('p_title').value;
      if (!p.key) p.key = slugify(p.title);
      $('p_key').value = p.key;
      setDirty(p.id,true);
      rebuildRaw(p); renderList(); fillFilters();
    });
    bindField($('p_group'), ()=>{
      const p = getSelected(); if (!p) return;
      p.group = $('p_group').value;
      setDirty(p.id,true);
      rebuildRaw(p); renderList(); fillFilters();
    });
    bindField($('p_type'), ()=>{
      const p = getSelected(); if (!p) return;
      p.type = $('p_type').value;
      setDirty(p.id,true);
      rebuildRaw(p); renderList(); fillFilters();
    });
    bindField($('p_desc'), ()=>{
      const p = getSelected(); if (!p) return;
      p.description = $('p_desc').value;
      setDirty(p.id,true);
      rebuildRaw(p); renderList();
    });
    bindField($('p_tagsCustom'), ()=>{
      const p = getSelected(); if (!p) return;
      const presetSelected = (p.tags||[]).filter(t=>PRESET_TAGS.includes(String(t).toLowerCase()));
      const custom = $('p_tagsCustom').value.split(',').map(s=>s.trim()).filter(Boolean);
      p.tags = [...presetSelected, ...custom];
      setDirty(p.id,true);
      rebuildRaw(p); renderList();
    });
    bindField($('p_key'), ()=>{
      const p = getSelected(); if (!p) return;
      p.key = $('p_key').value;
      setDirty(p.id,true);
      rebuildRaw(p);
    });
    $('p_status').addEventListener('change', ()=>{
      const p = getSelected(); if (!p) return;
      p.status = $('p_status').value;
      setDirty(p.id,true);
      rebuildRaw(p); renderList();
    });
  };

  // ---- Global bindings ----
  const bindUi = () => {
    $('btnImport').addEventListener('click', ()=> $('fileInput').click());
    $('btnImport2').addEventListener('click', ()=> $('fileInput').click());
    $('fileInput').addEventListener('change', async (e)=>{
      const f = e.target.files?.[0];
      if (!f) return;
      try { await importJson(f); }
      catch(err){ toast('Import failed: ' + err.message); }
      e.target.value = '';
    });

    $('btnImportTable').addEventListener('click', () => $('tableFileInput').click());
    $('btnImportTable2').addEventListener('click', () => $('tableFileInput').click());
    $('tableFileInput').addEventListener('change', async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      try { await importTableFile(f); }
      catch (err) { toast('Table import failed: ' + err.message); console.error(err); }
      e.target.value = '';
    });

    $('btnExport').addEventListener('click', exportJson);
    $('btnExportTable').addEventListener('click', exportTableCsv);
    $('btnExportOverlay').addEventListener('click', exportOverlayJson);
    $('btnExportEdits').addEventListener('click', exportEditsCsv);
    $('btnSaveToProject').addEventListener('click', saveToProject);
    $('btnLoadOverlay').addEventListener('click', ()=> $('overlayFileInput').click());
    $('overlayFileInput').addEventListener('change', (e)=>{
      const f = e.target.files?.[0];
      if (f) loadExistingOverlay(f);
      e.target.value = '';
    });

    $('btnNewProduct').addEventListener('click', newProduct);
    $('btnAddVar').addEventListener('click', addVariant);
    $('btnAutoVar').addEventListener('click', autoSplitVariants);

    $('btnDelete').addEventListener('click', deleteSelected);
    $('btnDuplicate').addEventListener('click', duplicateSelected);

    $('btnSaveLocal').addEventListener('click', saveLocal);
    $('btnLoadLocal').addEventListener('click', loadLocal);
    $('btnReset').addEventListener('click', resetAll);

    $('btnLoadSample').addEventListener('click', loadSample);

    $('q').addEventListener('input', renderList);
    $('filterGroup').addEventListener('change', renderList);
    $('filterType').addEventListener('change', renderList);
    if ($('filterTags')) $('filterTags').addEventListener('change', renderList);

    $('btnCopyRaw').addEventListener('click', ()=>{
      navigator.clipboard.writeText($('p_raw').value);
      toast('Copied raw JSON.');
    });
    $('btnApplyRaw').addEventListener('click', applyRaw);
    $('btnRebuildRaw').addEventListener('click', ()=>{
      const p = getSelected(); if (!p) return;
      rebuildRaw(p);
      toast('Rebuilt raw JSON from form.');
    });

    // Ctrl+S save local
    window.addEventListener('keydown', (e)=>{
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='s'){
        e.preventDefault();
        saveLocal();
      }
    });
  };

  // ---- Initialize ----
  function init(){
    // empty filter selects
    $('filterGroup').innerHTML = `<option>(all)</option>`;
    $('filterType').innerHTML = `<option>(all)</option>`;
    bindUi();
    bindProductFields();
    computeStats();
    renderList();
  }
  init();
})();
