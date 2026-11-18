// Run: node tests/phase1.test.js
const assert = require('assert');
require('../js/utils/dateUtils.js'); require('../js/services/validation.js'); require('../js/storage/storage.js');
const { DateUtils: D, Storage: S } = globalThis.DAT;
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok -', name); };
const throws = (fn, re) => assert.throws(fn, re);

t('date validation', () => { assert(D.isValidISO('2024-02-29')); assert(!D.isValidISO('2025-02-29')); assert(!D.isValidISO('2025-1-5')); });
t('Monday-Sunday weeks', () => {
  assert.equal(D.startOfWeek('2026-11-17'), '2026-11-16'); assert.equal(D.endOfWeek('2026-11-17'), '2026-11-22');
  assert.equal(D.startOfWeek('2026-11-22'), '2026-11-16'); assert.equal(D.startOfWeek('2026-11-16'), '2026-11-16');
  assert.equal(D.startOfWeek('2025-12-31'), '2025-12-29'); assert.equal(D.endOfWeek('2025-12-31'), '2026-01-04');
});
t('month/year bounds and addDays', () => {
  assert.equal(D.endOfMonth('2024-02-10'), '2024-02-29'); assert.equal(D.endOfMonth('2025-02-10'), '2025-02-28');
  assert.equal(D.startOfYear('2026-07-04'), '2026-01-01'); assert.equal(D.addDays('2026-01-01', -1), '2025-12-31');
});
t('DST-safe addDays', () => { assert.equal(D.addDays('2026-03-07', 2), '2026-03-09'); assert.equal(D.addDays('2026-10-31', 2), '2026-11-02'); });

const mk = (init) => S.createRepository(S.MemoryAdapter(init));
const drv = (r, name = 'Ana') => r.saveDriver({ name, vehicle: 'Van ' + name });
t('driver save, validate, edit', () => {
  const r = mk(); const d = drv(r); assert(d.id && d.status === 'Active');
  throws(() => r.saveDriver({ name: ' ', vehicle: 'x' }), /full name/);
  r.saveDriver({ ...d, name: 'Ana B' }); assert.equal(r.getDrivers().length, 1); assert.equal(r.getDrivers()[0].name, 'Ana B');
});
t('records: duplicate, orphan, same date different drivers', () => {
  const r = mk(); const a = drv(r), b = drv(r, 'Bo');
  r.saveRecord({ driverId: a.id, date: '2026-11-17' });
  throws(() => r.saveRecord({ driverId: a.id, date: '2026-11-17' }), /already has/);
  r.saveRecord({ driverId: b.id, date: '2026-11-17' });
  throws(() => r.saveRecord({ driverId: 'nope', date: '2026-11-17' }), /no longer exists/);
  throws(() => r.saveRecord({ driverId: a.id, date: '2026-02-30' }), /valid date/);
  assert.equal(r.getRecords().length, 2);
});
t('editing a record keeps identity; edit into duplicate rejected', () => {
  const r = mk(); const a = drv(r); const r1 = r.saveRecord({ driverId: a.id, date: '2026-11-16' }); r.saveRecord({ driverId: a.id, date: '2026-11-17' });
  r.saveRecord({ ...r1, date: '2026-11-18' }); assert.equal(r.getRecords().length, 2);
  throws(() => r.saveRecord({ ...r1, date: '2026-11-17' }), /already has/);
});
t('deleting drivers protects history', () => {
  const r = mk(); const a = drv(r); r.saveRecord({ driverId: a.id, date: '2026-11-17' });
  throws(() => r.deleteDriver(a.id), /Deactivate/);
  r.saveDriver({ ...a, status: 'Inactive' }); assert.equal(r.getRecords().length, 1);
  r.deleteDriver(a.id, { withRecords: true }); assert.equal(r.getRecords().length, 0);
});
t('failed save leaves state unchanged', () => {
  let fail = false; const m = S.MemoryAdapter(); const ad = { load: m.load, save: (d) => { if (fail) throw new Error('quota'); m.save(d); } };
  const r = S.createRepository(ad); drv(r); fail = true;
  throws(() => drv(r, 'Bo'), /Could not save/); assert.equal(r.getDrivers().length, 1);
});
t('export/import round trip', () => {
  const r = mk(); const a = drv(r); r.saveRecord({ driverId: a.id, date: '2026-11-17' });
  const x = JSON.parse(JSON.stringify(r.exportData())); const r2 = mk(); const rep = r2.importData(x);
  assert.deepEqual([rep.drivers, rep.records, rep.skippedRecords], [1, 1, 0]); assert.deepEqual(r2.getRecords(), r.getRecords());
});
t('import drops duplicates, orphans, bad items; rejects foreign files', () => {
  const r = mk(); const a = drv(r); const base = r.exportData(); const rec = { id: 'r1', driverId: a.id, date: '2026-11-17', createdAt: '2026-11-17' };
  base.records = [rec, { ...rec, id: 'r2' }, { ...rec, id: 'r3', driverId: 'ghost' }, { id: 'r4' }];
  const rep = mk().importData(base); assert.deepEqual([rep.records, rep.skippedRecords], [1, 3]);
  throws(() => mk().importData({ foo: 1 }), /not a Driver Activity/); throws(() => mk().importData({ drivers: [], records: [], schemaVersion: 9 }), /newer version/);
});
t('invalid stored data is not loaded and is flagged', () => {
  const r = mk({ schemaVersion: 1, drivers: [], records: [{ id: 'x', driverId: 'y', date: '2026-01-01', createdAt: '2026-01-01' }] });
  assert.equal(r.warnings.length, 1); assert.equal(r.getRecords().length, 0);
});
console.log('\n' + n + ' tests passed');
