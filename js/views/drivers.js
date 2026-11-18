// Drivers view: list, search/filter, add/edit dialog, deactivate/reactivate, remove.
(function () {
  const DAT = window.DAT;
  DAT.views = DAT.views || {};
  const el = (tag, props, ...kids) => { const n = Object.assign(document.createElement(tag), props); kids.forEach((k) => n.append(k)); return n; };
  const state = { filter: 'All', query: '' };

  function openForm(driver, onDone) {
    const dlg = el('dialog', { className: 'dlg' });
    dlg.setAttribute('aria-label', driver ? 'Edit driver' : 'Add driver');
    const name = el('input', { type: 'text', required: true, maxLength: 80, className: 'input', value: driver ? driver.name : '' });
    const vehicle = el('input', { type: 'text', required: true, maxLength: 60, className: 'input', value: driver ? driver.vehicle : '' });
    const reg = el('input', { type: 'text', maxLength: 30, className: 'input', value: driver ? driver.registration || '' : '' });
    const status = el('select', { className: 'input' }, ...['Active', 'Inactive'].map((s) => el('option', { value: s, textContent: s })));
    if (driver) status.value = driver.status;
    const field = (label, input) => el('label', { className: 'field' }, el('span', { textContent: label }), input);
    const err = el('p', { className: 'err', role: 'alert' });
    const cancel = el('button', { type: 'button', className: 'btn ghost', textContent: 'Cancel' });
    cancel.onclick = () => dlg.close();
    const form = el('form', {}, el('h2', { textContent: driver ? 'Edit driver' : 'Add driver' }),
      field('Full name', name), field('Assigned vehicle', vehicle), field('Registration number (optional)', reg));
    if (driver) form.append(field('Status', status), el('p', { className: 'empty', textContent: 'Added ' + DAT.DateUtils.format(driver.createdAt) }));
    form.append(err, el('div', { className: 'row end' }, cancel, el('button', { type: 'submit', className: 'btn', textContent: driver ? 'Save changes' : 'Add driver' })));
    form.onsubmit = (e) => {
      e.preventDefault();
      try {
        DAT.repo.saveDriver({ ...(driver || {}), name: name.value, vehicle: vehicle.value, registration: reg.value, status: driver ? status.value : 'Active' });
        dlg.close(); DAT.toast(driver ? 'Driver updated' : 'Driver added'); onDone();
      } catch (ex) { err.textContent = ex.message; }
    };
    dlg.append(form);
    dlg.addEventListener('close', () => dlg.remove());
    document.body.append(dlg); dlg.showModal(); name.focus();
  }

  function render(c) {
    const repo = DAT.repo;
    const addBtn = el('button', { className: 'btn', type: 'button', textContent: 'Add driver' });
    addBtn.onclick = () => openForm(null, refresh);
    const chips = el('div', { className: 'chips' });
    const search = el('input', { type: 'search', className: 'input', placeholder: 'Search name, vehicle or registration', value: state.query });
    search.setAttribute('aria-label', 'Search drivers');
    search.oninput = () => { state.query = search.value; refresh(); };
    const list = el('div');
    c.append(el('div', { className: 'head' }, el('div', {}, el('h1', { textContent: 'Drivers' }), el('p', { className: 'sub', textContent: 'Manage drivers and their assigned vehicles.' })), addBtn),
      el('div', { className: 'row bar' }, chips, search), list);

    const attempt = (fn, msg) => { try { fn(); if (msg) DAT.toast(msg); refresh(); } catch (e) { DAT.toast(e.message, true); } };
    function remove(d) {
      const n = repo.getRecords().filter((r) => r.driverId === d.id).length;
      const ok = n ? confirm(d.name + ' has ' + n + ' driving record' + (n > 1 ? 's' : '') + '. Deactivating keeps that history; deleting removes the driver and all their records permanently. Delete anyway?')
                   : confirm('Remove ' + d.name + '? This cannot be undone.');
      if (ok) attempt(() => repo.deleteDriver(d.id, { withRecords: true }), 'Driver removed');
    }
    function table(rows) {
      const btn = (text, fn, cls) => { const b = el('button', { type: 'button', className: 'btn ghost sm ' + (cls || ''), textContent: text }); b.onclick = fn; return b; };
      const lab = (l, n) => { n.setAttribute('data-label', l); return n; }; // labels shown on phones, where rows stack as cards
      const t = el('table', { className: 'tbl stack' }, el('thead', {}, el('tr', {}, ...['Name', 'Vehicle', 'Registration', 'Status', 'Added', ''].map((h) => el('th', { textContent: h })))));
      const tb = el('tbody');
      rows.forEach((d) => tb.append(el('tr', {},
        el('td', {}, el('a', { href: '#/driver/' + encodeURIComponent(d.id), textContent: d.name })), lab('Vehicle', el('td', { textContent: d.vehicle })), lab('Registration', el('td', { textContent: d.registration || '—' })),
        lab('Status', el('td', {}, el('span', { className: 'badge ' + (d.status === 'Active' ? 'on' : ''), textContent: d.status }))),
        lab('Added', el('td', { textContent: DAT.DateUtils.format(d.createdAt) })),
        el('td', { className: 'acts' },
          btn('Edit', () => openForm(d, refresh)),
          btn(d.status === 'Active' ? 'Deactivate' : 'Reactivate', () => attempt(() => repo.saveDriver({ ...d, status: d.status === 'Active' ? 'Inactive' : 'Active' }), d.status === 'Active' ? 'Driver deactivated' : 'Driver reactivated')),
          btn('Remove', () => remove(d), 'danger')))));
      t.append(tb);
      return el('div', { className: 'tbl-wrap' }, t);
    }
    function refresh() {
      const all = repo.getDrivers().sort((a, b) => a.name.localeCompare(b.name));
      chips.replaceChildren(...['All', 'Active', 'Inactive'].map((f) => {
        const n = f === 'All' ? all.length : all.filter((d) => d.status === f).length;
        const b = el('button', { type: 'button', className: 'chip' + (state.filter === f ? ' on' : ''), textContent: f + ' ' + n }); b.setAttribute('aria-pressed', String(state.filter === f));
        b.onclick = () => { state.filter = f; refresh(); };
        return b;
      }));
      const q = state.query.trim().toLowerCase();
      const rows = all.filter((d) => (state.filter === 'All' || d.status === state.filter) && (!q || (d.name + ' ' + d.vehicle + ' ' + (d.registration || '')).toLowerCase().includes(q)));
      list.replaceChildren(!all.length ? el('p', { className: 'empty', textContent: 'No drivers yet. Add your first driver to start tracking.' })
        : !rows.length ? el('p', { className: 'empty', textContent: 'No drivers match your filters.' }) : table(rows));
    }
    refresh();
  }
  DAT.views.drivers = { render };
})();
