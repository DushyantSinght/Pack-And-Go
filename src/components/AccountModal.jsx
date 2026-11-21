// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// "Your account": change name and mobile number, change password. Opened from the name chip in the navbar.
import React, { useEffect, useState } from 'react';
import { BadgeCheck, KeyRound, Loader2, Mail, UserRound, X } from 'lucide-react';
import { useMove } from '../context/MoveContext';
import { api } from '../services/api';
import { Portal } from './ui/Portal';

const ROLE = { captain: 'Move Captain', outgoing: 'Seller', student: 'Student / PG tenant', professional: 'Working professional', parent: 'Parent / guardian', customer: 'Customer' };
const label = { fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 };
const box = { borderTop: '1px solid var(--border-subtle)', paddingTop: 14, marginTop: 14 };

export const AccountModal = ({ isOpen, onClose }) => {
  const { user, updateUser, showToast } = useMove();
  const [profile, setProfile] = useState({ name: '', phone: '' });
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState({});

  useEffect(() => {
    if (!isOpen || !user) return;
    setProfile({ name: user.name || '', phone: user.phone || '' });
    setPw({ current: '', next: '', confirm: '' });
    setError({});
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const saveProfile = async (e) => {
    e.preventDefault();
    const name = profile.name.trim();
    const phone = profile.phone.replace(/\D/g, '').slice(-10);
    if (!name) return setError({ profile: 'Enter your name.' });
    if (!/^[6-9]\d{9}$/.test(phone)) return setError({ profile: 'Enter a valid 10-digit mobile number.' });
    setBusy('profile');
    setError({});
    try {
      const r = await api.updateProfile({ name, phone });
      updateUser({ name: r.user?.name ?? name, phone: r.user?.phone ?? phone });
      showToast('Profile saved.', 'success');
    } catch (err) {
      setError({ profile: err.message });
    } finally {
      setBusy('');
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pw.next.length < 6) return setError({ pw: 'New password must be at least 6 characters.' });
    if (pw.next !== pw.confirm) return setError({ pw: "The new passwords don't match." });
    setBusy('pw');
    setError({});
    try {
      await api.changePassword(pw.current, pw.next);
      setPw({ current: '', next: '', confirm: '' });
      showToast('Password changed.', 'success');
    } catch (err) {
      setError({ pw: err.message });
    } finally {
      setBusy('');
    }
  };

  return (
    <Portal>
      <div style={{ position: 'fixed', inset: 0, zIndex: 260, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }} onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Your account" style={{ width: '100%', maxWidth: 440, maxHeight: '94vh', overflowY: 'auto', background: 'var(--bg-card-solid)', border: '1px solid var(--border-gold)', borderRadius: 'var(--radius-lg)', padding: 22, position: 'relative' }}>
          <button onClick={onClose} className="btn btn-secondary btn-sm" aria-label="Close" title="Close" style={{ position: 'absolute', top: 12, right: 12, width: 30, height: 30, padding: 0, borderRadius: '50%' }}><X size={14} /></button>
          <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8, paddingRight: 36 }}><UserRound size={18} color="var(--primary)" /> Your account</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', overflowWrap: 'anywhere' }}>
            <Mail size={13} /> {user.email}
            {user.emailVerified ? <span style={{ color: 'var(--emerald-light)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><BadgeCheck size={13} /> verified</span> : <span style={{ color: 'var(--amber)' }}>not verified</span>}
            <span>• {ROLE[user.userType] || 'Member'}</span>
          </div>

          <form onSubmit={saveProfile} style={box}>
            <label style={label} htmlFor="acct-name">Name</label>
            <input id="acct-name" className="form-input" value={profile.name} maxLength={80} onChange={(e) => setProfile({ ...profile, name: e.target.value })} autoComplete="name" />
            <label style={{ ...label, marginTop: 10 }} htmlFor="acct-phone">Mobile number</label>
            <input id="acct-phone" className="form-input" type="tel" inputMode="numeric" value={profile.phone} placeholder="98765 43210" onChange={(e) => setProfile({ ...profile, phone: e.target.value })} autoComplete="tel" />
            {error.profile && <div role="alert" style={{ color: '#EF4444', fontSize: '0.78rem', marginTop: 8 }}>{error.profile}</div>}
            <button type="submit" disabled={busy === 'profile'} className="btn btn-primary btn-sm" style={{ marginTop: 12, gap: 6 }}>
              {busy === 'profile' && <Loader2 size={14} className="spin" />} Save profile
            </button>
          </form>

          <form onSubmit={changePassword} style={box}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}><KeyRound size={15} /> Change password</div>
            <label style={label} htmlFor="acct-pw-cur">Current password</label>
            <input id="acct-pw-cur" className="form-input" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" required />
            <label style={{ ...label, marginTop: 10 }} htmlFor="acct-pw-new">New password</label>
            <input id="acct-pw-new" className="form-input" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" placeholder="At least 6 characters" required />
            <label style={{ ...label, marginTop: 10 }} htmlFor="acct-pw-confirm">Confirm new password</label>
            <input id="acct-pw-confirm" className="form-input" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" required />
            {error.pw && <div role="alert" style={{ color: '#EF4444', fontSize: '0.78rem', marginTop: 8 }}>{error.pw}</div>}
            <button type="submit" disabled={busy === 'pw'} className="btn btn-secondary btn-sm" style={{ marginTop: 12, gap: 6 }}>
              {busy === 'pw' && <Loader2 size={14} className="spin" />} Change password
            </button>
          </form>
        </div>
      </div>
    </Portal>
  );
};
