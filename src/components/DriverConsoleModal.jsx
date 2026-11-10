// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { DriverJobPanel } from './DriverJobPanel';
import { SuccessCheck } from './ui/SuccessCheck';
import { AnimatedNumber, inr } from './ui/AnimatedNumber';
import { haptic, HAPTIC } from '../utils/haptics';
import confetti from 'canvas-confetti';
import { useMove } from '../context/MoveContext';
import { useComms } from '../context/CommsContext';
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
  AlertCircle,
  MessageSquare
} from 'lucide-react';

export const DriverConsoleModal = ({ isOpen, onClose }) => {
  const { showToast, user, openAuth, updateUser } = useMove();
  const { openInbox, unreadTotal } = useComms();

  const [inputOtp, setInputOtp] = useState('');
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const isCaptain = user?.userType === 'captain' && user?.captainStatus === 'approved';
  const captainStatus = user?.userType === 'captain' ? user?.captainStatus : null;

  // Load real jobs from the server. Captains never receive customer OTPs.
  useEffect(() => {
    if (!isOpen || !isCaptain) return;
    setJobsLoading(true);
    api.getCaptainJobs()
      .then((res) => {
        setJobs(res.jobs || []);
        setSelectedJobId((prev) => prev || res.jobs?.[0]?.bookingId || '');
      })
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setJobsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isCaptain]);

  if (!isOpen) return null;

  const selectedJob = jobs.find((j) => j.bookingId === selectedJobId && j.assignedToMe);
  const otpStage = selectedJob?.stage || 'pickup'; // pickup | delivery | completed

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!selectedJob) return;
    if (!/^\d{6}$/.test(inputOtp)) {
      showToast('Enter the 6-digit code the customer reads out to you.', 'error');
      return;
    }
    setIsVerifying(true);
    try {
      const res = await api.verifyOtp({ bookingId: selectedJob.bookingId, otp: inputOtp, stage: otpStage });
      setJobs((prev) => prev.map((j) => (j.bookingId === res.job.bookingId ? res.job : j)));
      setInputOtp('');
      haptic(HAPTIC.success);
      if (res.job.stage === 'completed') {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
        showToast('✓ Delivery verified! Your payout is in your wallet.', 'success');
        api.getMe().then((r) => r?.user && updateUser(r.user)).catch(() => {});
      } else {
        showToast('✓ Pickup verified! Transit has started.', 'success');
      }
    } catch (err) {
      haptic(HAPTIC.warn);
      showToast(err.message, 'error');
    } finally {
      setIsVerifying(false);
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
              
            </div>
            <h3 style={{ fontSize: '1.2rem', margin: '2px 0 0 0', fontWeight: 700 }}>
              {user?.userType === 'captain' && user?.name ? `Captain ${user.name}` : 'Move Captain Console'}
            </h3>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
              Vehicle: <strong>{user?.captainApplication?.vehicleNumber || '—'}{user?.captainApplication?.vehicleType ? ` (${user.captainApplication.vehicleType})` : ''}</strong> • ⭐ {user?.rating ?? '—'} ({user?.tripsCompleted ?? 0} moves) • Wallet <AnimatedNumber value={user?.escrowWalletBalance || 0} format={inr} />
            </div>
          </div>
        </div>

        {/* Customer messages & calls */}
        <button
          onClick={() => { onClose(); openInbox(); }}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
            background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: 'var(--radius-md)',
            padding: '12px 14px', color: '#FFFFFF', cursor: 'pointer', marginBottom: '16px', fontWeight: 600, fontSize: '0.88rem'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={16} color="#10B981" /> Customer messages & calls
          </span>
          {unreadTotal > 0 ? (
            <span style={{ background: '#EF4444', borderRadius: 999, padding: '1px 8px', fontSize: '0.72rem', fontWeight: 800 }}>{unreadTotal} new</span>
          ) : (
            <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Open inbox →</span>
          )}
        </button>

        {isCaptain && (
          <DriverJobPanel jobs={jobs} setJobs={setJobs} loading={jobsLoading} selectedJobId={selectedJobId} setSelectedJobId={setSelectedJobId} />
        )}

        {/* Step 3: Dual-End OTP Handover & Escrow Release */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--radius-md)',
          padding: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <KeyRound size={15} color="#D4AF37" /> 3. Handover OTP
            </span>
            <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
              {otpStage === 'pickup' ? 'Pickup Verification' : otpStage === 'delivery' ? 'Delivery Handover' : 'Completed'}
            </span>
          </div>

          {captainStatus && captainStatus !== 'approved' ? (
            <div style={{ fontSize: '0.8rem', color: '#94A3B8', lineHeight: 1.5 }}>
              {captainStatus === 'pending'
                ? <>⏳ <strong style={{ color: '#FBBF24' }}>Application under review.</strong> Pack&Go is checking your licence and vehicle ({user.captainApplication?.vehicleNumber}). You'll be notified here as soon as you're approved.</>
                : <>⛔ <strong style={{ color: '#F87171' }}>Account {captainStatus}.</strong> {user.captainApplication?.reviewNote || 'Contact Pack&Go support.'}</>}
            </div>
          ) : !isCaptain ? (
            <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
              Sign in with a Move Captain account to verify customer handover codes.{' '}
              <button type="button" onClick={() => { onClose(); openAuth('login'); }} className="btn btn-sm btn-outline-emerald" style={{ marginLeft: 6 }}>Sign in</button>
            </div>
          ) : !selectedJob ? (
            <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Accept a job, then enter the customer's code at pickup and at delivery.</div>
          ) : otpStage !== 'completed' ? (
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
                  onChange={(e) => setInputOtp(e.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
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
                  disabled={isVerifying}
                >
                  {isVerifying ? 'Checking…' : 'Verify OTP'}
                </button>
              </div>

              <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '6px' }}>
                Codes are checked on the server. 5 wrong tries lock the booking for 15 minutes.
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
              <div style={{ marginBottom: 6 }}><SuccessCheck size={56} /></div>
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
