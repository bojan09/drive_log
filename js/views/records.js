// Records view: quick entry (driver + date), filterable history, edit and delete.
(function () {
  const DAT = window.DAT;
  DAT.views = DAT.views || {};
  const el = (tag, props, ...kids) => { const n = Object.assign(document.createElement(tag), props); kids.forEach((k) => n.append(k)); return n; };
  const state = { driver: '', limit: 50, lastDate: null };
  const label = (d) => d.name + (d.status === 'Inactive' ? ' (inactive)' : '');
  const fmt = (s) => DAT.DateUtils.parseISO(s).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const select = (drivers, value) => { const s = el('select', { className: 'input' }, ...drivers.map((d) => el('option', { value: d.id, textContent: label(d) }))); if (value) s.value = value; return s; };
  const field = (text, input) => el('label', { className: 'field' }, el('span', { textContent: text }), input);
  const byName = (a, b) => a.name.localeCompare(b.name);

  function openEdit(rec, drivers, onDone) {
    const dlg = el('dialog', { className: 'dlg' });
    dlg.setAttribute('aria-label', 'Edit record');
    const who = select([...drivers].sort(byName), rec.driverId);
    const date = el('input', { type: 'date', required: true, className: 'input', value: rec.date });
    const err = el('p', { className: 'err', role: 'alert' });
    const cancel = el('button', { type: 'button', className: 'btn ghost', textContent: 'Cancel' });
    cancel.onclick = () => dlg.close();
    const form = el('form', {}, el('h2', { textContent: 'Edit record' }), field('Driver', who), field('Date', date), err,
      el('div', { className: 'row end' }, cancel, el('button', { type: 'submit', className: 'btn', textContent: 'Save changes' })));
    form.onsubmit = (e) => {
      e.preventDefault();
      try { DAT.repo.saveRecord({ ...rec, driverId: who.value, date: date.value }); dlg.close(); DAT.toast('Record updated'); onDone(); }
      catch (ex) { err.textContent = ex.message; }
    };
    dlg.append(form); dlg.addEventListener('close', () => dlg.remove());
    document.body.append(dlg); dlg.showModal(); date.focus();
  }

  function render(c) {
    const repo = DAT.repo, drivers = repo.getDrivers(), active = drivers.filter((d) => d.status === 'Active').sort(byName);
    c.append(el('h1', { textContent: 'Records' }), el('p', { className: 'sub', textContent: 'Record which driver drove on which day.' }));
    if (!drivers.length) {
      c.append(el('div', { className: 'panel' }, el('p', { className: 'empty', textContent: 'Add a driver before recording activity. ' }, el('a', { href: '#/drivers', textContent: 'Go to Drivers' }))));
      return;
    }
    const names = new Map(drivers.map((d) => [d.id, d]));
    const entry = el('div', { className: 'panel' }, el('h2', { textContent: 'Record driving' }));
    if (!active.length) entry.append(el('p', { className: 'empty', textContent: 'All drivers are inactive. Reactivate a driver to record new activity.' }));
    else {
      const who = select(active), date = el('input', { type: 'date', className: 'input', value: state.lastDate || DAT.DateUtils.today() });
      const add = el('button', { type: 'button', className: 'btn', textContent: 'Add record' });
      add.onclick = () => {
        try {
          repo.saveRecord({ driverId: who.value, date: date.value });
          state.lastDate = date.value; DAT.toast('Recorded ' + names.get(who.value).name + ' on ' + DAT.DateUtils.format(date.value)); refresh();
        } catch (e) { DAT.toast(e.message, true); }
      };
      entry.append(el('div', { className: 'entry' }, field('Driver', who), field('Date', date), add));
    }
    const filter = select([{ id: '', name: 'All drivers' }, ...[...drivers].sort(byName)], state.driver);
    filter.onchange = () => { state.driver = filter.value; state.limit = 50; refresh(); };
    const count = el('p', { className: 'sub' }), list = el('div');
    c.append(entry, el('div', { className: 'row bar' }, el('h2', { textContent: 'History' }), filter), count, list);

    function refresh() {
      const recs = repo.getRecords().filter((r) => !state.driver || r.driverId === state.driver)
        .sort((a, b) => b.date.localeCompare(a.date) || names.get(a.driverId).name.localeCompare(names.get(b.driverId).name));
      count.textContent = recs.length + ' record' + (recs.length === 1 ? '' : 's');
      if (!recs.length) return list.replaceChildren(el('p', { className: 'empty', textContent: 'No records yet.' }));
      const btn = (t, fn, cls) => { const b = el('button', { type: 'button', className: 'btn ghost sm ' + (cls || ''), textContent: t }); b.onclick = fn; return b; };
      const tb = el('tbody');
      recs.slice(0, state.limit).forEach((r) => tb.append(el('tr', {}, el('td', { textContent: fmt(r.date) }), el('td', { textContent: label(names.get(r.driverId)) }),
        el('td', { className: 'acts' }, btn('Edit', () => openEdit(r, drivers, refresh)),
          btn('Delete', () => { if (confirm('Delete the record for ' + names.get(r.driverId).name + ' on ' + DAT.DateUtils.format(r.date) + '?')) { try { repo.deleteRecord(r.id); DAT.toast('Record deleted'); refresh(); } catch (e) { DAT.toast(e.message, true); } } }, 'danger')))));
      const t = el('table', { className: 'tbl' }, el('thead', {}, el('tr', {}, ...['Date', 'Driver', ''].map((h) => el('th', { textContent: h })))), tb);
      const more = recs.length > state.limit ? el('button', { type: 'button', className: 'btn ghost', textContent: 'Show more (' + (recs.length - state.limit) + ' left)' }) : '';
      if (more) more.onclick = () => { state.limit += 50; refresh(); };
      list.replaceChildren(el('div', { className: 'tbl-wrap' }, t), more);
      if (more) more.style.marginTop = '12px';
    }
    refresh();
  }
  DAT.views.records = { render };
})();
