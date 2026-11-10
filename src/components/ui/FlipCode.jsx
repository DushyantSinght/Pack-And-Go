// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/** Split-flap style code display. Tap to copy. */
export const FlipCode = ({ code, used = false, tone = 'var(--primary)' }) => {
  const [copied, setCopied] = useState(false);
  const digits = String(code || '••••••').split('');
  const copy = async () => {
    if (!code || used) return;
    try {
      await navigator.clipboard.writeText(String(code));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <button type="button" className={`flip-code ${used ? 'used' : ''}`} onClick={copy} title={used ? 'Already used' : 'Tap to copy'} style={{ '--flip-tone': tone }}>
      <span className="flip-digits">
        {digits.map((d, i) => (
          <span key={`${code}-${i}`} className="flip-digit" style={{ animationDelay: `${i * 70}ms` }}>{d}</span>
        ))}
      </span>
      {!used && (
        <span className={`flip-hint ${copied ? 'ok' : ''}`}>
          {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Tap to copy</>}
        </span>
      )}
    </button>
  );
};
