import { useEffect, useRef, useState } from 'react';

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * One-time global wiring for the motion layer:
 *  - reveals `.reveal` elements as they scroll into view (including ones added later)
 *  - cursor spotlight on `.glass-panel` (sets --mx / --my)
 *  - ripple on `.btn` press
 *  - scroll progress (--progress on :root) and `.scrolled` on the navbar
 */
export const useGlobalMotion = () => {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    const observeAll = (root = document) => root.querySelectorAll?.('.reveal:not(.is-visible)').forEach((el) => io.observe(el));
    observeAll();
    const mo = new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach((n) => {
      if (n.nodeType !== 1) return;
      if (n.classList?.contains('reveal')) io.observe(n);
      observeAll(n);
    })));
    mo.observe(document.body, { childList: true, subtree: true });

    let raf = 0;
    const onMove = (e) => {
      const panel = e.target.closest?.('.glass-panel');
      if (!panel) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = panel.getBoundingClientRect();
        panel.style.setProperty('--mx', `${e.clientX - r.left}px`);
        panel.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    };

    const onDown = (e) => {
      if (reduced()) return;
      const btn = e.target.closest?.('.btn');
      if (!btn || btn.disabled) return;
      const r = btn.getBoundingClientRect();
      const size = Math.max(r.width, r.height);
      const span = document.createElement('span');
      span.className = 'ripple';
      span.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
      btn.appendChild(span);
      setTimeout(() => span.remove(), 650);
    };

    const onScroll = () => {
      const h = document.documentElement;
      const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
      h.style.setProperty('--progress', p.toFixed(4));
      document.querySelector('.navbar-header')?.classList.toggle('scrolled', h.scrollTop > 24);
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      io.disconnect();
      mo.disconnect();
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);
};

/** Animates a number from 0 to `target` once the element is visible. */
export const useCountUp = (target, { duration = 1400, decimals = 0 } = {}) => {
  const ref = useRef(null);
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target == null || Number.isNaN(target)) return undefined;
    if (reduced()) { setValue(target); return undefined; }
    let raf, start;
    const run = () => {
      const tick = (t) => {
        if (!start) start = t;
        const k = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - k, 4);
        setValue(Number((target * eased).toFixed(decimals)));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const el = ref.current;
    if (!el) { run(); return () => cancelAnimationFrame(raf); }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { run(); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [target, duration, decimals]);
  return [ref, value];
};
