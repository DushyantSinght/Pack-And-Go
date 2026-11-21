// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// Shown under the Pay button: explains the SIMULATED checkout. Pack&Go is an academic project —
// no card or UPI details are collected and no money ever moves.
import React from 'react';
import { CheckCircle2, CreditCard, Smartphone, XCircle } from 'lucide-react';

const Line = ({ icon, children }) => (
  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '5px 0', borderTop: '1px dashed var(--border-subtle)', fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
    <span style={{ flexShrink: 0, marginTop: 1 }}>{icon}</span>
    <span>{children}</span>
  </div>
);

export const TestPaymentDetails = () => (
  <section aria-label="Simulated payment information" style={{ marginTop: 12, padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px dashed rgba(245, 158, 11, 0.55)', background: 'rgba(245, 158, 11, 0.07)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-main)', flexWrap: 'wrap' }}>
      🧪 Test Payment Information
      <span className="badge badge-amber" style={{ fontSize: '0.6rem', padding: '2px 8px', whiteSpace: 'nowrap' }}>Simulated</span>
    </div>
    <Line icon={<CheckCircle2 size={14} color="var(--emerald-light)" />}><strong>Successful payment</strong> confirms the booking and holds the amount until the Delivery OTP is shared.</Line>
    <Line icon={<XCircle size={14} color="#EF4444" />}><strong>Failed payment</strong> shows what happens when a bank declines: the booking stays unpaid and you can try again.</Line>
    <Line icon={<CreditCard size={14} />}><strong>Demo card</strong> and <Smartphone size={12} style={{ verticalAlign: '-2px' }} /> <strong>Demo UPI</strong> are pretend instruments: you never type a card number, UPI ID or PIN.</Line>
    <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: 'var(--text-main)', fontWeight: 700, lineHeight: 1.5 }}>
      Academic Demo — No Real Money Involved. No real money is deducted, and these records are not valid financial receipts.
    </p>
  </section>
);
