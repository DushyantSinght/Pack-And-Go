// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React from 'react';
import { Printer, X } from 'lucide-react';
import { useMove } from '../context/MoveContext';

// Company details for receipts. A GST "Tax Invoice" may only be issued with a real
// GSTIN — set these in .env (VITE_COMPANY_*) once the business is registered.
const COMPANY = {
  name: import.meta.env.VITE_COMPANY_NAME || 'Pack&Go',
  address: import.meta.env.VITE_COMPANY_ADDRESS || '',
  gstin: import.meta.env.VITE_COMPANY_GSTIN || '',
  email: import.meta.env.VITE_SUPPORT_EMAIL || 'support@packandgo.in'
};

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt = (d) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }) : '—');

export const InvoiceModal = ({ isOpen, onClose }) => {
  const { invoiceBooking: b, user } = useMove();
  if (!isOpen || !b) return null;
  const pb = b.priceBreakdown || {};
  const pd = b.paymentDetails || {};
  const isTaxInvoice = !!COMPANY.gstin;
  const gstPct = pb.subtotal ? Math.round((pb.gst / pb.subtotal) * 100) : 18;

  const rows = [
    ['Base fare', pb.base],
    ['Volume charge', pb.volume],
    ['Distance charge', pb.distance],
    ...(pb.floors ? [['Stairs (no lift)', pb.floors]] : []),
    ...(pb.poolingDiscount ? [['Pooling discount', -pb.poolingDiscount]] : [])
  ];

  return (
    <div className="print-root" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 640, maxHeight: '94vh', overflowY: 'auto', background: '#fff', color: '#0F172A', borderRadius: 12, padding: 28, fontFamily: 'system-ui, sans-serif', fontSize: '0.85rem' }}>
        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 10 }}>
          <button onClick={() => window.print()} className="btn btn-sm" style={{ background: '#0F172A', color: '#fff', gap: 6 }}><Printer size={14} /> Print / Save PDF</button>
          <button onClick={onClose} className="btn btn-sm" style={{ background: '#E2E8F0', color: '#0F172A' }}><X size={14} /></button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0F172A', paddingBottom: 12, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.3rem' }}>{COMPANY.name}</div>
            {COMPANY.address && <div style={{ color: '#475569' }}>{COMPANY.address}</div>}
            {COMPANY.gstin && <div style={{ color: '#475569' }}>GSTIN: {COMPANY.gstin}</div>}
            <div style={{ color: '#475569' }}>{COMPANY.email}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{isTaxInvoice ? 'TAX INVOICE' : 'PAYMENT RECEIPT'}</div>
            <div>No. {b.bookingId}</div>
            <div style={{ color: '#475569' }}>Paid: {fmt(pd.paidAt)}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, margin: '16px 0' }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Billed to</div>
            <div>{b.userName || user?.name}</div>
            <div style={{ color: '#475569' }}>{b.userEmail}</div>
            {b.userPhone && <div style={{ color: '#475569' }}>+91 {b.userPhone}</div>}
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Move</div>
            <div style={{ color: '#475569' }}>{fmt(b.moveDate)} ({b.timeSlot})</div>
            <div style={{ color: '#475569' }}>{b.totalCuFt} cu ft • {b.distanceKm} km</div>
          </div>
        </div>
        <div style={{ color: '#475569', marginBottom: 14, lineHeight: 1.5 }}>
          <div><strong style={{ color: '#0F172A' }}>From:</strong> {b.origin}</div>
          <div><strong style={{ color: '#0F172A' }}>To:</strong> {b.destination}</div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F1F5F9' }}>
              <th style={{ textAlign: 'left', padding: 8 }}>Description</th>
              <th style={{ textAlign: 'right', padding: 8 }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} style={{ borderBottom: '1px solid #E2E8F0' }}>
                <td style={{ padding: 8 }}>{k}</td>
                <td style={{ padding: 8, textAlign: 'right' }}>{v < 0 ? `− ${inr(-v)}` : inr(v)}</td>
              </tr>
            ))}
            <tr><td style={{ padding: 8, fontWeight: 600 }}>Taxable value</td><td style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>{inr(pb.subtotal)}</td></tr>
            <tr><td style={{ padding: 8 }}>CGST ({gstPct / 2}%)</td><td style={{ padding: 8, textAlign: 'right' }}>{inr(pb.gst / 2)}</td></tr>
            <tr><td style={{ padding: 8 }}>SGST ({gstPct / 2}%)</td><td style={{ padding: 8, textAlign: 'right' }}>{inr(pb.gst / 2)}</td></tr>
            <tr style={{ background: '#0F172A', color: '#fff' }}>
              <td style={{ padding: 10, fontWeight: 800 }}>Total paid</td>
              <td style={{ padding: 10, textAlign: 'right', fontWeight: 800 }}>{inr(pd.amountPaid || pb.total)}</td>
            </tr>
            {pd.refundAmount ? (
              <tr><td style={{ padding: 8, color: '#B91C1C' }}>Refunded {fmt(pd.refundedAt)}</td><td style={{ padding: 8, textAlign: 'right', color: '#B91C1C' }}>− {inr(pd.refundAmount)}</td></tr>
            ) : null}
          </tbody>
        </table>

        <div style={{ marginTop: 14, color: '#475569', fontSize: '0.78rem', lineHeight: 1.5 }}>
          Payment: {pd.method || '—'} • Ref {pd.transactionId || '—'}
          {pd.testMode && <div style={{ color: '#B45309', fontWeight: 700 }}>TEST PAYMENT — no money was charged. Not valid as a receipt.</div>}
          {!isTaxInvoice && <div>This is a payment receipt, not a GST tax invoice.</div>}
        </div>
      </div>
    </div>
  );
};
