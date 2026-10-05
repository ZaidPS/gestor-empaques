/* ============================================================
   AUTENTICACIÓN Y PERMISOS
   ============================================================ */

const Auth = (() => {

  const SESSION_KEY = 'gestor_empaques_session';
  const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

  let currentUser = { name: '', role: '' };

  function getRole() { return currentUser.role; }
  function getName() { return currentUser.name; }

  /* ---------- Persistencia ---------- */
  function saveSession(account) {
    try {
      const session = {
        name: account.name,
        role: account.role,
        token: (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
        expiresAt: Date.now() + SESSION_DURATION_MS
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      console.log('[Auth] Sesión guardada:', session.name, session.role);
    } catch (e) {
      console.warn('[Auth] No se pudo guardar la sesión', e);
    }
  }

  function clearSession() {
    try {
      localStorage.removeItem(SESSION_KEY);
      console.log('[Auth] Sesión eliminada');
    } catch (e) {}
  }

  function restoreSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (!session.expiresAt || session.expiresAt < Date.now()) {
        clearSession();
        return null;
      }
      if (!session.name || !session.role) {
        clearSession();
        return null;
      }
      return session;
    } catch (e) {
      clearSession();
      return null;
    }
  }

  /* ---------- UI: entrar al dashboard ---------- */
  function enterDashboard() {
    // 1) Cambiar visibilidad (esto NUNCA debe fallar)
    const loginSec = document.getElementById('loginSection');
    const dashSec  = document.getElementById('dashboardSection');
    if (loginSec) loginSec.classList.add('hidden');
    if (dashSec)  dashSec.classList.remove('hidden');
    document.body.classList.remove('justify-center','bg-oxford-900');

    // 2) Actualizar info del header
    const roleBadge = document.getElementById('activeRoleBadge');
    const nameDisp  = document.getElementById('userNameDisplay');
    const avatar    = document.getElementById('userAvatar');
    if (roleBadge) roleBadge.innerText = currentUser.role;
    if (nameDisp)  nameDisp.innerText = `${currentUser.name} (${currentUser.role})`;
    if (avatar) {
      avatar.innerText = currentUser.name
        .split(' ').map(s => s[0]).join('').substring(0,2).toUpperCase();
    }

    // 3) Aplicar permisos (con try/catch por si algo del DOM no existe aún)
    try { Auth.applyPermissions(); }
    catch (e) { console.error('[Auth] applyPermissions falló:', e); }
  }

  /* ---------- Login ---------- */
  async function handleLogin(e) {
    e.preventDefault();
    const user = document.getElementById('loginUser').value.trim().toLowerCase();
    const pass = document.getElementById('loginPass').value;
    const err  = document.getElementById('loginError');
    const btn  = document.getElementById('loginBtn');

    err.classList.add('hidden');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;border-top-color:#fff;border-color:rgba(255,255,255,0.3)"></div>';

    await new Promise(r => setTimeout(r, 150));

    let account = null;
    try {
      if (CONFIG.USERS[user]) {
        const hash = await Utils.sha256(pass);
        if (CONFIG.USERS[user].passHash === hash) account = CONFIG.USERS[user];
      }
    } catch (e) {
      console.warn('[Auth] SHA-256 falló, usando fallback:', e);
    }
    if (!account && CONFIG.FALLBACK_USERS[user] && CONFIG.FALLBACK_USERS[user].pass === pass) {
      account = CONFIG.FALLBACK_USERS[user];
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i><span>Iniciar Sesión</span>';

    if (!account) { err.classList.remove('hidden'); return; }

    currentUser = { name: account.name, role: account.role };
    saveSession(account);
    enterDashboard();

    // Render del dashboard (aislado para que si falla no rompa la sesión)
    try {
      Render.renderDynamicFilters();
      Render.renderBrandPills();
      Render.setPage(1);
      Render.renderContent();
    } catch (e) {
      console.error('[Auth] Error al renderizar tras login:', e);
    }
  }

  /* ---------- Logout ---------- */
  function handleLogout() {
    if (!confirm('¿Cerrar sesión?')) return;
    clearSession();
    currentUser = { name: '', role: '' };

    document.getElementById('dashboardSection').classList.add('hidden');
    document.getElementById('loginSection').classList.remove('hidden');
    document.body.classList.add('justify-center','bg-oxford-900');
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
    document.getElementById('loginError').classList.add('hidden');
  }

  /* ---------- Auto-login ---------- */
  function tryAutoLogin() {
    const session = restoreSession();
    if (!session) return false;

    currentUser = { name: session.name, role: session.role };
    enterDashboard();

    // Render (aislado para que un error no rompa el auto-login)
    try {
      Render.renderDynamicFilters();
      Render.renderBrandPills();
      Render.setPage(1);
      Render.renderContent();
    } catch (e) {
      console.error('[Auth] Error al renderizar tras auto-login:', e);
    }
    return true;
  }

  /* ---------- Permisos ---------- */
  function applyPermissions() {
    const addBtn    = document.getElementById('addBtn');
    const importBtn = document.getElementById('importBtn');
    const editBtn   = document.getElementById('detailEditBtn');
    const delBtn    = document.getElementById('detailDeleteBtn');

    const role = currentUser.role;
    if (role === 'Visor') {
      if (addBtn)    addBtn.style.display = 'none';
      if (importBtn) importBtn.style.display = 'none';
      if (editBtn)   editBtn.style.display = 'none';
      if (delBtn)    delBtn.style.display = 'none';
    } else if (role === 'Editor') {
      if (addBtn)    addBtn.style.display = 'flex';
      if (importBtn) importBtn.style.display = 'flex';
      if (editBtn)   editBtn.style.display = 'flex';
      if (delBtn)    delBtn.style.display = 'none';
    } else {
      if (addBtn)    addBtn.style.display = 'flex';
      if (importBtn) importBtn.style.display = 'flex';
      if (editBtn)   editBtn.style.display = 'flex';
      if (delBtn)    delBtn.style.display = 'flex';
    }
  }

  function can(action) {
    const role = currentUser.role;
    if (role === 'Admin')  return true;
    if (role === 'Editor') return ['create','edit','import'].includes(action);
    if (role === 'Visor')  return ['read','comment'].includes(action);
    return false;
  }

  return {
    handleLogin, handleLogout, tryAutoLogin,
    applyPermissions, getRole, getName, can
  };
})();