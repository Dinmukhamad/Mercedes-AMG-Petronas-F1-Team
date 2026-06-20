/**
 * videos.js — страница видео
 */

let _allVideos = [];
let _filteredVideos = [];
const PAGE_SIZE = 12;
let _currentPage = 0;

const VIDEO_TYPE_LABELS = {
  race_review: 'Обзор гонки',
  highlights:  'Хайлайты',
  qualifying:  'Квалификация',
  fp:          'Практика',
  interview:   'Интервью',
  onboard:     'Onboard',
  press_conference: 'Пресс-конф.',
  tech_review: 'Тех. разбор',
};

async function initVideosPage() {
  await loadVideos(SeasonState.get());
  initFilters();
  initLoadMore();
  window.addEventListener('seasonChanged', ({ detail }) => loadVideos(detail.year));
}

async function loadVideos(season) {
  const grid = document.getElementById('video-grid');
  showLoading(grid);
  _currentPage = 0;

  try {
    _allVideos = await Videos.list({ season });
    populateRaceFilter(_allVideos);
    applyFilters();
  } catch (err) {
    showError(grid, err.message);
  }
}

function renderVideos(videos, append = false) {
  const grid = document.getElementById('video-grid');

  if (!videos?.length && !append) {
    showEmpty(grid, 'Видео не найдено', 'Попробуйте изменить фильтры', '▶');
    document.getElementById('load-more-wrap').style.display = 'none';
    return;
  }

  const page = videos.slice(_currentPage * PAGE_SIZE, (_currentPage + 1) * PAGE_SIZE);

  if (!append) {
    grid.innerHTML = '';
  }

  if (!page.length && !append) {
    showEmpty(grid, 'Видео не найдено', 'Попробуйте изменить фильтры', '▶');
    return;
  }

  page.forEach(v => {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.onclick = () => openVideo(v);

    const thumb = v.thumbnail_url
      ? `<img src="${escapeHtml(v.thumbnail_url)}" alt="${escapeHtml(v.title)}" loading="lazy" onerror="this.parentElement.innerHTML='<div style=width:100%;height:100%;background:var(--bg-graphite);display:flex;align-items:center;justify-content:center;font-size:2rem>▶</div>'">`
      : `<div style="width:100%;height:100%;background:var(--bg-graphite);display:flex;align-items:center;justify-content:center;font-size:2rem;">▶</div>`;

    const typeLabel = VIDEO_TYPE_LABELS[v.type] || v.type || 'Видео';

    card.innerHTML = `
      <div class="video-thumb">
        ${thumb}
        <div class="video-play-btn">▶</div>
      </div>
      <div class="video-body">
        <div class="video-type-badge"><span class="badge badge-teal">${escapeHtml(typeLabel)}</span></div>
        <div class="video-title">${escapeHtml(v.title || '—')}</div>
        <div class="video-meta">
          ${v.race?.name ? `<span>${escapeHtml(v.race.name)}</span>` : ''}
          ${v.published_at ? `<span>${v.race?.name ? '·' : ''} ${formatDateShort(v.published_at)}</span>` : ''}
          ${v.source ? `<span>· ${escapeHtml(v.source)}</span>` : ''}
        </div>
      </div>
    `;

    grid.appendChild(card);
  });

  // Load more button
  const hasMore = (_currentPage + 1) * PAGE_SIZE < videos.length;
  const wrap = document.getElementById('load-more-wrap');
  wrap.style.display = hasMore ? 'block' : 'none';
}

function updateCount(total) {
  const el = document.getElementById('video-count');
  if (el) el.textContent = total ? `Найдено видео: ${total}` : '';
}

function applyFilters() {
  const query  = document.getElementById('search-video')?.value.toLowerCase() || '';
  const type   = document.getElementById('filter-type')?.value || '';
  const raceId = document.getElementById('filter-race')?.value || '';

  _filteredVideos = _allVideos.filter(v => {
    if (query && !v.title?.toLowerCase().includes(query)) return false;
    if (type && v.type !== type) return false;
    if (raceId && String(v.race_id) !== raceId) return false;
    return true;
  });

  _currentPage = 0;
  updateCount(_filteredVideos.length);
  renderVideos(_filteredVideos);
}

function populateRaceFilter(videos) {
  const sel = document.getElementById('filter-race');
  if (!sel) return;
  const races = {};
  videos.forEach(v => {
    if (v.race_id && v.race?.name) races[v.race_id] = v.race.name;
  });
  const existing = sel.innerHTML;
  sel.innerHTML = '<option value="">Все гонки</option>' +
    Object.entries(races).map(([id, name]) => `<option value="${id}">${escapeHtml(name)}</option>`).join('');
}

function initFilters() {
  ['search-video', 'filter-type', 'filter-race'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', applyFilters);
    document.getElementById(id)?.addEventListener('change', applyFilters);
  });
}

function initLoadMore() {
  document.getElementById('load-more-btn')?.addEventListener('click', () => {
    _currentPage++;
    renderVideos(_filteredVideos, true);
  });
}

// Video modal
function openVideo(video) {
  const overlay = document.getElementById('video-modal-overlay');
  const iframe  = document.getElementById('video-modal-iframe');
  const title   = document.getElementById('video-modal-title');

  if (video.embed_url) {
    iframe.src = video.embed_url;
    title.textContent = video.title || '';
    overlay.classList.add('open');
  } else if (video.video_url) {
    window.open(video.video_url, '_blank');
  }
}

function closeModal() {
  const overlay = document.getElementById('video-modal-overlay');
  overlay?.classList.remove('open');
  const iframe = document.getElementById('video-modal-iframe');
  if (iframe) iframe.src = '';
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

document.addEventListener('DOMContentLoaded', initVideosPage);
