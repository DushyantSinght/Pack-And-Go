// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React, { useState, useEffect, useRef } from 'react';
import { useMove } from '../context/MoveContext';
import QRCode from 'qrcode';
import {
  QrCode,
  Box,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Camera,
  Search,
  KeyRound,
  FileCheck2,
  Maximize2,
  Lock,
  Plus,
  ArrowRight,
  Sliders
} from 'lucide-react';
import { PageIcon } from './ui/PageIcon';
import { FlipCode } from './ui/FlipCode';

export const LuggagePassport = () => {
  const {
    passports,
    addNewBoxPassport,
    currentEstimate,
    activeRole,
    showToast,
    setActiveTab,
    openDepositCert
  } = useMove();

  const [selectedBox, setSelectedBox] = useState(passports[0]);
  const [sliderPosition, setSliderPosition] = useState(50); // Before / After comparison slider
  const [showAddBoxModal, setShowAddBoxModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  // New Box Form State
  const [newBoxForm, setNewBoxForm] = useState({
    category: 'Electronics & Gadgets',
    label: 'Studio Audio & Accessories',
    fragile: true,
    items: 'Headphones, Audio Interface, Mic, Cables'
  });

  // Generate QR Code when selected box changes
  useEffect(() => {
    if (selectedBox) {
      QRCode.toDataURL(selectedBox.qrDataString, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error(err));
    }
  }, [selectedBox]);

  // Real printable QR label sheet — the Move Captain scans these while loading.
  const [labelSheet, setLabelSheet] = useState(null);
  const printLabels = async () => {
    if (!passports.length) return showToast('Add a box first.', 'info');
    const sheet = await Promise.all(
      passports.map(async (p) => {
        const boxId = p.boxId || p.id;
        const dataUrl = await QRCode.toDataURL(JSON.stringify({ boxId, bookingId: currentEstimate.bookingId }), { margin: 1, width: 220 });
        return { boxId, label: p.label, fragile: p.fragile, boxNumber: p.boxNumber, dataUrl };
      })
    );
    setLabelSheet(sheet);
    const done = () => { setLabelSheet(null); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => window.print(), 250);
  };

  const handleCreateNewBox = (e) => {
    e.preventDefault();
    const itemsArray = newBoxForm.items.split(',').map((s) => s.trim());
    addNewBoxPassport({
      category: newBoxForm.category,
      label: newBoxForm.label,
      fragile: newBoxForm.fragile,
      items: itemsArray
    });
    setShowAddBoxModal(false);
    setNewBoxForm({
      category: 'Electronics & Gadgets',
      label: 'Studio Audio & Accessories',
      fragile: true,
      items: 'Headphones, Audio Interface, Mic, Cables'
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-cyan">
                <QrCode size={12} /> Digital Chain of Custody
              </span>
              <span className="badge badge-emerald">
                <ShieldCheck size={12} /> Deposit-Protection Audited
              </span>
            </div>
            <div className="page-title-row">
              <PageIcon tab="passport" />
              <h2 style={{ fontSize: '1.6rem' }}>Digital Luggage Passport & Custody Escrow</h2>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Every carton receives a QR-linked digital manifest with photographic condition proof, tamper-evident seals, and dual OTP handovers.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setShowAddBoxModal(true)}
              className="btn btn-outline-emerald btn-sm"
            >
              <Plus size={16} /> Add Custom Carton
            </button>
            <button
              onClick={printLabels}
              className="btn btn-primary btn-sm"
            >
              <QrCode size={16} /> Print All QR Stickers
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Box Selector & QR / Right Box Passport Inspector */}
      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Left Column: Cartons List & QR Passport Preview */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Box size={18} color="var(--cyan)" />
              Active Relocation Cartons ({passports.length})
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tap to inspect passport</span>
          </div>

          {/* Cartons Accordion / List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {passports.map((box) => {
              const boxIdentifier = box.boxId || box.id;
              const selectedIdentifier = selectedBox?.boxId || selectedBox?.id;
              const isSelected = selectedIdentifier === boxIdentifier;
              return (
                <div
                  key={boxIdentifier}
                  onClick={() => setSelectedBox(box)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'rgba(6, 182, 212, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    border: isSelected ? '1px solid var(--cyan)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      background: isSelected ? 'var(--cyan)' : 'rgba(255, 255, 255, 0.06)',
                      color: isSelected ? '#000' : 'var(--text-main)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem'
                    }}>
                      <QrCode size={20} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>{box.boxId || box.id}</span>
                        {box.fragile && <span className="badge badge-rose" style={{ fontSize: '0.65rem' }}>Fragile</span>}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {box.label} • {box.itemsContained.length} items
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                      <CheckCircle size={10} /> Sealed
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Generated Thermal QR Label Card for Selected Box */}
          {selectedBox && (
            <div style={{
              background: '#FFFFFF',
              color: '#0F172A',
              padding: '20px',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px dashed #CBD5E1', paddingBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.05em', color: '#059669' }}>
                    PACK&GO OFFICIAL DIGITAL PASSPORT
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{selectedBox.boxId || selectedBox.id}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748B' }}>SCAN TO INSPECT</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{selectedBox.boxNumber}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Digital Luggage QR Passport"
                    style={{ width: '110px', height: '110px', borderRadius: '4px', border: '1px solid #E2E8F0' }}
                  />
                ) : (
                  <div style={{ width: '110px', height: '110px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <QrCode size={40} color="#94A3B8" />
                  </div>
                )}

                <div style={{ flex: 1, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div><strong>Category:</strong> {selectedBox.category}</div>
                  <div><strong>Box Spec:</strong> {selectedBox.boxSize}</div>
                  <div><strong>Seal Tag:</strong> {selectedBox.sealStatus}</div>
                  <div style={{ color: selectedBox.fragile ? '#DC2626' : '#059669', fontWeight: 700 }}>
                    {selectedBox.fragile ? '⚠️ HANDLE WITH EXTREME CARE • FRAGILE' : '✔️ STANDARD SECURED TRANSIT'}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.7rem', color: '#64748B', background: '#F8FAFC', padding: '6px 10px', borderRadius: '4px' }}>
                Time-stamped audit recorded. Tampering with this sticker invalidates carrier deposit escrow.
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Passport Manifest & Deposit-Protection Audit */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {selectedBox ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="badge badge-cyan">{selectedBox.category}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedBox.boxNumber}</span>
              </div>

              <h3 style={{ fontSize: '1.4rem', marginBottom: '4px' }}>{selectedBox.label}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {selectedBox.depositProtectionNote}
              </p>

              {/* Digital Manifest Items List */}
              <div style={{ marginTop: '16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileCheck2 size={15} color="var(--primary)" />
                  DIGITAL MANIFEST ITEMS ({selectedBox.itemsContained.length}):
                </div>
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedBox.itemsContained.map((item, idx) => (
                    <li
                      key={idx}
                      style={{
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: 'var(--text-main)',
                        padding: '4px 0',
                        borderBottom: idx !== selectedBox.itemsContained.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none'
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--cyan)' }}></span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Deposit Protection & Condition Audit: Before/After Comparison Slider */}
              <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Camera size={15} color="var(--primary)" />
                    Move-In Deposit Protection Room & Item Audit
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Slide to compare origin vs destination
                  </span>
                </div>

                <div style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16/9',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: '1px solid var(--border-subtle)'
                }}>
                  {/* Before Move Image (Full Width Behind) */}
                  <img
                    src={selectedBox.preMovePhotoUrl}
                    alt="Pre-Move Condition"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />

                  {/* After Move Overlay Image (Clipped by slider percentage) */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: `${sliderPosition}%`,
                    height: '100%',
                    overflow: 'hidden',
                    borderRight: '3px solid var(--primary)'
                  }}>
                    <img
                      src={selectedBox.postMovePhotoUrl}
                      alt="Post-Move Delivery Audit"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <span style={{
                      position: 'absolute',
                      bottom: '8px',
                      left: '8px',
                      background: 'rgba(16, 185, 129, 0.9)',
                      color: '#FFFFFF',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '3px'
                    }}>
                      PRE-MOVE SCAN (ORIGIN)
                    </span>
                  </div>

                  <span style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    background: 'rgba(99, 102, 241, 0.9)',
                    color: '#FFFFFF',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '3px'
                  }}>
                    DELIVERY AUDIT (DESTINATION)
                  </span>
                </div>

                {/* Slider Control */}
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Origin 100%</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderPosition}
                    onChange={(e) => setSliderPosition(e.target.value)}
                    style={{ flex: 1, accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Destination 100%</span>
                </div>

                {/* Legal Certificate Trigger */}
                <button
                  onClick={openDepositCert}
                  className="btn btn-outline-emerald btn-sm"
                  style={{ width: '100%', marginTop: '12px', gap: '8px', fontSize: '0.8rem' }}
                >
                  <FileCheck2 size={15} />
                  Generate Landlord Security Deposit Protection Certificate (Legal SHA-256)
                </button>
              </div>

              {/* Dual-End OTP & Geofence Verification Panel */}
              <div style={{
                marginTop: '20px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <KeyRound size={16} color="var(--primary)" />
                    <strong style={{ fontSize: '0.9rem' }}>Dual-End OTP & GPS Geofence Gate</strong>
                  </div>
                  <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>Geofence Radius: 150m OK</span>
                </div>

                <div className="grid-2" style={{ gap: '10px', marginBottom: '12px' }}>
                  <div style={{ background: 'var(--bg-card-solid)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Pickup OTP {currentEstimate.pickupVerifiedAt ? '(Verified ✓)' : ''}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.1em' }}>
                      <FlipCode code={currentEstimate.pickupOtp} used={!!currentEstimate.pickupVerifiedAt} tone="var(--primary)" />
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-card-solid)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Delivery OTP {currentEstimate.deliveredAt ? '(Verified ✓)' : ''}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.1em' }}>
                      <FlipCode code={currentEstimate.deliveryOtp} used={!!currentEstimate.deliveredAt} tone="var(--accent)" />
                    </div>
                  </div>
                </div>

                {/* How handover works — the customer never verifies their own code */}
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {currentEstimate.pickupOtp ? (
                    <>
                      Read the <strong>Pickup OTP</strong> to your Move Captain only once your boxes are loaded, and the{' '}
                      <strong>Delivery OTP</strong> only after you've checked everything arrived. Never share them over chat or before then.
                      <div style={{ marginTop: '6px', color: 'var(--text-main)' }}>Status: {currentEstimate.transitStatus}</div>
                    </>
                  ) : (
                    'Sign in to see the private handover codes for your booking.'
                  )}
                </div>
              </div>

              {/* Next Step Button to Truck Pooling */}
              <div style={{ marginTop: '20px' }}>
                <button
                  onClick={() => setActiveTab('tracking')}
                  className="btn btn-accent"
                  style={{ width: '100%', gap: '8px' }}
                >
                  View Shared Capacity Truck & Live Corridor Tracking
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Select a carton on the left to view its Digital Luggage Passport.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add Custom Box */}
      {showAddBoxModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '14px' }}>Create New Digital Box Passport</h3>
            <form onSubmit={handleCreateNewBox} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Category</label>
                <select
                  className="form-select"
                  value={newBoxForm.category}
                  onChange={(e) => setNewBoxForm({ ...newBoxForm, category: e.target.value })}
                >
                  <option value="Electronics & Gadgets">Electronics & Gadgets</option>
                  <option value="Wardrobe & Apparel">Wardrobe & Apparel</option>
                  <option value="Kitchenware & Glass">Kitchenware & Glass</option>
                  <option value="Academic & Books">Academic & Books</option>
                  <option value="Bedding & Linens">Bedding & Linens</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Carton Label Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={newBoxForm.label}
                  onChange={(e) => setNewBoxForm({ ...newBoxForm, label: e.target.value })}
                  placeholder="e.g. Studio Audio & Headsets"
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Items Contained (Comma-separated)</label>
                <input
                  type="text"
                  className="form-input"
                  value={newBoxForm.items}
                  onChange={(e) => setNewBoxForm({ ...newBoxForm, items: e.target.value })}
                  placeholder="e.g. Sony WH-1000XM5, Scarlett 2i2, Shure Mic"
                  required
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="fragileCheck"
                  checked={newBoxForm.fragile}
                  onChange={(e) => setNewBoxForm({ ...newBoxForm, fragile: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--rose)' }}
                />
                <label htmlFor="fragileCheck" style={{ fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                  Mark as Fragile (Includes Bubble Seal & Shock Sensor)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddBoxModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Generate Passport QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {labelSheet && (
        <div className="print-root" style={{ position: 'fixed', inset: 0, background: '#fff', color: '#000', zIndex: 500, overflow: 'auto', padding: 16 }}>
          <div className="no-print" style={{ marginBottom: 10, display: 'flex', gap: 8 }}>
            <button onClick={() => window.print()} className="btn btn-sm" style={{ background: '#000', color: '#fff' }}>Print</button>
            <button onClick={() => setLabelSheet(null)} className="btn btn-sm" style={{ background: '#E5E7EB', color: '#000' }}>Close</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
            {labelSheet.map((l) => (
              <div key={l.boxId} style={{ border: '2px dashed #000', padding: 10, textAlign: 'center', breakInside: 'avoid', fontFamily: 'system-ui' }}>
                <div style={{ fontWeight: 800 }}>Pack&Go • {currentEstimate.bookingId}</div>
                <img src={l.dataUrl} alt={l.boxId} style={{ width: 180, height: 180 }} />
                <div style={{ fontWeight: 700, fontSize: 13 }}>{l.boxId}</div>
                <div style={{ fontSize: 12 }}>{l.boxNumber} • {l.label}</div>
                {l.fragile && <div style={{ fontWeight: 900, fontSize: 16, marginTop: 4 }}>⚠ FRAGILE — HANDLE WITH CARE</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
