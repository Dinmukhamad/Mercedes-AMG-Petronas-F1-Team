/**
 * gallery.js — фотогалерея с lightbox и навигацией
 */

let _allPhotos = [];
let _filteredPhotos = [];
let _currentLightboxIndex = -1;
const PAGE_SIZE = 24;
let _currentPage = 0;

async function initGalleryPage() {
  await loadGallery(SeasonState.get());
  initFilters();
  initLoadMore();
  initKeyboard();
  window.addEventListener('seasonChanged', ({ detail }) => loadGallery(detail.year));
}

async function loadGallery(season) {
  const grid = document.getElementById('gallery-grid');
  showLoading(grid);
  _currentPage = 0;

  try {
    _allPhotos = await Gallery.list({ season, limit: 100 });
    populateRaceFilter();
    populateDriverFilter();
    applyFilters();
  } catch (err) {
    showError(grid, err.message);
  }
}

function renderGallery(photos, append = false) {
  const grid = document.getElementById('gallery-grid');

  if (!photos?.length && !append) {
    showEmpty(grid, 'Фото не найдены', 'Попробуйте изменить фильтры', '📷');
    document.getElementById('load-more-wrap').style.display = 'none';
    return;
  }

  const page = photos.slice(_currentPage * PAGE_SIZE, (_currentPage + 1) * PAGE_SIZE);

  if (!append) grid.innerHTML = '';

  page.forEach((photo, i) => {
    const globalIdx = _currentPage * PAGE_SIZE + i;
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.dataset.index = globalIdx;
    item.onclick = () => openLightbox(globalIdx);

    item.innerHTML = `
      <img src="${escapeHtml(photo.image_url)}" alt="${escapeHtml(photo.title || '')}" loading="lazy"
           onerror="this.parentElement.style.background='var(--bg-graphite)'">
      <div class="gallery-overlay">
        <div class="gallery-caption">${escapeHtml(photo.title || '')}</div>
      </div>
    `;
    grid.appendChild(item);
  });

  const hasMore = (_currentPage + 1) * PAGE_SIZE < photos.length;
  document.getElementById('load-more-wrap').style.display = hasMore ? 'block' : 'none';
}

function updateCount(total) {
  const el = document.getElementById('photo-count');
  if (el) el.textContent = total ? `Найдено фотографий: ${total}` : '';
}

// ============================================
// LIGHTBOX
// ============================================

function openLightbox(index) {
  _currentLightboxIndex = index;
  const photo = _filteredPhotos[index];
  if (!photo) return;

  document.getElementById('lightbox-img').src       = photo.image_url;
  document.getElementById('lightbox-info').textContent = buildLightboxCaption(photo, index);
  document.getElementById('lightbox-overlay').classList.add('open');
  updateNavButtons();
}

function closeLightbox() {
  document.getElementById('lightbox-overlay').classList.remove('open');
  _currentLightboxIndex = -1;
}

function lightboxNav(direction) {
  const newIdx = _currentLightboxIndex + direction;
  if (newIdx < 0 || newIdx >= _filteredPhotos.length) return;
  openLightbox(newIdx);
}

function buildLightboxCaption(photo, index) {
  const parts = [];
  if (photo.title) parts.push(photo.title);
  if (photo.race?.name) parts.push(photo.race.name);
  const driverName = getDriverName(photo, '');
  if (driverName) parts.push(driverName);
  parts.push(`${index + 1} / ${_filteredPhotos.length}`);
  return parts.join(' · ');
}

function updateNavButtons() {
  const prev = document.getElementById('lightbox-nav-prev');
  const next = document.getElementById('lightbox-nav-next');
  if (prev) prev.style.opacity = _currentLightboxIndex > 0 ? '1' : '0.2';
  if (next) next.style.opacity = _currentLightboxIndex < _filteredPhotos.length - 1 ? '1' : '0.2';
}

function initKeyboard() {
  document.addEventListener('keydown', e => {
    const overlay = document.getElementById('lightbox-overlay');
    if (!overlay?.classList.contains('open')) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowLeft')  lightboxNav(-1);
    if (e.key === 'ArrowRight') lightboxNav(1);
  });
}

// ============================================
// FILTERS
// ============================================

function applyFilters() {
  const query    = document.getElementById('search-photo')?.value.toLowerCase() || '';
  const raceId   = document.getElementById('filter-race')?.value || '';
  const driverId = document.getElementById('filter-driver')?.value || '';

  _filteredPhotos = _allPhotos.filter(p => {
    if (query && !p.title?.toLowerCase().includes(query)) return false;
    if (raceId   && String(p.race_id)   !== raceId)   return false;
    if (driverId && String(p.driver_id) !== driverId) return false;
    return true;
  });

  _currentPage = 0;
  updateCount(_filteredPhotos.length);
  renderGallery(_filteredPhotos);
}

function populateRaceFilter() {
  const sel = document.getElementById('filter-race');
  if (!sel) return;
  const races = {};
  _allPhotos.forEach(p => { if (p.race_id && p.race?.name) races[p.race_id] = p.race.name; });
  sel.innerHTML = '<option value="">Все гонки</option>' +
    Object.entries(races).map(([id, name]) => `<option value="${id}">${escapeHtml(name)}</option>`).join('');
}

function populateDriverFilter() {
  const sel = document.getElementById('filter-driver');
  if (!sel) return;
  const drivers = {};
  _allPhotos.forEach(p => {
    if (p.driver_id && p.driver) {
      const name = getDriverName(p, '');
      if (name) drivers[p.driver_id] = name;
    }
  });
  sel.innerHTML = '<option value="">Все гонщики</option>' +
    Object.entries(drivers).sort((a, b) => a[1].localeCompare(b[1], 'ru'))
      .map(([id, name]) => `<option value="${id}">${escapeHtml(name)}</option>`).join('');
}

function initFilters() {
  ['search-photo', 'filter-race', 'filter-driver'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', applyFilters);
    document.getElementById(id)?.addEventListener('change', applyFilters);
  });
}

function initLoadMore() {
  document.getElementById('load-more-btn')?.addEventListener('click', () => {
    _currentPage++;
    renderGallery(_filteredPhotos, true);
  });
}

document.addEventListener('DOMContentLoaded', initGalleryPage);
