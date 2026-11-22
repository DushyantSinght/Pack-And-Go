// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { CreditCard, FileText, Loader2, ShieldCheck, X, FlaskConical, Smartphone, CheckCircle2, XCircle } from 'lucide-react';
import { useMove } from '../context/MoveContext';
import { api } from '../services/api';
import { SuccessCheck } from './ui/SuccessCheck';
import { Skeleton } from './ui/Skeleton';
import { haptic, HAPTIC } from '../utils/haptics';
import { TestPaymentDetails } from './TestPaymentDetails';

const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

const Choice = ({ active, onClick, icon, title, sub }) => (
  <button type="button" onClick={onClick} aria-pressed={active} className="btn btn-secondary"
    style={{ flex: '1 1 140px', justifyContent: 'flex-start', gap: 8, padding: '9px 11px', textAlign: 'left', minWidth: 0, borderColor: active ? 'var(--primary)' : undefined, background: active ? 'rgba(37, 99, 235,0.12)' : undefined }}>
    {icon}
    <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>{title}</span>
      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 500 }}>{sub}</span>
    </span>
  </button>
);

export const PaymentModal = ({ isOpen, onClose, onOpenInvoice }) => {
  const { payingBooking, showToast, upsertMove, refreshMyMoves, openMyMoves } = useMove();
  const [config, setConfig] = useState(null);
  const [busy, setBusy] = useState(false);
  const [paid, setPaid] = useState(null);
  const [error, setError] = useState('');
  const [method, setMethod] = useState('demo_card');
  const [outcome, setOutcome] = useState('success');

  useEffect(() => {
    if (!isOpen) return;
    setPaid(null);
    setError('');
    setOutcome('success');
    api.getPaymentConfig().then(setConfig).catch(() => setConfig({ demoPayments: false }));
  }, [isOpen]);

  if (!isOpen || !payingBooking) return null;
  const b = payingBooking;
  const pb = b.priceBreakdown || {};
  const total = pb.total || 0;

  const finish = (booking, txnId) => {
    setPaid({ booking, txnId });
    haptic(HAPTIC.success);
    upsertMove(booking);
    refreshMyMoves();
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    showToast('Simulated payment successful — your move is confirmed.', 'success');
  };

  const pay = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await api.payDemo({ bookingId: b.bookingId, method, outcome, expectedAmount: total });
      finish(r.booking, r.txnId);
    } catch (e) {
      if (e.code === 'payment_failed') {
        haptic(HAPTIC.warn);
        setError(`${e.message} Reference ${e.data?.txnId}.`);
      } else {
        if (e.code === 'amount_changed') refreshMyMoves();
        setError(e.message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 245, padding: 12 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Payment" style={{ width: '100%', maxWidth: 460, maxHeight: '94vh', overflowY: 'auto', background: 'var(--bg-card-solid)', border: '1px solid var(--border-gold)', borderRadius: 'var(--radius-lg)', padding: 22, position: 'relative' }}>
        <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ position: 'absolute', top: 14, right: 14, width: 32, height: 32, padding: 0, borderRadius: '50%' }} title="Close"><X size={16} /></button>

        {paid ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ marginBottom: 10 }}><SuccessCheck size={72} /></div>
            <div style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--text-main)' }}>Move confirmed</div>
            <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: '6px 0 16px' }}>
              {inr(paid.booking.paymentDetails?.amountPaid)} held until delivery for {paid.booking.bookingId}. We'll notify you when a Move Captain accepts.
              <br />Reference <code style={{ fontSize: '0.78rem' }}>{paid.txnId}</code>
              <br /><strong style={{ color: 'var(--amber)' }}>Simulated payment — no real money was charged.</strong>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm" onClick={() => { onClose(); openMyMoves(paid.booking.bookingId); }}>View my move</button>
              <button className="btn btn-secondary btn-sm" onClick={() => onOpenInvoice(paid.booking)} style={{ gap: 6 }}><FileText size={14} /> Receipt</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingRight: 40 }}><FlaskConical size={18} color="var(--primary)" /> Checkout <span className="badge badge-amber" style={{ fontSize: '0.6rem', padding: '2px 8px', whiteSpace: 'nowrap' }}>Simulated payment</span></div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 16px' }}>{b.bookingId} • {b.origin?.split(',')[0]} → {b.destination?.split(',')[0]}</div>

            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 14, fontSize: '0.84rem', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}><span>Moving fare</span><span>{inr(pb.subtotal)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginTop: 4 }}><span>GST</span><span>{inr(pb.gst)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)', borderTop: '1px solid var(--border-subtle)', marginTop: 8, paddingTop: 8 }}><span>Total</span><span>{inr(total)}</span></div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              <ShieldCheck size={16} color="var(--emerald-light)" style={{ flexShrink: 0 }} />
              The amount is held (escrow) and released to the Move Captain only after you share the Delivery OTP.
            </div>

            {!config ? (
              <Skeleton h={44} r={12} />
            ) : config.demoPayments ? (
              <>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Demo payment method</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <Choice active={method === 'demo_card'} onClick={() => setMethod('demo_card')} icon={<CreditCard size={16} />} title="Demo card" sub="No card details needed" />
                  <Choice active={method === 'demo_upi'} onClick={() => setMethod('demo_upi')} icon={<Smartphone size={16} />} title="Demo UPI" sub="No UPI ID or PIN needed" />
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Test scenario</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                  <Choice active={outcome === 'success'} onClick={() => setOutcome('success')} icon={<CheckCircle2 size={16} color="var(--emerald-light)" />} title="Successful payment" sub="Confirms the booking" />
                  <Choice active={outcome === 'failure'} onClick={() => setOutcome('failure')} icon={<XCircle size={16} color="#EF4444" />} title="Failed payment" sub="Bank declines; try again" />
                </div>
                <button disabled={busy} onClick={pay} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', gap: 8 }}>
                  {busy ? <Loader2 size={16} className="spin" /> : <FlaskConical size={16} />}
                  {outcome === 'success' ? `Pay ${inr(total)} (simulated)` : `Simulate a failed payment of ${inr(total)}`}
                </button>
                {error && <div role="alert" style={{ marginTop: 10, fontSize: '0.82rem', color: '#EF4444' }}>{error}</div>}
                <TestPaymentDetails />
              </>
            ) : (
              <div style={{ fontSize: '0.84rem', color: 'var(--rose)' }}>Payments are switched off on this server, so bookings can't be paid right now.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
