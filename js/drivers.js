/**
 * drivers.js — страница гонщиков и личного зачёта
 */

let _allStandings = [];
let _allDrivers   = [];
let _userFavorites = [];

async function initDriversPage() {
  initTabs(document.getElementById('tabs-root'));
  initFilters();
  await loadDriversData(SeasonState.get());
  window.addEventListener('seasonChanged', ({ detail }) => loadDriversData(detail.year));
}

async function loadDriversData(season) {
  await Promise.allSettled([
    loadStandings(season),
    loadAllDrivers(season),
    loadFavoriteIds(),
  ]);
}

// ============================================
// FAVORITES
// ============================================

async function loadFavoriteIds() {
  if (!AuthState.isLoggedIn()) { _userFavorites = []; return; }
  try {
    const favs = await Favorites.list();
    _userFavorites = (favs || []).filter(f => f.driver_id).map(f => f.driver_id);
  } catch (_) { _userFavorites = []; }
}

// ============================================
// STANDINGS TAB
// ============================================

async function loadStandings(season) {
  const tableWrap = document.getElementById('standings-table-wrap');
  const podiumEl  = document.getElementById('podium-container');
  showLoading(tableWrap);
  if (podiumEl) showLoading(podiumEl);

  try {
    _allStandings = await Standings.drivers(season);
    if (!_allStandings?.length) {
      showEmpty(tableWrap, 'Нет данных', 'Таблица ещё не сформирована');
      if (podiumEl) podiumEl.innerHTML = '';
      return;
    }

    // Podium top-3
    if (podiumEl) renderStandingsPodium(podiumEl, _allStandings.slice(0, 3));

    // Charts
    renderTopDriversChart('chart-drivers-pts', _allStandings.slice(0, 10));
    renderPodiumsChart('chart-podiums', _allStandings);

    // Table
    renderStandingsTable(tableWrap, _allStandings);
  } catch (err) {
    showError(tableWrap, err.message);
  }
}

function renderStandingsPodium(container, top3) {
  const rankClass = ['p1', 'p2', 'p3'];
  const order = [top3[1], top3[0], top3[2]].filter(Boolean);
  container.innerHTML = `
    <div class="podium-row">
      ${order.map((d) => {
        const pos   = d.position;
        const cls   = rankClass[pos - 1] || '';
        const name  = getDriverName(d, '—');
        const photo = d.driver?.photo_url || '';
        const team  = getConstructorName(d, '—');
        return `
          <div class="podium-card ${cls}">
            <div class="podium-rank">${pos}</div>
            ${photo ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(name)}" class="podium-photo" onerror="this.style.display='none'">` : `<div class="podium-photo" style="display:flex;align-items:center;justify-content:center;background:var(--bg-graphite);font-family:var(--font-display);font-weight:700;font-size:1.4rem;color:var(--teal);">${name.charAt(0)}</div>`}
            <div class="podium-name">${escapeHtml(name)}</div>
            <div class="podium-team">${escapeHtml(team)}</div>
            <div class="podium-points">${d.points} <span>очков</span></div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderStandingsTable(container, standings) {
  const isFav = (driverId) => _userFavorites.includes(driverId);

  container.innerHTML = `
    <table id="standings-table">
      <thead>
        <tr>
          <th style="width:48px;">Место</th>
          <th style="width:24px;"></th>
          <th data-sort="name">Гонщик</th>
          <th>Команда</th>
          <th data-sort="points" class="text-right">Очки</th>
          <th data-sort="wins"   class="text-right">Победы</th>
          <th data-sort="podiums" class="text-right">Подиумы</th>
          <th data-sort="starts" class="text-right">Старты</th>
          <th class="text-right">DNF</th>
          <th style="width:48px;"></th>
        </tr>
      </thead>
      <tbody>
        ${standings.map(d => {
          const pos  = d.position;
          const prev = d.previous_position;
          const dId  = d.driver_id;
          const name = getDriverName(d, '—');
          const team = getConstructorName(d, '—');
          const photo = d.driver?.photo_url || '';
          const best = d.best_result || '—';
          return `
            <tr class="${getRowHighlight(pos)}">
              <td class="table-position">
                <span class="${getPositionClass(pos)}">${pos}</span>
                ${getPosChangeHtml(pos, prev)}
              </td>
              <td>${photo ? `<img src="${escapeHtml(photo)}" class="driver-avatar driver-avatar-sm" alt="" onerror="this.style.display='none'">` : ''}</td>
              <td>
                <div class="driver-cell" style="gap:8px;">
                  <div>
                    <div class="driver-name">${escapeHtml(name)}</div>
                    ${d.driver?.nationality ? `<div class="driver-number">${escapeHtml(d.driver.nationality)}</div>` : ''}
                  </div>
                </div>
              </td>
              <td class="muted">${escapeHtml(team)}</td>
              <td class="text-right number" data-col="points" data-value="${d.points}"><strong style="color:var(--teal)">${d.points}</strong></td>
              <td class="text-right number" data-col="wins"    data-value="${d.wins || 0}">${d.wins || 0}</td>
              <td class="text-right number" data-col="podiums" data-value="${d.podiums || 0}">${d.podiums || 0}</td>
              <td class="text-right muted"  data-col="starts"  data-value="${d.starts || 0}">${d.starts || 0}</td>
              <td class="text-right muted">${d.dnfs || 0}</td>
              <td>
                <div style="display:flex;gap:6px;justify-content:flex-end;">
                  <a href="/driver-detail.html?id=${dId}" class="btn btn-ghost btn-sm btn-icon" title="Страница гонщика">→</a>
                  ${AuthState.isLoggedIn()
                    ? `<button class="btn-favorite ${isFav(dId) ? 'active' : ''}" onclick="toggleFavoriteDriver(${dId}, this)" title="${isFav(dId) ? 'В избранном' : 'Добавить'}">★</button>`
                    : ''}
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  initSortableTable(document.getElementById('standings-table'));
}

// ============================================
// ALL DRIVERS TAB
// ============================================

async function loadAllDrivers(season) {
  const container = document.getElementById('drivers-table-wrap');
  showLoading(container);

  try {
    _allDrivers = await Drivers.list(season);
    renderDriversTable(_allDrivers);
    populateTeamFilter(_allDrivers);
  } catch (err) {
    showError(container, err.message);
  }
}

function renderDriversTable(drivers) {
  const container = document.getElementById('drivers-table-wrap');
  if (!drivers?.length) { showEmpty(container, 'Гонщики не найдены', 'Попробуйте изменить фильтры'); return; }

  const isFav = (dId) => _userFavorites.includes(dId);

  container.innerHTML = `
    <table id="drivers-table">
      <thead>
        <tr>
          <th style="width:40px;">#</th>
          <th data-sort="name">Гонщик</th>
          <th>Национальность</th>
          <th>Команда</th>
          <th>Статус</th>
          <th style="width:80px;"></th>
        </tr>
      </thead>
      <tbody>
        ${drivers.map((d, i) => {
          const name  = getDriverName(d, '—');
          const photo = d.photo_url || '';
          const team  = getConstructorName(d, '—');
          return `
            <tr>
              <td class="muted">${d.driver_number || (i + 1)}</td>
              <td>
                <div class="driver-cell">
                  ${photo ? `<img src="${escapeHtml(photo)}" class="driver-avatar" alt="${escapeHtml(name)}" onerror="this.style.display='none'">` : `<div class="driver-avatar" style="display:flex;align-items:center;justify-content:center;background:var(--bg-graphite);font-family:var(--font-display);font-weight:700;color:var(--teal);">${name.charAt(0)}</div>`}
                  <div>
                    <div class="driver-name">${escapeHtml(name)}</div>
                    ${d.date_of_birth ? `<div class="driver-number">р. ${formatDateShort(d.date_of_birth)}</div>` : ''}
                  </div>
                </div>
              </td>
              <td data-col="name" data-value="${escapeHtml(name)}">${escapeHtml(d.nationality || '—')}</td>
              <td class="muted">${escapeHtml(team)}</td>
              <td>${getDriverStatusBadge(d.status)}</td>
              <td>
                <div style="display:flex;gap:6px;justify-content:flex-end;">
                  <a href="/driver-detail.html?id=${d.id}" class="btn btn-ghost btn-sm btn-icon">→</a>
                  ${AuthState.isLoggedIn() ? `<button class="btn-favorite ${isFav(d.id) ? 'active' : ''}" onclick="toggleFavoriteDriver(${d.id}, this)">★</button>` : ''}
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  initSortableTable(document.getElementById('drivers-table'));
}

function populateTeamFilter(drivers) {
  const sel = document.getElementById('filter-team');
  if (!sel) return;
  const teams = [...new Set(drivers.map(d => getConstructorName(d, '')).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">Все команды</option>' + teams.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
}

function applyDriverFilters() {
  const query  = document.getElementById('search-driver')?.value.toLowerCase() || '';
  const team   = document.getElementById('filter-team')?.value || '';
  const status = document.getElementById('filter-status')?.value || '';

  const filtered = _allDrivers.filter(d => {
    const name = getDriverName(d, '').toLowerCase();
    if (query && !name.includes(query)) return false;
    if (team) {
      const dTeam = getConstructorName(d, '');
      if (dTeam !== team) return false;
    }
    if (status && d.status !== status) return false;
    return true;
  });

  renderDriversTable(filtered);
}

function initFilters() {
  ['search-driver', 'filter-team', 'filter-status'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', applyDriverFilters);
    document.getElementById(id)?.addEventListener('change', applyDriverFilters);
  });
}

document.addEventListener('DOMContentLoaded', initDriversPage);
