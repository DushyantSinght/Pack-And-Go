import React, { useRef } from 'react';
import { useMove } from '../context/MoveContext';
import {
  ShieldCheck,
  Printer,
  X,
  FileCheck,
  CheckCircle2,
  Calendar,
  Building,
  UserCheck,
  AlertCircle
} from 'lucide-react';

export const DepositProtectionCertificate = ({ isOpen, onClose }) => {
  const { currentEstimate, user } = useMove();
  const certRef = useRef();

  if (!isOpen) return null;

  const certNumber = 'PKG-TENANCY-DEP-2026-8819';
  const certDate = '17 September 2026';
  const sha256Hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  const inspectionItems = [
    { area: 'Room & Hallway Paint', status: 'Passed', remark: 'Zero scuffs; padded blanket corner guards deployed.', prePhoto: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80', postPhoto: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80' },
    { area: 'Vitrified Floor Tiles', status: 'Passed', remark: 'No drag scratches; heavy goods moved on rubber dollies.', prePhoto: 'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?auto=format&fit=crop&w=400&q=80', postPhoto: 'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?auto=format&fit=crop&w=400&q=80' },
    { area: 'Electrical Fittings & AC', status: 'Passed', remark: 'All 6 switchboards and MCB audited undamaged.', prePhoto: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=400&q=80', postPhoto: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=400&q=80' },
    { area: 'Main Door & Trim Seal', status: 'Passed', remark: 'Door frame foam buffer removed cleanly post-move.', prePhoto: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=400&q=80', postPhoto: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=400&q=80' }
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 220,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '780px',
        maxHeight: '92vh',
        overflowY: 'auto',
        background: '#FFFFFF',
        color: '#0F172A',
        borderRadius: 'var(--radius-lg)',
        padding: '36px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
        position: 'relative'
      }}>
        {/* Top Header Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-emerald" style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>
              <ShieldCheck size={14} /> Legal Tenancy Certificate
            </span>
            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
              Model Tenancy Act Compliant
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => window.print()}
              className="btn btn-sm btn-primary"
              style={{ background: '#0F172A', color: '#FFFFFF', gap: '6px' }}
            >
              <Printer size={15} /> Print / Save Legal PDF
            </button>
            <button
              onClick={onClose}
              style={{
                background: '#F1F5F9',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} color="#475569" />
            </button>
          </div>
        </div>

        {/* Certificate Title Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px', borderBottom: '2px solid #0F172A', paddingBottom: '20px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.15em', color: '#B45309', textTransform: 'uppercase', marginBottom: '6px' }}>
            PACK&GO VERIFIED TENANCY ESCROW AUDIT
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 6px 0', fontFamily: 'var(--font-serif)', color: '#0F172A' }}>
            Certificate of Property Condition & Deposit Protection
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748B', maxWidth: '560px', margin: '0 auto' }}>
            Issued pursuant to standard tenancy handover norms to protect outgoing and incoming tenants against unfair landlord security deposit withholding.
          </p>
          <div style={{ marginTop: '12px', fontSize: '0.78rem', color: '#475569' }}>
            Certificate Serial: <strong>{certNumber}</strong> • Date: <strong>{certDate}</strong>
          </div>
        </div>

        {/* Tenancy Handover Meta Box */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          padding: '16px',
          fontSize: '0.85rem',
          marginBottom: '24px'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>
              VACATING TENANT / RESIDENT:
            </div>
            <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '1rem' }}>
              {user?.name || 'Dushyant Singh'}
            </div>
            <div style={{ color: '#475569' }}>Property: {currentEstimate.origin}</div>
            <div style={{ color: '#475569' }}>Notice Handover Date: 17 September 2026</div>
            <div style={{ color: '#059669', fontWeight: 600, marginTop: '4px' }}>
              Claimed Security Deposit: ₹45,000 (Protected)
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>
              INDEPENDENT 3RD-PARTY AUDITOR:
            </div>
            <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '1rem' }}>
              Pack&Go Certified Move Captain
            </div>
            <div style={{ color: '#475569' }}>Auditor Name: Rajesh Sharma (ID: PKG-CPT-491)</div>
            <div style={{ color: '#475569' }}>Inspection Type: Before & After Move Visual Audit</div>
            <div style={{ color: '#64748B', fontSize: '0.75rem', marginTop: '4px' }}>
              Digital Audit Protocol: <strong>v4.2 Tamper-Evident RFID</strong>
            </div>
          </div>
        </div>

        {/* Inspection Points Table */}
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px', color: '#0F172A' }}>
          Room Condition Inspection & Photographic Audit
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {inspectionItems.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.5fr 1fr 1fr 2fr',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                fontSize: '0.8rem'
              }}
            >
              <div>
                <strong style={{ color: '#0F172A' }}>{item.area}</strong>
                <div style={{ color: '#059669', fontWeight: 600, fontSize: '0.72rem', marginTop: '2px' }}>
                  ✓ {item.status}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', marginBottom: '2px' }}>Pre-Move Photo</div>
                <img
                  src={item.prePhoto}
                  alt={item.area}
                  style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #CBD5E1' }}
                />
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', marginBottom: '2px' }}>Post-Move Audit</div>
                <img
                  src={item.postPhoto}
                  alt={item.area}
                  style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #CBD5E1' }}
                />
              </div>

              <div style={{ color: '#475569', fontSize: '0.75rem', lineHeight: 1.4 }}>
                {item.remark}
              </div>
            </div>
          ))}
        </div>

        {/* Legal Declaration Clause */}
        <div style={{
          background: '#FEF3C7',
          border: '1px solid #FCD34D',
          borderRadius: '8px',
          padding: '14px 16px',
          marginBottom: '24px',
          fontSize: '0.78rem',
          lineHeight: 1.5,
          color: '#92400E'
        }}>
          <strong>Legal Tenancy Declaration (Sec 13, Model Tenancy Act):</strong><br />
          The certified inspection confirms that zero structural, cosmetic, or fixtures damage was inflicted upon the premises during packing, transit, or departure. Under Indian tenancy law, landlords are legally prohibited from deducting painting charges or normal wear-and-tear from the refundable security deposit.
        </div>

        {/* Cryptographic Seal & Signatures */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          borderTop: '1px solid #E2E8F0',
          paddingTop: '20px'
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748B', fontFamily: 'monospace', marginBottom: '4px' }}>
              SHA-256 DIGITAL IMMUTABLE PROOF HASH:
            </div>
            <div style={{ fontSize: '0.72rem', color: '#0F172A', fontFamily: 'monospace', background: '#F1F5F9', padding: '4px 8px', borderRadius: '4px' }}>
              {sha256Hash}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '4px' }}>
              Recorded on Pack&Go Decentralized Audit Ledger • Immutable Timestamp
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              border: '2px dashed #D4AF37',
              borderRadius: '6px',
              padding: '8px 18px',
              color: '#B45309',
              fontWeight: 800,
              fontSize: '0.75rem',
              letterSpacing: '0.05em',
              marginBottom: '6px'
            }}>
              ✓ VERIFIED ZERO-DAMAGE SEAL
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>Rajesh Sharma</div>
            <div style={{ fontSize: '0.7rem', color: '#64748B' }}>Certified Pack&Go Move Captain</div>
          </div>
        </div>
      </div>
    </div>
  );
};
