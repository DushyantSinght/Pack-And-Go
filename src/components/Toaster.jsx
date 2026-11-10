// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { useMove } from '../context/MoveContext';

const DURATION = { success: 4200, info: 4800, error: 6500 };

/** One toast: auto-dismiss that pauses on hover, swipe right (or tap ×) to dismiss. */
const ToastItem = ({ toast, onDone }) => {
  const total = DURATION[toast.type] || 4500;
  const [leaving, setLeaving] = useState(false);
  const [drag, setDrag] = useState(0);
  const remaining = useRef(total);
  const started = useRef(0);
  const timer = useRef(null);
  const startX = useRef(null);

  const leave = () => {
    clearTimeout(timer.current);
    setLeaving(true);
    setTimeout(onDone, 260);
  };
  const start = () => {
    started.current = Date.now();
    clearTimeout(timer.current);
    timer.current = setTimeout(leave, remaining.current);
  };
  const pause = () => {
    clearTimeout(timer.current);
    remaining.current = Math.max(600, remaining.current - (Date.now() - started.current));
  };

  useEffect(() => {
    start();
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = (e) => {
    if (e.target.closest('.toast-close')) return;
    startX.current = e.clientX;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pause();
  };
  const onPointerMove = (e) => {
    if (startX.current == null) return;
    setDrag(Math.max(0, e.clientX - startX.current));
  };
  const onPointerUp = () => {
    if (startX.current == null) return;
    startX.current = null;
    if (drag > 90) leave();
    else {
      setDrag(0);
      start();
    }
  };

  const Icon = toast.type === 'error' ? AlertCircle : toast.type === 'info' ? Info : CheckCircle;
  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={`toast-item ${toast.type} ${leaving ? 'leaving' : ''} ${drag ? 'dragging' : ''}`}
      style={drag ? { transform: `translateX(${drag}px)`, opacity: Math.max(0.2, 1 - drag / 220) } : undefined}
      onMouseEnter={pause}
      onMouseLeave={() => startX.current == null && start()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <Icon size={19} color={toast.type === 'error' ? '#FCA5A5' : toast.type === 'info' ? '#8ECAE6' : 'var(--primary)'} style={{ flexShrink: 0, marginTop: 1 }} />
      <div className="toast-msg">{toast.message}</div>
      <button className="toast-close" onClick={leave} aria-label="Dismiss notification"><X size={15} /></button>
      <span className="toast-bar" style={{ animationDuration: `${total}ms` }} />
    </div>
  );
};

export const Toaster = () => {
  const { toasts, dismissToast } = useMove();
  return (
    <div className="toaster" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDone={() => dismissToast(t.id)} />
      ))}
    </div>
  );
};
