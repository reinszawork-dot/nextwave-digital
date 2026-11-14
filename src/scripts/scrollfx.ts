/**
 * Scroll-driven motion. Everything is tied to scroll position (not one-off triggers), so it
 * plays forwards and backwards as you move through the page.
 * - Hero depth: the headline sinks and fades slower than the page; the app previews rise faster.
 * - Converge: grid pieces start scattered (left/right, tilted, smaller) and glide into one grid.
 * - Zoom: big panels grow into place.
 * - Read: the About quote lights up word by word.
 * - Assemble: the footer wordmark flies together letter by letter.
 * - Headings rise in word by word when they appear.
 * Uses the individual `translate` / `scale` / `rotate` properties, so it never fights the site's
 * own transform animations (floating previews, hover lifts). Off for reduced motion.
 */
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type Fx = 'slide' | 'pop' | 'bounce' | 'flip' | 'swing';
type Kind = 'converge' | 'zoom' | 'read' | 'assemble' | 'depth' | 'strip';
interface Item {
  el: HTMLElement;
  kind: Kind;
  top: number;
  h: number;
  i: number;
  n: number;
  speed: number;
  side: number;
  parts?: HTMLElement[];
  last: number;
  off?: number; // distance to just past the page edge on its side
  fx?: Fx; // how a converge piece arrives
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const back = (t: number) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2); // overshoots, then settles
const bounce = (t: number) => {
  const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
};
const elastic = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1);
const items: Item[] = [];

function add(el: HTMLElement, kind: Kind, extra: Partial<Item> = {}) {
  // Elements driven here must not also run the CSS reveal transition.
  if (kind === 'converge' || kind === 'zoom') { el.classList.remove('reveal'); el.classList.add('is-visible'); }
  el.classList.add('sfx', `sfx-${kind}`);
  items.push({ el, kind, top: 0, h: 0, i: 0, n: 1, speed: 0, side: 1, last: -1, ...extra });
}

/* Split text into spans, keeping inner elements (like the italic emphasis). */
function splitWords(root: HTMLElement, cls: string): HTMLElement[] {
  const out: HTMLElement[] = [];
  const walk = (node: Node) => {
    [...node.childNodes].forEach((ch) => {
      if (ch.nodeType === 3) {
        const parts = (ch.nodeValue || '').split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach((p) => {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
          const s = document.createElement('span');
          s.className = cls;
          s.textContent = p;
          frag.appendChild(s);
          out.push(s);
        });
        ch.parentNode!.replaceChild(frag, ch);
      } else if (ch.nodeType === 1 && !(ch as Element).matches('svg')) walk(ch);
    });
  };
  walk(root);
  return out;
}

function setup() {
  // Hero depth layers
  document.querySelectorAll<HTMLElement>('.hero .pill, .hero h1, .hero .lede, .hero .actions').forEach((el) => add(el, 'depth', { speed: 0.32 }));
  const floats: [string, number][] = [['.hero .f-main', -0.08], ['.hero .f-ring', -0.2], ['.hero .f-bars', -0.16], ['.hero .f-stat', -0.26]];
  floats.forEach(([sel, speed]) => document.querySelectorAll<HTMLElement>(sel).forEach((el) => add(el, 'depth', { speed })));

  // Hero app tiles: one wave that rolls across all six, in order
  const tiles = document.querySelectorAll<HTMLElement>('.product-strip .strip-item');
  tiles.forEach((el, i) => add(el, 'strip', { i, n: tiles.length }));

  // Pieces that converge into one grid
  // Each section arrives with its own personality
  const grids: [string, Fx | 'alt'][] = [['.products .cards', 'slide'], ['.kpi-row', 'pop'], ['.principles', 'bounce'], ['.feature-grid', 'alt'], ['.board', 'flip'], ['.pillars', 'swing']];
  grids.forEach(([sel, fx]) => {
    document.querySelectorAll<HTMLElement>(sel).forEach((grid) => {
      const kids = [...grid.children].filter((k): k is HTMLElement => k instanceof HTMLElement);
      kids.forEach((k, i) => {
        const f: Fx = fx === 'alt' ? (i % 2 ? 'bounce' : 'pop') : fx;
        if (f === 'flip') k.style.transformOrigin = '50% 100%'; // stands up from its base
        if (f === 'swing') k.style.transformOrigin = '50% 0'; // hangs from the top
        add(k, 'converge', { i, n: kids.length, fx: f });
      });
    });
  });

  // Panels that zoom into place
  document.querySelectorAll<HTMLElement>('.tabs[data-tabs], .vision-panel, .contact-card, .facts, .insight-board').forEach((el, i) => add(el, 'zoom', { side: i % 2 ? 1 : -1 }));
  document.querySelectorAll<HTMLElement>('.section-heading').forEach((el, i) => add(el, 'converge', { i, side: i % 2 ? 1 : -1 }));

  // Read-along quote
  document.querySelectorAll<HTMLElement>('.about-copy p').forEach((p) => add(p, 'read', { parts: splitWords(p, 'sfx-word') }));

  // Footer wordmark assembles letter by letter
  document.querySelectorAll<HTMLElement>('.wordmark').forEach((wm) => {
    const letters: HTMLElement[] = [];
    const walk = (node: Node) => {
      [...node.childNodes].forEach((ch) => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          [...(ch.nodeValue || '')].forEach((c) => {
            const s = document.createElement('span');
            s.className = 'sfx-letter';
            s.textContent = c;
            frag.appendChild(s);
            letters.push(s);
          });
          ch.parentNode!.replaceChild(frag, ch);
        } else walk(ch);
      });
    };
    walk(wm);
    add(wm, 'assemble', { parts: letters });
  });

  // Any remaining fade-up content also enters from the side of the page it sits on
  let n = 0;
  document.querySelectorAll<HTMLElement>('main .reveal').forEach((el) => {
    const moving = '.sfx-converge, .sfx-zoom, .sfx-strip, .sfx-depth';
    if (el.closest(moving) || el.querySelector(moving)) return; // a parent or child already moves it
    add(el, 'converge', { i: n++ });
  });

  // Headings rise in word by word (CSS handles the timing once .is-visible lands)
  document.querySelectorAll<HTMLElement>('.section-heading h2, .vision-panel h2, .insight h2').forEach((h) => {
    splitWords(h, 'sfx-hw').forEach((w, i) => {
      const inner = document.createElement('span');
      inner.textContent = w.textContent;
      w.textContent = '';
      w.appendChild(inner);
      w.style.setProperty('--w', String(i));
    });
    h.classList.add('sfx-heading');
  });
  const heads = document.querySelectorAll<HTMLElement>('.sfx-heading');
  if ('IntersectionObserver' in window) {
    const hio = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) e.target.classList.add('sfx-in');
      else if (e.boundingClientRect.top > 0) e.target.classList.remove('sfx-in');
    }), { rootMargin: '0px 0px -12% 0px' });
    heads.forEach((h) => hio.observe(h));
  } else heads.forEach((h) => h.classList.add('sfx-in'));
}

/* Where each element sits on the page, measured without our own motion applied. */
let maxScroll = 1;
function measure() {
  const sy = window.scrollY;
  // Clear every piece first, then read, then restore: one layout pass instead of one per piece,
  // and nested pieces (inside a zooming panel) are measured without their parent's motion.
  const saved = items.map((it) => { const s = it.el.style; const v = [s.translate, s.scale, s.rotate]; s.translate = s.scale = s.rotate = ''; return v; });
  maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  items.forEach((it, idx) => {
    const s = it.el.style;
    const r = it.el.getBoundingClientRect();
    it.top = r.top + sy;
    it.h = r.height;
    if (it.kind === 'converge') {
      const parent = it.el.parentElement!.getBoundingClientRect();
      const mid = r.left + r.width / 2 - (parent.left + parent.width / 2);
      // Two-column grids: left column comes from the left, right from the right.
      // Single column (phones): alternate sides.
      if (!it.el.classList.contains('section-heading')) it.side = Math.abs(mid) > 8 ? Math.sign(mid) : it.i % 2 === 0 ? -1 : 1;
    }
    // Start just past the screen edge on its own side (fully off the page)
    if (it.kind === 'converge' || it.kind === 'zoom') it.off = (it.side < 0 ? r.right : window.innerWidth - r.left) + 40;
    it.last = -1;
    void s; void idx;
  });
  items.forEach((it, idx) => { const s = it.el.style; [s.translate, s.scale, s.rotate] = saved[idx]; });
}

function frame() {
  const sy = window.scrollY;
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  for (const it of items) {
    const y = it.top - sy; // element top relative to the viewport
    const s = it.el.style;
    if (it.kind === 'depth') {
      if (sy > vh * 1.6 && it.last === 1) continue;
      // Text sinks and fades before the rising previews reach it; gentler on narrow screens.
      const speed = it.speed > 0 && vw < 700 ? it.speed * 0.6 : it.speed;
      s.translate = `0 ${(sy * speed).toFixed(1)}px`;
      if (it.speed > 0) {
        const op = clamp(1 - sy / (vh * (vw < 700 ? 0.38 : 0.6)));
        s.opacity = op.toFixed(3);
        s.pointerEvents = op < 0.15 ? 'none' : ''; // faded buttons shouldn't catch clicks
      }
      it.last = sy > vh * 1.6 ? 1 : 0;
      continue;
    }
    if (y > vh * 1.2 || y + it.h < -vh * 0.5) continue; // far off-screen
    if (it.kind === 'converge') {
      const raw = clamp((vh * 1.02 - y) / (vh * 0.7));
      if (Math.abs(raw - it.last) < 0.002) continue;
      it.last = raw;
      if (!it.fx || it.fx === 'slide') {
        const p = easeOut(raw), q = 1 - p;
        s.translate = `${(it.side * (it.off ?? vw * 0.6) * q).toFixed(1)}px ${((30 + (it.i % 3) * 18) * q).toFixed(1)}px`;
        s.rotate = `${(it.side * 16 * q).toFixed(2)}deg`;
        s.scale = (0.72 + 0.28 * p).toFixed(3);
        s.opacity = clamp(p * 1.25).toFixed(3);
        continue;
      }
      // Pieces in a row land one after another
      const t = clamp(raw * 1.45 - (it.i % 4) * 0.13);
      if (it.fx === 'pop') {
        s.scale = (0.25 + 0.75 * back(t)).toFixed(3);
        s.translate = `0 ${((1 - t) * 40).toFixed(1)}px`;
        s.rotate = `${(it.side * 10 * (1 - t)).toFixed(2)}deg`;
      } else if (it.fx === 'bounce') {
        s.translate = `0 ${(-160 * (1 - bounce(t))).toFixed(1)}px`;
        s.rotate = '0deg';
        s.scale = '1';
      } else if (it.fx === 'flip') {
        s.rotate = `x ${(75 * (1 - back(t))).toFixed(1)}deg`;
        s.translate = `0 ${((1 - t) * 50).toFixed(1)}px`;
        s.scale = '1';
      } else if (it.fx === 'swing') {
        s.rotate = `${(it.side * 38 * (1 - elastic(t))).toFixed(2)}deg`;
        s.translate = `0 ${((1 - t) * 30).toFixed(1)}px`;
        s.scale = '1';
      }
      s.opacity = clamp(t * 2.2).toFixed(3);
    } else if (it.kind === 'zoom') {
      const p = easeOut(clamp((vh * 1.02 - y) / (vh * 0.7)));
      if (Math.abs(p - it.last) < 0.002) continue;
      it.last = p;
      s.scale = (0.82 + 0.18 * p).toFixed(3);
      s.translate = `${(it.side * (it.off ?? vw * 0.45) * (1 - p)).toFixed(1)}px ${((1 - p) * 50).toFixed(1)}px`;
      s.opacity = clamp(0.2 + p).toFixed(3);
    } else if (it.kind === 'strip') {
      // Row progress; each tile starts a beat after the one before it. Tiles already on the first screen came in with the hero.
      const inRaw = it.top < vh * 0.98 ? 1 : clamp((vh * 1.02 - y) / (vh * 0.45));
      const outRaw = clamp((vh * 0.24 - y) / (vh * 0.34));
      const e = easeOut(clamp(inRaw * 1.6 - it.i * 0.12)); // entering, left to right
      const g = clamp(outRaw * 1.6 - (it.n - 1 - it.i) * 0.12); // leaving, right to left
      const key = e * 3 + g;
      if (Math.abs(key - it.last) < 0.002) continue;
      it.last = key;
      s.translate = `0 ${(70 * (1 - e) - 40 * Math.sin(Math.PI * e) - 60 * g).toFixed(1)}px`; // rides up over a crest, then settles
      s.rotate = `x ${(28 * (1 - e) - 20 * g).toFixed(1)}deg`;
      s.scale = (0.9 + 0.1 * e - 0.08 * g).toFixed(3);
      s.opacity = clamp(Math.min(e * 1.6, 1 - g * 1.2)).toFixed(3);
      s.setProperty('--land', (Math.sin(Math.PI * e) * (1 - g)).toFixed(3)); // its own colour flashes as it lands
    } else if (it.kind === 'read' && it.parts) {
      const p = clamp((vh * 0.85 - y) / (it.h + vh * 0.3));
      if (Math.abs(p - it.last) < 0.002) continue;
      it.last = p;
      const n = it.parts.length;
      it.parts.forEach((w, i) => { w.style.opacity = (0.16 + 0.84 * clamp(p * n * 1.15 - i)).toFixed(2); });
    } else if (it.kind === 'assemble' && it.parts) {
      const p = easeOut(clamp((vh - y) / Math.min(vh * 0.38, 220)));
      if (Math.abs(p - it.last) < 0.002) continue;
      it.last = p;
      const n = it.parts.length;
      it.parts.forEach((l, i) => {
        const q = 1 - clamp(p * 1.4 - (i / n) * 0.4);
        const c = i - (n - 1) / 2;
        l.style.translate = `${(c * 34 * q).toFixed(1)}px ${((i % 2 ? -1 : 1) * 70 * q).toFixed(1)}px`;
        l.style.rotate = `${((i % 2 ? 1 : -1) * 28 * q).toFixed(1)}deg`;
        l.style.opacity = (1 - q).toFixed(3);
      });
    }
  }
  // Page progress line
  bar.style.scale = `${clamp(sy / maxScroll).toFixed(4)} 1`;
}

let bar: HTMLElement;
let queued = false;
const schedule = () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; frame(); });
};

/* Pause decorative loops in sections that are off-screen. (A whole-page "scrolling" flag was tried
   and measured slower: toggling a class on <html> restyles the entire page.) */
if ('IntersectionObserver' in window) {
  const off = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('is-offscreen', !e.isIntersecting)), { rootMargin: '150px 0px' });
  document.querySelectorAll('main section, .site-footer').forEach((s) => off.observe(s));
}

if (!reduce) {
  bar = document.createElement('div');
  bar.className = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  setup();
  measure();
  frame();
  window.addEventListener('scroll', schedule, { passive: true });
  let t: number | undefined;
  const remeasure = () => { clearTimeout(t); t = window.setTimeout(() => { measure(); frame(); }, 120); };
  window.addEventListener('resize', remeasure);
  window.addEventListener('load', remeasure);
  document.fonts?.ready.then(remeasure);
  if ('ResizeObserver' in window) new ResizeObserver(remeasure).observe(document.body);
}
