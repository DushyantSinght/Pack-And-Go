// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import { createPortal } from 'react-dom';

/** The layer dialogs render into: outside every card, so no parent blur/transform can trap them. */
export const portalRoot = () => {
  let el = document.getElementById('portal-root');
  if (!el) {
    el = document.createElement('div');
    el.id = 'portal-root';
    document.body.appendChild(el);
  }
  return el;
};

/**
 * Renders a full-screen dialog at the top level. A parent with backdrop-filter, filter or
 * transform (our glass panels have a blur) makes position:fixed children size to that parent
 * instead of the screen — portalling avoids that for dialogs opened from inside a card.
 */
export const Portal = ({ children }) => createPortal(children, portalRoot());
