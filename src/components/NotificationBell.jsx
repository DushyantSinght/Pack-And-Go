// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useComms } from '../context/CommsContext';
import { useMove } from '../context/MoveContext';
import { CountBadge, useBump } from './ui/AnimatedNumber';
import { SkeletonList } from './ui/Skeleton';
import { EmptyState } from './ui/EmptyState';

const ago = (d) => {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

export const NotificationBell = () => {
  const { notifications, unreadNotifications, markNotificationsRead, openInbox, notificationsLoaded } = useComms();
  const bump = useBump(unreadNotifications);
  const { openMyMoves } = useMove();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const toggle = () => {
    setOpen(!open);
    if (!open && unreadNotifications) markNotificationsRead();
  };

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button onClick={toggle} className="btn btn-secondary btn-sm" title="Notifications" aria-label="Notifications"
        style={{ position: 'relative', width: 34, height: 34, padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Bell size={15} className={bump ? 'wiggle' : ''} />
        <CountBadge count={unreadNotifications} style={{ position: 'absolute', top: -4, right: -4, background: '#EF4444', color: '#fff', fontSize: '0.62rem', fontWeight: 800, minWidth: 17, height: 17, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }} />
      </button>
      {open && (
        <div className="notif-panel" style={{ animation: 'scaleIn .28s var(--ease-out) both', transformOrigin: 'top right', position: 'absolute', right: 0, top: 42, width: 340, maxWidth: 'calc(100vw - 24px)', maxHeight: 420, overflowY: 'auto', background: 'var(--bg-card-solid)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', zIndex: 300 }}>
          <div style={{ padding: '10px 14px', fontWeight: 800, borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-main)' }}>Notifications</div>
          {!notificationsLoaded && !notifications.length && <div style={{ padding: 12 }}><SkeletonList rows={3} /></div>}
          {notificationsLoaded && !notifications.length && <EmptyState art="bell" compact title="You're all caught up">Booking, payment and captain updates will show up here.</EmptyState>}
          {notifications.map((n) => (
            <button
              key={n._id}
              onClick={() => { setOpen(false); if (n.type === 'chat') openInbox(); else if (n.bookingId) openMyMoves(n.bookingId); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: n.read ? 'transparent' : 'rgba(212,175,55,0.06)', border: 'none', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', color: 'inherit' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: '0.83rem', color: 'var(--text-main)' }}>{n.title}</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', flexShrink: 0 }}>{ago(n.createdAt)}</span>
              </div>
              {n.body && <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>{n.body}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
