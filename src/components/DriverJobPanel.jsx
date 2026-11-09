// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, MapPin, MessageSquare, Navigation, Phone, Radio, ScanLine, X } from 'lucide-react';
import { api } from '../services/api';
import { useComms } from '../context/CommsContext';
import { useMove } from '../context/MoveContext';

const box = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 16, marginBottom: 16 };
const when = (d) => (d ? new Date(d).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '');
const mapsLink = (p, label) => (p?.lat ? `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label || '')}`);

/** Camera QR scanner using the browser's BarcodeDetector (Chrome/Edge/Android). */
const QrScanner = ({ onCode, onClose }) => {
  const video = useRef(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let stream, raf, stopped = false;
    (async () => {
      if (!('BarcodeDetector' in window)) {
        setErr('Camera scanning isn\'t supported in this browser — type the box ID instead.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.current.srcObject = stream;
        await video.current.play();
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        const tick = async () => {
          if (stopped) return;
          try {
            const codes = await detector.detect(video.current);
            if (codes[0]?.rawValue) {
              onCode(codes[0].rawValue);
              return;
            }
          } catch { /* keep trying */ }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch (e) {
        setErr(e.name === 'NotAllowedError' ? 'Camera permission denied.' : 'Could not open the camera.');
      }
    })();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onCode]);
  return (
    <div style={{ position: 'relative', marginTop: 10 }}>
      {err ? (
        <div style={{ fontSize: '0.78rem', color: '#FBBF24' }}>{err}</div>
      ) : (
        <video ref={video} playsInline muted style={{ width: '100%', borderRadius: 8, background: '#000', maxHeight: 260, objectFit: 'cover' }} />
      )}
      <button onClick={onClose} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.6)', border: 'none', color: '#fff', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer' }} title="Close camera"><X size={14} /></button>
    </div>
  );
};

/** Pull a box ID out of a scanned QR payload (JSON passport or plain text). */
const boxIdFrom = (raw) => {
  try {
    const j = JSON.parse(raw);
    return j.boxId || j.id || j.box || raw;
  } catch {
    const m = /PKG-BOX-[A-Z0-9-]+/i.exec(raw);
    return m ? m[0].toUpperCase() : raw.trim().slice(0, 60);
  }
};

export const DriverJobPanel = ({ jobs, setJobs, selectedJobId, setSelectedJobId }) => {
  const { showToast } = useMove();
  const { sendDriverLocation, openChat, requestCall } = useComms();
  const [sharing, setSharing] = useState(false);
  const [lastFix, setLastFix] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [manualId, setManualId] = useState('');
  const [loaded, setLoaded] = useState({}); // bookingId -> [boxIds]
  const watchId = useRef(null);

  const myJobs = jobs.filter((j) => j.assignedToMe);
  const openJobs = jobs.filter((j) => !j.assignedToMe);
  const job = myJobs.find((j) => j.bookingId === selectedJobId) || myJobs[0];

  useEffect(() => {
    if (job && job.bookingId !== selectedJobId) setSelectedJobId(job.bookingId);
  }, [job, selectedJobId, setSelectedJobId]);

  // Stop GPS when the panel unmounts or the job changes.
  useEffect(() => () => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
  }, []);
  useEffect(() => {
    if (sharing && watchId.current != null && (!job || job.stage === 'completed')) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      setSharing(false);
    }
  }, [job, sharing]);

  const accept = async (id) => {
    try {
      const r = await api.acceptJob(id);
      setJobs((prev) => prev.map((j) => (j.bookingId === id ? r.job : j)));
      setSelectedJobId(id);
      showToast('Job accepted — the customer has been notified.', 'success');
    } catch (e) {
      showToast(e.message, 'error');
      api.getCaptainJobs().then((r) => setJobs(r.jobs || [])).catch(() => {});
    }
  };

  const toggleSharing = () => {
    if (sharing) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      setSharing(false);
      return;
    }
    if (!navigator.geolocation) return showToast('Location is not available on this device.', 'error');
    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, speed, heading } = pos.coords;
        const ack = await sendDriverLocation({ bookingId: job.bookingId, lat, lng, speedKmh: speed != null ? speed * 3.6 : null, heading });
        setLastFix({ lat, lng, at: Date.now(), ...ack });
      },
      (err) => {
        showToast(err.code === 1 ? 'Location permission denied — the customer can\'t see you.' : 'GPS signal lost.', 'error');
        setSharing(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    setSharing(true);
  };

  const addBox = (raw) => {
    const id = boxIdFrom(raw);
    if (!id) return;
    setLoaded((prev) => {
      const list = prev[job.bookingId] || [];
      if (list.includes(id)) {
        showToast(`${id} is already scanned.`, 'info');
        return prev;
      }
      showToast(`Scanned ${id}`, 'success');
      return { ...prev, [job.bookingId]: [...list, id] };
    });
    setScanning(false);
    setManualId('');
  };

  return (
    <>
      {/* Open jobs */}
      <div style={box}>
        <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Radio size={15} color="#10B981" /> 1. Available jobs ({openJobs.length})
        </div>
        {!openJobs.length && <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>No open paid jobs right now. New bookings appear here instantly.</div>}
        {openJobs.map((j) => (
          <div key={j.bookingId} style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '10px 0', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200, fontSize: '0.8rem' }}>
              <div style={{ fontWeight: 700 }}>{j.origin?.split(',')[0]} → {j.destination?.split(',')[0]}</div>
              <div style={{ color: '#94A3B8' }}>{when(j.moveDate)} ({j.timeSlot}) • {j.totalCuFt} cu ft • {j.distanceKm} km{j.floorsOrigin && !j.hasLiftOrigin ? ` • ${j.floorsOrigin}F stairs` : ''}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {j.payout && <div style={{ fontWeight: 800, color: '#10B981' }}>₹{j.payout.toLocaleString('en-IN')}</div>}
              <button onClick={() => accept(j.bookingId)} className="btn btn-sm btn-outline-emerald">Accept</button>
            </div>
          </div>
        ))}
      </div>

      {/* My active job */}
      <div style={box}>
        <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Navigation size={15} color="#38BDF8" /> 2. Your job
        </div>
        {!job ? (
          <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Accept a job to start.</div>
        ) : (
          <>
            {myJobs.length > 1 && (
              <select value={job.bookingId} onChange={(e) => setSelectedJobId(e.target.value)} style={{ width: '100%', marginBottom: 10, padding: '8px 10px', borderRadius: 6, background: '#0F172A', border: '1px solid #334155', color: '#fff', fontSize: '0.8rem' }}>
                {myJobs.map((j) => <option key={j.bookingId} value={j.bookingId}>{j.bookingId} · {j.userName} ({j.stage})</option>)}
              </select>
            )}
            <div style={{ fontSize: '0.8rem', lineHeight: 1.6 }}>
              <div><strong>{job.userName}</strong> • {job.bookingId} • {when(job.moveDate)}</div>
              <div style={{ color: '#94A3B8' }}><MapPin size={11} /> Pickup: <a href={mapsLink(job.originLocation, job.origin)} target="_blank" rel="noreferrer" style={{ color: '#38BDF8' }}>{job.origin}</a></div>
              <div style={{ color: '#94A3B8' }}><MapPin size={11} /> Drop: <a href={mapsLink(job.destinationLocation, job.destination)} target="_blank" rel="noreferrer" style={{ color: '#38BDF8' }}>{job.destination}</a></div>
              {job.notes && <div style={{ color: '#FBBF24' }}>Note: {job.notes}</div>}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-sm btn-outline-emerald" onClick={() => requestCall({ contextType: 'booking', refId: job.bookingId })} style={{ gap: 5 }}><Phone size={13} /> Call customer</button>
              <button className="btn btn-sm btn-secondary" onClick={() => openChat({ contextType: 'booking', refId: job.bookingId })} style={{ gap: 5 }}><MessageSquare size={13} /> Chat</button>
              {job.stage !== 'completed' && (
                <button className="btn btn-sm" onClick={toggleSharing} style={{ gap: 5, background: sharing ? '#DC2626' : '#0EA5E9', color: '#fff' }}>
                  <Navigation size={13} /> {sharing ? 'Stop sharing location' : 'Share live location'}
                </button>
              )}
            </div>
            {sharing && (
              <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: 8 }}>
                {lastFix
                  ? lastFix.ok
                    ? `📡 Customer can see you${lastFix.etaMin ? ` • ~${lastFix.etaMin} min to ${job.stage === 'pickup' ? 'pickup' : 'drop'}` : ''}. Keep this screen open.`
                    : `Location not delivered (${lastFix.error || 'error'}).`
                  : 'Waiting for GPS fix…'}
              </div>
            )}

            {/* Box audit */}
            {job.stage === 'pickup' && (
              <div style={{ marginTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ScanLine size={14} color="#D4AF37" /> Box check while loading ({(loaded[job.bookingId] || []).length} scanned)
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {(loaded[job.bookingId] || []).map((id) => (
                    <span key={id} style={{ fontSize: '0.7rem', background: 'rgba(16,185,129,0.15)', color: '#10B981', padding: '2px 8px', borderRadius: 999 }}><CheckCircle2 size={10} /> {id}</span>
                  ))}
                </div>
                {scanning ? (
                  <QrScanner onCode={addBox} onClose={() => setScanning(false)} />
                ) : (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => setScanning(true)} style={{ gap: 5 }}><Camera size={13} /> Scan QR</button>
                    <form onSubmit={(e) => { e.preventDefault(); if (manualId.trim()) addBox(manualId); }} style={{ display: 'flex', gap: 6, flex: 1 }}>
                      <input value={manualId} onChange={(e) => setManualId(e.target.value)} placeholder="or type box ID" style={{ flex: 1, minWidth: 0, padding: '6px 10px', borderRadius: 6, background: '#0F172A', border: '1px solid #334155', color: '#fff', fontSize: '0.78rem' }} />
                    </form>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};
