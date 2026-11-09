// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React, { useState } from 'react';
import { useMove } from '../context/MoveContext';
import { ServiceRequestModal } from './ServiceRequestModal';
import { POST_MOVE_ACCOMMODATIONS, UPKEEP_SERVICES } from '../data/mockData';
import {
  UtensilsCrossed,
  Users,
  ShieldCheck,
  Building,
  Heart,
  Calendar,
  Clock,
  Sparkles,
  MapPin,
  Check,
  Search,
  Percent,
  Warehouse
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const PostMoveConcierge = () => {
  const { showToast, setActiveTab } = useMove();
  const [dietFilter, setDietFilter] = useState('All'); // 'All' | 'PureVeg' | 'Jain'
  const [bookedServices, setBookedServices] = useState([]);
  const [activeStorageDays, setActiveStorageDays] = useState(3);
  const [isStorageReserved, setIsStorageReserved] = useState(false);
  const [request, setRequest] = useState(null);

  const handleBookService = (service) => {
    setRequest({ type: 'service', title: service.title, subtitle: service.pricing, details: { serviceId: service.id, pricing: service.pricing } });
    setBookedServices((prev) => [...prev, service.id]);
  };

  const handleReserveStorage = (e) => {
    e.preventDefault();
    setRequest({
      type: 'storage',
      title: `Storage for ${activeStorageDays} days`,
      subtitle: `Estimated ₹${(activeStorageDays * 149).toLocaleString('en-IN')} — we collect your boxes on the date you choose.`,
      details: { days: activeStorageDays, estimate: activeStorageDays * 149 }
    });
    setIsStorageReserved(true);
  };

  const filteredAccommodations = POST_MOVE_ACCOMMODATIONS.filter((acc) => {
    if (dietFilter === 'PureVeg') return acc.vegScore >= 90;
    if (dietFilter === 'Jain') return acc.jainFoodAvailable;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-emerald">
                <UtensilsCrossed size={12} /> Meal-Preference Aware Matching
              </span>
              <span className="badge badge-indigo">
                <Users size={12} /> Roommate & Lifestyle Roadmap
              </span>
            </div>
            <h2 style={{ fontSize: '1.6rem' }}>Post-Move Concierge & Meal-Preference Living</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Pack&Go doesn't abandon you once the boxes are unloaded. Find meal-compatible housing, book verified cooks, and bridge lease gaps with QR storage.
            </p>
          </div>
        </div>
      </div>

      {/* Feature 1: Meal-Preference Aware Accommodation & Roommate Finder */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building size={18} color="var(--primary)" />
              Budget & Meal-Preference Accommodation Matching
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Avoid hunting for vegetarian food in a new city. We recommend rooms in neighborhoods with high pure-veg / Jain food density.
            </p>
          </div>

          {/* Diet Preference Filters */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setDietFilter('All')}
              className="btn btn-sm"
              style={{
                background: dietFilter === 'All' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                color: dietFilter === 'All' ? '#fff' : 'var(--text-muted)'
              }}
            >
              All Accommodations
            </button>
            <button
              onClick={() => setDietFilter('PureVeg')}
              className="btn btn-sm"
              style={{
                background: dietFilter === 'PureVeg' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                color: dietFilter === 'PureVeg' ? '#fff' : 'var(--text-muted)'
              }}
            >
              🌱 Pure Vegetarian Zones
            </button>
            <button
              onClick={() => setDietFilter('Jain')}
              className="btn btn-sm"
              style={{
                background: dietFilter === 'Jain' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                color: dietFilter === 'Jain' ? '#fff' : 'var(--text-muted)'
              }}
            >
              🥦 Jain Friendly Food
            </button>
          </div>
        </div>

        {/* Accommodation Cards Grid */}
        <div className="grid-3" style={{ gap: '20px' }}>
          {filteredAccommodations.map((acc) => (
            <div
              key={acc.id}
              className="glass-panel"
              style={{
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div>
                <div style={{ position: 'relative', aspectRatio: '16/10', overflow: 'hidden' }}>
                  <img
                    src={acc.imageUrl}
                    alt={acc.name}
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
                    {acc.type}
                  </span>

                  <span style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'rgba(99, 102, 241, 0.95)',
                    color: '#FFFFFF',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Heart size={12} fill="#FFF" /> {acc.roommateMatchPct}% Roommate Match
                  </span>
                </div>

                <div style={{ padding: '16px 18px' }}>
                  <h4 style={{ fontSize: '1.15rem', marginBottom: '4px' }}>{acc.name}</h4>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '10px' }}>
                    <MapPin size={13} color="var(--primary)" /> {acc.neighborhood}
                  </div>

                  {/* Meal Score & Food Policy Pill */}
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 12px',
                    marginBottom: '12px',
                    fontSize: '0.8rem'
                  }}>
                    <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>
                      🥗 {acc.mealPolicy}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {acc.nearbyVegRestaurants} Pure-Veg Mess & Cafes within 500m • {acc.distanceToTechPark}
                    </div>
                  </div>

                  {/* Amenities */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '14px' }}>
                    {acc.amenities.map((amenity, idx) => (
                      <span key={idx} style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '4px', color: 'var(--text-dim)' }}>
                        {amenity}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      ₹{acc.rent.toLocaleString('en-IN')}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ month</span>
                  </div>
                </div>
              </div>

              <div style={{ padding: '12px 18px 18px', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  onClick={() => setRequest({ type: 'visit', title: `Visit ${acc.name}`, subtitle: `${acc.neighborhood} • ₹${acc.rent.toLocaleString('en-IN')}/month`, details: { propertyId: acc.id, property: acc.name } })}
                  className="btn btn-outline-emerald btn-sm"
                  style={{ width: '100%' }}
                >
                  Schedule Visit / Connect Roommate
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature 2: Post-Move Lifestyle Services (Cook, Clean, Laundry) & Temporary QR Storage */}
      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Left: Ongoing Upkeep Services */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="var(--amber)" />
              On-Demand Post-Move Upkeep
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Police-verified cooks, deep cleaners, and laundry subscriptions billed monthly or on-demand.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {UPKEEP_SERVICES.map((service) => {
              const isBooked = bookedServices.includes(service.id);
              return (
                <div
                  key={service.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: isBooked ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                    border: isBooked ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '2px' }}>
                      {service.title}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      {service.description}
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--amber)' }}>
                      {service.pricing}
                    </div>
                  </div>

                  <button
                    onClick={() => handleBookService(service)}
                    className={`btn btn-sm ${isBooked ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {isBooked ? 'Booked ✓' : 'Book'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Temporary QR-Tracked Smart Gap Storage */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-cyan">
                <Warehouse size={12} /> Date Mismatch Solution
              </span>
            </div>
            <h3 style={{ fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Warehouse size={18} color="var(--cyan)" />
              Temporary QR-Tracked Smart Storage
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              When move-out and move-in dates do not align, your boxes stay in our camera-monitored, QR-tracked warehouse with auto-redelivery.
            </p>
          </div>

          <form onSubmit={handleReserveStorage} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: 'var(--bg-elevated)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>
                  Gap Storage Duration:
                </span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--cyan)' }}>
                  {activeStorageDays} Days
                </span>
              </div>

              <input
                type="range"
                min="1"
                max="21"
                value={activeStorageDays}
                onChange={(e) => setActiveStorageDays(e.target.value)}
                style={{ width: '100%', accentColor: 'var(--cyan)', cursor: 'pointer' }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                <span>1 Day</span>
                <span>7 Days</span>
                <span>14 Days</span>
                <span>21 Days</span>
              </div>
            </div>

            <div style={{
              background: 'rgba(6, 182, 212, 0.08)',
              border: '1px solid rgba(6, 182, 212, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Warehouse Storage Fee:</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--cyan)' }}>
                  ₹{(activeStorageDays * 149).toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>₹149 / day for up to 10 cartons</div>
              </div>

              <button type="submit" className="btn btn-primary btn-sm">
                {isStorageReserved ? 'Reserved ✓' : 'Reserve Gap Storage'}
              </button>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              🛡️ Includes: 24/7 CCTV livestream access to your bay, climate control for laptops & instruments, and scheduled automated dropoff at the new lease address.
            </div>
          </form>
        </div>
      </div>
      <ServiceRequestModal request={request} onClose={() => setRequest(null)} />
    </div>
  );
};
