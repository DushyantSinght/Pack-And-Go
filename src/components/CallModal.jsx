import React, { useEffect, useState } from 'react';
import { Copy, Mic, MicOff, Phone, PhoneIncoming, PhoneOff, Smartphone, Wifi, X, MessageCircle } from 'lucide-react';
import { useComms, toE164, formatDuration } from '../context/CommsContext';
import { useMove } from '../context/MoveContext';
import { Avatar } from './ChatDrawer';

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16
};
const card = {
  width: 380, maxWidth: '100%', background: 'var(--bg-card-solid)', border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-lg)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', padding: 24, textAlign: 'center', position: 'relative'
};
const roundBtn = (bg) => ({
  width: 60, height: 60, borderRadius: '50%', border: 'none', background: bg, color: '#fff',
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,0,0,0.35)'
});

/** "How would you like to call X?" — confirms before anything is dialled. */
const CallChooser = () => {
  const { callPrompt, setCallPrompt, startInAppCall, logPhoneCall } = useComms();
  const { showToast } = useMove();
  const { conversation } = callPrompt;
  const person = conversation.otherUser;
  const e164 = toE164(person?.phone);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(e164);
      showToast(`Copied ${e164}`, 'success');
    } catch {
      showToast('Could not copy the number.', 'error');
    }
  };

  return (
    <div style={overlay} onClick={() => setCallPrompt(null)}>
      <div style={card} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Call ${person?.name}`}>
        <button onClick={() => setCallPrompt(null)} className="btn btn-secondary btn-sm" style={{ position: 'absolute', top: 12, right: 12, width: 30, height: 30, padding: 0, borderRadius: '50%' }} title="Cancel">
          <X size={14} />
        </button>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Avatar person={person} size={76} /></div>
        <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-main)' }}>Call {person?.name}?</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>{conversation.context?.title}</div>
        {e164 && <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', marginTop: 10, letterSpacing: '0.03em' }}>{e164.replace(/^\+91(\d{5})(\d{5})$/, '+91 $1 $2')}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
          {e164 ? (
            <a
              href={`tel:${e164}`}
              onClick={() => logPhoneCall(conversation)}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', textDecoration: 'none', gap: 8 }}
            >
              <Smartphone size={16} /> Call on phone
            </a>
          ) : (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>No phone number on file for {person?.name}.</div>
          )}
          <button
            onClick={() => startInAppCall(conversation)}
            disabled={!person?.online}
            className="btn btn-outline-emerald"
            style={{ width: '100%', justifyContent: 'center', gap: 8, opacity: person?.online ? 1 : 0.5 }}
            title={person?.online ? 'Free voice call over the internet' : `${person?.name} is offline — in-app calls need them online`}
          >
            <Wifi size={16} /> Pack&Go voice call {person?.online ? '(online now)' : '(offline)'}
          </button>
          {e164 && (
            <div style={{ display: 'flex', gap: 8 }}>
              <a
                href={`https://wa.me/${e164.replace('+', '')}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, justifyContent: 'center', textDecoration: 'none', gap: 6 }}
              >
                <MessageCircle size={14} /> WhatsApp
              </a>
              <button onClick={copy} className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center', gap: 6 }}>
                <Copy size={14} /> Copy number
              </button>
            </div>
          )}
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 14 }}>
          “Call on phone” opens your device dialer (iPhone, Android, FaceTime or your default calling app).
        </div>
      </div>
    </div>
  );
};

const STATUS_TEXT = {
  connecting: 'Connecting…',
  ringing: 'Ringing…',
  incoming: 'Incoming Pack&Go voice call',
  active: null,
  ended: 'Call ended'
};

/** Ringing / incoming / in-call screen for in-app WebRTC calls. */
const LiveCall = () => {
  const { call, acceptCall, declineCall, hangUp, toggleMute } = useComms();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (call?.status !== 'active') return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [call?.status]);

  const isIncoming = call.status === 'incoming';
  const subtitle = call.status === 'active' ? formatDuration(now - call.startedAt) : call.status === 'ended' ? call.endMessage || STATUS_TEXT.ended : STATUS_TEXT[call.status];

  return (
    <div style={{ ...overlay, background: 'rgba(0,0,0,0.82)' }}>
      <div style={{ ...card, background: 'linear-gradient(180deg, #12202A 0%, #0B0C10 100%)', color: '#fff', padding: '36px 24px' }} role="dialog" aria-label="Voice call">
        <div style={{ fontSize: '0.72rem', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.6)', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {isIncoming ? <PhoneIncoming size={13} /> : <Wifi size={13} />} PACK&GO VOICE
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <div style={{ borderRadius: '50%', padding: 6, animation: ['ringing', 'incoming'].includes(call.status) ? 'pulse 1.6s infinite' : 'none', boxShadow: '0 0 0 6px rgba(212,175,55,0.15)' }}>
            <Avatar person={{ ...call.peer, online: undefined }} size={96} />
          </div>
        </div>
        <div style={{ fontWeight: 800, fontSize: '1.4rem' }}>{call.peer?.name}</div>
        <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', marginTop: 6, minHeight: 22 }}>{subtitle}</div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginTop: 32 }}>
          {isIncoming ? (
            <>
              <div>
                <button onClick={declineCall} style={roundBtn('#DC2626')} title="Decline"><PhoneOff size={24} /></button>
                <div style={{ fontSize: '0.72rem', marginTop: 6, color: 'rgba(255,255,255,0.7)' }}>Decline</div>
              </div>
              <div>
                <button onClick={acceptCall} style={roundBtn('#16A34A')} title="Accept"><Phone size={24} /></button>
                <div style={{ fontSize: '0.72rem', marginTop: 6, color: 'rgba(255,255,255,0.7)' }}>Accept</div>
              </div>
            </>
          ) : call.status !== 'ended' ? (
            <>
              <div>
                <button onClick={toggleMute} disabled={call.status !== 'active'} style={{ ...roundBtn(call.muted ? '#F4F4F2' : 'rgba(255,255,255,0.14)'), color: call.muted ? '#111' : '#fff', opacity: call.status === 'active' ? 1 : 0.4 }} title={call.muted ? 'Unmute' : 'Mute'}>
                  {call.muted ? <MicOff size={22} /> : <Mic size={22} />}
                </button>
                <div style={{ fontSize: '0.72rem', marginTop: 6, color: 'rgba(255,255,255,0.7)' }}>{call.muted ? 'Unmute' : 'Mute'}</div>
              </div>
              <div>
                <button onClick={hangUp} style={roundBtn('#DC2626')} title="End call"><PhoneOff size={24} /></button>
                <div style={{ fontSize: '0.72rem', marginTop: 6, color: 'rgba(255,255,255,0.7)' }}>End</div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export const CallModal = () => {
  const { callPrompt, call } = useComms();
  if (call) return <LiveCall />;
  if (callPrompt) return <CallChooser />;
  return null;
};
