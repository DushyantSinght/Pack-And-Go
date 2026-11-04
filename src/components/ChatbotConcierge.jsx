import React, { useState, useRef, useEffect } from 'react';
import { useMove } from '../context/MoveContext';
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
  const { setActiveTab, showToast, currentEstimate } = useMove();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Namaste! I am PackBot, your 24/7 Luxury Relocation Concierge. How may I assist your micro-relocation across Bengaluru or Delhi-NCR today?',
      chips: [
        'How does freight pooling cut cost by 45%?',
        'Landlord deposit protection guarantee?',
        'Can I get a GST invoice for company reimbursement?',
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
      reply: `Our dynamic freight pooling engine groups moves heading along identical corridors (like HSR ➔ Whitefield). Instead of paying ₹3,499 for an entire 14ft truck running half-empty, you share the cargo bay with compartmentalized dividers for just ₹${currentEstimate.pooledPrice} (saving 45%!).`,
      action: { label: 'View Shared Truck Load', tab: 'tracking' }
    },
    {
      keywords: ['deposit', 'landlord', 'security', 'protection', 'certificate', 'deduction'],
      reply: 'Pack&Go eliminates arbitrary security deposit deductions under the Model Tenancy Act! Move Captains take pre-move and post-move photos of your walls, switches, and tiles, backed by an immutable SHA-256 digital certificate.',
      action: { label: 'Open Deposit Certificate', custom: 'cert' }
    },
    {
      keywords: ['invoice', 'gst', 'corporate', 'reimbursement', 'tax', 'hsn', 'claim'],
      reply: 'Yes! Every Pack&Go booking comes with an employer-compliant GST Tax Invoice under GTA HSN/SAC 996511 (with 5% GST forward charge). It includes your corporate details and trip telemetry.',
      action: { label: 'Generate GST Invoice', custom: 'invoice' }
    },
    {
      keywords: ['veg', 'jain', 'food', 'mess', 'tiffin', 'pg', 'meal'],
      reply: 'We curate dedicated Pure Veg & Jain student PGs and verified dabbawalas/tiffin services in Whitefield, Koramangala, and HSR Layout with zero onion/garlic options and hot home delivery.',
      action: { label: 'Explore Post-Move Concierge', tab: 'postmove' }
    },
    {
      keywords: ['passport', 'qr', 'box', 'luggage', 'rfid', 'tag', 'tape'],
      reply: 'Every box receives a thermal-printed Digital Luggage Passport QR code and tamper-evident RFID tape. You can scan any box with your phone camera to see the full contents without unpacking!',
      action: { label: 'View Luggage Passports', tab: 'passport' }
    },
    {
      keywords: ['pay', 'payment', 'escrow', 'upi', 'razorpay'],
      reply: 'Pack&Go holds 100% of your booking fee in an RBI-regulated escrow account. Funds are released to Move Captain Rajesh only after you inspect your boxes and share the 6-digit delivery OTP.',
      action: { label: 'Open Escrow Payment', custom: 'payment' }
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
            text: `I've noted that! As your Pack&Go AI Concierge, I can assist you with freight pooling along active city corridors, generating GST reimbursement invoices, landlord deposit certificates, or arranging pure-veg meal plans.`,
            chips: [
              'Generate GST Tax Invoice',
              'Open 3D Pack-My-Truck Bay',
              'View Live GPS Leaflet Route'
            ]
          };

      setMessages((prev) => [...prev, botReply]);
    }, 800);
  };

  const handleActionClick = (action) => {
    if (action.tab) {
      setActiveTab(action.tab);
      showToast(`Navigated to ${action.tab.toUpperCase()}!`, 'info');
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
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-glow)',
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
                  AI Relocation Advisor • Instant Help
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
              background: 'var(--bg-surface)',
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
