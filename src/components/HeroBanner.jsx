import React from 'react';
import { useMove } from '../context/MoveContext';
import {
  Sparkles,
  Zap,
  ShieldCheck,
  Truck,
  QrCode,
  Repeat,
  Home,
  GraduationCap,
  Percent,
  CheckCircle2
} from 'lucide-react';

export const HeroBanner = () => {
  const { activeTab, setActiveTab } = useMove();

  const NAV_ITEMS = [
    { id: 'estimator', label: 'AI Sweep & Price Lock', icon: Sparkles, badge: 'Computer Vision' },
    { id: 'passport', label: 'Luggage Passports', icon: QrCode, badge: 'QR & Deposit' },
    { id: 'tracking', label: 'Shared Pooling Transit', icon: Truck, badge: '45% Off' },
    { id: 'marketplace', label: 'Circular P2P Resale', icon: Repeat, badge: 'Zero Transit' },
    { id: 'themes', label: 'Themed Setup & Essentials', icon: Home, badge: 'Move-in Ready' },
    { id: 'postmove', label: 'Meal-Aware & Upkeep', icon: ShieldCheck, badge: 'Pure Veg / Jain' },
    { id: 'campus', label: 'Campus Move Week', icon: GraduationCap, badge: 'Students & Parents' }
  ];

  return (
    <div style={{ marginBottom: '32px' }}>
      {/* Hero Content Header */}
      <div className="glass-panel hero-panel" style={{
        padding: '36px',
        marginBottom: '20px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <span className="badge badge-indigo">
            <Sparkles size={12} /> Bespoke Relocation Concierge
          </span>
          <span className="badge badge-emerald">
            <Zap size={12} /> Urban Freight Network
          </span>
        </div>

        <h1 style={{ fontSize: '3.1rem', fontWeight: 600, marginBottom: '14px', maxWidth: '920px', lineHeight: 1.15, fontFamily: 'var(--font-serif)' }}>
          Packed with care. <span className="gradient-text" style={{ fontStyle: 'italic', fontWeight: 400 }}>Settled with ease.</span>
        </h1>

        <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', maxWidth: '780px', marginBottom: '26px', lineHeight: 1.7, fontWeight: 400 }}>
          Pack&Go is India's premier all-in-one relocation concierge. Unifying <strong>Computer Vision room estimation</strong>, 
          <strong>shared freight pooling</strong> (saving 40–50%), box-level <strong>Digital Luggage Passports</strong> for deposit protection, 
          and <strong>move-in ready themed sanctuaries</strong> with arrival-timed essentials.
        </p>

        {/* 4 Impact Pillars */}
        <div className="grid-4" style={{ gap: '14px' }}>
          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{ color: 'var(--primary)' }}>
              <Percent size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>40%–50% Cut</div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Shared-freight pooling</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{ color: 'var(--primary)' }}>
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>Price Locked</div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Upfront price commitment</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{ color: '#8ECAE6' }}>
              <QrCode size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>Box QR Passport</div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Deposit & damage escrow</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{ color: '#E0A96D' }}>
              <Home size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>Move-In Ready</div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Water, bedding, tiffin ready</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs Bar */}
      <div className="nav-tabs-wrapper">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`tab-btn ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
              <span className="tab-pill">
                {item.badge}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
