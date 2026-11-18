// Run: node tests/phase4.test.js  (statistics engine + new date helpers)
const assert = require('assert');
require('../js/utils/dateUtils.js'); require('../js/services/validation.js'); require('../js/storage/storage.js'); require('../js/services/stats.js');
const { DateUtils: D, Stats: S, Storage: St } = globalThis.DAT; let n = 0; const t = (m, f) => { f(); n++; console.log('ok -', m); };
const dr = (id, name, status = 'Active') => ({ id, name, vehicle: 'V' + id, registration: '', status, createdAt: '2020-01-01' });
const rec = (driverId, date, id) => ({ id: id || driverId + date, driverId, date, createdAt: date });
const A = dr('a', 'Ana'), B = dr('b', 'Bo'), C = dr('c', 'Cy'), X = dr('x', 'Xi', 'Inactive');
const days = (recs, range, id) => S.countDays(recs, range).get(id) || 0;

t('addMonths/addYears clamp; daysBetween', () => {
  assert.equal(D.addMonths('2026-01-31', 1), '2026-02-28'); assert.equal(D.addMonths('2024-01-31', 1), '2024-02-29'); assert.equal(D.addMonths('2026-03-31', -1), '2026-02-28');
  assert.equal(D.addMonths('2026-01-15', -1), '2025-12-15'); assert.equal(D.addYears('2024-02-29', 1), '2025-02-28'); assert.equal(D.daysBetween('2026-03-01', '2026-03-31'), 30); assert.equal(D.daysBetween('2026-03-07', '2026-03-09'), 2);
});
t('duplicates never inflate days', () => {
  const recs = [rec('a', '2026-11-17', '1'), rec('a', '2026-11-17', '2'), rec('a', '2026-11-17', '3')];
  assert.equal(days(recs, S.rangeFor('today', '2026-11-17'), 'a'), 1);
});
t('Monday-Sunday week boundaries', () => {
  const recs = ['2026-11-15', '2026-11-16', '2026-11-22', '2026-11-23'].map((d) => rec('a', d)); const w = S.rangeFor('week', '2026-11-18');
  assert.deepEqual([w.from, w.to], ['2026-11-16', '2026-11-22']); assert.equal(days(recs, w, 'a'), 2);
});
t('month and year boundaries', () => {
  const recs = ['2025-12-31', '2026-01-01', '2026-01-31', '2026-02-01'].map((d) => rec('a', d));
  assert.equal(days(recs, S.rangeFor('month', '2026-01-20'), 'a'), 2); assert.equal(days(recs, S.rangeFor('year', '2026-06-01'), 'a'), 3); assert.equal(days(recs, S.rangeFor('year', '2025-06-01'), 'a'), 1);
});
t('previous ranges', () => {
  const p = (k, ref, c) => S.previousRange(S.rangeFor(k, ref, c)); let r;
  r = p('month', '2026-03-10'); assert.deepEqual([r.from, r.to], ['2026-02-01', '2026-02-28']);
  r = p('month', '2026-01-10'); assert.deepEqual([r.from, r.to], ['2025-12-01', '2025-12-31']);
  r = p('week', '2026-01-01'); assert.deepEqual([r.from, r.to], ['2025-12-22', '2025-12-28']);
  r = p('year', '2026-05-05'); assert.deepEqual([r.from, r.to], ['2025-01-01', '2025-12-31']);
  r = p('custom', null, { from: '2026-03-10', to: '2026-03-14' }); assert.deepEqual([r.from, r.to], ['2026-03-05', '2026-03-09']);
  assert.equal(p('all', '2026-01-01'), null);
});
t('custom range validation', () => {
  assert.throws(() => S.rangeFor('custom', null, { from: '', to: '2026-01-01' }), /valid/); assert.throws(() => S.rangeFor('custom', null, { from: '2026-02-01', to: '2026-01-01' }), /on or before/);
  assert.equal(S.rangeFor('custom', null, { from: '2026-01-01', to: '2026-01-01' }).label.includes('–'), true);
});
t('ranking with ties, most active, empty period', () => {
  const recs = [rec('a', '2026-11-16'), rec('a', '2026-11-17'), rec('b', '2026-11-16'), rec('b', '2026-11-17'), rec('c', '2026-11-16')];
  const s = S.summary([C, B, A], recs, S.rangeFor('week', '2026-11-17'));
  assert.deepEqual(s.rows.map((r) => [r.driver.id, r.rank, r.days]), [['a', 1, 2], ['b', 1, 2], ['c', 3, 1]]); assert.deepEqual(s.mostActive.map((d) => d.id), ['a', 'b']); assert.equal(s.total, 5);
  const e = S.summary([A, B], [], S.rangeFor('week', '2026-11-17')); assert.equal(e.mostActive.length, 0); assert.equal(e.rows.length, 2);
});
t('inactive drivers keep history but only appear when they have activity', () => {
  const recs = [rec('x', '2026-11-10')]; const wk = S.summary([A, X], recs, S.rangeFor('week', '2026-11-17'));
  assert.deepEqual(wk.rows.map((r) => r.driver.id), ['a', 'x']); assert.equal(wk.rows[1].prev, 1);
  const mo = S.summary([A, X], [], S.rangeFor('month', '2026-11-17')); assert.deepEqual(mo.rows.map((r) => r.driver.id), ['a']);
  assert.equal(S.summary([A, X], recs, S.rangeFor('all')).rows.find((r) => r.driver.id === 'x').days, 1);
});
t('comparison with previous period', () => {
  const recs = [rec('a', '2026-11-02'), rec('a', '2026-11-03'), rec('a', '2026-11-04'), rec('a', '2026-10-05')]; const s = S.summary([A], recs, S.rangeFor('month', '2026-11-17'));
  assert.deepEqual([s.rows[0].days, s.rows[0].prev, s.rows[0].change, s.total, s.prevTotal], [3, 1, 2, 3, 1]);
});
t('daily: drove vs no activity (active only)', () => {
  const d = S.daily([A, B, X], [rec('a', '2026-11-17'), rec('x', '2026-11-17')], '2026-11-17');
  assert.deepEqual(d.drove.map((x) => x.id), ['a', 'x']); assert.deepEqual(d.none.map((x) => x.id), ['b']);
});
t('history across a year boundary', () => {
  const recs = [rec('a', '2025-12-05'), rec('a', '2026-01-05'), rec('a', '2026-01-06'), rec('b', '2025-11-30')];
  const h = S.history([A, B], recs, 'month', '2026-02-15', 4);
  assert.deepEqual(h.periods.map((p) => p.from), ['2025-11-01', '2025-12-01', '2026-01-01', '2026-02-01']); assert.deepEqual(h.rows[0].counts, [0, 1, 2, 0]); assert.deepEqual(h.totals, [1, 1, 2, 0]);
  assert.equal(S.history([A], [], 'week', '2026-11-17', 3).periods[2].from, '2026-11-16'); assert.equal(S.history([A], [], 'custom', null, 3), null);
});
t('editing/deleting records updates statistics immediately', () => {
  const r = St.createRepository(St.MemoryAdapter()); const a = r.saveDriver({ name: 'A', vehicle: 'V' }); const rg = S.rangeFor('month', '2026-11-17');
  const total = () => S.summary(r.getDrivers(), r.getRecords(), rg).total;
  const r1 = r.saveRecord({ driverId: a.id, date: '2026-11-02' }); r.saveRecord({ driverId: a.id, date: '2026-11-03' }); assert.equal(total(), 2);
  r.saveRecord({ ...r1, date: '2026-10-31' }); assert.equal(total(), 1); r.deleteRecord(r1.id); r.saveDriver({ ...a, status: 'Inactive' }); assert.equal(total(), 1);
});
console.log(n + ' tests passed');
