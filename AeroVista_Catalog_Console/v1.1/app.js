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
  };

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

  // ---- CSV → Catalog JSON (schema: { products: [...] }) ----
  const parseCSV = (text) => {
    const rows = [];
    let i = 0;
    const s = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    while (i < s.length) {
      const row = [];
      while (i < s.length) {
        if (s[i] === '"') {
          i += 1;
          let cell = '';
          while (i < s.length) {
            if (s[i] === '"') {
              i += 1;
              if (s[i] === '"') { cell += '"'; i += 1; }
              else break;
            } else { cell += s[i]; i += 1; }
          }
          row.push(cell);
        } else {
          let cell = '';
          while (i < s.length && s[i] !== ',' && s[i] !== '\n') { cell += s[i]; i += 1; }
          row.push(cell.trim());
        }
        if (i < s.length && s[i] === ',') { i += 1; continue; }
        if (i < s.length && s[i] === '\n') { i += 1; break; }
      }
      if (row.length) rows.push(row);
    }
    return rows;
  };

  const toCamelCase = (str) => {
    const s = String(str).trim().replace(/\s+/g, ' ');
    if (!s) return '';
    return s.split(/[\s_-]+/).filter(Boolean).map((p, i) => {
      const lower = p.toLowerCase();
      return i === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    }).join('');
  };

  const csvToCatalogJson = (csvText) => {
    const rows = parseCSV(csvText);
    if (!rows.length) throw new Error('CSV is empty');
    const rawHeaders = rows[0];
    const headers = rawHeaders.map((h, idx) => {
      const key = toCamelCase(h);
      return key || 'field' + idx;
    });
    const products = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const obj = {};
      for (let c = 0; c < headers.length; c++) {
        const key = headers[c];
        let val = row[c] !== undefined ? String(row[c]).trim() : '';
        if (key.toLowerCase() === 'price') {
          const num = parseFloat(val.replace(/[$,]/g, ''));
          if (!isNaN(num)) val = (num < 100 && num > 0 && val.includes('.')) ? Math.round(num * 100) : Math.round(num);
        } else if (/^\d+$/.test(val)) val = parseInt(val, 10);
        else if (/^\d*\.\d+$/.test(val)) val = parseFloat(val);
        obj[key] = val;
      }
      const title = obj.title || obj.name || obj.Title || obj.Name || '';
      const priceVal = obj.price != null && obj.price !== '' ? obj.price : (obj.priceCents != null ? obj.priceCents : '');
      const priceDisplay = typeof priceVal === 'number' && priceVal >= 100 ? (priceVal / 100).toFixed(2) : (priceVal === '' ? '' : String(priceVal));
      products.push({
        id: obj.id || obj.productId || obj.sku || uuid(),
        title: title || ('Item ' + r),
        description: obj.description || obj.desc || '',
        group: obj.group || obj.collection || '',
        type: obj.type || obj.category || obj.productType || '',
        tags: typeof obj.tags === 'string' ? obj.tags.split(',').map(s => s.trim()).filter(Boolean) : (Array.isArray(obj.tags) ? obj.tags : []),
        status: obj.status || 'active',
        key: obj.key || obj.handle || slugify(title || ('item-' + r)),
        imagePath: obj.imagePath || obj.image || obj.img || '',
        variants: [{
          id: uuid(),
          sku: obj.sku || obj.variantSku || '',
          color: obj.color || '',
          size: obj.size || '',
          price: priceDisplay,
          inventory: obj.inventory ?? ''
        }]
      });
    }
    return { products };
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
    for (const p of state.catalog.products){
      if (p.group) groups.add(p.group);
      if (p.type) types.add(p.type);
    }
    const setOptions = (sel, set) => {
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

    const items = state.catalog.products
      .filter(p => (fg==='(all)' || (p.group||'')===fg))
      .filter(p => (ft==='(all)' || (p.type||'')===ft))
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
    $('p_tags').value = (p.tags||[]).join(', ');
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

  const importCsv = async (file) => {
    const text = await file.text();
    const data = csvToCatalogJson(text);
    const norm = normalizeIncoming(data);
    state.catalog = { meta: norm.meta, products: norm.products };
    state.selectedId = null;
    state.dirtyIds.clear();
    state.lastImportedName = (file.name || '').replace(/\.csv$/i, '') + '.json';
    setEditorEnabled(false);
    fillFilters();
    renderList();
    computeStats();
    toast(`Imported CSV: ${norm.products.length} products.`);
  };

  const exportJson = () => {
    // Export in our canonical shape: {meta, products}
    const payload = {
      meta: {
        ...(state.catalog.meta||{}),
        exportedAt: nowIso(),
        exportedBy: 'AeroVista Catalog Console',
        sourceFile: state.lastImportedName || null
      },
      products: state.catalog.products
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
    bindField($('p_tags'), ()=>{
      const p = getSelected(); if (!p) return;
      p.tags = $('p_tags').value.split(',').map(s=>s.trim()).filter(Boolean);
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

    $('btnImportCsv').addEventListener('click', ()=> $('csvFileInput').click());
    $('csvFileInput').addEventListener('change', async (e)=>{
      const f = e.target.files?.[0];
      if (!f) return;
      try { await importCsv(f); }
      catch(err){ toast('CSV import failed: ' + err.message); }
      e.target.value = '';
    });

    $('btnExport').addEventListener('click', exportJson);
    $('btnExportEdits').addEventListener('click', exportEditsCsv);

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


    // Tabs
    $('tabEdit').addEventListener('click', ()=>setTab('edit'));
    $('tabBulk').addEventListener('click', ()=>setTab('bulk'));
    $('tabValidate').addEventListener('click', ()=>setTab('validate'));

    // Bulk scope label
    $('bulkScope').addEventListener('change', ()=>{
      $('bulkScopeLabel').textContent = $('bulkScope').value;
    });

    // Bulk actions
    $('btnBulkApplyTags').addEventListener('click', bulkApplyTagGroupChanges);
    $('btnBulkNormalizeTags').addEventListener('click', bulkNormalizeAllTags);

    $('btnBulkApplyPricing').addEventListener('click', bulkApplyPricing);
    $('btnBulkRoundPrices').addEventListener('click', bulkRoundPrices99);

    $('btnBulkNormalizeSizes').addEventListener('click', bulkNormalizeSizes);
    $('btnBulkNormalizeColors').addEventListener('click', bulkNormalizeColors);
    $('btnBulkSortVariants').addEventListener('click', bulkSortVariants);

    $('btnBulkMergePreview').addEventListener('click', mergePreview);
    $('btnBulkMerge').addEventListener('click', ()=>{
      const ok = confirm('Merge duplicates in current scope? This changes the catalog (safe, but not reversible except re-import).');
      if (!ok) return;
      mergeDuplicatesSafe();
    });

    // Validation
    let lastIssues = [];
    $('btnRunValidate').addEventListener('click', ()=>{
      lastIssues = validateCatalog();
      toast('Validation complete.');
    });
    $('btnExportIssues').addEventListener('click', ()=>{
      if (!lastIssues.length) lastIssues = validateCatalog();
      exportIssuesCsv(lastIssues);
    });


    // Ctrl+S save local
    window.addEventListener('keydown', (e)=>{
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='s'){
        e.preventDefault();
        saveLocal();
      }
    });
  };



  // ---- Tabs (Edit / Bulk / Validate) ----
  const setTab = (name) => {
    const isEdit = name === 'edit';
    const isBulk = name === 'bulk';
    const isVal  = name === 'validate';
    $('panelEdit').classList.toggle('hidden', !isEdit);
    $('panelBulk').classList.toggle('hidden', !isBulk);
    $('panelValidate').classList.toggle('hidden', !isVal);

    $('tabEdit').classList.toggle('btn-primary', isEdit);
    $('tabBulk').classList.toggle('btn-primary', isBulk);
    $('tabValidate').classList.toggle('btn-primary', isVal);

    // Remove primary class from others
    if (!isEdit) $('tabEdit').classList.remove('btn-primary');
    if (!isBulk) $('tabBulk').classList.remove('btn-primary');
    if (!isVal) $('tabValidate').classList.remove('btn-primary');

    // Ensure active tab has primary styling
    if (isEdit) $('tabEdit').classList.add('btn-primary');
    if (isBulk) $('tabBulk').classList.add('btn-primary');
    if (isVal) $('tabValidate').classList.add('btn-primary');
  };

  // ---- Scope helpers ----
  const getFilteredIds = () => {
    const q = $('q').value.trim().toLowerCase();
    const fg = $('filterGroup').value;
    const ft = $('filterType').value;

    return state.catalog.products
      .filter(p => (fg==='(all)' || (p.group||'')===fg))
      .filter(p => (ft==='(all)' || (p.type||'')===ft))
      .filter(p => (q==='' || matches(p,q)))
      .map(p => p.id);
  };

  const getScopeProducts = () => {
    const scope = $('bulkScope')?.value || 'filtered';
    $('bulkScopeLabel').textContent = scope;
    if (scope === 'selected') {
      const p = getSelected();
      return p ? [p] : [];
    }
    if (scope === 'all') return [...state.catalog.products];
    const ids = new Set(getFilteredIds());
    return state.catalog.products.filter(p => ids.has(p.id));
  };

  // ---- Normalizers ----
  const SIZE_ORDER = ['XS','S','M','L','XL','2XL','3XL','4XL','5XL'];
  const SIZE_ALIASES = {
    'X-SMALL':'XS','XS':'XS','EXTRA SMALL':'XS',
    'SMALL':'S','S':'S',
    'MEDIUM':'M','M':'M',
    'LARGE':'L','L':'L',
    'X-LARGE':'XL','XL':'XL','EXTRA LARGE':'XL',
    '2X':'2XL','XXL':'2XL','2XL':'2XL',
    '3X':'3XL','XXXL':'3XL','3XL':'3XL',
    '4X':'4XL','4XL':'4XL',
    '5X':'5XL','5XL':'5XL',
  };

  const normSize = (s) => {
    const raw = String(s||'').trim();
    if (!raw) return '';
    const u = raw.toUpperCase().replace(/\./g,'').replace(/\s+/g,' ').trim();
    // handle patterns like "2XL" already
    return SIZE_ALIASES[u] || raw.trim();
  };

  const titleCase = (s) => String(s||'').toLowerCase().replace(/\b[a-z]/g, c=>c.toUpperCase());
  const COLOR_ALIASES = {
    'Grey':'Gray',
    'Heather Grey':'Heather Gray',
    'Charcoal Grey':'Charcoal Gray'
  };
  const normColor = (c) => {
    const raw = String(c||'').trim();
    if (!raw) return '';
    // normalize separators
    const cleaned = raw.replace(/\s+/g,' ').trim();
    const tc = titleCase(cleaned);
    return COLOR_ALIASES[tc] || tc;
  };

  const normTags = (tags) => {
    const seen = new Set();
    const out = [];
    for (const t of (tags||[])) {
      const v = String(t||'').trim().toLowerCase();
      if (!v) continue;
      if (seen.has(v)) continue;
      seen.add(v);
      out.push(v);
    }
    return out;
  };

  const sortVariantsColorSize = (p) => {
    const idx = (s) => {
      const ns = normSize(s);
      const pos = SIZE_ORDER.indexOf(ns);
      return pos === -1 ? 999 : pos;
    };
    p.variants = (p.variants||[]).slice().sort((a,b)=>{
      const ca = normColor(a.color||'');
      const cb = normColor(b.color||'');
      if (ca !== cb) return ca.localeCompare(cb);
      return idx(a.size) - idx(b.size);
    });
  };

  // ---- Bulk actions ----
  const bulkApplyTagGroupChanges = () => {
    const ps = getScopeProducts();
    if (!ps.length) { toast('No products in scope.'); return; }

    const addTags = $('bulkAddTags').value.split(',').map(s=>s.trim()).filter(Boolean).map(s=>s.toLowerCase());
    const remTags = $('bulkRemoveTags').value.split(',').map(s=>s.trim()).filter(Boolean).map(s=>s.toLowerCase());
    const setGroup = $('bulkSetGroup').value.trim();
    const setType = $('bulkSetType').value.trim();

    let changed = 0;
    for (const p of ps){
      let tags = Array.isArray(p.tags) ? p.tags : [];
      tags = tags.map(t=>String(t).trim().toLowerCase()).filter(Boolean);
      if (addTags.length) tags = tags.concat(addTags);
      if (remTags.length) tags = tags.filter(t=>!remTags.includes(t));
      const newTags = normTags(tags);
      const tagsChanged = JSON.stringify(newTags) !== JSON.stringify(p.tags||[]);
      if (tagsChanged) p.tags = newTags;

      if (setGroup && p.group !== setGroup) p.group = setGroup;
      if (setType && p.type !== setType) p.type = setType;

      if (tagsChanged || (setGroup && p.group===setGroup) || (setType && p.type===setType)) {
        setDirty(p.id,true);
        changed++;
      }
    }
    fillFilters();
    renderList();
    computeStats();
    toast(`Applied changes to ${changed} products.`);
  };

  const bulkNormalizeAllTags = () => {
    const ps = getScopeProducts();
    if (!ps.length) { toast('No products in scope.'); return; }
    let changed = 0;
    for (const p of ps){
      const old = Array.isArray(p.tags) ? p.tags : [];
      const n = normTags(old);
      if (JSON.stringify(n) !== JSON.stringify(old)){
        p.tags = n;
        setDirty(p.id,true);
        changed++;
      }
    }
    renderList(); computeStats();
    toast(`Normalized tags on ${changed} products.`);
  };

  const bulkApplyPricing = () => {
    const ps = getScopeProducts();
    if (!ps.length) { toast('No products in scope.'); return; }

    const setP = $('bulkSetPrice').value.trim();
    const delta = $('bulkPriceDelta').value.trim();
    const typePricingRaw = $('bulkTypePricing').value.trim();
    let typePricing = null;
    if (typePricingRaw) {
      try { typePricing = JSON.parse(typePricingRaw); }
      catch(e){ toast('Type pricing JSON invalid.'); return; }
    }

    const asNum = (x) => {
      const n = Number(String(x).replace(/[^\d.-]/g,''));
      return Number.isFinite(n) ? n : null;
    };

    const setVal = setP ? asNum(setP) : null;
    const dVal = delta ? asNum(delta) : null;

    let changed = 0;
    for (const p of ps){
      const priceForType = typePricing && p.type ? asNum(typePricing[p.type]) : null;
      for (const v of (p.variants||[])){
        const cur = asNum(v.price);
        let next = cur;
        if (priceForType !== null) next = priceForType;
        else if (setVal !== null) next = setVal;
        else if (dVal !== null && cur !== null) next = cur + dVal;

        if (next !== null) {
          const fixed = next.toFixed(2);
          if (String(v.price||'') !== fixed){
            v.price = fixed;
            setDirty(p.id,true);
            changed++;
          }
        }
      }
    }
    if (state.selectedId) {
      const sel = getSelected();
      if (sel) { renderVariants(sel); rebuildRaw(sel); }
    }
    renderList(); computeStats();
    toast(`Updated ${changed} variant prices.`);
  };

  const bulkRoundPrices99 = () => {
    const ps = getScopeProducts();
    if (!ps.length) { toast('No products in scope.'); return; }
    const asNum = (x) => {
      const n = Number(String(x).replace(/[^\d.-]/g,''));
      return Number.isFinite(n) ? n : null;
    };
    let changed=0;
    for (const p of ps){
      for (const v of (p.variants||[])){
        const cur = asNum(v.price);
        if (cur === null) continue;
        const rounded = Math.floor(cur) + 0.99;
        const fixed = rounded.toFixed(2);
        if (String(v.price||'') !== fixed){
          v.price = fixed;
          setDirty(p.id,true);
          changed++;
        }
      }
    }
    if (state.selectedId) {
      const sel = getSelected();
      if (sel) { renderVariants(sel); rebuildRaw(sel); }
    }
    renderList(); computeStats();
    toast(`Rounded ${changed} prices to .99.`);
  };

  const bulkNormalizeSizes = () => {
    const ps = getScopeProducts();
    if (!ps.length) { toast('No products in scope.'); return; }
    let changed=0;
    for (const p of ps){
      for (const v of (p.variants||[])){
        const n = normSize(v.size);
        if (n && n !== v.size){
          v.size = n;
          setDirty(p.id,true);
          changed++;
        }
      }
    }
    if (state.selectedId) {
      const sel = getSelected();
      if (sel) { renderVariants(sel); rebuildRaw(sel); }
    }
    renderList(); computeStats();
    toast(`Normalized ${changed} sizes.`);
  };

  const bulkNormalizeColors = () => {
    const ps = getScopeProducts();
    if (!ps.length) { toast('No products in scope.'); return; }
    let changed=0;
    for (const p of ps){
      for (const v of (p.variants||[])){
        const n = normColor(v.color);
        if (n && n !== v.color){
          v.color = n;
          setDirty(p.id,true);
          changed++;
        }
      }
    }
    if (state.selectedId) {
      const sel = getSelected();
      if (sel) { renderVariants(sel); rebuildRaw(sel); }
    }
    renderList(); computeStats();
    toast(`Normalized ${changed} colors.`);
  };

  const bulkSortVariants = () => {
    const ps = getScopeProducts();
    if (!ps.length) { toast('No products in scope.'); return; }
    let changed=0;
    for (const p of ps){
      const before = JSON.stringify(p.variants||[]);
      sortVariantsColorSize(p);
      const after = JSON.stringify(p.variants||[]);
      if (before !== after){
        setDirty(p.id,true);
        changed++;
      }
    }
    if (state.selectedId) {
      const sel = getSelected();
      if (sel) { renderVariants(sel); rebuildRaw(sel); }
    }
    renderList(); computeStats();
    toast(`Sorted variants on ${changed} products.`);
  };

  // ---- Merge / Dedupe ----
  const normKey = (p) => {
    const t = String(p.title||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    const g = String(p.group||'').toLowerCase().trim();
    const ty = String(p.type||'').toLowerCase().trim();
    return [t,g,ty].join('||');
  };

  const variantKey = (v) => {
    const sku = String(v.sku||'').trim();
    if (sku) return 'sku:'+sku.toLowerCase();
    return 'cs:' + (normColor(v.color||'')+'|'+normSize(v.size||'')).toLowerCase();
  };

  const mergePreview = () => {
    const ps = getScopeProducts();
    if (!ps.length) { $('bulkMergeLog').value = 'No products in scope.'; return; }
    const buckets = new Map();
    for (const p of ps){
      const k = normKey(p);
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(p);
    }
    const lines = [];
    let groups=0;
    for (const [k, arr] of buckets.entries()){
      if (arr.length<=1) continue;
      groups++;
      lines.push(`MERGE GROUP (${arr.length}) :: ${arr[0].title} [${arr[0].group||'-'} • ${arr[0].type||'-'}]`);
      arr.forEach(p=>lines.push(`  - ${p.id} (${(p.variants||[]).length} variants)`));
    }
    $('bulkMergeLog').value = lines.length ? lines.join('\n') : 'No duplicates found for merge rules.';
  };

  const mergeDuplicatesSafe = () => {
    const ps = getScopeProducts();
    if (!ps.length) { toast('No products in scope.'); return; }

    const buckets = new Map();
    for (const p of ps){
      const k = normKey(p);
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(p);
    }

    let mergedGroups = 0;
    let removed = 0;

    for (const [k, arr] of buckets.entries()){
      if (arr.length<=1) continue;

      // Choose keeper: first with longest description, else first
      arr.sort((a,b)=> (String(b.description||'').length) - (String(a.description||'').length));
      const keep = arr[0];
      keep.source_ids = Array.isArray(keep.source_ids) ? keep.source_ids : [];
      keep.source_ids.push(...arr.slice(1).map(x=>x.id));

      // Union tags
      const tagUnion = normTags([...(keep.tags||[]), ...arr.slice(1).flatMap(x=>x.tags||[])]);
      keep.tags = tagUnion;

      // Keep best group/type/status if missing
      if (!keep.group) keep.group = arr.find(x=>x.group)?.group || '';
      if (!keep.type) keep.type = arr.find(x=>x.type)?.type || '';
      if (!keep.description) keep.description = arr.find(x=>x.description)?.description || '';

      // Merge variants
      const seen = new Set();
      const outVars = [];
      for (const p of arr){
        for (const v of (p.variants||[])){
          const vk = variantKey(v);
          if (seen.has(vk)) continue;
          seen.add(vk);
          outVars.push({
            id: v.id || uuid(),
            sku: v.sku || '',
            color: v.color || '',
            size: v.size || '',
            price: v.price ?? '',
            inventory: v.inventory ?? ''
          });
        }
      }
      keep.variants = outVars;
      sortVariantsColorSize(keep);
      setDirty(keep.id,true);

      // Remove the others from main catalog
      const removeIds = new Set(arr.slice(1).map(x=>x.id));
      const beforeLen = state.catalog.products.length;
      state.catalog.products = state.catalog.products.filter(p => !removeIds.has(p.id));
      removed += (beforeLen - state.catalog.products.length);

      // Clean dirty markers for removed
      removeIds.forEach(id=>state.dirtyIds.delete(id));

      mergedGroups++;
    }

    fillFilters();
    renderList();
    computeStats();
    mergePreview();
    toast(`Merged ${mergedGroups} groups. Removed ${removed} duplicates.`);
  };

  // ---- Validation ----
  const validateCatalog = () => {
    const issues = [];
    const missingDesc = [];
    const missingPrice = [];
    const dupSku = [];
    const invalidSize = [];
    const noVariants = [];

    const skuMap = new Map(); // sku -> [{pid, vid}]
    const validSizes = new Set(SIZE_ORDER);

    for (const p of state.catalog.products){
      if (!p.variants || p.variants.length===0){
        noVariants.push({ pid: p.id, title: p.title });
      }
      if (!String(p.description||'').trim()){
        missingDesc.push({ pid: p.id, title: p.title });
      }

      for (const v of (p.variants||[])){
        const priceNum = Number(String(v.price||'').replace(/[^\d.]/g,''));
        if (!Number.isFinite(priceNum) || priceNum<=0){
          missingPrice.push({ pid: p.id, title: p.title, sku: v.sku||'', detail: `price="${v.price}"` });
        }
        const ns = normSize(v.size);
        if (v.size && ns && !validSizes.has(ns)){
          invalidSize.push({ pid: p.id, title: p.title, sku: v.sku||'', detail: `size="${v.size}"` });
        }
        const sku = String(v.sku||'').trim();
        if (sku){
          const key = sku.toLowerCase();
          if (!skuMap.has(key)) skuMap.set(key, []);
          skuMap.get(key).push({ pid: p.id, title: p.title, sku });
        }
      }
    }

    for (const [sku, arr] of skuMap.entries()){
      if (arr.length<=1) continue;
      arr.forEach(x=>dupSku.push({ pid: x.pid, title: x.title, sku: x.sku, detail: `duplicate SKU` }));
    }

    const addIssueBlock = (kind, arr, severity) => {
      for (const it of arr){
        issues.push({
          kind, severity,
          pid: it.pid,
          title: it.title || '',
          sku: it.sku || '',
          detail: it.detail || ''
        });
      }
    };

    addIssueBlock('Missing description', missingDesc, 'warn');
    addIssueBlock('Missing/invalid price', missingPrice, 'danger');
    addIssueBlock('Duplicate SKU', dupSku, 'danger');
    addIssueBlock('Invalid size', invalidSize, 'warn');
    addIssueBlock('No variants', noVariants, 'warn');

    // summary
    $('v_missingDesc').textContent = String(missingDesc.length);
    $('v_missingPrice').textContent = String(missingPrice.length);
    $('v_dupSku').textContent = String(new Set(dupSku.map(x=>x.sku.toLowerCase())).size);
    $('v_invalidSize').textContent = String(invalidSize.length);
    $('v_noVariants').textContent = String(noVariants.length);

    // render issues list
    const container = $('issuesList');
    container.innerHTML = '';
    if (!issues.length){
      container.innerHTML = `<div class="ok text-sm">No issues found 🎉</div>`;
      return issues;
    }

    issues.sort((a,b)=> (a.severity===b.severity? a.kind.localeCompare(b.kind) : (a.severity==='danger'?-1:1)));

    for (const it of issues){
      const row = document.createElement('button');
      const badge = it.severity==='danger' ? 'danger' : (it.severity==='warn'?'warn':'hint');
      row.className = `w-full text-left rounded-2xl px-3 py-3 mb-2 border border-[rgba(255,255,255,.10)] bg-[rgba(255,255,255,.03)] hover:bg-[rgba(255,255,255,.06)] transition`;
      row.innerHTML = `
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="chip text-[11px] px-2 py-0.5 rounded-lg ${badge}">${escapeHtml(it.kind)}</span>
              ${it.sku?`<span class="chip text-[11px] px-2 py-0.5 rounded-lg mono">${escapeHtml(it.sku)}</span>`:''}
            </div>
            <div class="mt-1 font-medium truncate">${escapeHtml(it.title||'')}</div>
            ${it.detail?`<div class="hint text-xs mt-1 truncate">${escapeHtml(it.detail)}</div>`:''}
          </div>
          <div class="hint text-xs mono">${escapeHtml(it.pid.slice(0,8))}</div>
        </div>
      `;
      row.addEventListener('click', ()=>{
        setTab('edit');
        selectProduct(it.pid);
      });
      container.appendChild(row);
    }
    return issues;
  };

  const exportIssuesCsv = (issues) => {
    const rows = [];
    rows.push(['kind','severity','product_id','title','sku','detail']);
    for (const it of issues){
      rows.push([it.kind, it.severity, it.pid, it.title, it.sku, it.detail]);
    }
    const csv = rows.map(r=>r.map(csvCell).join(',')).join('\n');
    download('catalog_validation_issues.csv', csv, 'text/csv');
    toast('Exported issues CSV.');
  };


  // ---- Initialize ----
  function init(){
    // empty filter selects
    $('filterGroup').innerHTML = `<option>(all)</option>`;
    $('filterType').innerHTML = `<option>(all)</option>`;
    bindUi();
    bindProductFields();
    // default tab
    setTab('edit');
    if ($('bulkScopeLabel') && $('bulkScope')) $('bulkScopeLabel').textContent = $('bulkScope').value;

    computeStats();
    renderList();
  }
  init();
})();
