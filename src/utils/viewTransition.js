// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import { flushSync } from 'react-dom';

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Run a React state update inside a View Transition (shared-element morphs,
 * theme reveal). Falls back to a plain update where unsupported.
 * Adds `vt-active` (and an optional class) to <html> while it runs.
 */
export const withViewTransition = (update, { className } = {}) => {
  if (!document.startViewTransition || reduced()) {
    update();
    return null;
  }
  const root = document.documentElement;
  root.classList.add('vt-active');
  if (className) root.classList.add(className);
  // If the browser can't start the transition promptly (e.g. the tab isn't being
  // painted), apply the update anyway so the UI never gets stuck.
  let applied = false;
  const apply = () => {
    if (applied) return;
    applied = true;
    flushSync(update);
  };
  const t = document.startViewTransition(apply);
  // A skipped transition rejects these promises; that's expected, not an error.
  t.ready.catch(() => {});
  t.updateCallbackDone.catch(() => {});
  const guard = setTimeout(() => {
    if (!applied) {
      t.skipTransition();
      apply();
    }
  }, 800);
  t.finished.finally(() => {
    clearTimeout(guard);
    root.classList.remove('vt-active');
    if (className) root.classList.remove(className);
  });
  return t;
};
