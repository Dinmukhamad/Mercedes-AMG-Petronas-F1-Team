/**
 * main-page.js — логика главной страницы
 */

async function loadHomeData() {
  const season = SeasonState.get();

  // Обновляем отображение сезона в стате
  document.getElementById('stat-season').textContent = season;

  try {
    const data = await Home.get(season);
    renderHomeData(data, season);
  } catch (err) {
    console.error('Ошибка быстрой загрузки главной:', err);
    await Promise.allSettled([
      loadOverviewStats(season),
      loadPodium(season),
      loadFeaturedRace(season),
      loadLatestVideos(season),
      loadLatestPhotos(season),
    ]);
  }
}

function renderHomeData(data, season) {
  const races = data?.races || [];
  const topDrivers = data?.top_drivers || [];
  const topConstructors = data?.top_constructors || [];
  const latestVideos = data?.latest_videos || [];
  const latestPhotos = data?.latest_photos || [];
  const stats = data?.stats || {};

  document.getElementById('stat-season').textContent = season;
  document.getElementById('stat-races').textContent = stats.races_count ?? races.length ?? '—';
  document.getElementById('stat-drivers').textContent = stats.drivers_count ?? '—';
  document.getElementById('stat-constructors').textContent = stats.constructors_count ?? '—';

  if (topDrivers.length) {
    const leader = topDrivers[0];
    document.getElementById('stat-leader').textContent = getDriverLastName(leader, '—');
    document.getElementById('stat-leader-pts').textContent = `${leader.points} очков`;
  }

  if (topConstructors.length) {
    const team = topConstructors[0];
    document.getElementById('stat-team-leader').textContent = getConstructorName(team, '—');
    document.getElementById('stat-team-pts').textContent = `${team.points} очков`;
  }

  if (races.length) {
    const now = new Date();
    const upcoming = races.filter(r => r.status === 'upcoming' && new Date(r.race_date) > now);
    const featured = upcoming.length ? upcoming[0] : races[races.length - 1];
    if (featured) {
      document.getElementById('stat-next-race').textContent = featured.name;
      document.getElementById('stat-next-date').textContent = formatDateShort(featured.race_date);
      renderFeaturedRace(featured);
    }
  } else {
    showEmpty(document.getElementById('featured-race'), 'Гонки не найдены');
  }

  const podiumContainer = document.getElementById('podium-container');
  if (topDrivers.length) {
    renderPodium(podiumContainer, topDrivers);
    renderTopDriversChart('chart-top-drivers', topDrivers);
  } else {
    showEmpty(podiumContainer, 'Нет данных', 'Таблица ещё не сформирована');
  }
  if (topConstructors.length) {
    renderConstructorsChart('chart-constructors', topConstructors);
  }

  const videosContainer = document.getElementById('latest-videos');
  if (latestVideos.length) {
    videosContainer.innerHTML = latestVideos.slice(0, 4).map(v => renderVideoCard(v)).join('');
  } else {
    showEmpty(videosContainer, 'Видео не добавлены', '', '▶');
  }

  const photosContainer = document.getElementById('latest-photos');
  if (latestPhotos.length) {
    photosContainer.innerHTML = latestPhotos.slice(0, 6).map(p => `
      <div class="gallery-item" onclick="openLightbox('${escapeHtml(p.image_url)}', '${escapeHtml(p.title || '')}')">
        <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.title || '')}" loading="lazy">
        <div class="gallery-overlay">
          <div class="gallery-caption">${escapeHtml(p.title || '')}</div>
        </div>
      </div>
    `).join('');
  } else {
    showEmpty(photosContainer, 'Фото не добавлены', '', '📷');
  }
}

function renderFeaturedRace(race) {
  const container = document.getElementById('featured-race');
  if (!container) return;

  container.innerHTML = `
    <div class="card" style="display:grid;grid-template-columns:1fr auto;gap:24px;align-items:start;">
      <div>
        <div class="race-round">Этап ${race.round}</div>
        <h3 style="font-family:var(--font-display);font-size:1.6rem;font-weight:800;text-transform:uppercase;margin-bottom:8px;">${escapeHtml(race.name)}</h3>
        <div style="display:flex;align-items:center;gap:16px;color:var(--text-secondary);font-size:.85rem;margin-bottom:16px;flex-wrap:wrap;">
          <span>📍 ${escapeHtml(race.city || '')}${race.country ? ', ' + race.country : ''}</span>
          <span>🏟 ${escapeHtml(race.circuit_name || '')}</span>
          <span>📅 ${formatDate(race.race_date)}</span>
          ${race.race_date ? `<span>🕐 ${formatTime(race.race_date)}</span>` : ''}
        </div>
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
          ${getRaceStatusBadge(race.status)}
          <a href="/race-detail.html?id=${race.id}" class="btn btn-primary btn-sm">Подробнее →</a>
        </div>
      </div>
      <div style="text-align:right;min-width:120px;">
        ${race.status === 'upcoming'
          ? `<div style="font-family:var(--font-display);font-size:2rem;font-weight:800;color:var(--teal);line-height:1;">${formatDate(race.race_date, {day:'2-digit',month:'short'})}</div><div style="font-size:.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em;">Дата гонки</div>`
          : `<div style="font-size:.8rem;color:var(--text-muted);">Статус</div>`
        }
      </div>
    </div>
  `;
}

async function loadOverviewStats(season) {
  try {
    const [driverStandings, constructorStandings, races, drivers, constructors] = await Promise.all([
      Standings.topDrivers(season, 1),
      Standings.topConstructors(season, 1),
      Races.list(season),
      Drivers.list(season),
      Constructors.list(season),
    ]);

    document.getElementById('stat-races').textContent        = races?.length ?? '—';
    document.getElementById('stat-drivers').textContent      = drivers?.length ?? '—';
    document.getElementById('stat-constructors').textContent = constructors?.length ?? '—';

    if (driverStandings?.length) {
      const leader = driverStandings[0];
      const name = getDriverLastName(leader, '—');
      document.getElementById('stat-leader').textContent     = name;
      document.getElementById('stat-leader-pts').textContent = `${leader.points} очков`;
    }

    if (constructorStandings?.length) {
      const team = constructorStandings[0];
      const name = getConstructorName(team, '—');
      document.getElementById('stat-team-leader').textContent = name;
      document.getElementById('stat-team-pts').textContent    = `${team.points} очков`;
    }

    if (races?.length) {
      const now = new Date();
      const upcoming = races.filter(r => r.status === 'upcoming' && new Date(r.race_date) > now);
      const featured = upcoming.length ? upcoming[0] : races[races.length - 1];
      if (featured) {
        document.getElementById('stat-next-race').textContent = featured.name;
        document.getElementById('stat-next-date').textContent = formatDateShort(featured.race_date);
      }
    }
  } catch (err) {
    console.error('Ошибка статистики:', err);
  }
}

async function loadPodium(season) {
  const container = document.getElementById('podium-container');
  try {
    const [topDrivers, topConstructors] = await Promise.all([
      Standings.topDrivers(season, 3),
      Standings.topConstructors(season),
    ]);

    if (!topDrivers?.length) {
      showEmpty(container, 'Нет данных', 'Таблица ещё не сформирована');
      return;
    }

    renderPodium(container, topDrivers);
    renderTopDriversChart('chart-top-drivers', topDrivers);
    if (topConstructors?.length) renderConstructorsChart('chart-constructors', topConstructors);
  } catch (err) {
    showError(container, err.message);
  }
}

function renderPodium(container, drivers) {
  const rankClass = ['p1', 'p2', 'p3'];
  const ordered   = [drivers[1], drivers[0], drivers[2]].filter(Boolean); // 2-1-3 layout

  container.innerHTML = `
    <div class="podium-row">
      ${ordered.map((d, i) => {
        const realPos = d.position;
        const cls = rankClass[realPos - 1] || '';
        const name   = getDriverName(d, '—');
        const team   = getConstructorName(d, '—');
        const photo  = d.driver?.photo_url || '';
        return `
          <div class="podium-card ${cls} animate-in animate-in-delay-${i+1}">
            <div class="podium-rank">${realPos}</div>
            ${photo
              ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(name)}" class="podium-photo" onerror="this.style.display='none'">`
              : `<div class="podium-photo" style="display:flex;align-items:center;justify-content:center;background:var(--bg-graphite);font-family:var(--font-display);font-weight:700;font-size:1.4rem;color:var(--teal);">${name.charAt(0)}</div>`
            }
            <div class="podium-name">${escapeHtml(name)}</div>
            <div class="podium-team">${escapeHtml(team)}</div>
            <div class="podium-points">${d.points} <span>очков</span></div>
            <div style="margin-top:8px;font-size:.75rem;color:var(--text-muted);">${d.wins || 0} побед · ${d.podiums || 0} подиумов</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

async function loadFeaturedRace(season) {
  const container = document.getElementById('featured-race');
  try {
    const races = await Races.list(season);
    if (!races?.length) { showEmpty(container, 'Гонки не найдены'); return; }

    const now = new Date();
    const upcoming = races.filter(r => r.status === 'upcoming' && new Date(r.race_date) > now);
    const race = upcoming.length ? upcoming[0] : [...races].sort((a, b) => new Date(b.race_date) - new Date(a.race_date)).find(r => r.status === 'finished') || races[0];

    container.innerHTML = `
      <div class="card" style="display:grid;grid-template-columns:1fr auto;gap:24px;align-items:start;">
        <div>
          <div class="race-round">Этап ${race.round}</div>
          <h3 style="font-family:var(--font-display);font-size:1.6rem;font-weight:800;text-transform:uppercase;margin-bottom:8px;">${escapeHtml(race.name)}</h3>
          <div style="display:flex;align-items:center;gap:16px;color:var(--text-secondary);font-size:.85rem;margin-bottom:16px;flex-wrap:wrap;">
            <span>📍 ${escapeHtml(race.city || '')}${race.country ? ', ' + race.country : ''}</span>
            <span>🏟 ${escapeHtml(race.circuit_name || '')}</span>
            <span>📅 ${formatDate(race.race_date)}</span>
            ${race.race_date ? `<span>🕐 ${formatTime(race.race_date)}</span>` : ''}
          </div>
          <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
            ${getRaceStatusBadge(race.status)}
            <a href="/race-detail.html?id=${race.id}" class="btn btn-primary btn-sm">Подробнее →</a>
          </div>
        </div>
        <div style="text-align:right;min-width:120px;">
          ${race.status === 'upcoming'
            ? `<div style="font-family:var(--font-display);font-size:2rem;font-weight:800;color:var(--teal);line-height:1;">${formatDate(race.race_date, {day:'2-digit',month:'short'})}</div><div style="font-size:.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em;">Дата гонки</div>`
            : `<div style="font-size:.8rem;color:var(--text-muted);">Статус</div>`
          }
        </div>
      </div>
    `;
  } catch (err) {
    showError(container, err.message);
  }
}

async function loadLatestVideos(season) {
  const container = document.getElementById('latest-videos');
  try {
    const videos = await Videos.list({ season, limit: 4 });
    if (!videos?.length) { showEmpty(container, 'Видео не добавлены', '', '▶'); return; }

    container.innerHTML = videos.slice(0, 4).map(v => renderVideoCard(v)).join('');
  } catch (err) {
    showError(container, err.message);
  }
}

function renderVideoCard(v) {
  const thumb = v.thumbnail_url ? `<img src="${escapeHtml(v.thumbnail_url)}" alt="${escapeHtml(v.title)}" loading="lazy">` : `<div style="width:100%;height:100%;background:var(--bg-graphite);display:flex;align-items:center;justify-content:center;font-size:2rem;">▶</div>`;
  const typeLabels = {
    race_review: 'Обзор гонки', highlights: 'Хайлайты', fp: 'Практика',
    qualifying: 'Квалификация', interview: 'Интервью', onboard: 'Onboard',
    press_conference: 'Пресс-конф.', tech_review: 'Технический разбор',
  };
  const typeLabel = typeLabels[v.type] || v.type || 'Видео';

  return `
    <div class="video-card" onclick="openVideo(${JSON.stringify(v).replace(/"/g, '&quot;')})">
      <div class="video-thumb">
        ${thumb}
        <div class="video-play-btn">▶</div>
      </div>
      <div class="video-body">
        <div class="video-type-badge"><span class="badge badge-teal">${escapeHtml(typeLabel)}</span></div>
        <div class="video-title">${escapeHtml(v.title)}</div>
        <div class="video-meta">
          <span>${v.published_at ? formatDateShort(v.published_at) : ''}</span>
          ${v.source ? `<span>· ${escapeHtml(v.source)}</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

function openVideo(video) {
  const overlay = document.getElementById('video-modal-overlay');
  const iframe  = document.getElementById('video-modal-iframe');
  const title   = document.getElementById('video-modal-title');
  if (!overlay) return;

  if (video.embed_url) {
    iframe.src = video.embed_url;
    title.textContent = video.title;
    overlay.classList.add('open');
  } else if (video.video_url) {
    window.open(video.video_url, '_blank');
  }
}

function closeVideoModal(event) {
  const overlay = document.getElementById('video-modal-overlay');
  if (!event || event.target === overlay || event.currentTarget === overlay) {
    overlay?.classList.remove('open');
    const iframe = document.getElementById('video-modal-iframe');
    if (iframe) iframe.src = '';
  }
}

async function loadLatestPhotos(season) {
  const container = document.getElementById('latest-photos');
  try {
    const photos = await Gallery.list({ season, limit: 6 });
    if (!photos?.length) { showEmpty(container, 'Фото не добавлены', '', '📷'); return; }

    container.innerHTML = photos.slice(0, 6).map(p => `
      <div class="gallery-item" onclick="openLightbox('${escapeHtml(p.image_url)}', '${escapeHtml(p.title || '')}')">
        <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.title || '')}" loading="lazy">
        <div class="gallery-overlay">
          <div class="gallery-caption">${escapeHtml(p.title || '')}</div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    showError(container, err.message);
  }
}

function openLightbox(src, caption) {
  let overlay = document.getElementById('lightbox-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'lightbox-overlay';
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = `
      <span class="lightbox-close" onclick="closeLightbox()">✕</span>
      <img class="lightbox-img" id="lightbox-img" src="" alt="">
      <div class="lightbox-info" id="lightbox-info"></div>
    `;
    overlay.addEventListener('click', e => { if (e.target === overlay) closeLightbox(); });
    document.body.appendChild(overlay);
  }
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox-info').textContent = caption;
  overlay.classList.add('open');
}

function closeLightbox() {
  document.getElementById('lightbox-overlay')?.classList.remove('open');
}

// Keyboard: Escape closes modals
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeLightbox();
    closeVideoModal();
  }
});

// React to season change
window.addEventListener('seasonChanged', ({ detail }) => {
  loadHomeData();
});

document.addEventListener('DOMContentLoaded', () => {
  loadHomeData();
});
