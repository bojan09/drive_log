// App shell: theme, hash router, toast, and the Settings view (backup/restore).
(function () {
  const DAT = window.DAT;
  const THEME_KEY = 'driverActivityTracker.theme';
  const $ = (s) => document.querySelector(s);
  const el = (tag, props, ...kids) => { const n = Object.assign(document.createElement(tag), props); kids.forEach((k) => n.append(k)); return n; };

  DAT.repo = DAT.Storage.createRepository(DAT.Storage.LocalStorageAdapter());

  let toastTimer;
  DAT.toast = (msg, isError) => {
    const t = $('#toast');
    t.textContent = msg; t.className = 'show' + (isError ? ' error' : '');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.className = ''), 3500);
  };

  const applyTheme = (t) => {
    document.documentElement.dataset.theme = t;
    $('#themeBtn').textContent = t === 'dark' ? 'Light theme' : 'Dark theme';
    try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* ignore */ }
  };
  $('#themeBtn').addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  applyTheme(document.documentElement.dataset.theme || 'light');

  // Views: later phases register into DAT.views[name] = { render(container) }.
  DAT.views = DAT.views || {};
  const pending = { dashboard: ['Dashboard', 5], drivers: ['Drivers', 2], records: ['Records', 3], statistics: ['Statistics', 4] };
  function placeholder(name) {
    const [title, phase] = pending[name];
    return { render(c) { c.append(el('h1', { textContent: title }), el('p', { className: 'sub', textContent: 'Coming in Phase ' + phase + '.' })); } };
  }

  DAT.views.settings = {
    render(c) {
      const repo = DAT.repo, drivers = repo.getDrivers().length, records = repo.getRecords().length;
      c.append(el('h1', { textContent: 'Settings' }), el('p', { className: 'sub', textContent: 'Back up or restore your data. Everything is stored in this browser.' }));
      repo.warnings.forEach((w) => c.append(el('div', { className: 'warn', textContent: w })));

      const stored = el('div', { className: 'panel' }, el('h2', { textContent: 'Stored data' }));
      const kv = el('dl', { className: 'kv' });
      [['Drivers', drivers], ['Driving records', records]].forEach(([k, v]) => kv.append(el('dt', { textContent: k }), el('dd', { textContent: v })));
      stored.append(kv);

      const backup = el('div', { className: 'panel' }, el('h2', { textContent: 'Backup' }));
      backup.append(el('p', { className: 'empty', textContent: 'Export saves a JSON file. Import replaces all current data with the file’s contents.' }));
      const exportBtn = el('button', { className: 'btn', type: 'button', textContent: 'Export data' });
      exportBtn.onclick = () => {
        const blob = new Blob([JSON.stringify(repo.exportData(), null, 2)], { type: 'application/json' });
        const a = el('a', { href: URL.createObjectURL(blob), download: 'driver-activity-backup-' + DAT.DateUtils.today() + '.json' });
        document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        DAT.toast('Backup exported');
      };
      const file = el('input', { type: 'file', accept: 'application/json,.json', hidden: true });
      const importBtn = el('button', { className: 'btn ghost', type: 'button', textContent: 'Import data' });
      importBtn.onclick = () => file.click();
      file.onchange = async () => {
        const f = file.files[0]; file.value = '';
        if (!f) return;
        try {
          if (f.size > 10 * 1024 * 1024) throw new Error('That file is larger than 10 MB, so it is not a backup from this app.');
          const obj = JSON.parse(await f.text());
          const pre = repo.previewImport(obj);
          if (pre.error) throw new Error(pre.error);
          const bad = pre.skippedDrivers + pre.skippedRecords;
          if (!confirm('Replace all current data (' + drivers + ' drivers, ' + records + ' records) with the file’s ' + pre.drivers + ' drivers and ' + pre.records + ' records?' + (bad ? '\n' + bad + ' invalid or duplicate items will be skipped.' : '') + '\nThis cannot be undone; export first if unsure.')) return;
          const r = repo.importData(obj);
          const skipped = r.skippedDrivers + r.skippedRecords;
          DAT.toast('Imported ' + r.drivers + ' drivers and ' + r.records + ' records' + (skipped ? ' (' + skipped + ' invalid or duplicate items skipped)' : ''));
          route();
        } catch (e) { DAT.toast(e instanceof SyntaxError ? 'That file is not valid JSON.' : e.message, true); }
      };
      backup.append(el('div', { className: 'row' }, exportBtn, importBtn, file));
      const raw = repo.getCorruptBackup();
      if (raw) {
        const dl = el('button', { className: 'btn ghost', type: 'button', textContent: 'Download unreadable saved copy' });
        dl.onclick = () => { const a = el('a', { href: URL.createObjectURL(new Blob([raw], { type: 'application/json' })), download: 'driver-activity-unreadable-copy.json' }); document.body.append(a); a.click(); a.remove(); };
        backup.append(el('p', { className: 'empty', textContent: 'A copy of data the app could not load is still in this browser.' }), dl);
      }
      c.append(stored, backup);
    },
  };

  $('#skip').addEventListener('click', (e) => { e.preventDefault(); $('#view').focus(); });
  let first = true;
  function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/'), name = parts[0] || 'dashboard';
    const key = DAT.views[name] || pending[name] ? name : 'dashboard';
    const view = DAT.views[key] || placeholder(key);
    document.querySelectorAll('#nav a').forEach((a) => { const on = a.dataset.route === (key === 'driver' ? 'drivers' : key); a.classList.toggle('active', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
    const main = $('#view'); main.replaceChildren();
    if (DAT.repo.warnings.length && !DAT.bannerDismissed) {
      const x = el('button', { className: 'btn ghost sm', type: 'button', textContent: 'Dismiss' }); x.onclick = () => { DAT.bannerDismissed = true; route(); };
      main.append(el('div', { className: 'banner', role: 'alert' }, el('span', { textContent: DAT.repo.warnings[0] + ' Open Settings to download that copy.' }), x));
    }
    view.render(main, parts.slice(1));
    document.title = ((main.querySelector('h1') || {}).textContent || 'Dashboard') + ' – Driver Activity Tracker';
    if (!first) main.focus({ preventScroll: true });
    first = false;
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('storage', (e) => { if (e.key === DAT.Storage.KEY) { DAT.repo.reload(); route(); } }); // another tab changed the data
  route();
})();
