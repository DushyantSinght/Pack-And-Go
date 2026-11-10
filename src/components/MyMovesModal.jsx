// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, CalendarClock, Camera, CheckCircle2, FileText, KeyRound, Loader2, MessageSquare,
  Phone, Plus, ShieldAlert, Star, Truck, X, XCircle
} from 'lucide-react';
import { useMove } from '../context/MoveContext';
import { useComms } from '../context/CommsContext';
import { api } from '../services/api';
import { LiveMoveMap } from './LiveMoveMap';
import { StatusTimeline } from './ui/StatusTimeline';
import { FlipCode } from './ui/FlipCode';
import { SkeletonList } from './ui/Skeleton';
import { EmptyState } from './ui/EmptyState';
import { withViewTransition } from '../utils/viewTransition';
import { haptic, HAPTIC } from '../utils/haptics';
import { UserAvatar } from './ui/SafeImage';

const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const when = (d) => (d ? new Date(d).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '—');

const STATUS = {
  pending_payment: { label: 'Awaiting payment', color: '#F59E0B' },
  confirmed: { label: 'Confirmed • finding captain', color: '#3B82F6' },
  assigned: { label: 'Captain assigned', color: '#8B5CF6' },
  in_transit: { label: 'On the way', color: '#06B6D4' },
  delivered: { label: 'Delivered', color: '#22C55E' },
  cancelled: { label: 'Cancelled', color: '#6B7280' }
};

const SLOTS = [
  { id: 'morning', label: '8 – 11 AM' },
  { id: 'midday', label: '11 AM – 2 PM' },
  { id: 'afternoon', label: '2 – 5 PM' },
  { id: 'evening', label: '5 – 8 PM' }
];

const Badge = ({ status }) => (
  <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: `${STATUS[status]?.color || '#6B7280'}22`, color: STATUS[status]?.color || '#9CA3AF', whiteSpace: 'nowrap' }}>
    {STATUS[status]?.label || status}
  </span>
);

/** Shrink a photo before upload so claims stay small. */
const compress = (file, maxSide = 1280) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', 0.8));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });

const Section = ({ title, icon: Icon, children }) => (
  <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 14 }}>
    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
      {Icon && <Icon size={15} color="var(--primary)" />} {title}
    </div>
    {children}
  </div>
);

const MoveDetail = ({ move, onBack }) => {
  const { openPayment, openInvoice, upsertMove, showToast, refreshMyMoves } = useMove();
  const { openChat, requestCall } = useComms();
  const [panel, setPanel] = useState(null); // cancel | reschedule | claim
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('morning');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [claim, setClaim] = useState({ description: '', amount: '', photos: [] });
  const st = move.status;
  const deliveredRecently = st === 'delivered' && move.deliveredAt && Date.now() - new Date(move.deliveredAt).getTime() < 48 * 3600_000;

  const run = async (fn, ok) => {
    setBusy(true);
    try {
      const r = await fn();
      haptic(HAPTIC.success);
      if (r?.move) upsertMove(r.move);
      refreshMyMoves();
      showToast(ok, 'success');
      setPanel(null);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const addPhotos = async (files) => {
    const list = [...files].slice(0, 3 - claim.photos.length);
    try {
      const out = await Promise.all(list.map((f) => compress(f)));
      setClaim((c) => ({ ...c, photos: [...c.photos, ...out].slice(0, 3) }));
    } catch {
      showToast('Could not read that image.', 'error');
    }
  };

  const chatTarget = { contextType: 'booking', refId: move.bookingId };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, viewTransitionName: `move-${move.bookingId}`, borderRadius: 12 }}>
        <button onClick={onBack} className="btn btn-secondary btn-sm" style={{ width: 32, height: 32, padding: 0, borderRadius: '50%' }} title="All moves"><ArrowLeft size={15} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{move.bookingId}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{when(move.moveDate)} • {move.timeSlot}</div>
        </div>
        <Badge status={st} />
      </div>

      <StatusTimeline move={move} />

      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
        <div><strong style={{ color: 'var(--text-main)' }}>From:</strong> {move.origin}</div>
        <div><strong style={{ color: 'var(--text-main)' }}>To:</strong> {move.destination}</div>
        <div>{move.totalCuFt} cu ft • {move.distanceKm} km • {inr(move.priceBreakdown?.total)} • payment {move.paymentDetails?.status}{move.paymentDetails?.testMode ? ' (test)' : ''}</div>
        {move.cancellation?.at && <div>Cancelled {when(move.cancellation.at)}{move.paymentDetails?.refundAmount ? ` • refund ${inr(move.paymentDetails.refundAmount)}` : ''}</div>}
      </div>

      {st === 'pending_payment' && (
        <button className="btn btn-primary" onClick={() => openPayment(move)} style={{ justifyContent: 'center' }}>Pay {inr(move.priceBreakdown?.total)} to confirm</button>
      )}

      {move.captain && ['assigned', 'in_transit', 'delivered'].includes(st) && (
        <Section title="Your Move Captain" icon={Truck}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <UserAvatar src={move.captain.avatar} name={move.captain.name} size={44} />
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{move.captain.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>⭐ {move.captain.rating} • {move.captain.vehicleType} {move.captain.vehicleNumber}</div>
            </div>
            {st !== 'delivered' && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-outline-emerald btn-sm" onClick={() => requestCall(chatTarget)} style={{ gap: 5 }}><Phone size={13} /> Call</button>
                <button className="btn btn-secondary btn-sm" onClick={() => openChat(chatTarget)} style={{ gap: 5 }}><MessageSquare size={13} /> Chat</button>
              </div>
            )}
          </div>
        </Section>
      )}

      {['assigned', 'in_transit'].includes(st) && (
        <>
          <Section title="Handover codes — keep these private" icon={KeyRound}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[['Pickup', move.pickupOtp, !!move.pickupVerifiedAt, 'Share once boxes are loaded'], ['Delivery', move.deliveryOtp, !!move.deliveredAt, 'Share after checking everything arrived']].map(([k, v, done, hint]) => (
                <div key={k} style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: 10 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{k} OTP {done && '✓ used'}</div>
                  <div style={{ margin: '6px 0 4px' }}><FlipCode code={v} used={done} /></div>
                  <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>{hint}</div>
                </div>
              ))}
            </div>
          </Section>
          <Section title="Live tracking" icon={Truck}>
            <LiveMoveMap booking={move} />
          </Section>
        </>
      )}

      {st === 'delivered' && !move.review?.rating && (
        <Section title="How was your move?" icon={Star}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={`${n}-${n <= rating}`}
                onClick={() => { setRating(n); haptic(HAPTIC.tap); }}
                className={`star-btn ${n <= rating ? 'filled' : ''}`}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                aria-pressed={n <= rating}
              >
                <Star size={28} fill={n <= rating ? '#FBBF24' : 'none'} color="#FBBF24" style={{ animationDelay: `${(n - 1) * 60}ms` }} />
              </button>
            ))}
          </div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="Anything to tell your captain or us? (optional)" style={{ width: '100%', boxSizing: 'border-box', padding: 8, borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)' }} />
          <button disabled={!rating || busy} onClick={() => run(() => api.reviewMove(move.bookingId, rating, comment), 'Thanks for rating your move!')} className="btn btn-primary btn-sm" style={{ marginTop: 8, opacity: rating ? 1 : 0.5 }}>Submit rating</button>
        </Section>
      )}
      {move.review?.rating && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>You rated this move {'★'.repeat(move.review.rating)}{move.review.comment ? ` — “${move.review.comment}”` : ''}</div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {move.paymentDetails?.status && move.paymentDetails.status !== 'unpaid' && (
          <button className="btn btn-secondary btn-sm" onClick={() => openInvoice(move)} style={{ gap: 5 }}><FileText size={13} /> Receipt</button>
        )}
        {['pending_payment', 'confirmed', 'assigned'].includes(st) && (
          <button className="btn btn-secondary btn-sm" onClick={() => setPanel(panel === 'reschedule' ? null : 'reschedule')} style={{ gap: 5 }}><CalendarClock size={13} /> Reschedule</button>
        )}
        {['pending_payment', 'confirmed', 'assigned'].includes(st) && (
          <button className="btn btn-secondary btn-sm" onClick={() => setPanel(panel === 'cancel' ? null : 'cancel')} style={{ gap: 5, color: '#EF4444' }}><XCircle size={13} /> Cancel</button>
        )}
        {deliveredRecently && (
          <button className="btn btn-secondary btn-sm" onClick={() => setPanel(panel === 'claim' ? null : 'claim')} style={{ gap: 5 }}><ShieldAlert size={13} /> Report damage</button>
        )}
      </div>

      {panel === 'cancel' && (
        <Section title="Cancel this move?">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>
            {move.paymentDetails?.status === 'paid'
              ? `You'll get ${move.refundPercentIfCancelled}% back (${inr(((move.paymentDetails.amountPaid || 0) * move.refundPercentIfCancelled) / 100)}) to your original payment method.`
              : 'No payment has been taken.'}
          </div>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" style={{ width: '100%', boxSizing: 'border-box', padding: 8, borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)' }} />
          <button disabled={busy} onClick={() => run(() => api.cancelMove(move.bookingId, reason), 'Booking cancelled.')} className="btn btn-sm" style={{ marginTop: 8, background: '#DC2626', color: '#fff' }}>
            {busy ? <Loader2 size={13} className="spin" /> : 'Yes, cancel booking'}
          </button>
        </Section>
      )}

      {panel === 'reschedule' && (
        <Section title="Pick a new time">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} style={{ padding: 8, borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)' }} />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0' }}>
            {SLOTS.map((s) => (
              <button key={s.id} onClick={() => setSlot(s.id)} className="btn btn-sm" style={{ background: slot === s.id ? 'var(--primary)' : 'var(--bg-elevated)', color: slot === s.id ? '#111' : 'var(--text-main)', border: '1px solid var(--border-subtle)' }}>{s.label}</button>
            ))}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: 8 }}>Up to 2 reschedules, until 4 hours before your slot. Your captain may change.</div>
          <button disabled={!date || busy} onClick={() => run(() => api.rescheduleMove(move.bookingId, date, slot), 'Move rescheduled.')} className="btn btn-primary btn-sm">Confirm new time</button>
        </Section>
      )}

      {panel === 'claim' && (
        <Section title="Report damage or missing items" icon={ShieldAlert}>
          <textarea value={claim.description} onChange={(e) => setClaim({ ...claim, description: e.target.value })} rows={3} placeholder="What was damaged or missing? Which box?" style={{ width: '100%', boxSizing: 'border-box', padding: 8, borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)' }} />
          <input type="number" min="0" value={claim.amount} onChange={(e) => setClaim({ ...claim, amount: e.target.value })} placeholder="Estimated value (₹)" style={{ width: '100%', boxSizing: 'border-box', marginTop: 8, padding: 8, borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)' }} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            {claim.photos.map((p, i) => <img key={i} src={p} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6 }} />)}
            {claim.photos.length < 3 && (
              <label className="btn btn-secondary btn-sm" style={{ gap: 5, cursor: 'pointer' }}>
                <Camera size={13} /> Add photo
                <input type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => addPhotos(e.target.files)} />
              </label>
            )}
          </div>
          <button
            disabled={!claim.description.trim() || busy}
            onClick={() => run(() => api.fileClaim({ bookingId: move.bookingId, description: claim.description, amountClaimed: Number(claim.amount) || 0, photos: claim.photos }), 'Claim filed — we will review it within 2 working days.')}
            className="btn btn-primary btn-sm" style={{ marginTop: 10 }}
          >
            Submit claim
          </button>
        </Section>
      )}
    </div>
  );
};

export const MyMovesModal = () => {
  const { isMyMovesOpen, setIsMyMovesOpen, myMoves, selectedMoveId, setSelectedMoveId, openBooking, refreshMyMoves } = useMove();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isMyMovesOpen) return;
    setLoading(true);
    refreshMyMoves().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyMovesOpen]);

  if (!isMyMovesOpen) return null;
  const selected = myMoves.find((m) => m.bookingId === selectedMoveId);
  const close = () => setIsMyMovesOpen(false);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 235, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }} onClick={close}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="My moves" style={{ width: '100%', maxWidth: 620, maxHeight: '94vh', overflowY: 'auto', background: 'var(--bg-card-solid)', border: '1px solid var(--border-gold)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-main)' }}>My Moves</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={() => { close(); openBooking(); }} style={{ gap: 5 }}><Plus size={14} /> New move</button>
            <button onClick={close} className="btn btn-secondary btn-sm" style={{ width: 32, height: 32, padding: 0, borderRadius: '50%' }} title="Close"><X size={16} /></button>
          </div>
        </div>

        {selected ? (
          <MoveDetail move={selected} onBack={() => withViewTransition(() => setSelectedMoveId(null))} />
        ) : loading && !myMoves.length ? (
          <SkeletonList rows={3} />
        ) : !myMoves.length ? (
          <EmptyState
            art="truck"
            title="No moves yet"
            action={<button className="btn btn-primary btn-sm" onClick={() => { close(); openBooking(); }}>Book your first move</button>}
          >
            Estimate your items, pick a slot and we'll find you a verified Move Captain.
          </EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {myMoves.map((m) => (
              <button
                key={m.bookingId}
                className="lift"
                onClick={() => withViewTransition(() => setSelectedMoveId(m.bookingId))}
                style={{ viewTransitionName: `move-${m.bookingId}`, textAlign: 'left', padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', cursor: 'pointer', color: 'inherit' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{m.origin?.split(',')[0]} → {m.destination?.split(',')[0]}</span>
                  <Badge status={m.status} />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {m.bookingId} • {when(m.moveDate)} • {inr(m.priceBreakdown?.total)}
                  {m.status === 'delivered' && !m.review?.rating && <span style={{ color: '#FBBF24' }}> • Rate your move</span>}
                </div>
              </button>
            ))}
          </div>
        )}
        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
          <CheckCircle2 size={12} /> Payments are held in escrow until you confirm delivery with your OTP.
        </div>
      </div>
    </div>
  );
};
