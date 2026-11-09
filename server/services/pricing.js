// Server-side pricing — the client can preview, but the server's number is the one charged.
export const GST_RATE = Number(process.env.GST_RATE || 0.18); // packers & movers services: 18% GST
export const PLATFORM_FEE_RATE = 0.2; // Pack&Go keeps 20% of the pre-tax fare; captain gets 80%

export const TIME_SLOTS = [
  { id: 'morning', label: '8:00 AM – 11:00 AM', startHour: 8 },
  { id: 'midday', label: '11:00 AM – 2:00 PM', startHour: 11 },
  { id: 'afternoon', label: '2:00 PM – 5:00 PM', startHour: 14 },
  { id: 'evening', label: '5:00 PM – 8:00 PM', startHour: 17 }
];

const toRad = (d) => (d * Math.PI) / 180;
export const haversineKm = (a, b) => {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const validPoint = (p) => p && Number.isFinite(+p.lat) && Number.isFinite(+p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;

/** Road distance via the public OSRM router, falling back to straight-line × 1.3. */
export const roadDistanceKm = async (from, to) => {
  if (!validPoint(from) || !validPoint(to)) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3500);
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'PackAndGo/1.0' } });
    clearTimeout(t);
    const j = await res.json();
    if (j.routes?.[0]?.distance) return Math.round((j.routes[0].distance / 1000) * 10) / 10;
  } catch {
    /* fall through */
  }
  return Math.round(haversineKm(from, to) * 1.3 * 10) / 10;
};

/** Itemised fare. `pooled` shares truck space with other moves on the corridor. */
export const quote = ({ totalCuFt = 0, distanceKm = 0, floorsOrigin = 0, floorsDestination = 0, hasLiftOrigin = true, hasLiftDestination = true, pooled = true }) => {
  const cuFt = Math.max(10, Math.min(2000, Number(totalCuFt) || 0));
  const km = Math.max(0, Math.min(1500, Number(distanceKm) || 0));
  const base = 799;
  const volume = Math.round(cuFt * 18);
  const distance = Math.round(Math.max(0, km - 5) * 28);
  const stairFloors = (hasLiftOrigin ? 0 : Math.max(0, +floorsOrigin || 0)) + (hasLiftDestination ? 0 : Math.max(0, +floorsDestination || 0));
  const floors = stairFloors * Math.round(120 + cuFt * 1.2);
  const gross = base + volume + distance + floors;
  const poolingDiscount = pooled ? Math.round((volume + distance) * 0.4) : 0;
  const subtotal = gross - poolingDiscount;
  const gst = Math.round(subtotal * GST_RATE);
  return { base, volume, distance, floors, poolingDiscount, subtotal, gst, total: subtotal + gst, soloTotal: Math.round(gross * (1 + GST_RATE)) };
};

/** "2026-11-12" + slot id → Date at slot start in IST. */
export const slotStart = (dateStr, slotId) => {
  const slot = TIME_SLOTS.find((s) => s.id === slotId);
  if (!slot || !/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))) return null;
  const d = new Date(`${dateStr}T${String(slot.startHour).padStart(2, '0')}:00:00+05:30`);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Cancellation refund policy (also shown in the Refund Policy page). */
export const refundPercentFor = (booking, now = Date.now()) => {
  if (!booking.moveDate) return 100;
  if (['in_transit', 'delivered', 'cancelled'].includes(booking.status)) return 0;
  const hoursLeft = (new Date(booking.moveDate).getTime() - now) / 3_600_000;
  if (hoursLeft >= 24) return 100;
  if (hoursLeft >= 4) return 50;
  return 0;
};
