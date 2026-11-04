import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { useMove } from '../context/MoveContext';
import {
  Truck,
  QrCode,
  CheckCircle2,
  Navigation,
  ShieldCheck,
  Smartphone,
  X,
  Lock,
  KeyRound,
  Radio,
  Camera,
  AlertCircle
} from 'lucide-react';

export const DriverConsoleModal = ({ isOpen, onClose }) => {
  const { currentEstimate, showToast } = useMove();

  const [geofenceStatus, setGeofenceStatus] = useState('en-route'); // en-route | arrived | verified
  const [scannedBoxes, setScannedBoxes] = useState(['PKG-BOX-01', 'PKG-BOX-02']);
  const [inputOtp, setInputOtp] = useState('');
  const [otpStage, setOtpStage] = useState('pickup'); // pickup | delivery | completed
  const [isScanning, setIsScanning] = useState(false);

  if (!isOpen) return null;

  const totalBoxes = [
    { id: 'PKG-BOX-01', label: 'Monitor & Workstation', fragile: true },
    { id: 'PKG-BOX-02', label: 'Wardrobe Essentials', fragile: false },
    { id: 'PKG-BOX-03', label: 'Kitchen & Cookware', fragile: true },
    { id: 'PKG-BOX-04', label: 'Study Books & Notes', fragile: false }
  ];

  const handleSimulateGeofence = () => {
    setGeofenceStatus('arrived');
    showToast('GPS: Vehicle KA-01-MJ-4921 entered 150m pickup geofence!', 'info');
  };

  const handleScanNextBox = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      const remaining = totalBoxes.find((b) => !scannedBoxes.includes(b.id));
      if (remaining) {
        setScannedBoxes((prev) => [...prev, remaining.id]);
        showToast(`Audited & Scanned ${remaining.id} (${remaining.label})`, 'success');
      } else {
        showToast('All 4 boxes audited and safely boarded!', 'info');
      }
    }, 800);
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (otpStage === 'pickup') {
      if (inputOtp === currentEstimate.pickupOtp || inputOtp === '582941') {
        setOtpStage('delivery');
        setInputOtp('');
        showToast('✓ Pickup OTP verified! Transit legally started.', 'success');
      } else {
        showToast('Invalid Pickup OTP. Hint: Use ' + currentEstimate.pickupOtp, 'error');
      }
    } else if (otpStage === 'delivery') {
      if (inputOtp === currentEstimate.deliveryOtp || inputOtp === '910283') {
        setOtpStage('completed');
        setInputOtp('');
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.5 }
        });
        showToast('✓ Delivery OTP verified! ₹1,890 Escrow credited to Driver Wallet.', 'success');
      } else {
        showToast('Invalid Delivery OTP. Hint: Use ' + currentEstimate.deliveryOtp, 'error');
      }
    }
  };

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
      padding: '16px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '520px',
        maxHeight: '94vh',
        overflowY: 'auto',
        background: '#0B1120',
        border: '1px solid #10B981',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
        position: 'relative',
        color: '#FFFFFF'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            cursor: 'pointer'
          }}
        >
          <X size={16} />
        </button>

        {/* Driver Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            border: '2px solid #FFFFFF'
          }}>
            👨‍✈️
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
                <Radio size={10} /> Active Move Captain
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>ID: PKG-CPT-491</span>
            </div>
            <h3 style={{ fontSize: '1.2rem', margin: '2px 0 0 0', fontWeight: 700 }}>
              Captain Rajesh Sharma
            </h3>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
              Vehicle: <strong>KA-01-MJ-4921 (Tata Ace EV)</strong> • ⭐ 4.9 (420+ shifts)
            </div>
          </div>
        </div>

        {/* Step 1: Geofence Check-in */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Navigation size={15} color="#10B981" /> 1. Geofence Waypoint Status
            </span>
            <span className={`badge ${geofenceStatus === 'arrived' ? 'badge-emerald' : 'badge-indigo'}`}>
              {geofenceStatus === 'arrived' ? 'Within 150m Geofence' : 'En Route (800m away)'}
            </span>
          </div>

          <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: '0 0 10px 0' }}>
            Current Waypoint: <strong>HSR Layout Sector 1, Bengaluru</strong>
          </p>

          {geofenceStatus !== 'arrived' ? (
            <button
              onClick={handleSimulateGeofence}
              className="btn btn-sm btn-outline-emerald"
              style={{ width: '100%', fontSize: '0.8rem' }}
            >
              Simulate Arrival at 150m Geofence
            </button>
          ) : (
            <div style={{ fontSize: '0.75rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={14} /> Customer notified of captain arrival via WhatsApp & SMS.
            </div>
          )}
        </div>

        {/* Step 2: Camera QR Luggage Audit Scanner */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <QrCode size={15} color="var(--primary)" /> 2. Luggage Passport QR Scanner
            </span>
            <span style={{ fontSize: '0.75rem', color: '#D4AF37', fontWeight: 600 }}>
              {scannedBoxes.length} / {totalBoxes.length} Scanned
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
            {totalBoxes.map((b) => {
              const isScanned = scannedBoxes.includes(b.id);
              return (
                <div
                  key={b.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    background: isScanned ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${isScanned ? '#10B981' : 'rgba(255, 255, 255, 0.08)'}`,
                    borderRadius: '6px',
                    fontSize: '0.78rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: isScanned ? '#10B981' : '#64748B' }}>
                      {isScanned ? '✓' : '○'}
                    </span>
                    <strong>{b.id}</strong> — {b.label}
                  </div>
                  {b.fragile && <span style={{ color: '#F87171', fontSize: '0.7rem' }}>⚠️ FRAGILE</span>}
                </div>
              );
            })}
          </div>

          {scannedBoxes.length < totalBoxes.length && (
            <button
              onClick={handleScanNextBox}
              disabled={isScanning}
              className="btn btn-sm btn-primary"
              style={{ width: '100%', fontSize: '0.8rem', gap: '6px' }}
            >
              <Camera size={14} />
              {isScanning ? 'Auditing RFID Seal...' : 'Simulate Camera Scan on Box'}
            </button>
          )}
        </div>

        {/* Step 3: Dual-End OTP Handover & Escrow Release */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--radius-md)',
          padding: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <KeyRound size={15} color="#D4AF37" /> 3. Customer OTP Verification
            </span>
            <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
              {otpStage === 'pickup' ? 'Pickup Verification' : otpStage === 'delivery' ? 'Delivery Handover' : 'Completed'}
            </span>
          </div>

          {otpStage !== 'completed' ? (
            <form onSubmit={handleVerifyOtp}>
              <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: '0 0 10px 0' }}>
                {otpStage === 'pickup'
                  ? 'Ask customer for their 6-digit Pickup OTP to authorize loading.'
                  : 'Ask customer for their 6-digit Delivery OTP after inspecting dropped-off boxes.'}
              </p>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  maxLength={6}
                  value={inputOtp}
                  onChange={(e) => setInputOtp(e.target.value)}
                  placeholder={`Enter 6-digit ${otpStage} OTP`}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: '6px',
                    background: '#0F172A',
                    border: '1px solid #334155',
                    color: '#FFFFFF',
                    letterSpacing: '0.2em',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    textAlign: 'center'
                  }}
                />
                <button
                  type="submit"
                  className="btn btn-sm btn-outline-emerald"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Verify OTP
                </button>
              </div>

              <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '6px' }}>
                Demo Hint: {otpStage === 'pickup' ? `Customer OTP is ${currentEstimate.pickupOtp}` : `Customer OTP is ${currentEstimate.deliveryOtp}`}
              </div>
            </form>
          ) : (
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid #10B981',
              borderRadius: '6px',
              padding: '12px',
              textAlign: 'center'
            }}>
              <CheckCircle2 size={24} color="#10B981" style={{ margin: '0 auto 6px auto' }} />
              <div style={{ fontWeight: 800, color: '#10B981', fontSize: '0.95rem' }}>
                Shift Completed & Escrow Paid!
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px' }}>
                ₹1,890 has been transferred to Rajesh Sharma's Bank Account via IMPS.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
