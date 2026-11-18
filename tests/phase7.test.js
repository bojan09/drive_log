// Run: node tests/phase7.test.js  (hardening: limits, multi-tab safety, hostile imports, recovery)
const assert = require('assert');
require('../js/utils/dateUtils.js'); require('../js/services/validation.js'); require('../js/storage/storage.js');
const { Storage: S, Validation: V } = globalThis.DAT; let n = 0; const t = (m, f) => { f(); n++; console.log('ok -', m); };
const mk = (ad) => S.createRepository(ad || S.MemoryAdapter());
t('field length limits', () => {
  const r = mk(); const bad = (o, re) => assert.throws(() => r.saveDriver({ name: 'A', vehicle: 'V', ...o }), re);
  bad({ name: 'x'.repeat(81) }, /80/); bad({ vehicle: 'v'.repeat(61) }, /60/); bad({ registration: 'r'.repeat(31) }, /30/); bad({ id: 'i'.repeat(101) }, /ID/);
  r.saveDriver({ name: 'x'.repeat(80), vehicle: 'v'.repeat(60), registration: 'r'.repeat(30) });
});
// Two repositories sharing one backing store behave like two browser tabs.
const shared = () => { const m = S.MemoryAdapter(); return [mk(m), mk(m)]; };
t('two tabs: a write never overwrites newer data from the other tab', () => {
  const [t1, t2] = shared(); const a = t1.saveDriver({ name: 'A', vehicle: 'V1' }); const b = t2.saveDriver({ name: 'B', vehicle: 'V2' });
  assert.deepEqual(t2.getDrivers().map((d) => d.name).sort(), ['A', 'B']); t1.reload(); assert.equal(t1.getDrivers().length, 2);
  t2.saveRecord({ driverId: a.id, date: '2026-11-17' });
  assert.throws(() => t1.saveRecord({ driverId: a.id, date: '2026-11-17' }), /already has/); // duplicate check sees the other tab's record
  t1.deleteRecord(t1.getRecords()[0].id); assert.equal(t2.getRecords().length, 1); t2.reload(); assert.equal(t2.getRecords().length, 0);
});
t('two tabs: vehicle rule and driver removal see fresh data', () => {
  const [t1, t2] = shared(); const a = t1.saveDriver({ name: 'A', vehicle: 'Van' });
  assert.throws(() => t2.saveDriver({ name: 'B', vehicle: 'Van' }), /already assigned/);
  t2.deleteDriver(a.id); assert.throws(() => t1.saveRecord({ driverId: a.id, date: '2026-11-17' }), /no longer exists/);
});
t('hostile import: wrong types, extra fields, prototype keys, oversized values', () => {
  const evil = JSON.parse('{"drivers":[{"id":"d1","name":"Ok","vehicle":"V","registration":"","status":"Active","createdAt":"2026-01-01","__proto__":{"x":1},"role":"admin"},' +
    '{"id":"d2","name":"' + 'x'.repeat(500) + '","vehicle":"V","status":"Active","createdAt":"2026-01-01"},{"id":5,"name":"N","vehicle":"V","status":"Active","createdAt":"2026-01-01"},null,"str",[],' +
    '{"id":"d3","name":"<img src=x onerror=alert(1)>","vehicle":"V3","status":"Active","createdAt":"2026-01-01"}],' +
    '"records":[{"id":"r1","driverId":"d1","date":"2026-01-01","createdAt":"2026-01-01","extra":1},{"id":"r2","driverId":"d1","date":"2026-13-01","createdAt":"2026-01-01"},{"id":"r3","driverId":"d9","date":"2026-01-02","createdAt":"2026-01-01"},12,null]}');
  const r = mk(); const rep = r.importData(evil);
  assert.deepEqual([rep.drivers, rep.skippedDrivers, rep.records, rep.skippedRecords], [2, 5, 1, 4]);
  assert.deepEqual(Object.keys(r.getDrivers()[0]).sort(), ['createdAt', 'id', 'name', 'registration', 'status', 'vehicle']); assert.equal({}.x, undefined);
  assert.deepEqual(Object.keys(r.getRecords()[0]).sort(), ['createdAt', 'date', 'driverId', 'id']);
  assert.equal(r.getDrivers()[1].name, '<img src=x onerror=alert(1)>'); // stored as plain text; the UI only ever uses textContent
});
t('previewImport reports without changing data', () => {
  const r = mk(); r.saveDriver({ name: 'Keep', vehicle: 'V' }); const pre = r.previewImport({ drivers: [], records: [] });
  assert.deepEqual([pre.drivers, pre.records], [0, 0]); assert.equal(r.getDrivers().length, 1); assert(r.previewImport({ nope: 1 }).error);
});
t('unreadable stored data: warning, empty start, copy retrievable', () => {
  let copy = null; const ad = { load: () => ({ data: null, corruptRaw: '{broken' }), save() {}, backupCorrupt: (x) => { copy = x; }, readCorrupt: () => copy };
  const r = mk(ad); assert.equal(r.warnings.length, 1); assert.equal(r.getDrivers().length, 0); assert.equal(r.getCorruptBackup(), '{broken');
});
console.log(n + ' tests passed');
