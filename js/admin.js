/**
 * admin.js — логика панели администратора
 */

let _syncLog = [];

async function initAdminPage() {
  if (!requireAdmin()) return;

  // Populate season selects
  const seasons = await loadSeasons();
  const sel = document.getElementById('sync-season-select');
  if (sel && seasons.length) {
    const current = SeasonState.get();
    sel.innerHTML = seasons
      .sort((a, b) => b.year - a.year)
      .map(s => `<option value="${s.year}" ${s.year === current ? 'selected' : ''}>${s.year}</option>`)
      .join('');
  }

  // Load sync status
  await loadSyncStatus();

  // Auto-refresh sync status every 10s
  setInterval(loadSyncStatus, 10000);
}

// ============================================
// PANEL NAVIGATION
// ============================================

function showPanel(panelName, linkEl) {
  // Hide all panels
  document.querySelectorAll('.admin-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.admin-nav-link').forEach(l => l.classList.remove('active'));

  // Show selected
  const panel = document.getElementById(`panel-${panelName}`);
  if (panel) panel.style.display = 'block';
  if (linkEl) linkEl.classList.add('active');

  // Lazy load panel data
  if (panelName === 'videos')       loadAdminVideos();
  if (panelName === 'gallery')      loadAdminGallery();
  if (panelName === 'seasons')      loadAdminSeasons();
  if (panelName === 'drivers')      loadAdminDrivers();
  if (panelName === 'constructors') loadAdminConstructors();
}

// ============================================
// SYNC
// ============================================

async function loadSyncStatus() {
  const badge = document.getElementById('sync-status-badge');
  try {
    const status = await Admin.syncStatus();
    if (!badge) return;
    if (status?.is_syncing) {
      badge.innerHTML = `<span class="badge badge-teal"><span class="pulse-dot"></span> Синхронизация...</span>`;
    } else {
      const last = status?.last_sync_at ? formatDate(status.last_sync_at) : 'никогда';
      badge.innerHTML = `<span class="badge badge-success">✓ Готово · ${last}</span>`;
    }
  } catch (_) {
    if (badge) badge.innerHTML = `<span class="badge badge-silver">Статус недоступен</span>`;
  }
}

async function runSync(type) {
  addSyncLog(`▶ Запуск синхронизации: ${type}...`);
  try {
    const result = await Admin.syncSeasons();
    addSyncLog(`✓ ${type}: ${JSON.stringify(result)}`);
    showToast('Синхронизация запущена', 'success');
  } catch (err) {
    addSyncLog(`✕ Ошибка: ${err.message}`);
    showToast(err.message, 'error');
  }
}

async function runSyncSeason(type) {
  const season = document.getElementById('sync-season-select')?.value;
  if (!season) { showToast('Выберите сезон', 'warning'); return; }

  addSyncLog(`▶ Синхронизация ${type} для сезона ${season}...`);
  try {
    let result;
    if (type === 'drivers')      result = await Admin.syncDrivers(season);
    if (type === 'constructors') result = await Admin.syncConstructors(season);
    if (type === 'races')        result = await Admin.syncRaces(season);
    if (type === 'standings')    result = await Admin.syncStandings(season);

    addSyncLog(`✓ Готово: ${JSON.stringify(result)}`);
    showToast(`Синхронизация ${type} запущена`, 'success');
  } catch (err) {
    addSyncLog(`✕ Ошибка: ${err.message}`);
    showToast(err.message, 'error');
  }
}

async function runSyncRace() {
  const raceId = document.getElementById('sync-race-id')?.value;
  if (!raceId) { showToast('Введите ID гонки', 'warning'); return; }

  addSyncLog(`▶ Синхронизация гонки ID=${raceId}...`);
  try {
    const result = await Admin.syncRace(raceId);
    addSyncLog(`✓ Готово: ${JSON.stringify(result)}`);
    showToast(`Гонка ${raceId} синхронизирована`, 'success');
  } catch (err) {
    addSyncLog(`✕ Ошибка: ${err.message}`);
    showToast(err.message, 'error');
  }
}

function addSyncLog(message) {
  const log = document.getElementById('sync-log');
  if (!log) return;
  const time = new Date().toLocaleTimeString('ru-RU');
  _syncLog.unshift(`[${time}] ${message}`);
  log.textContent = _syncLog.join('\n');
}

// ============================================
// VIDEOS ADMIN
// ============================================

async function loadAdminVideos() {
  const container = document.getElementById('videos-admin-table');
  showLoading(container);
  try {
    const videos = await Videos.list({ limit: 50 });
    if (!videos?.length) { showEmpty(container, 'Нет видео'); return; }
    container.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Название</th><th>Тип</th><th>Гонка</th><th>Дата</th><th style="width:100px;"></th></tr></thead>
          <tbody>
            ${videos.map(v => `
              <tr>
                <td style="max-width:280px;"><div class="truncate">${escapeHtml(v.title)}</div></td>
                <td class="muted">${escapeHtml(v.type || '—')}</td>
                <td class="muted" style="font-size:.8rem;">${escapeHtml(v.race?.name || '—')}</td>
                <td class="muted" style="font-size:.8rem;">${v.published_at ? formatDateShort(v.published_at) : '—'}</td>
                <td>
                  <div style="display:flex;gap:6px;">
                    <button class="btn btn-ghost btn-sm" onclick="openVideoForm(${JSON.stringify(v).replace(/"/g,'&quot;')})">✎</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteVideo(${v.id})">✕</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) { showError(container, err.message); }
}

function openVideoForm(video = null) {
  openAdminModal(video ? 'Редактировать видео' : 'Добавить видео', `
    <div class="form-group"><label class="form-label">Название</label>
      <input type="text" class="form-control" id="v-title" value="${escapeHtml(video?.title || '')}">
    </div>
    <div class="form-group"><label class="form-label">URL видео</label>
      <input type="text" class="form-control" id="v-url" placeholder="https://..." value="${escapeHtml(video?.video_url || '')}">
    </div>
    <div class="form-group"><label class="form-label">URL для встраивания (embed)</label>
      <input type="text" class="form-control" id="v-embed" placeholder="https://www.youtube.com/embed/..." value="${escapeHtml(video?.embed_url || '')}">
    </div>
    <div class="form-group"><label class="form-label">URL превью</label>
      <input type="text" class="form-control" id="v-thumb" value="${escapeHtml(video?.thumbnail_url || '')}">
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Тип</label>
        <select class="form-control" id="v-type">
          <option value="race_review" ${video?.type==='race_review'?'selected':''}>Обзор гонки</option>
          <option value="highlights"  ${video?.type==='highlights'?'selected':''}>Хайлайты</option>
          <option value="qualifying"  ${video?.type==='qualifying'?'selected':''}>Квалификация</option>
          <option value="fp"          ${video?.type==='fp'?'selected':''}>Практика</option>
          <option value="interview"   ${video?.type==='interview'?'selected':''}>Интервью</option>
          <option value="onboard"     ${video?.type==='onboard'?'selected':''}>Onboard</option>
          <option value="press_conference" ${video?.type==='press_conference'?'selected':''}>Пресс-конф.</option>
          <option value="tech_review" ${video?.type==='tech_review'?'selected':''}>Тех. разбор</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">ID гонки</label>
        <input type="number" class="form-control" id="v-race-id" value="${video?.race_id || ''}">
      </div>
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px;">
      <button class="btn btn-ghost" onclick="closeAdminModal()">Отмена</button>
      <button class="btn btn-primary" onclick="saveVideo(${video?.id || 'null'})">Сохранить</button>
    </div>
  `);
}

async function saveVideo(videoId) {
  const data = {
    title:         document.getElementById('v-title')?.value || '',
    video_url:     document.getElementById('v-url')?.value || '',
    embed_url:     document.getElementById('v-embed')?.value || '',
    thumbnail_url: document.getElementById('v-thumb')?.value || '',
    type:          document.getElementById('v-type')?.value || '',
    race_id:       parseInt(document.getElementById('v-race-id')?.value) || null,
  };
  try {
    if (videoId) await Admin.updateVideo(videoId, data);
    else         await Admin.createVideo(data);
    closeAdminModal();
    showToast('Видео сохранено', 'success');
    await loadAdminVideos();
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteVideo(id) {
  if (!confirm('Удалить видео?')) return;
  try { await Admin.deleteVideo(id); showToast('Удалено', 'success'); await loadAdminVideos(); }
  catch (err) { showToast(err.message, 'error'); }
}

// ============================================
// GALLERY ADMIN
// ============================================

async function loadAdminGallery() {
  const container = document.getElementById('gallery-admin-table');
  showLoading(container);
  try {
    const photos = await Gallery.list({ limit: 50 });
    if (!photos?.length) { showEmpty(container, 'Нет фотографий'); return; }
    container.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Превью</th><th>Название</th><th>Гонка</th><th style="width:100px;"></th></tr></thead>
          <tbody>
            ${photos.map(p => `
              <tr>
                <td style="width:64px;">${p.image_url ? `<img src="${escapeHtml(p.image_url)}" style="width:56px;height:36px;object-fit:cover;border-radius:4px;" onerror="this.style.display='none'">` : '—'}</td>
                <td>${escapeHtml(p.title || '—')}</td>
                <td class="muted" style="font-size:.8rem;">${escapeHtml(p.race?.name || '—')}</td>
                <td>
                  <div style="display:flex;gap:6px;">
                    <button class="btn btn-ghost btn-sm" onclick="openImageForm(${JSON.stringify(p).replace(/"/g,'&quot;')})">✎</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteImage(${p.id})">✕</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) { showError(container, err.message); }
}

function openImageForm(photo = null) {
  openAdminModal(photo ? 'Редактировать фото' : 'Добавить фото', `
    <div class="form-group"><label class="form-label">Название</label>
      <input type="text" class="form-control" id="p-title" value="${escapeHtml(photo?.title || '')}">
    </div>
    <div class="form-group"><label class="form-label">URL изображения</label>
      <input type="text" class="form-control" id="p-url" value="${escapeHtml(photo?.image_url || '')}">
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">ID гонки</label>
        <input type="number" class="form-control" id="p-race-id" value="${photo?.race_id || ''}">
      </div>
      <div class="form-group"><label class="form-label">ID гонщика</label>
        <input type="number" class="form-control" id="p-driver-id" value="${photo?.driver_id || ''}">
      </div>
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px;">
      <button class="btn btn-ghost" onclick="closeAdminModal()">Отмена</button>
      <button class="btn btn-primary" onclick="saveImage(${photo?.id || 'null'})">Сохранить</button>
    </div>
  `);
}

async function saveImage(photoId) {
  const data = {
    title:     document.getElementById('p-title')?.value || '',
    image_url: document.getElementById('p-url')?.value || '',
    race_id:   parseInt(document.getElementById('p-race-id')?.value) || null,
    driver_id: parseInt(document.getElementById('p-driver-id')?.value) || null,
  };
  try {
    if (photoId) await Admin.updateImage(photoId, data);
    else         await Admin.createImage(data);
    closeAdminModal();
    showToast('Фото сохранено', 'success');
    await loadAdminGallery();
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteImage(id) {
  if (!confirm('Удалить фото?')) return;
  try { await Admin.deleteImage(id); showToast('Удалено', 'success'); await loadAdminGallery(); }
  catch (err) { showToast(err.message, 'error'); }
}

// ============================================
// SEASONS ADMIN
// ============================================

async function loadAdminSeasons() {
  const container = document.getElementById('seasons-admin-table');
  showLoading(container);
  try {
    const seasons = await Seasons.list();
    container.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Год</th><th>Активный</th><th style="width:80px;"></th></tr></thead>
          <tbody>
            ${(seasons || []).sort((a, b) => b.year - a.year).map(s => `
              <tr>
                <td><strong>${s.year}</strong></td>
                <td>${s.is_active ? '<span class="badge badge-teal">Да</span>' : '<span class="badge badge-silver">Нет</span>'}</td>
                <td><button class="btn btn-danger btn-sm" onclick="deleteSeason(${s.id})">✕</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) { showError(container, err.message); }
}

function openSeasonForm() {
  openAdminModal('Добавить сезон', `
    <div class="form-group"><label class="form-label">Год</label>
      <input type="number" class="form-control" id="s-year" placeholder="${new Date().getFullYear()}">
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end;">
      <button class="btn btn-ghost" onclick="closeAdminModal()">Отмена</button>
      <button class="btn btn-primary" onclick="saveSeason()">Создать</button>
    </div>
  `);
}

async function saveSeason() {
  const year = parseInt(document.getElementById('s-year')?.value);
  if (!year) { showToast('Укажите год', 'warning'); return; }
  try {
    await Admin.createSeason({ year });
    closeAdminModal();
    showToast('Сезон добавлен', 'success');
    await loadAdminSeasons();
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteSeason(id) {
  if (!confirm('Удалить сезон и все связанные данные?')) return;
  try { await Admin.deleteSeason(id); showToast('Удалено', 'success'); await loadAdminSeasons(); }
  catch (err) { showToast(err.message, 'error'); }
}

// ============================================
// DRIVERS ADMIN
// ============================================

async function loadAdminDrivers() {
  const container = document.getElementById('drivers-admin-table');
  showLoading(container);
  try {
    const season = SeasonState.get();
    const drivers = await Drivers.list(season);
    container.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead><tr><th>#</th><th>Гонщик</th><th>Команда</th><th>Статус</th><th style="width:80px;"></th></tr></thead>
          <tbody>
            ${(drivers || []).map(d => `
              <tr>
                <td class="muted">${d.driver_number || '—'}</td>
                <td>${escapeHtml(d.first_name + ' ' + d.last_name)}</td>
                <td class="muted" style="font-size:.82rem;">${escapeHtml(d.team?.name || d.constructor?.name || '—')}</td>
                <td>${getDriverStatusBadge(d.status)}</td>
                <td><button class="btn btn-danger btn-sm" onclick="deleteDriver(${d.id})">✕</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) { showError(container, err.message); }
}

function openDriverForm() {
  openAdminModal('Добавить гонщика', `
    <div class="form-row">
      <div class="form-group"><label class="form-label">Имя</label><input type="text" class="form-control" id="d-first"></div>
      <div class="form-group"><label class="form-label">Фамилия</label><input type="text" class="form-control" id="d-last"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Номер</label><input type="number" class="form-control" id="d-num"></div>
      <div class="form-group"><label class="form-label">Национальность</label><input type="text" class="form-control" id="d-nat"></div>
    </div>
    <div class="form-group"><label class="form-label">URL фото</label><input type="text" class="form-control" id="d-photo"></div>
    <div style="display:flex;gap:10px;justify-content:flex-end;">
      <button class="btn btn-ghost" onclick="closeAdminModal()">Отмена</button>
      <button class="btn btn-primary" onclick="saveDriver()">Создать</button>
    </div>
  `);
}

async function saveDriver() {
  const data = {
    first_name:    document.getElementById('d-first')?.value || '',
    last_name:     document.getElementById('d-last')?.value || '',
    driver_number: parseInt(document.getElementById('d-num')?.value) || null,
    nationality:   document.getElementById('d-nat')?.value || '',
    photo_url:     document.getElementById('d-photo')?.value || '',
  };
  try {
    await Admin.createDriver(data);
    closeAdminModal();
    showToast('Гонщик добавлен', 'success');
    await loadAdminDrivers();
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteDriver(id) {
  if (!confirm('Удалить гонщика?')) return;
  try { await Admin.deleteDriver(id); showToast('Удалено', 'success'); await loadAdminDrivers(); }
  catch (err) { showToast(err.message, 'error'); }
}

// ============================================
// CONSTRUCTORS ADMIN
// ============================================

async function loadAdminConstructors() {
  const container = document.getElementById('constructors-admin-table');
  showLoading(container);
  try {
    const season = SeasonState.get();
    const constructors = await Constructors.list(season);
    container.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Команда</th><th>Страна</th><th>Болид</th><th style="width:80px;"></th></tr></thead>
          <tbody>
            ${(constructors || []).map(c => `
              <tr>
                <td>${escapeHtml(c.name || '—')}</td>
                <td class="muted">${escapeHtml(c.nationality || '—')}</td>
                <td class="muted" style="font-size:.82rem;">${escapeHtml(c.car_name || '—')}</td>
                <td><button class="btn btn-danger btn-sm" onclick="deleteConstructor(${c.id})">✕</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) { showError(container, err.message); }
}

function openConstructorForm() {
  openAdminModal('Добавить команду', `
    <div class="form-group"><label class="form-label">Название</label><input type="text" class="form-control" id="c-name"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Страна</label><input type="text" class="form-control" id="c-nat"></div>
      <div class="form-group"><label class="form-label">Болид</label><input type="text" class="form-control" id="c-car"></div>
    </div>
    <div class="form-group"><label class="form-label">URL логотипа</label><input type="text" class="form-control" id="c-logo"></div>
    <div style="display:flex;gap:10px;justify-content:flex-end;">
      <button class="btn btn-ghost" onclick="closeAdminModal()">Отмена</button>
      <button class="btn btn-primary" onclick="saveConstructor()">Создать</button>
    </div>
  `);
}

async function saveConstructor() {
  const data = {
    name:        document.getElementById('c-name')?.value || '',
    nationality: document.getElementById('c-nat')?.value || '',
    car_name:    document.getElementById('c-car')?.value || '',
    logo_url:    document.getElementById('c-logo')?.value || '',
  };
  try {
    await Admin.createConstructor(data);
    closeAdminModal();
    showToast('Команда добавлена', 'success');
    await loadAdminConstructors();
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteConstructor(id) {
  if (!confirm('Удалить команду?')) return;
  try { await Admin.deleteConstructor(id); showToast('Удалено', 'success'); await loadAdminConstructors(); }
  catch (err) { showToast(err.message, 'error'); }
}

// ============================================
// MODAL HELPERS
// ============================================

function openAdminModal(title, bodyHtml) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  const overlay = document.getElementById('admin-modal-overlay');
  overlay.style.display = 'flex';
}

function closeAdminModal() {
  document.getElementById('admin-modal-overlay').style.display = 'none';
}

document.getElementById('admin-modal-overlay')?.addEventListener('click', function(e) {
  if (e.target === this) closeAdminModal();
});

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAdminModal(); });

document.addEventListener('DOMContentLoaded', initAdminPage);
