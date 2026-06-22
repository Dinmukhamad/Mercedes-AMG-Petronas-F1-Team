/**
 * constructors.js — страница команд / кубок конструкторов
 */

let _allConstructorStandings = [];
let _userFavTeams = [];

async function initConstructorsPage() {
  await loadConstructorsData(SeasonState.get());
  initFilters();
  window.addEventListener('seasonChanged', ({ detail }) => loadConstructorsData(detail.year));
}

async function loadFavTeamIds() {
  if (!AuthState.isLoggedIn()) { _userFavTeams = []; return; }
  try {
    const favs = await Favorites.list();
    _userFavTeams = (favs || []).filter(f => f.constructor_id).map(f => f.constructor_id);
  } catch (_) { _userFavTeams = []; }
}

async function loadConstructorsData(season) {
  const container = document.getElementById('constructors-table-wrap');
  showLoading(container);

  await loadFavTeamIds();

  try {
    _allConstructorStandings = await Standings.constructors(season);
    if (!_allConstructorStandings?.length) {
      showEmpty(container, 'Нет данных', 'Таблица ещё не сформирована');
      return;
    }
    renderConstructorsChart('chart-teams-pts', _allConstructorStandings);
    populateCountryFilter(_allConstructorStandings);
    renderConstructorsTable(container, _allConstructorStandings);
  } catch (err) {
    showError(container, err.message);
  }
}

function renderConstructorsTable(container, standings) {
  if (!standings?.length) { showEmpty(container, 'Команды не найдены'); return; }
  const isFav = id => _userFavTeams.includes(id);

  container.innerHTML = `
    <table id="constructors-table">
      <thead>
        <tr>
          <th style="width:48px;">Место</th>
          <th>Команда</th>
          <th>Страна</th>
          <th>Болид</th>
          <th>Гонщики</th>
          <th data-sort="points" class="text-right">Очки</th>
          <th data-sort="wins"   class="text-right">Победы</th>
          <th data-sort="podiums" class="text-right">Подиумы</th>
          <th style="width:80px;"></th>
        </tr>
      </thead>
      <tbody>
        ${standings.map(s => {
          const pos  = s.position;
          const con  = s.constructor || {};
          const name = getConstructorName(s, '—');
          const logo = con.logo_url || '';
          const carImg = con.car_image_url || '';
          const cId  = s.constructor_id;
          const drivers = (s.drivers || []).map(d => d.last_name || d.full_name).join(', ') || '—';
          return `
            <tr class="${getRowHighlight(pos)}">
              <td class="table-position"><span class="${getPositionClass(pos)}">${pos}</span>${getPosChangeHtml(pos, s.previous_position)}</td>
              <td>
                <div class="driver-cell">
                  ${logo ? `<img src="${escapeHtml(logo)}" class="team-logo" alt="${escapeHtml(name)}" onerror="this.style.display='none'">` : ''}
                  <div>
                    <div class="driver-name">${escapeHtml(name)}</div>
                    ${carImg ? `<img src="${escapeHtml(carImg)}" style="height:20px;margin-top:2px;" alt="car" onerror="this.style.display='none'">` : ''}
                  </div>
                </div>
              </td>
              <td class="muted">${escapeHtml(con.nationality || '—')}</td>
              <td class="muted" style="font-size:.82rem;">${escapeHtml(con.car_name || '—')}</td>
              <td class="muted" style="font-size:.82rem;">${escapeHtml(drivers)}</td>
              <td class="text-right number" data-col="points" data-value="${s.points}"><strong style="color:var(--teal)">${s.points}</strong></td>
              <td class="text-right number" data-col="wins"    data-value="${s.wins || 0}">${s.wins || 0}</td>
              <td class="text-right number" data-col="podiums" data-value="${s.podiums || 0}">${s.podiums || 0}</td>
              <td>
                <div style="display:flex;gap:6px;justify-content:flex-end;">
                  <a href="/constructor-detail.html?id=${cId}" class="btn btn-ghost btn-sm btn-icon">→</a>
                  ${AuthState.isLoggedIn() ? `<button class="btn-favorite ${isFav(cId) ? 'active' : ''}" onclick="toggleFavoriteConstructor(${cId}, this)">★</button>` : ''}
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
  initSortableTable(document.getElementById('constructors-table'));
}

function populateCountryFilter(standings) {
  const sel = document.getElementById('filter-country');
  if (!sel) return;
  const countries = [...new Set(standings.map(s => s.constructor?.nationality).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">Все страны</option>' + countries.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
}

function applyFilters() {
  const query   = document.getElementById('search-team')?.value.toLowerCase() || '';
  const country = document.getElementById('filter-country')?.value || '';
  const sortBy  = document.getElementById('sort-by')?.value || 'points';

  let filtered = _allConstructorStandings.filter(s => {
    const name = getConstructorName(s, '').toLowerCase();
    if (query && !name.includes(query)) return false;
    if (country && s.constructor?.nationality !== country) return false;
    return true;
  });

  if (sortBy === 'wins')  filtered.sort((a, b) => (b.wins || 0) - (a.wins || 0));
  if (sortBy === 'name')  filtered.sort((a, b) => getConstructorName(a, '').localeCompare(getConstructorName(b, ''), 'ru'));

  renderConstructorsTable(document.getElementById('constructors-table-wrap'), filtered);
}

function initFilters() {
  ['search-team', 'filter-country', 'sort-by'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', applyFilters);
    document.getElementById(id)?.addEventListener('change', applyFilters);
  });
}

document.addEventListener('DOMContentLoaded', initConstructorsPage);
