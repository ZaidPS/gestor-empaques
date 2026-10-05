/* ============================================================
   IMPORTAR / EXPORTAR EXCEL Y CSV
   ============================================================ */

const Excel = (() => {

  let parsedRows = [];

  /* ---------- Exportar CSV ---------- */
  function exportCSV() {
    const headers = ['SKU','Descripción','Marca','Categoría','Empaque','Estatus','Última Actualización','Área','Gerencia','Link'];
    const rows = DB.getAll().map(i => [
      i.sku,i.desc,i.marca,i.categoria,i.empaque,i.estatus,i.u_act,i.area,i.gerencia,i.link
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff'+csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'empaques_' + Utils.todayStr() + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    Utils.showToast('CSV exportado', 'success');
  }

  /* ---------- Modal importar ---------- */
  function openImportModal() {
    if (!Auth.can('import')) {
      Utils.showToast('El rol Visor no puede importar datos.', 'warn');
      return;
    }
    resetImport();
    document.getElementById('importModal').classList.remove('hidden');
  }

  function closeImportModal() {
    document.getElementById('importModal').classList.add('hidden');
  }

  function resetImport() {
    parsedRows = [];
    document.getElementById('importStep1').classList.remove('hidden');
    document.getElementById('importStep2').classList.add('hidden');
    document.getElementById('importConfirmBtn').classList.add('hidden');
    document.getElementById('importError').classList.add('hidden');
    document.getElementById('excelInput').value = '';
  }

  /* ---------- Drag & drop ---------- */
  function initDropZone() {
    const dropZone  = document.getElementById('dropZone');
    const excelInput = document.getElementById('excelInput');

    dropZone.addEventListener('click', () => excelInput.click());
    dropZone.addEventListener('dragover', e => {
      e.preventDefault();
      dropZone.classList.add('border-brand-500','bg-brand-50');
    });
    dropZone.addEventListener('dragleave', () =>
      dropZone.classList.remove('border-brand-500','bg-brand-50'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('border-brand-500','bg-brand-50');
      if (e.dataTransfer.files.length) handleExcelFile(e.dataTransfer.files[0]);
    });
    excelInput.addEventListener('change', e => {
      if (e.target.files.length) handleExcelFile(e.target.files[0]);
    });
  }

  /* ---------- Lectura del archivo ---------- */
  function handleExcelFile(file) {
    const errBox = document.getElementById('importError');
    errBox.classList.add('hidden');

    const validExt = ['.xlsx','.xls','.csv'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExt.includes(ext)) {
      errBox.innerText = 'Formato no soportado. Usa .xlsx, .xls o .csv';
      errBox.classList.remove('hidden');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, {
          type: 'array',
          cellDates: true,
          dateNF: 'dd-mm-yyyy'
        });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, {
          defval: '',
          raw: false
        });

        if (json.length === 0) {
          errBox.innerText = 'El archivo no tiene filas de datos.';
          errBox.classList.remove('hidden');
          return;
        }
        processRows(json);
      } catch (err) {
        console.error(err);
        errBox.innerText = 'Error al leer el archivo: ' + err.message;
        errBox.classList.remove('hidden');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  /* ---------- Normalizar encabezados ---------- */
  function normalizeHeader(h) {
    const clean = String(h).toLowerCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    return CONFIG.COLUMN_MAP[clean]
        || CONFIG.COLUMN_MAP[String(h).toLowerCase().trim()]
        || null;
  }

  /* ---------- Normalizar fechas ---------- */
  function normalizeDate(value) {
    if (!value) return '';
    const str = String(value).trim();

    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(str)) {
      const parts = str.split(/[\/\-]/);
      const d = String(parts[0]).padStart(2,'0');
      const m = String(parts[1]).padStart(2,'0');
      let y = parts[2];
      if (y.length === 2) y = '20' + y;
      return `${d}-${m}-${y}`;
    }

    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const [y, m, d] = str.split('T')[0].split('-');
      return `${d}-${m}-${y}`;
    }

    if (/^\d{4,5}(\.\d+)?$/.test(str)) {
      const serial = parseFloat(str);
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const jsDate = new Date(excelEpoch.getTime() + serial * 86400000);
      const d = String(jsDate.getUTCDate()).padStart(2,'0');
      const m = String(jsDate.getUTCMonth()+1).padStart(2,'0');
      const y = jsDate.getUTCFullYear();
      return `${d}-${m}-${y}`;
    }

    return str;
  }

  function dateObjectToString(d) {
    if (!(d instanceof Date) || isNaN(d)) return '';
    const day   = String(d.getDate()).padStart(2,'0');
    const month = String(d.getMonth()+1).padStart(2,'0');
    const year  = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  /* ---------- Procesar filas ---------- */
  function processRows(rows) {
    parsedRows = [];
    const existingSkus = new Set(DB.getAll().map(it => String(it.sku).toLowerCase()));

    rows.forEach((row, i) => {
      const mapped = {};
      Object.keys(row).forEach(k => {
        const field = normalizeHeader(k);
        if (field) {
          const rawVal = row[k];
          if (rawVal instanceof Date) {
            mapped[field] = dateObjectToString(rawVal);
          } else {
            mapped[field] = String(rawVal).trim();
          }
        }
      });

      const rowNum = i + 2;
      const errors = [];
      if (!mapped.sku)  errors.push('SKU vacío');
      if (!mapped.desc) errors.push('Descripción vacía');
      if (!mapped.marca) errors.push('Marca vacía');
      if (mapped.estatus && !CONFIG.ESTATUS.includes(mapped.estatus)) {
        errors.push(`Estatus inválido: ${mapped.estatus}`);
      }

      const status = errors.length ? 'error'
        : (existingSkus.has(String(mapped.sku).toLowerCase()) ? 'update' : 'new');

      parsedRows.push({
        row: rowNum,
        data: {
          sku: mapped.sku || '',
          desc: mapped.desc || '',
          marca: (mapped.marca || '').toUpperCase(),
          categoria: (mapped.categoria || 'INSUMO').toUpperCase(),
          empaque: mapped.empaque || 'Etiqueta',
          estatus: mapped.estatus || 'Aprobado',
          area: mapped.area || 'General',
          gerencia: mapped.gerencia || Auth.getName(),
          link: mapped.link || '',
          u_act: normalizeDate(mapped.u_act) || Utils.todayStr(),
          act: 'si',
          comentarios: []
        },
        status,
        errorMsg: errors.join(' · ')
      });
    });

    renderPreview();
    document.getElementById('importStep1').classList.add('hidden');
    document.getElementById('importStep2').classList.remove('hidden');
    document.getElementById('importConfirmBtn').classList.remove('hidden');
  }

  /* ---------- Vista previa ---------- */
  function renderPreview() {
    const newCount = parsedRows.filter(r => r.status === 'new').length;
    const updCount = parsedRows.filter(r => r.status === 'update').length;
    const errCount = parsedRows.filter(r => r.status === 'error').length;

    document.getElementById('importRowCount').innerText = parsedRows.length;
    document.getElementById('importNewCount').innerText = newCount;
    document.getElementById('importUpdateCount').innerText = updCount;
    document.getElementById('importErrorCount').innerText = errCount;

    const head = document.getElementById('importPreviewHead');
    head.innerHTML = `
      <th class="py-2 px-3 text-left">Fila</th>
      <th class="py-2 px-3 text-left">SKU</th>
      <th class="py-2 px-3 text-left">Descripción</th>
      <th class="py-2 px-3 text-left">Marca</th>
      <th class="py-2 px-3 text-left">Estatus</th>
      <th class="py-2 px-3 text-left">Fecha</th>
      <th class="py-2 px-3 text-left">Resultado</th>`;

    const body = document.getElementById('importPreviewBody');
    body.innerHTML = '';

    parsedRows.slice(0, 100).forEach(r => {
      const tr = document.createElement('tr');
      tr.className = r.status === 'error' ? 'bg-rose-50'
                   : r.status === 'update' ? 'bg-brand-50'
                   : 'bg-emerald-50/40';
      const badge = r.status === 'new'
        ? '<span class="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold">NUEVO</span>'
        : r.status === 'update'
        ? '<span class="px-2 py-0.5 bg-brand-100 text-brand-700 rounded-full text-[10px] font-bold">ACTUALIZAR</span>'
        : `<span class="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full text-[10px] font-bold" title="${Utils.escapeHtml(r.errorMsg)}">ERROR</span>`;
      tr.innerHTML = `
        <td class="py-2 px-3 text-oxford-500">${r.row}</td>
        <td class="py-2 px-3 font-mono font-semibold text-brand-600">${Utils.escapeHtml(r.data.sku)}</td>
        <td class="py-2 px-3 max-w-xs truncate" title="${Utils.escapeHtml(r.data.desc)}">${Utils.escapeHtml(r.data.desc)}</td>
        <td class="py-2 px-3 font-semibold">${Utils.escapeHtml(r.data.marca)}</td>
        <td class="py-2 px-3">${Utils.escapeHtml(r.data.estatus)}</td>
        <td class="py-2 px-3 text-oxford-600">${Utils.escapeHtml(r.data.u_act)}</td>
        <td class="py-2 px-3">${badge}${r.status==='error' ? `<div class="text-[10px] text-rose-600 mt-0.5">${Utils.escapeHtml(r.errorMsg)}</div>` : ''}</td>`;
      body.appendChild(tr);
    });

    if (parsedRows.length > 100) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="7" class="py-2 px-3 text-center text-oxford-400 text-[11px]">Mostrando 100 de ${parsedRows.length} filas…</td>`;
      body.appendChild(tr);
    }
  }

  /* ---------- Confirmar importación ---------- */
  function confirmImport() {
    const mode = document.querySelector('input[name="importMode"]:checked').value;
    const validRows = parsedRows.filter(r => r.status !== 'error');
    const errCount = parsedRows.length - validRows.length;

    if (validRows.length === 0) {
      Utils.showToast('No hay filas válidas para importar.', 'error');
      return;
    }

    let added = 0, updated = 0;

    if (mode === 'replace') {
      if (!confirm(`⚠️ Vas a REEMPLAZAR ${DB.length()} diseños con ${validRows.length} del Excel. ¿Continuar?`)) return;
      DB.replaceAll(validRows.map(r => r.data));
      added = validRows.length;
    } else {
      validRows.forEach(r => {
        const idx = DB.findBySku(r.data.sku);
        if (idx !== -1) {
          if (mode === 'merge') {
            r.data.comentarios = DB.getByIndex(idx).comentarios || [];
            DB.update(idx, r.data);
            updated++;
          }
        } else {
          DB.add(r.data);
          added++;
        }
      });
    }

    Render.renderDynamicFilters();
    Render.renderBrandPills();
    Render.setPage(1);
    Render.renderContent();
    closeImportModal();

    Utils.showToast(`✅ Importación completa: ${added} agregados, ${updated} actualizados${errCount ? `, ${errCount} con errores ignorados` : ''}`, 'success');
  }

  /* ---------- Plantilla descargable ---------- */
  function downloadTemplate() {
    const headers = ['SKU','Descripción','Marca','Categoría','Empaque','Estatus','Área','Gerencia','Link','Última Actualización'];
    const example = [
      ['46607','PLACA ARM. PLAST. 1U+APAG SENC BLANCA','GPH','ELECTRICO','Bolsa','Aprobado','Importaciones','Leonela','https://drive.google.com/file/d/XXXX/view','30-06-2026'],
      ['27784','TELA GALLINERO HEXAGONAL 50MM','SAN-VER','FERRETERIA','Etiqueta','Aprobado','Compras','Flor','https://drive.google.com/file/d/YYYY/view','15-05-2026']
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...example]);
    ws['!cols'] = headers.map(() => ({ wch: 24 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Empaques');
    XLSX.writeFile(wb, 'plantilla_empaques.xlsx');
    Utils.showToast('Plantilla descargada', 'success');
  }

  return {
    exportCSV,
    openImportModal, closeImportModal, resetImport,
    initDropZone, handleExcelFile, confirmImport, downloadTemplate
  };
})();
