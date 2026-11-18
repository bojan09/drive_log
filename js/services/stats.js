// Statistics engine: pure functions of (drivers, records). Nothing is stored or cached;
// every number is derived from the records, and a driving day is a distinct (driver, date).
(function (root) {
  const DAT = (root.DAT = root.DAT || {});
  const D = () => DAT.DateUtils;
  const S = {};
  const byName = (a, b) => a.name.localeCompare(b.name);
  const sum = (m) => [...m.values()].reduce((a, b) => a + b, 0);

  S.rangeFor = (kind, ref, custom) => {
    const d = D(); ref = ref || d.today();
    const month = (s) => d.parseISO(s).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    switch (kind) {
      case 'today': return { kind, from: ref, to: ref, label: 'Today, ' + d.format(ref) };
      case 'week': { const f = d.startOfWeek(ref), t = d.endOfWeek(ref); return { kind, from: f, to: t, label: 'This week, ' + d.format(f) + ' – ' + d.format(t) }; }
      case 'month': return { kind, from: d.startOfMonth(ref), to: d.endOfMonth(ref), label: 'This month, ' + month(ref) };
      case 'year': return { kind, from: d.startOfYear(ref), to: d.endOfYear(ref), label: 'This year, ' + ref.slice(0, 4) };
      case 'all': return { kind, from: '0001-01-01', to: '9999-12-31', label: 'All time' };
      case 'custom': {
        const f = custom && custom.from, t = custom && custom.to;
        if (!d.isValidISO(f) || !d.isValidISO(t)) throw new Error('Enter a valid start and end date.');
        if (f > t) throw new Error('Start date must be on or before the end date.');
        return { kind, from: f, to: t, label: d.format(f) + ' – ' + d.format(t) };
      }
    }
    throw new Error('Unknown period: ' + kind);
  };

  S.previousRange = (r) => {
    const d = D();
    switch (r.kind) {
      case 'today': { const x = d.addDays(r.from, -1); return { kind: 'today', from: x, to: x }; }
      case 'week': return { kind: 'week', from: d.addDays(r.from, -7), to: d.addDays(r.to, -7) };
      case 'month': { const f = d.addMonths(r.from, -1); return { kind: 'month', from: f, to: d.endOfMonth(f) }; }
      case 'year': { const f = d.addYears(r.from, -1); return { kind: 'year', from: f, to: d.endOfYear(f) }; }
      case 'custom': { const n = d.daysBetween(r.from, r.to) + 1, t = d.addDays(r.from, -1); return { kind: 'custom', from: d.addDays(t, -(n - 1)), to: t }; }
      default: return null;
    }
  };

  // Map driverId -> number of distinct dates within the range.
  S.countDays = (records, range) => {
    const m = new Map();
    for (const r of records) {
      if (r.date < range.from || r.date > range.to) continue;
      if (!m.has(r.driverId)) m.set(r.driverId, new Set());
      m.get(r.driverId).add(r.date);
    }
    const out = new Map(); m.forEach((s, k) => out.set(k, s.size)); return out;
  };

  // Sort by days (desc) then name; ties share a rank (1, 1, 3).
  S.rank = (rows) => {
    rows.sort((a, b) => b.days - a.days || byName(a.driver, b.driver));
    rows.forEach((r, i) => { r.rank = i > 0 && rows[i - 1].days === r.days ? rows[i - 1].rank : i + 1; });
    return rows;
  };
  S.mostActive = (rows) => { const top = rows.length ? rows[0].days : 0; return top > 0 ? rows.filter((r) => r.days === top).map((r) => r.driver) : []; };

  // Rows list every active driver, plus inactive drivers who have activity in the period or the one before it.
  S.summary = (drivers, records, range) => {
    const c = S.countDays(records, range), prev = S.previousRange(range), pc = prev ? S.countDays(records, prev) : new Map();
    const rows = S.rank(drivers.map((d) => ({ driver: d, days: c.get(d.id) || 0, prev: prev ? pc.get(d.id) || 0 : null }))
      .filter((r) => r.driver.status === 'Active' || r.days > 0 || r.prev > 0));
    rows.forEach((r) => { r.change = prev ? r.days - r.prev : null; });
    return { range, prev, rows, total: sum(c), prevTotal: prev ? sum(pc) : null, mostActive: S.mostActive(rows) };
  };

  S.daily = (drivers, records, date) => {
    const ids = new Set(records.filter((r) => r.date === date).map((r) => r.driverId));
    return { date, drove: drivers.filter((d) => ids.has(d.id)).sort(byName), none: drivers.filter((d) => d.status === 'Active' && !ids.has(d.id)).sort(byName) };
  };

  // Last n weeks/months/years (oldest first) with days per driver, for comparisons and charts.
  S.history = (drivers, records, kind, ref, n) => {
    const d = D(); ref = ref || d.today();
    const shift = { week: (i) => d.addDays(ref, -7 * i), month: (i) => d.addMonths(ref, -i), year: (i) => d.addYears(ref, -i) }[kind];
    if (!shift) return null;
    const periods = []; for (let i = n - 1; i >= 0; i--) periods.push(S.rangeFor(kind, shift(i)));
    const counts = periods.map((p) => S.countDays(records, p));
    const rows = drivers.map((dr) => ({ driver: dr, counts: counts.map((m) => m.get(dr.id) || 0) }))
      .filter((r) => r.driver.status === 'Active' || r.counts.some((x) => x > 0)).sort((a, b) => byName(a.driver, b.driver));
    return { periods, rows, totals: counts.map(sum) };
  };
  // Everything the dashboard shows, derived on demand. "Registered vehicles" = distinct vehicles assigned to active drivers.
  S.dashboard = (drivers, records, today) => {
    const act = drivers.filter((x) => x.status === 'Active'), day = S.daily(drivers, records, today), wk = S.summary(drivers, records, S.rangeFor('week', today));
    const byId = new Map(drivers.map((x) => [x.id, x]));
    const recent = records.filter((r) => byId.has(r.driverId))
      .sort((a, b) => b.date.localeCompare(a.date) || byId.get(a.driverId).name.localeCompare(byId.get(b.driverId).name)).slice(0, 8)
      .map((r) => ({ date: r.date, driver: byId.get(r.driverId) }));
    return { activeDrivers: act.length, vehicles: new Set(act.map((x) => x.vehicle.trim().toLowerCase())).size, droveToday: day.drove, idleToday: day.none,
      weekTotal: wk.total, mostActive: wk.mostActive, mostActiveDays: wk.mostActive.length ? wk.rows[0].days : 0, recent };
  };
  // One driver's numbers. Only that driver's records are used, so history survives deactivation.
  S.profile = (driver, records, today) => {
    const mine = records.filter((r) => r.driverId === driver.id), dates = [...new Set(mine.map((r) => r.date))].sort();
    const out = { driver, total: dates.length, first: dates[0] || null, last: dates[dates.length - 1] || null, dates, periods: {} };
    for (const k of ['week', 'month', 'year']) {
      const r = S.rangeFor(k, today), days = S.countDays(mine, r).get(driver.id) || 0, prev = S.countDays(mine, S.previousRange(r)).get(driver.id) || 0;
      out.periods[k] = { range: r, days, prev, change: days - prev };
    }
    return out;
  };
  S.driverHistory = (driver, records, kind, today, n) => {
    const h = S.history([driver], records.filter((r) => r.driverId === driver.id), kind, today, n);
    return { periods: h.periods, counts: h.rows.length ? h.rows[0].counts : h.periods.map(() => 0) };
  };
  DAT.Stats = S;
})(typeof window !== 'undefined' ? window : globalThis);
