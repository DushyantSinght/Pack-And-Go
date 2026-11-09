import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2, LocateFixed } from 'lucide-react';

// Address search via OpenStreetMap Nominatim (free, no key). Their usage policy
// allows ~1 request/second, so input is debounced and results are cached.
const cache = new Map();
const search = async (q, signal) => {
  const key = q.toLowerCase();
  if (cache.has(key)) return cache.get(key);
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=in&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { signal, headers: { 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error('Address search is unavailable right now.');
  const data = (await res.json()).map((r) => ({ label: r.display_name, lat: +r.lat, lng: +r.lon }));
  cache.set(key, data);
  return data;
};

const reverse = async (lat, lng) => {
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, { headers: { 'Accept-Language': 'en' } });
  const j = await res.json();
  return j.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
};

/**
 * value: { label, lat, lng } | null
 * onChange(value)
 */
export const AddressInput = ({ label, value, onChange, placeholder, allowCurrentLocation }) => {
  const [text, setText] = useState(value?.label || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef(null);
  const ctrl = useRef(null);

  useEffect(() => setText(value?.label || ''), [value?.label]);

  const onType = (v) => {
    setText(v);
    setError('');
    if (value) onChange(null); // typed text is no longer the picked place
    clearTimeout(timer.current);
    if (v.trim().length < 3) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      ctrl.current?.abort();
      ctrl.current = new AbortController();
      setLoading(true);
      try {
        const r = await search(v.trim(), ctrl.current.signal);
        setResults(r);
        setOpen(true);
        if (!r.length) setError('No matches — try adding the area or city.');
      } catch (e) {
        if (e.name !== 'AbortError') setError(e.message);
      } finally {
        setLoading(false);
      }
    }, 650);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return setError('Location is not available in this browser.');
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const label = await reverse(lat, lng).catch(() => `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        onChange({ label, lat, lng });
        setLoading(false);
      },
      (err) => {
        setError(err.code === 1 ? 'Location permission denied.' : 'Could not get your location.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div style={{ position: 'relative' }}>
      <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        {label}
        {allowCurrentLocation && (
          <button type="button" onClick={useMyLocation} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
            <LocateFixed size={12} /> Use my location
          </button>
        )}
      </label>
      <div style={{ position: 'relative' }}>
        <MapPin size={15} color={value ? 'var(--primary)' : 'var(--text-dim)'} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          value={text}
          onChange={(e) => onType(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          placeholder={placeholder}
          autoComplete="street-address"
          style={{
            width: '100%', padding: '10px 34px 10px 36px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)',
            border: `1px solid ${value ? 'var(--primary)' : 'var(--border-subtle)'}`, color: 'var(--text-main)', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box'
          }}
        />
        {loading && <Loader2 size={15} className="spin" style={{ position: 'absolute', right: 12, top: '50%', marginTop: -7, color: 'var(--text-dim)' }} />}
      </div>
      {error && <div style={{ fontSize: '0.72rem', color: 'var(--rose)', marginTop: 4 }}>{error}</div>}
      {!value && text.trim().length >= 3 && !error && !loading && !open && results.length > 0 && (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 4 }}>Pick an address from the list.</div>
      )}
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', zIndex: 20, left: 0, right: 0, top: '100%', marginTop: 4, background: 'var(--bg-card-solid)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)', maxHeight: 240, overflowY: 'auto' }}>
          {results.map((r) => (
            <button
              type="button"
              key={`${r.lat},${r.lng}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(r); setText(r.label); setOpen(false); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              {r.label}
            </button>
          ))}
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', padding: '4px 10px' }}>© OpenStreetMap contributors</div>
        </div>
      )}
    </div>
  );
};
