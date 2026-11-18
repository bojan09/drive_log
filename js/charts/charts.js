// Small chart helpers (no libraries). Both draw only from the data they are given.
(function (root) {
  const DAT = (root.DAT = root.DAT || {});
  const NS = 'http://www.w3.org/2000/svg';
  const C = {};
  const svg = (tag, attrs, text) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (text != null) n.textContent = text; return n; };
  const html = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  // Whole-number axis: smallest 1/2/5 x 10^k step that gives at most 5 intervals.
  C.scale = (max) => {
    const m = Math.max(1, max);
    for (let p = 1; ; p *= 10) for (const k of [1, 2, 5]) { const step = k * p; if (m / step <= 5) return { step, top: Math.ceil(m / step) * step }; }
  };

  // Horizontal bars built from HTML so labels stay readable on phones. items: [{label, value}]
  C.hbars = (items) => {
    const max = Math.max(1, ...items.map((i) => i.value)), wrap = html('div', 'hbars');
    items.forEach((i) => {
      const bar = html('div', 'hb-bar'); bar.style.width = (i.value / max) * 100 + '%';
      wrap.append(html('span', 'hb-label', i.label), html('div', 'hb-track', null), html('span', 'hb-val', i.value));
      wrap.children[wrap.children.length - 2].append(bar);
    });
    return wrap;
  };

  // Vertical columns (SVG). items: [{label, value}]; the last item is highlighted as the current period.
  C.columns = (items, opts) => {
    const W = 360, H = 190, l = 30, r = 8, t = 16, b = 26, { step, top } = C.scale(Math.max(0, ...items.map((i) => i.value)));
    const root_ = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', role: 'img', 'aria-label': (opts && opts.title) || 'Column chart' });
    root_.append(svg('title', {}, (opts && opts.title) || 'Column chart'));
    const y = (v) => t + (H - t - b) * (1 - v / top);
    for (let v = 0; v <= top; v += step) { root_.append(svg('line', { x1: l, x2: W - r, y1: y(v), y2: y(v), class: 'c-grid' }), svg('text', { x: l - 6, y: y(v) + 4, class: 'c-txt c-end' }, v)); }
    const slot = (W - l - r) / items.length, bw = Math.min(40, slot * 0.6);
    items.forEach((it, i) => {
      const x = l + slot * i + (slot - bw) / 2, last = i === items.length - 1;
      if (it.value > 0) root_.append(svg('rect', { x, y: y(it.value), width: bw, height: y(0) - y(it.value), rx: 2, class: 'c-bar' + (last ? ' cur' : '') }, null));
      if (it.value > 0) root_.append(svg('text', { x: x + bw / 2, y: y(it.value) - 4, class: 'c-txt c-mid' }, it.value));
      if ((items.length - 1 - i) % (slot < 44 ? 2 : 1) === 0) root_.append(svg('text', { x: x + bw / 2, y: H - 8, class: 'c-txt c-mid' }, it.label)); // thin out labels when crowded
    });
    return root_;
  };
  DAT.Charts = C;
})(typeof window !== 'undefined' ? window : globalThis);
