import React, { useState } from 'react';
import { MailWarning } from 'lucide-react';
import { useMove } from '../context/MoveContext';
import { api } from '../services/api';

/** Shown until the signed-in user verifies their email (required to book). */
export const VerifyEmailBanner = () => {
  const { user, showToast, updateUser } = useMove();
  const [busy, setBusy] = useState(false);
  if (!user?.name || user.emailVerified !== false) return null;

  const resend = async () => {
    setBusy(true);
    try {
      const r = await api.resendVerification();
      if (r.devVerifyLink) updateUser({ devVerifyLink: r.devVerifyLink });
      showToast(r.message, 'success');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ background: '#78350F', color: '#FEF3C7', padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap', textAlign: 'center' }}>
      <MailWarning size={15} />
      <span>Verify <strong>{user.email}</strong> to book moves.</span>
      {user.devVerifyLink ? (
        <a href={user.devVerifyLink} style={{ color: '#FDE68A', fontWeight: 700 }}>Development: click to verify (no email server set up)</a>
      ) : (
        <button onClick={resend} disabled={busy} style={{ background: '#FEF3C7', color: '#78350F', border: 'none', borderRadius: 4, padding: '2px 10px', fontWeight: 700, cursor: 'pointer' }}>
          {busy ? 'Sending…' : 'Resend email'}
        </button>
      )}
    </div>
  );
};
