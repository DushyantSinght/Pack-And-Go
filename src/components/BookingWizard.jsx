// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Check, Loader2, Truck, Users, X } from 'lucide-react';
import { useMove } from '../context/MoveContext';
import { api } from '../services/api';
import { AddressInput } from './AddressInput';

const SLOTS = [
  { id: 'morning', label: '8 – 11 AM' },
  { id: 'midday', label: '11 AM – 2 PM' },
  { id: 'afternoon', label: '2 – 5 PM' },
  { id: 'evening', label: '5 – 8 PM' }
];
const SLOT_HOUR = { morning: 8, midday: 11, afternoon: 14, evening: 17 };

const istDate = (offsetDays = 0) => {
  const d = new Date(Date.now() + 5.5 * 3600_000 + offsetDays * 86400_000);
  return d.toISOString().slice(0, 10);
};
/** Slots need 3 hours notice (same rule as the server). */
const slotOpen = (date, slotId) => new Date(`${date}T${String(SLOT_HOUR[slotId]).padStart(2, '0')}:00:00+05:30`).getTime() > Date.now() + 3 * 3600_000;

const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

const field = { width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontSize: '0.88rem', boxSizing: 'border-box' };

const FloorPicker = ({ floors, lift, onFloors, onLift }) => (
  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
      Floor
      <select value={floors} onChange={(e) => onFloors(+e.target.value)} style={{ ...field, width: 'auto', padding: '5px 8px' }}>
        {Array.from({ length: 21 }, (_, i) => <option key={i} value={i}>{i === 0 ? 'Ground' : i}</option>)}
      </select>
    </label>
    {floors > 0 && (
      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
        <input type="checkbox" checked={lift} onChange={(e) => onLift(e.target.checked)} /> Goods/service lift available
      </label>
    )}
  </div>
);

export const BookingWizard = () => {
  const { isBookingOpen, setIsBookingOpen, currentEstimate, user, showToast, upsertMove, openPayment, refreshMyMoves } = useMove();
  const [step, setStep] = useState(0);
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [floorsFrom, setFloorsFrom] = useState(0);
  const [floorsTo, setFloorsTo] = useState(0);
  const [liftFrom, setLiftFrom] = useState(true);
  const [liftTo, setLiftTo] = useState(true);
  const [date, setDate] = useState(istDate(1));
  const [slot, setSlot] = useState('morning');
  const [pooled, setPooled] = useState(true);
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [verifyHint, setVerifyHint] = useState(null);

  useEffect(() => {
    if (isBookingOpen) {
      setStep(0);
      setError('');
      setPhone(user?.phone || '');
    }
  }, [isBookingOpen, user?.phone]);

  const cuFt = currentEstimate?.totalCuFt || 0;
  const itemCount = currentEstimate?.items?.length || 0;

  const quoteInput = useMemo(
    () => ({
      totalCuFt: cuFt,
      originLocation: from && { lat: from.lat, lng: from.lng },
      destinationLocation: to && { lat: to.lat, lng: to.lng },
      floorsOrigin: floorsFrom,
      floorsDestination: floorsTo,
      hasLiftOrigin: liftFrom,
      hasLiftDestination: liftTo,
      pooled
    }),
    [cuFt, from, to, floorsFrom, floorsTo, liftFrom, liftTo, pooled]
  );

  useEffect(() => {
    if (!isBookingOpen || step !== 2 || !from || !to) return undefined;
    let live = true;
    setQuoting(true);
    api.quoteMove(quoteInput)
      .then((r) => live && setQuote(r))
      .catch((e) => live && setError(e.message))
      .finally(() => live && setQuoting(false));
    return () => { live = false; };
  }, [isBookingOpen, step, quoteInput, from, to]);

  if (!isBookingOpen) return null;
  const close = () => setIsBookingOpen(false);

  const canNext = [
    !!from && !!to && from.label !== to.label,
    !!date && !!slot && slotOpen(date, slot),
    !!quote && /^[6-9]\d{9}$/.test(phone.replace(/\D/g, '').slice(-10))
  ][step];

  const book = async () => {
    setBusy(true);
    setError('');
    setVerifyHint(null);
    try {
      const res = await api.bookMove({
        bookingId: currentEstimate?.status === 'draft' ? currentEstimate.bookingId : undefined,
        origin: from.label,
        destination: to.label,
        originLocation: { lat: from.lat, lng: from.lng },
        destinationLocation: { lat: to.lat, lng: to.lng },
        floorsOrigin: floorsFrom,
        floorsDestination: floorsTo,
        hasLiftOrigin: liftFrom,
        hasLiftDestination: liftTo,
        date,
        timeSlot: slot,
        pooled,
        totalCuFt: cuFt,
        items: currentEstimate?.items,
        estimatedWeightKg: currentEstimate?.estimatedWeightKg,
        cartons: currentEstimate?.cartons,
        contactPhone: phone,
        notes
      });
      upsertMove(res.move);
      refreshMyMoves();
      showToast(`Booking ${res.move.bookingId} created — complete payment to confirm.`, 'success');
      close();
      openPayment(res.move);
    } catch (e) {
      setError(e.message);
      if (/verify your email/i.test(e.message)) setVerifyHint(true);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      const r = await api.resendVerification();
      setVerifyHint(r.devVerifyLink || 'sent');
      showToast(r.message, 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const steps = ['Addresses', 'Date & time', 'Review & book'];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 240, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }} onClick={close}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Book your move" style={{ width: '100%', maxWidth: 560, maxHeight: '94vh', overflowY: 'auto', background: 'var(--bg-card-solid)', border: '1px solid var(--border-gold)', borderRadius: 'var(--radius-lg)', padding: 22, boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-main)' }}>Book your move</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{itemCount} items • {cuFt} cu ft from your estimate</div>
          </div>
          <button onClick={close} className="btn btn-secondary btn-sm" style={{ width: 32, height: 32, padding: 0, borderRadius: '50%' }} title="Close"><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1 }}>
              <div style={{ height: 4, borderRadius: 4, background: i <= step ? 'var(--primary)' : 'var(--bg-elevated)' }} />
              <div style={{ fontSize: '0.7rem', marginTop: 4, color: i === step ? 'var(--primary)' : 'var(--text-dim)', fontWeight: i === step ? 700 : 500 }}>{i + 1}. {s}</div>
            </div>
          ))}
        </div>

        {cuFt < 10 && (
          <div style={{ fontSize: '0.82rem', color: 'var(--amber)', marginBottom: 12 }}>Add the items you're moving in the estimator first.</div>
        )}

        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <AddressInput label="Pickup address" value={from} onChange={setFrom} placeholder="House/flat, street, area, city" allowCurrentLocation />
              <FloorPicker floors={floorsFrom} lift={liftFrom} onFloors={setFloorsFrom} onLift={setLiftFrom} />
            </div>
            <div>
              <AddressInput label="Drop-off address" value={to} onChange={setTo} placeholder="Where are you moving to?" />
              <FloorPicker floors={floorsTo} lift={liftTo} onFloors={setFloorsTo} onLift={setLiftTo} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}><CalendarDays size={14} /> Moving date</span>
              <input type="date" value={date} min={istDate(0)} max={istDate(60)} onChange={(e) => setDate(e.target.value)} style={field} />
            </label>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>Arrival window</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {SLOTS.map((s) => {
                  const open = slotOpen(date, s.id);
                  return (
                    <button key={s.id} type="button" disabled={!open} onClick={() => setSlot(s.id)} className="btn btn-sm"
                      style={{ justifyContent: 'center', background: slot === s.id && open ? 'var(--primary)' : 'var(--bg-elevated)', color: slot === s.id && open ? '#111' : open ? 'var(--text-main)' : 'var(--text-dim)', border: '1px solid var(--border-subtle)', opacity: open ? 1 : 0.5 }}>
                      {s.label}{!open && ' (closed)'}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 6 }}>Slots need at least 3 hours notice.</div>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>Truck</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { v: true, icon: Users, t: 'Pooled', d: 'Share the truck on your route — cheaper, may take a little longer.' },
                  { v: false, icon: Truck, t: 'Dedicated', d: 'A truck just for you, direct to your new home.' }
                ].map(({ v, icon: Icon, t, d }) => (
                  <button key={t} type="button" onClick={() => setPooled(v)} style={{ textAlign: 'left', padding: 12, borderRadius: 'var(--radius-md)', cursor: 'pointer', background: pooled === v ? 'rgba(212,175,55,0.12)' : 'var(--bg-elevated)', border: `1px solid ${pooled === v ? 'var(--primary)' : 'var(--border-subtle)'}`, color: 'var(--text-main)' }}>
                    <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><Icon size={14} /> {t}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{d}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <div><strong style={{ color: 'var(--text-main)' }}>From:</strong> {from?.label}</div>
              <div><strong style={{ color: 'var(--text-main)' }}>To:</strong> {to?.label}</div>
              <div><strong style={{ color: 'var(--text-main)' }}>When:</strong> {new Date(`${date}T00:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}, {SLOTS.find((s) => s.id === slot)?.label} • {pooled ? 'Pooled' : 'Dedicated'} truck</div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 14, fontSize: '0.84rem' }}>
              {quoting || !quote ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}><Loader2 size={14} className="spin" /> Calculating your price…</div>
              ) : (
                <>
                  {[
                    ['Base fare', quote.quote.base],
                    [`Volume (${cuFt} cu ft)`, quote.quote.volume],
                    [`Distance (${quote.distanceKm} km by road)`, quote.quote.distance],
                    ...(quote.quote.floors ? [['Stairs (no lift)', quote.quote.floors]] : []),
                    ...(quote.quote.poolingDiscount ? [['Pooling discount', -quote.quote.poolingDiscount]] : []),
                    ['GST', quote.quote.gst]
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: v < 0 ? 'var(--emerald-light)' : 'var(--text-muted)' }}>
                      <span>{k}</span><span>{v < 0 ? `− ${inr(-v)}` : inr(v)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', marginTop: 6, paddingTop: 8, fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                    <span>Total</span><span>{inr(quote.quote.total)}</span>
                  </div>
                  {pooled && <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 4 }}>A dedicated truck would be {inr(quote.quote.soloTotal)}.</div>}
                </>
              )}
            </div>

            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Mobile number for your Move Captain
              <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" style={{ ...field, marginTop: 5 }} />
            </label>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Notes for the crew (optional)
              <textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 500))} rows={2} placeholder="Gate code, parking, fragile items…" style={{ ...field, marginTop: 5, resize: 'vertical' }} />
            </label>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              Free cancellation until 24h before your slot; 50% refund from 24h to 4h before. Your payment stays in escrow until you confirm delivery.
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginTop: 12, fontSize: '0.82rem', color: '#EF4444' }}>
            {error}
            {verifyHint && (
              <div style={{ marginTop: 6 }}>
                {typeof verifyHint === 'string' && verifyHint.startsWith('http') ? (
                  <a href={verifyHint} style={{ color: 'var(--primary)' }}>Development: open the verification link</a>
                ) : verifyHint === 'sent' ? (
                  <span style={{ color: 'var(--text-muted)' }}>Check your inbox for the link.</span>
                ) : (
                  <button type="button" onClick={resend} className="btn btn-secondary btn-sm">Resend verification email</button>
                )}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, gap: 10 }}>
          <button type="button" onClick={() => (step ? setStep(step - 1) : close())} className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
            <ArrowLeft size={14} /> {step ? 'Back' : 'Cancel'}
          </button>
          {step < 2 ? (
            <button type="button" disabled={!canNext || cuFt < 10} onClick={() => { setError(''); setStep(step + 1); }} className="btn btn-primary btn-sm" style={{ gap: 6, opacity: canNext && cuFt >= 10 ? 1 : 0.5 }}>
              Next <ArrowRight size={14} />
            </button>
          ) : (
            <button type="button" disabled={!canNext || busy} onClick={book} className="btn btn-primary btn-sm" style={{ gap: 6, opacity: canNext && !busy ? 1 : 0.5 }}>
              {busy ? <Loader2 size={14} className="spin" /> : <Check size={14} />} Book & continue to payment
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
