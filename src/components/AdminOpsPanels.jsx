// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React, { useCallback, useEffect, useState } from 'react';
import { Phone } from 'lucide-react';
import { api } from '../services/api';
import { useMove } from '../context/MoveContext';
import { SkeletonList } from './ui/Skeleton';
import { EmptyState } from './ui/EmptyState';

const fmt = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '—');
const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const card = { border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 12, background: 'var(--bg-elevated)', fontSize: '0.8rem', color: 'var(--text-muted)' };
const input = { flex: 1, minWidth: 140, padding: '6px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card-solid)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontSize: '0.8rem' };

const Filter = ({ value, options, onChange }) => (
  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
    {options.map((o) => (
      <button key={o} onClick={() => onChange(o)} className="btn btn-sm" style={{ background: value === o ? 'var(--primary)' : 'var(--bg-elevated)', color: value === o ? '#111' : 'var(--text-muted)', border: '1px solid var(--border-subtle)', fontSize: '0.72rem' }}>
        {o.replace('_', ' ')}
      </button>
    ))}
  </div>
);

const useList = (loader, status) => {
  const { showToast } = useMove();
  const [data, setData] = useState(null);
  const load = useCallback(() => {
    loader(status).then(setData).catch((e) => showToast(e.message, 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
  useEffect(() => { load(); }, [load]);
  return [data, load];
};

export const AdminBookings = () => {
  const { showToast } = useMove();
  const [status, setStatus] = useState('all');
  const [data, reload] = useList(api.adminBookings, status);
  const [cancelId, setCancelId] = useState(null);
  const [reason, setReason] = useState('');
  const doCancel = async (id) => {
    try {
      await api.adminCancelBooking(id, reason);
      showToast(`${id} cancelled with full refund.`, 'success');
      setCancelId(null);
      setReason('');
      reload();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };
  return (
    <>
      <Filter value={status} onChange={setStatus} options={['all', 'pending_payment', 'confirmed', 'assigned', 'in_transit', 'delivered', 'cancelled']} />
      {!data ? <SkeletonList rows={3} /> : !data.bookings.length ? <EmptyState art="truck" compact title="No bookings in this view." /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.bookings.map((b) => (
            <div key={b.bookingId} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <strong style={{ color: 'var(--text-main)' }}>{b.bookingId} • {b.status}</strong>
                <span>{inr(b.total)} • {b.payment?.status}{b.payment?.testMode ? ' (test)' : ''}</span>
              </div>
              <div>{b.userName} • <a href={`tel:+91${b.userPhone}`} style={{ color: 'var(--primary)' }}>{b.userPhone}</a> • {b.userEmail}</div>
              <div>{b.origin?.split(',').slice(0, 2).join(',')} → {b.destination?.split(',').slice(0, 2).join(',')} • {b.distanceKm} km</div>
              <div>{fmt(b.moveDate)} ({b.timeSlot}) • captain: {b.captain || '—'}{b.review?.rating ? ` • rated ${b.review.rating}★` : ''}</div>
              {!['delivered', 'cancelled'].includes(b.status) && (
                cancelId === b.bookingId ? (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason shown to customer" style={input} />
                    <button disabled={!reason.trim()} onClick={() => doCancel(b.bookingId)} className="btn btn-sm" style={{ background: '#DC2626', color: '#fff' }}>Cancel & refund 100%</button>
                    <button onClick={() => setCancelId(null)} className="btn btn-secondary btn-sm">Back</button>
                  </div>
                ) : (
                  <button onClick={() => setCancelId(b.bookingId)} className="btn btn-secondary btn-sm" style={{ marginTop: 8, color: '#EF4444' }}>Cancel booking</button>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export const AdminClaims = () => {
  const { showToast } = useMove();
  const [status, setStatus] = useState('open');
  const [data, reload] = useList(api.adminClaims, status);
  const [form, setForm] = useState({});
  const resolve = async (claimId, st) => {
    const f = form[claimId] || {};
    try {
      await api.adminResolveClaim(claimId, { status: st, note: f.note, amountApproved: f.amount });
      showToast(`Claim ${claimId} → ${st}`, 'success');
      reload();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };
  return (
    <>
      <Filter value={status} onChange={setStatus} options={['open', 'under_review', 'approved', 'rejected', 'paid', 'all']} />
      {!data ? <SkeletonList rows={3} /> : !data.claims.length ? <EmptyState art="box" compact title="No claims here. Good news." /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.claims.map((c) => (
            <div key={c.claimId} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <strong style={{ color: 'var(--text-main)' }}>{c.claimId} • {c.bookingId}</strong>
                <span>{c.status} • claimed {inr(c.amountClaimed)}</span>
              </div>
              <div>{c.userEmail} • captain {c.captainEmail || '—'} • {fmt(c.createdAt)}</div>
              <div style={{ color: 'var(--text-main)', margin: '4px 0' }}>{c.description}</div>
              {c.photos?.length > 0 && (
                <div style={{ display: 'flex', gap: 6 }}>
                  {c.photos.map((p, i) => <a key={i} href={p} target="_blank" rel="noreferrer"><img src={p} alt="" style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: 6 }} /></a>)}
                </div>
              )}
              {c.resolution?.note && <div>Decision: {c.resolution.note}{c.resolution.amountApproved ? ` • ${inr(c.resolution.amountApproved)}` : ''}</div>}
              {['open', 'under_review', 'approved'].includes(c.status) && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <input placeholder="Note to customer" value={form[c.claimId]?.note || ''} onChange={(e) => setForm({ ...form, [c.claimId]: { ...form[c.claimId], note: e.target.value } })} style={input} />
                  <input placeholder="₹ approved" type="number" value={form[c.claimId]?.amount || ''} onChange={(e) => setForm({ ...form, [c.claimId]: { ...form[c.claimId], amount: e.target.value } })} style={{ ...input, flex: '0 1 100px', minWidth: 90 }} />
                  {c.status === 'open' && <button onClick={() => resolve(c.claimId, 'under_review')} className="btn btn-secondary btn-sm">Start review</button>}
                  {c.status !== 'approved' && <button onClick={() => resolve(c.claimId, 'approved')} className="btn btn-primary btn-sm">Approve</button>}
                  {c.status === 'approved' && <button onClick={() => resolve(c.claimId, 'paid')} className="btn btn-primary btn-sm">Mark paid</button>}
                  {c.status !== 'approved' && <button onClick={() => resolve(c.claimId, 'rejected')} className="btn btn-secondary btn-sm" style={{ color: '#EF4444' }}>Reject</button>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export const AdminRequests = () => {
  const { showToast } = useMove();
  const [status, setStatus] = useState('requested');
  const [data, reload] = useList(api.adminRequests, status);
  const update = async (id, st) => {
    try {
      await api.adminUpdateRequest(id, st);
      showToast(`${id} → ${st}`, 'success');
      reload();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };
  return (
    <>
      <Filter value={status} onChange={setStatus} options={['requested', 'confirmed', 'completed', 'cancelled', 'all']} />
      {!data ? <SkeletonList rows={3} /> : !data.requests.length ? <EmptyState art="box" compact title="No requests in this view." /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.requests.map((r) => (
            <div key={r.requestId} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <strong style={{ color: 'var(--text-main)' }}>{r.requestId} • {r.title}</strong>
                <span>{r.type} • {r.status}</span>
              </div>
              <div>{r.userName} • <a href={`tel:+91${r.userPhone}`} style={{ color: 'var(--primary)' }}><Phone size={11} /> {r.userPhone}</a> • preferred {r.preferredDate ? new Date(r.preferredDate).toLocaleDateString('en-IN') : '—'}</div>
              {r.details?.notes && <div>Note: {r.details.notes}</div>}
              {r.status === 'requested' && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button onClick={() => update(r.requestId, 'confirmed')} className="btn btn-primary btn-sm">Confirmed with customer</button>
                  <button onClick={() => update(r.requestId, 'cancelled')} className="btn btn-secondary btn-sm">Cancel</button>
                </div>
              )}
              {r.status === 'confirmed' && <button onClick={() => update(r.requestId, 'completed')} className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}>Mark completed</button>}
            </div>
          ))}
        </div>
      )}
    </>
  );
};
