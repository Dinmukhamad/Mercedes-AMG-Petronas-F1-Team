/**
 * favorites.js — личный кабинет и управление избранным
 */

async function initProfilePage() {
  if (!requireAuth()) return;

  initTabs(document.getElementById('profile-tabs'));
  await loadProfile();
  await loadFavorites();
  initSettingsForm();
}

// ============================================
// PROFILE CARD
// ============================================

async function loadProfile() {
  const card = document.getElementById('profile-card');
  try {
    const user = AuthState.getUser() || await Auth.me();
    if (user) AuthState.save(AuthState.getToken(), user);

    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
        <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--teal),var(--teal-dark));display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:800;font-size:1.8rem;color:#050708;flex-shrink:0;">
          ${(user?.username || 'U').charAt(0).toUpperCase()}
        </div>
        <div style="flex:1;">
          <h2 style="font-family:var(--font-display);font-size:1.4rem;font-weight:800;text-transform:uppercase;margin-bottom:4px;">${escapeHtml(user?.username || '—')}</h2>
          <div style="color:var(--text-secondary);font-size:.85rem;">${escapeHtml(user?.email || '')}</div>
          ${user?.role === 'admin' ? `<span class="badge badge-teal" style="margin-top:6px;">Администратор</span>` : `<span class="badge badge-silver" style="margin-top:6px;">Пользователь</span>`}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${user?.role === 'admin' ? `<a href="/admin.html" class="btn btn-secondary btn-sm">⚙ Панель администратора</a>` : ''}
          <button class="btn btn-danger btn-sm" onclick="handleLogout()">Выйти</button>
        </div>
      </div>
    `;
  } catch (err) {
    card.innerHTML = `<div class="text-error">Ошибка загрузки профиля: ${escapeHtml(err.message)}</div>`;
  }
}

// ============================================
// FAVORITES
// ============================================

async function loadFavorites() {
  const driversGrid = document.getElementById('fav-drivers-grid');
  const teamsGrid   = document.getElementById('fav-teams-grid');
  showLoading(driversGrid);
  showLoading(teamsGrid);

  try {
    const favs = await Favorites.list();
    const favDrivers      = (favs || []).filter(f => f.driver);
    const favConstructors = (favs || []).filter(f => f.constructor);

    renderFavDrivers(driversGrid, favDrivers);
    renderFavTeams(teamsGrid, favConstructors);
  } catch (err) {
    showError(driversGrid, err.message);
    showError(teamsGrid, err.message);
  }
}

function renderFavDrivers(container, favs) {
  if (!favs.length) {
    showEmpty(container, 'Нет избранных гонщиков', 'Добавьте гонщиков на странице «Гонщики»', '⭐');
    return;
  }
  container.innerHTML = favs.map(f => {
    const d     = f.driver;
    const name  = `${d.first_name || ''} ${d.last_name || ''}`.trim();
    const photo = d.photo_url || '';
    return `
      <div class="card" style="display:flex;align-items:center;gap:14px;">
        ${photo
          ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(name)}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid var(--border);flex-shrink:0;" onerror="this.style.display='none'">`
          : `<div style="width:52px;height:52px;border-radius:50%;background:var(--bg-graphite);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:800;font-size:1.2rem;color:var(--teal);flex-shrink:0;">${name.charAt(0)}</div>`
        }
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;font-size:.9rem;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(name)}</div>
          <div style="font-size:.75rem;color:var(--text-muted);">${escapeHtml(d.nationality || '')}</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <a href="/driver-detail.html?id=${d.id}" class="btn btn-ghost btn-sm btn-icon" title="Страница гонщика">→</a>
          <button class="btn-favorite active" onclick="removeFavDriver(${f.driver_id}, this)" title="Убрать из избранного">★</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderFavTeams(container, favs) {
  if (!favs.length) {
    showEmpty(container, 'Нет избранных команд', 'Добавьте команды на странице «Команды»', '⭐');
    return;
  }
  container.innerHTML = favs.map(f => {
    const c    = f.constructor;
    const name = c.name || '—';
    const logo = c.logo_url || '';
    return `
      <div class="card" style="display:flex;align-items:center;gap:14px;">
        ${logo
          ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(name)}" style="width:48px;height:48px;object-fit:contain;flex-shrink:0;" onerror="this.style.display='none'">`
          : `<div style="width:48px;height:48px;background:var(--bg-graphite);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:800;color:var(--teal);flex-shrink:0;">${name.charAt(0)}</div>`
        }
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;font-size:.9rem;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(name)}</div>
          <div style="font-size:.75rem;color:var(--text-muted);">${escapeHtml(c.nationality || '')}</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <a href="/constructor-detail.html?id=${c.id}" class="btn btn-ghost btn-sm btn-icon">→</a>
          <button class="btn-favorite active" onclick="removeFavTeam(${f.constructor_id}, this)">★</button>
        </div>
      </div>
    `;
  }).join('');
}

async function removeFavDriver(driverId, btn) {
  try {
    await Favorites.removeDriver(driverId);
    btn.closest('.card')?.remove();
    showToast('Удалено из избранного', 'info');
    // Check if container is now empty
    const grid = document.getElementById('fav-drivers-grid');
    if (grid && !grid.querySelector('.card')) {
      showEmpty(grid, 'Нет избранных гонщиков', 'Добавьте гонщиков на странице «Гонщики»', '⭐');
    }
  } catch (err) { showToast(err.message, 'error'); }
}

async function removeFavTeam(constructorId, btn) {
  try {
    await Favorites.removeConstructor(constructorId);
    btn.closest('.card')?.remove();
    showToast('Удалено из избранного', 'info');
    const grid = document.getElementById('fav-teams-grid');
    if (grid && !grid.querySelector('.card')) {
      showEmpty(grid, 'Нет избранных команд', 'Добавьте команды на странице «Команды»', '⭐');
    }
  } catch (err) { showToast(err.message, 'error'); }
}

// ============================================
// SETTINGS: Change password
// ============================================

function initSettingsForm() {
  const form = document.getElementById('change-password-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const current = document.getElementById('current-password')?.value;
    const newPwd  = document.getElementById('new-password')?.value;
    const confirm = document.getElementById('confirm-new-password')?.value;

    if (!current || !newPwd || !confirm) { showToast('Заполните все поля', 'warning'); return; }
    if (newPwd.length < 6) { showToast('Пароль должен быть не менее 6 символов', 'warning'); return; }
    if (newPwd !== confirm) { showToast('Пароли не совпадают', 'error'); return; }

    const btn = form.querySelector('[type="submit"]');
    setButtonLoading(btn, true);
    try {
      await apiPut('/auth/password', { current_password: current, new_password: newPwd });
      showToast('Пароль изменён', 'success');
      form.reset();
    } catch (err) {
      showToast(err.message || 'Ошибка', 'error');
    } finally {
      setButtonLoading(btn, false);
    }
  });
}

// Helper from auth.js (re-declared here for safety)
function setButtonLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
  btn.textContent = loading ? 'Загрузка...' : btn.dataset.originalText;
}

document.addEventListener('DOMContentLoaded', initProfilePage);
