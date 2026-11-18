// Run: node tests/phase6.test.js  (per-driver profile numbers)
const assert = require('assert');
require('../js/utils/dateUtils.js'); require('../js/services/validation.js'); require('../js/storage/storage.js'); require('../js/services/stats.js');
const { Stats: S, Storage: St } = globalThis.DAT; let n = 0; const t = (m, f) => { f(); n++; console.log('ok -', m); };
const mkd = (id, status = 'Active') => ({ id, name: id, vehicle: 'V' + id, registration: '', status, createdAt: '2020-01-01' });
const rec = (driverId, date, id) => ({ id: id || driverId + date, driverId, date, createdAt: date });
const A = mkd('a'), B = mkd('b'), X = mkd('x', 'Inactive');
t('week/month/year/all-time numbers with previous period and change', () => {
  const rs = ['2026-11-16', '2026-11-17', '2026-11-12', '2026-10-30', '2026-01-05', '2025-12-31'].map((d) => rec('a', d)).concat([rec('b', '2026-11-17')]);
  const p = S.profile(A, rs, '2026-11-18');
  assert.deepEqual([p.periods.week.days, p.periods.week.prev, p.periods.week.change], [2, 1, 1]); assert.deepEqual([p.periods.month.days, p.periods.month.prev], [3, 1]);
  assert.deepEqual([p.periods.year.days, p.periods.year.prev], [5, 1]); assert.equal(p.total, 6); assert.equal(p.first, '2025-12-31'); assert.equal(p.last, '2026-11-17');
});
t('duplicates do not inflate; other drivers are excluded', () => {
  const rs = [rec('a', '2026-11-17', '1'), rec('a', '2026-11-17', '2'), rec('b', '2026-11-17')]; const p = S.profile(A, rs, '2026-11-17');
  assert.equal(p.total, 1); assert.equal(p.periods.week.days, 1); assert.deepEqual(p.dates, ['2026-11-17']);
});
t('no records: zeros and nulls; inactive driver keeps history', () => {
  const e = S.profile(A, [], '2026-11-17'); assert.deepEqual([e.total, e.first, e.last, e.periods.month.days], [0, null, null, 0]);
  const p = S.profile(X, [rec('x', '2026-05-01')], '2026-11-17'); assert.equal(p.total, 1); assert.equal(p.periods.year.days, 1);
});
t('profile agrees with the statistics summary', () => {
  const rs = ['2026-11-16', '2026-11-02', '2026-10-31'].map((d) => rec('a', d)).concat([rec('b', '2026-11-16')]);
  for (const k of ['week', 'month', 'year']) { const row = S.summary([A, B], rs, S.rangeFor(k, '2026-11-17')).rows.find((r) => r.driver.id === 'a'); const x = S.profile(A, rs, '2026-11-17').periods[k]; assert.deepEqual([x.days, x.prev], [row.days, row.prev]); }
});
t('driver history across a year boundary, inactive driver with no activity', () => {
  const rs = [rec('a', '2025-12-05'), rec('a', '2026-01-05'), rec('a', '2026-01-06'), rec('b', '2026-01-07')]; const h = S.driverHistory(A, rs, 'month', '2026-02-15', 4);
  assert.deepEqual(h.counts, [0, 1, 2, 0]); assert.deepEqual(S.driverHistory(X, rs, 'week', '2026-02-15', 3).counts, [0, 0, 0]);
});
t('editing or deleting a record updates the profile', () => {
  const r = St.createRepository(St.MemoryAdapter()); const a = r.saveDriver({ name: 'A', vehicle: 'V' }); const r1 = r.saveRecord({ driverId: a.id, date: '2026-11-17' });
  const tot = () => S.profile(r.getDriver(a.id), r.getRecords(), '2026-11-18').periods.month.days; assert.equal(tot(), 1);
  r.saveRecord({ ...r1, date: '2026-10-31' }); assert.equal(tot(), 0); r.deleteRecord(r1.id); assert.equal(S.profile(r.getDriver(a.id), r.getRecords(), '2026-11-18').total, 0);
});
console.log(n + ' tests passed');
