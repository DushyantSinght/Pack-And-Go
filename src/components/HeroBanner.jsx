// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useMove } from '../context/MoveContext';
import { api } from '../services/api';
import { useCountUp } from '../hooks/useMotion';
import { HeroScene } from './HeroScene';
import {
  Sparkles, ShieldCheck, Truck, QrCode, Repeat, Home, GraduationCap, CheckCircle2, ArrowRight, Camera, Leaf, Star, Package
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'estimator', label: 'Estimate', icon: Sparkles, badge: 'AI' },
  { id: 'passport', label: 'Box Passports', icon: QrCode },
  { id: 'tracking', label: 'Live Tracking', icon: Truck },
  { id: 'marketplace', label: 'Resale', icon: Repeat },
  { id: 'themes', label: 'Room Setup', icon: Home },
  { id: 'postmove', label: 'After the Move', icon: ShieldCheck },
  { id: 'campus', label: 'Campus', icon: GraduationCap }
];

const StatTile = ({ icon: Icon, value, suffix = '', label, decimals = 0, i }) => {
  const [ref, n] = useCountUp(value ?? 0, { decimals });
  return (
    <div ref={ref} className="stat-tile reveal lift" style={{ '--i': i }}>
      <Icon className="ico" size={34} />
      <div className="num gradient-text">
        {value == null ? '—' : n.toLocaleString('en-IN', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}
        {value != null && suffix}
      </div>
      <div className="lbl">{label}</div>
    </div>
  );
};

/** Navigation tabs with a spring-animated sliding indicator. */
const TabBar = () => {
  const { activeTab, setActiveTab } = useMove();
  const wrap = useRef(null);
  const [ind, setInd] = useState({ left: 6, width: 0 });

  useLayoutEffect(() => {
    const measure = () => {
      const el = wrap.current?.querySelector(`[data-tab="${activeTab}"]`);
      if (!el) return;
      setInd({ left: el.offsetLeft, width: el.offsetWidth });
      el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [activeTab]);

  return (
    <div className="nav-tabs-wrapper" ref={wrap} role="tablist" aria-label="Sections">
      <div className="tab-indicator" style={{ left: ind.left, width: ind.width }} />
      {NAV_ITEMS.map(({ id, label, icon: Icon, badge }) => (
        <button key={id} data-tab={id} role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)} className={`tab-btn ${activeTab === id ? 'active' : ''}`}>
          <Icon size={16} />
          <span>{label}</span>
          {badge && <span className="tab-pill">{badge}</span>}
        </button>
      ))}
    </div>
  );
};

export const HeroBanner = () => {
  const { setActiveTab, openBooking, user, myMoves, openMyMoves } = useMove();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.getPublicStats().then((r) => setStats(r.stats)).catch(() => setStats({}));
  }, []);

  const activeMove = (myMoves || []).find((m) => ['confirmed', 'assigned', 'in_transit'].includes(m.status));
  const scrollToTabs = (tab) => {
    setActiveTab(tab);
    setTimeout(() => document.querySelector('.nav-tabs-wrapper')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const words = ['Packed', 'with', 'care.'];

  return (
    <div style={{ marginBottom: '28px' }}>
      <section className="glass-panel hero-panel hero-v2">
        <div>
          <div className="stagger" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            <span className="badge badge-indigo"><span className="live-dot" style={{ width: 6, height: 6 }} /> Booking moves in Bengaluru & Delhi-NCR</span>
          </div>

          <h1 className="hero-title">
            {words.map((w, i) => (
              <span key={w} className="hero-word" style={{ animationDelay: `${0.08 + i * 0.09}s` }}>{w}&nbsp;</span>
            ))}
            <br />
            <span className="hero-word gradient-text" style={{ animationDelay: '0.4s', fontStyle: 'italic', fontWeight: 400 }}>Settled with ease.</span>
          </h1>

          <p style={{ fontSize: '1.08rem', color: 'var(--text-muted)', maxWidth: 560, lineHeight: 1.7, animation: 'fadeUp .8s .55s both' }}>
            Snap a photo of your room, get an itemised price in seconds, and book a verified Move Captain.
            Your money stays in escrow until you've checked every box at your new home.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 26, animation: 'fadeUp .8s .7s both' }}>
            {activeMove ? (
              <button className="btn btn-primary btn-lg btn-glow" onClick={() => openMyMoves(activeMove.bookingId)}>
                <Truck size={18} /> Track my move <ArrowRight size={16} />
              </button>
            ) : (
              <button className="btn btn-primary btn-lg btn-glow" onClick={openBooking}>
                Book a move <ArrowRight size={16} />
              </button>
            )}
            <button className="btn btn-secondary btn-lg" onClick={() => scrollToTabs('estimator')}>
              <Camera size={17} /> Scan a room with AI
            </button>
          </div>

          <div className="trust-row" style={{ animation: 'fadeUp .8s .85s both' }}>
            <span><CheckCircle2 size={14} color="var(--primary)" /> Pay into escrow</span>
            <span><CheckCircle2 size={14} color="var(--primary)" /> Licence-checked captains</span>
            <span><CheckCircle2 size={14} color="var(--primary)" /> Free cancellation 24h+</span>
          </div>
          {user && !activeMove && (myMoves || []).length > 0 && (
            <button onClick={() => openMyMoves()} style={{ marginTop: 14, background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.82rem' }}>
              View your {myMoves.length} past move{myMoves.length > 1 ? 's' : ''} →
            </button>
          )}
        </div>

        <div style={{ animation: 'scaleIn 1s .3s both', minWidth: 0 }}>
          {/* Animated move: the van loads boxes, drives to the new home and unloads */}
          <HeroScene onStageClick={scrollToTabs} />
        </div>
      </section>

      {/* Live platform numbers (real data from the API) */}
      <div className="stats-strip">
        <StatTile i={0} icon={Truck} value={stats?.movesBooked} label="Moves booked on Pack&Go" />
        <StatTile i={1} icon={Package} value={stats?.boxesTracked} label="Boxes with QR passports" />
        <StatTile i={2} icon={Leaf} value={stats?.co2SavedKg} suffix=" kg" label="CO₂ saved by local resale" />
        <StatTile i={3} icon={Star} value={stats?.avgRating ?? null} decimals={1} suffix="★" label={stats?.ratingCount ? `Average from ${stats.ratingCount} rated move${stats.ratingCount > 1 ? 's' : ''}` : 'Ratings appear after first moves'} />
      </div>

      <div style={{ marginTop: 28 }}>
        <TabBar />
      </div>
    </div>
  );
};
