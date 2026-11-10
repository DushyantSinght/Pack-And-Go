// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React from 'react';
import { useMove } from '../context/MoveContext';
import { ServiceRequestModal } from './ServiceRequestModal';
import { THEMED_ROOMS, ARRIVAL_ESSENTIALS_KIT } from '../data/mockData';
import {
  Sparkles,
  Home,
  Clock,
  Droplets,
  Coffee,
  Check,
  Plus,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Utensils
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PageIcon } from './ui/PageIcon';

export const ThemedRoomSetup = () => {
  const {
    currentEstimate,
    selectTheme,
    toggleEssential,
    showToast,
    setActiveTab
  } = useMove();

  const selectedThemeObj = THEMED_ROOMS.find((t) => t.id === currentEstimate.selectedTheme) || THEMED_ROOMS[0];

  // Calculate essentials total
  const essentialsTotal = ARRIVAL_ESSENTIALS_KIT.filter((item) =>
    currentEstimate.selectedEssentials.includes(item.id)
  ).reduce((acc, curr) => acc + curr.price, 0);

  const [request, setRequest] = React.useState(null);
  const handleConfirmSetup = () => {
    const theme = THEMED_ROOMS.find((t) => t.id === currentEstimate.selectedTheme);
    const essentials = ARRIVAL_ESSENTIALS_KIT.filter((i) => currentEstimate.selectedEssentials.includes(i.id));
    setRequest({
      type: 'room_setup',
      title: `Room setup: ${theme?.name || 'custom'}`,
      subtitle: `${essentials.length} arrival essentials • ₹${essentialsTotal.toLocaleString('en-IN')} est.`,
      details: { themeId: currentEstimate.selectedTheme, essentials: essentials.map((e) => e.name), estimate: essentialsTotal }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-indigo">
                <Sparkles size={12} /> Curated Interior Staging
              </span>
              <span className="badge badge-emerald">
                <Clock size={12} /> Arrival-Timed Essentials
              </span>
            </div>
            <div className="page-title-row">
              <PageIcon tab="themes" />
              <h2 style={{ fontSize: '1.6rem' }}>Move-In Ready Themed Setup & Arrival Essentials</h2>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Don't move into a bare room. Pack&Go fits curated themes (Italian, Japandi, Tech) and times bedding, water, and tiffin to your arrival.
            </p>
          </div>
        </div>
      </div>

      {/* Theme Selection Showroom Grid */}
      <div>
        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Home size={18} color="var(--primary)" />
          CHOOSE YOUR ROOM SETUP THEME:
        </div>

        <div className="grid-3" style={{ gap: '20px' }}>
          {THEMED_ROOMS.map((theme) => {
            const isSelected = currentEstimate.selectedTheme === theme.id;
            return (
              <div
                key={theme.id}
                className={`glass-panel ${isSelected ? 'glass-panel-glow' : ''}`}
                style={{
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => selectTheme(theme.id)}
              >
                <div style={{ position: 'relative', aspectRatio: '16/10', overflow: 'hidden' }}>
                  <img
                    src={theme.previewUrl}
                    alt={theme.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {isSelected && (
                    <span style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: 'var(--primary)',
                      color: '#FFFFFF',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: 'var(--shadow-glow)'
                    }}>
                      <Check size={13} /> Active Selection
                    </span>
                  )}
                </div>

                <div style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{theme.name}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                    {theme.tagline}
                  </p>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 700 }}>
                    INCLUDED PIECES & ACCENTS:
                  </div>

                  <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '18px' }}>
                    {theme.features.map((feat, idx) => (
                      <li key={idx} style={{ fontSize: '0.78rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--primary)' }}></span>
                        {feat}
                      </li>
                    ))}
                  </ul>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '14px'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Subscription Rental</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>
                        ₹{theme.rentalPricePerMonth} <span style={{ fontSize: '0.75rem' }}>/mo</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Outright Purchase</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        ₹{theme.fullPurchasePrice.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      selectTheme(theme.id);
                    }}
                    className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ width: '100%' }}
                  >
                    {isSelected ? 'Theme Configured ✓' : 'Select This Theme'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Arrival Essentials Kit Section */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-amber">
                <Clock size={12} /> Synchronized with Driver ETA
              </span>
            </div>
            <h3 style={{ fontSize: '1.35rem' }}>Arrival-Timed Move-In Essentials</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Avoid thirsty, hungry first nights with no bedsheets. These essentials land at your doorstep precisely when you unlock the room.
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Essentials Add-On Total:</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
              ₹{essentialsTotal.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Essentials Cards Grid */}
        <div className="grid-2" style={{ gap: '16px' }}>
          {ARRIVAL_ESSENTIALS_KIT.map((item) => {
            const isChecked = currentEstimate.selectedEssentials.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => toggleEssential(item.id)}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: isChecked ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                  border: isChecked ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'start',
                  justifyContent: 'space-between',
                  gap: '14px',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    border: isChecked ? 'none' : '2px solid var(--border-subtle)',
                    background: isChecked ? 'var(--primary)' : 'transparent',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: '2px'
                  }}>
                    {isChecked && <Check size={16} />}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{item.name}</strong>
                      <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>{item.tag}</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      {item.description}
                    </p>
                    <div style={{ fontSize: '0.75rem', color: 'var(--cyan)' }}>
                      ⏱️ {item.timing}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    ₹{item.price}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleConfirmSetup}
            className="btn btn-primary btn-lg"
            style={{ gap: '8px' }}
          >
            Confirm Room Setup & Proceed to Post-Move Concierge
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
      <ServiceRequestModal request={request} onClose={() => setRequest(null)} />
    </div>
  );
};
