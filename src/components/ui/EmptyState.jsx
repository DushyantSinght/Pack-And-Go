// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React from 'react';

/* Small animated illustrations, drawn inline so they follow the theme. */
const ART = {
  // A truck drives in and parks with a little bounce.
  truck: (
    <svg viewBox="0 0 160 90" width="150" height="84">
      <line x1="8" y1="76" x2="152" y2="76" className="es-road" />
      <line x1="20" y1="76" x2="40" y2="76" className="es-road-dash" />
      <line x1="70" y1="76" x2="90" y2="76" className="es-road-dash" />
      <line x1="120" y1="76" x2="140" y2="76" className="es-road-dash" />
      <g className="es-truck">
        <rect x="40" y="34" width="52" height="34" rx="5" className="es-fill-gold" />
        <rect x="92" y="44" width="24" height="24" rx="4" className="es-fill-light" />
        <rect x="97" y="48" width="12" height="9" rx="2" className="es-fill-dark" />
        <circle cx="56" cy="70" r="7" className="es-wheel" />
        <circle cx="104" cy="70" r="7" className="es-wheel" />
        <rect x="50" y="42" width="20" height="4" rx="2" className="es-fill-dark" opacity="0.35" />
      </g>
    </svg>
  ),
  // Two chat bubbles bobbing out of phase.
  chat: (
    <svg viewBox="0 0 160 100" width="140" height="88">
      <g className="es-bob">
        <rect x="24" y="16" width="78" height="40" rx="14" className="es-fill-gold" />
        <path d="M40 54 l-6 14 l18 -12 z" className="es-fill-gold" />
        <circle cx="48" cy="36" r="4" className="es-dot" />
        <circle cx="63" cy="36" r="4" className="es-dot d2" />
        <circle cx="78" cy="36" r="4" className="es-dot d3" />
      </g>
      <g className="es-bob b2">
        <rect x="74" y="50" width="62" height="32" rx="12" className="es-fill-soft" />
        <path d="M120 80 l8 12 l-20 -10 z" className="es-fill-soft" />
      </g>
    </svg>
  ),
  // A bell gently swinging.
  bell: (
    <svg viewBox="0 0 120 100" width="110" height="92">
      <g className="es-swing">
        <path d="M60 14c-15 0-26 12-26 27v18l-8 12h68l-8-12V41c0-15-11-27-26-27z" className="es-fill-gold" />
        <circle cx="60" cy="80" r="8" className="es-fill-light" />
        <rect x="56" y="6" width="8" height="10" rx="4" className="es-fill-gold" />
      </g>
      <circle cx="98" cy="22" r="10" className="es-fill-green" />
      <path d="M93 22l3.5 3.5 7-7" className="es-stroke-white" />
    </svg>
  ),
  // A box with a lid that bobs open.
  box: (
    <svg viewBox="0 0 140 100" width="130" height="92">
      <ellipse cx="70" cy="90" rx="40" ry="5" className="es-shadow" />
      <rect x="34" y="44" width="72" height="44" rx="5" className="es-fill-gold" />
      <rect x="64" y="44" width="12" height="44" className="es-fill-dark" opacity="0.2" />
      <g className="es-lid">
        <rect x="28" y="30" width="84" height="16" rx="4" className="es-fill-light" />
      </g>
    </svg>
  )
};

export const EmptyState = ({ art = 'box', title, children, action, compact = false }) => (
  <div className={`empty-state ${compact ? 'compact' : ''}`}>
    <div className="empty-art" aria-hidden="true">{ART[art] || ART.box}</div>
    {title && <div className="empty-title">{title}</div>}
    {children && <div className="empty-sub">{children}</div>}
    {action && <div style={{ marginTop: 12 }}>{action}</div>}
  </div>
);
