/**
 * api.js — все запросы к backend API
 * Базовый URL берётся из константы API_BASE
 */

const API_BASE = 'http://localhost:8000/api';

// ============================================
// CORE FETCH
// ============================================

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('f1_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

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

function apiGet(path)              { return apiFetch(path); }
function apiPost(path, body)       { return apiFetch(path, { method: 'POST',   body: JSON.stringify(body) }); }
function apiPut(path, body)        { return apiFetch(path, { method: 'PUT',    body: JSON.stringify(body) }); }
function apiDelete(path)           { return apiFetch(path, { method: 'DELETE' }); }
function apiPostForm(path, formData) {
  const token = localStorage.getItem('f1_token');
  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body: formData,
  }).then(r => r.json());
}

// ============================================
// AUTH
// ============================================

const Auth = {
  register: (data)  => apiPost('/auth/register', data),
  login:    (data)  => apiPost('/auth/login', data),
  me:       ()      => apiGet('/auth/me'),
  logout:   ()      => apiPost('/auth/logout', {}),
};

// ============================================
// SEASONS
// ============================================

const Seasons = {
  list:   ()     => apiGet('/seasons'),
  get:    (year) => apiGet(`/seasons/${year}`),
};

// ============================================
// DRIVERS
// ============================================

const Drivers = {
  list:  (season)        => apiGet(`/drivers?season=${season}`),
  get:   (id)            => apiGet(`/drivers/${id}`),
  stats: (id, season)    => apiGet(`/drivers/${id}/stats?season=${season}`),
};

// ============================================
// CONSTRUCTORS
// ============================================

const Constructors = {
  list:  (season)        => apiGet(`/constructors?season=${season}`),
  get:   (id)            => apiGet(`/constructors/${id}`),
  stats: (id, season)    => apiGet(`/constructors/${id}/stats?season=${season}`),
};

// ============================================
// STANDINGS
// ============================================

const Standings = {
  drivers:       (season)          => apiGet(`/standings/drivers?season=${season}`),
  constructors:  (season)          => apiGet(`/standings/constructors?season=${season}`),
  topDrivers:    (season, limit=3) => apiGet(`/standings/top-drivers?season=${season}&limit=${limit}`),
  topConstructors: (season, limit=3) => apiGet(`/standings/top-constructors?season=${season}&limit=${limit}`),
};

// ============================================
// RACES
// ============================================

const Races = {
  list:       (season)   => apiGet(`/races?season=${season}`),
  get:        (id)       => apiGet(`/races/${id}`),
  results:    (id)       => apiGet(`/races/${id}/results`),
  qualifying: (id)       => apiGet(`/races/${id}/qualifying`),
  practice:   (id)       => apiGet(`/races/${id}/practice`),
  videos:     (id)       => apiGet(`/races/${id}/videos`),
  gallery:    (id)       => apiGet(`/races/${id}/gallery`),
};

// ============================================
// VIDEOS
// ============================================

const Videos = {
  list:    (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiGet(`/videos${q ? '?' + q : ''}`);
  },
  get:     (id)          => apiGet(`/videos/${id}`),
};

// ============================================
// GALLERY
// ============================================

const Gallery = {
  list:    (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiGet(`/gallery${q ? '?' + q : ''}`);
  },
  get:     (id)          => apiGet(`/gallery/${id}`),
};

// ============================================
// FAVORITES
// ============================================

const Favorites = {
  list:              ()   => apiGet('/favorites'),
  addDriver:         (id) => apiPost(`/favorites/drivers/${id}`, {}),
  removeDriver:      (id) => apiDelete(`/favorites/drivers/${id}`),
  addConstructor:    (id) => apiPost(`/favorites/constructors/${id}`, {}),
  removeConstructor: (id) => apiDelete(`/favorites/constructors/${id}`),
};

// ============================================
// ADMIN
// ============================================

const Admin = {
  // Seasons
  createSeason: (data) => apiPost('/admin/seasons', data),
  updateSeason: (id, data) => apiPut(`/admin/seasons/${id}`, data),
  deleteSeason: (id) => apiDelete(`/admin/seasons/${id}`),

  // Drivers
  createDriver: (data) => apiPost('/admin/drivers', data),
  updateDriver: (id, data) => apiPut(`/admin/drivers/${id}`, data),
  deleteDriver: (id) => apiDelete(`/admin/drivers/${id}`),

  // Constructors
  createConstructor: (data) => apiPost('/admin/constructors', data),
  updateConstructor: (id, data) => apiPut(`/admin/constructors/${id}`, data),
  deleteConstructor: (id) => apiDelete(`/admin/constructors/${id}`),

  // Videos
  createVideo: (data) => apiPost('/admin/videos', data),
  updateVideo: (id, data) => apiPut(`/admin/videos/${id}`, data),
  deleteVideo: (id) => apiDelete(`/admin/videos/${id}`),

  // Gallery
  createImage: (data) => apiPost('/admin/gallery', data),
  updateImage: (id, data) => apiPut(`/admin/gallery/${id}`, data),
  deleteImage: (id) => apiDelete(`/admin/gallery/${id}`),

  // Sync
  syncSeasons:          ()       => apiPost('/admin/sync/seasons', {}),
  syncDrivers:          (season) => apiPost(`/admin/sync/drivers?season=${season}`, {}),
  syncConstructors:     (season) => apiPost(`/admin/sync/constructors?season=${season}`, {}),
  syncRaces:            (season) => apiPost(`/admin/sync/races?season=${season}`, {}),
  syncStandings:        (season) => apiPost(`/admin/sync/standings?season=${season}`, {}),
  syncRace:             (id)     => apiPost(`/admin/sync/race/${id}`, {}),
  syncStatus:           ()       => apiGet('/admin/sync/status'),
};
