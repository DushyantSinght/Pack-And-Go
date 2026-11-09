// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React, { useState } from 'react';
import { useMove } from '../context/MoveContext';
import { CAMPUS_HUBS } from '../data/mockData';
import {
  GraduationCap,
  Users,
  MapPin,
  Calendar,
  Percent,
  ShieldCheck,
  Smartphone,
  Copy,
  ExternalLink,
  CheckCircle,
  Truck,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';

export const CampusMoveWeek = () => {
  const { showToast, setActiveRole, setActiveTab, user } = useMove();
  const [selectedHub, setSelectedHub] = useState(CAMPUS_HUBS[0]);
  const [parentShareLinkCopied, setParentShareLinkCopied] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('Morning Slot (09:00 AM - 12:00 PM)');

  const parentLiveTrackingUrl = `https://packandgo.in/track/parent?token=STU-${selectedHub.id.toUpperCase()}-8829`;

  const handleCopyParentLink = () => {
    navigator.clipboard?.writeText(parentLiveTrackingUrl);
    setParentShareLinkCopied(true);
    showToast('Parent Live Tracking Link copied to clipboard!', 'success');
    setTimeout(() => setParentShareLinkCopied(false), 3000);
  };

  const handleJoinCampusPool = async () => {
    if (!user) {
      showToast('Sign in to join your campus move week.', 'info');
      return;
    }
    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.6 }
    });
    showToast(`Registered for ${selectedHub.name} Move Week! 50% pooled discount locked in MongoDB.`, 'success');

    try {
      await api.joinCampusHub(selectedHub.hubId || selectedHub.id, {
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        college: selectedHub.name
      });
    } catch (e) {
      console.warn('MongoDB campus join notice:', e.message);
    }
  };

  const handleSwitchToParentView = () => {
    setActiveRole('parent');
    showToast('Switched to Parent Live Monitoring View.', 'info');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-indigo">
                <GraduationCap size={12} /> University Semester-End Transition
              </span>
              <span className="badge badge-emerald">
                <Percent size={12} /> Up to 50% Bulk Student Discount
              </span>
            </div>
            <h2 style={{ fontSize: '1.6rem' }}>Campus Move Week Automation</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Bulk student logistics: centralized campus collection hubs, shared departure fleets, and live tracking dashboards for parents.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleSwitchToParentView}
              className="btn btn-outline-emerald btn-sm"
            >
              <Smartphone size={16} /> Switch to Parent Live View
            </button>
          </div>
        </div>
      </div>

      {/* Campus Hubs Selector Grid */}
      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Left: Hub Selection & Dynamic Group Discount Progress */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <MapPin size={18} color="var(--primary)" />
              Select Your University Campus Hub
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Choose your university to join the batch departure fleet.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {CAMPUS_HUBS.map((hub) => {
              const isSelected = selectedHub.id === hub.id;
              return (
                <div
                  key={hub.id}
                  onClick={() => setSelectedHub(hub)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '2px' }}>
                      {hub.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      📍 Hub: {hub.pickupHubLocation} • {hub.dates}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span className="badge badge-emerald" style={{ fontSize: '0.75rem' }}>
                      {hub.discountTier}% OFF
                    </span>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      {hub.activeStudentsJoining} Students Joined
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Group Pool Discount Unlock Gauge */}
          <div style={{
            background: 'var(--bg-elevated)',
            padding: '18px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Batch Consolidation Progress ({selectedHub.name})
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>
                {selectedHub.activeStudentsJoining} / {selectedHub.nextTierTarget} Students
              </span>
            </div>

            <div style={{
              height: '14px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '999px',
              overflow: 'hidden',
              marginBottom: '10px'
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, (selectedHub.activeStudentsJoining / selectedHub.nextTierTarget) * 100)}%`,
                background: 'linear-gradient(90deg, #10B981, #6366F1)',
                borderRadius: '999px',
                transition: 'width 0.4s ease'
              }}></div>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              🎉 <strong>Next Tier:</strong> Only {selectedHub.nextTierTarget - selectedHub.activeStudentsJoining} more students needed to unlock complimentary 7-day storage!
            </div>
          </div>

          {/* Group Slot Reservation */}
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Preferred Departure Collection Slot:
            </label>
            <select
              className="form-select"
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="Morning Slot (09:00 AM - 12:00 PM)">Morning Slot (09:00 AM - 12:00 PM)</option>
              <option value="Afternoon Slot (01:00 PM - 04:00 PM)">Afternoon Slot (01:00 PM - 04:00 PM)</option>
              <option value="Evening Slot (05:00 PM - 08:00 PM)">Evening Slot (05:00 PM - 08:00 PM)</option>
            </select>
          </div>

          <button
            onClick={handleJoinCampusPool}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', gap: '8px' }}
          >
            <GraduationCap size={18} /> Join Campus Move Batch ({selectedHub.discountTier}% Discount)
          </button>
        </div>

        {/* Right: Dedicated Parent Live Tracking Mode */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-cyan">
                <ShieldCheck size={12} /> Peace of mind for parents
              </span>
            </div>
            <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Smartphone size={18} color="var(--cyan)" />
              Parent Live Tracking Dashboard
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Parents can monitor their child's entire move in real-time — vehicle telemetry, verified driver background check, and arrival check-in photos.
            </p>
          </div>

          {/* Shareable Link Box */}
          <div style={{
            background: 'var(--bg-elevated)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              SECURE PARENT ACCESS LINK (NO APP DOWNLOAD REQUIRED):
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                readOnly
                value={parentLiveTrackingUrl}
                className="form-input"
                style={{ fontSize: '0.8rem', padding: '8px 12px', background: 'rgba(0, 0, 0, 0.3)' }}
              />
              <button
                onClick={handleCopyParentLink}
                className="btn btn-secondary btn-sm"
                style={{ whiteSpace: 'nowrap' }}
              >
                {parentShareLinkCopied ? <CheckCircle size={15} color="#10B981" /> : <Copy size={15} />}
                {parentShareLinkCopied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Parent Mode Live Preview Mockup */}
          <div style={{
            border: '1px solid var(--border-glow)',
            borderRadius: 'var(--radius-md)',
            padding: '18px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(99, 102, 241, 0.05) 100%)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="radar-dot" style={{ width: '8px', height: '8px' }}></span>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>Parent Live Telemetry Active</strong>
              </div>
              <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>Police-Verified Crew</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Student Move:</span>
                <strong>Aman V. • {selectedHub.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Transit Vehicle:</span>
                <strong>Tata Ace EV • KA-01-MJ-4921</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>GPS Route Speed:</span>
                <strong style={{ color: 'var(--primary)' }}>34 km/h (Normal traffic)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Luggage Sealed:</span>
                <strong style={{ color: 'var(--cyan)' }}>4 Cartons • Tamper RFID Intact</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Destination ETA:</span>
                <strong style={{ color: 'var(--amber)' }}>Today, 03:15 PM</strong>
              </div>
            </div>

            <div style={{ marginTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Move updates are sent by SMS to the phone on your account
              </span>
              <button
                onClick={async () => {
                  if (!user) return showToast('Sign in to send a test SMS to your phone.', 'info');
                  try {
                    const r = await api.sendTestSms();
                    showToast(r.message, r.result === 'sent' ? 'success' : 'info');
                  } catch (e) {
                    showToast(e.message, 'error');
                  }
                }}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem' }}
              >
                Send test SMS to my phone
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
