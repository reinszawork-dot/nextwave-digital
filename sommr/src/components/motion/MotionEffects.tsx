'use client';

import { useEffect } from 'react';

/**
 * Site-wide motion behaviours, attached once with delegated listeners so
 * server-rendered markup can opt in with plain attributes:
 *
 *   data-reveal[="fade"|"scale"|"image"]   fade/slide in when scrolled into view (stagger with style --i)
 *   .words[data-trigger="scroll"]           headline words rise when scrolled into view (see <WordReveal>)
 *   data-magnetic                           drifts gently toward the cursor
 *   data-tilt [data-tilt-glare]             tilts toward the cursor, with an optional soft glare
 *
 * Pointer effects only run on devices with a fine pointer that can hover, and
 * nothing runs when the person prefers reduced motion.
 */
export function MotionEffects() {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-motion', 'live');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    // ── Scroll reveals ──
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute('data-revealed', '');
          io.unobserve(e.target);
        }
      },
      { rootMargin: '0px 0px -7% 0px', threshold: 0.1 },
    );
    const seen = new WeakSet<Element>();
    const SELECTOR = '[data-reveal]:not([data-revealed]), .words[data-trigger="scroll"]:not([data-revealed])';
    const scan = (node: ParentNode | Element) => {
      if (node instanceof Element && node.matches(SELECTOR) && !seen.has(node)) {
        seen.add(node);
        io.observe(node);
      }
      node.querySelectorAll?.(SELECTOR).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        io.observe(el);
      });
    };
    scan(document);
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) m.addedNodes.forEach((n) => n instanceof Element && scan(n));
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // ── Magnetic buttons and tilting cards ──
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    let frame = 0;
    let pending: PointerEvent | null = null;
    let magnet: HTMLElement | null = null;
    let tilt: HTMLElement | null = null;

    const release = (el: HTMLElement | null, kind: 'magnet' | 'tilt') => {
      if (!el) return;
      if (kind === 'magnet') {
        el.style.removeProperty('--mx');
        el.style.removeProperty('--my');
        el.removeAttribute('data-magnet-active');
      } else {
        el.style.removeProperty('--rx');
        el.style.removeProperty('--ry');
        el.removeAttribute('data-tilting');
      }
    };

    const apply = () => {
      frame = 0;
      const e = pending;
      if (!e) return;
      const target = e.target instanceof Element ? e.target : null;
      const m = target?.closest<HTMLElement>('[data-magnetic]') ?? null;
      const t = target?.closest<HTMLElement>('[data-tilt]') ?? null;
      if (magnet && magnet !== m) release(magnet, 'magnet');
      if (tilt && tilt !== t) release(tilt, 'tilt');
      magnet = m;
      tilt = t;
      if (m && !m.matches(':disabled')) {
        const r = m.getBoundingClientRect();
        const strength = Number(m.dataset.magnetic) || 0.28;
        const dx = Math.max(-8, Math.min(8, (e.clientX - (r.left + r.width / 2)) * strength));
        const dy = Math.max(-6, Math.min(6, (e.clientY - (r.top + r.height / 2)) * strength));
        m.style.setProperty('--mx', `${dx.toFixed(2)}px`);
        m.style.setProperty('--my', `${dy.toFixed(2)}px`);
        m.setAttribute('data-magnet-active', '');
      }
      if (t) {
        const r = t.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        const max = Number(t.dataset.tilt) || 5;
        t.style.setProperty('--ry', `${(px * max * 2).toFixed(2)}deg`);
        t.style.setProperty('--rx', `${(-py * max * 1.6).toFixed(2)}deg`);
        t.style.setProperty('--gx', `${((px + 0.5) * 100).toFixed(1)}%`);
        t.style.setProperty('--gy', `${((py + 0.5) * 100).toFixed(1)}%`);
        t.setAttribute('data-tilting', '');
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!fine.matches || reduced.matches || e.pointerType !== 'mouse') return;
      pending = e;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onLeaveDoc = () => {
      release(magnet, 'magnet');
      release(tilt, 'tilt');
      magnet = tilt = null;
    };
    document.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeaveDoc);
    window.addEventListener('blur', onLeaveDoc);

    return () => {
      io.disconnect();
      mo.disconnect();
      cancelAnimationFrame(frame);
      document.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeaveDoc);
      window.removeEventListener('blur', onLeaveDoc);
    };
  }, []);
  return null;
}

/**
 * Runs before the page paints: lets CSS hide not-yet-revealed elements only when
 * JavaScript is available. If scripts never start, a CSS fallback shows everything.
 */
export const MOTION_BOOT_SCRIPT = "document.documentElement.setAttribute('data-motion','pending')";
