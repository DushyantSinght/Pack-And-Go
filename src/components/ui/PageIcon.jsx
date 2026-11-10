// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React from 'react';
import { Sparkles, QrCode, Truck, Repeat, Home, ShieldCheck, GraduationCap } from 'lucide-react';

const ICONS = { estimator: Sparkles, passport: QrCode, tracking: Truck, marketplace: Repeat, themes: Home, postmove: ShieldCheck, campus: GraduationCap };

/** Consistent illustrated icon tile used next to every tab's page title. */
export const PageIcon = ({ tab }) => {
  const Icon = ICONS[tab] || Sparkles;
  return (
    <span className="page-icon" aria-hidden="true">
      <span className="page-icon-ring" />
      <Icon size={22} />
    </span>
  );
};
