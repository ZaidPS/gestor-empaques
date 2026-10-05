/* ============================================================
   MODALES: detalle, agregar/editar
   ============================================================ */

const Modals = (() => {

  let selectedItemIndex = null;
  let activeTab = 'detail'; // 'detail' o 'pdf' (para móvil/tablet)

  /* ---------- Tabs móvil/tablet ---------- */
  function switchTab(tab) {
    activeTab = tab;
    const infoPanel = document.getElementById('detailPanelInfo');
    const pdfPanel  = document.getElementById('detailPanelPdf');
    const tabDetail = document.getElementById('tabDetailBtn');
    const tabPdf    = document.getElementById('tabPdfBtn');

    if (!infoPanel || !pdfPanel) return;

    if (tab === 'detail') {
      infoPanel.classList.remove('hidden');
      pdfPanel.classList.add('hidden');
      pdfPanel.classList.remove('flex');
      if (tabDetail) tabDetail.className = 'flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 border-brand-500 text-brand-600 transition';
      if (tabPdf)    tabPdf.className    = 'flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 border-transparent text-oxford-500 hover:text-brand-600 transition';
    } else {
      infoPanel.classList.add('hidden');
      pdfPanel.classList.remove('hidden');
      pdfPanel.classList.add('flex');
      if (tabPdf)    tabPdf.className    = 'flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 border-brand-500 text-brand-600 transition';
      if (tabDetail) tabDetail.className = 'flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 border-transparent text-oxford-500 hover:text-brand-600 transition';
    }
  }

  /* ---------- Modal detalle ---------- */
  function openSplitModal(index) {
    selectedItemIndex = index;
    const item = DB.getByIndex(index);
    const embedUrl = Utils.getEmbedDriveUrl(item.link);

    document.getElementById('modalHeaderTitle').innerText = 'SKU ' + item.sku + ' - ' + item.marca;
    document.getElementById('modalHeaderSubtitle').innerText = item.desc;
    document.getElementById('modalExternalDriveBtn').href = item.link || '#';
    const mobileDriveBtn = document.getElementById('modalExternalDriveBtnMobile');
    if (mobileDriveBtn) mobileDriveBtn.href = item.link || '#';

    document.getElementById('detailSku').innerText = item.sku;
    document.getElementById('detailDesc').innerText = item.desc;
    document.getElementById('detailBrandBadge').innerText = item.marca;
    document.getElementById('detailCat').innerText = item.categoria;
    document.getElementById('detailEmpaque').innerText = item.empaque;
    document.getElementById('detailUAct').innerText = item.u_act || '-';
    document.getElementById('detailArea').innerText =
      (item.area || '-') + ' - ' + (item.gerencia || '-');

    const badge = document.getElementById('detailEstatusBadge');
    badge.innerText = item.estatus;
    badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ' +
      (item.estatus === 'Aprobado' ? 'badge-aprobado' : 'badge-desactualizado');

    renderComments(item);

    document.getElementById('pdfLoader').style.display = 'flex';
    document.getElementById('detailPdfFrame').src = embedUrl;
    document.getElementById('splitDetailModal').classList.remove('hidden');
    document.title = 'SKU ' + item.sku + ' - ' + CONFIG.APP_NAME;

    // Reset a la pestaña "Detalles" cada vez que se abre
    switchTab('detail');

    Auth.applyPermissions();
  }

  function renderComments(item) {
    const list = document.getElementById('detailCommentsList');
    list.innerHTML = '';
    const comments = item.comentarios || [];
    document.getElementById('detailCommentsCount').innerText =
      comments.length + ' comentario' + (comments.length===1?'':'s');
    if (comments.length === 0) {
      list.innerHTML = '<p class="text-[11px] text-oxford-400 italic text-center py-2">Sin comentarios aún.</p>';
      return;
    }
    comments.slice().reverse().forEach(c => {
      const div = document.createElement('div');
      div.className = 'bg-white p-2.5 rounded-xl border border-oxford-200 text-xs shadow-sm';
      div.innerHTML = `<div class="flex items-center justify-between text-[10px] text-oxford-400 font-semibold mb-1"><span>${Utils.escapeHtml(c.user)} (${Utils.escapeHtml(c.role)})</span><span>${Utils.escapeHtml(c.date)}</span></div><p class="text-oxford-700 font-medium">${Utils.escapeHtml(c.text)}</p>`;
      list.appendChild(div);
    });
  }

  function addDetailComment() {
    if (!Auth.can('comment')) { Utils.showToast('El rol Visor no puede comentar.', 'warn'); return; }
    const input = document.getElementById('detailNewComment');
    const text = input.value.trim();
    if (!text) return;
    const item = DB.getByIndex(selectedItemIndex);
    if (!item.comentarios) item.comentarios = [];
    item.comentarios.push({
      user: Auth.getName(),
      role: Auth.getRole(),
      date: Utils.todayStr(),
      text
    });
    DB.save();
    renderComments(item);
    input.value = '';
    Utils.showToast('Comentario agregado', 'success');
  }

  function closeSplitModal() {
    document.getElementById('detailPdfFrame').src = '';
    document.getElementById('splitDetailModal').classList.add('hidden');
    document.title = CONFIG.APP_NAME + ' - Control de Diseños';
  }

  function editFromDetail() {
    if (!Auth.can('edit')) { Utils.showToast('Sin permisos.', 'warn'); return; }
    const idx = selectedItemIndex;
    closeSplitModal();
    openEditModal(idx);
  }

  function deleteFromDetail() {
    if (Auth.getRole() !== 'Admin') {
      Utils.showToast('Solo el Administrador puede eliminar.', 'warn');
      return;
    }
    const item = DB.getByIndex(selectedItemIndex);
    if (!confirm(`¿Eliminar el diseño SKU ${item.sku} - ${item.desc}?`)) return;
    DB.remove(selectedItemIndex);
    closeSplitModal();
    Render.renderDynamicFilters();
    Render.renderContent();
    Utils.showToast('Diseño eliminado', 'success');
  }

  /* ---------- Modal agregar/editar ---------- */
  function openAddModal() {
    if (!Auth.can('create')) { Utils.showToast('Sin permisos.', 'warn'); return; }
    document.getElementById('editIndex').value = '';
    document.getElementById('modalTitle').innerText = 'Agregar Nuevo Diseño';
    document.getElementById('modalForm').reset();
    document.getElementById('itemModal').classList.remove('hidden');
  }

  function openEditModal(index) {
    if (!Auth.can('edit')) { Utils.showToast('Sin permisos.', 'warn'); return; }
    const item = DB.getByIndex(index);
    document.getElementById('editIndex').value = index;
    document.getElementById('modalTitle').innerText = 'Editar Diseño';
    document.getElementById('formSku').value = item.sku;
    document.getElementById('formMarca').value = item.marca.toUpperCase();
    document.getElementById('formDesc').value = item.desc;
    document.getElementById('formCat').value = item.categoria;
    document.getElementById('formEmpaque').value = item.empaque;
    document.getElementById('formEstatus').value = item.estatus;
    document.getElementById('formArea').value =
      (item.area || '') + (item.gerencia ? ' - ' + item.gerencia : '');
    document.getElementById('formLink').value = item.link;
    document.getElementById('itemModal').classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('itemModal').classList.add('hidden');
  }

  function saveItem(e) {
    e.preventDefault();
    if (!Auth.can('create')) { Utils.showToast('Sin permisos.', 'warn'); return; }

    const index    = document.getElementById('editIndex').value;
    const sku      = document.getElementById('formSku').value.trim();
    const marca    = document.getElementById('formMarca').value;
    const desc     = document.getElementById('formDesc').value.trim();
    const categoria= document.getElementById('formCat').value;
    const empaque  = document.getElementById('formEmpaque').value.trim();
    const estatus  = document.getElementById('formEstatus').value;
    const areaRaw  = document.getElementById('formArea').value.trim() || 'General';
    const link     = document.getElementById('formLink').value.trim();

    const dupIndex = DB.findBySku(sku);
    if (dupIndex !== -1 && String(dupIndex) !== String(index)) {
      Utils.showToast('Ya existe un diseño con ese SKU.', 'error');
      return;
    }

    let area = areaRaw, gerencia = Auth.getName();
    if (areaRaw.includes(' - ')) {
      const parts = areaRaw.split(' - ');
      area = parts[0].trim();
      gerencia = parts.slice(1).join(' - ').trim() || Auth.getName();
    }

    const newItem = {
      sku, desc, marca, categoria, act: 'si', estatus,
      u_act: Utils.todayStr(), empaque, area, gerencia, link,
      comentarios: index !== '' && DB.getByIndex(index).comentarios
        ? DB.getByIndex(index).comentarios : []
    };

    if (index === '') DB.add(newItem);
    else DB.update(parseInt(index, 10), newItem);

    closeModal();
    Render.renderDynamicFilters();
    Render.renderContent();
    Utils.showToast(index === '' ? 'Diseño agregado' : 'Diseño actualizado', 'success');
  }

  function getSelectedIndex() { return selectedItemIndex; }

  return {
    openSplitModal, closeSplitModal, editFromDetail, deleteFromDetail,
    addDetailComment, openAddModal, openEditModal, closeModal, saveItem,
    getSelectedIndex, switchTab
  };
})();