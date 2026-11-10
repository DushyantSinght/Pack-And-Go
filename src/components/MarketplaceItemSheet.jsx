// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React from 'react';
import { Building, Leaf, MessageSquare, Phone, ShoppingBag, X, Tag } from 'lucide-react';
import { SafeImage } from './ui/SafeImage';

const vtName = (item) => `item-${String(item.itemId || item.id).replace(/[^a-zA-Z0-9-]/g, '')}`;
export const itemViewTransitionName = vtName;

/** Detail sheet for a resale listing. The photo morphs from the card via a View Transition. */
export const MarketplaceItemSheet = ({ item, onClose, onClaim, onChat, onCall }) => {
  if (!item) return null;
  const sellerName = typeof item.seller === 'object' ? item.seller?.name || 'Resident' : item.seller;
  const off = item.originalPrice ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100) : 0;
  const available = !item.status || item.status === 'available';
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 255, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }} onClick={onClose}>
      <div role="dialog" aria-label={item.title} onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 620, maxHeight: '94vh', overflowY: 'auto', background: 'var(--bg-card-solid)', border: '1px solid var(--border-gold)', borderRadius: 22, padding: 16, position: 'relative', boxShadow: '0 40px 90px -20px rgba(0,0,0,0.7)' }}>
        <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ position: 'absolute', top: 24, right: 24, width: 34, height: 34, padding: 0, borderRadius: '50%', zIndex: 2 }} aria-label="Close"><X size={16} /></button>
        <SafeImage src={item.imageUrl} alt={item.title} kind={item.category} className="sheet-img" style={{ viewTransitionName: vtName(item) }} />
        <div style={{ padding: '16px 8px 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}><Building size={13} color="var(--cyan)" /> {item.society}</div>
          <h3 style={{ fontSize: '1.35rem', margin: '6px 0 4px' }}>{item.title}</h3>
          <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>Seller: {sellerName} • {item.condition}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '14px 0 6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-heading)', letterSpacing: '-0.03em' }}>₹{item.price.toLocaleString('en-IN')}</span>
            {item.originalPrice > item.price && <span style={{ color: 'var(--text-dim)', textDecoration: 'line-through' }}>₹{item.originalPrice.toLocaleString('en-IN')}</span>}
            {off > 0 && <span className="badge badge-emerald"><Tag size={11} /> {off}% off</span>}
          </div>
          {item.description && <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{item.description}</p>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--emerald-light)', margin: '10px 0 16px' }}><Leaf size={14} /> Buying this instead of new saves about {item.co2SavedKg} kg CO₂</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
            <button disabled={!available} onClick={() => onClaim(item)} className="btn btn-primary" style={{ gap: 6, opacity: available ? 1 : 0.55 }}>
              <ShoppingBag size={15} /> {available ? 'Claim & arrange handoff' : 'Already claimed'}
            </button>
            <button onClick={() => onChat(item)} className="btn btn-secondary" style={{ gap: 6 }}><MessageSquare size={15} /> Chat</button>
            <button onClick={() => onCall(item)} className="btn btn-outline-emerald" style={{ gap: 6 }}><Phone size={15} /> Call</button>
          </div>
        </div>
      </div>
    </div>
  );
};
