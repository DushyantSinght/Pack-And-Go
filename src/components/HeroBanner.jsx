// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useMove } from '../context/MoveContext';
import { api } from '../services/api';
import { useCountUp } from '../hooks/useMotion';
import {
  Sparkles, ShieldCheck, Truck, QrCode, Repeat, Home, GraduationCap, CheckCircle2, ArrowRight,
  Camera, KeyRound, MapPin, Leaf, Star, Package, Users, Lock, Navigation, MessageSquare, Recycle, Clock
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

const ROUTE = 'M70 300 C 140 300, 150 210, 230 205 S 330 230, 360 160 S 420 90, 450 82';

/** Animated product illustration: a truck driving the route, with live-status cards. */
const HeroVisual = () => (
  <div className="hero-visual" aria-hidden="true">
    <svg viewBox="0 0 520 380" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <linearGradient id="routeGrad" x1="0" x2="1">
          <stop offset="0" stopColor="#AA820A" />
          <stop offset="1" stopColor="#F3E7C4" />
        </linearGradient>
        <radialGradient id="mapGlow" cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="rgba(212,175,55,0.16)" />
          <stop offset="1" stopColor="rgba(212,175,55,0)" />
        </radialGradient>
        <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>

      <rect x="10" y="20" width="500" height="340" rx="28" fill="url(#mapGlow)" stroke="rgba(212,175,55,0.18)" />
      {/* City blocks */}
      {[[40, 60, 90, 60], [150, 50, 70, 90], [250, 60, 60, 60], [330, 210, 90, 70], [120, 250, 80, 70], [380, 40, 100, 30], [250, 270, 60, 60], [440, 150, 50, 90]].map(([x, y, w, h], i) => (
        <rect key={i} className="map-block" x={x} y={y} width={w} height={h} rx="8" />
      ))}
      {/* Roads */}
      <path className="map-road" d="M20 200 H500 M230 30 V350 M20 120 C 200 140, 300 100, 500 130" strokeWidth="10" fill="none" strokeLinecap="round" />

      {/* Route: faint track, moving dashes, glowing progress */}
      <path d={ROUTE} stroke="rgba(212,175,55,0.18)" strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d={ROUTE} stroke="url(#routeGrad)" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="10 10" style={{ animation: 'dash 1.4s linear infinite' }} />
      <path d={ROUTE} stroke="#D4AF37" strokeWidth="6" fill="none" filter="url(#soft)" opacity="0.5" />

      {/* Pickup pin */}
      <g transform="translate(70 300)">
        <circle r="16" fill="rgba(59,130,246,0.25)"><animate attributeName="r" values="10;26;10" dur="2.4s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.8;0;0.8" dur="2.4s" repeatCount="indefinite" /></circle>
        <circle r="9" fill="#3B82F6" stroke="#fff" strokeWidth="3" />
      </g>
      {/* Drop pin */}
      <g transform="translate(450 82)">
        <circle r="16" fill="rgba(34,197,94,0.25)"><animate attributeName="r" values="10;26;10" dur="2.4s" begin="1.2s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.8;0;0.8" dur="2.4s" begin="1.2s" repeatCount="indefinite" /></circle>
        <path d="M0 -22 C 12 -22, 16 -10, 0 6 C -16 -10, -12 -22, 0 -22 Z" fill="#22C55E" stroke="#fff" strokeWidth="2.5" />
        <circle cy="-13" r="4" fill="#fff" />
      </g>

      {/* Truck driving the route */}
      <g>
        <g transform="translate(-16 -11)">
          <rect x="0" y="0" width="22" height="16" rx="3" fill="#D4AF37" />
          <rect x="22" y="5" width="10" height="11" rx="2.5" fill="#F3E7C4" />
          <rect x="24.5" y="7" width="5" height="4" rx="1" fill="#0B0C10" opacity="0.7" />
          <circle cx="7" cy="17" r="3.4" fill="#0B0C10" stroke="#F3E7C4" strokeWidth="1.2" />
          <circle cx="26" cy="17" r="3.4" fill="#0B0C10" stroke="#F3E7C4" strokeWidth="1.2" />
        </g>
        <animateMotion dur="9s" repeatCount="indefinite" rotate="auto" path={ROUTE} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.45 0 0.55 1" />
      </g>
    </svg>

    <div className="float-card" style={{ left: '2%', top: '6%', animationDelay: '0s' }}>
      <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><KeyRound size={14} color="#22C55E" /></span>
      <div><div style={{ fontWeight: 700 }}>Pickup OTP verified</div><div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Boxes loaded • escrow locked</div></div>
    </div>
    <div className="float-card" style={{ right: '2%', top: '38%', animationDelay: '-2s' }}>
      <span className="live-dot" />
      <div><div style={{ fontWeight: 700 }}>ETA 14 min</div><div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>6.2 km • 28 km/h</div></div>
    </div>
    <div className="float-card" style={{ left: '8%', bottom: '4%', animationDelay: '-4s', minWidth: 180 }}>
      <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><QrCode size={14} color="#D4AF37" /></span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700 }}>Box 6 of 8 scanned</div>
        <div style={{ height: 4, borderRadius: 4, background: 'var(--bg-elevated)', marginTop: 5, overflow: 'hidden' }}>
          <div style={{ width: '75%', height: '100%', background: 'linear-gradient(90deg,#AA820A,#F3E7C4)' }} />
        </div>
      </div>
    </div>
  </div>
);

const StatTile = ({ icon: Icon, value, suffix = '', label, decimals = 0, i }) => {
  const [ref, n] = useCountUp(value ?? 0, { decimals });
  return (
    <div ref={ref} className="stat-tile reveal lift" style={{ '--i': i }}>
      <Icon className="ico" size={34} />
      <div className="num gradient-text-animated">
        {value == null ? '—' : n.toLocaleString('en-IN', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}
        {value != null && suffix}
      </div>
      <div className="lbl">{label}</div>
    </div>
  );
};

const FEATURES = [
  [Camera, 'AI room scan'], [Lock, 'Escrow payments'], [KeyRound, 'OTP handover'], [Navigation, 'Live GPS tracking'],
  [QrCode, 'QR box passports'], [MessageSquare, 'Chat & call your captain'], [ShieldCheck, 'Verified Move Captains'],
  [Recycle, 'Zero-transit resale'], [Clock, 'Free reschedule'], [Users, 'Pooled trucks'], [Leaf, 'Lower CO₂']
];

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
      <section className="glass-panel hero-panel hero-v2 border-orbit">
        <div>
          <div className="stagger" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            <span className="badge badge-indigo"><span className="live-dot" style={{ width: 6, height: 6 }} /> Booking moves in Bengaluru & Delhi-NCR</span>
          </div>

          <h1 className="hero-title">
            {words.map((w, i) => (
              <span key={w} className="hero-word" style={{ animationDelay: `${0.08 + i * 0.09}s` }}>{w}&nbsp;</span>
            ))}
            <br />
            <span className="hero-word gradient-text-animated" style={{ animationDelay: '0.4s', fontStyle: 'italic', fontWeight: 400 }}>Settled with ease.</span>
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

        <div style={{ animation: 'scaleIn 1s .3s both' }}>
          <HeroVisual />
        </div>
      </section>

      {/* Live platform numbers (real data from the API) */}
      <div className="stats-strip">
        <StatTile i={0} icon={Truck} value={stats?.movesBooked} label="Moves booked on Pack&Go" />
        <StatTile i={1} icon={Package} value={stats?.boxesTracked} label="Boxes with QR passports" />
        <StatTile i={2} icon={Leaf} value={stats?.co2SavedKg} suffix=" kg" label="CO₂ saved by local resale" />
        <StatTile i={3} icon={Star} value={stats?.avgRating ?? null} decimals={1} suffix="★" label={stats?.ratingCount ? `Average from ${stats.ratingCount} rated move${stats.ratingCount > 1 ? 's' : ''}` : 'Ratings appear after first moves'} />
      </div>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[...FEATURES, ...FEATURES].map(([Icon, label], i) => (
            <span key={i} className="marquee-chip"><Icon size={14} color="var(--primary)" /> {label}</span>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <TabBar />
      </div>
    </div>
  );
};
