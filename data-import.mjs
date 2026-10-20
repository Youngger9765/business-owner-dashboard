const headerAliases = {
  month: ['月份', '年月', '日期', '月', 'month', 'date', 'period'],
  revenue: ['營收', '營業額', '收入', '銷售額', 'revenue', 'sales', 'amount'],
  expense: ['支出', '費用', '成本', 'expense', 'expenses', 'cost'],
  product: ['產品', '品項', '產品名稱', 'product', 'item'],
  customer: ['客戶', '客戶名稱', '客戶公司', 'customer', 'client']
};

function normalizeHeader(value) {
  return String(value ?? '').trim().toLocaleLowerCase().replace(/[\s_＿-]/g, '');
}

function findColumn(headers, aliases) {
  const accepted = new Set(aliases.map(normalizeHeader));
  return headers.findIndex(value => accepted.has(normalizeHeader(value)));
}

function parseMonth(value, XLSX) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const compact = String(Math.trunc(value));
    const compactMatch = compact.match(/^(\d{4})(\d{2})$/);
    if (compactMatch && Number(compactMatch[2]) >= 1 && Number(compactMatch[2]) <= 12) {
      return `${compactMatch[1]}-${compactMatch[2]}`;
    }
    const date = XLSX.SSF.parse_date_code(value);
    if (date?.y && date?.m >= 1 && date?.m <= 12) return `${date.y}-${String(date.m).padStart(2, '0')}`;
  }
  const text = String(value ?? '').trim();
  const match = text.match(/^(\d{4})\s*(?:[-/.年])\s*(\d{1,2})(?:\s*(?:[-/.月]|$))/);
  if (match && Number(match[2]) >= 1 && Number(match[2]) <= 12) {
    return `${match[1]}-${String(Number(match[2])).padStart(2, '0')}`;
  }
  return null;
}

function parseAmount(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value == null || String(value).trim() === '') return null;
  let text = String(value).trim().replace(/[,$NT＄元\s]/gi, '').replace(/,/g, '');
  let multiplier = 1;
  if (text.endsWith('萬')) { multiplier = 10000; text = text.slice(0, -1); }
  else if (text.endsWith('千')) { multiplier = 1000; text = text.slice(0, -1); }
  const negative = text.startsWith('(') && text.endsWith(')');
  if (negative) text = text.slice(1, -1);
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(text)) return null;
  const amount = Number(text) * multiplier;
  return negative ? -amount : amount;
}

function addTo(map, name, amount) {
  const key = String(name ?? '').trim();
  if (key) map.set(key, (map.get(key) ?? 0) + amount);
}

export function parseRevenueRows(XLSX, rows) {
  const headerIndex = rows.findIndex(row => findColumn(row, headerAliases.month) !== -1 && findColumn(row, headerAliases.revenue) !== -1);
  if (headerIndex === -1) throw new Error('找不到必要欄位，請確認第一張工作表有「月份」與「營收」欄');
  const headers = rows[headerIndex];
  const columns = Object.fromEntries(Object.entries(headerAliases).map(([key, aliases]) => [key, findColumn(headers, aliases)]));
  const buckets = new Map();
  let validRows = 0;

  rows.slice(headerIndex + 1).forEach((row, index) => {
    if (!row.some(value => value != null && String(value).trim() !== '')) return;
    const month = parseMonth(row[columns.month], XLSX);
    const revenue = parseAmount(row[columns.revenue]);
    const rowNumber = headerIndex + index + 2;
    if (!month || revenue == null) throw new Error(`第 ${rowNumber} 列的月份或營收格式不正確`);
    const bucket = buckets.get(month) ?? { month, revenue: 0, expense: null, products: new Map(), customers: new Map() };
    bucket.revenue += revenue;
    const expense = columns.expense === -1 ? null : parseAmount(row[columns.expense]);
    if (expense != null) bucket.expense = (bucket.expense ?? 0) + expense;
    buckets.set(month, bucket);
    if (columns.product !== -1) addTo(bucket.products, row[columns.product], revenue);
    if (columns.customer !== -1) addTo(bucket.customers, row[columns.customer], revenue);
    validRows++;
  });

  if (!validRows) throw new Error('沒有可匯入的營收資料，請在欄位標題下方新增資料列');
  const sorted = [...buckets.values()].sort((a, b) => a.month.localeCompare(b.month));
  const latest = sorted.at(-1);
  return {
    months: sorted.map(({ month, revenue, expense }) => ({ month, revenue, expense })),
    hasExpense: sorted.some(row => row.expense != null),
    products: [...latest.products].map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue),
    customers: [...latest.customers].map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue)
  };
}
