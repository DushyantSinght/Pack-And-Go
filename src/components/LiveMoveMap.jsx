// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

const pin = (color, label) =>
  L.divIcon({
    className: '',
    html: `<div style="background:${color};color:#fff;font:700 11px system-ui;padding:3px 7px;border-radius:12px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);white-space:nowrap">${label}</div>`,
    iconSize: null
  });
const truck = L.divIcon({
  className: '',
  html: '<div style="font-size:26px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.5))">🚚</div>',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

/**
 * Live map for one booking. Driver position arrives over the socket
 * (CommsContext re-broadcasts it as a 'packandgo:booking-location' window event).
 */
export const LiveMoveMap = ({ booking, height = 240 }) => {
  const el = useRef(null);
  const map = useRef(null);
  const driver = useRef(null);
  const [live, setLive] = useState(booking.driverLocation?.lat ? { ...booking.driverLocation } : null);

  useEffect(() => {
    if (!el.current || map.current) return undefined;
    const o = booking.originLocation, d = booking.destinationLocation;
    map.current = L.map(el.current, { zoomControl: true, attributionControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map.current);
    const pts = [];
    if (o?.lat) { L.marker([o.lat, o.lng], { icon: pin('#2563EB', 'Pickup') }).addTo(map.current); pts.push([o.lat, o.lng]); }
    if (d?.lat) { L.marker([d.lat, d.lng], { icon: pin('#16A34A', 'Drop') }).addTo(map.current); pts.push([d.lat, d.lng]); }
    if (pts.length === 2) L.polyline(pts, { color: '#D4AF37', weight: 3, dashArray: '6 8' }).addTo(map.current);
    if (pts.length) map.current.fitBounds(pts, { padding: [30, 30] });
    else map.current.setView([12.97, 77.59], 11);
    return () => { map.current?.remove(); map.current = null; driver.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.bookingId]);

  useEffect(() => {
    const onLoc = (e) => {
      if (e.detail.bookingId === booking.bookingId) setLive(e.detail);
    };
    window.addEventListener('packandgo:booking-location', onLoc);
    return () => window.removeEventListener('packandgo:booking-location', onLoc);
  }, [booking.bookingId]);

  useEffect(() => {
    if (!map.current || !live?.lat) return;
    if (!driver.current) driver.current = L.marker([live.lat, live.lng], { icon: truck, zIndexOffset: 1000 }).addTo(map.current);
    else driver.current.setLatLng([live.lat, live.lng]);
  }, [live]);

  const ageSec = live?.updatedAt ? Math.round((Date.now() - new Date(live.updatedAt).getTime()) / 1000) : null;

  return (
    <div>
      <div ref={el} style={{ height, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }} />
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
        {live?.lat ? (
          <>
            🚚 Live location{live.etaMin ? ` • about ${live.etaMin} min away (${live.kmLeft?.toFixed(1)} km)` : ''}
            {live.speedKmh ? ` • ${Math.round(live.speedKmh)} km/h` : ''}
            {ageSec != null && ageSec > 120 ? ` • last update ${Math.round(ageSec / 60)} min ago` : ''}
          </>
        ) : (
          'Your Move Captain\'s live location will appear here once they start sharing it.'
        )}
      </div>
    </div>
  );
};
