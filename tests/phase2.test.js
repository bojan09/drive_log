// Run: node tests/phase2.test.js  (driver rules enforced by the repository)
const assert = require('assert');
require('../js/utils/dateUtils.js'); require('../js/services/validation.js'); require('../js/storage/storage.js');
const S = globalThis.DAT.Storage; let n = 0; const t = (m, f) => { f(); n++; console.log('ok -', m); };
const mk = () => S.createRepository(S.MemoryAdapter());
t('duplicate registration rejected (case-insensitive); blank registrations allowed', () => {
  const r = mk(); r.saveDriver({ name: 'A', vehicle: 'V1', registration: 'ab-123' });
  assert.throws(() => r.saveDriver({ name: 'B', vehicle: 'V2', registration: 'AB-123' }), /registration/);
  r.saveDriver({ name: 'B', vehicle: 'V2' }); r.saveDriver({ name: 'C', vehicle: 'V3' });
});
t('one active driver per vehicle; inactive drivers may share; reactivation checked', () => {
  const r = mk(); const a = r.saveDriver({ name: 'A', vehicle: 'Van' });
  assert.throws(() => r.saveDriver({ name: 'B', vehicle: ' van ' }), /already assigned/);
  r.saveDriver({ ...a, status: 'Inactive' }); const b = r.saveDriver({ name: 'B', vehicle: 'Van' });
  assert.throws(() => r.saveDriver({ ...a, status: 'Active' }), /already assigned/);
  r.saveDriver({ ...b, vehicle: 'Truck' }); r.saveDriver({ ...a, status: 'Active' });
});
t('editing a driver keeps id, date added and records', () => {
  const r = mk(); const a = r.saveDriver({ name: 'A', vehicle: 'V' }); r.saveRecord({ driverId: a.id, date: '2026-11-17' });
  const e = r.saveDriver({ ...a, name: 'A2', status: 'Inactive' });
  assert.equal(e.id, a.id); assert.equal(e.createdAt, a.createdAt); assert.equal(r.getRecords().length, 1);
});
console.log(n + ' tests passed');
