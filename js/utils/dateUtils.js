// Date helpers. Dates are "YYYY-MM-DD" strings in local calendar terms; Date objects are
// built only transiently (local constructor), so no timezone shifting can occur.
(function (root) {
  const DAT = (root.DAT = root.DAT || {});
  const p = (n) => String(n).padStart(2, '0');
  const D = {};
  D.toISO = (d) => d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  D.isValidISO = (s) => {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const [y, m, d] = s.split('-').map(Number);
    const t = new Date(y, m - 1, d);
    return t.getFullYear() === y && t.getMonth() === m - 1 && t.getDate() === d;
  };
  D.parseISO = (s) => {
    if (!D.isValidISO(s)) throw new Error('Invalid date: ' + s);
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  D.today = () => D.toISO(new Date());
  D.addDays = (s, n) => { const d = D.parseISO(s); d.setDate(d.getDate() + n); return D.toISO(d); };
  D.startOfWeek = (s) => D.addDays(s, -((D.parseISO(s).getDay() + 6) % 7)); // Monday
  D.endOfWeek = (s) => D.addDays(D.startOfWeek(s), 6); // Sunday
  D.startOfMonth = (s) => s.slice(0, 8) + '01';
  D.endOfMonth = (s) => { const d = D.parseISO(s); return D.toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0)); };
  D.startOfYear = (s) => s.slice(0, 4) + '-01-01';
  D.endOfYear = (s) => s.slice(0, 4) + '-12-31';
  D.daysInMonth = (y, m) => new Date(y, m, 0).getDate(); // m is 1-12
  D.addMonths = (s, n) => { // clamps the day, e.g. Jan 31 + 1 month = Feb 28/29
    const [y, m, d] = s.split('-').map(Number); const t = new Date(y, m - 1 + n, 1);
    const ty = t.getFullYear(), tm = t.getMonth() + 1; return ty + '-' + p(tm) + '-' + p(Math.min(d, D.daysInMonth(ty, tm)));
  };
  D.addYears = (s, n) => D.addMonths(s, 12 * n);
  D.daysBetween = (a, b) => { const x = D.parseISO(a), y = D.parseISO(b); return Math.round((Date.UTC(y.getFullYear(), y.getMonth(), y.getDate()) - Date.UTC(x.getFullYear(), x.getMonth(), x.getDate())) / 864e5); };
  D.periodLabel = (kind, from) => { // short column label for a week/month/year starting at `from`
    const dt = D.parseISO(from);
    return kind === 'week' ? dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : kind === 'month' ? dt.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }) : String(dt.getFullYear());
  };
  D.compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  D.inRange = (s, from, to) => s >= from && s <= to;
  D.format = (s) => D.parseISO(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  DAT.DateUtils = D;
})(typeof window !== 'undefined' ? window : globalThis);
