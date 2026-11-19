// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// Read-only live view of one move, opened from a family link (/?track=<token>). No sign-in needed.
import React, { useEffect, useRef, useState } from 'react';
import { Clock, Loader2, MapPin, ShieldCheck, Truck, X } from 'lucide-react';
import { api } from '../services/api';
import { LiveMoveMap } from './LiveMoveMap';
import { StatusTimeline } from './ui/StatusTimeline';
import { UserAvatar } from './ui/SafeImage';

const REFRESH_MS = 15_000;
const when = (d) => (d ? new Date(d).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '');
const clock = (t) => new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit' });

export const FamilyTrackingView = ({ token, onClose, onBook }) => {
  const [track, setTrack] = useState(null);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(0);
  const lastFix = useRef('');

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const { track: t } = await api.getSharedTracking(token);
        if (!alive) return;
        setTrack(t);
        setError('');
        setUpdatedAt(Date.now());
        // Hand fresh truck positions to the live map, which animates between them.
        const fix = t.driverLocation ? `${t.driverLocation.lat},${t.driverLocation.lng},${t.driverLocation.updatedAt}` : '';
        if (fix && fix !== lastFix.current) {
          lastFix.current = fix;
          window.dispatchEvent(new CustomEvent('packandgo:booking-location', { detail: { bookingId: t.bookingId, status: t.status, ...t.driverLocation } }));
        }
      } catch (e) {
        if (alive) setError(e.message || 'This tracking link is not valid.');
      }
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(id); };
  }, [token]);

  const live = track && ['assigned', 'in_transit'].includes(track.status);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 240, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }} onClick={onClose}>
      <div
        role="dialog"
        aria-label="Family move tracking"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 560, maxHeight: '94vh', overflowY: 'auto', background: 'var(--bg-card-solid)', border: '1px solid var(--border-gold)', borderRadius: 'var(--radius-lg)', padding: 18, boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="badge badge-indigo" style={{ fontSize: '0.66rem' }}><ShieldCheck size={11} /> Shared with you • read-only</div>
            <h3 style={{ margin: '8px 0 2px', fontSize: '1.2rem' }}>
              {track ? `Following ${track.customerFirstName}'s move` : error ? 'Move tracking' : 'Loading move…'}
            </h3>
            {track && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{track.bookingId} • {when(track.moveDate)}{track.timeSlot ? ` • ${track.timeSlot}` : ''}</div>}
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ width: 32, height: 32, padding: 0, borderRadius: '50%' }} aria-label="Close"><X size={16} /></button>
        </div>

        {!track && !error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.85rem' }}><Loader2 size={16} className="spin" /> Fetching the latest update…</div>
        )}

        {error && !track && (
          <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {error}
            <div style={{ marginTop: 12 }}><button className="btn btn-primary btn-sm" onClick={onClose}>Go to Pack&Go</button></div>
          </div>
        )}

        {track && (
          <>
            <StatusTimeline move={track} />
            {track.transitStatus && <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{track.transitStatus}</div>}

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <div><MapPin size={12} /> <strong style={{ color: 'var(--text-main)' }}>From</strong> {track.origin}</div>
              <div><MapPin size={12} /> <strong style={{ color: 'var(--text-main)' }}>To</strong> {track.destination}{track.distanceKm ? ` • ${track.distanceKm} km` : ''}</div>
            </div>

            {track.captain ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <UserAvatar src={track.captain.avatar} name={track.captain.firstName} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{track.captain.firstName} • verified Move Captain</div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    {track.captain.rating ? `⭐ ${track.captain.rating}` : 'New Move Captain'} • <Truck size={11} /> {track.captain.vehicleType || 'Truck'} {track.captain.vehicleNumber}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'center' }}><Clock size={13} /> A Move Captain hasn't been assigned yet.</div>
            )}

            {live ? (
              <LiveMoveMap booking={track} />
            ) : track.status !== 'delivered' ? (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>The live map appears once a Move Captain is on the way.</div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--emerald-light)', fontWeight: 600 }}>Delivered {when(track.deliveredAt)} — everything has arrived. 🏡</div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: 12, fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              <span>Updated {clock(updatedAt)} • refreshes automatically{error ? ` • ${error}` : ''}</span>
              <button className="btn btn-secondary btn-sm" onClick={onBook}>Plan your own move</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
