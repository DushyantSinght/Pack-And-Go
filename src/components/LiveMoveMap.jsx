// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useMove } from '../context/MoveContext';
import { MAP_TILE_URL, MAP_ATTRIBUTION, CUSTOM_TILES } from '../utils/mapTiles';


const pin = (color, label) =>
  L.divIcon({
    className: '',
    html: `<div style="background:${color};color:#fff;font:700 11px system-ui;padding:3px 8px;border-radius:12px;border:2px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,.4);white-space:nowrap">${label}</div>`,
    iconSize: null
  });
const truckIcon = L.divIcon({
  className: '',
  html: '<div class="truck-marker"><span class="truck-ico">🚚</span></div>',
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

/**
 * Live map for one booking. Driver position arrives over the socket
 * (CommsContext re-broadcasts it as a 'packandgo:booking-location' window event).
 * The truck glides between fixes, faces its direction of travel and leaves a trail.
 */
export const LiveMoveMap = ({ booking, height = 240 }) => {
  const { themeMode } = useMove();
  const el = useRef(null);
  const map = useRef(null);
  const tiles = useRef(null);
  const driver = useRef(null);
  const trailLine = useRef(null);
  const aheadLine = useRef(null);
  const trail = useRef([]);
  const pos = useRef(null);
  const raf = useRef(0);
  const [live, setLive] = useState(booking.driverLocation?.lat ? { ...booking.driverLocation } : null);

  // Create the map once per booking
  useEffect(() => {
    if (!el.current || map.current) return undefined;
    const o = booking.originLocation, d = booking.destinationLocation;
    map.current = L.map(el.current, { zoomControl: true, attributionControl: true });
    tiles.current = L.tileLayer(MAP_TILE_URL, { maxZoom: 19, attribution: MAP_ATTRIBUTION }).addTo(map.current);
    const pts = [];
    if (o?.lat) { L.marker([o.lat, o.lng], { icon: pin('#2563EB', 'Pickup') }).addTo(map.current); pts.push([o.lat, o.lng]); }
    if (d?.lat) { L.marker([d.lat, d.lng], { icon: pin('#16A34A', 'Drop') }).addTo(map.current); pts.push([d.lat, d.lng]); }
    if (pts.length === 2) L.polyline(pts, { color: '#D4AF37', weight: 3, opacity: 0.35, dashArray: '6 8' }).addTo(map.current);
    trailLine.current = L.polyline([], { color: '#D4AF37', weight: 5, opacity: 0.9, lineCap: 'round' }).addTo(map.current);
    aheadLine.current = L.polyline([], { color: '#F3E7C4', weight: 3, opacity: 0.7, dashArray: '2 8', lineCap: 'round' }).addTo(map.current);
    if (pts.length) map.current.fitBounds(pts, { padding: [36, 36] });
    else map.current.setView([12.97, 77.59], 11);
    return () => {
      cancelAnimationFrame(raf.current);
      map.current?.remove();
      map.current = null;
      driver.current = null;
      trail.current = [];
      pos.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.bookingId]);

  // Follow the app theme (dark map = CSS filter on the tiles only)
  useEffect(() => {
    el.current?.classList.toggle('map-dark', themeMode !== 'light' && !CUSTOM_TILES);
  }, [themeMode]);

  useEffect(() => {
    const onLoc = (e) => {
      if (e.detail.bookingId === booking.bookingId) setLive(e.detail);
    };
    window.addEventListener('packandgo:booking-location', onLoc);
    return () => window.removeEventListener('packandgo:booking-location', onLoc);
  }, [booking.bookingId]);

  useEffect(() => {
    if (!map.current || !live?.lat) return;
    const to = [live.lat, live.lng];
    const target = booking.status === 'in_transit' || live.status === 'in_transit' ? booking.destinationLocation : booking.originLocation;

    trail.current.push(to);
    if (trail.current.length > 80) trail.current.shift();
    trailLine.current?.setLatLngs(trail.current);

    if (!driver.current) {
      driver.current = L.marker(to, { icon: truckIcon, zIndexOffset: 1000 }).addTo(map.current);
      pos.current = to;
      if (target?.lat) aheadLine.current?.setLatLngs([to, [target.lat, target.lng]]);
      return;
    }

    const from = pos.current || to;
    const ico = driver.current.getElement()?.querySelector('.truck-ico');
    // The emoji faces left; flip it when heading east.
    if (ico && Math.abs(to[1] - from[1]) > 1e-6) ico.style.transform = to[1] > from[1] ? 'scaleX(-1)' : 'scaleX(1)';

    cancelAnimationFrame(raf.current);
    const t0 = performance.now();
    const dur = 1400;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = ease(k);
      const cur = [from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e];
      driver.current?.setLatLng(cur);
      pos.current = cur;
      if (target?.lat) aheadLine.current?.setLatLngs([cur, [target.lat, target.lng]]);
      if (k < 1) raf.current = requestAnimationFrame(step);
      else if (map.current && !map.current.getBounds().pad(-0.1).contains(cur)) map.current.panTo(cur, { animate: true, duration: 0.8 });
    };
    raf.current = requestAnimationFrame(step);
  }, [live, booking.status, booking.originLocation, booking.destinationLocation]);

  const ageSec = live?.updatedAt ? Math.round((Date.now() - new Date(live.updatedAt).getTime()) / 1000) : null;

  return (
    <div>
      <div ref={el} style={{ height, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }} />
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
        {live?.lat ? (
          <>
            <span className="live-dot" style={{ width: 7, height: 7 }} />
            Live location{live.etaMin ? ` • about ${live.etaMin} min away (${live.kmLeft?.toFixed(1)} km)` : ''}
            {live.speedKmh ? ` • ${Math.round(live.speedKmh)} km/h` : ''}
            {ageSec != null && ageSec > 120 ? ` • last update ${Math.round(ageSec / 60)} min ago` : ''}
          </>
        ) : (
          "Your Move Captain's live location will appear here once they start sharing it."
        )}
      </div>
    </div>
  );
};
