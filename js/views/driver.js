// Driver profile (#/driver/<id>): details, week/month/year/all-time numbers, history chart and list of driving days.
(function () {
  const DAT = window.DAT, S = DAT.Stats, DU = DAT.DateUtils, C = DAT.Charts;
  DAT.views = DAT.views || {};
  const el = (tag, props, ...kids) => { const n = Object.assign(document.createElement(tag), props); kids.forEach((k) => n.append(k)); return n; };
  const state = { kind: 'month', limit: 25 }, N = { week: 12, month: 12, year: 5 };
  const KINDS = [['week', 'Weeks'], ['month', 'Months'], ['year', 'Years']], NOUN = { week: 'week', month: 'month', year: 'year' };
  const sign = (n) => (n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0');
  const cell = (tag, text, num) => el(tag, { textContent: text, className: num ? 'num' : '' });
  const wkday = (s) => DU.parseISO(s).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  function render(c, params) {
    const repo = DAT.repo, id = params && params[0] ? decodeURIComponent(params[0]) : '', driver = repo.getDriver(id);
    const back = el('a', { href: '#/drivers', className: 'back', textContent: 'Drivers' });
    if (!driver) return c.append(back, el('h1', { textContent: 'Driver not found' }), el('p', { className: 'sub', textContent: 'This driver may have been removed.' }));
    const records = repo.getRecords(), today = DU.today(), p = S.profile(driver, records, today);

    c.append(back, el('div', { className: 'title' }, el('h1', { textContent: driver.name }), el('span', { className: 'badge ' + (driver.status === 'Active' ? 'on' : ''), textContent: driver.status })));
    const kv = el('dl', { className: 'kv' });
    [['Assigned vehicle', driver.vehicle], ['Registration', driver.registration || '—'], ['Date added', DU.format(driver.createdAt)],
     ['First driving day', p.first ? DU.format(p.first) : '—'], ['Latest driving day', p.last ? DU.format(p.last) : '—']].forEach(([k, v]) => kv.append(el('dt', { textContent: k }), el('dd', { textContent: v })));
    c.append(el('div', { className: 'panel' }, el('h2', { textContent: 'Details' }), kv));

    const rows = [['This week', 'week', 'Last week'], ['This month', 'month', 'Last month'], ['This year', 'year', 'Last year']].map(([label, k]) => {
      const x = p.periods[k]; return el('tr', {}, cell('td', label), cell('td', x.days, true), cell('td', x.prev, true), cell('td', sign(x.change), true));
    });
    rows.push(el('tr', { className: 'total' }, cell('td', 'All time'), cell('td', p.total, true), cell('td', '—', true), cell('td', '—', true)));
    c.append(el('h2', { textContent: 'Driving days' }), el('div', { className: 'tbl-wrap' }, el('table', { className: 'tbl' },
      el('thead', {}, el('tr', {}, cell('th', 'Period'), cell('th', 'Days', true), cell('th', 'Previous period', true), cell('th', 'Change', true))), el('tbody', {}, ...rows))));

    const chips = el('div', { className: 'chips' }), chart = el('div');
    c.append(el('div', { className: 'panel gap' }, el('div', { className: 'row bar' }, el('h2', { textContent: 'Activity over time' }), chips), chart));
    function drawChart() {
      chips.replaceChildren(...KINDS.map(([k, t]) => { const b = el('button', { type: 'button', className: 'chip' + (state.kind === k ? ' on' : ''), textContent: t }); b.setAttribute('aria-pressed', String(state.kind === k)); b.onclick = () => { state.kind = k; drawChart(); }; return b; }));
      const k = state.kind, h = S.driverHistory(driver, records, k, today, N[k]);
      chart.replaceChildren(h.counts.some((x) => x > 0) ? C.columns(h.periods.map((per, i) => ({ label: DU.periodLabel(k, per.from), value: h.counts[i] })), { title: 'Driving days per ' + NOUN[k] + ' for ' + driver.name })
        : el('p', { className: 'empty', textContent: 'No driving recorded in the last ' + N[k] + ' ' + NOUN[k] + 's.' }));
    }
    drawChart();

    const hist = el('div', { className: 'panel' }, el('h2', { textContent: 'Activity history' })), list = el('div');
    hist.append(list); c.append(hist);
    function drawList() {
      const dates = [...p.dates].reverse(); // newest first
      if (!dates.length) return list.replaceChildren(el('p', { className: 'empty', textContent: 'No driving recorded yet.' }));
      const more = dates.length > state.limit ? el('button', { type: 'button', className: 'btn ghost', textContent: 'Show more (' + (dates.length - state.limit) + ' left)' }) : '';
      if (more) { more.onclick = () => { state.limit += 25; drawList(); }; more.style.marginTop = '12px'; }
      list.replaceChildren(el('ul', { className: 'plain' }, ...dates.slice(0, state.limit).map((d) => el('li', { textContent: wkday(d) }))), more);
    }
    state.limit = 25; drawList();
  }
  DAT.views.driver = { render };
})();
