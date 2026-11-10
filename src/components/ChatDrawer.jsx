// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, CheckCheck, MessageSquare, Phone, PhoneCall, Send, Truck, ShoppingBag, X, WifiOff } from 'lucide-react';
import { useComms } from '../context/CommsContext';
import { SkeletonList, SkeletonBubbles } from './ui/Skeleton';
import { EmptyState } from './ui/EmptyState';
import { UserAvatar } from './ui/SafeImage';

const ROLE_LABEL = { captain: 'Move Captain', outgoing: 'Seller', student: 'Customer', professional: 'Customer', parent: 'Parent', customer: 'Customer' };

const timeLabel = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export const Avatar = ({ person, size = 40 }) => (
  <div style={{ position: 'relative', flexShrink: 0 }}>
    <UserAvatar src={person?.avatar} name={person?.name} size={size} />
    {person?.online !== undefined && (
      <span style={{
        position: 'absolute', right: 0, bottom: 0, width: size / 4, height: size / 4, minWidth: 9, minHeight: 9,
        borderRadius: '50%', background: person.online ? '#22C55E' : '#6B7280', border: '2px solid var(--bg-card-solid)'
      }} />
    )}
  </div>
);

const ContextIcon = ({ type }) => (type === 'driver' ? <Truck size={11} /> : type === 'seller' ? <ShoppingBag size={11} /> : <MessageSquare size={11} />);

const Inbox = ({ conversations, onSelect, loaded }) => {
  if (!loaded && !conversations.length) return <div style={{ padding: 16 }}><SkeletonList rows={4} avatar /></div>;
  if (!conversations.length) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <EmptyState art="chat" title="No conversations yet">Tap “Chat” on your Move Captain or a marketplace listing to start one.</EmptyState>
      </div>
    );
  }
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {conversations.map((c) => (
        <button
          key={c._id}
          onClick={() => onSelect(c._id)}
          style={{ width: '100%', display: 'flex', gap: 12, alignItems: 'center', padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', textAlign: 'left', color: 'inherit' }}
        >
          <Avatar person={c.otherUser} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>{c.otherUser?.name || 'Unknown'}</span>
              <span style={{ fontSize: '0.7rem', color: c.unread ? 'var(--primary)' : 'var(--text-dim)' }}>{timeLabel(c.lastMessage?.createdAt || c.updatedAt)}</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4, margin: '2px 0' }}>
              <ContextIcon type={c.context?.type} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.context?.title}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: c.unread ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: c.unread ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.lastMessage?.text || 'Say hello 👋'}
              </span>
              {c.unread > 0 && (
                <span style={{ background: 'var(--primary)', color: '#111', fontSize: '0.68rem', fontWeight: 800, borderRadius: 999, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>
                  {c.unread}
                </span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

const QUICK_REPLIES = {
  captain: ['On my way 🚚', 'Reached pickup point', 'Running 10 mins late', 'Please share the OTP at handover'],
  outgoing: ['Yes, still available!', 'Can do ₹200 less', 'Available this evening for handoff', 'Sold, sorry!'],
  default: ['Hi! Where are you now?', 'Please call me when you reach', 'Is this still available?', 'Thank you!']
};

const Thread = ({ conversation, myId, onBack, onClose }) => {
  const { messages, typing, sendMessage, sendTyping, requestCall } = useComms();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const typingTimer = useRef(null);
  const loadedList = messages[conversation._id];
  const list = loadedList || [];
  const other = conversation.otherUser;
  const iAm = conversation.participants.find((p) => p._id === myId);
  const quick = QUICK_REPLIES[iAm?.userType] || QUICK_REPLIES.default;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [list.length, typing[conversation._id]]);

  useEffect(() => () => { clearTimeout(typingTimer.current); sendTyping(conversation._id, false); }, [conversation._id]);

  const onChange = (e) => {
    setText(e.target.value);
    sendTyping(conversation._id, true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendTyping(conversation._id, false), 1500);
  };

  const submit = async (value = text) => {
    if (!value.trim() || sending) return;
    setSending(true);
    const ok = await sendMessage(conversation._id, value);
    setSending(false);
    if (ok && value === text) setText('');
    sendTyping(conversation._id, false);
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
        <button onClick={onBack} className="btn btn-secondary btn-sm" style={{ width: 32, height: 32, padding: 0, borderRadius: '50%' }} title="Back to inbox">
          <ArrowLeft size={15} />
        </button>
        <Avatar person={other} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>{other?.name}</div>
          <div style={{ fontSize: '0.72rem', color: typing[conversation._id] ? 'var(--primary)' : 'var(--text-muted)' }}>
            {typing[conversation._id] ? 'typing…' : `${ROLE_LABEL[other?.userType] || 'Member'} · ${other?.online ? 'Online' : 'Offline'}`}
          </div>
        </div>
        <button onClick={() => requestCall({ conversation })} className="btn btn-outline-emerald btn-sm" title={`Call ${other?.name}`}>
          <Phone size={14} /> Call
        </button>
        <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ width: 32, height: 32, padding: 0, borderRadius: '50%' }} title="Close">
          <X size={15} />
        </button>
      </div>

      {conversation.context?.title && (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-elevated)' }}>
          <ContextIcon type={conversation.context.type} /> {conversation.context.title}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 6px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {!loadedList && <SkeletonBubbles />}
        {loadedList && list.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem', margin: 'auto 0' }}>
            Messages go straight to {other?.name}. {other?.online ? 'They are online now.' : 'They will see it when they open Pack&Go.'}
          </div>
        )}
        {list.map((m, i) => {
          const mine = m.sender === myId;
          const showDay = i === 0 || new Date(m.createdAt).toDateString() !== new Date(list[i - 1].createdAt).toDateString();
          const read = mine && m.readBy.some((id) => id !== myId);
          return (
            <React.Fragment key={m._id}>
              {showDay && (
                <div style={{ alignSelf: 'center', fontSize: '0.68rem', color: 'var(--text-dim)', background: 'var(--bg-elevated)', padding: '2px 10px', borderRadius: 999, margin: '6px 0' }}>
                  {new Date(m.createdAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                </div>
              )}
              {m.kind === 'call' ? (
                <div style={{ alignSelf: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', border: '1px solid var(--border-subtle)', borderRadius: 999 }}>
                  <PhoneCall size={12} /> {m.text} · {timeLabel(m.createdAt)}
                </div>
              ) : (
                <div style={{
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  maxWidth: '78%',
                  background: mine ? 'var(--primary)' : 'var(--bg-elevated)',
                  color: mine ? '#111' : 'var(--text-main)',
                  padding: '8px 12px',
                  borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  fontSize: '0.88rem',
                  lineHeight: 1.4,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {m.text}
                  <div style={{ fontSize: '0.64rem', opacity: 0.7, textAlign: 'right', marginTop: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 3 }}>
                    {timeLabel(m.createdAt)}
                    {mine && (read ? <CheckCheck size={12} color="#0369A1" /> : <Check size={12} />)}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
        {typing[conversation._id] && (
          <div style={{ alignSelf: 'flex-start', background: 'var(--bg-elevated)', padding: '8px 14px', borderRadius: 14, fontSize: '0.85rem', color: 'var(--text-muted)' }}>•••</div>
        )}
        <div ref={endRef} />
      </div>

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '6px 12px' }}>
        {quick.map((q) => (
          <button key={q} onClick={() => submit(q)} className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem', whiteSpace: 'nowrap', padding: '4px 10px' }}>{q}</button>
        ))}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        style={{ display: 'flex', gap: 8, padding: '10px 12px 14px', borderTop: '1px solid var(--border-subtle)' }}
      >
        <input
          className="input-field"
          value={text}
          onChange={onChange}
          placeholder={`Message ${other?.name?.split(' ')[0] || ''}…`}
          maxLength={2000}
          autoFocus
          style={{ flex: 1, padding: '10px 14px', borderRadius: 999, border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', color: 'var(--text-main)', fontSize: '0.88rem', outline: 'none' }}
        />
        <button type="submit" disabled={!text.trim() || sending} className="btn btn-primary btn-sm" style={{ width: 40, height: 40, padding: 0, borderRadius: '50%' }} title="Send">
          <Send size={16} />
        </button>
      </form>
    </>
  );
};

export const ChatDrawer = () => {
  const { isChatOpen, setIsChatOpen, conversations, activeConversationId, selectConversation, myId, connected, inboxLoaded } = useComms();
  if (!isChatOpen) return null;
  const active = conversations.find((c) => c._id === activeConversationId);

  return (
    <div
      role="dialog"
      aria-label="Messages"
      style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, maxWidth: '100vw',
        background: 'var(--bg-card-solid)', borderLeft: '1px solid var(--border-subtle)', boxShadow: '-20px 0 50px rgba(0,0,0,0.45)',
        zIndex: 250, display: 'flex', flexDirection: 'column', animation: 'slideUp 0.25s ease'
      }}
    >
      {!active && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)' }}>Messages</div>
            <div style={{ fontSize: '0.72rem', color: connected ? 'var(--emerald-light)' : 'var(--rose)', display: 'flex', alignItems: 'center', gap: 4 }}>
              {connected ? '● Live' : <><WifiOff size={11} /> Reconnecting…</>}
            </div>
          </div>
          <button onClick={() => setIsChatOpen(false)} className="btn btn-secondary btn-sm" style={{ width: 32, height: 32, padding: 0, borderRadius: '50%' }} title="Close">
            <X size={16} />
          </button>
        </div>
      )}
      {active ? (
        <Thread conversation={active} myId={myId} onBack={() => selectConversation(null)} onClose={() => setIsChatOpen(false)} />
      ) : (
        <Inbox conversations={conversations} onSelect={selectConversation} loaded={inboxLoaded} />
      )}
    </div>
  );
};
