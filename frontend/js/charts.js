import { normalizeData } from './sonification.js';
let chart;
// meta: { PARAM: {label, unit, color} } — with several parameters the units differ, so each series
// is drawn normalized (0–1 inside its own period); tooltips still show the original values and units.
export function renderChart(canvas, data, params, meta) {
  const labels = data.dates.map((d) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`);
  const multi = params.length > 1;
  if (chart) chart.destroy();
  chart = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets: params.map((p) => ({
      label: `${meta[p].label} (${meta[p].unit})`, raw: data.series[p].values, unit: meta[p].unit,
      data: multi ? normalizeData(data.series[p].values) : data.series[p].values,
      borderColor: meta[p].color, backgroundColor: meta[p].color + '26', fill: !multi, tension: .25, pointRadius: 2, spanGaps: false })) },
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      scales: { x: { ticks: { color: '#94A3B8', maxTicksLimit: 10 }, title: { display: true, text: 'Date', color: '#94A3B8' } },
                y: { ticks: { color: '#94A3B8' }, title: { display: true, color: '#94A3B8', text: multi ? 'Normalized value (0 = period minimum, 1 = period maximum)' : meta[params[0]].unit } } },
      plugins: { legend: { labels: { color: '#F8FAFC' } },
        tooltip: { callbacks: { label: (c) => { const r = c.dataset.raw[c.dataIndex]; return `${c.dataset.label.split(' (')[0]}: ${r == null ? 'no data' : r.toFixed(2) + ' ' + c.dataset.unit}`; } } } } },
  });
}
export function stats(values) {
  const v = values.filter((x) => x != null);
  if (!v.length) return null;
  return { avg: v.reduce((a, b) => a + b, 0) / v.length, min: Math.min(...v), max: Math.max(...v), missing: values.length - v.length };
}
