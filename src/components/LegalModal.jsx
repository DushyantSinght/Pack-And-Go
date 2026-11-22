// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React from 'react';
import { X } from 'lucide-react';
import { useMove } from '../context/MoveContext';

const CO = import.meta.env.VITE_COMPANY_NAME || 'Pack&Go';
// Optional contact address for the project (set VITE_SUPPORT_EMAIL at build time). No invented address.
const EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || '';
const CONTACT = EMAIL ? `Email ${EMAIL}.` : 'Contact the project team (details are shared with the college evaluators).';
const UPDATED = '22 November 2026';

const DOCS = {
  terms: {
    title: 'Terms of Use',
    body: [
      ['About this project', `${CO} is a college capstone project built by Dushyant Singh Tanwar. It is a working academic prototype, not a registered company or a commercial moving service. It is shown to professors and other users for evaluation.`],
      ['No real moves, no real money', 'Bookings, Move Captains and payments here are for demonstration. Payments are SIMULATED: no money is ever charged, held, paid out or refunded, and no card, UPI or bank details are collected. Please do not rely on this site to move real belongings.'],
      ['Your account', 'Give a working email so you can verify it, and keep your password and handover codes private. Please don\'t use other people\'s details. Accounts that misuse the site may be blocked.'],
      ['Prices', 'Prices are calculated by fixed rules from the volume of your items, road distance and stairs without a lift, with GST shown separately. They are examples for the demo, not offers.'],
      ['AI features', 'The AI estimate and PackBot use Google Gemini. Their answers can be wrong; always check the item list before booking.'],
      ['Acceptable use', 'Don\'t try to break the site, access data that isn\'t yours, upload harmful or illegal content, or harass other users.'],
      ['No warranty', 'The site is provided as is, for academic evaluation. It may be unavailable, reset or changed at any time.'],
      ['Contact', CONTACT]
    ]
  },
  privacy: {
    title: 'Privacy Policy',
    body: [
      ['What we store', 'Name, email, mobile number, addresses and map points, moving date, item list and photos you upload, simulated payment records, chat messages, call logs, ratings and damage claims. For Move Captain accounts: driving licence and vehicle numbers, and live location while a job is active.'],
      ['Why', 'Only to make the demo work: estimates, bookings, chat between customer and captain, booking emails, simulated payments and claims, and keeping the site safe.'],
      ['Location', 'Your browser asks before sharing location. A captain\'s live location is shown only to the customer of the active job, and stops when the job ends or sharing is turned off. A family tracking link shows the truck on a map without prices or codes, and you can turn it off.'],
      ['AI', 'If you use the AI room scan, voice or typed inventory, or PackBot, your photo or text is sent to Google Gemini to produce the result. On the free plan Google may use it to improve its services, so don\'t include documents or personal details in photos or messages.'],
      ['Sharing', 'Your assigned captain sees your name, phone, addresses and items only after accepting your job. Emails are sent through Gmail. We don\'t sell or share data for advertising.'],
      ['Retention and deletion', 'Data is kept only while the project is being evaluated. Ask us to delete your account and data at any time.'],
      ['Security', 'Passwords are hashed, connections use HTTPS, sign-ins can be revoked, and handover codes are visible only to you.'],
      ['Contact', CONTACT]
    ]
  },
  refunds: {
    title: 'Refund & Cancellation Policy',
    body: [
      ['Simulated refunds', 'All payments and refunds on this site are simulated for the academic demo. No real money moves; refunds are recorded instantly in your booking history.'],
      ['Cancelling', 'Cancel any time before pickup from My Moves. The demo refund depends on how long before your slot you cancel:'],
      ['24 hours or more before', '100% refund.'],
      ['Between 24 and 4 hours before', '50% refund.'],
      ['Less than 4 hours before, or after pickup', 'No refund.'],
      ['Before a Move Captain accepts', 'Until a Move Captain accepts your move, cancelling is free (100%) at any time. If your slot passes without one, you can reschedule it from My Moves.'],
      ['If the move is cancelled for you', 'If the platform or the Move Captain cancels, you get a full (simulated) refund.'],
      ['Damage claims', 'Raise within 48 hours of delivery from My Moves with photos. Decisions are recorded in the app; any compensation is simulated.'],
      ['Contact', CONTACT]
    ]
  }
};

export const LegalModal = () => {
  const { legalDoc, setLegalDoc } = useMove();
  const doc = DOCS[legalDoc];
  if (!doc) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 320, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }} onClick={() => setLegalDoc(null)}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label={doc.title} style={{ width: '100%', maxWidth: 680, maxHeight: '92vh', overflowY: 'auto', background: 'var(--bg-card-solid)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 24, color: 'var(--text-main)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{doc.title}</h2>
          <button onClick={() => setLegalDoc(null)} className="btn btn-secondary btn-sm" style={{ width: 32, height: 32, padding: 0, borderRadius: '50%' }} title="Close"><X size={16} /></button>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: '4px 0 16px' }}>Last updated {UPDATED}</div>
        {doc.body.map(([h, t]) => (
          <div key={h} style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 2 }}>{h}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>{t}</div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          {Object.entries(DOCS).filter(([k]) => k !== legalDoc).map(([k, d]) => (
            <button key={k} onClick={() => setLegalDoc(k)} className="btn btn-secondary btn-sm">{d.title}</button>
          ))}
        </div>
      </div>
    </div>
  );
};
