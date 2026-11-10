// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React from 'react';

export const Skeleton = ({ w = '100%', h = 14, r = 8, style }) => (
  <span className="skeleton" style={{ display: 'block', width: w, height: h, borderRadius: r, ...style }} aria-hidden="true" />
);

/** Rows shaped like list cards (title, meta line, badge). */
export const SkeletonList = ({ rows = 3, avatar = false }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-busy="true" aria-label="Loading">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="skeleton-row" style={{ animationDelay: `${i * 90}ms` }}>
        {avatar && <Skeleton w={40} h={40} r={999} />}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton w={`${62 - i * 7}%`} h={13} />
          <Skeleton w={`${84 - i * 5}%`} h={10} />
        </div>
        <Skeleton w={64} h={20} r={999} />
      </div>
    ))}
  </div>
);

/** Chat-bubble shaped placeholders. */
export const SkeletonBubbles = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '6px 0' }} aria-busy="true">
    {[['58%', 'flex-start'], ['44%', 'flex-end'], ['66%', 'flex-start'], ['38%', 'flex-end']].map(([w, a], i) => (
      <Skeleton key={i} w={w} h={34} r={14} style={{ alignSelf: a }} />
    ))}
  </div>
);
