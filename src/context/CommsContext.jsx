// Real-time communications: inbox, 1:1 chat over Socket.IO, and voice calls
// (native phone dialer via tel: links, or in-app WebRTC audio calls).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useMove } from './MoveContext';
import { api, tokenStorage } from '../services/api';

const CommsContext = createContext(null);

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
const RING_TIMEOUT_MS = 30000;

/** "+91 98452 11029" / "9845211029" → "+919845211029" (E.164, defaults to India). */
export const toE164 = (phone) => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length >= 8) return `+${digits}`;
  return null;
};

export const formatDuration = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/** Tiny WebAudio tone player so we don't need audio assets for ringtones. */
const createRinger = () => {
  let ctx = null;
  let timer = null;
  const beep = (freqs, dur) => {
    if (!ctx) return;
    freqs.forEach((f) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    });
  };
  return {
    start(type) {
      this.stop();
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        return;
      }
      const play = () =>
        type === 'incoming' ? (beep([880, 660], 0.35), setTimeout(() => beep([880, 660], 0.35), 450)) : beep([440, 480], 1.2);
      play();
      timer = setInterval(play, type === 'incoming' ? 2000 : 3500);
    },
    stop() {
      clearInterval(timer);
      timer = null;
      ctx?.close?.().catch(() => {});
      ctx = null;
    }
  };
};

export const CommsProvider = ({ children }) => {
  const { user, showToast, openAuth } = useMove();
  const myId = user?._id ? String(user._id) : null;

  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState({}); // convId -> Message[]
  const [typing, setTyping] = useState({}); // convId -> bool
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const activeConvRef = useRef(null);
  const chatOpenRef = useRef(false);
  useEffect(() => { activeConvRef.current = activeConversationId; }, [activeConversationId]);
  useEffect(() => { chatOpenRef.current = isChatOpen; }, [isChatOpen]);

  // Calls
  const [callPrompt, setCallPrompt] = useState(null); // { conversation } – "how do you want to call?"
  const [call, setCall] = useState(null); // { id, direction, status, peer, conversationId, startedAt, muted, error }
  const callRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingIceRef = useRef([]);
  const pendingOfferRef = useRef(null);
  const ringTimeoutRef = useRef(null);
  const ringerRef = useRef(null);
  const remoteAudioRef = useRef(null);
  if (!ringerRef.current) ringerRef.current = createRinger();

  const updateCall = useCallback((next) => {
    callRef.current = typeof next === 'function' ? next(callRef.current) : next;
    setCall(callRef.current);
  }, []);

  // ── Inbox helpers ──────────────────────────────────────────────
  const upsertConversation = useCallback((conv) => {
    setConversations((prev) => {
      const rest = prev.filter((c) => c._id !== conv._id);
      return [conv, ...rest].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    });
  }, []);

  const refreshInbox = useCallback(async () => {
    if (!myId) return;
    try {
      const res = await api.getConversations();
      setConversations(res.conversations || []);
    } catch (e) {
      console.warn('Inbox load failed:', e.message);
    }
  }, [myId]);

  const markRead = useCallback(async (convId) => {
    setConversations((prev) => prev.map((c) => (c._id === convId ? { ...c, unread: 0 } : c)));
    api.markConversationRead(convId).catch(() => {});
  }, []);

  const loadMessages = useCallback(async (convId) => {
    try {
      const res = await api.getMessages(convId);
      setMessages((prev) => ({ ...prev, [convId]: res.messages || [] }));
    } catch (e) {
      showToast(e.message, 'error');
    }
  }, [showToast]);

  // ── Call teardown ──────────────────────────────────────────────
  const cleanupMedia = useCallback(() => {
    ringerRef.current.stop();
    clearTimeout(ringTimeoutRef.current);
    pcRef.current?.getSenders?.().forEach((s) => s.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pendingIceRef.current = [];
    pendingOfferRef.current = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
  }, []);

  /** The caller writes one log line into the chat so both sides see call history. */
  const logCall = useCallback((c, outcome) => {
    if (!c || c.direction !== 'outgoing' || !c.conversationId) return;
    const text =
      outcome === 'completed' ? `📞 Voice call · ${formatDuration(Date.now() - c.startedAt)}`
      : outcome === 'declined' ? '📞 Call declined'
      : outcome === 'busy' ? '📞 Call not answered (busy)'
      : '📞 Missed voice call';
    socketRef.current?.emit('chat:send', { conversationId: c.conversationId, text, kind: 'call' });
  }, []);

  const finishCall = useCallback((outcome, { notifyPeer = true, message } = {}) => {
    const c = callRef.current;
    if (!c) return;
    if (notifyPeer && c.peer?._id) socketRef.current?.emit('call:end', { to: c.peer._id, callId: c.id });
    const finalOutcome = outcome || (c.status === 'active' ? 'completed' : 'missed');
    logCall(c, finalOutcome);
    cleanupMedia();
    updateCall({ ...c, status: 'ended', endMessage: message || (finalOutcome === 'completed' ? `Call ended · ${formatDuration(Date.now() - c.startedAt)}` : 'Call ended') });
    setTimeout(() => {
      if (callRef.current?.id === c.id) updateCall(null);
    }, 1800);
  }, [cleanupMedia, logCall, updateCall]);

  const createPeer = useCallback((peerId, callId) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onicecandidate = (e) => {
      if (e.candidate) socketRef.current?.emit('call:ice', { to: peerId, callId, candidate: e.candidate });
    };
    pc.ontrack = (e) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = e.streams[0];
        remoteAudioRef.current.play?.().catch(() => {});
      }
    };
    pc.onconnectionstatechange = () => {
      if (['failed', 'disconnected'].includes(pc.connectionState) && callRef.current?.status === 'active') {
        finishCall(undefined, { message: 'Connection lost' });
      }
    };
    pcRef.current = pc;
    return pc;
  }, [finishCall]);

  const flushIce = async () => {
    const pc = pcRef.current;
    if (!pc?.remoteDescription) return;
    for (const c of pendingIceRef.current.splice(0)) await pc.addIceCandidate(c).catch(() => {});
  };

  const getMic = async () => {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser does not support in-app calling.');
    return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
  };

  // ── Socket lifecycle ───────────────────────────────────────────
  useEffect(() => {
    const token = tokenStorage.get();
    if (!myId || !token) {
      setConversations([]);
      setMessages({});
      setIsChatOpen(false);
      return undefined;
    }

    const socket = io({ auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => { setConnected(true); refreshInbox(); });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => console.warn('Realtime connection error:', err.message));

    socket.on('chat:message', ({ message, conversation }) => {
      setMessages((prev) => {
        const list = prev[message.conversation] || [];
        if (list.some((m) => m._id === message._id)) return prev;
        return { ...prev, [message.conversation]: [...list, message] };
      });
      const viewing = chatOpenRef.current && activeConvRef.current === conversation._id && !document.hidden;
      upsertConversation(viewing ? { ...conversation, unread: 0 } : conversation);
      setTyping((t) => ({ ...t, [conversation._id]: false }));
      if (message.sender !== myId) {
        if (viewing) {
          api.markConversationRead(conversation._id).catch(() => {});
        } else {
          const who = conversation.otherUser?.name || 'New message';
          showToast(`💬 ${who}: ${message.text.slice(0, 80)}`, 'info');
          if (document.hidden && window.Notification?.permission === 'granted') {
            new Notification(who, { body: message.text, tag: conversation._id });
          }
        }
      }
    });

    socket.on('chat:typing', ({ conversationId, typing: isTyping }) => {
      setTyping((t) => ({ ...t, [conversationId]: isTyping }));
    });

    socket.on('chat:read', ({ conversationId, userId }) => {
      setMessages((prev) => {
        const list = prev[conversationId];
        if (!list) return prev;
        return { ...prev, [conversationId]: list.map((m) => (m.readBy.includes(userId) ? m : { ...m, readBy: [...m.readBy, userId] })) };
      });
    });

    socket.on('presence', ({ userId, online }) => {
      setConversations((prev) =>
        prev.map((c) => (c.otherUser?._id === userId ? { ...c, otherUser: { ...c.otherUser, online } } : c))
      );
    });

    // Incoming call signalling
    socket.on('call:invite', ({ from, callId, offer, conversationId }) => {
      if (callRef.current && callRef.current.status !== 'ended') {
        socket.emit('call:reject', { to: from._id, callId, reason: 'busy' });
        return;
      }
      pendingOfferRef.current = offer;
      pendingIceRef.current = [];
      updateCall({ id: callId, direction: 'incoming', status: 'incoming', peer: from, conversationId, muted: false });
      ringerRef.current.start('incoming');
      if (document.hidden && window.Notification?.permission === 'granted') {
        new Notification(`Incoming call from ${from.name}`, { body: 'Pack&Go voice call', tag: callId });
      }
    });

    socket.on('call:accept', async ({ callId, answer }) => {
      const c = callRef.current;
      if (!c || c.id !== callId || !pcRef.current) return;
      ringerRef.current.stop();
      clearTimeout(ringTimeoutRef.current);
      await pcRef.current.setRemoteDescription(answer);
      await flushIce();
      updateCall({ ...c, status: 'active', startedAt: Date.now() });
    });

    socket.on('call:reject', ({ callId, reason }) => {
      if (callRef.current?.id !== callId) return;
      finishCall(reason === 'busy' ? 'busy' : 'declined', {
        notifyPeer: false,
        message: reason === 'busy' ? `${callRef.current.peer.name} is on another call` : `${callRef.current.peer.name} declined the call`
      });
    });

    socket.on('call:ice', async ({ callId, candidate }) => {
      if (callRef.current?.id !== callId) return;
      if (pcRef.current?.remoteDescription) await pcRef.current.addIceCandidate(candidate).catch(() => {});
      else pendingIceRef.current.push(candidate);
    });

    socket.on('call:end', ({ callId }) => {
      if (callRef.current?.id !== callId) return;
      const c = callRef.current;
      finishCall(c.status === 'active' ? 'completed' : 'missed', {
        notifyPeer: false,
        message: c.status === 'incoming' ? `Missed call from ${c.peer.name}` : undefined
      });
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
      if (callRef.current) { cleanupMedia(); updateCall(null); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId]);

  // ── Public actions ─────────────────────────────────────────────
  const requireLogin = (what) => {
    if (myId) return true;
    showToast(`Please sign in to ${what}.`, 'info');
    openAuth('login');
    return false;
  };

  const askNotificationPermission = () => {
    if (window.Notification?.permission === 'default') window.Notification.requestPermission().catch(() => {});
  };

  /** Open (or create) a thread with the person behind a driver card / listing. */
  const openChat = async (target) => {
    if (!requireLogin('chat')) return null;
    askNotificationPermission();
    try {
      const res = await api.startConversation(target);
      upsertConversation(res.conversation);
      setActiveConversationId(res.conversation._id);
      setIsChatOpen(true);
      await loadMessages(res.conversation._id);
      markRead(res.conversation._id);
      return res.conversation;
    } catch (e) {
      showToast(e.message, 'error');
      return null;
    }
  };

  const openInbox = () => {
    if (!requireLogin('see your messages')) return;
    askNotificationPermission();
    setActiveConversationId(null);
    setIsChatOpen(true);
    refreshInbox();
  };

  const selectConversation = async (convId) => {
    setActiveConversationId(convId);
    if (convId) {
      await loadMessages(convId);
      markRead(convId);
    }
  };

  const sendMessage = (convId, text) =>
    new Promise((resolve) => {
      const trimmed = text.trim();
      if (!trimmed) return resolve(false);
      const socket = socketRef.current;
      const onSent = (message) => {
        setMessages((prev) => {
          const list = prev[convId] || [];
          return list.some((m) => m._id === message._id) ? prev : { ...prev, [convId]: [...list, message] };
        });
        resolve(true);
      };
      if (socket?.connected) {
        socket.emit('chat:send', { conversationId: convId, text: trimmed }, (ack) => {
          if (ack?.ok) onSent(ack.message);
          else { showToast(ack?.error || 'Message failed to send.', 'error'); resolve(false); }
        });
      } else {
        api.sendMessage(convId, trimmed)
          .then((r) => onSent(r.message))
          .catch((e) => { showToast(e.message, 'error'); resolve(false); });
      }
    });

  const sendTyping = (convId, isTyping) => socketRef.current?.emit('chat:typing', { conversationId: convId, typing: isTyping });

  /** Step 1 of calling: resolve the contact and ask the user how to call. */
  const requestCall = async (target) => {
    if (!requireLogin('make calls')) return;
    try {
      const conversation = target.conversation || (await api.startConversation(target)).conversation;
      upsertConversation(conversation);
      setCallPrompt({ conversation });
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  /** Step 2a: in-app WebRTC voice call over the internet. */
  const startInAppCall = async (conversation) => {
    setCallPrompt(null);
    const peer = conversation.otherUser;
    if (!socketRef.current?.connected) return showToast('Not connected to Pack&Go realtime service.', 'error');
    const callId = `call-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    updateCall({ id: callId, direction: 'outgoing', status: 'connecting', peer, conversationId: conversation._id, muted: false });
    try {
      const stream = await getMic();
      localStreamRef.current = stream;
      const pc = createPeer(peer._id, callId);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit('call:invite', { to: peer._id, callId, conversationId: conversation._id, offer }, (ack) => {
        if (!ack?.ok) {
          cleanupMedia();
          updateCall({ ...callRef.current, status: 'ended', endMessage: ack?.error === 'offline' ? `${peer.name} is offline right now` : 'Call could not be placed' });
          setTimeout(() => updateCall(null), 2200);
          return;
        }
        updateCall({ ...callRef.current, status: 'ringing' });
        ringerRef.current.start('outgoing');
        ringTimeoutRef.current = setTimeout(() => {
          if (callRef.current?.id === callId && callRef.current.status === 'ringing') {
            finishCall('missed', { message: `${peer.name} didn't answer` });
          }
        }, RING_TIMEOUT_MS);
      });
    } catch (e) {
      cleanupMedia();
      const msg = e.name === 'NotAllowedError' ? 'Microphone permission was denied.' : e.message;
      updateCall({ ...callRef.current, status: 'ended', endMessage: msg });
      setTimeout(() => updateCall(null), 2500);
    }
  };

  const acceptCall = async () => {
    const c = callRef.current;
    if (!c || c.status !== 'incoming') return;
    ringerRef.current.stop();
    updateCall({ ...c, status: 'connecting' });
    try {
      const stream = await getMic();
      localStreamRef.current = stream;
      const pc = createPeer(c.peer._id, c.id);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      await pc.setRemoteDescription(pendingOfferRef.current);
      await flushIce();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.emit('call:accept', { to: c.peer._id, callId: c.id, answer });
      updateCall({ ...callRef.current, status: 'active', startedAt: Date.now() });
    } catch (e) {
      socketRef.current?.emit('call:reject', { to: c.peer._id, callId: c.id });
      cleanupMedia();
      updateCall({ ...c, status: 'ended', endMessage: e.name === 'NotAllowedError' ? 'Microphone permission was denied.' : e.message });
      setTimeout(() => updateCall(null), 2500);
    }
  };

  const declineCall = () => {
    const c = callRef.current;
    if (!c) return;
    socketRef.current?.emit('call:reject', { to: c.peer._id, callId: c.id });
    cleanupMedia();
    updateCall(null);
  };

  const hangUp = () => finishCall();

  const toggleMute = () => {
    const c = callRef.current;
    if (!c) return;
    const muted = !c.muted;
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !muted; });
    updateCall({ ...c, muted });
  };

  /** Step 2b: hand off to the device dialer (phone, FaceTime, Skype…). */
  const logPhoneCall = (conversation) => {
    setCallPrompt(null);
    socketRef.current?.emit('chat:send', { conversationId: conversation._id, text: '📱 Phone call started from Pack&Go', kind: 'call' });
  };

  const unreadTotal = useMemo(() => conversations.reduce((n, c) => n + (c.unread || 0), 0), [conversations]);

  // Show unread count in the tab title, like real messaging apps.
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, '');
    document.title = unreadTotal ? `(${unreadTotal}) ${base}` : base;
  }, [unreadTotal]);

  const value = {
    myId,
    connected,
    conversations,
    messages,
    typing,
    unreadTotal,
    isChatOpen,
    setIsChatOpen,
    activeConversationId,
    selectConversation,
    openChat,
    openInbox,
    sendMessage,
    sendTyping,
    callPrompt,
    setCallPrompt,
    requestCall,
    startInAppCall,
    logPhoneCall,
    call,
    acceptCall,
    declineCall,
    hangUp,
    toggleMute
  };

  return (
    <CommsContext.Provider value={value}>
      {children}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
    </CommsContext.Provider>
  );
};

export const useComms = () => {
  const ctx = useContext(CommsContext);
  if (!ctx) throw new Error('useComms must be used inside <CommsProvider>');
  return ctx;
};
