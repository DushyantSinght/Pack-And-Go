// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React, { useState } from 'react';
import {
  Truck,
  Box,
  Layers,
  ShieldCheck,
  Maximize2,
  Info,
  Scale,
  Sparkles,
  CheckCircle2,
  Eye
} from 'lucide-react';

export const PackMyTruckVisualizer = () => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [viewMode, setViewMode] = useState('compartment'); // compartment | x-ray

  const compartments = [
    {
      id: 'load-tenant-a',
      owner: 'Tenant A (Koramangala ➔ HSR)',
      cuFt: 210,
      weightKg: 280,
      color: '#10B981',
      bgGlow: 'rgba(16, 185, 129, 0.15)',
      borderColor: '#10B981',
      category: 'Heavy Furniture Base',
      items: [
        { name: 'Ergonomic Desk & Chair', wt: '45 kg', dims: '48" x 24" x 30"', fragile: false },
        { name: 'Single Bed Frame & Mattress', wt: '65 kg', dims: '72" x 36" x 14"', fragile: false },
        { name: '4x Standard Storage Crates', wt: '120 kg', dims: 'Standard Corrugated', fragile: false }
      ]
    },
    {
      id: 'load-your-move',
      owner: 'Your Move (HSR ➔ Whitefield)',
      cuFt: 180,
      weightKg: 210,
      color: '#D4AF37',
      bgGlow: 'rgba(212, 175, 55, 0.18)',
      borderColor: '#D4AF37',
      category: 'Mid-Bay Luggage & Electronics',
      isYou: true,
      items: [
        { name: 'Box 01: Workstation & Monitor', wt: '22 kg', dims: '24" x 18" x 18"', fragile: true, rfid: 'RFID-9812' },
        { name: 'Box 02: Wardrobe Essentials', wt: '35 kg', dims: '20" x 20" x 16"', fragile: false, rfid: 'RFID-9813' },
        { name: 'Box 03: Kitchen & Appliances', wt: '28 kg', dims: '18" x 14" x 14"', fragile: true, rfid: 'RFID-9814' },
        { name: 'Box 04: Books & Study Gear', wt: '40 kg', dims: '16" x 12" x 12"', fragile: false, rfid: 'RFID-9815' }
      ]
    },
    {
      id: 'load-tenant-c',
      owner: 'Tenant C (Bellandur ➔ Hope Farm)',
      cuFt: 130,
      weightKg: 140,
      color: '#6366F1',
      bgGlow: 'rgba(99, 102, 241, 0.15)',
      borderColor: '#6366F1',
      category: 'Rear Top-Tier Micro Goods',
      items: [
        { name: 'Gym Weights & Yoga Gear', wt: '50 kg', dims: 'Compact Dense', fragile: false },
        { name: '2x Luggage Strolleys', wt: '42 kg', dims: 'Large Duffle', fragile: false },
        { name: 'Acoustic Guitar in Hardcase', wt: '8 kg', dims: 'Fragile Slung', fragile: true }
      ]
    },
    {
      id: 'safety-buffer',
      owner: 'Safety Airflow Buffer',
      cuFt: 30,
      weightKg: 0,
      color: '#64748B',
      bgGlow: 'rgba(100, 116, 139, 0.08)',
      borderColor: '#64748B',
      category: 'Transit Vibration Cushion',
      items: [
        { name: 'Corner Anti-Slip Straps', wt: '0 kg', dims: 'Buffer Gap', fragile: false },
        { name: 'E-Track Ratchet Tiedowns', wt: '0 kg', dims: 'ISO Compliant', fragile: false }
      ]
    }
  ];

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Visualizer Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-gold">
              <Truck size={12} /> 2.5D Isometric Truck Bay
            </span>
            <span className="badge badge-emerald">
              <ShieldCheck size={12} /> Axle Load Balanced
            </span>
          </div>
          <h3 style={{ fontSize: '1.35rem', margin: 0 }}>
            Interactive "Pack-My-Truck" Spatial Loading Engine
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Inspect exactly how your luggage is partitioned from co-pooled shipments with anti-slip divider bulkheads.
          </p>
        </div>

        {/* View Switcher */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setViewMode('compartment')}
            className="btn btn-sm"
            style={{
              background: viewMode === 'compartment' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
              color: viewMode === 'compartment' ? '#FFFFFF' : 'var(--text-muted)',
              fontSize: '0.75rem',
              border: '1px solid var(--border-subtle)'
            }}
          >
            Compartment Zones
          </button>
          <button
            onClick={() => setViewMode('x-ray')}
            className="btn btn-sm"
            style={{
              background: viewMode === 'x-ray' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
              color: viewMode === 'x-ray' ? '#FFFFFF' : 'var(--text-muted)',
              fontSize: '0.75rem',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <Eye size={12} style={{ marginRight: '4px' }} /> X-Ray Wireframe
          </button>
        </div>
      </div>

      {/* Isometric 2.5D Truck Bay Container */}
      <div style={{
        background: 'linear-gradient(180deg, #0B1120 0%, #0F172A 100%)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-glow)',
        padding: '24px 20px',
        position: 'relative',
        boxShadow: 'inset 0 0 60px rgba(0, 0, 0, 0.9)'
      }}>
        {/* Truck Bed Metadata Strip */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          marginBottom: '16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '8px'
        }}>
          <div>
            🚛 <strong>Tata Ace EV Ultra Cargo (14ft)</strong> • Max Payload: 1,200 kg • Usable Volume: 550 cu. ft.
          </div>
          <div style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Utilized: 520 cu. ft. (94.5% Optimal Fill)
          </div>
        </div>

        {/* The 2.5D Cutaway Cargo Bay Graphic */}
        <div style={{
          position: 'relative',
          display: 'flex',
          gap: '8px',
          height: '180px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '2px dashed rgba(212, 175, 55, 0.3)',
          borderRadius: '12px',
          padding: '12px',
          perspective: '600px'
        }}>
          {/* Truck Cabin End Label */}
          <div style={{
            width: '40px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontSize: '0.7rem',
            fontWeight: 700,
            color: 'var(--text-muted)',
            letterSpacing: '0.1em'
          }}>
            CABIN FRONT
          </div>

          {/* Cargo Zones */}
          {compartments.map((comp) => {
            const isSelected = selectedItem?.id === comp.id;
            const pct = Math.round((comp.cuFt / 550) * 100);

            return (
              <div
                key={comp.id}
                onClick={() => setSelectedItem(comp)}
                style={{
                  flex: comp.cuFt,
                  background: viewMode === 'x-ray' ? 'transparent' : comp.bgGlow,
                  border: `2px ${comp.isYou ? 'solid' : 'dashed'} ${comp.borderColor}`,
                  borderRadius: '8px',
                  padding: '12px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.25s ease',
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: isSelected ? `0 0 20px ${comp.color}40` : 'none'
                }}
              >
                {/* Glowing Crown on Your Move */}
                {comp.isYou && (
                  <div style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '10px',
                    background: 'var(--primary)',
                    color: '#0F172A',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    letterSpacing: '0.05em',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
                  }}>
                    ★ YOUR ITEMS
                  </div>
                )}

                <div>
                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: comp.color,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Box size={13} />
                    {comp.owner}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {comp.category}
                  </div>
                </div>

                {/* Visual Boxes Stack Inside Zone */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px',
                  margin: 'auto 0'
                }}>
                  {comp.items.map((it, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: comp.isYou ? 'rgba(212, 175, 55, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                        border: `1px solid ${comp.color}`,
                        borderRadius: '4px',
                        padding: '3px 6px',
                        fontSize: '0.65rem',
                        color: '#FFFFFF',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%'
                      }}
                    >
                      {it.fragile && <span style={{ color: '#F87171', marginRight: '3px' }}>⚠️</span>}
                      {it.name}
                    </div>
                  ))}
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  fontSize: '0.72rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  paddingTop: '6px'
                }}>
                  <span style={{ color: 'var(--text-dim)' }}>{comp.cuFt} cu. ft. ({pct}%)</span>
                  <strong style={{ color: comp.color }}>{comp.weightKg} kg</strong>
                </div>
              </div>
            );
          })}

          {/* Rear Shutter End Label */}
          <div style={{
            width: '40px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            writingMode: 'vertical-rl',
            fontSize: '0.7rem',
            fontWeight: 700,
            color: 'var(--text-muted)',
            letterSpacing: '0.1em'
          }}>
            REAR RAMP
          </div>
        </div>

        {/* Axle Load Distribution Telemetry Meters */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          marginTop: '16px',
          fontSize: '0.78rem'
        }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Front Axle Load Balance</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>
              48.2% <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>(Steering Optimal)</span>
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Rear Axle Traction Balance</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>
              51.8% <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>(Gradeability A+)</span>
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Vibration Shock Absorber Rating</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)', marginTop: '2px' }}>
              0.04 G <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>(Zero Glass Shock)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Compartment Inspector Drawer if Selected */}
      {selectedItem && (
        <div style={{
          background: 'var(--bg-elevated)',
          border: `1px solid ${selectedItem.borderColor}`,
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: selectedItem.color }}></span>
              <strong style={{ fontSize: '0.95rem' }}>{selectedItem.owner}</strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({selectedItem.category})</span>
            </div>
            <button
              onClick={() => setSelectedItem(null)}
              className="btn btn-sm btn-secondary"
              style={{ padding: '2px 8px', fontSize: '0.75rem' }}
            >
              Close Inspector
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            {selectedItem.items.map((it, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-surface)',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.78rem'
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  {it.name}
                </div>
                <div style={{ color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Weight: {it.wt}</span>
                  <span>Dimensions: {it.dims}</span>
                </div>
                {it.rfid && (
                  <div style={{ marginTop: '4px', color: 'var(--primary)', fontSize: '0.72rem', fontWeight: 600 }}>
                    🔒 RFID Seal: {it.rfid}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
