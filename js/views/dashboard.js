// Dashboard: key numbers, today's activity, recent records, and comparison charts, all from the stored records.
(function () {
  const DAT = window.DAT, S = DAT.Stats, DU = DAT.DateUtils, C = DAT.Charts;
  DAT.views = DAT.views || {};
  const el = (tag, props, ...kids) => { const n = Object.assign(document.createElement(tag), props); kids.forEach((k) => n.append(k)); return n; };
  const state = { kind: 'month' };
  const KINDS = [['week', 'Weeks'], ['month', 'Months'], ['year', 'Years']], N = { week: 6, month: 6, year: 5 };
  const NOUN = { week: 'week', month: 'month', year: 'year' };

  function render(c) {
    const repo = DAT.repo, drivers = repo.getDrivers(), records = repo.getRecords(), today = DU.today(), d = S.dashboard(drivers, records, today);
    c.append(el('h1', { textContent: 'Dashboard' }), el('p', { className: 'sub', textContent: DU.parseISO(today).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }));
    if (!drivers.length) c.append(el('div', { className: 'panel' }, el('p', { className: 'empty' }, 'Nothing to show yet. ', el('a', { href: '#/drivers', textContent: 'Add your first driver' }), ' to start tracking.')));

    const tile = (label, value, note) => el('div', { className: 'tile' }, el('div', { className: 'tv' + (typeof value === 'string' && value.length > 6 ? ' text' : ''), textContent: value }), el('div', { className: 'tl', textContent: label }), note ? el('div', { className: 'tn', textContent: note }) : '');
    c.append(el('div', { className: 'tiles' },
      tile('Active drivers', d.activeDrivers), tile('Registered vehicles', d.vehicles, 'Assigned to active drivers'), tile('Drove today', d.droveToday.length),
      tile('Driving days this week', d.weekTotal), tile('Most active this week', d.mostActive.length ? d.mostActive.map((x) => x.name).join(', ') : '—', d.mostActive.length ? d.mostActiveDays + ' days' : 'No activity yet')));

    const today_ = el('div', { className: 'panel' }, el('h2', { textContent: 'Today' }));
    today_.append(d.droveToday.length ? el('ul', { className: 'plain' }, ...d.droveToday.map((x) => el('li', { textContent: x.name }))) : el('p', { className: 'empty', textContent: 'No driving recorded yet today.' }));
    if (d.idleToday.length) today_.append(el('p', { className: 'empty', textContent: d.idleToday.length + ' active driver' + (d.idleToday.length > 1 ? 's have' : ' has') + ' no record today.' }));
    const recent = el('div', { className: 'panel' }, el('h2', { textContent: 'Recent activity' }));
    recent.append(d.recent.length ? el('ul', { className: 'plain recent' }, ...d.recent.map((r) => el('li', {}, el('span', { className: 'empty', textContent: DU.format(r.date) }), el('span', { textContent: r.driver.name })))) : el('p', { className: 'empty', textContent: 'No records yet.' }),
      el('a', { href: '#/records', textContent: 'All records' }));
    c.append(el('div', { className: 'two' }, today_, recent));

    const chips = el('div', { className: 'chips' }), charts = el('div');
    c.append(el('div', { className: 'panel' }, el('div', { className: 'row bar' }, el('h2', { textContent: 'Activity comparison' }), chips), charts));
    function refresh() {
      chips.replaceChildren(...KINDS.map(([k, t]) => { const b = el('button', { type: 'button', className: 'chip' + (state.kind === k ? ' on' : ''), textContent: t }); b.setAttribute('aria-pressed', String(state.kind === k)); b.onclick = () => { state.kind = k; refresh(); }; return b; }));
      const k = state.kind, s = S.summary(drivers, records, S.rangeFor(k, today)), h = S.history(drivers, records, k, today, N[k]);
      const shown = s.rows.filter((r) => r.days > 0).slice(0, 10), hidden = s.rows.filter((r) => r.days > 0).length - shown.length;
      charts.replaceChildren(el('h3', { textContent: 'Driving days per driver, this ' + NOUN[k] }),
        shown.length ? C.hbars(shown.map((r) => ({ label: r.driver.name, value: r.days }))) : el('p', { className: 'empty', textContent: 'No driving recorded this ' + NOUN[k] + '.' }),
        hidden > 0 ? el('p', { className: 'empty', textContent: '+ ' + hidden + ' more driver' + (hidden > 1 ? 's' : '') + ' with fewer days' }) : '',
        el('h3', { className: 'gap', textContent: 'Total driving days, last ' + N[k] + ' ' + NOUN[k] + 's' }),
        h.totals.some((x) => x > 0) ? C.columns(h.periods.map((p, i) => ({ label: DU.periodLabel(k, p.from), value: h.totals[i] })), { title: 'Total driving days per ' + NOUN[k] }) : el('p', { className: 'empty', textContent: 'No driving recorded in this time span.' }));
    }
    refresh();
  }
  DAT.views.dashboard = { render };
})();
