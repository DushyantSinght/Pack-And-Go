import React from 'react';
import { useMove } from '../context/MoveContext';
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
  Database
} from 'lucide-react';

export const Navbar = () => {
  const {
    activeRole,
    setActiveRole,
    themeMode,
    toggleTheme,
    carbonSavedTotalKg,
    currentEstimate,
    setActiveTab,
    user,
    openAuth,
    logout,
    openInvoice,
    openPayment,
    openDriverConsole,
    openDbModal,
    dbStatus
  } = useMove();

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

      {/* Active Trip Telemetry Pill (Center) */}
      <div
        className="navbar-telemetry"
        onClick={() => setActiveTab('tracking')}
        title="Click to view live corridor tracking"
      >
        <span className="radar-dot"></span>
        <div style={{ fontSize: '0.78rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Corridor: </span>
          <strong style={{ color: 'var(--text-main)' }}>HSR ➔ Whitefield</strong>
          <span style={{ color: 'var(--primary)', marginLeft: '6px' }}>• 34 km/h</span>
        </div>
      </div>

      {/* Right Controls: Streamlined Action Cluster */}
      <div className="navbar-actions">
        {/* Sustainability Counter */}
        <div className="badge badge-emerald nav-carbon" style={{ padding: '5px 9px', gap: '5px', fontSize: '0.74rem' }}>
          <Leaf size={12} />
          <span>{carbonSavedTotalKg} kg CO₂</span>
        </div>

        {/* MongoDB Database & Schema Modal Trigger */}
        <button
          onClick={openDbModal}
          className="btn btn-secondary btn-sm"
          style={{
            padding: '5px 10px',
            fontSize: '0.76rem',
            gap: '6px',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            background: 'rgba(16, 185, 129, 0.08)'
          }}
          title="Inspect MongoDB Schema & Collections"
        >
          <Database size={13} color="#10B981" />
          <span style={{ color: '#10B981', fontWeight: 700 }}>MongoDB</span>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#10B981',
            boxShadow: '0 0 6px #10B981'
          }} />
        </button>

        {/* GST Invoice Modal Trigger */}
        <button
          onClick={openInvoice}
          className="btn btn-secondary btn-sm"
          style={{ padding: '5px 10px', fontSize: '0.76rem', gap: '5px' }}
          title="Download Employer Reimbursement GST Invoice"
        >
          <FileText size={13} color="var(--primary)" />
          <span>GST Invoice</span>
        </button>

        {/* Escrow Pay Modal Trigger */}
        <button
          onClick={openPayment}
          className="btn btn-outline-emerald btn-sm"
          style={{ padding: '5px 10px', fontSize: '0.76rem', gap: '5px' }}
          title="Lock Booking with Escrow Vault"
        >
          <Lock size={12} />
          <span>Escrow Pay</span>
        </button>

        {/* Role Switcher */}
        <div style={{
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
              {user.name.charAt(0)}
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {user.name.split(' ')[0]}
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
          onClick={toggleTheme}
          className="btn btn-secondary btn-sm"
          style={{ width: '34px', height: '34px', padding: 0, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Toggle Light/Dark Theme"
        >
          {themeMode === 'dark' ? <Sun size={15} color="#FBBF24" /> : <Moon size={15} color="#6366F1" />}
        </button>
      </div>
    </header>
  );
};
