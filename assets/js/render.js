/* ============================================================
   RENDERIZADO (KPIs, marcas, tabla, tarjetas, paginación)
   ============================================================ */

const Render = (() => {

  let activeBrand    = 'TODAS';
  let currentViewMode = 'list';
  let sortField = null;
  let sortAsc   = true;
  let currentPage = 1;
  let itemsPerPage = 25;

  /* ---------- Filtros dinámicos ---------- */
  function renderDynamicFilters() {
    const catSel = document.getElementById('categoryFilter');
    const currentCat = catSel.value;
    catSel.innerHTML = '<option value="ALL">Todas las Categorías</option>';
    CONFIG.CATEGORIAS.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.innerText = c.charAt(0) + c.slice(1).toLowerCase();
      catSel.appendChild(opt);
    });
    if ([...catSel.options].some(o => o.value === currentCat)) catSel.value = currentCat;

    const areaSel = document.getElementById('areaFilter');
    const currentArea = areaSel.value;
    areaSel.innerHTML = '<option value="ALL">Todas las Áreas</option>';
    DB.getUniqueAreas().forEach(a => {
      const opt = document.createElement('option');
      opt.value = a;
      opt.innerText = a;
      areaSel.appendChild(opt);
    });
    if ([...areaSel.options].some(o => o.value === currentArea)) areaSel.value = currentArea;

    const formMarca = document.getElementById('formMarca');
    formMarca.innerHTML = '';
    CONFIG.MARCAS.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.innerText = m.charAt(0)+m.slice(1).toLowerCase();
      formMarca.appendChild(opt);
    });

    const formCat = document.getElementById('formCat');
    formCat.innerHTML = '';
    CONFIG.CATEGORIAS.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.innerText = c.charAt(0)+c.slice(1).toLowerCase();
      formCat.appendChild(opt);
    });
  }

  /* ---------- Marcas (pills) ---------- */
  function renderBrandPills() {
    const cont = document.getElementById('brandPills');
    cont.innerHTML = '';
    const makeBtn = (label, value) => {
      const b = document.createElement('button');
      b.innerText = label;
      b.className = 'brand-btn px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition ' +
        (activeBrand===value
          ? 'bg-brand-500 text-white'
          : 'bg-white hover:bg-oxford-100 text-oxford-700 border border-oxford-200');
      b.onclick = () => { activeBrand = value; setPage(1); renderBrandPills(); renderContent(); };
      return b;
    };
    cont.appendChild(makeBtn('Todas', 'TODAS'));
    CONFIG.MARCAS.forEach(m => {
      cont.appendChild(makeBtn(m.charAt(0)+m.slice(1).toLowerCase(), m));
    });
  }

  /* ---------- Filtro + orden ---------- */
  function getFiltered() {
    const search  = document.getElementById('searchInput').value.toLowerCase();
    const statusF = document.getElementById('statusFilter').value;
    const catF    = document.getElementById('categoryFilter').value;
    const areaF   = document.getElementById('areaFilter').value;

    let filtered = DB.getAll().filter(item => {
      const matchBrand  = (activeBrand === 'TODAS') ||
                          (String(item.marca).toUpperCase() === activeBrand.toUpperCase());
      const matchSearch = String(item.sku).toLowerCase().includes(search) ||
                          String(item.desc).toLowerCase().includes(search) ||
                          String(item.empaque).toLowerCase().includes(search);
      const matchStatus = (statusF === 'ALL') || (item.estatus === statusF);
      const matchCat    = (catF === 'ALL') ||
                          (String(item.categoria).toUpperCase() === catF.toUpperCase());
      const matchArea   = (areaF === 'ALL') || (item.area === areaF);
      return matchBrand && matchSearch && matchStatus && matchCat && matchArea;
    });

    if (sortField) {
      filtered.sort((a,b) => {
        const va = (a[sortField]||'').toString().toLowerCase();
        const vb = (b[sortField]||'').toString().toLowerCase();
        if (va < vb) return sortAsc ? -1 : 1;
        if (va > vb) return sortAsc ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }

  function updateSortIndicators() {
    ['sku','marca','estatus'].forEach(f => {
      const el = document.getElementById('sort-' + f);
      if (!el) return;
      if (sortField === f) {
        el.className = 'fa-solid text-[10px] ml-1 ' +
          (sortAsc ? 'fa-sort-up sort-active' : 'fa-sort-down sort-active');
      } else {
        el.className = 'fa-solid fa-sort text-[10px] ml-1';
      }
    });
  }

  /* ---------- Render principal ---------- */
  function renderContent() {
    const filtered = getFiltered();
    const perPage = itemsPerPage === 'ALL' ? (filtered.length || 1) : itemsPerPage;
    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    let paged;
    if (itemsPerPage === 'ALL') {
      paged = filtered;
    } else {
      const start = (currentPage - 1) * itemsPerPage;
      paged = filtered.slice(start, start + itemsPerPage);
    }

    if (currentViewMode === 'list') renderTable(paged);
    else renderCards(paged);

    document.getElementById('kpiTotal').innerText = DB.length();
    document.getElementById('kpiAprobados').innerText =
      DB.getAll().filter(i => i.estatus === 'Aprobado').length;
    document.getElementById('kpiDesactualizados').innerText =
      DB.getAll().filter(i => i.estatus === 'Desactualizado').length;
    document.getElementById('kpiMarcas').innerText =
      new Set(DB.getAll().map(i => i.marca)).size;

    updateSortIndicators();
    renderPagination(filtered.length, totalPages);
  }

  /* ---------- Tabla ---------- */
  function renderTable(filtered) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    const empty = document.getElementById('emptyTable');
    if (filtered.length === 0) { empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');

    const all = DB.getAll();
    filtered.forEach(item => {
      const originalIndex = all.indexOf(item);
      const badgeClass = item.estatus === 'Aprobado' ? 'badge-aprobado' : 'badge-desactualizado';
      const canEdit = Auth.can('edit');
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-brand-50/50 cursor-pointer transition group';
      tr.onclick = () => Modals.openSplitModal(originalIndex);
      tr.innerHTML = `
        <td class="py-3.5 px-4 font-mono font-bold text-brand-600 group-hover:underline">${Utils.escapeHtml(item.sku)}</td>
        <td class="py-3.5 px-4 font-medium text-oxford-800 max-w-xs truncate" title="${Utils.escapeHtml(item.desc)}">${Utils.escapeHtml(item.desc)}</td>
        <td class="py-3.5 px-4 font-semibold text-oxford-700">${Utils.escapeHtml(item.marca)}</td>
        <td class="py-3.5 px-4 text-oxford-500">${Utils.escapeHtml(item.categoria)}</td>
        <td class="py-3.5 px-4 text-oxford-600">${Utils.escapeHtml(item.empaque)}</td>
        <td class="py-3.5 px-4"><span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${badgeClass}">${Utils.escapeHtml(item.estatus)}</span></td>
        <td class="py-3.5 px-4 text-oxford-500 text-[11px]">${Utils.escapeHtml(item.area)} <br><span class="text-oxford-400">Resp: ${Utils.escapeHtml(item.gerencia)}</span></td>
        <td class="py-3.5 px-4 text-center">
          <button onclick="event.stopPropagation(); Modals.openSplitModal(${originalIndex})" class="inline-flex items-center space-x-1.5 text-brand-600 hover:text-white hover:bg-brand-500 font-semibold bg-brand-50 px-3 py-1.5 rounded-lg border border-brand-200 transition shadow-sm text-xs">
            <i class="fa-solid fa-expand"></i><span>Abrir</span>
          </button>
          ${canEdit ? `<button onclick="event.stopPropagation(); Modals.openEditModal(${originalIndex})" class="ml-1 inline-flex items-center text-brand-600 hover:text-white hover:bg-brand-500 p-2 rounded-lg border border-brand-200 transition" title="Editar"><i class="fa-solid fa-pen"></i></button>` : ''}
        </td>`;
      tbody.appendChild(tr);
    });
  }

  /* ---------- Tarjetas ---------- */
  function renderCards(filtered) {
    const container = document.getElementById('cardsViewContainer');
    container.innerHTML = '';
    const empty = document.getElementById('emptyCards');
    if (filtered.length === 0) { empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');

    const all = DB.getAll();
    filtered.forEach(item => {
      const originalIndex = all.indexOf(item);
      const badgeClass = item.estatus === 'Aprobado' ? 'badge-aprobado' : 'badge-desactualizado';
      const embedUrl = Utils.getEmbedDriveUrl(item.link);
      const card = document.createElement('div');
      card.className = 'bg-white rounded-2xl border border-oxford-200 shadow-sm hover:shadow-xl hover:border-brand-300 transition duration-300 overflow-hidden flex flex-col cursor-pointer group';
      card.onclick = () => Modals.openSplitModal(originalIndex);
      card.innerHTML = `
        <div class="p-4 border-b border-oxford-100 flex items-center justify-between bg-oxford-50/80">
          <div><span class="text-[10px] font-bold text-oxford-400 uppercase tracking-wider block">SKU</span><h3 class="text-base font-black text-brand-600 group-hover:text-brand-700 transition">${Utils.escapeHtml(item.sku)}</h3></div>
          <div class="text-right"><span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${badgeClass}">${Utils.escapeHtml(item.estatus)}</span><span class="text-[11px] font-bold text-oxford-500 block mt-1">${Utils.escapeHtml(item.marca)}</span></div>
        </div>
        <div class="relative w-full h-48 bg-oxford-900 border-b border-oxford-200 overflow-hidden">
          <iframe src="${Utils.escapeHtml(embedUrl)}" class="w-full h-full pointer-events-none opacity-80 group-hover:opacity-100 transition scale-105" title="Vista Previa" loading="lazy"></iframe>
          <div class="absolute inset-0 bg-brand-900/10 group-hover:bg-transparent transition"></div>
          <div class="absolute bottom-2 right-2 bg-oxford-900/90 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur flex items-center space-x-1"><i class="fa-solid fa-eye text-brand-400"></i><span>Ampliar</span></div>
        </div>
        <div class="p-4 flex-1 flex flex-col justify-between">
          <p class="text-xs font-semibold text-oxford-800 line-clamp-2 mb-3" title="${Utils.escapeHtml(item.desc)}">${Utils.escapeHtml(item.desc)}</p>
          <div class="flex items-center justify-between text-[11px] text-oxford-500 pt-3 border-t border-oxford-100">
            <span><i class="fa-solid fa-box text-brand-500 mr-1"></i>${Utils.escapeHtml(item.empaque)}</span>
            <span><i class="fa-solid fa-layer-group text-brand-500 mr-1"></i>${Utils.escapeHtml(item.categoria)}</span>
          </div>
        </div>`;
      container.appendChild(card);
    });
  }

  /* ---------- Paginación ---------- */
  function renderPagination(totalItems, totalPages) {
    const containerIds = ['paginationTable', 'paginationCards'];
    const isList = currentViewMode === 'list';

    containerIds.forEach((id, idx) => {
      const cont = document.getElementById(id);
      if (!cont) return;
      if ((isList && idx === 1) || (!isList && idx === 0)) { cont.innerHTML = ''; return; }
      if (totalItems === 0) { cont.innerHTML = ''; return; }

      const start = itemsPerPage === 'ALL' ? 1 : (currentPage - 1) * itemsPerPage + 1;
      const end   = itemsPerPage === 'ALL' ? totalItems : Math.min(currentPage * itemsPerPage, totalItems);

      let pageButtons = '';
      const maxVisible = 5;
      let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
      let endPage   = Math.min(totalPages, startPage + maxVisible - 1);
      if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

      if (startPage > 1) {
        pageButtons += `<button onclick="Render.goToPage(1)" class="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-white border border-oxford-200 hover:bg-brand-50 hover:border-brand-300 transition">1</button>`;
        if (startPage > 2) pageButtons += `<span class="px-1 text-oxford-400 text-xs">…</span>`;
      }
      for (let i = startPage; i <= endPage; i++) {
        const active = i === currentPage;
        pageButtons += `<button onclick="Render.goToPage(${i})" class="px-2.5 py-1.5 rounded-md text-xs font-semibold transition ${active ? 'bg-brand-500 text-white shadow-sm' : 'bg-white border border-oxford-200 hover:bg-brand-50 hover:border-brand-300 text-oxford-700'}">${i}</button>`;
      }
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pageButtons += `<span class="px-1 text-oxford-400 text-xs">…</span>`;
        pageButtons += `<button onclick="Render.goToPage(${totalPages})" class="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-white border border-oxford-200 hover:bg-brand-50 hover:border-brand-300 transition">${totalPages}</button>`;
      }

      cont.innerHTML = `
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-oxford-200 mt-4">
          <div class="flex items-center gap-3 text-xs text-oxford-500 flex-wrap">
            <span>Mostrando <b class="text-oxford-800">${start}-${end}</b> de <b class="text-oxford-800">${totalItems}</b></span>
            <div class="flex items-center gap-1.5">
              <label class="text-oxford-500">Por página:</label>
              <select onchange="Render.setItemsPerPage(this.value)" class="bg-white border border-oxford-200 text-oxford-700 text-xs rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="10" ${itemsPerPage==10?'selected':''}>10</option>
                <option value="25" ${itemsPerPage==25?'selected':''}>25</option>
                <option value="50" ${itemsPerPage==50?'selected':''}>50</option>
                <option value="100" ${itemsPerPage==100?'selected':''}>100</option>
                <option value="ALL" ${itemsPerPage==='ALL'?'selected':''}>Todos</option>
              </select>
            </div>
          </div>
          <div class="flex items-center gap-1 flex-wrap justify-center">
            <button onclick="Render.goToPage(1)" ${currentPage===1?'disabled':''} class="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-white border border-oxford-200 hover:bg-brand-50 hover:border-brand-300 transition disabled:opacity-40 disabled:cursor-not-allowed" title="Primera"><i class="fa-solid fa-angles-left"></i></button>
            <button onclick="Render.goToPage(${currentPage-1})" ${currentPage===1?'disabled':''} class="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-white border border-oxford-200 hover:bg-brand-50 hover:border-brand-300 transition disabled:opacity-40 disabled:cursor-not-allowed" title="Anterior"><i class="fa-solid fa-chevron-left"></i></button>
            ${pageButtons}
            <button onclick="Render.goToPage(${currentPage+1})" ${currentPage===totalPages?'disabled':''} class="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-white border border-oxford-200 hover:bg-brand-50 hover:border-brand-300 transition disabled:opacity-40 disabled:cursor-not-allowed" title="Siguiente"><i class="fa-solid fa-chevron-right"></i></button>
            <button onclick="Render.goToPage(${totalPages})" ${currentPage===totalPages?'disabled':''} class="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-white border border-oxford-200 hover:bg-brand-50 hover:border-brand-300 transition disabled:opacity-40 disabled:cursor-not-allowed" title="Última"><i class="fa-solid fa-angles-right"></i></button>
          </div>
        </div>`;
    });
  }

  function goToPage(page) {
    const filtered = getFiltered();
    const perPage = itemsPerPage === 'ALL' ? (filtered.length || 1) : itemsPerPage;
    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    currentPage = page;
    renderContent();
    const target = currentViewMode === 'list'
      ? document.getElementById('tableViewContainer')
      : document.getElementById('cardsViewContainer');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function setItemsPerPage(value) {
    itemsPerPage = value === 'ALL' ? 'ALL' : parseInt(value, 10);
    currentPage = 1;
    renderContent();
  }

  function resetPageAndRender() { currentPage = 1; renderContent(); }

  function setPage(p) { currentPage = p; }

  function setViewMode(mode) {
    currentViewMode = mode;
    currentPage = 1;
    const listBtn = document.getElementById('viewListBtn');
    const cardsBtn = document.getElementById('viewCardsBtn');
    if (mode === 'list') {
      listBtn.className = "px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition bg-white text-brand-600 shadow-sm";
      cardsBtn.className = "px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition text-oxford-600 hover:text-brand-600";
      document.getElementById('tableViewContainer').classList.remove('hidden');
      document.getElementById('cardsViewContainer').classList.add('hidden');
    } else {
      cardsBtn.className = "px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition bg-white text-brand-600 shadow-sm";
      listBtn.className = "px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition text-oxford-600 hover:text-brand-600";
      document.getElementById('tableViewContainer').classList.add('hidden');
      document.getElementById('cardsViewContainer').classList.remove('hidden');
    }
    renderContent();
  }

  function sortBy(field) {
    if (sortField === field) sortAsc = !sortAsc;
    else { sortField = field; sortAsc = true; }
    currentPage = 1;
    renderContent();
  }

  function filterByKpi(status) {
    document.getElementById('statusFilter').value = status;
    activeBrand = 'TODAS';
    document.getElementById('categoryFilter').value = 'ALL';
    document.getElementById('areaFilter').value = 'ALL';
    document.getElementById('searchInput').value = '';
    currentPage = 1;
    renderBrandPills();
    renderContent();
  }

  function getActiveBrand() { return activeBrand; }

  return {
    renderDynamicFilters, renderBrandPills, renderContent,
    renderTable, renderCards, renderPagination,
    goToPage, setItemsPerPage, resetPageAndRender, setPage,
    setViewMode, sortBy, filterByKpi, getFiltered,
    getActiveBrand
  };
})();