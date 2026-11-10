// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React, { useEffect, useState } from 'react';
import { CalendarDays, Loader2, X } from 'lucide-react';
import { useMove } from '../context/MoveContext';
import { api } from '../services/api';
import { SuccessCheck } from './ui/SuccessCheck';
import { haptic, HAPTIC } from '../utils/haptics';

const tomorrow = () => new Date(Date.now() + 86400_000).toISOString().slice(0, 10);

/**
 * Shared "request a service" form. Creates a tracked ServiceRequest that the
 * ops team confirms by phone; the customer gets an in-app/email confirmation.
 *
 * request: { type: 'visit'|'service'|'storage'|'room_setup', title, subtitle?, details?, askDate?: boolean }
 */
export const ServiceRequestModal = ({ request, onClose }) => {
  const { user, openAuth, showToast, updateUser, currentEstimate } = useMove();
  const [date, setDate] = useState(tomorrow());
  const [notes, setNotes] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (request) {
      setDone(null);
      setNotes('');
      setPhone(user?.phone || '');
    }
  }, [request, user?.phone]);

  if (!request) return null;
  if (!user) {
    onClose();
    showToast('Please sign in to send a request.', 'info');
    openAuth('login');
    return null;
  }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (!user.phone) {
        const p = phone.replace(/\D/g, '').slice(-10);
        const r = await api.updateProfile({ phone: p });
        updateUser(r.user);
      }
      const r = await api.createServiceRequest({
        type: request.type,
        title: request.title,
        details: { ...(request.details || {}), notes: notes || undefined },
        preferredDate: request.askDate === false ? undefined : date,
        bookingId: currentEstimate?.status && currentEstimate.status !== 'draft' ? currentEstimate.bookingId : undefined
      });
      setDone(r.request);
      haptic(HAPTIC.success);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const field = { width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontSize: '0.88rem' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 260, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label={request.title} style={{ width: '100%', maxWidth: 440, background: 'var(--bg-card-solid)', border: '1px solid var(--border-gold)', borderRadius: 'var(--radius-lg)', padding: 22, position: 'relative' }}>
        <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ position: 'absolute', top: 12, right: 12, width: 30, height: 30, padding: 0, borderRadius: '50%' }} title="Close"><X size={14} /></button>
        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 8 }}><SuccessCheck size={64} /></div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-main)' }}>Request sent</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '6px 0 14px' }}>
              {done.requestId}: {done.title}. Our team will call {user.phone || phone} to confirm{done.preferredDate ? ` for ${new Date(done.preferredDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}.
            </div>
            <button className="btn btn-primary btn-sm" onClick={onClose}>Done</button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)', paddingRight: 30 }}>{request.title}</div>
              {request.subtitle && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{request.subtitle}</div>}
            </div>
            {request.askDate !== false && (
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}><CalendarDays size={13} /> Preferred date</span>
                <input type="date" required value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} style={field} />
              </label>
            )}
            {!user.phone && (
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Mobile number
                <input type="tel" required inputMode="tel" pattern="[0-9 +-]{10,15}" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" style={{ ...field, marginTop: 5 }} />
              </label>
            )}
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Anything we should know? (optional)
              <textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 500))} rows={2} style={{ ...field, marginTop: 5, resize: 'vertical' }} />
            </label>
            <button type="submit" disabled={busy} className="btn btn-primary" style={{ justifyContent: 'center', gap: 6 }}>
              {busy && <Loader2 size={14} className="spin" />} Send request
            </button>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>No payment now — we confirm availability and price with you first.</div>
          </form>
        )}
      </div>
    </div>
  );
};
