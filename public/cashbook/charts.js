/* Charts (shared with Wisely) — tiny dependency-free animated SVG charts. */
(function (global) {
  'use strict';

  let tip;
  function tipEl() {
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'chart-tip';
      tip.setAttribute('role', 'status');
      document.body.appendChild(tip);
    }
    return tip;
  }
  function showTip(html, x, y) {
    const t = tipEl();
    t.innerHTML = html;
    t.classList.add('show');
    const r = t.getBoundingClientRect();
    let left = x - r.width / 2;
    left = Math.max(8, Math.min(window.innerWidth - r.width - 8, left));
    let top = y - r.height - 14;
    if (top < 8) top = y + 18;
    t.style.transform = `translate(${left}px, ${top}px)`;
  }
  function hideTip() { if (tip) tip.classList.remove('show'); }
  window.addEventListener('scroll', hideTip, { passive: true });

  function nice(v) {
    if (!isFinite(v) || v <= 0) return 1;
    const e = Math.pow(10, Math.floor(Math.log10(v)));
    const f = v / e;
    const n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return n * e;
  }

  // Smooth path through points without vertical overshoot.
  function smooth(pts) {
    if (!pts.length) return '';
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      const mx = (x0 + x1) / 2;
      d += ` C${mx.toFixed(1)},${y0.toFixed(1)} ${mx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
    }
    return d;
  }

  let gid = 0;
  const id = (p) => `${p}${++gid}`;

  function scaleY(values, P, H) {
    const maxV = Math.max(0, ...values);
    const minV = Math.min(0, ...values);
    const step = nice(((maxV - minV) * 1.06) / 4) || 1;
    const max = Math.max(step, Math.ceil(maxV / step) * step);
    const min = Math.floor(minV / step) * step;
    const y = (v) => P.t + ((max - v) / (max - min || 1)) * (H - P.t - P.b);
    return { max, min, step, y };
  }

  function gridAndAxis(W, H, P, sc, fmtAxis) {
    let g = '';
    const n = Math.round((sc.max - sc.min) / sc.step);
    for (let k = 0; k <= n; k++) {
      const v = sc.min + sc.step * k;
      const yy = sc.y(v).toFixed(1);
      g += `<line class="c-grid${Math.abs(v) < 1e-9 ? ' zero' : ''}" x1="${P.l}" x2="${W - P.r}" y1="${yy}" y2="${yy}"/>`;
      g += `<text class="c-axis" x="${P.l - 8}" y="${+yy + 4}" text-anchor="end">${fmtAxis(v)}</text>`;
    }
    return g;
  }

  function xLabels(labels, xAt, W, P, H, minGap = 54) {
    const n = labels.length;
    const fit = Math.max(1, Math.floor((W - P.l - P.r) / minGap));
    const step = Math.max(1, Math.ceil(n / fit));
    let s = '';
    labels.forEach((l, i) => {
      if (i % step === 0) s += `<text class="c-axis" x="${xAt(i).toFixed(1)}" y="${H - 8}" text-anchor="middle">${l}</text>`;
    });
    return s;
  }

  function localX(svg, evt) {
    const r = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    return ((evt.clientX - r.left) / r.width) * vb.width;
  }

  /** Line / area chart. o = {labels, series:[{name,color,values,dashed,fill}], fmt, fmtAxis, height, tipLabels} */
  function area(el, o) {
    const W = Math.max(260, el.clientWidth || 600);
    const H = o.height || 220;
    const P = { l: 48, r: 14, t: 14, b: 28 };
    const n = o.labels.length;
    const all = o.series.flatMap((s) => s.values.filter((v) => v != null));
    const sc = scaleY(all.length ? all : [0], P, H);
    const xAt = (i) => P.l + (n <= 1 ? (W - P.l - P.r) / 2 : (i * (W - P.l - P.r)) / (n - 1));
    const y0 = sc.y(Math.max(sc.min, 0));
    let defs = '', body = '';

    o.series.forEach((s) => {
      const pts = [];
      for (let i = 0; i < n; i++) { if (s.values[i] == null) break; pts.push([xAt(i), sc.y(s.values[i])]); }
      if (!pts.length) return;
      const d = smooth(pts);
      if (!s.dashed && s.fill !== false) {
        const g = id('g');
        defs += `<linearGradient id="${g}" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" style="stop-color:${s.color};stop-opacity:.32"/><stop offset="100%" style="stop-color:${s.color};stop-opacity:0"/></linearGradient>`;
        body += `<path class="c-area" d="${d} L${pts[pts.length - 1][0].toFixed(1)},${y0.toFixed(1)} L${pts[0][0].toFixed(1)},${y0.toFixed(1)} Z" fill="url(#${g})"/>`;
      }
      body += `<path class="c-line${s.dashed ? ' dashed' : ' c-draw'}" d="${d}" style="stroke:${s.color}"/>`;
      if (!s.dashed && o.endDot !== false) {
        const [lx, ly] = pts[pts.length - 1];
        body += `<circle class="c-enddot" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="4.5" style="fill:${s.color}"/>`;
      }
    });

    const cursor = `<g class="c-cursor"><line x1="0" x2="0" y1="${P.t}" y2="${H - P.b}"/>${o.series
      .map((s) => `<circle r="5" style="fill:${s.color}"/>`).join('')}</g>`;

    el.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${o.aria || 'Chart'}">
      <defs>${defs}</defs>${gridAndAxis(W, H, P, sc, o.fmtAxis)}${xLabels(o.labels, xAt, W, P, H)}${body}${cursor}
      <rect class="c-hit" x="${P.l}" y="0" width="${W - P.l - P.r}" height="${H}" fill="transparent"/></svg>`;

    const svg = el.querySelector('svg');
    const cur = svg.querySelector('.c-cursor');
    const line = cur.querySelector('line');
    const dots = cur.querySelectorAll('circle');
    const move = (e) => {
      const px = localX(svg, e);
      let i = n <= 1 ? 0 : Math.round(((px - P.l) / (W - P.l - P.r)) * (n - 1));
      i = Math.max(0, Math.min(n - 1, i));
      const x = xAt(i);
      line.setAttribute('x1', x); line.setAttribute('x2', x);
      let rows = '';
      o.series.forEach((s, k) => {
        const v = s.values[i];
        if (v == null) { dots[k].style.display = 'none'; return; }
        dots[k].style.display = '';
        dots[k].setAttribute('cx', x); dots[k].setAttribute('cy', sc.y(v));
        rows += `<div class="tip-row"><i style="background:${s.color}"></i>${s.name}<b>${o.fmt(v)}</b></div>`;
      });
      cur.classList.add('on');
      showTip(`<div class="tip-h">${(o.tipLabels || o.labels)[i]}</div>${rows}`, e.clientX, svg.getBoundingClientRect().top + P.t);
    };
    const hit = svg.querySelector('.c-hit');
    hit.addEventListener('pointermove', move);
    hit.addEventListener('pointerdown', move);
    hit.addEventListener('pointerleave', () => { cur.classList.remove('on'); hideTip(); });
  }

  function roundedTop(x, y, w, h, r) {
    if (h <= 0) return '';
    r = Math.min(r, h, w / 2);
    return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
  }

  /** Grouped bar chart. o = {labels, series:[{name,color,values}], fmt, fmtAxis, height, active} */
  function bars(el, o) {
    const W = Math.max(260, el.clientWidth || 600);
    const H = o.height || 220;
    const P = { l: 48, r: 10, t: 14, b: 28 };
    const n = o.labels.length, m = o.series.length;
    const all = o.series.flatMap((s) => s.values);
    const sc = scaleY(all.length ? all.map(Math.abs) : [0], P, H);
    const gw = (W - P.l - P.r) / n;
    const gap = 4;
    const bw = Math.max(4, Math.min(26, (gw * 0.68 - gap * (m - 1)) / m));
    const xAt = (i) => P.l + gw * i + gw / 2;
    let body = '', hits = '';
    for (let i = 0; i < n; i++) {
      const start = xAt(i) - (bw * m + gap * (m - 1)) / 2;
      o.series.forEach((s, j) => {
        const v = Math.abs(s.values[i] || 0);
        const top = sc.y(v), h = sc.y(0) - top;
        const d = roundedTop(start + j * (bw + gap), top, bw, h, 6);
        if (d) body += `<path class="c-bar${o.active === i ? ' active' : ''}" data-i="${i}" d="${d}" style="fill:${s.color};animation-delay:${i * 45 + j * 25}ms"/>`;
      });
      hits += `<rect class="c-hitg" data-i="${i}" x="${P.l + gw * i}" y="0" width="${gw}" height="${H}" fill="transparent"/>`;
    }
    el.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${o.aria || 'Bar chart'}">
      ${gridAndAxis(W, H, P, sc, o.fmtAxis)}${xLabels(o.labels, xAt, W, P, H, 34)}<g class="c-bars">${body}</g>${hits}</svg>`;
    const svg = el.querySelector('svg');
    const g = svg.querySelector('.c-bars');
    svg.querySelectorAll('.c-hitg').forEach((r) => {
      const i = +r.dataset.i;
      const show = (e) => {
        g.classList.add('hovering');
        g.querySelectorAll('.c-bar').forEach((b) => b.classList.toggle('hl', +b.dataset.i === i));
        const rows = o.series.map((s) => `<div class="tip-row"><i style="background:${s.color}"></i>${s.name}<b>${o.fmt(s.values[i] || 0)}</b></div>`).join('');
        const extra = o.tipExtra ? o.tipExtra(i) : '';
        showTip(`<div class="tip-h">${(o.tipLabels || o.labels)[i]}</div>${rows}${extra}`, e.clientX, svg.getBoundingClientRect().top + P.t);
      };
      r.addEventListener('pointermove', show);
      r.addEventListener('pointerdown', show);
      r.addEventListener('pointerleave', () => { g.classList.remove('hovering'); hideTip(); });
      if (o.onClick) r.addEventListener('click', () => o.onClick(i));
    });
  }

  /** Donut. o = {items:[{label,value,color}], fmt, size, thickness, centerLabel} */
  function donut(el, o) {
    const S = o.size || 200, sw = o.thickness || 22, c = S / 2;
    const r = (S - sw) / 2 - 6, C = 2 * Math.PI * r;
    const total = o.items.reduce((a, b) => a + b.value, 0);
    let off = 0, segs = '';
    if (total > 0) {
      o.items.forEach((it, i) => {
        const len = (it.value / total) * C;
        const gapLen = o.items.length > 1 ? Math.min(3, len * 0.35) : 0;
        segs += `<circle class="c-seg" data-i="${i}" cx="${c}" cy="${c}" r="${r}" style="stroke:${it.color};stroke-width:${sw}px;stroke-dasharray:0 ${C};transition-delay:${i * 70}ms" data-dash="${Math.max(0.01, len - gapLen)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 ${c} ${c})"/>`;
        off += len;
      });
    }
    el.innerHTML = `<div class="donut" style="width:${S}px;height:${S}px">
      <svg viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" role="img" aria-label="${o.aria || 'Breakdown'}">
        <circle class="c-track" cx="${c}" cy="${c}" r="${r}" style="stroke-width:${sw}px"/>${segs}</svg>
      <div class="donut-center"><div class="dc-v">${total > 0 ? o.fmt(total) : '—'}</div><div class="dc-l">${o.centerLabel || 'Total'}</div></div></div>`;
    const v = el.querySelector('.dc-v'), l = el.querySelector('.dc-l');
    const reset = () => { v.textContent = total > 0 ? o.fmt(total) : '—'; l.textContent = o.centerLabel || 'Total'; el.querySelectorAll('.c-seg').forEach((s) => s.classList.remove('dim', 'hl')); };
    const focus = (i) => {
      const it = o.items[i];
      v.textContent = o.fmt(it.value);
      l.textContent = `${it.label} · ${Math.round((it.value / total) * 100)}%`;
      el.querySelectorAll('.c-seg').forEach((s) => { s.classList.toggle('dim', +s.dataset.i !== i); s.classList.toggle('hl', +s.dataset.i === i); });
    };
    el.querySelectorAll('.c-seg').forEach((s) => {
      s.addEventListener('pointerenter', () => focus(+s.dataset.i));
      s.addEventListener('pointerleave', reset);
    });
    el._focus = focus; el._reset = reset;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.querySelectorAll('.c-seg').forEach((s) => { s.style.strokeDasharray = s.dataset.dash; });
    }));
  }

  /** Progress ring markup (animated by Charts.animate). */
  function ring(p, color, size = 56, sw = 6, label = '') {
    const r = (size - sw) / 2, C = 2 * Math.PI * r;
    const off = C * (1 - Math.max(0, Math.min(1, p)));
    return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
      <circle class="c-track" cx="${size / 2}" cy="${size / 2}" r="${r}" style="stroke-width:${sw}px"/>
      <circle class="c-ring" cx="${size / 2}" cy="${size / 2}" r="${r}" style="stroke:${color};stroke-width:${sw}px;stroke-dasharray:${C};stroke-dashoffset:${C}" data-off="${off}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
      ${label ? `<text x="50%" y="50%" dy=".35em" text-anchor="middle" class="ring-t">${label}</text>` : ''}</svg>`;
  }

  /** Sparkline markup. */
  function spark(values, color, w = 110, h = 34) {
    if (values.length < 2) return '';
    const max = Math.max(...values), min = Math.min(...values);
    const span = max - min || 1;
    const pts = values.map((v, i) => [(i / (values.length - 1)) * (w - 4) + 2, h - 3 - ((v - min) / span) * (h - 6)]);
    return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path class="c-line c-draw" d="${smooth(pts)}" style="stroke:${color};stroke-width:2px"/></svg>`;
  }

  /** Calendar heatmap. o = {start:'YYYY-MM-DD', values:[perDay from start], fmt, today:index|null} */
  function heatmap(el, o) {
    const [y, m, d0] = o.start.split('-').map(Number);
    const first = new Date(y, m - 1, d0);
    const n = o.values.length;
    const lead = (first.getDay() + 6) % 7;
    const max = Math.max(1, ...o.values);
    const wd = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => `<div class="hm-wd">${d}</div>`).join('');
    let cells = '';
    for (let i = 0; i < lead; i++) cells += '<div class="hm-cell blank"></div>';
    for (let i = 0; i < n; i++) {
      const date = new Date(y, m - 1, d0 + i);
      const v = o.values[i] || 0;
      const a = v > 0 ? 0.18 + 0.82 * Math.sqrt(v / max) : 0;
      cells += `<div class="hm-cell${o.today === i ? ' today' : ''}${o.today != null && i > o.today ? ' future' : ''}" data-i="${i}" style="animation-delay:${i * 14}ms"><span style="opacity:${a.toFixed(2)}"></span><em>${date.getDate()}</em></div>`;
    }
    el.innerHTML = `<div class="heatmap">${wd}${cells}</div>`;
    el.querySelectorAll('.hm-cell[data-i]').forEach((cell) => {
      const i = +cell.dataset.i;
      const show = () => {
        const r = cell.getBoundingClientRect();
        const label = new Date(y, m - 1, d0 + i).toLocaleDateString(document.documentElement.lang || undefined, { weekday: 'short', month: 'short', day: 'numeric' });
        showTip(`<div class="tip-h">${label}</div><div class="tip-row">Spent<b>${o.fmt(o.values[i] || 0)}</b></div>`, r.left + r.width / 2, r.top);
      };
      cell.addEventListener('pointerenter', show);
      cell.addEventListener('pointerdown', show);
      cell.addEventListener('pointerleave', hideTip);
    });
  }

  /** Kick off line-draw, ring and progress-bar animations inside root. */
  function animate(root) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.querySelectorAll('.c-draw').forEach((p) => {
      if (reduce) return;
      const L = p.getTotalLength();
      p.style.strokeDasharray = `${L} ${L}`;
      p.style.strokeDashoffset = L;
    });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      root.querySelectorAll('.c-draw').forEach((p) => { p.classList.add('drawn'); p.style.strokeDashoffset = 0; });
      root.querySelectorAll('.c-ring').forEach((c) => { c.style.strokeDashoffset = c.dataset.off; });
      root.querySelectorAll('[data-w]').forEach((b) => { b.style.width = b.dataset.w; });
    }));
  }

  global.Charts = { area, bars, donut, ring, spark, heatmap, animate, hideTip };
})(window);
