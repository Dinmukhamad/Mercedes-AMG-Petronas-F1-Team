/**
 * api.js — все запросы к backend API с in-memory кэшированием
 */

const API_BASE = 'https://f1-dashboard-backend-ri9z.onrender.com/api';

// ── In-memory кэш ──────────────────────────────────────────────
const _cache = new Map();
const _pending = new Map();
const CACHE_TTL = {
  default:    5 * 60 * 1000,   // 5 минут — общий дефолт
  standings:  3 * 60 * 1000,   // 3 минуты — таблицы чемпионата
  seasons:   30 * 60 * 1000,   // 30 минут — список сезонов
  races:      5 * 60 * 1000,   // 5 минут  — гонки
  static:    60 * 60 * 1000,   // 60 минут — гонщики/команды (редко меняются)
};

function _getTTL(path) {
  if (path.includes('/standings')) return CACHE_TTL.standings;
  if (path.includes('/seasons'))   return CACHE_TTL.seasons;
  if (path.includes('/races'))     return CACHE_TTL.races;
  if (path.includes('/drivers') || path.includes('/constructors')) return CACHE_TTL.static;
  return CACHE_TTL.default;
}

function _getCached(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > entry.ttl) { _cache.delete(key); return null; }
  return entry.data;
}

function _setCached(key, data, ttl) {
  _cache.set(key, { data, ts: Date.now(), ttl });
}

function _isPrivatePath(path) {
  return path.startsWith('/auth') || path.startsWith('/favorites') || path.startsWith('/admin');
}

// ── Core fetch ──────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const { skipAuth = false, ...fetchOptions } = options;
  const token = skipAuth ? null : localStorage.getItem('f1_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(fetchOptions.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers });

  if (res.status === 401) {
    localStorage.removeItem('f1_token');
    localStorage.removeItem('f1_user');
    window.location.href = '/login.html';
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Ошибка запроса' }));
    throw new Error(err.detail || `Ошибка ${res.status}`);
  }

  return res.json();
}

// GET с кэшем (только безопасные запросы без токена не кэшируются)
async function apiGet(path) {
  // Персональные и админские маршруты — без публичного кэша
  if (_isPrivatePath(path)) {
    return apiFetch(path);
  }
  const cached = _getCached(path);
  if (cached !== null) return cached;
  if (_pending.has(path)) return _pending.get(path);
  const request = apiFetch(path, { skipAuth: true })
    .then(data => {
      if (data !== undefined) _setCached(path, data, _getTTL(path));
      return data;
    })
    .finally(() => _pending.delete(path));
  _pending.set(path, request);
  return request;
}

function apiPost(path, body)   { return apiFetch(path, { method: 'POST',   body: JSON.stringify(body) }); }
function apiPut(path, body)    { return apiFetch(path, { method: 'PUT',    body: JSON.stringify(body) }); }
function apiDelete(path)       { return apiFetch(path, { method: 'DELETE' }); }
function apiPostForm(path, formData) {
  const token = localStorage.getItem('f1_token');
  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body: formData,
  }).then(r => r.json());
}

// При мутациях — инвалидируем связанный кэш
function invalidateCache(prefix) {
  for (const key of _cache.keys()) {
    if (key.startsWith(prefix)) _cache.delete(key);
  }
}

// ── AUTH ────────────────────────────────────────────────────────
const Auth = {
  register: (data) => apiPost('/auth/register', data),
  login:    (data) => apiPost('/auth/login', data),
  me:       ()     => apiFetch('/auth/me'),
  logout:   ()     => apiPost('/auth/logout', {}),
};

// ── SEASONS ─────────────────────────────────────────────────────
const Seasons = {
  list: () => apiGet('/seasons'),
  get:  (year) => apiGet(`/seasons/${year}`),
};

// ── HOME ───────────────────────────────────────────────────────
const Home = {
  get: (season) => apiGet(`/home?season=${season}`),
};

// ── DRIVERS ─────────────────────────────────────────────────────
const Drivers = {
  list:  (season)     => apiGet(`/drivers?season=${season}`),
  get:   (id)         => apiGet(`/drivers/${id}`),
  stats: (id, season) => apiGet(`/drivers/${id}/stats?season=${season}`),
};

// ── CONSTRUCTORS ─────────────────────────────────────────────────
const Constructors = {
  list:  (season)     => apiGet(`/constructors?season=${season}`),
  get:   (id)         => apiGet(`/constructors/${id}`),
  stats: (id, season) => apiGet(`/constructors/${id}/stats?season=${season}`),
};

// ── STANDINGS ───────────────────────────────────────────────────
const Standings = {
  drivers:          (season)          => apiGet(`/standings/drivers?season=${season}`),
  constructors:     (season)          => apiGet(`/standings/constructors?season=${season}`),
  topDrivers:       (season, limit=3) => apiGet(`/standings/top-drivers?season=${season}&limit=${limit}`),
  topConstructors:  (season, limit=3) => apiGet(`/standings/top-constructors?season=${season}&limit=${limit}`),
};

// ── RACES ───────────────────────────────────────────────────────
const Races = {
  list:       (season) => apiGet(`/races?season=${season}`),
  get:        (id)     => apiGet(`/races/${id}`),
  results:    (id)     => apiGet(`/races/${id}/results`),
  qualifying: (id)     => apiGet(`/races/${id}/qualifying`),
  practice:   (id)     => apiGet(`/races/${id}/practice`),
  videos:     (id)     => apiGet(`/races/${id}/videos`),
  gallery:    (id)     => apiGet(`/races/${id}/gallery`),
};

// ── VIDEOS ──────────────────────────────────────────────────────
const Videos = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiGet(`/videos${q ? '?' + q : ''}`);
  },
  get: (id) => apiGet(`/videos/${id}`),
};

// ── GALLERY ─────────────────────────────────────────────────────
const Gallery = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiGet(`/gallery${q ? '?' + q : ''}`);
  },
  get: (id) => apiGet(`/gallery/${id}`),
};

// ── FAVORITES ───────────────────────────────────────────────────
const Favorites = {
  list:              ()   => apiFetch('/favorites'),
  addDriver:         (id) => { invalidateCache('/favorites'); return apiPost(`/favorites/drivers/${id}`, {}); },
  removeDriver:      (id) => { invalidateCache('/favorites'); return apiDelete(`/favorites/drivers/${id}`); },
  addConstructor:    (id) => { invalidateCache('/favorites'); return apiPost(`/favorites/constructors/${id}`, {}); },
  removeConstructor: (id) => { invalidateCache('/favorites'); return apiDelete(`/favorites/constructors/${id}`); },
};

// ── ADMIN ────────────────────────────────────────────────────────
const Admin = {
  createSeason: (data)    => apiPost('/admin/seasons', data),
  updateSeason: (id,data) => apiPut(`/admin/seasons/${id}`, data),
  deleteSeason: (id)      => apiDelete(`/admin/seasons/${id}`),

  createDriver: (data)    => apiPost('/admin/drivers', data),
  updateDriver: (id,data) => apiPut(`/admin/drivers/${id}`, data),
  deleteDriver: (id)      => apiDelete(`/admin/drivers/${id}`),

  createConstructor: (data)    => apiPost('/admin/constructors', data),
  updateConstructor: (id,data) => apiPut(`/admin/constructors/${id}`, data),
  deleteConstructor: (id)      => apiDelete(`/admin/constructors/${id}`),

  createVideo: (data)    => apiPost('/admin/videos', data),
  updateVideo: (id,data) => apiPut(`/admin/videos/${id}`, data),
  deleteVideo: (id)      => apiDelete(`/admin/videos/${id}`),

  createImage: (data)    => apiPost('/admin/gallery', data),
  updateImage: (id,data) => apiPut(`/admin/gallery/${id}`, data),
  deleteImage: (id)      => apiDelete(`/admin/gallery/${id}`),

  syncSeasons:      ()       => apiPost('/admin/sync/seasons', {}),
  syncDrivers:      (season) => apiPost(`/admin/sync/drivers?season=${season}`, {}),
  syncConstructors: (season) => apiPost(`/admin/sync/constructors?season=${season}`, {}),
  syncRaces:        (season) => apiPost(`/admin/sync/races?season=${season}`, {}),
  syncStandings:    (season) => apiPost(`/admin/sync/standings?season=${season}`, {}),
  syncRace:         (id)     => apiPost(`/admin/sync/race/${id}`, {}),
  syncStatus:       ()       => apiFetch('/admin/sync/status'),
};


/**
 * auth.js — авторизация, JWT, состояние пользователя
 */

const AuthState = {
  getToken: ()  => localStorage.getItem('f1_token'),
  getUser:  ()  => {
    const raw = localStorage.getItem('f1_user');
    return raw ? JSON.parse(raw) : null;
  },
  isLoggedIn: () => !!localStorage.getItem('f1_token'),
  isAdmin: () => {
    const user = AuthState.getUser();
    return user && user.role === 'admin';
  },
  save: (token, user) => {
    localStorage.setItem('f1_token', token);
    localStorage.setItem('f1_user', JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem('f1_token');
    localStorage.removeItem('f1_user');
  },
};

// ============================================
// LOGIN PAGE
// ============================================

function initLoginPage() {
  if (AuthState.isLoggedIn()) {
    window.location.href = '/index.html';
    return;
  }

  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors(form);

    const email    = form.email.value.trim();
    const password = form.password.value;

    if (!email || !password) {
      showFormError(form, 'Заполните все поля');
      return;
    }

    const btn = form.querySelector('[type="submit"]');
    setButtonLoading(btn, true);

    try {
      const data = await Auth.login({ email, password });
      localStorage.setItem('f1_token', data.access_token);
      const user = await Auth.me();
      AuthState.save(data.access_token, user);
      showToast('Добро пожаловать, ' + user.username + '!', 'success');
      setTimeout(() => { window.location.href = '/index.html'; }, 600);
    } catch (err) {
      showFormError(form, err.message || 'Неверный email или пароль');
    } finally {
      setButtonLoading(btn, false);
    }
  });
}

// ============================================
// REGISTER PAGE
// ============================================

function initRegisterPage() {
  if (AuthState.isLoggedIn()) {
    window.location.href = '/index.html';
    return;
  }

  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors(form);

    const username  = form.username.value.trim();
    const email     = form.email.value.trim();
    const password  = form.password.value;
    const confirm   = form.password_confirmation.value;

    if (!username || !email || !password || !confirm) {
      showFormError(form, 'Заполните все поля');
      return;
    }

    if (password.length < 6) {
      showFormError(form, 'Пароль должен быть не менее 6 символов');
      return;
    }

    if (password !== confirm) {
      showFormError(form, 'Пароли не совпадают');
      return;
    }

    const btn = form.querySelector('[type="submit"]');
    setButtonLoading(btn, true);

    try {
      await Auth.register({ username, email, password, password_confirmation: confirm });
      // Auto-login after register
      const tokenData = await Auth.login({ email, password });
      localStorage.setItem('f1_token', tokenData.access_token);
      const user = await Auth.me();
      AuthState.save(tokenData.access_token, user);
      showToast('Аккаунт создан!', 'success');
      setTimeout(() => { window.location.href = '/index.html'; }, 600);
    } catch (err) {
      showFormError(form, err.message || 'Ошибка регистрации');
    } finally {
      setButtonLoading(btn, false);
    }
  });
}

// ============================================
// NAVBAR AUTH STATE
// ============================================

function updateNavAuth() {
  const user = AuthState.getUser();
  const actionsEl = document.getElementById('navbar-auth');
  if (!actionsEl) return;

  if (user) {
    actionsEl.innerHTML = `
      <a href="/profile.html" class="btn btn-ghost btn-sm">
        <span>👤</span> ${escapeHtml(user.username)}
      </a>
      ${user.role === 'admin' ? `<a href="/admin.html" class="btn btn-ghost btn-sm">Админ</a>` : ''}
      <button class="btn btn-secondary btn-sm" onclick="handleLogout()">Выйти</button>
    `;
  } else {
    actionsEl.innerHTML = `
      <a href="/login.html"    class="btn btn-ghost btn-sm">Войти</a>
      <a href="/register.html" class="btn btn-primary btn-sm">Регистрация</a>
    `;
  }
}

async function handleLogout() {
  try { await Auth.logout(); } catch (_) {}
  AuthState.clear();
  showToast('Вы вышли из аккаунта', 'success');
  setTimeout(() => { window.location.href = '/index.html'; }, 500);
}

// ============================================
// HELPERS
// ============================================

function showFormError(form, message) {
  let errEl = form.querySelector('.form-error-global');
  if (!errEl) {
    errEl = document.createElement('div');
    errEl.className = 'form-error form-error-global';
    form.prepend(errEl);
  }
  errEl.textContent = message;
}

function clearFormErrors(form) {
  form.querySelectorAll('.form-error-global').forEach(el => el.remove());
  form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
}

function setButtonLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
  btn.textContent = loading ? 'Загрузка...' : btn.dataset.originalText;
}

// Guard для страниц, требующих авторизации
function requireAuth() {
  if (!AuthState.isLoggedIn()) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

// Guard для страниц, требующих роли admin
function requireAdmin() {
  if (!AuthState.isAdmin()) {
    window.location.href = '/index.html';
    return false;
  }
  return true;
}


/**
 * main.js — общие утилиты, навигация, выбор сезона, toast
 */

// ============================================
// SEASON STATE
// ============================================

const SeasonState = {
  get:     () => parseInt(localStorage.getItem('f1_season') || new Date().getFullYear()),
  set:     (year) => localStorage.setItem('f1_season', year),
};

let _availableSeasons = [];

async function loadSeasons() {
  try {
    const data = await Seasons.list();
    _availableSeasons = data;
    const years = data.map(s => s.year);
    const savedYear = SeasonState.get();
    if (years.length && !years.includes(savedYear)) {
      const currentSeason = data.find(s => s.is_current) || data[0];
      SeasonState.set(currentSeason.year);
    }
    return data;
  } catch (_) {
    return [];
  }
}

function initSeasonSelectors() {
  const current = SeasonState.get();
  document.querySelectorAll('.season-select').forEach(sel => {
    // Populate options from available seasons
    if (_availableSeasons.length) {
      sel.innerHTML = _availableSeasons
        .sort((a, b) => b.year - a.year)
        .map(s => `<option value="${s.year}" ${s.year === current ? 'selected' : ''}>${s.year}</option>`)
        .join('');
    } else {
      // Fallback to common seasons
      [2026, 2025].forEach(y => {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        if (y === current) opt.selected = true;
        sel.appendChild(opt);
      });
    }

    sel.addEventListener('change', () => {
      SeasonState.set(parseInt(sel.value));
      // Sync all other selects
      document.querySelectorAll('.season-select').forEach(s => { s.value = sel.value; });
      // Dispatch custom event so pages can react
      window.dispatchEvent(new CustomEvent('seasonChanged', { detail: { year: parseInt(sel.value) } }));
    });
  });
}

// ============================================
// NAVBAR
// ============================================

function initNavbar() {
  updateNavAuth();
  highlightActiveNav();
  initHamburger();
}

function highlightActiveNav() {
  const current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href.includes(current)) link.classList.add('active');
  });
}

function initHamburger() {
  const btn = document.getElementById('hamburger');
  const menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;

  btn.addEventListener('click', () => {
    menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', menu.classList.contains('open'));
  });

  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.remove('open');
    }
  });
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || icons.info}</span><span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'none';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

// ============================================
// SPEED LINE EFFECT
// ============================================

function showSpeedLine() {
  const line = document.createElement('div');
  line.className = 'speed-line';
  document.body.appendChild(line);
  setTimeout(() => line.remove(), 700);
}

// ============================================
// LOADING STATES
// ============================================

function showLoading(container, message = 'Загрузка...') {
  if (!container) return;
  container.innerHTML = `
    <div class="loading-spinner">
      <div class="spinner"></div>
      <span>${message}</span>
    </div>
  `;
}

function showEmpty(container, title = 'Нет данных', text = '', icon = '📊') {
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <div class="empty-state-title">${title}</div>
      ${text ? `<div class="empty-state-text">${text}</div>` : ''}
    </div>
  `;
}

function showError(container, message = 'Ошибка загрузки данных') {
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">⚠</div>
      <div class="empty-state-title">Ошибка</div>
      <div class="empty-state-text">${escapeHtml(message)}</div>
    </div>
  `;
}

// ============================================
// DOM UTILITIES
// ============================================

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getDriverName(item, fallback = '—') {
  const driver = item?.driver || item;
  if (!driver || typeof driver !== 'object') return fallback;
  const fullName = driver.full_name || `${driver.first_name || ''} ${driver.last_name || ''}`.trim();
  return fullName || item?.full_name || fallback;
}

function getDriverLastName(item, fallback = 'N/A') {
  const driver = item?.driver || item;
  if (!driver || typeof driver !== 'object') return fallback;
  return driver.last_name || driver.full_name || getDriverName(item, fallback);
}

function getConstructorName(item, fallback = '—') {
  const constructor = item?.constructor || item?.team || item;
  if (!constructor || typeof constructor !== 'object') return fallback;
  return constructor.name || item?.name || fallback;
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function formatDate(dateStr, options = {}) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('ru-RU', {
    day:   '2-digit',
    month: 'long',
    year:  'numeric',
    ...options,
  });
}

function formatDateShort(dateStr) {
  return formatDate(dateStr, { month: 'short' });
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function avatarFallback(imgEl, name) {
  imgEl.onerror = () => {
    imgEl.style.display = 'none';
    const placeholder = document.createElement('div');
    placeholder.className = imgEl.className;
    placeholder.style.cssText = `
      display:flex; align-items:center; justify-content:center;
      background:var(--bg-graphite); color:var(--teal);
      font-family:var(--font-display); font-weight:700; font-size:0.9rem;
      border-radius:50%;
    `;
    placeholder.textContent = (name || '?').charAt(0).toUpperCase();
    imgEl.parentNode.replaceChild(placeholder, imgEl);
  };
}

function getRaceStatusBadge(status) {
  const map = {
    upcoming:  ['silver',  'Ожидается'],
    ongoing:   ['teal',    'Идёт сейчас'],
    finished:  ['success', 'Завершена'],
    cancelled: ['error',   'Отменена'],
    postponed: ['warning', 'Перенесена'],
  };
  const [cls, label] = map[status] || ['silver', status];
  const pulse = status === 'ongoing' ? '<span class="pulse-dot"></span>' : '';
  return `<span class="badge badge-${cls}">${pulse}${label}</span>`;
}

function getDriverStatusBadge(status) {
  const map = {
    active:   ['success', 'Активный'],
    reserve:  ['warning', 'Резервный'],
    finished: ['silver',  'Завершил сезон'],
    inactive: ['error',   'Не участвует'],
  };
  const [cls, label] = map[status] || ['silver', status];
  return `<span class="badge badge-${cls}">${label}</span>`;
}

function getPosChangeHtml(current, previous) {
  if (!previous || current === previous) {
    return `<span class="pos-change same">—</span>`;
  }
  if (current < previous) {
    return `<span class="pos-change up">▲${previous - current}</span>`;
  }
  return `<span class="pos-change down">▼${current - previous}</span>`;
}

function getPositionClass(pos) {
  if (pos === 1) return 'pos-1';
  if (pos === 2) return 'pos-2';
  if (pos === 3) return 'pos-3';
  return '';
}

function getRowHighlight(pos) {
  if (pos === 1) return 'highlight-gold';
  if (pos === 2) return 'highlight-silver';
  if (pos === 3) return 'highlight-bronze';
  return '';
}

// ============================================
// TABS
// ============================================

function initTabs(tabsContainer) {
  if (!tabsContainer) return;
  const buttons = tabsContainer.querySelectorAll('.tab-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tabsContainer.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      const panel = document.getElementById(`tab-${target}`);
      if (panel) panel.classList.add('active');
    });
  });
}

// ============================================
// SORT TABLE
// ============================================

function initSortableTable(tableEl) {
  if (!tableEl) return;
  let sortCol = null;
  let sortDir = 'asc';

  tableEl.querySelectorAll('thead th[data-sort]').forEach(th => {
    th.style.cursor = 'pointer';
    th.innerHTML += ` <span class="sort-icon">↕</span>`;

    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      if (sortCol === col) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        sortCol = col;
        sortDir = 'asc';
      }

      tableEl.querySelectorAll('thead th').forEach(t => t.classList.remove('sort-active'));
      th.classList.add('sort-active');
      th.querySelector('.sort-icon').textContent = sortDir === 'asc' ? '↑' : '↓';

      const tbody = tableEl.querySelector('tbody');
      const rows = Array.from(tbody.querySelectorAll('tr'));
      rows.sort((a, b) => {
        const aVal = a.querySelector(`[data-col="${col}"]`)?.dataset.value || a.cells[th.cellIndex]?.textContent || '';
        const bVal = b.querySelector(`[data-col="${col}"]`)?.dataset.value || b.cells[th.cellIndex]?.textContent || '';
        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);
        const cmp = isNaN(aNum) || isNaN(bNum)
          ? aVal.localeCompare(bVal, 'ru')
          : aNum - bNum;
        return sortDir === 'asc' ? cmp : -cmp;
      });
      rows.forEach(r => tbody.appendChild(r));
    });
  });
}

// ============================================
// FAVORITES TOGGLE HELPER
// ============================================

async function toggleFavoriteDriver(driverId, btn) {
  if (!AuthState.isLoggedIn()) {
    showToast('Войдите, чтобы добавить в избранное', 'warning');
    return;
  }
  const isActive = btn.classList.contains('active');
  try {
    if (isActive) {
      await Favorites.removeDriver(driverId);
      btn.classList.remove('active');
      btn.title = 'Добавить в избранное';
      showToast('Удалено из избранного', 'info');
    } else {
      await Favorites.addDriver(driverId);
      btn.classList.add('active');
      btn.title = 'Убрать из избранного';
      showToast('Добавлено в избранное', 'success');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function toggleFavoriteConstructor(constructorId, btn) {
  if (!AuthState.isLoggedIn()) {
    showToast('Войдите, чтобы добавить в избранное', 'warning');
    return;
  }
  const isActive = btn.classList.contains('active');
  try {
    if (isActive) {
      await Favorites.removeConstructor(constructorId);
      btn.classList.remove('active');
      btn.title = 'Добавить в избранное';
      showToast('Удалено из избранного', 'info');
    } else {
      await Favorites.addConstructor(constructorId);
      btn.classList.add('active');
      btn.title = 'Убрать из избранного';
      showToast('Добавлено в избранное', 'success');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ============================================
// PAGE INIT (called on every page)
// ============================================

async function initPage() {
  showSpeedLine();
  await loadSeasons();
  initNavbar();
  initSeasonSelectors();
}

document.addEventListener('DOMContentLoaded', initPage);


/**
 * charts.js — все графики через Chart.js
 * Цвета: teal / silver / gold / graphite
 */

// Глобальные дефолты для Chart.js
function applyChartDefaults() {
  if (typeof Chart === 'undefined') return;

  Chart.defaults.color = '#8E9A9E';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.plugins.legend.labels.color = '#8E9A9E';
  Chart.defaults.plugins.legend.labels.padding = 16;
  Chart.defaults.plugins.tooltip.backgroundColor = '#11181A';
  Chart.defaults.plugins.tooltip.borderColor = 'rgba(167,176,181,0.15)';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.titleColor = '#F2F5F5';
  Chart.defaults.plugins.tooltip.bodyColor = '#8E9A9E';
  Chart.defaults.plugins.tooltip.padding = 12;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
  Chart.defaults.scale.grid.color = 'rgba(167,176,181,0.07)';
  Chart.defaults.scale.ticks.color = '#556066';
}

const CHART_COLORS = {
  teal:    '#00D2BE',
  tealBg:  'rgba(0, 210, 190, 0.12)',
  tealLine:'rgba(0, 210, 190, 0.6)',
  gold:    '#D9B85F',
  goldBg:  'rgba(217, 184, 95, 0.12)',
  silver:  '#A7B0B5',
  silverBg:'rgba(167, 176, 181, 0.1)',
  bronze:  '#CD7F32',
  bronzeBg:'rgba(205, 127, 50, 0.1)',
  p4:      '#637075',
  p4Bg:    'rgba(99, 112, 117, 0.1)',
  p5:      '#3D4E54',
  p5Bg:    'rgba(61, 78, 84, 0.1)',
};

const PODIUM_COLORS = [
  { border: CHART_COLORS.gold,   bg: CHART_COLORS.goldBg },
  { border: CHART_COLORS.silver, bg: CHART_COLORS.silverBg },
  { border: CHART_COLORS.bronze, bg: CHART_COLORS.bronzeBg },
  { border: CHART_COLORS.p4,     bg: CHART_COLORS.p4Bg },
  { border: CHART_COLORS.p5,     bg: CHART_COLORS.p5Bg },
];

function getColorForIndex(i) {
  const colors = [
    CHART_COLORS.teal, CHART_COLORS.gold, CHART_COLORS.silver,
    CHART_COLORS.bronze, '#4BFFE8', '#6C8EAD', '#9D8EC4', '#7EBDA5',
  ];
  return colors[i % colors.length];
}

function destroyChart(canvasId) {
  const existing = Chart.getChart(canvasId);
  if (existing) existing.destroy();
}

// ============================================
// 1. ТОП-3 ГОНЩИКОВ — горизонтальные бары
// ============================================

function renderTopDriversChart(canvasId, drivers) {
  applyChartDefaults();
  destroyChart(canvasId);

  const canvas = document.getElementById(canvasId);
  if (!canvas || !drivers?.length) return;

  const labels = drivers.map(d => getDriverLastName(d));
  const points = drivers.map(d => parseFloat(d.points) || 0);

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Очки',
        data: points,
        backgroundColor: drivers.map((_, i) => PODIUM_COLORS[i]?.bg || CHART_COLORS.tealBg),
        borderColor:     drivers.map((_, i) => PODIUM_COLORS[i]?.border || CHART_COLORS.teal),
        borderWidth: 1.5,
        borderRadius: 4,
        borderSkipped: false,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.raw} очков`,
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: 'rgba(167,176,181,0.06)' },
        },
        y: {
          grid: { display: false },
          ticks: { color: '#F2F5F5', font: { weight: '600' } },
        },
      },
    },
  });
}

// ============================================
// 2. СРАВНЕНИЕ ОЧКОВ КОМАНД — вертикальные бары
// ============================================

function renderConstructorsChart(canvasId, constructors) {
  applyChartDefaults();
  destroyChart(canvasId);

  const canvas = document.getElementById(canvasId);
  if (!canvas || !constructors?.length) return;

  const labels = constructors.map(c => getConstructorName(c, 'N/A'));
  const points = constructors.map(c => parseFloat(c.points) || 0);

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Очки',
        data: points,
        backgroundColor: constructors.map((_, i) => getColorForIndex(i) + '22'),
        borderColor:     constructors.map((_, i) => getColorForIndex(i)),
        borderWidth: 1.5,
        borderRadius: 4,
        borderSkipped: 'bottom',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(167,176,181,0.06)' } },
        x: { grid: { display: false }, ticks: { maxRotation: 30, font: { size: 11 } } },
      },
    },
  });
}

// ============================================
// 3. ДИНАМИКА ОЧКОВ ГОНЩИКА — линия
// ============================================

function renderDriverPointsChart(canvasId, raceResults) {
  applyChartDefaults();
  destroyChart(canvasId);

  const canvas = document.getElementById(canvasId);
  if (!canvas || !raceResults?.length) return;

  let cumulative = 0;
  const labels  = raceResults.map(r => r.race?.name || `Этап ${r.round}`);
  const data    = raceResults.map(r => { cumulative += (parseFloat(r.points) || 0); return cumulative; });
  const perRace = raceResults.map(r => parseFloat(r.points) || 0);

  new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Очки (накопленные)',
          data,
          borderColor: CHART_COLORS.teal,
          backgroundColor: CHART_COLORS.tealBg,
          fill: true,
          tension: 0.3,
          pointBackgroundColor: CHART_COLORS.teal,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: 'Очки за гонку',
          data: perRace,
          borderColor: CHART_COLORS.gold,
          backgroundColor: 'transparent',
          tension: 0.3,
          borderDash: [4, 4],
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'top' } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(167,176,181,0.06)' } },
        x: { grid: { display: false }, ticks: { maxRotation: 30, font: { size: 10 } } },
      },
    },
  });
}

// ============================================
// 4. ПОЗИЦИИ ГОНЩИКА ПО ГОНКАМ — линия
// ============================================

function renderDriverPositionsChart(canvasId, raceResults) {
  applyChartDefaults();
  destroyChart(canvasId);

  const canvas = document.getElementById(canvasId);
  if (!canvas || !raceResults?.length) return;

  const labels    = raceResults.map(r => r.race?.name || `Этап ${r.round}`);
  const positions = raceResults.map(r => r.position || null);
  const grids     = raceResults.map(r => r.grid_position || null);

  new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Финиш',
          data: positions,
          borderColor: CHART_COLORS.teal,
          backgroundColor: 'transparent',
          tension: 0.2,
          pointRadius: 4,
          spanGaps: true,
        },
        {
          label: 'Старт',
          data: grids,
          borderColor: CHART_COLORS.silver,
          backgroundColor: 'transparent',
          borderDash: [4, 4],
          tension: 0.2,
          pointRadius: 3,
          spanGaps: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'top' } },
      scales: {
        y: {
          reverse: true,
          min: 1,
          ticks: { stepSize: 1 },
          grid: { color: 'rgba(167,176,181,0.06)' },
        },
        x: { grid: { display: false }, ticks: { maxRotation: 30, font: { size: 10 } } },
      },
    },
  });
}

// ============================================
// 5. ДИНАМИКА ОЧКОВ КОМАНДЫ — линия
// ============================================

function renderConstructorPointsChart(canvasId, raceData) {
  applyChartDefaults();
  destroyChart(canvasId);

  const canvas = document.getElementById(canvasId);
  if (!canvas || !raceData?.length) return;

  let cum = 0;
  const labels = raceData.map(r => r.race?.name || `Этап ${r.round}`);
  const data   = raceData.map(r => { cum += (parseFloat(r.points) || 0); return cum; });

  new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Очки команды',
        data,
        borderColor: CHART_COLORS.teal,
        backgroundColor: CHART_COLORS.tealBg,
        fill: true,
        tension: 0.3,
        pointRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(167,176,181,0.06)' } },
        x: { grid: { display: false }, ticks: { maxRotation: 30, font: { size: 10 } } },
      },
    },
  });
}

// ============================================
// 6. СРАВНЕНИЕ ДВУХ ПИЛОТОВ КОМАНДЫ — бары
// ============================================

function renderTeammatesChart(canvasId, driver1, driver2, labels, data1, data2) {
  applyChartDefaults();
  destroyChart(canvasId);

  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: driver1,
          data: data1,
          backgroundColor: CHART_COLORS.tealBg,
          borderColor: CHART_COLORS.teal,
          borderWidth: 1.5,
          borderRadius: 3,
        },
        {
          label: driver2,
          data: data2,
          backgroundColor: CHART_COLORS.goldBg,
          borderColor: CHART_COLORS.gold,
          borderWidth: 1.5,
          borderRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'top' } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(167,176,181,0.06)' } },
        x: { grid: { display: false } },
      },
    },
  });
}

// ============================================
// 7. РАСПРЕДЕЛЕНИЕ ОЧКОВ В ГОНКЕ — пончик
// ============================================

function renderRacePointsChart(canvasId, results) {
  applyChartDefaults();
  destroyChart(canvasId);

  const canvas = document.getElementById(canvasId);
  if (!canvas || !results?.length) return;

  const filtered = results.filter(r => parseFloat(r.points) > 0);
  const labels = filtered.map(r => getDriverLastName(r));
  const data   = filtered.map(r => parseFloat(r.points));

  new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: filtered.map((_, i) => getColorForIndex(i) + 'AA'),
        borderColor:     filtered.map((_, i) => getColorForIndex(i)),
        borderWidth: 1.5,
        hoverOffset: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { font: { size: 11 }, padding: 10 } },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.raw} очков`,
          },
        },
      },
    },
  });
}

// ============================================
// 8. ПОДИУМЫ ГОНЩИКОВ — горизонтальные бары
// ============================================

function renderPodiumsChart(canvasId, standings) {
  applyChartDefaults();
  destroyChart(canvasId);

  const canvas = document.getElementById(canvasId);
  if (!canvas || !standings?.length) return;

  const top10 = standings.slice(0, 10);
  const labels = top10.map(d => getDriverLastName(d));

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Победы',
          data: top10.map(d => d.wins || 0),
          backgroundColor: CHART_COLORS.goldBg,
          borderColor: CHART_COLORS.gold,
          borderWidth: 1.5,
          borderRadius: 3,
          stack: 'podiums',
        },
        {
          label: '2-е места',
          data: top10.map(d => Math.max(0, (d.podiums || 0) - (d.wins || 0))),
          backgroundColor: CHART_COLORS.silverBg,
          borderColor: CHART_COLORS.silver,
          borderWidth: 1.5,
          borderRadius: 3,
          stack: 'podiums',
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: {
        x: { stacked: true, beginAtZero: true, grid: { color: 'rgba(167,176,181,0.06)' } },
        y: { stacked: true, grid: { display: false }, ticks: { color: '#F2F5F5' } },
      },
    },
  });
}
