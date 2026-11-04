import React, { useRef } from 'react';
import { useMove } from '../context/MoveContext';
import {
  X,
  Printer,
  Download,
  Building,
  ShieldCheck,
  CheckCircle,
  QrCode,
  FileText
} from 'lucide-react';

export const InvoiceModal = ({ isOpen, onClose }) => {
  const { currentEstimate, user } = useMove();
  const printRef = useRef();

  if (!isOpen) return null;

  const invoiceNumber = 'PKG-INV-2026-0982';
  const invoiceDate = '17 September 2026';
  const taxableTransport = currentEstimate.pooledPrice - 390;
  const cartonsFee = 240;
  const labourFee = 150;
  const taxableSubtotal = currentEstimate.pooledPrice;
  const gstRate = 0.05; // 5% GTA GST
  const gstAmount = Math.round(taxableSubtotal * gstRate);
  const totalAmount = taxableSubtotal + gstAmount;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 220,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '750px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '36px',
        background: '#FFFFFF',
        color: '#0F172A',
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)'
      }} id="printable-invoice">
        {/* Top Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-emerald" style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>
              Official Tax Invoice
            </span>
            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
              Employer Reimbursement Compliant
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handlePrint}
              className="btn btn-sm btn-primary"
              style={{ background: '#0F172A', color: '#FFFFFF', gap: '6px' }}
            >
              <Printer size={15} /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              style={{
                background: '#F1F5F9',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} color="#475569" />
            </button>
          </div>
        </div>

        {/* Invoice Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
              Pack<span style={{ color: '#D4AF37' }}>&</span>Go Logistics Pvt Ltd
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
              CIN: U63090KA2025PTC188291 • GSTIN: <strong>29AABCP9921M1Z4</strong><br />
              Regd Office: 84/2, 4th Cross, Koramangala 4th Block, Bengaluru, KA 560034<br />
              Goods Transport Agency (GTA) Services • HSN/SAC: <strong>996511</strong>
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>{invoiceNumber}</div>
            <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Date: {invoiceDate}</div>
            <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Vehicle: <strong>KA-01-MJ-4921 (Tata Ace EV)</strong></div>
          </div>
        </div>

        {/* Billed To & Corridor Box */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '20px',
          background: '#F8FAFC',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px',
          border: '1px solid #E2E8F0',
          fontSize: '0.85rem'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>
              BILLED TO (EMPLOYEE / TENANT):
            </div>
            <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '1rem' }}>
              {user ? user.name : 'Dushyant Singh'}
            </div>
            <div style={{ color: '#475569' }}>Phone: +91 {user?.phone || '98765 43210'}</div>
            <div style={{ color: '#475569' }}>Email: {user?.email || 'dushyant@example.com'}</div>
            <div style={{ color: '#64748B', fontSize: '0.75rem', marginTop: '4px' }}>
              Corporate Claim: <strong>Relocation Allowance Expense</strong>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>
              TRANSIT CORRIDOR & VOLUME:
            </div>
            <div><strong>Origin:</strong> {currentEstimate.origin}</div>
            <div><strong>Destination:</strong> {currentEstimate.destination}</div>
            <div><strong>Volume / Weight:</strong> {currentEstimate.totalCuFt} cu. ft. • {currentEstimate.estimatedWeightKg} kg</div>
            <div><strong>Trip Type:</strong> Shared Corridor Freight Pooling (45% Eco-Consolidation)</div>
          </div>
        </div>

        {/* Line Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#F1F5F9', borderBottom: '2px solid #CBD5E1', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px' }}>#</th>
              <th style={{ padding: '10px 12px' }}>Service Description</th>
              <th style={{ padding: '10px 12px' }}>SAC Code</th>
              <th style={{ padding: '10px 12px' }}>Qty</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
              <td style={{ padding: '10px 12px' }}>1</td>
              <td style={{ padding: '10px 12px' }}>
                <strong>Corridor Freight Transport (Shared Load Allocation)</strong>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>14ft EV Electric Mini-Truck with GPS Live Geofencing</div>
              </td>
              <td style={{ padding: '10px 12px' }}>996511</td>
              <td style={{ padding: '10px 12px' }}>1 Trip</td>
              <td style={{ padding: '10px 12px', textAlign: 'right' }}>₹{taxableTransport.toLocaleString('en-IN')}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
              <td style={{ padding: '10px 12px' }}>2</td>
              <td style={{ padding: '10px 12px' }}>
                <strong>Thermal QR Luggage Passports & RFID Tamper Seals</strong>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Box-level digital chain of custody tags (4 cartons)</div>
              </td>
              <td style={{ padding: '10px 12px' }}>996511</td>
              <td style={{ padding: '10px 12px' }}>4 Units</td>
              <td style={{ padding: '10px 12px', textAlign: 'right' }}>₹{cartonsFee}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
              <td style={{ padding: '10px 12px' }}>3</td>
              <td style={{ padding: '10px 12px' }}>
                <strong>Certified Loading & Unloading Labour Assistance</strong>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>1 Move Captain + 1 Certified Helper (2.5 hrs)</div>
              </td>
              <td style={{ padding: '10px 12px' }}>996511</td>
              <td style={{ padding: '10px 12px' }}>Crew</td>
              <td style={{ padding: '10px 12px', textAlign: 'right' }}>₹{labourFee}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
              <td style={{ padding: '10px 12px' }}>4</td>
              <td style={{ padding: '10px 12px' }}>
                <strong>Security Deposit Protection & Transit Escrow Guarantee</strong>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>₹50,000 transit damage coverage + pre-move room audit</div>
              </td>
              <td style={{ padding: '10px 12px' }}>996511</td>
              <td style={{ padding: '10px 12px' }}>Escrow</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', color: '#059669' }}>FREE</td>
            </tr>
          </tbody>
        </table>

        {/* Totals Calculation */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
          <div style={{ width: '300px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: '#64748B' }}>Taxable Value:</span>
              <strong>₹{taxableSubtotal.toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: '#64748B' }}>CGST (2.5%):</span>
              <span>₹{(gstAmount / 2).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: '#64748B' }}>SGST (2.5%):</span>
              <span>₹{(gstAmount / 2).toFixed(2)}</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderTop: '2px solid #0F172A',
              borderBottom: '2px solid #0F172A',
              marginTop: '6px',
              fontSize: '1.15rem'
            }}>
              <strong>Total Invoice Amount:</strong>
              <strong style={{ color: '#059669' }}>₹{totalAmount.toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '4px', textAlign: 'right' }}>
              GST Payable on Forward Charge Basis (GTA)
            </div>
          </div>
        </div>

        {/* Signatures & Security Stamp */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #E2E8F0', paddingTop: '20px' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748B', maxWidth: '360px', lineHeight: 1.5 }}>
            <strong>Terms & Regulatory Declarations:</strong><br />
            This document is a certified Goods Consignment Note & Tax Invoice issued under Rule 4B of the Service Tax Rules, 1994 / Section 31 of CGST Act, 2017. Valid for full corporate claim reimbursement.
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              border: '2px dashed #D4AF37',
              padding: '8px 16px',
              borderRadius: '6px',
              color: '#B45309',
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.05em',
              marginBottom: '8px'
            }}>
              ✓ DIGITALLY VERIFIED GTA ESCROW
            </div>
            <div style={{ fontSize: '0.75rem', color: '#0F172A', fontWeight: 700 }}>Authorized Signatory</div>
            <div style={{ fontSize: '0.7rem', color: '#64748B' }}>Pack&Go Automated Dispatch System</div>
          </div>
        </div>
      </div>
    </div>
  );
};
