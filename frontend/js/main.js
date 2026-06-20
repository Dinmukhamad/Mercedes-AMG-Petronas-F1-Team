/**
 * main.js — общие утилиты, навигация, выбор сезона, toast
 */

// ============================================
// SEASON STATE
// ============================================

const SeasonState = {
  get:     () => parseInt(localStorage.getItem('f1_season') || '2025'),
  set:     (year) => localStorage.setItem('f1_season', year),
};

let _availableSeasons = [];

async function loadSeasons() {
  try {
    const data = await Seasons.list();
    _availableSeasons = data;
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
