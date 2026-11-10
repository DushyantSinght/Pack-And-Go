// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, CalendarPlus, PackageCheck, Sparkles, QrCode, Truck, Repeat, Home, ShieldCheck, GraduationCap,
  MessageSquare, Bell, FileText, Lock, HelpCircle, Moon, LogIn, UserPlus, LogOut, CornerDownLeft, Bot, ListChecks
} from 'lucide-react';
import { useMove } from '../context/MoveContext';
import { useComms } from '../context/CommsContext';

const scrollToId = (id) => {
  const el = document.getElementById(id);
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
};

/** Simple fuzzy score: all query characters appear in order; earlier & contiguous matches score higher. */
const score = (text, q) => {
  if (!q) return 1;
  const t = text.toLowerCase();
  if (t.includes(q)) return 100 - t.indexOf(q);
  let ti = 0, s = 0;
  for (const ch of q) {
    const i = t.indexOf(ch, ti);
    if (i === -1) return 0;
    s += i === ti ? 3 : 1;
    ti = i + 1;
  }
  return s;
};

export const CommandPalette = () => {
  const move = useMove();
  const comms = useComms();
  const { user } = move;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const input = useRef(null);
  const list = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement?.tagName)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('packandgo:palette', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('packandgo:palette', onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQ('');
      setSel(0);
      setTimeout(() => input.current?.focus(), 30);
    }
  }, [open]);

  const goTab = (tab) => {
    move.setActiveTab(tab);
    setTimeout(() => document.querySelector('.nav-tabs-wrapper')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  const commands = useMemo(() => {
    const c = [
      { group: 'Actions', label: 'Book a move', hint: 'Addresses, slot & price', icon: CalendarPlus, run: move.openBooking, keys: 'new booking schedule' },
      ...(user ? [
        { group: 'Actions', label: 'My moves', hint: 'Status, codes, receipts', icon: PackageCheck, run: () => move.openMyMoves(), keys: 'bookings track receipt invoice cancel reschedule' },
        { group: 'Actions', label: 'Messages', hint: 'Chat with your captain or sellers', icon: MessageSquare, run: comms.openInbox, keys: 'chat inbox call' },
        { group: 'Actions', label: 'Notifications', icon: Bell, run: () => document.querySelector('[aria-label="Notifications"]')?.click(), keys: 'alerts updates' }
      ] : []),
      { group: 'Actions', label: 'Ask PackBot', hint: 'AI help with your move', icon: Bot, run: () => [...document.querySelectorAll('button')].find((b) => /Ask PackBot/i.test(b.innerText))?.click(), keys: 'help support ai assistant' },

      { group: 'Go to', label: 'AI estimate', icon: Sparkles, run: () => goTab('estimator'), keys: 'scan photo voice items price' },
      { group: 'Go to', label: 'Box passports', icon: QrCode, run: () => goTab('passport'), keys: 'qr labels boxes print' },
      { group: 'Go to', label: 'Live tracking', icon: Truck, run: () => goTab('tracking'), keys: 'map gps truck where' },
      { group: 'Go to', label: 'Resale marketplace', icon: Repeat, run: () => goTab('marketplace'), keys: 'sell buy furniture buyback' },
      { group: 'Go to', label: 'Room setup', icon: Home, run: () => goTab('themes'), keys: 'theme essentials' },
      { group: 'Go to', label: 'After the move', icon: ShieldCheck, run: () => goTab('postmove'), keys: 'pg cook cleaning storage veg jain' },
      { group: 'Go to', label: 'Campus move week', icon: GraduationCap, run: () => goTab('campus'), keys: 'student college parent' },
      { group: 'Go to', label: 'How it works', icon: ListChecks, run: () => scrollToId('how'), keys: 'steps process' },
      { group: 'Go to', label: 'FAQ', icon: HelpCircle, run: () => scrollToId('faq'), keys: 'questions help' },

      { group: 'Policies', label: 'Refund & cancellation policy', icon: FileText, run: () => move.setLegalDoc('refunds'), keys: 'refund cancel money back' },
      { group: 'Policies', label: 'Terms of Service', icon: FileText, run: () => move.setLegalDoc('terms'), keys: 'legal' },
      { group: 'Policies', label: 'Privacy Policy', icon: Lock, run: () => move.setLegalDoc('privacy'), keys: 'data dpdp' },

      { group: 'Preferences', label: `Switch to ${move.themeMode === 'dark' ? 'light' : 'dark'} theme`, icon: Moon, run: move.toggleTheme, keys: 'theme dark light mode' },
      ...(user
        ? [{ group: 'Preferences', label: 'Sign out', icon: LogOut, run: move.logout, keys: 'logout' }]
        : [
            { group: 'Preferences', label: 'Sign in', icon: LogIn, run: () => move.openAuth('login'), keys: 'login account' },
            { group: 'Preferences', label: 'Create account', icon: UserPlus, run: () => move.openAuth('signup'), keys: 'register signup' }
          ])
    ];
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, move.themeMode]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    return commands
      .map((c) => ({ c, s: Math.max(score(c.label, query) * 2, score(`${c.keys} ${c.hint || ''}`, query)) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => (query ? b.s - a.s : 0))
      .map((r) => r.c);
  }, [commands, q]);

  useEffect(() => setSel(0), [q]);
  useEffect(() => {
    list.current?.querySelector(`[data-idx="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  if (!open) return null;

  const run = (cmd) => {
    setOpen(false);
    setTimeout(() => cmd?.run?.(), 60);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(results.length - 1, s + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); run(results[sel]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  let lastGroup = null;

  return (
    <div className="palette-overlay" onClick={() => setOpen(false)}>
      <div className="palette" role="dialog" aria-label="Command palette" onClick={(e) => e.stopPropagation()} onKeyDown={onKeyDown}>
        <div className="palette-input">
          <Search size={18} color="var(--primary)" />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actions, pages and policies…" aria-label="Search" />
          <kbd>Esc</kbd>
        </div>
        <div className="palette-list" ref={list}>
          {!results.length && <div className="palette-empty">No results for “{q}”. Try “refund”, “track” or “sell”.</div>}
          {results.map((cmd, i) => {
            const header = !q && cmd.group !== lastGroup ? cmd.group : null;
            lastGroup = cmd.group;
            const Icon = cmd.icon;
            return (
              <React.Fragment key={cmd.label}>
                {header && <div className="palette-group">{header}</div>}
                <button data-idx={i} className={`palette-item ${i === sel ? 'active' : ''}`} onMouseMove={() => setSel(i)} onClick={() => run(cmd)}>
                  <span className="palette-icon"><Icon size={16} /></span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="palette-label">{cmd.label}</span>
                    {cmd.hint && <span className="palette-hint">{cmd.hint}</span>}
                  </span>
                  {i === sel && <CornerDownLeft size={14} className="palette-enter" />}
                </button>
              </React.Fragment>
            );
          })}
        </div>
        <div className="palette-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>/</kbd> or <kbd>Ctrl K</kbd> anywhere</span>
        </div>
      </div>
    </div>
  );
};
