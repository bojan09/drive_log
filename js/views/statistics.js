// Statistics view: period filter, per-driver ranking with previous-period comparison, daily lists, history.
(function () {
  const DAT = window.DAT, S = DAT.Stats, DU = DAT.DateUtils;
  DAT.views = DAT.views || {};
  const el = (tag, props, ...kids) => { const n = Object.assign(document.createElement(tag), props); kids.forEach((k) => n.append(k)); return n; };
  const KINDS = [['today', 'Today'], ['week', 'This week'], ['month', 'This month'], ['year', 'This year'], ['all', 'All time'], ['custom', 'Custom']];
  const PREV = { today: 'Yesterday', week: 'Last week', month: 'Last month', year: 'Last year', custom: 'Previous period' };
  const state = { kind: 'week', from: DU.startOfMonth(DU.today()), to: DU.today() };
  const sign = (n) => (n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0');
  const nm = (d) => d.name + (d.status === 'Inactive' ? ' (inactive)' : '');
  const cell = (tag, text, num) => el(tag, { textContent: text, className: num ? 'num' : '' });
  const table = (head, body) => el('div', { className: 'tbl-wrap' }, el('table', { className: 'tbl' }, el('thead', {}, el('tr', {}, ...head)), el('tbody', {}, ...body)));
  const short = (kind, p) => DU.periodLabel(kind, p.from);
  const list = (title, drivers, empty) => el('div', { className: 'panel' }, el('h2', { textContent: title + ' (' + drivers.length + ')' }),
    drivers.length ? el('ul', { className: 'plain' }, ...drivers.map((d) => el('li', { textContent: d.name }))) : el('p', { className: 'empty', textContent: empty }));

  function render(c) {
    const chips = el('div', { className: 'chips wrap' });
    const from = el('input', { type: 'date', className: 'input', value: state.from }), to = el('input', { type: 'date', className: 'input', value: state.to });
    from.setAttribute('aria-label', 'Start date'); to.setAttribute('aria-label', 'End date');
    from.onchange = () => { state.from = from.value; refresh(); }; to.onchange = () => { state.to = to.value; refresh(); };
    const custom = el('div', { className: 'row bar' }, from, el('span', { className: 'empty', textContent: 'to' }), to);
    const body = el('div');
    c.append(el('h1', { textContent: 'Statistics' }), el('p', { className: 'sub', textContent: 'Driving days are counted from the records: one driver on one date is one day.' }), chips, custom, body);

    function refresh() {
      chips.replaceChildren(...KINDS.map(([k, t]) => { const b = el('button', { type: 'button', className: 'chip' + (state.kind === k ? ' on' : ''), textContent: t }); b.setAttribute('aria-pressed', String(state.kind === k)); b.onclick = () => { state.kind = k; refresh(); }; return b; }));
      custom.hidden = state.kind !== 'custom';
      body.replaceChildren();
      const drivers = DAT.repo.getDrivers(), records = DAT.repo.getRecords();
      if (!drivers.length) return body.append(el('p', { className: 'empty' }, 'No drivers yet. ', el('a', { href: '#/drivers', textContent: 'Add a driver' })));
      let range;
      try { range = S.rangeFor(state.kind, null, { from: state.from, to: state.to }); } catch (e) { return body.append(el('p', { className: 'err', textContent: e.message })); }
      body.append(el('h2', { textContent: range.label }));

      if (state.kind === 'today') {
        const d = S.daily(drivers, records, range.from);
        return body.append(el('div', { className: 'two' }, list('Drove today', d.drove, 'Nobody has a record for today.'), list('No activity today', d.none, 'Every active driver has a record for today.')));
      }
      const s = S.summary(drivers, records, range);
      const kv = el('dl', { className: 'kv' }, el('dt', { textContent: 'Total driving days' }), el('dd', { textContent: s.total + (s.prev ? ' (' + PREV[state.kind].toLowerCase() + ': ' + s.prevTotal + ', ' + sign(s.total - s.prevTotal) + ')' : '') }),
        el('dt', { textContent: 'Most active' }), el('dd', { textContent: s.mostActive.length ? s.mostActive.map((d) => d.name).join(', ') + ' (' + s.rows[0].days + ' days)' : 'No activity in this period' }));
      body.append(el('div', { className: 'panel' }, kv));
      const head = [cell('th', '#', true), cell('th', 'Driver'), cell('th', 'Days', true)];
      if (s.prev) head.push(cell('th', PREV[state.kind], true), cell('th', 'Change', true));
      body.append(table(head, s.rows.map((r) => el('tr', {}, cell('td', r.rank, true), el('td', {}, el('a', { href: '#/driver/' + encodeURIComponent(r.driver.id), textContent: nm(r.driver) })), cell('td', r.days, true), ...(s.prev ? [cell('td', r.prev, true), cell('td', sign(r.change), true)] : [])))));

      const n = { week: 6, month: 6, year: 5 }[state.kind], h = n && S.history(drivers, records, state.kind, null, n);
      if (h) body.append(el('h2', { className: 'gap', textContent: 'Last ' + n + ' ' + state.kind + 's' + (state.kind === 'week' ? ' (week starting Monday)' : '') }),
        table([cell('th', 'Driver'), ...h.periods.map((p) => cell('th', short(state.kind, p), true))],
          [...h.rows.map((r) => el('tr', {}, el('td', {}, el('a', { href: '#/driver/' + encodeURIComponent(r.driver.id), textContent: nm(r.driver) })), ...r.counts.map((x) => cell('td', x, true)))), el('tr', { className: 'total' }, cell('td', 'Total'), ...h.totals.map((x) => cell('td', x, true)))]));
    }
    refresh();
  }
  DAT.views.statistics = { render };
})();
