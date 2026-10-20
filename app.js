import { parseRevenueRows } from './data-import.mjs';

const demoMonths = [
  ['2025-11', 1560000], ['2025-12', 1690000], ['2026-01', 1620000], ['2026-02', 1840000],
  ['2026-03', 1780000], ['2026-04', 1950000], ['2026-05', 2020000], ['2026-06', 1910000],
  ['2026-07', 2140000], ['2026-08', 2080000], ['2026-09', 2199000, 1729000], ['2026-10', 2480000, 1674000]
].map(([month, revenue, expense]) => ({ month, revenue, expense: expense ?? null }));
let monthlyData = demoMonths;
let importedData = null;
let selectedRange = 12;
const chart = document.getElementById('revenueChart');
const summary = document.getElementById('chartSummary');
const rangeButtons = [...document.querySelectorAll('.range-button')];
const SVG_NS = 'http://www.w3.org/2000/svg';
const palette = ['#5574e8', '#37bda6', '#f3b75a', '#a9b4cb', '#a178d5', '#e27f8b'];
const demoProducts = [['企業方案', 1041600], ['專業服務', 694400], ['雲端訂閱', 446400], ['其他', 297600]];
const demoCustomers = [['遠景科技', 428000], ['青禾生活', 362000], ['星拓設計', 305000], ['沐光餐飲', 244000], ['合創顧問', 198000]];

function svgElement(tag, attributes, parent = chart) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  parent.appendChild(element);
  return element;
}

function formatMoney(value) {
  return `NT$ ${Math.round(value).toLocaleString('en-US')}`;
}

function formatMonth(month) {
  const [year, numericMonth] = month.split('-');
  return `${year} 年 ${Number(numericMonth)} 月`;
}

function monthLabel(month) {
  return `${Number(month.slice(5))} 月`;
}

function changePercent(current, previous) {
  return previous ? ((current - previous) / Math.abs(previous)) * 100 : null;
}

function setChange(id, percent, emptyLabel = '無前期資料') {
  const element = document.getElementById(id);
  element.classList.remove('positive', 'neutral');
  if (percent == null || !Number.isFinite(percent)) {
    element.classList.add('neutral');
    element.textContent = emptyLabel;
    return;
  }
  element.classList.add(percent < 0 ? 'neutral' : 'positive');
  element.textContent = `${percent < 0 ? '↘' : '↗'} ${Math.abs(percent).toFixed(1)}%`;
}

function renderChart() {
  const months = monthlyData.slice(-selectedRange);
  chart.replaceChildren();
  chart.setAttribute('viewBox', '0 0 680 235');
  chart.setAttribute('aria-label', `近 ${months.length} 個月每月營收折線圖，最後一個月為 ${formatMoney(months.at(-1).revenue)}`);
  const left = 43, right = 661, top = 18, bottom = 194;
  const values = months.map(row => row.revenue / 10000);
  const max = Math.max(100, Math.ceil(Math.max(...values) / 100) * 100);
  const x = index => months.length === 1 ? (left + right) / 2 : left + index * (right - left) / (months.length - 1);
  const y = value => bottom - value / max * (bottom - top);
  const defs = svgElement('defs', {});
  const gradient = svgElement('linearGradient', { id: 'areaGradient', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
  svgElement('stop', { offset: '0%', 'stop-color': '#6687ed', 'stop-opacity': '.18' }, gradient);
  svgElement('stop', { offset: '100%', 'stop-color': '#6687ed', 'stop-opacity': '0' }, gradient);
  for (let index = 0; index <= 3; index++) {
    const tick = max - max * index / 3;
    const tickY = y(tick);
    svgElement('line', { x1: left, x2: right, y1: tickY, y2: tickY, stroke: '#edf1f6', 'stroke-dasharray': index === 3 ? '0' : '3 5' });
    const label = svgElement('text', { x: 32, y: tickY + 4, 'text-anchor': 'end', fill: '#a3afc0', 'font-size': '10' });
    label.textContent = Math.round(tick);
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
      svgElement('rect', { x: Math.min(right - 74, point[0] - 43), y: Math.max(0, point[1] - 38), width: '72', height: '26', rx: '6', fill: '#2f4eb6' }, badge);
      const label = svgElement('text', { x: Math.min(right - 38, point[0] - 2), y: Math.max(17, point[1] - 21), 'text-anchor': 'middle', fill: '#fff', 'font-size': '11', 'font-weight': '700' }, badge);
      label.textContent = `${Math.round(values.at(-1))} 萬`;
    }
    const label = svgElement('text', { x: point[0], y: 222, 'text-anchor': 'middle', fill: '#9aa8ba', 'font-size': months.length > 8 ? '9' : '11' });
    label.textContent = monthLabel(months[index].month);
  });
  const first = months[0];
  const latest = months.at(-1);
  summary.textContent = `${months.length > 1 ? `近 ${months.length} 個月營收由 ${formatMoney(first.revenue)} 成長至` : `${formatMonth(latest.month)} 營收`} ${formatMoney(latest.revenue)}`;
}

function renderMetrics(data) {
  const latest = data.months.at(-1);
  const previous = data.months.at(-2);
  document.getElementById('revenueValue').textContent = formatMoney(latest.revenue);
  setChange('revenueChange', changePercent(latest.revenue, previous?.revenue));
  document.getElementById('revenueFoot').textContent = previous
    ? `較上月${latest.revenue >= previous.revenue ? '增加' : '減少'} ${formatMoney(Math.abs(latest.revenue - previous.revenue))}`
    : '匯入資料僅含一個月份';

  const expenseKnown = latest.expense != null;
  document.getElementById('expenseValue').textContent = expenseKnown ? formatMoney(latest.expense) : '—';
  setChange('expenseChange', expenseKnown && previous?.expense != null ? changePercent(latest.expense, previous.expense) : null, expenseKnown ? '無前期資料' : '請提供支出');
  document.getElementById('expenseFoot').textContent = expenseKnown ? '依匯入資料計算' : '加入「支出」欄以更新';

  if (expenseKnown) {
    const profit = latest.revenue - latest.expense;
    const previousProfit = previous?.expense == null ? null : previous.revenue - previous.expense;
    document.getElementById('profitValue').textContent = formatMoney(profit);
    setChange('profitChange', previousProfit == null ? null : changePercent(profit, previousProfit));
    document.getElementById('profitFoot').textContent = `獲利率 ${latest.revenue ? (profit / latest.revenue * 100).toFixed(1) : '0.0'}%`;
  } else {
    document.getElementById('profitValue').textContent = '—';
    setChange('profitChange', null, '請提供支出');
    document.getElementById('profitFoot').textContent = '加入「支出」欄以計算';
  }

  const revenueChange = changePercent(latest.revenue, previous?.revenue);
  document.getElementById('heroTitle').textContent = revenueChange == null ? '營收資料已更新' : revenueChange >= 0 ? '營收穩健成長，持續向前' : '營收趨勢已更新';
  document.getElementById('heroSummary').textContent = revenueChange == null
    ? `${formatMonth(latest.month)} 營業額為 ${formatMoney(latest.revenue)}`
    : `本月營業額較上月${revenueChange >= 0 ? '成長' : '下滑'} ${Math.abs(revenueChange).toFixed(1)}%${expenseKnown ? `，獲利率 ${(latest.revenue ? (latest.revenue - latest.expense) / latest.revenue * 100 : 0).toFixed(1)}%` : ''}，資料已依匯入內容更新`;
}

function renderProducts(data) {
  const period = formatMonth(data.months.at(-1).month);
  document.getElementById('productsPeriod').textContent = period;
  const total = data.products.reduce((sum, row) => sum + row.revenue, 0);
  const donut = document.getElementById('productDonut');
  const list = document.getElementById('productList');
  const note = document.getElementById('productNote');
  document.getElementById('donutLabel').textContent = importedData ? '產品營收' : '總營收';
  if (!data.products.length || !total) {
    donut.style.background = '#edf1f6';
    donut.setAttribute('aria-label', '匯入檔案沒有產品欄位資料');
    document.getElementById('donutTotal').textContent = '—';
    list.replaceChildren(Object.assign(document.createElement('div'), { className: 'empty-data', textContent: '加入「產品」欄以更新占比' }));
    note.textContent = '此檔案未包含產品欄位';
    return;
  }
  const visible = data.products.slice(0, 6);
  let cumulative = 0;
  const stops = visible.map((row, index) => {
    const start = cumulative;
    cumulative += row.revenue / total * 100;
    return `${palette[index % palette.length]} ${start}% ${cumulative}%`;
  });
  if (cumulative < 100) stops.push(`#d9dfeb ${cumulative}% 100%`);
  donut.style.background = `conic-gradient(${stops.join(',')})`;
  donut.setAttribute('aria-label', visible.map(row => `${row.name} ${(row.revenue / total * 100).toFixed(1)}%`).join('、'));
  document.getElementById('donutTotal').textContent = `${(total / 10000).toFixed(total % 10000 ? 1 : 0)}<span>萬</span>`;
  list.replaceChildren(...visible.map((row, index) => {
    const item = document.createElement('div'); item.className = 'product-row';
    const dot = document.createElement('span'); dot.className = 'product-dot'; dot.style.setProperty('--dot', palette[index % palette.length]);
    const name = document.createElement('span'); name.textContent = row.name;
    const share = document.createElement('strong'); share.textContent = `${(row.revenue / total * 100).toFixed(1)}%`;
    item.append(dot, name, share); return item;
  }));
  note.textContent = `主要營收來源 ${visible[0].name}，貢獻產品營收的 ${(visible[0].revenue / total * 100).toFixed(1)}%`;
}

function renderCustomers(data) {
  const period = formatMonth(data.months.at(-1).month);
  document.getElementById('customersPeriod').textContent = period;
  const rows = data.customers.slice(0, 5);
  const total = data.months.at(-1).revenue;
  const customerTotal = data.customers.reduce((sum, row) => sum + row.revenue, 0);
  const body = document.getElementById('customerRows');
  if (!rows.length || !customerTotal || !total) {
    body.replaceChildren();
    const empty = document.createElement('tr');
    const cell = document.createElement('td'); cell.colSpan = 5; cell.className = 'empty-table'; cell.textContent = '加入「客戶」欄以更新客戶排名';
    empty.append(cell); body.append(empty);
    document.getElementById('customerTotal').textContent = '此檔案未包含客戶欄位';
    document.getElementById('customerShare').textContent = '';
    return;
  }
  body.replaceChildren(...rows.map((row, index) => {
    const tr = document.createElement('tr');
    const rankCell = document.createElement('td');
    const rank = document.createElement('span'); rank.className = `rank${index < 3 ? ' top-rank' : ''}`; rank.textContent = String(index + 1).padStart(2, '0'); rankCell.append(rank);
    const nameCell = document.createElement('td');
    const name = document.createElement('span'); name.className = 'customer-name';
    const icon = document.createElement('span'); icon.className = `customer-logo logo-${String.fromCharCode(97 + index)}`; icon.textContent = [...row.name][0] ?? '客';
    const label = document.createElement('strong'); label.textContent = row.name; name.append(icon, label); nameCell.append(name);
    const typeCell = document.createElement('td'); typeCell.textContent = '—';
    const amountCell = document.createElement('td'); amountCell.className = 'amount'; amountCell.textContent = formatMoney(row.revenue);
    const shareCell = document.createElement('td'); const share = row.revenue / total * 100;
    const shareWrap = document.createElement('div'); shareWrap.className = 'share';
    const track = document.createElement('span'); track.className = 'share-track';
    const fill = document.createElement('span'); fill.style.width = `${share}%`; track.append(fill);
    const percent = document.createElement('strong'); percent.textContent = `${share.toFixed(1)}%`;
    shareWrap.append(track, percent); shareCell.append(shareWrap);
    tr.append(rankCell, nameCell, typeCell, amountCell, shareCell); return tr;
  }));
  const topTotal = rows.reduce((sum, row) => sum + row.revenue, 0);
  document.getElementById('customerTotal').textContent = `前五大客戶合計營收 ${formatMoney(topTotal)}`;
  const revenue = data.months.at(-1).revenue;
  document.getElementById('customerShare').textContent = `占本月營收 ${revenue ? (topTotal / revenue * 100).toFixed(1) : '0.0'}%`;
}

function renderDashboard(data) {
  monthlyData = data.months;
  renderChart();
  renderMetrics(data);
  renderProducts(data);
  renderCustomers(data);
}

rangeButtons.forEach(button => button.addEventListener('click', () => {
  rangeButtons.forEach(item => { item.classList.toggle('selected', item === button); item.setAttribute('aria-pressed', String(item === button)); });
  selectedRange = Number(button.dataset.range);
  renderChart();
}));

document.getElementById('exportButton').addEventListener('click', () => {
  const latest = importedData?.months.at(-1);
  const rows = [['報表', '經營儀表板'], ['資料來源', importedData ? '使用者匯入' : '模擬數據'], ['項目', '金額或數值'], ['本月營業額', Math.round(monthlyData.at(-1).revenue)]];
  if (latest?.expense != null) rows.push(['本月支出', Math.round(latest.expense)], ['本月獲利', Math.round(latest.revenue - latest.expense)]);
  rows.push([], ['月份', '營業額（元）'], ...monthlyData.map(row => [row.month, Math.round(row.revenue)]));
  const products = importedData ? importedData.products.map(row => [row.name, row.revenue]) : demoProducts;
  const customers = importedData ? importedData.customers.map(row => [row.name, row.revenue]) : demoCustomers;
  if (products.length) rows.push([], ['產品', '營收（元）'], ...products.map(([name, revenue]) => [name, Math.round(revenue)]));
  if (customers.length) rows.push([], ['客戶', '營收（元）'], ...customers.map(([name, revenue]) => [name, Math.round(revenue)]));
  rows.push([], ['註記', importedData ? '由使用者本機匯入的資料產生' : '所有數據與客戶名稱均為模擬']);
  const csv = '\uFEFF' + rows.map(row => row.map(cell => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = '經營儀表板-營收報表.csv'; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

const status = document.getElementById('importStatus');
const fileInput = document.getElementById('excelFile');
document.getElementById('importButton').addEventListener('click', () => fileInput.click());
document.getElementById('templateButton').addEventListener('click', () => {
  const sheet = XLSX.utils.aoa_to_sheet([
    ['月份', '營收', '支出', '產品', '客戶'],
    ['2026-09', 250000, 160000, '企業方案', '示範客戶甲'],
    ['2026-10', 320000, 190000, '專業服務', '示範客戶乙'],
    ['2026-10', 180000, 90000, '企業方案', '示範客戶甲']
  ]);
  const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, '營收資料');
  XLSX.writeFile(workbook, '企業營收匯入範本.xlsx');
});

fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  try {
    if (file.size > 10 * 1024 * 1024) throw new Error('檔案大小超過 10 MB，請先縮小檔案');
    if (!window.XLSX) throw new Error('Excel 讀取工具載入失敗，請重新整理頁面再試');
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!firstSheet) throw new Error('檔案中沒有可讀取的工作表');
    const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: true, defval: null });
    const result = parseRevenueRows(XLSX, rows);
    if (result.months.length > 60) throw new Error('目前最多支援 60 個月份，請縮小匯入範圍');
    importedData = result;
    renderDashboard(result);
    status.classList.remove('error');
    status.textContent = `已匯入「${file.name}」，共 ${result.months.length} 個月份，圖表與可用摘要已更新`;
    status.hidden = false;
    document.getElementById('resetButton').hidden = false;
  } catch (error) {
    status.classList.add('error');
    status.textContent = error.message || '讀取失敗，請確認檔案格式後再試';
    status.hidden = false;
  } finally {
    fileInput.value = '';
  }
});

document.getElementById('resetButton').addEventListener('click', () => window.location.reload());

const sidebar = document.getElementById('sidebar');
const menuButton = document.getElementById('menuButton');
const scrim = document.getElementById('mobileScrim');
function closeMenu() { sidebar.classList.remove('open'); menuButton.setAttribute('aria-expanded', 'false'); scrim.hidden = true; }
menuButton.addEventListener('click', () => { const open = sidebar.classList.toggle('open'); menuButton.setAttribute('aria-expanded', String(open)); scrim.hidden = !open; });
scrim.addEventListener('click', closeMenu);
document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', () => { document.querySelectorAll('.nav-link').forEach(item => item.classList.toggle('active', item === link)); closeMenu(); }));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
