import React, { useState } from 'react';
import {
  ArrowRight, Camera, CalendarCheck, Lock, KeyRound, Navigation, QrCode, MessageSquare, ShieldCheck,
  Recycle, Plus, Star, Truck, Mail
} from 'lucide-react';
import { useMove } from '../context/MoveContext';

const STEPS = [
  { icon: Camera, t: 'Scan or list your things', d: 'Photograph a room or just say what you\'re moving. AI builds an editable item list with volumes.' },
  { icon: CalendarCheck, t: 'Pick a slot, see the price', d: 'Exact addresses, floors and road distance give an itemised price before you pay a rupee.' },
  { icon: Lock, t: 'Pay into escrow', d: 'Your payment is held until delivery. A verified Move Captain accepts the job and you can chat or call.' },
  { icon: KeyRound, t: 'Hand over with OTPs', d: 'Share your pickup code once loaded and your delivery code after checking every box. Then it\'s paid out.' }
];

export const HowItWorks = () => (
  <section className="section">
    <div className="reveal">
      <div className="section-eyebrow">How it works</div>
      <h2 className="section-title">From room photo to new home in four steps</h2>
      <p className="section-sub">No surveyor visits, no surprise charges on moving day, and nobody gets paid until you say everything arrived.</p>
    </div>
    <div className="steps">
      {STEPS.map(({ icon: Icon, t, d }, i) => (
        <div key={t} className="step reveal" style={{ '--i': i }}>
          <div className="step-num"><Icon size={24} /></div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.12em' }}>STEP {i + 1}</div>
          <h3 style={{ fontSize: '1.08rem', margin: '4px 0 6px' }}>{t}</h3>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{d}</p>
        </div>
      ))}
    </div>
  </section>
);

const Feature = ({ icon: Icon, title, children, className = '', i, art }) => (
  <div className={`glass-panel lift reveal ${className}`} style={{ '--i': i }}>
    <div className="bento-icon"><Icon size={20} /></div>
    <h3 style={{ fontSize: '1.1rem' }}>{title}</h3>
    <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{children}</p>
    {art}
  </div>
);

export const FeatureGrid = () => (
  <section className="section">
    <div className="reveal">
      <div className="section-eyebrow">Why Pack&Go</div>
      <h2 className="section-title">Built for the way India actually moves</h2>
    </div>
    <div className="bento">
      <Feature i={0} className="b-wide" icon={Navigation} title="Watch your truck, live"
        art={
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span className="live-dot" /> Your captain shares GPS from their phone; you get a text when they're ~2 km away.
          </div>
        }>
        Real-time location on a map from the moment your Move Captain starts driving, with ETA and arrival alerts.
      </Feature>
      <Feature i={1} className="b-tall" icon={ShieldCheck} title="Escrow & OTP handover"
        art={
          <div style={{ marginTop: 'auto', display: 'grid', gap: 8 }}>
            {['Paid into escrow', 'Pickup OTP ✓', 'Delivery OTP ✓', 'Captain paid'].map((s, k) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', padding: '8px 10px', borderRadius: 10, background: 'var(--bg-elevated)', animation: `fadeUp .6s ${0.2 + k * 0.15}s both` }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(34,197,94,0.18)', color: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>✓</span> {s}
              </div>
            ))}
          </div>
        }>
        Two one-time codes protect both ends of your move. The money only moves when you read out the second one.
      </Feature>
      <Feature i={2} className="b-third" icon={QrCode} title="QR box passports">
        Print labels; your captain scans every box while loading so nothing is left behind.
      </Feature>
      <Feature i={3} className="b-third" icon={MessageSquare} title="Chat & call built in">
        Message or call your captain, or a resale seller, without sharing numbers in advance.
      </Feature>
      <Feature i={4} className="b-half" icon={Recycle} title="Sell what you won't carry">
        List furniture for the next tenant in your building. No truck, no transit fee, less CO₂.
      </Feature>
      <Feature i={5} className="b-half" icon={Truck} title="Pooled or dedicated">
        Share the truck with moves on your route to save on volume and distance, or book one just for you.
      </Feature>
    </div>
  </section>
);

const FAQS = [
  ['How is my price calculated?', 'From the volume of your items, the road distance between your addresses, and any stairs without a lift. Pooled trucks take about 40% off the volume and distance charges. GST is shown separately. The price you see before paying is the price you pay.'],
  ['When does the Move Captain get paid?', 'Your payment is held by Pack&Go. The captain\'s share is released only after you read out your Delivery OTP, once you\'ve checked your boxes at the new place.'],
  ['Can I cancel or reschedule?', 'Yes, from My Moves. Cancel 24+ hours before your slot for a full refund, or between 24 and 4 hours for 50%. You can reschedule up to twice, until 4 hours before your slot.'],
  ['Who are the Move Captains?', 'Independent drivers who apply with their driving licence and vehicle registration. Our team checks each application before they can accept jobs, and customers rate every move.'],
  ['What if something gets damaged?', 'Report it from My Moves within 48 hours of delivery with photos. Our team reviews claims within 2 working days.'],
  ['Do you move vehicles, cash or valuables?', 'No. We don\'t carry cash, jewellery, documents, gas cylinders or hazardous items. Please carry valuables yourself.']
];

export const FAQ = () => {
  const [open, setOpen] = useState(0);
  return (
    <section className="section faq-grid" id="faq">
      <div className="reveal">
        <div className="section-eyebrow">Questions</div>
        <h2 className="section-title">Good to know before you move</h2>
        <p className="section-sub">Still unsure? Ask PackBot in the corner, it knows your booking.</p>
      </div>
      <div className="reveal" style={{ '--i': 1 }}>
        {FAQS.map(([q, a], i) => (
          <div key={q} className={`faq-item ${open === i ? 'open' : ''}`}>
            <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
              {q} <Plus size={18} />
            </button>
            <div className="faq-a"><div><p>{a}</p></div></div>
          </div>
        ))}
      </div>
    </section>
  );
};

export const CtaBand = () => {
  const { openBooking } = useMove();
  return (
    <section className="cta-band reveal reveal-scale">
      <div className="section-eyebrow">Ready when you are</div>
      <h2 className="section-title" style={{ maxWidth: 680, margin: '8px auto 12px' }}>
        Your next home is <span className="gradient-text-animated" style={{ fontStyle: 'italic' }}>one booking away</span>
      </h2>
      <p className="section-sub" style={{ margin: '0 auto 24px' }}>Get an exact price in under a minute. Free cancellation up to 24 hours before your slot.</p>
      <button className="btn btn-primary btn-lg btn-glow" onClick={openBooking}>Book a move <ArrowRight size={16} /></button>
    </section>
  );
};

export const SiteFooter = () => {
  const { setLegalDoc, setActiveTab, openBooking, openMyMoves } = useMove();
  const go = (tab) => { setActiveTab(tab); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const email = import.meta.env.VITE_SUPPORT_EMAIL || 'support@packandgo.in';
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.4rem', letterSpacing: '-0.02em' }}>
            Pack<span style={{ color: 'var(--primary)', fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>&</span>Go
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', margin: '8px 0 14px', maxWidth: 320 }}>
            Packed with care. Settled with ease. Home relocation with escrow-protected payments and verified Move Captains.
          </p>
          <a className="btn btn-secondary btn-sm" href={`mailto:${email}`} style={{ gap: 6 }}><Mail size={14} /> {email}</a>
        </div>
        <div>
          <h4>Move</h4>
          <button className="footer-link" onClick={openBooking}>Book a move</button>
          <button className="footer-link" onClick={() => openMyMoves()}>My moves</button>
          <button className="footer-link" onClick={() => go('estimator')}>AI estimate</button>
          <button className="footer-link" onClick={() => go('tracking')}>Live tracking</button>
        </div>
        <div>
          <h4>Services</h4>
          <button className="footer-link" onClick={() => go('marketplace')}>Resale marketplace</button>
          <button className="footer-link" onClick={() => go('postmove')}>PGs, cooks & storage</button>
          <button className="footer-link" onClick={() => go('themes')}>Room setup</button>
          <button className="footer-link" onClick={() => go('campus')}>Campus move week</button>
        </div>
        <div>
          <h4>Company</h4>
          <button className="footer-link" onClick={() => setLegalDoc('terms')}>Terms of Service</button>
          <button className="footer-link" onClick={() => setLegalDoc('privacy')}>Privacy Policy</button>
          <button className="footer-link" onClick={() => setLegalDoc('refunds')}>Refunds & cancellation</button>
          <a className="footer-link" href="#faq">FAQ</a>
        </div>
      </div>
      <div style={{ maxWidth: 1360, margin: '32px auto 0', paddingTop: 18, borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
        <span>© {new Date().getFullYear()} {import.meta.env.VITE_COMPANY_NAME || 'Pack&Go'}. All rights reserved.</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Star size={12} /> Made in India for people on the move</span>
      </div>
    </footer>
  );
};
