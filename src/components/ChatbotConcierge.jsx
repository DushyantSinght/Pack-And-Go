// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React, { useState, useRef, useEffect } from 'react';
import { useMove } from '../context/MoveContext';
import { api } from '../services/api';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  Truck,
  ArrowRight,
  FileText,
  CreditCard,
  Building
} from 'lucide-react';

export const ChatbotConcierge = ({ onOpenInvoice, onOpenPayment, onOpenCert }) => {
  const { setActiveTab, showToast, openMyMoves } = useMove();
  const [aiOn, setAiOn] = useState(null); // null = unknown, true = Claude, false = basic keyword mode
  useEffect(() => {
    if (aiOn !== null) return;
    api.assistantStatus().then((r) => setAiOn(!!r.configured)).catch(() => setAiOn(false));
  }, [aiOn]);
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Namaste! I am PackBot. Ask me about prices, your booking, cancellations, payments or anything about your move.',
      chips: [
        'How is my price calculated?',
        'What is the cancellation policy?',
        'Where is my booking?',
        'Find Pure Veg / Jain PGs'
      ]
    }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const botResponses = [
    {
      keywords: ['pool', 'share', 'cost', 'save', '45%', 'cheap', 'price'],
      reply: 'Your price is worked out from the volume of your items, the road distance and any stairs without a lift. Choosing a pooled truck (sharing space with other moves on your route) takes about 40% off the volume and distance charges. GST is added on top.',
      action: { label: 'Get a price', tab: 'estimator' }
    },
    {
      keywords: ['deposit', 'landlord', 'security', 'protection', 'certificate', 'deduction'],
      reply: 'Our Deposit Protection Certificate records the condition of your old home with photos at move-out, which you can show your landlord if there is a dispute about deductions.',
      action: { label: 'Open Deposit Certificate', custom: 'cert' }
    },
    {
      keywords: ['invoice', 'gst', 'corporate', 'reimbursement', 'tax', 'hsn', 'claim'],
      reply: 'Every paid booking has a downloadable receipt with the GST breakdown in My Moves. You can print it or save it as a PDF for reimbursement.',
      action: { label: 'Open My Moves', custom: 'mymoves' }
    },
    {
      keywords: ['veg', 'jain', 'food', 'mess', 'tiffin', 'pg', 'meal'],
      reply: 'We curate dedicated Pure Veg & Jain student PGs and verified dabbawalas/tiffin services in Whitefield, Koramangala, and HSR Layout with zero onion/garlic options and hot home delivery.',
      action: { label: 'Explore Post-Move Concierge', tab: 'postmove' }
    },
    {
      keywords: ['passport', 'qr', 'box', 'luggage', 'rfid', 'tag', 'tape'],
      reply: 'Each box gets a Luggage Passport with a QR code listing what is inside. Print the labels, stick them on your boxes, and your Move Captain scans them while loading.',
      action: { label: 'View Luggage Passports', tab: 'passport' }
    },
    {
      keywords: ['pay', 'payment', 'escrow', 'upi', 'razorpay'],
      reply: 'You pay online when you book. We hold the money and release your Move Captain\'s share only after you check your boxes and read out your 6-digit Delivery OTP.',
      action: { label: 'Open My Moves', custom: 'mymoves' }
    },
    {
      keywords: ['cancel', 'refund', 'reschedule'],
      reply: 'Cancel from My Moves: 100% refund 24h+ before your slot, 50% between 24h and 4h, none after that or after pickup. You can reschedule up to twice, until 4 hours before your slot.',
      action: { label: 'Open My Moves', custom: 'mymoves' }
    },
    {
      keywords: ['where', 'status', 'track', 'booking', 'driver', 'captain'],
      reply: 'Open My Moves to see your booking status, your Move Captain, and live tracking once they start driving.',
      action: { label: 'Open My Moves', custom: 'mymoves' }
    }
  ];

  const handleSend = (userText) => {
    const textToSend = userText || inputMessage;
    if (!textToSend.trim()) return;

    const newMsg = {
      id: Date.now(),
      sender: 'user',
      text: textToSend
    };

    setMessages((prev) => [...prev, newMsg]);
    if (!userText) setInputMessage('');
    setIsTyping(true);

    if (aiOn) {
      const history = [...messages, newMsg]
        .filter((m) => m.id !== 1 && m.text)
        .map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));
      api.assistantChat(history)
        .then((r) => {
          const ACTION_MAP = {
            go_estimator: { tab: 'estimator' }, go_passport: { tab: 'passport' }, go_tracking: { tab: 'tracking' },
            go_marketplace: { tab: 'marketplace' }, go_themes: { tab: 'themes' }, go_postmove: { tab: 'postmove' },
            go_campus: { tab: 'campus' }, open_my_moves: { custom: 'mymoves' }, open_payment: { custom: 'payment' }, open_invoice: { custom: 'mymoves' }
          };
          const action = ACTION_MAP[r.action] ? { ...ACTION_MAP[r.action], label: r.actionLabel || 'Open' } : undefined;
          setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'bot', text: r.reply, action }]);
        })
        .catch((e) => {
          if (/not configured/i.test(e.message)) setAiOn(false);
          setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'bot', text: `Sorry — ${e.message} You can also chat with your Move Captain from My Moves.` }]);
        })
        .finally(() => setIsTyping(false));
      return;
    }

    setTimeout(() => {
      setIsTyping(false);
      const lower = textToSend.toLowerCase();
      const matched = botResponses.find((r) => r.keywords.some((k) => lower.includes(k)));

      const botReply = matched
        ? {
            id: Date.now() + 1,
            sender: 'bot',
            text: matched.reply,
            action: matched.action
          }
        : {
            id: Date.now() + 1,
            sender: 'bot',
            text: "I'm in basic mode and didn't catch that. I can help with prices, payments, cancellations, your booking status, box passports and PGs.",
            chips: ['How is my price calculated?', 'What is the cancellation policy?', 'Where is my booking?']
          };

      setMessages((prev) => [...prev, botReply]);
    }, 800);
  };

  const handleActionClick = (action) => {
    if (action.tab) {
      setActiveTab(action.tab);

    } else if (action.custom === 'mymoves') {
      openMyMoves();
    } else if (action.custom === 'invoice' && onOpenInvoice) {
      onOpenInvoice();
    } else if (action.custom === 'payment' && onOpenPayment) {
      onOpenPayment();
    } else if (action.custom === 'cert' && onOpenCert) {
      onOpenCert();
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 190,
            background: 'linear-gradient(135deg, #D4AF37 0%, #AA7C11 100%)',
            color: '#0F172A',
            border: '2px solid rgba(255, 255, 255, 0.4)',
            borderRadius: '30px',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            boxShadow: '0 10px 30px rgba(212, 175, 55, 0.45)',
            fontWeight: 700,
            fontSize: '0.9rem',
            fontFamily: 'var(--font-sans)',
            transition: 'all 0.25s ease'
          }}
        >
          <Sparkles size={18} />
          <span>Ask PackBot AI</span>
          <span style={{
            background: '#0F172A',
            color: '#D4AF37',
            fontSize: '0.7rem',
            padding: '2px 6px',
            borderRadius: '10px',
            fontWeight: 800
          }}>
            24/7
          </span>
        </button>
      )}

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '380px',
          maxWidth: 'calc(100vw - 32px)',
          height: '520px',
          maxHeight: 'calc(100vh - 48px)',
          background: 'var(--bg-card-solid)',
          border: '1px solid var(--border-gold)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.65)',
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideUp 0.3s ease'
        }}>
          {/* Header */}
          <div style={{
            padding: '16px',
            background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#FFFFFF'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'rgba(212, 175, 55, 0.2)',
                border: '1px solid var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)'
              }}>
                <Bot size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  PackBot Concierge
                  <span className="radar-dot"></span>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                  {aiOn ? 'AI assistant • answers about your booking' : 'Basic help mode'}
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                cursor: 'pointer'
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Messages Body */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {messages.map((m) => {
              const isUser = m.sender === 'user';
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '88%',
                    alignSelf: isUser ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    background: isUser ? 'var(--primary)' : 'var(--bg-elevated)',
                    color: isUser ? '#0F172A' : 'var(--text-main)',
                    fontSize: '0.82rem',
                    lineHeight: 1.45,
                    border: isUser ? 'none' : '1px solid var(--border-subtle)',
                    fontWeight: isUser ? 600 : 400
                  }}>
                    {m.text}
                  </div>

                  {/* Interactive Action Button if present */}
                  {m.action && (
                    <button
                      onClick={() => handleActionClick(m.action)}
                      className="btn btn-sm btn-primary"
                      style={{
                        marginTop: '6px',
                        fontSize: '0.75rem',
                        padding: '6px 12px',
                        gap: '6px',
                        alignSelf: 'flex-start'
                      }}
                    >
                      {m.action.label} <ArrowRight size={12} />
                    </button>
                  )}

                  {/* Quick Chips if present */}
                  {m.chips && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {m.chips.map((chip, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(chip)}
                          style={{
                            background: 'rgba(212, 175, 55, 0.08)',
                            border: '1px solid rgba(212, 175, 55, 0.3)',
                            color: 'var(--primary)',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {isTyping && (
              <div style={{
                alignSelf: 'flex-start',
                background: 'var(--bg-elevated)',
                padding: '8px 12px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                color: 'var(--text-dim)'
              }}>
                PackBot is typing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{
              padding: '12px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-card-solid)',
              display: 'flex',
              gap: '8px'
            }}
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about pooling, deposits, GST..."
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                fontSize: '0.8rem'
              }}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="btn btn-primary btn-sm"
              style={{ padding: '0 12px' }}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
