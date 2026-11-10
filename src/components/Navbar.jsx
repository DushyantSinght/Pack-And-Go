// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React from 'react';
import { useMove } from '../context/MoveContext';
import { useComms } from '../context/CommsContext';
import { NotificationBell } from './NotificationBell';
import { CountBadge, useBump } from './ui/AnimatedNumber';
import { withViewTransition } from '../utils/viewTransition';
import {
  Truck,
  Box,
  ShieldCheck,
  Leaf,
  Sun,
  Moon,
  UserCheck,
  Smartphone,
  Navigation,
  LogIn,
  UserPlus,
  LogOut,
  User,
  FileText,
  Lock,
  MessageSquare,
  PackageCheck,
  CalendarPlus,
  Search
} from 'lucide-react';

export const Navbar = () => {
  const {
    activeRole,
    setActiveRole,
    themeMode,
    setThemeMode,
    carbonSavedTotalKg,
    currentEstimate,
    setActiveTab,
    user,
    openAuth,
    logout,
    openInvoice,
    openPayment,
    openDriverConsole,
    dbStatus,
    setIsAdminOpen,
    openBooking,
    openMyMoves,
    myMoves
  } = useMove();

  const scrollToId = (id) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
  };
  const goTab = (tab) => {
    setActiveTab(tab);
    setTimeout(() => document.querySelector('.nav-tabs-wrapper')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };
  const activeMoves = (myMoves || []).filter((m) => ['pending_payment', 'confirmed', 'assigned', 'in_transit'].includes(m.status)).length;
  const { openInbox, unreadTotal } = useComms();
  const msgBump = useBump(unreadTotal);

  // Theme switch: the new theme spreads out in a circle from the toggle button.
  const onToggleTheme = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    // Read the live theme inside the update so rapid double-clicks can't desync.
    const t = withViewTransition(() => {
      const root = document.documentElement;
      const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      setThemeMode(next);
    }, { className: 'theme-vt' });
    t?.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 650, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(() => {});
  };

  return (
    <header className="glass-panel navbar-header">
      {/* Brand Identity */}
      <div
        className="navbar-brand"
        onClick={() => setActiveTab('estimator')}
      >
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '9px',
          background: 'linear-gradient(135deg, #D4AF37 0%, #947222 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 3px 12px rgba(212, 175, 55, 0.25)',
          flexShrink: 0
        }}>
          <Truck size={20} color="#0B0C10" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.02em', fontFamily: 'var(--font-heading)', lineHeight: 1 }}>
              Pack<span style={{ color: 'var(--primary)', fontStyle: 'italic', fontFamily: 'var(--font-serif)', fontSize: '1.5rem' }}>&</span>Go
            </span>
            <span className="badge badge-indigo" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>Concierge</span>
          </div>
          <p className="nav-tagline" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0, letterSpacing: '0.01em' }}>
            Packed with care. Settled with ease.
          </p>
        </div>
      </div>

      {/* Center: section links + search */}
      <nav className="nav-center" aria-label="Main">
        <div className="nav-links">
          {[
            ['How it works', () => scrollToId('how')],
            ['Features', () => scrollToId('features')],
            ['Resale', () => goTab('marketplace')],
            ['FAQ', () => scrollToId('faq')]
          ].map(([label, fn]) => (
            <button key={label} className="nav-link" onClick={fn}>{label}</button>
          ))}
        </div>
        <button className="nav-search" onClick={() => window.dispatchEvent(new CustomEvent('packandgo:palette'))} aria-label="Search (Ctrl K)">
          <Search size={14} />
          <span className="nav-search-text">Search or jump to…</span>
          <kbd>{navigator.platform?.toLowerCase().includes('mac') ? '⌘' : 'Ctrl'} K</kbd>
        </button>
      </nav>

      {/* Right Controls: Streamlined Action Cluster */}
      <div className="navbar-actions">
        {/* Sustainability Counter */}
        <div className="badge badge-emerald nav-carbon" style={{ padding: '5px 9px', gap: '5px', fontSize: '0.74rem' }}>
          <Leaf size={12} />
          <span>{carbonSavedTotalKg} kg CO₂</span>
        </div>
        {/* Book / My Moves */}
        <button onClick={openBooking} className="btn btn-primary btn-sm" style={{ padding: '5px 10px', fontSize: '0.76rem', gap: '5px' }} title="Book a move">
          <CalendarPlus size={13} />
          <span className="nav-label">Book a move</span>
        </button>
        {user && (
          <button onClick={() => openMyMoves()} className="btn btn-secondary btn-sm" style={{ position: 'relative', padding: '5px 10px', fontSize: '0.76rem', gap: '5px' }} title="My Moves">
            <PackageCheck size={13} color="var(--primary)" />
            <span className="nav-label">My Moves</span>
            <CountBadge count={activeMoves} style={{ background: 'var(--primary)', color: '#111', borderRadius: 999, fontSize: '0.62rem', fontWeight: 800, padding: '0 5px' }} />
          </button>
        )}

        {/* Role Switcher — development preview only; real roles come from the account */}
        {import.meta.env.DEV && (
        <div className="nav-dev" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'var(--bg-elevated)',
          padding: '2px 6px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          <UserCheck size={13} color="var(--text-muted)" />
          <select
            value={activeRole}
            onChange={(e) => {
              const val = e.target.value;
              setActiveRole(val);
              if (val === 'captain') openDriverConsole();
            }}
            style={{
              padding: '4px 4px',
              fontSize: '0.76rem',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-main)',
              cursor: 'pointer',
              fontWeight: 600,
              outline: 'none'
            }}
          >
            <option value="customer" style={{ background: '#111827', color: '#fff' }}>Tenant</option>
            <option value="captain" style={{ background: '#111827', color: '#fff' }}>Captain</option>
            <option value="outgoing" style={{ background: '#111827', color: '#fff' }}>Outgoing (P2P)</option>
            <option value="parent" style={{ background: '#111827', color: '#fff' }}>Parent</option>
          </select>
        </div>
        )}

        {/* Staff approvals */}
        {user?.isAdmin && (
          <button
            onClick={() => setIsAdminOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.76rem', padding: '5px 10px', gap: '5px', flexShrink: 0 }}
            title="Review Move Captain applications"
          >
            <ShieldCheck size={13} /> <span className="nav-label">Ops</span>
          </button>
        )}

        {user && <NotificationBell />}

        {/* Messages inbox */}
        {user && (
          <button
            onClick={openInbox}
            className="btn btn-secondary btn-sm"
            style={{ position: 'relative', width: '34px', height: '34px', padding: 0, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title={unreadTotal ? `${unreadTotal} unread message${unreadTotal > 1 ? 's' : ''}` : 'Messages'}
          >
            <MessageSquare size={15} className={msgBump ? 'wiggle' : ''} />
            <CountBadge count={unreadTotal} style={{ position: 'absolute', top: -4, right: -4, background: '#EF4444', color: '#fff', fontSize: '0.62rem', fontWeight: 800, minWidth: 17, height: 17, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }} />
          </button>
        )}

        {/* User Account / Auth Section */}
        {user ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-elevated)',
            padding: '3px 8px 3px 4px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: 800
            }}>
              {user.name?.charAt(0) || '•'}
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {user.name?.split(' ')[0] || 'Account'}
            </span>
            <button
              onClick={logout}
              style={{
                padding: '2px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Sign Out"
            >
              <LogOut size={13} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <button
              onClick={() => openAuth('login')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.76rem', padding: '5px 10px' }}
            >
              <LogIn size={13} />
              Sign In
            </button>
            <button
              onClick={() => openAuth('signup')}
              className="btn btn-primary btn-sm"
              style={{ fontSize: '0.76rem', padding: '5px 10px' }}
            >
              <UserPlus size={13} />
              Register
            </button>
          </div>
        )}

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="btn btn-secondary btn-sm theme-toggle"
          style={{ width: '34px', height: '34px', padding: 0, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title={themeMode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label={themeMode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          <span className="ti ti-sun"><Sun size={15} color="#FBBF24" /></span>
          <span className="ti ti-moon"><Moon size={15} color="#6366F1" /></span>
        </button>
      </div>
    </header>
  );
};
