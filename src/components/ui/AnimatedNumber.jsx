// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React, { useEffect, useRef, useState } from 'react';

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
export const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

/** Rolls smoothly from the previous value to the new one. */
export const AnimatedNumber = ({ value, format = (n) => Math.round(n).toLocaleString('en-IN'), duration = 650, className, style }) => {
  const [shown, setShown] = useState(value ?? 0);
  const current = useRef(value ?? 0);
  useEffect(() => {
    if (value == null || Number.isNaN(+value)) return undefined;
    const from = current.current;
    const to = +value;
    if (from === to) return undefined;
    if (reduced()) {
      current.current = to;
      setShown(to);
      return undefined;
    }
    let raf;
    let t0;
    const step = (t) => {
      t0 ??= t;
      const k = Math.min(1, (t - t0) / duration);
      const v = from + (to - from) * (1 - Math.pow(1 - k, 3));
      current.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span className={`anim-num ${className || ''}`} style={style}>{format(shown)}</span>;
};

/** Small count badge that pops whenever the number changes. */
export const CountBadge = ({ count, max = 99, className = '', style }) => {
  if (!count) return null;
  return (
    <span key={count} className={`count-badge ${className}`} style={style}>
      {count > max ? `${max}+` : count}
    </span>
  );
};

/** Returns true for ~900ms whenever `value` increases (for wiggle/bump effects). */
export const useBump = (value, ms = 900) => {
  const prev = useRef(value);
  const [bump, setBump] = useState(false);
  useEffect(() => {
    if (value > (prev.current ?? 0)) {
      setBump(true);
      const t = setTimeout(() => setBump(false), ms);
      prev.current = value;
      return () => clearTimeout(t);
    }
    prev.current = value;
    return undefined;
  }, [value, ms]);
  return bump;
};
