// Validation for drivers, records and whole datasets (used on save, load and import).
(function (root) {
  const DAT = (root.DAT = root.DAT || {});
  const isStr = (v) => typeof v === 'string';
  const V = {};
  V.STATUSES = ['Active', 'Inactive'];
  V.validateDriver = (d) => {
    const e = [];
    if (!d || typeof d !== 'object') return { ok: false, errors: ['Driver is missing.'] };
    if (!isStr(d.id) || !d.id || d.id.length > 100) e.push('Driver needs an ID.');
    if (!isStr(d.name) || !d.name.trim()) e.push('Enter the driver’s full name.');
    else if (d.name.trim().length > 80) e.push('Name must be 80 characters or fewer.');
    if (!isStr(d.vehicle) || !d.vehicle.trim()) e.push('Assign a vehicle.');
    else if (d.vehicle.trim().length > 60) e.push('Vehicle must be 60 characters or fewer.');
    if (d.registration != null && (!isStr(d.registration) || d.registration.trim().length > 30)) e.push('Registration must be text of 30 characters or fewer.');
    if (!V.STATUSES.includes(d.status)) e.push('Status must be Active or Inactive.');
    if (!DAT.DateUtils.isValidISO(d.createdAt)) e.push('Date added is invalid.');
    return { ok: !e.length, errors: e };
  };
  V.validateRecord = (r) => {
    const e = [];
    if (!r || typeof r !== 'object') return { ok: false, errors: ['Record is missing.'] };
    if (!isStr(r.id) || !r.id || r.id.length > 100) e.push('Record needs an ID.');
    if (!isStr(r.driverId) || !r.driverId) e.push('Choose a driver.');
    if (!DAT.DateUtils.isValidISO(r.date)) e.push('Enter a valid date.');
    if (!DAT.DateUtils.isValidISO(r.createdAt)) e.push('Created date is invalid.');
    return { ok: !e.length, errors: e };
  };
  // Strict check of stored data: every item valid, IDs unique, no orphan records.
  V.validateDataset = (data) => {
    if (!data || !Array.isArray(data.drivers) || !Array.isArray(data.records)) return { ok: false, errors: ['Data structure is invalid.'] };
    const ids = new Set();
    for (const d of data.drivers) {
      const v = V.validateDriver(d);
      if (!v.ok) return v;
      if (ids.has(d.id)) return { ok: false, errors: ['Duplicate driver ID.'] };
      ids.add(d.id);
    }
    const rids = new Set();
    for (const r of data.records) {
      const v = V.validateRecord(r);
      if (!v.ok) return v;
      if (!ids.has(r.driverId)) return { ok: false, errors: ['A record refers to a missing driver.'] };
      if (rids.has(r.id)) return { ok: false, errors: ['Duplicate record ID.'] };
      rids.add(r.id);
    }
    return { ok: true, errors: [] };
  };
  // Lenient import: keep what is valid, drop the rest, and report counts.
  V.sanitizeImport = (obj) => {
    if (!obj || !Array.isArray(obj.drivers) || !Array.isArray(obj.records))
      return { data: null, report: { error: 'This file is not a Driver Activity Tracker backup.' } };
    if (typeof obj.schemaVersion === 'number' && obj.schemaVersion > 1)
      return { data: null, report: { error: 'This backup comes from a newer version of the app.' } };
    const drivers = [], records = [], dIds = new Set(), rIds = new Set(), days = new Set();
    let sd = 0, sr = 0;
    for (const d of obj.drivers) {
      if (V.validateDriver(d).ok && !dIds.has(d.id)) {
        dIds.add(d.id);
        drivers.push({ id: d.id, name: d.name.trim(), vehicle: d.vehicle.trim(), registration: (d.registration || '').trim(), status: d.status, createdAt: d.createdAt });
      } else sd++;
    }
    for (const r of obj.records) {
      const key = r && r.driverId + '|' + r.date;
      if (V.validateRecord(r).ok && dIds.has(r.driverId) && !rIds.has(r.id) && !days.has(key)) {
        rIds.add(r.id); days.add(key);
        records.push({ id: r.id, driverId: r.driverId, date: r.date, createdAt: r.createdAt });
      } else sr++;
    }
    return { data: { schemaVersion: 1, drivers, records }, report: { drivers: drivers.length, records: records.length, skippedDrivers: sd, skippedRecords: sr } };
  };
  DAT.Validation = V;
})(typeof window !== 'undefined' ? window : globalThis);
