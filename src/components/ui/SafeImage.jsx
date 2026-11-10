// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React, { useEffect, useState } from 'react';
import { Armchair, Refrigerator, Laptop, BookOpen, Package, Shirt, Home, ImageOff, Truck } from 'lucide-react';

const ICONS = {
  furniture: Armchair,
  appliances: Refrigerator,
  electronics: Laptop,
  study: BookOpen,
  books: BookOpen,
  clothes: Shirt,
  wardrobe: Shirt,
  room: Home,
  home: Home,
  vehicle: Truck,
  box: Package
};
const iconFor = (kind = '') => {
  const k = String(kind).toLowerCase();
  const hit = Object.keys(ICONS).find((key) => k.includes(key));
  return hit ? ICONS[hit] : ImageOff;
};

/**
 * <img> that never shows a broken-image icon. With no src, or if loading fails,
 * it renders a themed placeholder (icon for the item's category + optional label)
 * in the same box, so layouts and shared-element transitions keep working.
 */
export const SafeImage = ({ src, alt = '', kind, label, className = '', style, ...rest }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    const Icon = iconFor(kind || alt);
    return (
      <span role="img" aria-label={alt || 'No photo'} className={`img-fallback ${className}`} style={style}>
        <Icon size={34} strokeWidth={1.6} />
        <span className="img-fallback-label">{label || (src ? 'Photo unavailable' : 'No photo yet')}</span>
      </span>
    );
  }
  return <img src={src} alt={alt} className={className} style={style} loading="lazy" decoding="async" onError={() => setFailed(true)} {...rest} />;
};

const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';

/** Round profile picture with an initials fallback (no stock faces for people without a photo). */
export const UserAvatar = ({ src, name, size = 40, style }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const box = { width: size, height: size, borderRadius: '50%', flexShrink: 0, ...style };
  if (!src || failed) {
    return (
      <span className="avatar-initials" style={{ ...box, fontSize: Math.max(11, size * 0.36) }} aria-label={name || 'User'}>
        {initials(name)}
      </span>
    );
  }
  return <img src={src} alt="" onError={() => setFailed(true)} style={{ ...box, objectFit: 'cover', border: '1px solid var(--border-subtle)' }} />;
};
