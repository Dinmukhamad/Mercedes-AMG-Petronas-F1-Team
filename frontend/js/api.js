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
