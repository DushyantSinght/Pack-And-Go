// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// Email templates. Each returns { subject, text, html }; every user-supplied value is escaped.
import { appUrl, escapeHtml } from './notify.js';

const first = (name) => String(name || '').trim().split(/\s+/)[0] || 'there';

const layout = ({ heading, paragraphs, cta, footnote }) => {
  const p = paragraphs.map((t) => `<p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.6">${escapeHtml(t)}</p>`).join('');
  const button = cta
    ? `<p style="margin:22px 0"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#B8922B;color:#111;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px">${escapeHtml(cta.label)}</a></p>
       <p style="margin:0 0 14px;color:#64748B;font-size:12px;line-height:1.5">Button not working? Copy this link into your browser:<br><span style="word-break:break-all">${escapeHtml(cta.url)}</span></p>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#F5F3EE;padding:24px 12px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:28px 24px;border:1px solid #E7E2D5">
    <div style="font-weight:800;font-size:18px;color:#111;margin-bottom:18px">Pack<span style="color:#B8922B">&amp;</span>Go</div>
    <h1 style="font-size:20px;color:#0F172A;margin:0 0 14px">${escapeHtml(heading)}</h1>
    ${p}${button}
    ${footnote ? `<p style="margin:18px 0 0;color:#94A3B8;font-size:12px;line-height:1.5">${escapeHtml(footnote)}</p>` : ''}
  </div></body></html>`;
};

export const verificationEmail = ({ name, link }) => ({
  subject: 'Verify your Pack&Go email',
  text: `Hi ${first(name)},\n\nConfirm your email to start booking moves:\n${link}\n\nIf you didn't create a Pack&Go account, ignore this email.`,
  html: layout({
    heading: 'Confirm your email',
    paragraphs: [`Hi ${first(name)},`, 'Confirm your email address to start booking moves on Pack&Go.'],
    cta: { label: 'Verify my email', url: link },
    footnote: "If you didn't create a Pack&Go account, you can ignore this email."
  })
});

export const passwordResetEmail = ({ name, link, minutes = 30 }) => ({
  subject: 'Reset your Pack&Go password',
  text: `Hi ${first(name)},\n\nSomeone asked to reset your Pack&Go password.\n\nReset it here (valid for ${minutes} minutes):\n${link}\n\nIf this wasn't you, you can ignore this email — your password stays the same.`,
  html: layout({
    heading: 'Reset your password',
    paragraphs: [`Hi ${first(name)},`, `Someone asked to reset your Pack&Go password. This link works for ${minutes} minutes and can be used once.`],
    cta: { label: 'Choose a new password', url: link },
    footnote: "If this wasn't you, ignore this email — your password stays the same."
  })
});

/** Booking / account updates sent by notify(). */
export const notificationEmail = ({ name, title, body, subject }) => ({
  subject: subject || `Pack&Go: ${title}`,
  text: `Hi ${first(name)},\n\n${title}\n${body || ''}\n\nOpen Pack&Go: ${appUrl()}\n\n— Team Pack&Go`,
  html: layout({
    heading: title,
    paragraphs: [`Hi ${first(name)},`, ...(body ? [body] : [])],
    cta: { label: 'Open Pack&Go', url: appUrl() },
    footnote: "You're getting this because you have a Pack&Go account."
  })
});
