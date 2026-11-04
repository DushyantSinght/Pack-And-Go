import React, { useState } from 'react';
import { useMove } from '../context/MoveContext';
import { api } from '../services/api';
import {
  X,
  Mail,
  Lock,
  Phone,
  User,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  GraduationCap,
  Briefcase,
  Truck,
  Heart,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const AuthModal = ({ isOpen, onClose, initialMode = 'login' }) => {
  const { login, signup, showToast } = useMove();

  const [authMode, setAuthMode] = useState(initialMode); // 'login' | 'signup'
  const [step, setStep] = useState('phone'); // 'phone' | 'otp' | 'details'
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    otp: '',
    userType: 'student'
  });

  // Dev-mode OTP hint returned from server
  const [devOtp, setDevOtp] = useState('');

  if (!isOpen) return null;

  const updateField = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  // ── Step 1: Send OTP ─────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!formData.phone || formData.phone.length < 10) {
      showToast('Please enter a valid 10-digit mobile number.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.sendOtp(formData.phone);
      if (res.devOtp) setDevOtp(res.devOtp);
      setStep('otp');
      showToast(`OTP sent to +91 ${formData.phone}`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to send OTP. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Verify OTP & Submit ──────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.otp || formData.otp.length < 4) {
      showToast('Please enter the OTP sent to your phone.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      if (authMode === 'login') {
        await login({
          phone: formData.phone,
          otp: formData.otp,
          email: formData.email || undefined,
          password: formData.password || undefined,
          userType: formData.userType
        });
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        showToast('Welcome back! Logged in successfully.', 'success');
      } else {
        await signup({
          name: formData.name,
          phone: formData.phone,
          email: formData.email || undefined,
          password: formData.password || undefined,
          otp: formData.otp,
          userType: formData.userType
        });
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        showToast('Account created! Welcome to Pack&Go Relocation OS.', 'success');
      }
      onClose();
    } catch (err) {
      showToast(err.message || 'Authentication failed. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setDevOtp('');
    setIsLoading(true);
    try {
      const { api } = await import('../services/api.js');
      const res = await api.sendOtp(formData.phone);
      if (res.devOtp) setDevOtp(res.devOtp);
      showToast('New OTP sent!', 'success');
    } catch (err) {
      showToast('Could not resend OTP. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetFlow = () => {
    setStep('phone');
    setDevOtp('');
    setFormData({ name: '', phone: '', email: '', password: '', otp: '', userType: 'student' });
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%', maxWidth: '520px', padding: '30px',
        position: 'relative', background: 'var(--bg-card-solid)',
        border: '1px solid var(--border-gold)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)'
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: 'absolute', top: '18px', right: '18px',
          background: 'var(--bg-elevated)', border: 'none',
          color: 'var(--text-muted)', width: '32px', height: '32px',
          borderRadius: '50%', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <span className="badge badge-emerald"><Sparkles size={12} /> Secure OTP Login</span>
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800 }}>
            {authMode === 'login' ? 'Sign In to ' : 'Join '}
            <span style={{ color: 'var(--primary)' }}>Pack&Go</span>
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            One unified login for all 5 relocation services.
          </p>
        </div>

        {/* Mode Toggle */}
        <div style={{
          display: 'flex', background: 'rgba(255,255,255,0.04)',
          borderRadius: 'var(--radius-md)', padding: '4px', marginBottom: '20px',
          border: '1px solid var(--border-subtle)'
        }}>
          {['login', 'signup'].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => { setAuthMode(mode); resetFlow(); }}
              style={{
                flex: 1, padding: '8px', border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: authMode === mode ? 'var(--primary)' : 'transparent',
                color: authMode === mode ? '#fff' : 'var(--text-muted)',
                fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {/* User Type (signup only) */}
        {authMode === 'signup' && step === 'phone' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              I am moving as a:
            </label>
            <div className="grid-2" style={{ gap: '8px' }}>
              {[
                { id: 'student', label: 'Student / PG Tenant', icon: GraduationCap },
                { id: 'professional', label: 'Working Professional', icon: Briefcase },
                { id: 'parent', label: 'Parent / Guardian', icon: Heart },
                { id: 'captain', label: 'Fleet Move Captain', icon: Truck }
              ].map(({ id, label, icon: Icon }) => {
                const isSelected = formData.userType === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => updateField('userType', id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                      color: isSelected ? '#FFFFFF' : 'var(--text-muted)',
                      fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left'
                    }}
                  >
                    <Icon size={14} color={isSelected ? 'var(--primary)' : 'var(--text-dim)'} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STEP 1: Phone entry ── */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {authMode === 'signup' && (
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={15} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '14px' }} />
                  <input
                    type="text"
                    placeholder="Dushyant Singh"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '36px' }}
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Mobile Number
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '12px', fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 600 }}>+91</span>
                <input
                  type="tel"
                  placeholder="98765 43210"
                  maxLength={10}
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value.replace(/\D/g, ''))}
                  className="form-input"
                  style={{ paddingLeft: '44px' }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Email Address <span style={{ color: 'var(--text-dim)' }}>(optional)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '14px' }} />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '36px' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '6px', fontWeight: 700 }}
            >
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                  <span className="radar-dot" /> Sending OTP...
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                  <Phone size={16} /> Send OTP to +91 {formData.phone || '···'}
                </span>
              )}
            </button>
          </form>
        )}

        {/* ── STEP 2: OTP Verification ── */}
        {step === 'otp' && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
                  Enter OTP sent to +91 {formData.phone}
                </span>
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  style={{ fontSize: '0.72rem', color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Change Number
                </button>
              </div>

              <input
                type="text"
                inputMode="numeric"
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                value={formData.otp}
                onChange={(e) => updateField('otp', e.target.value.replace(/\D/g, ''))}
                className="form-input"
                style={{ textAlign: 'center', letterSpacing: '0.4em', fontSize: '1.3rem', fontWeight: 800 }}
                autoFocus
                required
              />

              {/* Dev hint — only shown when server returns devOtp in development mode */}
              {devOtp && (
                <div style={{
                  marginTop: '8px', padding: '6px 10px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '6px',
                  fontSize: '0.72rem', color: '#F59E0B'
                }}>
                  🛠 Dev mode OTP: <strong style={{ letterSpacing: '0.2em' }}>{devOtp}</strong>
                </div>
              )}
            </div>

            {/* Optional password for returning users */}
            {authMode === 'signup' && (
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Set Password <span style={{ color: 'var(--text-dim)' }}>(optional — for email login)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '14px' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 8 characters"
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '36px', paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    style={{ position: 'absolute', right: '12px', top: '13px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                disabled={isLoading || formData.otp.length < 4}
                className="btn btn-primary btn-lg"
                style={{ flex: 1, fontWeight: 700 }}
              >
                {isLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <span className="radar-dot" /> Verifying...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <ShieldCheck size={16} />
                    {authMode === 'login' ? 'Sign In Securely' : 'Create Account'}
                    <ArrowRight size={16} />
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isLoading}
                className="btn btn-secondary"
                style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Resend OTP"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </form>
        )}

        {/* Security footer */}
        <div style={{ marginTop: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
          <ShieldCheck size={12} color="var(--primary)" />
          Secured with JWT · Passwords hashed with bcrypt · OTP expires in 5 min
        </div>
      </div>
    </div>
  );
};
