// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useMove } from '../context/MoveContext';
import {
  X, Mail, Lock, User, ShieldCheck, Sparkles, ArrowRight,
  GraduationCap, Briefcase, Truck, Heart, Eye, EyeOff, CheckCircle2, Phone, ShoppingBag
} from 'lucide-react';
import confetti from 'canvas-confetti';

const USER_TYPES = [
  { id: 'student', label: 'Student / PG Tenant', icon: GraduationCap },
  { id: 'professional', label: 'Working Professional', icon: Briefcase },
  { id: 'parent', label: 'Parent / Guardian', icon: Heart },
  { id: 'captain', label: 'Fleet Move Captain', icon: Truck }
];

const DEMO_ACCOUNTS = [
  { email: 'demo@packandgo.in', label: 'Customer', icon: User },
  { email: 'captain.manju@packandgo.in', label: 'Driver', icon: Truck },
  { email: 'ananya.roy@packandgo.in', label: 'Seller', icon: ShoppingBag },
  { email: 'admin@packandgo.in', label: 'Admin', icon: ShieldCheck }
];

const validate = (formData, mode) => {
  const errors = {};
  if (mode === 'signup' && !formData.name.trim()) errors.name = 'Full name is required.';
  if (mode === 'signup' && formData.phone && !/^(\+?91[\s-]?)?[6-9]\d{9}$/.test(formData.phone.replace(/\s/g, ''))) {
    errors.phone = 'Enter a valid 10-digit Indian mobile number.';
  }
  if (mode === 'signup' && formData.userType === 'captain') {
    if (!formData.phone) errors.phone = 'Move Captains must add a mobile number.';
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{9,12}$/.test(formData.licenseNumber.toUpperCase().replace(/[\s-]/g, ''))) {
      errors.licenseNumber = 'Enter your driving licence number, e.g. KA01 20190001234.';
    }
    if (!/^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}$/.test(formData.vehicleNumber.toUpperCase().replace(/[\s-]/g, ''))) {
      errors.vehicleNumber = 'Enter the vehicle registration, e.g. KA01 MJ 4921.';
    }
  }
  if (!formData.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = 'Please enter a valid email address.';
  }
  if (!formData.password) {
    errors.password = 'Password is required.';
  } else if (formData.password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  }
  if (mode === 'signup' && formData.password && formData.password !== formData.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }
  if (mode === 'signup' && !formData.acceptTerms) errors.acceptTerms = 'Please accept the Terms and Privacy Policy.';
  return errors;
};

export const AuthModal = ({ isOpen, onClose, initialMode = 'login' }) => {
  const { login, signup, showToast, resetToken, setResetToken, setLegalDoc } = useMove();

  const [authMode, setAuthMode] = useState(initialMode);
  useEffect(() => {
    if (isOpen) setAuthMode(initialMode);
  }, [isOpen, initialMode]);
  const [recovery, setRecovery] = useState({ email: '', password: '', confirm: '', message: '', devLink: '', error: '', busy: false });

  const sendReset = async (e) => {
    e.preventDefault();
    setRecovery((r) => ({ ...r, busy: true, error: '', message: '' }));
    try {
      const res = await api.forgotPassword(recovery.email.trim().toLowerCase());
      setRecovery((r) => ({ ...r, busy: false, message: res.message, devLink: res.devResetLink || '' }));
    } catch (err) {
      setRecovery((r) => ({ ...r, busy: false, error: err.message }));
    }
  };

  const doReset = async (e) => {
    e.preventDefault();
    if (recovery.password.length < 6) return setRecovery((r) => ({ ...r, error: 'Password must be at least 6 characters.' }));
    if (recovery.password !== recovery.confirm) return setRecovery((r) => ({ ...r, error: 'Passwords do not match.' }));
    setRecovery((r) => ({ ...r, busy: true, error: '' }));
    try {
      const res = await api.resetPassword(resetToken, recovery.password);
      showToast(res.message, 'success');
      setResetToken(null);
      setRecovery({ email: '', password: '', confirm: '', message: '', devLink: '', error: '', busy: false });
      setAuthMode('login');
    } catch (err) {
      setRecovery((r) => ({ ...r, busy: false, error: err.message }));
    }
  };
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    acceptTerms: false,
    userType: 'student',
    licenseNumber: '',
    vehicleNumber: '',
    vehicleType: 'Tata Ace / mini-truck'
  });

  if (!isOpen) return null;

  const updateField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const switchMode = (mode) => {
    setAuthMode(mode);
    setErrors({});
    setSuccess(false);
    setFormData({ name: '', email: '', password: '', confirmPassword: '', phone: '', acceptTerms: false, userType: 'student', licenseNumber: '', vehicleNumber: '', vehicleType: 'Tata Ace / mini-truck' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate(formData, authMode);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});
    try {
      if (authMode === 'login') {
        await login({ email: formData.email.trim().toLowerCase(), password: formData.password });
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        showToast('Welcome back! Logged in successfully.', 'success');
      } else {
        const isCaptain = formData.userType === 'captain';
        const res = await signup({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          phone: formData.phone.replace(/\D/g, '').slice(-10),
          userType: formData.userType,
          acceptTerms: formData.acceptTerms,
          ...(isCaptain && {
            licenseNumber: formData.licenseNumber,
            vehicleNumber: formData.vehicleNumber,
            vehicleType: formData.vehicleType
          })
        });
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        showToast(
          isCaptain
            ? 'Application submitted! Verify your email — our team will check your licence and vehicle.'
            : res?.devVerifyLink
              ? 'Account created! Development: the email-verification link is in the yellow banner.'
              : 'Account created! Check your inbox to verify your email.',
          'success'
        );
      }
      setSuccess(true);
      setTimeout(() => onClose(), 800);
    } catch (err) {
      showToast(err.message || 'Authentication failed. Please try again.', 'error');
      setErrors({ submit: err.message || 'Authentication failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = (fieldKey) => ({
    width: '100%',
    padding: '11px 14px 11px 40px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-elevated)',
    border: `1px solid ${errors[fieldKey] ? '#EF4444' : 'var(--border-subtle)'}`,
    color: 'var(--text-main)',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box'
  });

  const iconStyle = { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: '20px'
    }}>
      <div className="glass-panel auth-dialog" role="dialog" aria-label="Sign in or create account" style={{
        width: '100%', maxWidth: '480px',
        maxHeight: 'calc(100dvh - 40px)',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        padding: '28px 32px',
        position: 'relative',
        background: 'var(--bg-card-solid)',
        border: '1px solid var(--border-gold)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        borderRadius: 'var(--radius-lg)'
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: 'absolute', top: '16px', right: '16px',
          background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
          color: 'var(--text-muted)', width: '32px', height: '32px',
          borderRadius: '50%', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <X size={16} />
        </button>

        {/* Success overlay */}
        {success && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle2 size={56} color="#10B981" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {authMode === 'login' ? 'Signed In!' : 'Account Created!'}
            </h3>
          </div>
        )}

        {!success && ['forgot', 'reset'].includes(authMode) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--text-main)' }}>
              {authMode === 'forgot' ? 'Reset your password' : 'Choose a new password'}
            </div>
            {authMode === 'forgot' ? (
              <form onSubmit={sendReset} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>We'll email you a link to set a new password.</div>
                <input type="email" required autoComplete="email" placeholder="you@example.com" value={recovery.email}
                  onChange={(e) => setRecovery((r) => ({ ...r, email: e.target.value }))} style={{ ...inputStyle('email'), paddingLeft: 12 }} />
                <button type="submit" disabled={recovery.busy} className="btn btn-primary" style={{ justifyContent: 'center' }}>
                  {recovery.busy ? 'Sending…' : 'Send reset link'}
                </button>
                {recovery.message && <div style={{ fontSize: '0.82rem', color: 'var(--emerald-light)' }}>{recovery.message}</div>}
                {recovery.devLink && (
                  <a href={recovery.devLink} style={{ fontSize: '0.78rem', color: 'var(--primary)' }}>Development (no email server): open the reset link</a>
                )}
              </form>
            ) : (
              <form onSubmit={doReset} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input type="password" autoComplete="new-password" placeholder="New password (6+ characters)" value={recovery.password}
                  onChange={(e) => setRecovery((r) => ({ ...r, password: e.target.value }))} style={{ ...inputStyle('password'), paddingLeft: 12 }} />
                <input type="password" autoComplete="new-password" placeholder="Confirm new password" value={recovery.confirm}
                  onChange={(e) => setRecovery((r) => ({ ...r, confirm: e.target.value }))} style={{ ...inputStyle('confirmPassword'), paddingLeft: 12 }} />
                <button type="submit" disabled={recovery.busy} className="btn btn-primary" style={{ justifyContent: 'center' }}>
                  {recovery.busy ? 'Saving…' : 'Save new password'}
                </button>
              </form>
            )}
            {recovery.error && <div style={{ fontSize: '0.82rem', color: '#EF4444' }}>{recovery.error}</div>}
            <button type="button" onClick={() => setAuthMode('login')} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.82rem' }}>
              ← Back to sign in
            </button>
          </div>
        )}

        {!success && !['forgot', 'reset'].includes(authMode) && (
          <>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <span className="badge badge-emerald" style={{ marginBottom: '10px', display: 'inline-flex' }}>
                <ShieldCheck size={12} /> Secure Login
              </span>
              <h2 style={{ fontSize: '1.7rem', fontWeight: 800, margin: '0 0 6px' }}>
                {authMode === 'login' ? 'Sign In to ' : 'Join '}
                <span style={{ color: 'var(--primary)' }}>Pack&Go</span>
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                Your unified relocation operating system
              </p>
            </div>

            {/* Mode Toggle */}
            <div style={{
              display: 'flex', background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)', padding: '4px', marginBottom: '24px',
              border: '1px solid var(--border-subtle)'
            }}>
              {[['login', 'Sign In'], ['signup', 'Create Account']].map(([mode, label]) => (
                <button key={mode} type="button" onClick={() => switchMode(mode)} style={{
                  flex: 1, padding: '9px', border: 'none', borderRadius: 'var(--radius-sm)',
                  background: authMode === mode ? 'var(--primary)' : 'transparent',
                  color: authMode === mode ? '#fff' : 'var(--text-muted)',
                  fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s'
                }}>
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Name (signup only) */}
              {authMode === 'signup' && (
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                    Full Name
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={15} color="var(--text-dim)" style={iconStyle} />
                    <input
                      type="text"
                      placeholder="Dushyant Singh"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      style={inputStyle('name')}
                      autoComplete="name"
                    />
                  </div>
                  {errors.name && <p style={{ fontSize: '0.75rem', color: '#EF4444', margin: '4px 0 0' }}>{errors.name}</p>}
                </div>
              )}

              {/* Mobile (signup only) — lets drivers & sellers call you back */}
              {authMode === 'signup' && (
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                    Mobile Number <span style={{ fontWeight: 400, color: 'var(--text-dim)' }}>(so your Move Captain can call you)</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={15} color="var(--text-dim)" style={iconStyle} />
                    <input
                      type="tel"
                      placeholder="98765 43210"
                      value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      style={inputStyle('phone')}
                      autoComplete="tel"
                      inputMode="tel"
                    />
                  </div>
                  {errors.phone && <p style={{ fontSize: '0.75rem', color: '#EF4444', margin: '4px 0 0' }}>{errors.phone}</p>}
                </div>
              )}

              {/* User Type (signup only) */}
              {authMode === 'signup' && (
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                    I am moving as a:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    {USER_TYPES.map(({ id, label, icon: Icon }) => {
                      const isSelected = formData.userType === id;
                      return (
                        <button key={id} type="button" onClick={() => updateField('userType', id)} style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                          background: isSelected ? 'rgba(16,185,129,0.12)' : 'var(--bg-elevated)',
                          border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                          color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                          fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                        }}>
                          <Icon size={13} />
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Move Captain application (verified by Pack&Go staff before approval) */}
              {authMode === 'signup' && formData.userType === 'captain' && (
                <div style={{ border: '1px solid var(--border-gold)', borderRadius: 'var(--radius-md)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                    <strong style={{ color: 'var(--primary)' }}>Driver verification.</strong> We check your licence and vehicle registration before you can accept jobs. This usually takes under 24 hours.
                  </div>
                  {[
                    { key: 'licenseNumber', label: 'Driving Licence Number', placeholder: 'KA01 20190001234' },
                    { key: 'vehicleNumber', label: 'Vehicle Registration Number', placeholder: 'KA01 MJ 4921' }
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>{label}</label>
                      <input
                        type="text"
                        placeholder={placeholder}
                        value={formData[key]}
                        onChange={(e) => updateField(key, e.target.value.toUpperCase())}
                        style={{ ...inputStyle(key), paddingLeft: '12px', letterSpacing: '0.04em' }}
                        autoComplete="off"
                      />
                      {errors[key] && <p style={{ fontSize: '0.75rem', color: '#EF4444', margin: '4px 0 0' }}>{errors[key]}</p>}
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Vehicle Type</label>
                    <select
                      value={formData.vehicleType}
                      onChange={(e) => updateField('vehicleType', e.target.value)}
                      style={{ ...inputStyle('vehicleType'), paddingLeft: '12px' }}
                    >
                      {['Tata Ace / mini-truck', '14ft truck', '17ft+ truck', 'Pickup / tempo', 'Electric cargo (EV)'].map((v) => (
                        <option key={v} value={v} style={{ background: '#111827' }}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} color="var(--text-dim)" style={iconStyle} />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    style={inputStyle('email')}
                    autoComplete="email"
                  />
                </div>
                {errors.email && <p style={{ fontSize: '0.75rem', color: '#EF4444', margin: '4px 0 0' }}>{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} color="var(--text-dim)" style={iconStyle} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={authMode === 'signup' ? 'At least 6 characters' : '••••••••'}
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    style={{ ...inputStyle('password'), paddingRight: '42px' }}
                    autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button type="button" onClick={() => setShowPassword((p) => !p)} style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)',
                    display: 'flex', alignItems: 'center'
                  }}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.password && <p style={{ fontSize: '0.75rem', color: '#EF4444', margin: '4px 0 0' }}>{errors.password}</p>}
              </div>

              {/* Confirm Password (signup only) */}
              {authMode === 'signup' && (
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                    Confirm Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={15} color="var(--text-dim)" style={iconStyle} />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      value={formData.confirmPassword}
                      onChange={(e) => updateField('confirmPassword', e.target.value)}
                      style={{ ...inputStyle('confirmPassword'), paddingRight: '42px' }}
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowConfirm((p) => !p)} style={{
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)',
                      display: 'flex', alignItems: 'center'
                    }}>
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p style={{ fontSize: '0.75rem', color: '#EF4444', margin: '4px 0 0' }}>{errors.confirmPassword}</p>}
                </div>
              )}

              {/* Forgot password (login) / Terms (signup) */}
              {authMode === 'login' && (
                <button type="button" onClick={() => { setAuthMode('forgot'); setRecovery((r) => ({ ...r, email: formData.email })); }}
                  style={{ alignSelf: 'flex-end', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.78rem', marginTop: -6 }}>
                  Forgot password?
                </button>
              )}
              {authMode === 'signup' && (
                <div>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.acceptTerms} onChange={(e) => updateField('acceptTerms', e.target.checked)} style={{ marginTop: 2 }} />
                    <span>
                      I agree to the{' '}
                      <button type="button" onClick={() => setLegalDoc('terms')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline', font: 'inherit' }}>Terms of Service</button>
                      {' '}and{' '}
                      <button type="button" onClick={() => setLegalDoc('privacy')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline', font: 'inherit' }}>Privacy Policy</button>.
                    </span>
                  </label>
                  {errors.acceptTerms && <p style={{ fontSize: '0.75rem', color: '#EF4444', margin: '4px 0 0' }}>{errors.acceptTerms}</p>}
                </div>
              )}

              {/* Server error */}
              {errors.submit && (
                <div style={{
                  padding: '10px 14px', background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem', color: '#EF4444'
                }}>
                  {errors.submit}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: '4px', fontWeight: 700, justifyContent: 'center' }}
              >
                {isLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <span className="radar-dot" />
                    {authMode === 'login' ? 'Signing In...' : 'Creating Account...'}
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    {authMode === 'login' ? 'Sign In' : 'Create Account'}
                    <ArrowRight size={16} />
                  </span>
                )}
              </button>
            </form>

            {/* Footer */}
            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              <ShieldCheck size={12} color="var(--primary)" style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Passwords hashed with bcrypt · JWT secured · 7-day session
            </div>

            {/* Demo accounts — development only */}
            {import.meta.env.DEV && (
            <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textAlign: 'center', marginBottom: '8px', letterSpacing: '0.05em' }}>
                QUICK DEMO LOGIN
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {DEMO_ACCOUNTS.map(({ email, label, icon: Icon }) => (
                  <button
                    key={email}
                    type="button"
                    disabled={isLoading}
                    onClick={async () => {
                      setIsLoading(true);
                      try {
                        await login({ email, password: 'demo1234' });
                        confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
                        showToast(`Logged in as ${label}`, 'success');
                        setTimeout(() => onClose(), 500);
                      } catch (err) {
                        showToast(err.message || 'Demo login failed — is the backend running?', 'error');
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.72rem', flexDirection: 'column', gap: '4px', padding: '8px 4px' }}
                    title={email}
                  >
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: '8px' }}>
                Tip: sign in as the Driver or Seller in a private window to reply to chats & calls in real time.
              </div>
            </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
