/* ============================================================
   INICIALIZACIÓN Y EVENTOS GLOBALES
   ============================================================ */

(function init() {
  console.log('[App] Iniciando...');

  // 1) Cargar datos (necesario antes de cualquier render)
  try {
    DB.load();
    console.log('[App] Datos cargados:', DB.length());
  } catch (e) {
    console.error('[App] Error cargando datos:', e);
  }

  // 2) Intentar restaurar sesión ANTES de renderizar nada más
  let isLoggedIn = false;
  try {
    isLoggedIn = Auth.tryAutoLogin();
    console.log('[App] Sesión restaurada:', isLoggedIn);
  } catch (e) {
    console.error('[App] Error en tryAutoLogin:', e);
  }

  // 3) Preparar UI según si hay sesión o no
  if (!isLoggedIn) {
    // Sin sesión → mostrar login
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('dashboardSection').classList.add('hidden');
    document.body.classList.add('justify-center','bg-oxford-900');
    console.log('[App] Mostrando pantalla de login');
  } else {
    // Con sesión → ya está el dashboard visible (lo hizo tryAutoLogin)
    // Intentar inicializar filtros y render por si falló dentro de tryAutoLogin
    try {
      Render.renderDynamicFilters();
      Render.renderBrandPills();
      Render.setPage(1);
      Render.renderContent();
      console.log('[App] Dashboard renderizado');
    } catch (e) {
      console.error('[App] Error al renderizar dashboard post-login:', e);
    }
  }

  // 4) Drop zone del importador (siempre se inicializa)
  try {
    Excel.initDropZone();
  } catch (e) {
    console.error('[App] Error al inicializar drop zone:', e);
  }

  // 5) Cierre de modales con ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const importModal = document.getElementById('importModal');
      const itemModal = document.getElementById('itemModal');
      const detailModal = document.getElementById('splitDetailModal');
      if (importModal && !importModal.classList.contains('hidden')) Excel.closeImportModal();
      else if (itemModal && !itemModal.classList.contains('hidden')) Modals.closeModal();
      else if (detailModal && !detailModal.classList.contains('hidden')) Modals.closeSplitModal();
    }
  });

  // 6) Cierre de modales al hacer clic en el fondo
  ['splitDetailModal','itemModal','importModal'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', e => {
      if (e.target === el) {
        if (id === 'splitDetailModal') Modals.closeSplitModal();
        else if (id === 'itemModal') Modals.closeModal();
        else Excel.closeImportModal();
      }
    });
  });

  console.log('[App] Listo.');
})();