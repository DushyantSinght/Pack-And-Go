// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React from 'react';
import { CalendarCheck, Lock, Truck, PackageCheck, Home, Check, XCircle } from 'lucide-react';

const STEPS = [
  { s: 'pending_payment', label: 'Booked', icon: CalendarCheck, at: (m) => m.createdAt },
  { s: 'confirmed', label: 'Paid', icon: Lock, at: (m) => m.paymentDetails?.paidAt },
  { s: 'assigned', label: 'Captain', icon: Truck, at: (m) => m.assignedAt },
  { s: 'in_transit', label: 'Picked up', icon: PackageCheck, at: (m) => m.pickupVerifiedAt },
  { s: 'delivered', label: 'Delivered', icon: Home, at: (m) => m.deliveredAt }
];

const fmt = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '');

/** Animated booking progress: connectors fill as each step completes; the current step pulses. */
export const StatusTimeline = ({ move }) => {
  if (move.status === 'cancelled') {
    return (
      <div className="timeline-cancelled">
        <XCircle size={16} /> Cancelled {fmt(move.cancellation?.at)}
        {move.paymentDetails?.refundAmount ? ` • ₹${Math.round(move.paymentDetails.refundAmount).toLocaleString('en-IN')} refunded` : ''}
      </div>
    );
  }
  const idx = Math.max(0, STEPS.findIndex((x) => x.s === move.status));
  const done = move.status === 'delivered';
  return (
    <ol className="timeline" aria-label="Booking progress">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        // The step matching the status is complete; the next one is what we're waiting for.
        const state = i <= idx || done ? 'done' : i === idx + 1 ? 'current' : 'todo';
        return (
          <li key={step.s} className={`tl-step ${state}`}>
            {i > 0 && <span className="tl-line"><span className="tl-fill" style={{ transform: `scaleX(${i <= idx ? 1 : 0})` }} /></span>}
            <span className="tl-dot">{state === 'done' ? <Check size={14} className="tl-check" /> : <Icon size={14} />}</span>
            <span className="tl-label">{step.label}</span>
            <span className="tl-time">{state !== 'todo' ? fmt(step.at(move)) : ''}</span>
          </li>
        );
      })}
    </ol>
  );
};
