import React, { useEffect, useState, useCallback } from 'react';
import { BadgeCheck, Ban, CheckCircle2, Clock, Phone, ShieldCheck, Truck, X, XCircle } from 'lucide-react';
import { api } from '../services/api';
import { useMove } from '../context/MoveContext';
import { AdminBookings, AdminClaims, AdminRequests } from './AdminOpsPanels';

const TABS = [
  { id: 'pending', label: 'Pending', icon: Clock },
  { id: 'approved', label: 'Approved', icon: CheckCircle2 },
  { id: 'rejected', label: 'Rejected', icon: XCircle },
  { id: 'suspended', label: 'Suspended', icon: Ban }
];

const fmt = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

export const AdminCaptainsModal = ({ isOpen, onClose }) => {
  const { showToast } = useMove();
  const [section, setSection] = useState('captains');
  const [tab, setTab] = useState('pending');
  const [data, setData] = useState({ captains: [], counts: {} });
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [noteFor, setNoteFor] = useState(null); // { id, action }
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getCaptainApplications(tab);
      setData({ captains: res.captains || [], counts: res.counts || {} });
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  // Refresh when a new application arrives over the socket.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onNew = () => load();
    window.addEventListener('packandgo:captain-application', onNew);
    return () => window.removeEventListener('packandgo:captain-application', onNew);
  }, [isOpen, load]);

  if (!isOpen) return null;

  const review = async (id, action, reviewNote = '') => {
    setBusyId(id);
    try {
      await api.reviewCaptain(id, action, reviewNote);
      showToast(action === 'approve' ? 'Captain approved. They can take jobs now.' : action === 'reject' ? 'Application rejected.' : 'Captain suspended.', 'success');
      setNoteFor(null);
      setNote('');
      await load();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 230, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div
        role="dialog"
        aria-label="Operations"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 760, maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-card-solid)', border: '1px solid var(--border-gold)', borderRadius: 'var(--radius-lg)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-main)' }}>
              <ShieldCheck size={18} color="var(--primary)" /> Pack&Go Operations
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
              {[['captains', 'Captains'], ['bookings', 'Bookings'], ['claims', 'Claims'], ['requests', 'Requests']].map(([k, l]) => (
                <button key={k} onClick={() => setSection(k)} className="btn btn-sm" style={{ fontSize: '0.75rem', background: section === k ? 'var(--text-main)' : 'transparent', color: section === k ? 'var(--bg-card-solid)' : 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>{l}</button>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ width: 32, height: 32, padding: 0, borderRadius: '50%' }} title="Close"><X size={16} /></button>
        </div>

        {section !== 'captains' ? (
          <div style={{ overflowY: 'auto', padding: '12px 20px 20px' }}>
            {section === 'bookings' && <AdminBookings />}
            {section === 'claims' && <AdminClaims />}
            {section === 'requests' && <AdminRequests />}
          </div>
        ) : (
        <>
        <div style={{ display: 'flex', gap: 6, padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="btn btn-sm"
              style={{
                gap: 6,
                background: tab === id ? 'var(--primary)' : 'var(--bg-elevated)',
                color: tab === id ? '#111' : 'var(--text-muted)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <Icon size={13} /> {label}
              <span style={{ fontWeight: 800 }}>{data.counts[id] ?? ''}</span>
            </button>
          ))}
        </div>

        <div style={{ overflowY: 'auto', padding: '12px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading && <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading…</div>}
          {!loading && data.captains.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: 30 }}>
              No {tab} captains.
            </div>
          )}
          {data.captains.map((c) => (
            <div key={c._id} style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 14, background: 'var(--bg-elevated)' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <img src={c.avatar} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{c.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{c.email}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '6px 16px', marginTop: 8, fontSize: '0.8rem' }}>
                    <div><span style={{ color: 'var(--text-dim)' }}>Licence:</span> <strong style={{ letterSpacing: '0.04em' }}>{c.licenseNumber || '—'}</strong></div>
                    <div><span style={{ color: 'var(--text-dim)' }}>Vehicle:</span> <strong style={{ letterSpacing: '0.04em' }}>{c.vehicleNumber || '—'}</strong></div>
                    <div><span style={{ color: 'var(--text-dim)' }}><Truck size={11} /> Type:</span> {c.vehicleType || '—'}</div>
                    <div><span style={{ color: 'var(--text-dim)' }}><Phone size={11} /> Mobile:</span> {c.phone ? <a href={`tel:+91${c.phone.replace(/\D/g, '').slice(-10)}`} style={{ color: 'var(--primary)' }}>{c.phone}</a> : '—'}</div>
                    <div><span style={{ color: 'var(--text-dim)' }}>Applied:</span> {fmt(c.appliedAt)}</div>
                    {c.reviewedAt && <div><span style={{ color: 'var(--text-dim)' }}>Reviewed:</span> {fmt(c.reviewedAt)} by {c.reviewedBy}</div>}
                  </div>
                  {c.reviewNote && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6 }}>Note: {c.reviewNote}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {c.status !== 'approved' && (
                    <button disabled={busyId === c._id} onClick={() => review(c._id, 'approve')} className="btn btn-primary btn-sm" style={{ gap: 6 }}>
                      <BadgeCheck size={14} /> Approve
                    </button>
                  )}
                  {c.status === 'pending' && (
                    <button disabled={busyId === c._id} onClick={() => { setNoteFor({ id: c._id, action: 'reject' }); setNote(''); }} className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
                      <XCircle size={14} /> Reject
                    </button>
                  )}
                  {c.status === 'approved' && (
                    <button disabled={busyId === c._id} onClick={() => { setNoteFor({ id: c._id, action: 'suspend' }); setNote(''); }} className="btn btn-secondary btn-sm" style={{ gap: 6, color: '#EF4444' }}>
                      <Ban size={14} /> Suspend
                    </button>
                  )}
                </div>
              </div>

              {noteFor?.id === c._id && (
                <form
                  onSubmit={(e) => { e.preventDefault(); review(c._id, noteFor.action, note); }}
                  style={{ display: 'flex', gap: 8, marginTop: 10 }}
                >
                  <input
                    autoFocus
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={noteFor.action === 'reject' ? 'Reason shown to the driver (e.g. licence number does not match)' : 'Reason for suspension'}
                    maxLength={500}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card-solid)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                  />
                  <button type="submit" disabled={!note.trim() || busyId === c._id} className="btn btn-sm" style={{ background: '#DC2626', color: '#fff' }}>
                    Confirm {noteFor.action}
                  </button>
                  <button type="button" onClick={() => setNoteFor(null)} className="btn btn-secondary btn-sm">Cancel</button>
                </form>
              )}
            </div>
          ))}
        </div>
        </>
        )}
      </div>
    </div>
  );
};
