/**
 * Site-wide interactions. One small module, loaded once per page.
 * Everything degrades gracefully: content and charts are fully rendered on the server.
 */
import { formatValue, type Unit } from '../lib/chart';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------ */
/* Count-up numbers                                                    */
/* ------------------------------------------------------------------ */
function runCounter(el: HTMLElement) {
  const target = Number(el.dataset.count);
  const unit: Unit = JSON.parse(el.dataset.unit || '{}');
  if (reduceMotion || !Number.isFinite(target)) {
    el.textContent = formatValue(target, unit);
    return;
  }
  const duration = 1400;
  const start = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = formatValue(target * eased, unit);
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ------------------------------------------------------------------ */
/* Reveal on scroll (sections, charts, counters)                       */
/* ------------------------------------------------------------------ */
function activate(el: Element) {
  el.classList.add('is-visible');
  if (el instanceof HTMLElement && el.dataset.count !== undefined) runCounter(el);
  // A chart animates its own centre number (e.g. a ring's value) together with it.
  if (el.matches('[data-chart]')) el.querySelectorAll<HTMLElement>('[data-count]').forEach(runCounter);
}

const io =
  'IntersectionObserver' in window
    ? new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            activate(e.target);
            io!.unobserve(e.target);
          }
        },
        { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
      )
    : null;

function observe(root: ParentNode = document) {
  const els = root.querySelectorAll('.reveal, [data-chart], [data-count]:not([data-chart] [data-count])');
  els.forEach((el) => (io ? io.observe(el) : activate(el)));
}
observe();

/* ------------------------------------------------------------------ */
/* Line charts: crosshair + tooltip (pointer and keyboard)             */
/* ------------------------------------------------------------------ */
interface LinePayload {
  labels: string[];
  min?: number;
  max: number;
  unit: Unit;
  series: { label: string; values: number[]; color: string }[];
}

document.querySelectorAll<HTMLElement>('[data-chart="line"]').forEach((chart) => {
  const plot = chart.querySelector<HTMLElement>('[data-plot]');
  const tip = chart.querySelector<HTMLElement>('.lc-tip');
  const dots = chart.querySelectorAll<HTMLElement>('.lc-dot');
  if (!plot || !tip) return;
  const data: LinePayload = JSON.parse(chart.dataset.payload || '{}');
  const n = data.labels.length;
  let idx = n - 1;

  const show = (i: number) => {
    idx = Math.max(0, Math.min(n - 1, i));
    const x = n === 1 ? 50 : (idx / (n - 1)) * 100;
    plot.style.setProperty('--x', `${x}%`);
    plot.style.setProperty('--tx', x < 18 ? '-8%' : x > 82 ? '-92%' : '-50%');
    data.series.forEach((s, si) => {
      const d = dots[si];
      if (!d) return;
      d.style.left = `${x}%`;
      const lo = data.min ?? 0;
      d.style.top = `${(1 - (s.values[idx] - lo) / (data.max - lo)) * 100}%`;
    });
    tip.innerHTML =
      `<b>${data.labels[idx]}</b>` +
      data.series
        .map((s) => `<div><i style="background:${s.color}"></i>${s.label}<span class="v">${formatValue(s.values[idx], data.unit)}</span></div>`)
        .join('');
    plot.classList.add('is-hovering');
  };
  const hide = () => plot.classList.remove('is-hovering');

  const fromPointer = (e: PointerEvent) => {
    const r = plot.getBoundingClientRect();
    show(Math.round(((e.clientX - r.left) / r.width) * (n - 1)));
  };
  plot.addEventListener('pointermove', fromPointer);
  plot.addEventListener('pointerdown', fromPointer);
  plot.addEventListener('pointerleave', hide);

  plot.tabIndex = 0;
  plot.setAttribute('role', 'group');
  plot.setAttribute('aria-label', 'Chart: use left and right arrow keys to read values');
  plot.addEventListener('focus', () => show(idx));
  plot.addEventListener('blur', hide);
  plot.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { show(idx + 1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { show(idx - 1); e.preventDefault(); }
    else if (e.key === 'Home') { show(0); e.preventDefault(); }
    else if (e.key === 'End') { show(n - 1); e.preventDefault(); }
  });
});

/* ------------------------------------------------------------------ */
/* Bar charts: switch between views                                    */
/* ------------------------------------------------------------------ */
document.querySelectorAll<HTMLElement>('[data-chart="bar"]').forEach((chart) => {
  const views: { key: string; values: number[]; max: number; unit: Unit }[] = JSON.parse(chart.dataset.payload || '[]');
  const buttons = chart.querySelectorAll<HTMLButtonElement>('[data-view]');
  const items = chart.querySelectorAll<HTMLElement>('.bc-item');
  const names = Array.from(items).map((li) => (li.getAttribute('aria-label') || '').split(':')[0]);

  buttons.forEach((btn) =>
    btn.addEventListener('click', () => {
      const v = views[Number(btn.dataset.view)];
      if (!v) return;
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      const top = v.values.indexOf(Math.max(...v.values));
      items.forEach((li, i) => {
        li.style.setProperty('--v', `${(v.values[i] / v.max) * 100}%`);
        li.style.setProperty('--d', '0ms');
        const label = formatValue(v.values[i], v.unit);
        li.setAttribute('aria-label', `${names[i]}: ${label}`);
        const tipEl = li.querySelector('.bc-tip');
        if (tipEl) tipEl.textContent = label;
        if (li.classList.contains('top') || chart.dataset.highlight) li.classList.toggle('top', i === top);
      });
    }),
  );
  if (chart.querySelector('.bc-item.top')) chart.dataset.highlight = '1';
});

/* ------------------------------------------------------------------ */
/* Tabs (product showcase)                                             */
/* ------------------------------------------------------------------ */
document.querySelectorAll<HTMLElement>('[data-tabs]').forEach((tabs) => {
  const list = Array.from(tabs.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const select = (tab: HTMLButtonElement, focus = false) => {
    list.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls') || '');
      if (!panel) return;
      panel.hidden = !on;
      if (on) {
        // Replay the chart and counter animations for the newly shown view.
        const animated = panel.querySelectorAll<HTMLElement>('[data-chart], [data-count]');
        animated.forEach((el) => el.classList.remove('is-visible'));
        panel.classList.remove('panel-in');
        void panel.offsetWidth;
        panel.classList.add('panel-in');
        requestAnimationFrame(() =>
          requestAnimationFrame(() => animated.forEach((el) => (el.matches('[data-chart]') || !el.closest('[data-chart]')) && activate(el))),
        );
      }
    });
    tabs.style.setProperty('--tab-accent', tab.dataset.accent || 'var(--accent)');
    if (focus) tab.focus();
  };
  list.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const k = e.key;
      if (k !== 'ArrowRight' && k !== 'ArrowLeft' && k !== 'Home' && k !== 'End') return;
      e.preventDefault();
      const next = k === 'Home' ? 0 : k === 'End' ? list.length - 1 : (i + (k === 'ArrowRight' ? 1 : -1) + list.length) % list.length;
      select(list[next], true);
    });
  });
});

/* ------------------------------------------------------------------ */
/* Cursor spotlight on cards                                           */
/* ------------------------------------------------------------------ */
if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
  document.querySelectorAll<HTMLElement>('[data-spotlight]').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });
}

/* ------------------------------------------------------------------ */
/* Navigation progress bar for page-to-page links                      */
/* ------------------------------------------------------------------ */
const bar = document.querySelector<HTMLElement>('.nav-progress');
document.addEventListener('click', (e) => {
  if (!bar || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = (e.target as Element).closest?.('a[href]') as HTMLAnchorElement | null;
  if (!a || a.target || a.hasAttribute('download')) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || url.pathname === location.pathname) return;
  bar.classList.add('is-active');
});
window.addEventListener('pageshow', () => bar?.classList.remove('is-active'));
