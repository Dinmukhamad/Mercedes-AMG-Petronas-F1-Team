/**
 * charts.js — все графики через Chart.js
 * Цвета: teal / silver / gold / graphite
 */

// Глобальные дефолты для Chart.js
function applyChartDefaults() {
  if (typeof Chart === 'undefined') return;

  Chart.defaults.color = '#8E9A9E';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.plugins.legend.labels.color = '#8E9A9E';
  Chart.defaults.plugins.legend.labels.padding = 16;
  Chart.defaults.plugins.tooltip.backgroundColor = '#11181A';
  Chart.defaults.plugins.tooltip.borderColor = 'rgba(167,176,181,0.15)';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.titleColor = '#F2F5F5';
  Chart.defaults.plugins.tooltip.bodyColor = '#8E9A9E';
  Chart.defaults.plugins.tooltip.padding = 12;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
  Chart.defaults.scale.grid.color = 'rgba(167,176,181,0.07)';
  Chart.defaults.scale.ticks.color = '#556066';
}

const CHART_COLORS = {
  teal:    '#00D2BE',
  tealBg:  'rgba(0, 210, 190, 0.12)',
  tealLine:'rgba(0, 210, 190, 0.6)',
  gold:    '#D9B85F',
  goldBg:  'rgba(217, 184, 95, 0.12)',
  silver:  '#A7B0B5',
  silverBg:'rgba(167, 176, 181, 0.1)',
  bronze:  '#CD7F32',
  bronzeBg:'rgba(205, 127, 50, 0.1)',
  p4:      '#637075',
  p4Bg:    'rgba(99, 112, 117, 0.1)',
  p5:      '#3D4E54',
  p5Bg:    'rgba(61, 78, 84, 0.1)',
};

const PODIUM_COLORS = [
  { border: CHART_COLORS.gold,   bg: CHART_COLORS.goldBg },
  { border: CHART_COLORS.silver, bg: CHART_COLORS.silverBg },
  { border: CHART_COLORS.bronze, bg: CHART_COLORS.bronzeBg },
  { border: CHART_COLORS.p4,     bg: CHART_COLORS.p4Bg },
  { border: CHART_COLORS.p5,     bg: CHART_COLORS.p5Bg },
];

function getColorForIndex(i) {
  const colors = [
    CHART_COLORS.teal, CHART_COLORS.gold, CHART_COLORS.silver,
    CHART_COLORS.bronze, '#4BFFE8', '#6C8EAD', '#9D8EC4', '#7EBDA5',
  ];
  return colors[i % colors.length];
}

function destroyChart(canvasId) {
  const existing = Chart.getChart(canvasId);
  if (existing) existing.destroy();
}

// ============================================
// 1. ТОП-3 ГОНЩИКОВ — горизонтальные бары
// ============================================

function renderTopDriversChart(canvasId, drivers) {
  applyChartDefaults();
  destroyChart(canvasId);

  const canvas = document.getElementById(canvasId);
  if (!canvas || !drivers?.length) return;

  const labels = drivers.map(d => d.driver?.last_name || d.full_name || 'N/A');
  const points = drivers.map(d => parseFloat(d.points) || 0);

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Очки',
        data: points,
        backgroundColor: drivers.map((_, i) => PODIUM_COLORS[i]?.bg || CHART_COLORS.tealBg),
        borderColor:     drivers.map((_, i) => PODIUM_COLORS[i]?.border || CHART_COLORS.teal),
        borderWidth: 1.5,
        borderRadius: 4,
        borderSkipped: false,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.raw} очков`,
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: 'rgba(167,176,181,0.06)' },
        },
        y: {
          grid: { display: false },
          ticks: { color: '#F2F5F5', font: { weight: '600' } },
        },
      },
    },
  });
}

// ============================================
// 2. СРАВНЕНИЕ ОЧКОВ КОМАНД — вертикальные бары
// ============================================

function renderConstructorsChart(canvasId, constructors) {
  applyChartDefaults();
  destroyChart(canvasId);

  const canvas = document.getElementById(canvasId);
  if (!canvas || !constructors?.length) return;

  const labels = constructors.map(c => c.constructor?.name || c.name || 'N/A');
  const points = constructors.map(c => parseFloat(c.points) || 0);

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Очки',
        data: points,
        backgroundColor: constructors.map((_, i) => getColorForIndex(i) + '22'),
        borderColor:     constructors.map((_, i) => getColorForIndex(i)),
        borderWidth: 1.5,
        borderRadius: 4,
        borderSkipped: 'bottom',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(167,176,181,0.06)' } },
        x: { grid: { display: false }, ticks: { maxRotation: 30, font: { size: 11 } } },
      },
    },
  });
}

// ============================================
// 3. ДИНАМИКА ОЧКОВ ГОНЩИКА — линия
// ============================================

function renderDriverPointsChart(canvasId, raceResults) {
  applyChartDefaults();
  destroyChart(canvasId);

  const canvas = document.getElementById(canvasId);
  if (!canvas || !raceResults?.length) return;

  let cumulative = 0;
  const labels  = raceResults.map(r => r.race?.name || `Этап ${r.round}`);
  const data    = raceResults.map(r => { cumulative += (parseFloat(r.points) || 0); return cumulative; });
  const perRace = raceResults.map(r => parseFloat(r.points) || 0);

  new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Очки (накопленные)',
          data,
          borderColor: CHART_COLORS.teal,
          backgroundColor: CHART_COLORS.tealBg,
          fill: true,
          tension: 0.3,
          pointBackgroundColor: CHART_COLORS.teal,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: 'Очки за гонку',
          data: perRace,
          borderColor: CHART_COLORS.gold,
          backgroundColor: 'transparent',
          tension: 0.3,
          borderDash: [4, 4],
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'top' } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(167,176,181,0.06)' } },
        x: { grid: { display: false }, ticks: { maxRotation: 30, font: { size: 10 } } },
      },
    },
  });
}

// ============================================
// 4. ПОЗИЦИИ ГОНЩИКА ПО ГОНКАМ — линия
// ============================================

function renderDriverPositionsChart(canvasId, raceResults) {
  applyChartDefaults();
  destroyChart(canvasId);

  const canvas = document.getElementById(canvasId);
  if (!canvas || !raceResults?.length) return;

  const labels    = raceResults.map(r => r.race?.name || `Этап ${r.round}`);
  const positions = raceResults.map(r => r.position || null);
  const grids     = raceResults.map(r => r.grid_position || null);

  new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Финиш',
          data: positions,
          borderColor: CHART_COLORS.teal,
          backgroundColor: 'transparent',
          tension: 0.2,
          pointRadius: 4,
          spanGaps: true,
        },
        {
          label: 'Старт',
          data: grids,
          borderColor: CHART_COLORS.silver,
          backgroundColor: 'transparent',
          borderDash: [4, 4],
          tension: 0.2,
          pointRadius: 3,
          spanGaps: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'top' } },
      scales: {
        y: {
          reverse: true,
          min: 1,
          ticks: { stepSize: 1 },
          grid: { color: 'rgba(167,176,181,0.06)' },
        },
        x: { grid: { display: false }, ticks: { maxRotation: 30, font: { size: 10 } } },
      },
    },
  });
}

// ============================================
// 5. ДИНАМИКА ОЧКОВ КОМАНДЫ — линия
// ============================================

function renderConstructorPointsChart(canvasId, raceData) {
  applyChartDefaults();
  destroyChart(canvasId);

  const canvas = document.getElementById(canvasId);
  if (!canvas || !raceData?.length) return;

  let cum = 0;
  const labels = raceData.map(r => r.race?.name || `Этап ${r.round}`);
  const data   = raceData.map(r => { cum += (parseFloat(r.points) || 0); return cum; });

  new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Очки команды',
        data,
        borderColor: CHART_COLORS.teal,
        backgroundColor: CHART_COLORS.tealBg,
        fill: true,
        tension: 0.3,
        pointRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(167,176,181,0.06)' } },
        x: { grid: { display: false }, ticks: { maxRotation: 30, font: { size: 10 } } },
      },
    },
  });
}

// ============================================
// 6. СРАВНЕНИЕ ДВУХ ПИЛОТОВ КОМАНДЫ — бары
// ============================================

function renderTeammatesChart(canvasId, driver1, driver2, labels, data1, data2) {
  applyChartDefaults();
  destroyChart(canvasId);

  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: driver1,
          data: data1,
          backgroundColor: CHART_COLORS.tealBg,
          borderColor: CHART_COLORS.teal,
          borderWidth: 1.5,
          borderRadius: 3,
        },
        {
          label: driver2,
          data: data2,
          backgroundColor: CHART_COLORS.goldBg,
          borderColor: CHART_COLORS.gold,
          borderWidth: 1.5,
          borderRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'top' } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(167,176,181,0.06)' } },
        x: { grid: { display: false } },
      },
    },
  });
}

// ============================================
// 7. РАСПРЕДЕЛЕНИЕ ОЧКОВ В ГОНКЕ — пончик
// ============================================

function renderRacePointsChart(canvasId, results) {
  applyChartDefaults();
  destroyChart(canvasId);

  const canvas = document.getElementById(canvasId);
  if (!canvas || !results?.length) return;

  const filtered = results.filter(r => parseFloat(r.points) > 0);
  const labels = filtered.map(r => r.driver?.last_name || 'N/A');
  const data   = filtered.map(r => parseFloat(r.points));

  new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: filtered.map((_, i) => getColorForIndex(i) + 'AA'),
        borderColor:     filtered.map((_, i) => getColorForIndex(i)),
        borderWidth: 1.5,
        hoverOffset: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { font: { size: 11 }, padding: 10 } },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.raw} очков`,
          },
        },
      },
    },
  });
}

// ============================================
// 8. ПОДИУМЫ ГОНЩИКОВ — горизонтальные бары
// ============================================

function renderPodiumsChart(canvasId, standings) {
  applyChartDefaults();
  destroyChart(canvasId);

  const canvas = document.getElementById(canvasId);
  if (!canvas || !standings?.length) return;

  const top10 = standings.slice(0, 10);
  const labels = top10.map(d => d.driver?.last_name || 'N/A');

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Победы',
          data: top10.map(d => d.wins || 0),
          backgroundColor: CHART_COLORS.goldBg,
          borderColor: CHART_COLORS.gold,
          borderWidth: 1.5,
          borderRadius: 3,
          stack: 'podiums',
        },
        {
          label: '2-е места',
          data: top10.map(d => Math.max(0, (d.podiums || 0) - (d.wins || 0))),
          backgroundColor: CHART_COLORS.silverBg,
          borderColor: CHART_COLORS.silver,
          borderWidth: 1.5,
          borderRadius: 3,
          stack: 'podiums',
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: {
        x: { stacked: true, beginAtZero: true, grid: { color: 'rgba(167,176,181,0.06)' } },
        y: { stacked: true, grid: { display: false }, ticks: { color: '#F2F5F5' } },
      },
    },
  });
}
