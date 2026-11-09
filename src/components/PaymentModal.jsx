import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, CreditCard, FileText, Loader2, Lock, ShieldCheck, X, FlaskConical } from 'lucide-react';
import { useMove } from '../context/MoveContext';
import { api } from '../services/api';

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

export const PaymentModal = ({ isOpen, onClose, onOpenInvoice }) => {
  const { payingBooking, showToast, user, upsertMove, refreshMyMoves, openMyMoves } = useMove();
  const [config, setConfig] = useState(null);
  const [busy, setBusy] = useState(false);
  const [paid, setPaid] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setPaid(null);
    setError('');
    api.getPaymentConfig().then(setConfig).catch(() => setConfig({ razorpay: false, testPayments: false }));
  }, [isOpen]);

  if (!isOpen || !payingBooking) return null;
  const b = payingBooking;
  const pb = b.priceBreakdown || {};
  const total = pb.total || 0;

  const finish = async (booking, message) => {
    setPaid(booking);
    upsertMove(booking);
    refreshMyMoves();
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    showToast(message, 'success');
  };

  const payOnline = async () => {
    setBusy(true);
    setError('');
    try {
      if (!(await loadRazorpayScript())) throw new Error('Could not load Razorpay. Check your connection.');
      const { order, key } = await api.post('/payments/create-order', { bookingId: b.bookingId });
      const rzp = new window.Razorpay({
        key,
        amount: order.amount,
        currency: order.currency,
        name: 'Pack&Go',
        description: `Move ${b.bookingId}`,
        order_id: order.id,
        prefill: { name: user?.name, email: user?.email, contact: b.userPhone ? `+91${b.userPhone}` : '' },
        notes: { bookingId: b.bookingId },
        theme: { color: '#D4AF37' },
        handler: async (resp) => {
          try {
            const v = await api.verifyPayment({ ...resp, bookingId: b.bookingId });
            await finish(v.booking, 'Payment received — your move is confirmed!');
          } catch (e) {
            setError(`${e.message} If money was deducted, it will be matched automatically or refunded.`);
          } finally {
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) }
      });
      rzp.on('payment.failed', (r) => {
        setError(r.error?.description || 'Payment failed. You have not been charged.');
        setBusy(false);
      });
      rzp.open();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  const payTest = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await api.testPay(b.bookingId);
      await finish(r.booking, 'Test payment recorded (no real money).');
    } catch (e) {
      setError(e.message);
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
            <CheckCircle2 size={52} color="#22C55E" style={{ margin: '0 auto 10px' }} />
            <div style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--text-main)' }}>Move confirmed</div>
            <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: '6px 0 16px' }}>
              {inr(paid.paymentDetails?.amountPaid)} held in escrow for {paid.bookingId}. We'll notify you when a Move Captain accepts.
              {paid.paymentDetails?.testMode && <><br /><strong style={{ color: 'var(--amber)' }}>Test payment — no real money was charged.</strong></>}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm" onClick={() => { onClose(); openMyMoves(paid.bookingId); }}>View my move</button>
              <button className="btn btn-secondary btn-sm" onClick={() => onOpenInvoice(paid)} style={{ gap: 6 }}><FileText size={14} /> Receipt</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}><Lock size={18} color="var(--primary)" /> Secure payment</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 16px' }}>{b.bookingId} • {b.origin?.split(',')[0]} → {b.destination?.split(',')[0]}</div>

            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 14, fontSize: '0.84rem', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}><span>Moving fare</span><span>{inr(pb.subtotal)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginTop: 4 }}><span>GST</span><span>{inr(pb.gst)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)', borderTop: '1px solid var(--border-subtle)', marginTop: 8, paddingTop: 8 }}><span>Total</span><span>{inr(total)}</span></div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              <ShieldCheck size={16} color="var(--emerald-light)" style={{ flexShrink: 0 }} />
              Your money is held in escrow and released to the Move Captain only after you share the Delivery OTP.
            </div>

            {!config ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}><Loader2 size={14} className="spin" /> Loading payment options…</div>
            ) : config.razorpay ? (
              <button disabled={busy} onClick={payOnline} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', gap: 8 }}>
                {busy ? <Loader2 size={16} className="spin" /> : <CreditCard size={16} />} Pay {inr(total)} — UPI, card, netbanking
              </button>
            ) : config.testPayments ? (
              <>
                <button disabled={busy} onClick={payTest} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', gap: 8 }}>
                  {busy ? <Loader2 size={16} className="spin" /> : <FlaskConical size={16} />} Record test payment of {inr(total)}
                </button>
                <div style={{ fontSize: '0.72rem', color: 'var(--amber)', marginTop: 8 }}>
                  Development mode: Razorpay keys aren't set, so this records a test payment without charging anyone. Add RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET to take real payments.
                </div>
              </>
            ) : (
              <div style={{ fontSize: '0.84rem', color: 'var(--rose)' }}>Online payments are temporarily unavailable. Please try again later.</div>
            )}
            {error && <div style={{ marginTop: 10, fontSize: '0.82rem', color: '#EF4444' }}>{error}</div>}
          </>
        )}
      </div>
    </div>
  );
};
