const revenueData = [156, 169, 162, 184, 178, 195, 202, 191, 214, 208, 219.9, 248];
const monthLabels = ['11 月', '12 月', '1 月', '2 月', '3 月', '4 月', '5 月', '6 月', '7 月', '8 月', '9 月', '10 月'];
const chart = document.getElementById('revenueChart');
const summary = document.getElementById('chartSummary');
const buttons = [...document.querySelectorAll('.range-button')];
const SVG_NS = 'http://www.w3.org/2000/svg';

function svgElement(tag, attributes, parent = chart) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  parent.appendChild(element);
  return element;
}

function renderChart(monthCount) {
  const values = revenueData.slice(-monthCount);
  const labels = monthLabels.slice(-monthCount);
  chart.replaceChildren();
  chart.setAttribute('viewBox', '0 0 680 235');
  chart.setAttribute('aria-label', `近 ${monthCount} 個月每月營收折線圖，最後一個月為 248 萬元`);
  const left = 43, right = 661, top = 18, bottom = 194;
  const max = 300;
  const x = index => left + index * (right - left) / (values.length - 1);
  const y = value => bottom - value / max * (bottom - top);
  const defs = svgElement('defs', {});
  const gradient = svgElement('linearGradient', { id: 'areaGradient', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
  svgElement('stop', { offset: '0%', 'stop-color': '#6687ed', 'stop-opacity': '.18' }, gradient);
  svgElement('stop', { offset: '100%', 'stop-color': '#6687ed', 'stop-opacity': '0' }, gradient);
  for (const tick of [0, 100, 200, 300]) {
    const tickY = y(tick);
    svgElement('line', { x1: left, x2: right, y1: tickY, y2: tickY, stroke: '#edf1f6', 'stroke-dasharray': tick === 0 ? '0' : '3 5' });
    const text = svgElement('text', { x: 32, y: tickY + 4, 'text-anchor': 'end', fill: '#a3afc0', 'font-size': '10' });
    text.textContent = tick;
  }
  const points = values.map((value, index) => [x(index), y(value)]);
  const linePath = points.map((point, index) => `${index ? 'L' : 'M'} ${point[0]} ${point[1]}`).join(' ');
  svgElement('path', { d: `${linePath} L ${right} ${bottom} L ${left} ${bottom} Z`, fill: 'url(#areaGradient)' });
  svgElement('path', { d: linePath, fill: 'none', stroke: '#5c79de', 'stroke-width': '3', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
  points.forEach((point, index) => {
    if (index === points.length - 1) {
      svgElement('circle', { cx: point[0], cy: point[1], r: '8', fill: '#dbe4ff' });
      svgElement('circle', { cx: point[0], cy: point[1], r: '4.5', fill: '#526ee0' });
      const badge = svgElement('g', {});
      svgElement('rect', { x: point[0] - 43, y: point[1] - 38, width: '72', height: '26', rx: '6', fill: '#2f4eb6' }, badge);
      const text = svgElement('text', { x: point[0] - 7, y: point[1] - 21, 'text-anchor': 'middle', fill: '#fff', 'font-size': '11', 'font-weight': '700' }, badge);
      text.textContent = '248 萬';
    }
    const label = svgElement('text', { x: point[0], y: 222, 'text-anchor': 'middle', fill: '#9aa8ba', 'font-size': monthCount === 12 ? '9' : '11' });
    label.textContent = labels[index];
  });
  summary.textContent = `近 ${monthCount} 個月營收由 ${values[0].toLocaleString('zh-TW')} 萬元成長至 248 萬元`;
}

buttons.forEach(button => button.addEventListener('click', () => {
  buttons.forEach(item => { item.classList.toggle('selected', item === button); item.setAttribute('aria-pressed', String(item === button)); });
  renderChart(Number(button.dataset.range));
}));
renderChart(12);

document.getElementById('exportButton').addEventListener('click', () => {
  const rows = [['報表', '2026 年 10 月經營摘要'], ['項目', '金額或數值'], ['本月營業額', '2480000'], ['本月支出', '1674000'], ['本月獲利', '806000'], ['本月成交訂單', '328'], [], ['月份', '營業額（元）']];
  monthLabels.forEach((month, index) => rows.push([month, Math.round(revenueData[index] * 10000)]));
  rows.push([], ['產品', '占比'], ['企業方案', '42%'], ['專業服務', '28%'], ['雲端訂閱', '18%'], ['其他', '12%'], [], ['客戶', '本月營業額（元）'], ['遠景科技', '428000'], ['青禾生活', '362000'], ['星拓設計', '305000'], ['沐光餐飲', '244000'], ['合創顧問', '198000'], [], ['註記', '所有數據與客戶名稱均為模擬']);
  const csv = '\uFEFF' + rows.map(row => row.map(cell => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = '經營儀表板-2026-10-模擬報表.csv'; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

const sidebar = document.getElementById('sidebar');
const menuButton = document.getElementById('menuButton');
const scrim = document.getElementById('mobileScrim');
function closeMenu() { sidebar.classList.remove('open'); menuButton.setAttribute('aria-expanded', 'false'); scrim.hidden = true; }
menuButton.addEventListener('click', () => { const open = sidebar.classList.toggle('open'); menuButton.setAttribute('aria-expanded', String(open)); scrim.hidden = !open; });
scrim.addEventListener('click', closeMenu);
document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', () => { document.querySelectorAll('.nav-link').forEach(item => item.classList.toggle('active', item === link)); closeMenu(); }));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
