// Storage layer. The app talks only to the repository; adapters (LocalStorage, memory, a
// future database) just load/save one dataset, so swapping storage never touches other code.
(function (root) {
  const DAT = (root.DAT = root.DAT || {});
  const KEY = 'driverActivityTracker.data';
  const empty = () => ({ schemaVersion: 1, drivers: [], records: [] });
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const newId = () => (root.crypto && root.crypto.randomUUID ? root.crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));

  function LocalStorageAdapter() {
    return {
      load() {
        const raw = localStorage.getItem(KEY);
        if (raw === null) return { data: null };
        try { return { data: JSON.parse(raw) }; } catch (e) { return { data: null, corruptRaw: raw }; }
      },
      save(d) { localStorage.setItem(KEY, JSON.stringify(d)); },
      backupCorrupt(raw) { try { localStorage.setItem(KEY + '.corrupt', raw); } catch (e) { /* ignore */ } },
      readCorrupt() { try { return localStorage.getItem(KEY + '.corrupt'); } catch (e) { return null; } },
    };
  }
  function MemoryAdapter(initial) {
    let s = initial ? clone(initial) : null;
    return { load() { return { data: s ? clone(s) : null }; }, save(d) { s = clone(d); } };
  }

  function createRepository(adapter) {
    const V = DAT.Validation, DU = DAT.DateUtils;
    const warnings = [];
    let data = null;
    const res = adapter.load();
    const stored = res.data;
    if (stored) {
      const v = V.validateDataset(stored);
      if (v.ok) data = stored;
      else { warnings.push('Saved data was invalid and was not loaded (' + v.errors[0] + ') A copy was kept in the browser.'); adapter.backupCorrupt && adapter.backupCorrupt(JSON.stringify(stored)); }
    } else if (res.corruptRaw) {
      warnings.push('Saved data could not be read and was not loaded. A copy was kept in the browser.');
      adapter.backupCorrupt && adapter.backupCorrupt(res.corruptRaw);
    }
    if (!data) data = empty();

    // Pull in changes made elsewhere (another browser tab) so a write never overwrites newer data.
    function reload() {
      let res; try { res = adapter.load(); } catch (e) { return; }
      if (res.data && V.validateDataset(res.data).ok) data = res.data;
    }
    // Every write works on a copy and only replaces live data after the save succeeds.
    function mutate(fn) {
      reload();
      const next = clone(data);
      fn(next);
      try { adapter.save(next); } catch (e) { throw new Error('Could not save data. Browser storage may be full or disabled.'); }
      data = next;
    }
    const fail = (v) => { if (!v.ok) throw new Error(v.errors.join(' ')); };

    return {
      warnings,
      newId,
      reload,
      getCorruptBackup: () => (adapter.readCorrupt ? adapter.readCorrupt() : null),
      previewImport: (obj) => V.sanitizeImport(obj).report,
      getDrivers: () => clone(data.drivers),
      getDriver: (id) => clone(data.drivers.find((d) => d.id === id) || null),
      getRecords: () => clone(data.records),
      saveDriver(input) {
        const d = { registration: '', status: 'Active', createdAt: DU.today(), ...input, id: input.id || newId() };
        if (typeof d.name === 'string') d.name = d.name.trim();
        if (typeof d.vehicle === 'string') d.vehicle = d.vehicle.trim();
        if (typeof d.registration === 'string') d.registration = d.registration.trim();
        fail(V.validateDriver(d));
        reload();
        const lc = (s) => (s || '').trim().toLowerCase();
        const others = data.drivers.filter((x) => x.id !== d.id);
        if (d.registration && others.some((x) => lc(x.registration) === lc(d.registration))) throw new Error('Another driver already uses that registration number.');
        if (d.status === 'Active' && others.some((x) => x.status === 'Active' && lc(x.vehicle) === lc(d.vehicle))) throw new Error('That vehicle is already assigned to another active driver.');
        mutate((n) => { const i = n.drivers.findIndex((x) => x.id === d.id); i >= 0 ? (n.drivers[i] = d) : n.drivers.push(d); });
        return clone(d);
      },
      deleteDriver(id, opts) {
        reload();
        const has = data.records.some((r) => r.driverId === id);
        if (has && !(opts && opts.withRecords)) throw new Error('This driver has driving records. Deactivate instead, or confirm deleting their records too.');
        mutate((n) => { n.drivers = n.drivers.filter((d) => d.id !== id); n.records = n.records.filter((r) => r.driverId !== id); });
      },
      saveRecord(input) {
        const r = { createdAt: DU.today(), ...input, id: input.id || newId() };
        fail(V.validateRecord(r));
        reload();
        if (!data.drivers.some((d) => d.id === r.driverId)) throw new Error('That driver no longer exists.');
        if (data.records.some((x) => x.id !== r.id && x.driverId === r.driverId && x.date === r.date)) throw new Error('This driver already has a record for that date.');
        mutate((n) => { const i = n.records.findIndex((x) => x.id === r.id); i >= 0 ? (n.records[i] = r) : n.records.push(r); });
        return clone(r);
      },
      deleteRecord(id) { mutate((n) => { n.records = n.records.filter((r) => r.id !== id); }); },
      exportData: () => ({ app: 'driver-activity-tracker', ...clone(data), exportedAt: new Date().toISOString() }),
      importData(obj) {
        const { data: d, report } = V.sanitizeImport(obj);
        if (!d) throw new Error(report.error);
        mutate((n) => { n.drivers = d.drivers; n.records = d.records; });
        return report;
      },
      clearAll() { mutate((n) => { n.drivers = []; n.records = []; }); },
    };
  }
  DAT.Storage = { LocalStorageAdapter, MemoryAdapter, createRepository, KEY };
})(typeof window !== 'undefined' ? window : globalThis);
