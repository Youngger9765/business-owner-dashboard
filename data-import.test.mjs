import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRevenueRows } from './data-import.mjs';

const spreadsheet = { SSF: { parse_date_code: serial => ({ y: 2026, m: serial === 46300 ? 10 : 9 }) } };

test('groups monthly revenue and optional expense, product, and customer totals', () => {
  const result = parseRevenueRows(spreadsheet, [
    ['月份', '營收', '支出', '產品', '客戶'],
    ['2026-09', 100000, 70000, '方案 A', '客戶甲'],
    ['2026-10', 'NT$ 120,000', 80000, '方案 A', '客戶甲'],
    ['2026-10', 30000, 10000, '服務 B', '客戶乙']
  ]);
  assert.deepEqual(result.months, [
    { month: '2026-09', revenue: 100000, expense: 70000 },
    { month: '2026-10', revenue: 150000, expense: 90000 }
  ]);
  assert.deepEqual(result.products, [{ name: '方案 A', revenue: 120000 }, { name: '服務 B', revenue: 30000 }]);
  assert.deepEqual(result.customers, [{ name: '客戶甲', revenue: 120000 }, { name: '客戶乙', revenue: 30000 }]);
  assert.equal(result.hasExpense, true);
});

test('accepts alternate Chinese headers and Excel date serials', () => {
  const result = parseRevenueRows(spreadsheet, [['日期', '營業額'], [46300, 50000]]);
  assert.equal(result.months[0].month, '2026-10');
  assert.equal(result.months[0].revenue, 50000);
  assert.equal(result.hasExpense, false);
});

test('rejects missing required headers and invalid data rows with a clear error', () => {
  assert.throws(() => parseRevenueRows(spreadsheet, [['月份', '支出'], ['2026-10', 10]]), /月份.*營收/);
  assert.throws(() => parseRevenueRows(spreadsheet, [['月份', '營收'], ['not-a-month', 10]]), /第 2 列/);
});
