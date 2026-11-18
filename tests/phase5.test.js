// Run: node tests/phase5.test.js  (dashboard numbers + chart axis scaling)
const assert = require('assert');
require('../js/utils/dateUtils.js'); require('../js/services/validation.js'); require('../js/storage/storage.js'); require('../js/services/stats.js'); require('../js/charts/charts.js');
const { Stats: S, Charts: C } = globalThis.DAT; let n = 0; const t = (m, f) => { f(); n++; console.log('ok -', m); };
const dr = (id, name, vehicle, status = 'Active') => ({ id, name, vehicle, registration: '', status, createdAt: '2020-01-01' });
const rec = (driverId, date) => ({ id: driverId + date, driverId, date, createdAt: date });
t('dashboard numbers', () => {
  const ds = [dr('a', 'Ana', 'Van 1'), dr('b', 'Bo', 'van 1 '), dr('c', 'Cy', 'Truck'), dr('x', 'Xi', 'Old', 'Inactive')];
  const rs = [rec('a', '2026-11-17'), rec('a', '2026-11-16'), rec('b', '2026-11-16'), rec('x', '2026-11-17'), rec('c', '2026-11-10')];
  const d = S.dashboard(ds, rs, '2026-11-17');
  assert.equal(d.activeDrivers, 3); assert.equal(d.vehicles, 2); assert.deepEqual(d.droveToday.map((x) => x.id), ['a', 'x']); assert.deepEqual(d.idleToday.map((x) => x.id), ['b', 'c']);
  assert.equal(d.weekTotal, 4); assert.deepEqual(d.mostActive.map((x) => x.id), ['a']); assert.equal(d.mostActiveDays, 2);
  assert.deepEqual(d.recent.map((r) => r.driver.id + r.date), ['a2026-11-17', 'x2026-11-17', 'a2026-11-16', 'b2026-11-16', 'c2026-11-10']);
});
t('dashboard with no data', () => { const d = S.dashboard([], [], '2026-11-17'); assert.deepEqual([d.activeDrivers, d.vehicles, d.weekTotal, d.mostActive.length, d.recent.length], [0, 0, 0, 0, 0]); });
t('recent list is capped at 8, newest first', () => {
  const rs = Array.from({ length: 12 }, (_, i) => rec('a', '2026-11-' + String(i + 1).padStart(2, '0'))); const d = S.dashboard([dr('a', 'Ana', 'V')], rs, '2026-11-17');
  assert.equal(d.recent.length, 8); assert.equal(d.recent[0].date, '2026-11-12'); assert.equal(d.recent[7].date, '2026-11-05');
});
t('axis scale uses whole numbers, at most 5 intervals', () => {
  assert.deepEqual(C.scale(0), { step: 1, top: 1 }); assert.deepEqual(C.scale(5), { step: 1, top: 5 }); assert.deepEqual(C.scale(6), { step: 2, top: 6 });
  assert.deepEqual(C.scale(7), { step: 2, top: 8 }); assert.deepEqual(C.scale(23), { step: 5, top: 25 }); assert.deepEqual(C.scale(31), { step: 10, top: 40 }); assert.deepEqual(C.scale(366), { step: 100, top: 400 });
});
console.log(n + ' tests passed');
