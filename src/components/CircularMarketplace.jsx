// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React, { useState } from 'react';
import { useMove } from '../context/MoveContext';
import { useComms } from '../context/CommsContext';
import { ServiceRequestModal } from './ServiceRequestModal';
import { BUYBACK_DEVICES } from '../data/mockData';
import {
  Repeat,
  Leaf,
  Plus,
  Building,
  Tag,
  DollarSign,
  TrendingDown,
  Sparkles,
  ShoppingBag,
  Zap,
  ArrowRight,
  Calculator,
  MessageSquare,
  Phone,
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const CircularMarketplace = () => {
  const {
    marketplaceItems,
    addMarketplaceItem,
    claimMarketplaceItem,
    carbonSavedTotalKg,
    activeRole,
    showToast
  } = useMove();

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSocietyFilter, setSelectedSocietyFilter] = useState('All');
  const [showListingModal, setShowListingModal] = useState(false);

  // Instant Buyback Calculator State
  const [selectedBuybackDevice, setSelectedBuybackDevice] = useState(BUYBACK_DEVICES[0].id);
  const [deviceCondition, setDeviceCondition] = useState('like-new'); // 'like-new' | 'good' | 'fair'
  const [appraisedQuote, setAppraisedQuote] = useState(6500);

  // New Listing Form State
  const [listingForm, setListingForm] = useState({
    title: '',
    society: 'Prestige Falcon City, Bengaluru',
    category: 'Furniture',
    price: '',
    originalPrice: '',
    condition: 'Like New (6 months old)',
    description: ''
  });

  // Calculate buyback quote dynamically
  const calculateBuyback = (devId, cond) => {
    const dev = BUYBACK_DEVICES.find((d) => d.id === devId) || BUYBACK_DEVICES[0];
    let multiplier = cond === 'like-new' ? 0.9 : cond === 'good' ? 0.7 : 0.5;
    const quote = Math.round(dev.maxQuote * multiplier);
    setAppraisedQuote(quote);
  };

  const handleDeviceChange = (devId) => {
    setSelectedBuybackDevice(devId);
    calculateBuyback(devId, deviceCondition);
  };

  const handleConditionChange = (cond) => {
    setDeviceCondition(cond);
    calculateBuyback(selectedBuybackDevice, cond);
  };

  const { openChat, requestCall } = useComms();
  const [buybackRequest, setBuybackRequest] = useState(null);

  const handleClaim = (item) => {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 }
    });
    claimMarketplaceItem(item.itemId || item.id);
  };

  const handleCreateListing = (e) => {
    e.preventDefault();
    if (!listingForm.title || !listingForm.price) return;
    addMarketplaceItem(listingForm);
    setShowListingModal(false);
    setListingForm({
      title: '',
      society: 'Prestige Falcon City, Bengaluru',
      category: 'Furniture',
      price: '',
      originalPrice: '',
      condition: 'Like New (6 months old)',
      description: ''
    });
  };

  // Filter items
  const filteredItems = marketplaceItems.filter((item) => {
    const catMatch = selectedCategory === 'All' || item.category === selectedCategory;
    const socMatch = selectedSocietyFilter === 'All' || item.society.toLowerCase().includes(selectedSocietyFilter.toLowerCase());
    return catMatch && socMatch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-emerald">
                <Leaf size={12} /> Circular Economy & Zero-Transit
              </span>
              <span className="badge badge-cyan">
                <Building size={12} /> In-Building Outgoing ➔ Incoming Handoff
              </span>
            </div>
            <h2 style={{ fontSize: '1.6rem' }}>Circular Marketplace & Direct Tenant Handoff</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Why pay movers to transport heavy furniture across the city when someone in your building or campus is moving in tomorrow?
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setShowListingModal(true)}
              className="btn btn-primary btn-sm"
            >
              <Plus size={16} /> List Item as Outgoing Tenant
            </button>
          </div>
        </div>
      </div>

      {/* Sustainability Metrics & Instant Buyback Appraisal Tool */}
      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Left: Sustainability Scorecard */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Leaf size={18} color="var(--primary)" />
              Your Circular Impact Dashboard
            </span>
            <span className="badge badge-emerald">Verified Green Relocation</span>
          </div>

          <div className="grid-3" style={{ gap: '10px' }}>
            <div style={{ background: 'var(--bg-elevated)', padding: '14px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CO₂ Emissions Averted</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                {carbonSavedTotalKg} <span style={{ fontSize: '0.8rem' }}>kg</span>
              </div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', padding: '14px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Landfill Diverted</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--cyan)' }}>
                {Math.round(carbonSavedTotalKg * 1.8)} <span style={{ fontSize: '0.8rem' }}>kg</span>
              </div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', padding: '14px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Trees Equivalent</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--amber)' }}>
                {Math.max(1, Math.round(carbonSavedTotalKg / 22))} <span style={{ fontSize: '0.8rem' }}>trees</span>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.03)', padding: '12px 14px', borderRadius: 'var(--radius-md)' }}>
            🌱 <strong>How it works:</strong> When you buy or hand off an item to an incoming tenant in the same society, you eliminate 100% of packaging cartons, fuel combustion, and unnecessary transit.
          </div>
        </div>

        {/* Right: Cashify-Style Instant Electronics & Appliance Buyback */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calculator size={18} color="var(--amber)" />
              Cashify-Style Instant Buyback Appraisal
            </span>
            <span className="badge badge-amber">Instant Cash Credit</span>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Don't want to transport your appliance? We buy back monitors, mini-fridges, and microwaves on move day with zero haggling.
          </p>

          <div className="grid-2" style={{ gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Item / Appliance
              </label>
              <select
                className="form-select"
                value={selectedBuybackDevice}
                onChange={(e) => handleDeviceChange(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              >
                {BUYBACK_DEVICES.map((dev) => (
                  <option key={dev.id} value={dev.id}>
                    {dev.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Operational Condition
              </label>
              <select
                className="form-select"
                value={deviceCondition}
                onChange={(e) => handleConditionChange(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              >
                <option value="like-new">Like New (Flawless)</option>
                <option value="good">Good (Minor cosmetic wear)</option>
                <option value="fair">Fair (Functional, noticeable marks)</option>
              </select>
            </div>
          </div>

          {/* Appraised Instant Cash Quote */}
          <div style={{
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Indicative buyback offer:</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--amber)' }}>
                ₹{appraisedQuote.toLocaleString('en-IN')}
              </div>
            </div>
            <button
              onClick={() => {
                const dev = BUYBACK_DEVICES.find((d) => d.id === selectedBuybackDevice);
                setBuybackRequest({
                  type: 'service',
                  title: `Buyback: ${dev?.name || 'device'} (${deviceCondition})`,
                  subtitle: `Indicative offer ₹${appraisedQuote.toLocaleString('en-IN')} — final price after our technician inspects it at pickup.`,
                  details: { deviceId: selectedBuybackDevice, condition: deviceCondition, indicativeOffer: appraisedQuote }
                });
              }}
              className="btn btn-primary btn-sm"
            >
              Request pickup & inspection
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>FILTER LISTINGS:</span>
        {['All', 'Furniture', 'Appliances'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className="btn btn-secondary btn-sm"
            style={{
              background: selectedCategory === cat ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              borderColor: selectedCategory === cat ? 'var(--primary)' : 'var(--border-subtle)',
              color: selectedCategory === cat ? '#FFFFFF' : 'var(--text-muted)'
            }}
          >
            {cat}
          </button>
        ))}

        <select
          className="form-select"
          style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8rem' }}
          value={selectedSocietyFilter}
          onChange={(e) => setSelectedSocietyFilter(e.target.value)}
        >
          <option value="All">All Societies & Campuses</option>
          <option value="Prestige Falcon">Prestige Falcon City (Kanakapura)</option>
          <option value="Stanza Living">Stanza Living (Koramangala)</option>
          <option value="Zolo Amber">Zolo Amber (HSR Layout)</option>
          <option value="DLF Phase 3">DLF Phase 3 (Gurgaon)</option>
          <option value="IIT Powai">IIT Powai Hostels</option>
        </select>
      </div>

      {/* Marketplace Cards Grid */}
      <div className="grid-3" style={{ gap: '20px' }}>
        {filteredItems.map((item) => (
          <div
            key={item.itemId || item.id}
            className="glass-panel"
            style={{
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.3s ease'
            }}
          >
            <div>
              <div style={{ position: 'relative', aspectRatio: '16/10', overflow: 'hidden' }}>
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <span style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  background: 'rgba(16, 185, 129, 0.9)',
                  color: '#FFFFFF',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '4px'
                }}>
                  {item.handoffType}
                </span>

                {item.zeroTransitFee && (
                  <span style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'rgba(99, 102, 241, 0.9)',
                    color: '#FFFFFF',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '4px'
                  }}>
                    ₹0 Move Transit
                  </span>
                )}
              </div>

              <div style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  <Building size={13} color="var(--cyan)" />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.society}
                  </span>
                </div>

                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px', lineHeight: 1.3 }}>
                  {item.title}
                </h4>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Seller: {typeof item.seller === 'object' ? (item.seller?.name || 'Resident') : item.seller} • {item.condition}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--primary)', marginBottom: '12px' }}>
                  <Leaf size={13} /> Saves {item.co2SavedKg} kg CO₂ footprint
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    ₹{item.price.toLocaleString('en-IN')}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textDecoration: 'line-through' }}>
                    ₹{item.originalPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                    {Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}% OFF
                  </span>
                </div>
              </div>
            </div>

            <div style={{ padding: '12px 18px 18px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => handleClaim(item)}
                disabled={item.status && item.status !== 'available'}
                className="btn btn-primary btn-sm"
                style={{ width: '100%', gap: '6px', opacity: item.status && item.status !== 'available' ? 0.55 : 1 }}
              >
                <ShoppingBag size={14} />
                {item.status && item.status !== 'available' ? 'Already Claimed' : 'Claim / Arrange Handoff'}
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => openChat({ contextType: 'seller', refId: item.itemId || item.id })}
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, gap: '6px' }}
                  title="Chat with seller"
                >
                  <MessageSquare size={14} /> Chat
                </button>
                <button
                  onClick={() => requestCall({ contextType: 'seller', refId: item.itemId || item.id })}
                  className="btn btn-outline-emerald btn-sm"
                  style={{ flex: 1, gap: '6px' }}
                  title="Call seller"
                >
                  <Phone size={14} /> Call
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: List Item as Outgoing Tenant */}
      {showListingModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '12px' }}>List Item for In-Building P2P Handoff</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Connect directly with incoming residents moving into your building. Zero truck transit fees!
            </p>

            <form onSubmit={handleCreateListing} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Item Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={listingForm.title}
                  onChange={(e) => setListingForm({ ...listingForm, title: e.target.value })}
                  placeholder="e.g. Ergonomic Study Desk + LED Light"
                  required
                />
              </div>

              <div className="grid-2" style={{ gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Category</label>
                  <select
                    className="form-select"
                    value={listingForm.category}
                    onChange={(e) => setListingForm({ ...listingForm, category: e.target.value })}
                  >
                    <option value="Furniture">Furniture</option>
                    <option value="Appliances">Appliances</option>
                    <option value="Electronics">Electronics</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Society / Campus</label>
                  <input
                    type="text"
                    className="form-input"
                    value={listingForm.society}
                    onChange={(e) => setListingForm({ ...listingForm, society: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid-2" style={{ gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Your Price (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={listingForm.price}
                    onChange={(e) => setListingForm({ ...listingForm, price: e.target.value })}
                    placeholder="2500"
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Original MRP (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={listingForm.originalPrice}
                    onChange={(e) => setListingForm({ ...listingForm, originalPrice: e.target.value })}
                    placeholder="7000"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowListingModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Publish P2P Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ServiceRequestModal request={buybackRequest} onClose={() => setBuybackRequest(null)} />
    </div>
  );
};
