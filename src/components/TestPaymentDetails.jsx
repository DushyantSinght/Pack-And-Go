// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// Razorpay's published sandbox credentials, shown under the Pay button ONLY when the server is
// configured with a test key (rzp_test_…). Purely informational: payment still goes through
// Razorpay Checkout and is verified on the server exactly as in live mode.
import React, { useState } from 'react';
import { Check, Copy, CreditCard, Smartphone } from 'lucide-react';
import { useMove } from '../context/MoveContext';

const CopyBtn = ({ value, label }) => {
  const { showToast } = useMove();
  const [done, setDone] = useState(false);
  // Clipboard API first; fall back to a hidden textarea + execCommand (unfocused windows, older
  // browsers and non-HTTPS hosts can refuse the modern API).
  const write = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      if (!ok) throw new Error('copy blocked');
    }
  };
  const copy = async () => {
    try {
      await write(value);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
      showToast(`${label} copied`, 'success');
    } catch {
      showToast('Copy failed — select the text and copy it manually.', 'info');
    }
  };
  return (
    <button type="button" onClick={copy} className="btn btn-secondary btn-sm" aria-label={`Copy ${label}`} title={`Copy ${label}`}
      style={{ padding: '2px 8px', minHeight: 0, height: 26, gap: 4, fontSize: '0.7rem', flexShrink: 0 }}>
      {done ? <Check size={12} color="var(--emerald-light)" /> : <Copy size={12} />} {done ? 'Copied' : 'Copy'}
    </button>
  );
};

const Row = ({ k, v, copy }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '5px 0', borderTop: '1px dashed var(--border-subtle)', flexWrap: 'wrap' }}>
    <span style={{ color: 'var(--text-dim)', fontSize: '0.74rem' }}>{k}</span>
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      <code style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', overflowWrap: 'anywhere' }}>{v}</code>
      {copy && <CopyBtn value={copy} label={k} />}
    </span>
  </div>
);

export const TestPaymentDetails = () => (
  <section aria-label="Test payment details" style={{ marginTop: 12, padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px dashed rgba(245, 158, 11, 0.55)', background: 'rgba(245, 158, 11, 0.07)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-main)' }}>
      🧪 Test Payment Details
      <span className="badge badge-amber" style={{ fontSize: '0.6rem', padding: '2px 8px', whiteSpace: 'nowrap', flexShrink: 0 }}>Test Mode</span>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '6px 18px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 2 }}>
          <CreditCard size={13} /> Test Card (Successful Payment)
        </div>
        <Row k="Card number" v="4111 1111 1111 1111" copy="4111111111111111" />
        <Row k="Expiry" v="Any future date (e.g. 12/30)" />
        <Row k="CVV" v="Any 3 digits (e.g. 123)" />
        <Row k="Name" v="Any name" />
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 2 }}>
          <Smartphone size={13} /> Test UPI
        </div>
        <Row k="Success" v="success@razorpay" copy="success@razorpay" />
        <Row k="Failure" v="failure@razorpay" copy="failure@razorpay" />
      </div>
    </div>

    <p style={{ margin: '8px 0 0', fontSize: '0.7rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
      These are Razorpay test credentials. Use them only in Test Mode. No real money will be deducted.
    </p>
  </section>
);
