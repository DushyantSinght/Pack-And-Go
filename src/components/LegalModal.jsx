import React from 'react';
import { X } from 'lucide-react';
import { useMove } from '../context/MoveContext';

const CO = import.meta.env.VITE_COMPANY_NAME || 'Pack&Go';
const ADDRESS = import.meta.env.VITE_COMPANY_ADDRESS || '[registered office address]';
const EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'support@packandgo.in';
const GRIEVANCE = import.meta.env.VITE_GRIEVANCE_OFFICER || '[Grievance Officer name]';
const UPDATED = '9 November 2026';

const DOCS = {
  terms: {
    title: 'Terms of Service',
    body: [
      ['Who we are', `${CO} ("we") runs a platform that connects customers with independent, verified Move Captains (drivers) for household relocation, and offers related services. Registered office: ${ADDRESS}.`],
      ['Your account', 'You must be 18+ and give accurate details, including a working mobile number and email. You are responsible for activity on your account. Keep your password and handover OTPs private.'],
      ['Bookings and prices', 'Prices are calculated from the volume you declare, road distance, stairs without a lift and the truck type, and include GST as shown at checkout. If the goods at pickup materially exceed what you declared, the Move Captain may decline the extra items or we may re-quote before loading.'],
      ['Payment and escrow', 'You pay in advance through our payment partner. We hold the amount until you share the Delivery OTP, then release the captain\'s share. Never pay a captain directly.'],
      ['Cancellation and rescheduling', 'See the Refund & Cancellation Policy. You may reschedule up to twice, until 4 hours before your slot.'],
      ['Prohibited items', 'We do not carry cash, jewellery, important documents, firearms, explosives, flammable liquids or gas cylinders, illegal goods, perishables, or live animals. Carry valuables yourself.'],
      ['Handover OTPs', 'Share the Pickup OTP only once loading is complete and the Delivery OTP only after you have checked your goods. Sharing an OTP confirms that stage of the move.'],
      ['Damage and loss', 'Report damage or missing items within 48 hours of delivery from My Moves, with photos. Our liability for goods not specially declared is limited to the amount set out in the claim decision, and in any case to the fare paid, except where the law does not allow such a limit.'],
      ['Move Captains', 'Captains are independent service providers who pass our licence and vehicle checks. We may suspend captains who breach our standards.'],
      ['Acceptable use', 'Do not misuse the platform, harass captains or other users, or try to access data that isn\'t yours.'],
      ['Changes and termination', 'We may update these terms; we will notify you of material changes. We may suspend accounts that breach them.'],
      ['Law and disputes', 'These terms are governed by the laws of India. Courts at our registered office city have jurisdiction, subject to your rights under the Consumer Protection Act, 2019.'],
      ['Contact', `${EMAIL}. Grievance Officer: ${GRIEVANCE}, ${EMAIL}.`]
    ]
  },
  privacy: {
    title: 'Privacy Policy',
    body: [
      ['What we collect', 'Name, email, mobile number, addresses and map locations, moving date, item list and photos you upload, payment status (card/UPI details are handled by our payment partner, not stored by us), chat messages, call logs, ratings and damage claims. For Move Captains: driving licence and vehicle registration numbers, and live location while a job is active.'],
      ['Why we use it', 'To quote, book and carry out your move; to let you and your Move Captain contact each other; to send booking updates by email/SMS; to process payments, refunds and claims; to keep the platform safe; and to meet legal obligations.'],
      ['AI features', 'If you use the AI room scan or PackBot, your photo or message is sent to our AI provider (Anthropic) to generate the result. Don\'t include personal documents in photos.'],
      ['Sharing', 'With your assigned Move Captain (name, phone, addresses, items) only once they accept your job; with payment, SMS, email, mapping and AI providers who process data for us; and with authorities where required by law. We do not sell your data.'],
      ['Live location', 'A captain\'s live location is shared with the customer of the active job only, and stops when the job ends.'],
      ['Retention', 'We keep booking and payment records for as long as tax and accounting law requires, and other data for as long as your account is active or as needed to resolve claims.'],
      ['Your rights', 'Under the Digital Personal Data Protection Act, 2023 you can ask to access, correct or erase your data, withdraw consent, and nominate someone to exercise your rights. Write to us at the address below.'],
      ['Security', 'Passwords are hashed, connections are encrypted, and handover codes are visible only to you.'],
      ['Grievances', `Grievance Officer: ${GRIEVANCE}, ${EMAIL}. We respond within the time required by law.`]
    ]
  },
  refunds: {
    title: 'Refund & Cancellation Policy',
    body: [
      ['Cancelling', 'Cancel any time before pickup from My Moves. Refund depends on how long before your slot you cancel:'],
      ['24 hours or more before', '100% refund.'],
      ['Between 24 and 4 hours before', '50% refund.'],
      ['Less than 4 hours before, or after pickup', 'No refund (the crew and truck are already committed). Contact support if there is a genuine emergency.'],
      ['If we cancel', 'If we or the Move Captain cancel, you get a full refund.'],
      ['Refund timing', 'Refunds go back to the original payment method, usually within 5–7 working days.'],
      ['Damage claims', 'Raise within 48 hours of delivery from My Moves with photos. We aim to decide within 2 working days; approved amounts are paid to you directly.'],
      ['Contact', EMAIL]
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
        {import.meta.env.DEV && (
          <div style={{ fontSize: '0.75rem', background: '#78350F', color: '#FEF3C7', padding: '6px 10px', borderRadius: 6, marginBottom: 14 }}>
            Draft for development — have a lawyer review this and fill in VITE_COMPANY_* details before launch.
          </div>
        )}
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
