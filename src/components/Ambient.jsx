import React, { useEffect, useState } from 'react';
import { ArrowUp, Truck } from 'lucide-react';

export const AmbientBackground = () => (
  <div className="bg-ambient" aria-hidden="true">
    <div className="blob b1" />
    <div className="blob b2" />
    <div className="blob b3" />
    <div className="grid" />
  </div>
);

export const ScrollProgress = () => <div className="scroll-progress" aria-hidden="true" />;

export const BackToTop = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > 900);
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <button className={`to-top ${show ? '' : 'hidden'}`} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top" title="Back to top">
      <ArrowUp size={18} />
    </button>
  );
};

/** Brief branded splash while the app boots. */
export const Splash = () => {
  const [hide, setHide] = useState(false);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setHide(true), 750);
    const t2 = setTimeout(() => setGone(true), 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  if (gone) return null;
  return (
    <div className={`splash ${hide ? 'hide' : ''}`} aria-hidden="true">
      <div className="splash-logo"><Truck size={30} color="#0B0C10" /></div>
      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.4rem', letterSpacing: '-0.02em', animation: 'fadeUp .6s .15s both' }}>
        Pack<span style={{ color: 'var(--primary)', fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>&</span>Go
      </div>
      <div className="splash-bar" />
    </div>
  );
};
