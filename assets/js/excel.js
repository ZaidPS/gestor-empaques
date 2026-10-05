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