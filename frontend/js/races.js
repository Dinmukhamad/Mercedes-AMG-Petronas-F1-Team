/**
 * races.js — календарь гонок
 */

let _allRaces = [];

async function initRacesPage() {
  await loadRaces(SeasonState.get());
  initFilters();
  window.addEventListener('seasonChanged', ({ detail }) => loadRaces(detail.year));
}

async function loadRaces(season) {
  const grid = document.getElementById('races-grid');
  showLoading(grid);
  try {
    _allRaces = await Races.list(season);
    if (!_allRaces?.length) { showEmpty(grid, 'Гонки не найдены', 'Данные ещё не загружены', '🏁'); return; }
    populateCountryFilter();
    renderRaces(_allRaces);
  } catch (err) {
    showError(grid, err.message);
  }
}

function renderRaces(races) {
  const grid = document.getElementById('races-grid');
  const now  = new Date();
  const sorted = [...races].sort((a, b) => new Date(a.race_date) - new Date(b.race_date));

  if (!sorted.length) { showEmpty(grid, 'Гонки не найдены'); return; }

  grid.innerHTML = sorted.map(race => {
    const isUpcoming = race.status === 'upcoming' && new Date(race.race_date) > now;
    const isNext = sorted.find(r => r.status === 'upcoming' && new Date(r.race_date) > now)?.id === race.id;

    const banner = race.banner_url
      ? `<img src="${escapeHtml(race.banner_url)}" class="race-card-banner" alt="${escapeHtml(race.name)}" loading="lazy" onerror="this.style.display='none'">`
      : `<div class="race-card-banner-placeholder">🏎</div>`;

    return `
      <div class="race-card ${isNext ? 'upcoming' : ''}" onclick="window.location='/race-detail.html?id=${race.id}'">
        ${banner}
        <div class="race-card-body">
          <div class="race-round">Этап ${race.round} · ${race.country || ''}</div>
          <h3 class="race-name">${escapeHtml(race.name)}</h3>
          <div class="race-meta">
            <span>📍 ${escapeHtml(race.city || '')}${race.city && race.circuit_name ? ' · ' : ''}${escapeHtml(race.circuit_name || '')}</span>
          </div>
          <div class="race-card-footer">
            <div>
              ${getRaceStatusBadge(race.status)}
              ${isNext ? `<span class="badge badge-teal" style="margin-left:6px;">Следующая</span>` : ''}
            </div>
            <div style="text-align:right;">
              <div style="font-family:var(--font-display);font-weight:700;color:${isUpcoming ? 'var(--teal)' : 'var(--text-primary)'};">${formatDateShort(race.race_date)}</div>
              ${race.race_date ? `<div style="font-size:.73rem;color:var(--text-muted);">${formatTime(race.race_date)}</div>` : ''}
            </div>
          </div>
          ${race.winner ? `<div class="race-winner" style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">🏆 <strong>${escapeHtml(race.winner)}</strong></div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function populateCountryFilter() {
  const sel = document.getElementById('filter-country');
  if (!sel) return;
  const countries = [...new Set(_allRaces.map(r => r.country).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">Все страны</option>' + countries.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
}

function applyFilters() {
  const query   = document.getElementById('search-race')?.value.toLowerCase() || '';
  const country = document.getElementById('filter-country')?.value || '';
  const status  = document.getElementById('filter-status')?.value || '';

  const filtered = _allRaces.filter(r => {
    if (query && !r.name?.toLowerCase().includes(query)) return false;
    if (country && r.country !== country) return false;
    if (status && r.status !== status) return false;
    return true;
  });
  renderRaces(filtered);
}

function initFilters() {
  ['search-race', 'filter-country', 'filter-status'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', applyFilters);
    document.getElementById(id)?.addEventListener('change', applyFilters);
  });
}

document.addEventListener('DOMContentLoaded', initRacesPage);
