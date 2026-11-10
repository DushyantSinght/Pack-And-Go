// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React from 'react';

/** A check mark that draws itself, with a soft burst ring. */
export const SuccessCheck = ({ size = 64, color = '#22C55E' }) => (
  <span className="success-check" style={{ width: size, height: size, '--sc': color }} aria-hidden="true">
    <span className="sc-burst" />
    <svg viewBox="0 0 52 52" width={size} height={size}>
      <circle className="sc-circle" cx="26" cy="26" r="24" fill="none" />
      <path className="sc-tick" fill="none" d="M15 27.5l7.2 7.2L37.5 19" />
    </svg>
  </span>
);
