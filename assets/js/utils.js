/* ============================================================
   UTILIDADES GENERALES
   ============================================================ */

const Utils = (() => {

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function todayStr() {
    const d = new Date();
    return String(d.getDate()).padStart(2,'0') + '-' +
           String(d.getMonth()+1).padStart(2,'0') + '-' +
           d.getFullYear();
  }

  /* Normaliza cualquier valor de fecha a "dd-mm-yyyy" */
  function normalizeDate(value) {
    if (!value) return '';
    if (value instanceof Date && !isNaN(value)) {
      const d = String(value.getDate()).padStart(2,'0');
      const m = String(value.getMonth()+1).padStart(2,'0');
      const y = value.getFullYear();
      return `${d}-${m}-${y}`;
    }
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

  async function sha256(text) {
    const buf = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2,'0')).join('');
  }

  function showToast(msg, type = 'info') {
    const colors = {
      success: 'bg-emerald-600',
      error:   'bg-rose-600',
      info:    'bg-slate-900',
      warn:    'bg-amber-600'
    };
    const toast = document.createElement('div');
    toast.className = `fixed bottom-6 right-6 ${colors[type]||colors.info} text-white px-5 py-3 rounded-xl shadow-2xl text-xs font-semibold z-[100] transition-all duration-300`;
    toast.style.maxWidth = '380px';
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function getEmbedDriveUrl(url) {
    if (!url) return '';
    if (url.includes('/file/d/')) {
      const fileId = url.split('/file/d/')[1].split('/')[0];
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    return url;
  }

  return { escapeHtml, todayStr, normalizeDate, sha256, showToast, getEmbedDriveUrl };
})();