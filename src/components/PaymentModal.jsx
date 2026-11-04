import React, { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { useMove } from '../context/MoveContext';
import { api } from '../services/api';
import {
  X, ShieldCheck, Smartphone, CreditCard, Building,
  CheckCircle2, Lock, Clock, Sparkles, FileText, AlertTriangle
} from 'lucide-react';

// Load Razorpay checkout script dynamically
const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export const PaymentModal = ({ isOpen, onClose, onOpenInvoice }) => {
  const { currentEstimate, showToast, user } = useMove();

  const [activePaymentMethod, setActivePaymentMethod] = useState('upi-qr');
  const [upiIdInput, setUpiIdInput] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentRef, setPaymentRef] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(600);
  const [razorpayAvailable, setRazorpayAvailable] = useState(null); // null=checking, true/false

  // Guard: derive amounts safely
  const pooledPrice = currentEstimate?.pooledPrice || 1890;
  const gstAmount = Math.round(pooledPrice * 0.05);
  const totalAmount = pooledPrice + gstAmount;
  const totalAmountPaise = totalAmount * 100;

  const origin = currentEstimate?.origin?.split(',')[0] || 'Origin';
  const destination = currentEstimate?.destination?.split(',')[0] || 'Destination';

  // Countdown timer
  useEffect(() => {
    if (!isOpen || paymentSuccess) return;
    const interval = setInterval(() => setTimerSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(interval);
  }, [isOpen, paymentSuccess]);

  const formatTimer = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // Generate UPI QR
  useEffect(() => {
    if (!isOpen) return;
    const upiString = `upi://pay?pa=escrow.packandgo@icici&pn=PackAndGo%20Escrow&am=${totalAmount}&cu=INR&tn=PKG-RELOCATION-${Date.now()}`;
    QRCode.toDataURL(upiString, { width: 200, margin: 1, color: { dark: '#0F172A', light: '#FFFFFF' } })
      .then(setQrCodeDataUrl)
      .catch(console.error);
  }, [isOpen, totalAmount]);

  // Check if Razorpay API keys are configured
  const checkRazorpayConfig = useCallback(async () => {
    try {
      const res = await api.createPaymentOrder(currentEstimate?.bookingId, 100); // ₹1 test
      setRazorpayAvailable(!!res.key && res.key.length > 10);
    } catch (err) {
      // 503 = keys not configured; any other error = keys probably configured but amount too low
      if (err.message?.includes('not configured')) {
        setRazorpayAvailable(false);
      } else {
        setRazorpayAvailable(true); // Keys present, other issue
      }
    }
  }, [currentEstimate?.bookingId]);

  useEffect(() => {
    if (isOpen && razorpayAvailable === null) checkRazorpayConfig();
  }, [isOpen, razorpayAvailable, checkRazorpayConfig]);

  if (!isOpen) return null;

  // ── Launch Razorpay Checkout ───────────────────────────────────
  const handleRazorpayPayment = async () => {
    setIsProcessing(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) throw new Error('Failed to load Razorpay checkout. Check your connection.');

      const orderRes = await api.createPaymentOrder(currentEstimate?.bookingId || 'PKG-GUEST', totalAmountPaise);
      if (!orderRes.success) throw new Error(orderRes.message);

      const options = {
        key: orderRes.key,
        amount: orderRes.order.amount,
        currency: orderRes.order.currency,
        name: 'Pack&Go Relocation OS',
        description: `${origin} → ${destination} Pooled Move Escrow`,
        order_id: orderRes.order.id,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone ? `+91${user.phone}` : ''
        },
        theme: { color: '#10B981' },
        handler: async (response) => {
          // Verify on server
          const verifyRes = await api.verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            bookingId: currentEstimate?.bookingId || 'PKG-GUEST'
          });

          if (verifyRes.success) {
            setPaymentRef(response.razorpay_payment_id);
            setPaymentSuccess(true);
            confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
            showToast(`Payment ₹${totalAmount.toLocaleString('en-IN')} verified & locked in Escrow!`, 'success');
          } else {
            throw new Error('Payment verification failed. Please contact support.');
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            showToast('Payment cancelled.', 'error');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp) => {
        setIsProcessing(false);
        showToast(`Payment failed: ${resp.error.description}`, 'error');
      });
      rzp.open();
    } catch (err) {
      showToast(err.message || 'Payment initiation failed.', 'error');
      setIsProcessing(false);
    }
  };

  // ── Demo/Simulation fallback (when Razorpay not configured) ──
  const handleDemoSuccess = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setPaymentRef(`DEMO-TXN-${Date.now().toString().slice(-8)}`);
      setPaymentSuccess(true);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      showToast(`Demo payment ₹${totalAmount.toLocaleString('en-IN')} locked in Escrow!`, 'success');
    }, 1600);
  };

  const handleReset = () => {
    setPaymentSuccess(false);
    setIsProcessing(false);
    setPaymentRef(null);
    onClose();
  };

  const paymentMethods = [
    { id: 'upi-qr', label: 'UPI QR', icon: Smartphone },
    { id: 'upi-id', label: 'UPI ID', icon: Smartphone },
    { id: 'card', label: 'Cards', icon: CreditCard },
    { id: 'netbanking', label: 'NetBanking', icon: Building }
  ];

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 210, padding: '16px'
    }}>
      <div className="glass-panel" style={{
        width: '100%', maxWidth: '560px', maxHeight: '92vh', overflowY: 'auto',
        background: 'var(--bg-surface)', border: '1px solid var(--border-glow)',
        borderRadius: 'var(--radius-lg)', padding: '28px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)', position: 'relative'
      }}>
        {/* Close */}
        <button onClick={handleReset} style={{
          position: 'absolute', top: '20px', right: '20px',
          background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
          borderRadius: '50%', width: '32px', height: '32px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)', cursor: 'pointer'
        }}>
          <X size={16} />
        </button>

        {!paymentSuccess ? (
          <>
            {/* Header */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="badge badge-gold"><Lock size={12} /> RBI-Regulated Escrow Vault</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} /> Rate Lock expires in {formatTimer(timerSeconds)}
                </span>
              </div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0 }}>Lock Move with Escrow Protection</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Your money stays in escrow. The Move Captain is paid only after delivery OTP verification.
              </p>
            </div>

            {/* Amount Strip */}
            <div style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)', padding: '14px 18px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Guaranteed Pooled Move Fare
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '2px' }}>
                  {origin} ➔ {destination}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-serif)' }}>
                  ₹{totalAmount.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                  (incl. 5% GTA GST ₹{gstAmount})
                </div>
              </div>
            </div>

            {/* Razorpay Banner */}
            {razorpayAvailable === true && (
              <div style={{
                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: 'var(--radius-md)', padding: '10px 14px',
                marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '0.8rem', color: 'var(--primary)'
              }}>
                <ShieldCheck size={16} />
                <span><strong>Razorpay Live Gateway Connected.</strong> Your payment is processed securely via Razorpay.</span>
              </div>
            )}
            {razorpayAvailable === false && (
              <div style={{
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: 'var(--radius-md)', padding: '10px 14px',
                marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '0.8rem', color: '#F59E0B'
              }}>
                <AlertTriangle size={16} />
                <span><strong>Demo mode:</strong> Add <code>RAZORPAY_KEY_ID</code> & <code>RAZORPAY_KEY_SECRET</code> to <code>server/.env</code> for live payments.</span>
              </div>
            )}

            {/* Payment Method Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '20px' }}>
              {paymentMethods.map(({ id, label, icon: Icon }) => {
                const isActive = activePaymentMethod === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActivePaymentMethod(id)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                      padding: '10px 6px',
                      background: isActive ? 'var(--bg-surface)' : 'var(--bg-elevated)',
                      border: isActive ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                      cursor: 'pointer', fontSize: '0.75rem', fontWeight: isActive ? 700 : 500, transition: 'all 0.2s'
                    }}
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* UPI QR */}
            {activePaymentMethod === 'upi-qr' && (
              <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Scan with GPay, PhonePe, Paytm, CRED, BHIM
                </div>
                <div style={{ display: 'inline-block', padding: '12px', background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                  {qrCodeDataUrl
                    ? <img src={qrCodeDataUrl} alt="UPI Escrow QR" style={{ width: '180px', height: '180px', display: 'block' }} />
                    : <div style={{ width: '180px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>Generating…</div>
                  }
                </div>
                <div style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  VPA: <strong style={{ color: 'var(--text-main)' }}>escrow.packandgo@icici</strong>
                </div>
              </div>
            )}

            {/* UPI ID */}
            {activePaymentMethod === 'upi-id' && (
              <div style={{ padding: '20px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Enter your UPI ID / Virtual Payment Address
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={upiIdInput}
                    onChange={(e) => setUpiIdInput(e.target.value)}
                    placeholder="mobile@okhdfcbank"
                    style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                  />
                  <button onClick={() => setUpiIdInput('9876543210@paytm')} className="btn btn-sm btn-secondary" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    Sample VPA
                  </button>
                </div>
              </div>
            )}

            {/* Card */}
            {activePaymentMethod === 'card' && (
              <div style={{ padding: '20px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Card Number</label>
                  <input type="text" defaultValue="4532 •••• •••• 8821" style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontSize: '0.85rem' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expiry (MM/YY)</label>
                    <input type="text" defaultValue="08/28" style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CVV</label>
                    <input type="password" defaultValue="•••" style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontSize: '0.85rem' }} />
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={14} /> Corporate Relocation Reimbursement Card Eligible
                </div>
              </div>
            )}

            {/* NetBanking */}
            {activePaymentMethod === 'netbanking' && (
              <div style={{ padding: '16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Select Bank:</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {['HDFC Bank', 'ICICI Bank', 'State Bank', 'Axis Bank', 'Kotak', 'Others'].map((b) => (
                    <button key={b} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', textAlign: 'center', padding: '8px' }}>{b}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Escrow Guarantee */}
            <div style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 'var(--radius-md)', padding: '12px 14px', display: 'flex', alignItems: 'start', gap: '10px', marginBottom: '20px' }}>
              <ShieldCheck size={18} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.78rem', lineHeight: 1.45, color: 'var(--text-main)' }}>
                <strong>Zero-Risk Guarantee:</strong> If the driver is delayed beyond 45 mins without notice or conditions differ, your escrow is 100% refundable instantly under Model Tenancy Protection.
              </div>
            </div>

            {/* CTA */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={razorpayAvailable ? handleRazorpayPayment : handleDemoSuccess}
                disabled={isProcessing}
                className="btn btn-primary"
                style={{ flex: 1, padding: '12px', fontSize: '0.95rem' }}
              >
                {isProcessing ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="radar-dot" /> Validating Escrow Transfer...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <Lock size={16} />
                    {razorpayAvailable ? 'Pay' : 'Simulate'} ₹{totalAmount.toLocaleString('en-IN')} &amp; Lock Move
                    {razorpayAvailable && <Sparkles size={14} />}
                  </span>
                )}
              </button>
              <button onClick={onClose} className="btn btn-secondary" style={{ padding: '12px 16px' }}>Cancel</button>
            </div>
          </>
        ) : (
          /* ── Payment Success State ── */
          <div style={{ textAlign: 'center', padding: '20px 8px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '2px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: '#10B981' }}>
              <CheckCircle2 size={36} />
            </div>
            <div className="badge badge-emerald" style={{ margin: '0 auto 10px auto' }}>✓ Payment Verified &amp; Escrow Locked</div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 6px 0' }}>Booking Confirmed!</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 20px auto' }}>
              Txn Ref: <strong>{paymentRef}</strong> · ₹{totalAmount.toLocaleString('en-IN')} safely secured in RBI Escrow.
            </p>

            {/* OTP Box */}
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '18px', maxWidth: '380px', margin: '0 auto 24px auto', textAlign: 'left' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Move Security Credentials</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem' }}>Pickup Validation OTP:</span>
                <strong style={{ color: 'var(--primary)', letterSpacing: '0.1em' }}>{currentEstimate?.pickupOtp || '—'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem' }}>Delivery Escrow Release OTP:</span>
                <strong style={{ color: '#10B981', letterSpacing: '0.1em' }}>{currentEstimate?.deliveryOtp || '—'}</strong>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '8px' }}>
                * Share Delivery OTP with Move Captain ONLY after inspecting all boxes.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => { onClose(); if (onOpenInvoice) onOpenInvoice(); }}
                className="btn btn-primary btn-sm"
                style={{ gap: '6px' }}
              >
                <FileText size={15} /> View GST Tax Invoice
              </button>
              <button onClick={handleReset} className="btn btn-secondary btn-sm">Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
