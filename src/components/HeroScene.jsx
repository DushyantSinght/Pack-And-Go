// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React, { useEffect, useRef, useState } from 'react';
import '../styles/scene.css';

/*
 * Animated relocation journey: ORDER → PACK → LOAD → MOVE → DELIVER → SETTLE.
 * Pure SVG + native SVG animation (one shared 14s timeline), so it scales with the
 * layout, needs no 3D library, and pauses when scrolled off-screen.
 */

const DUR = 14; // seconds per loop
const D = `${DUR}s`;

const STAGES = [
  { key: 'order', label: 'Order', at: 0, tab: 'estimator' },
  { key: 'pack', label: 'Pack', at: 0.14, tab: 'passport' },
  { key: 'load', label: 'Load', at: 0.22, tab: 'passport' },
  { key: 'move', label: 'Move', at: 0.4, tab: 'tracking' },
  { key: 'deliver', label: 'Deliver', at: 0.72, tab: 'tracking' },
  { key: 'settle', label: 'Settle', at: 0.86, tab: 'themes' }
];

// Van timeline: drive in from the start of the road (0–.12) · stop & load at pickup (.12–.40)
// · drive to the new home (.40–.72) · unload (.72–.88) · drive off the end (.88–.97) · repeat
const VAN_TIMES = '0;0.12;0.40;0.72;0.88;0.97;1';
const VAN_SPLINES = '0.2 0.1 0.35 1;0 0 1 1;0.45 0 0.3 1;0 0 1 1;0.5 0 0.9 0.6;0 0 1 1';
// Starts and ends off-canvas so the van enters and leaves out of view
const VAN_PATH = 'M-90 352H215C325 352 320 258 432 258H680';

// Items carried: load at pickup, unload at destination
const ITEMS = [
  { sym: '#hs-box', x0: 104, load: [0.15, 0.22, 0.27], unload: [0.75, 0.79], fx: 498, fy: 246 },
  { sym: '#hs-box', x0: 124, load: [0.17, 0.27, 0.32], unload: [0.78, 0.82], fx: 520, fy: 248 },
  { sym: '#hs-chair', x0: 144, load: [0.19, 0.32, 0.37], unload: [0.81, 0.85], fx: 541, fy: 246 }
];

const CARD_TEXT = [
  { text: 'Booking confirmed', from: 0, to: 0.14 },
  { text: 'Packing & loading', from: 0.14, to: 0.4 },
  { text: 'Your move is in progress', from: 0.4, to: 0.72 },
  { text: 'Unloading at your new home', from: 0.72, to: 0.86 },
  { text: 'Delivered — welcome home!', from: 0.86, to: 1 }
];

const visibility = (from, to) =>
  from === 0
    ? { values: '1;0', keyTimes: `0;${to}` }
    : to === 1
      ? { values: '0;1', keyTimes: `0;${from}` }
      : { values: '0;1;0', keyTimes: `0;${from};${to}` };

const Wheel = ({ x }) => (
  <g transform={`translate(${x} -10)`}>
    <circle r="11" className="hs-tire" />
    <g>
      <circle r="5" className="hs-hub" />
      <path d="M-7 0H7M0-7V7" className="hs-spoke" />
      <animateTransform
        attributeName="transform" type="rotate" dur={D} repeatCount="indefinite"
        values="0;500;500;1220;1220;1760;1760" keyTimes={VAN_TIMES} calcMode="spline" keySplines={VAN_SPLINES}
      />
    </g>
  </g>
);

const Pin = ({ x, y, className, label }) => (
  <g transform={`translate(${x} ${y})`} className={className}>
    <ellipse cx="0" cy="4" rx="7" ry="2.5" className="hs-shadow" />
    <g>
      <path d="M0 0C-9-11-12-17-12-24a12 12 0 1 1 24 0c0 7-3 13-12 24Z" className="hs-pin" />
      <circle cx="0" cy="-24" r="4.5" className="hs-pin-dot" />
      {label && <text x="0" y="-44" textAnchor="middle" className="hs-pin-label">{label}</text>}
      <animateTransform attributeName="transform" type="translate" values="0 0;0 -5;0 0" dur="2.6s" repeatCount="indefinite" />
    </g>
  </g>
);

export const HeroScene = ({ onStageClick }) => {
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const svg = svgRef.current;
    const wrap = wrapRef.current;
    if (!svg || !wrap || typeof svg.pauseAnimations !== 'function') return undefined;

    let visible = true;
    // Respect the device's reduced-motion setting: show the first frame, don't animate.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const sync = () => {
      const t = (svg.getCurrentTime() % DUR) / DUR;
      let idx = 0;
      STAGES.forEach((s, i) => { if (t >= s.at) idx = i; });
      setStage((prev) => (prev === idx ? prev : idx));
    };

    const apply = () => {
      // Play while on screen (pauses when scrolled away, the tab is hidden, or reduced motion is on)
      if (visible && !document.hidden && !reduced) {
        svg.unpauseAnimations();
      } else {
        svg.pauseAnimations();
      }
      wrap.classList.toggle('is-paused', svg.animationsPaused());
      sync();
    };

    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; apply(); }, { threshold: 0.05 });
    io.observe(wrap);
    document.addEventListener('visibilitychange', apply);
    const timer = window.setInterval(() => { if (!svg.animationsPaused()) sync(); }, 250);
    const raf = window.requestAnimationFrame(apply);

    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', apply);
      window.clearInterval(timer);
      window.cancelAnimationFrame(raf);
    };
  }, []);

  // Gentle 3D tilt following the mouse (desktop pointers only)
  const frame = useRef(0);
  const onPointerMove = (e) => {
    if (e.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = wrapRef.current;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty('--ry', `${(px * 8).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${(-py * 6).toFixed(2)}deg`);
    });
  };
  const onPointerLeave = () => {
    wrapRef.current?.style.setProperty('--ry', '0deg');
    wrapRef.current?.style.setProperty('--rx', '0deg');
  };

  return (
    <div className="hero-scene" ref={wrapRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <div className="hero-scene-stage">
        <svg ref={svgRef} viewBox="0 0 600 420" className="hero-scene-svg" role="img" aria-labelledby="hs-title hs-desc">
          <title id="hs-title">Your Pack&amp;Go move, step by step</title>
          <desc id="hs-desc">A moving van arrives at your home, loads your boxes, follows a tracked route and unloads them at your new home.</desc>

          <defs>
            <linearGradient id="hs-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" className="hs-sky-top" />
              <stop offset="1" className="hs-sky-bottom" />
            </linearGradient>
            <clipPath id="hs-clip"><rect width="600" height="420" rx="26" /></clipPath>

            <g id="hs-house">
              <rect x="4" y="-68" width="86" height="68" rx="3" className="hs-house" />
              <polygon points="90,-68 116,-80 116,-12 90,0" className="hs-house-side" />
              <polygon points="-4,-64 47,-104 98,-64" className="hs-roof" />
              <polygon points="47,-104 73,-116 124,-76 98,-64" className="hs-roof-side" />
              <rect x="36" y="-34" width="20" height="34" rx="3" className="hs-door" />
              <rect x="12" y="-54" width="16" height="14" rx="2" className="hs-window" />
              <rect x="66" y="-54" width="16" height="14" rx="2" className="hs-window" />
            </g>

            <g id="hs-box">
              <ellipse cx="2" cy="1" rx="12" ry="3" className="hs-shadow" />
              <rect x="-9" y="-18" width="18" height="18" rx="1.5" className="hs-box-front" />
              <polygon points="-9,-18 -4,-23 14,-23 9,-18" className="hs-box-top" />
              <polygon points="9,-18 14,-23 14,-5 9,0" className="hs-box-side" />
              <rect x="-1.5" y="-18" width="3" height="18" className="hs-tape" />
              <polygon points="-1.5,-18 3.5,-23 6.5,-23 1.5,-18" className="hs-tape" />
            </g>

            <g id="hs-chair">
              <ellipse cx="0" cy="1" rx="13" ry="3" className="hs-shadow" />
              <rect x="-12" y="-26" width="7" height="22" rx="3" className="hs-chair-dark" />
              <rect x="-12" y="-13" width="24" height="9" rx="3" className="hs-chair" />
              <rect x="7" y="-17" width="5" height="11" rx="2.5" className="hs-chair-dark" />
              <rect x="-10" y="-4" width="3" height="4" className="hs-chair-leg" />
              <rect x="7" y="-4" width="3" height="4" className="hs-chair-leg" />
            </g>
          </defs>

          <g clipPath="url(#hs-clip)">
            {/* Sky & drifting clouds */}
            <rect width="600" height="420" fill="url(#hs-sky)" />
            {[{ y: 78, dur: 46, begin: 0, s: 1 }, { y: 128, dur: 60, begin: -30, s: 0.75 }, { y: 58, dur: 70, begin: -52, s: 0.6 }].map((c) => (
              <g key={c.y} className="hs-cloud">
                <g transform={`scale(${c.s})`}>
                  <ellipse cx="0" cy="0" rx="24" ry="12" />
                  <ellipse cx="20" cy="-8" rx="18" ry="15" />
                  <ellipse cx="40" cy="0" rx="18" ry="11" />
                </g>
                <animateTransform attributeName="transform" type="translate" values={`-90 ${c.y};690 ${c.y}`} dur={`${c.dur}s`} begin={`${c.begin}s`} repeatCount="indefinite" />
              </g>
            ))}

            {/* Layered hills for depth */}
            <path d="M0 250Q120 196 260 232T600 196V420H0Z" className="hs-hill-back" />
            <path d="M0 296Q190 262 350 282T600 262V420H0Z" className="hs-ground" />

            {/* Trees */}
            {[[262, 262, 1], [596, 214, 0.9], [366, 238, 0.75], [178, 300, 0.9]].map(([x, y, s]) => (
              <g key={`${x}`} transform={`translate(${x} ${y}) scale(${s})`}>
                <ellipse cx="0" cy="2" rx="12" ry="3" className="hs-shadow" />
                <rect x="-2" y="-14" width="4" height="15" rx="2" className="hs-trunk" />
                <circle cx="0" cy="-24" r="14" className="hs-tree" />
                <circle cx="-5" cy="-29" r="6" className="hs-tree-light" />
              </g>
            ))}

            {/* Houses: pickup (near) and destination (far) */}
            <use href="#hs-house" transform="translate(28 330)" />
            <g transform="translate(478 236) scale(0.82)">
              <use href="#hs-house" />
              {[[12, -54, 16, 14], [66, -54, 16, 14], [36, -34, 20, 34]].map(([x, y, w, h]) => (
                <rect key={`${x}${y}`} x={x} y={y} width={w} height={h} rx="2" className="hs-glow" opacity="0">
                  <animate attributeName="opacity" values="0;0;0.95;0.95;0" keyTimes="0;0.86;0.9;0.97;1" dur={D} repeatCount="indefinite" />
                </rect>
              ))}
            </g>

            {/* Road, planned route and live route progress */}
            <path d="M-90 352H215C325 352 320 258 432 258H680" className="hs-road-edge" />
            <path d="M-90 352H215C325 352 320 258 432 258H680" className="hs-road" />
            <path d="M-90 352H215C325 352 320 258 432 258H680" className="hs-road-line" />
            <path d="M215 352C325 352 320 258 432 258" className="hs-route-plan" />
            <path d="M215 352C325 352 320 258 432 258" pathLength="1" className="hs-route" strokeDasharray="1 1" strokeDashoffset="1">
              <animate attributeName="stroke-dashoffset" values="1;1;0;0;1" keyTimes="0;0.40;0.72;0.97;1" calcMode="spline"
                keySplines="0 0 1 1;0.45 0 0.3 1;0 0 1 1;0 0 1 1" dur={D} repeatCount="indefinite" />
            </path>

            {/* Location pins */}
            <Pin x={75} y={196} className="hs-pin-pickup" label="Pickup" />
            <g>
              <Pin x={516} y={128} className="hs-pin-drop" label="New home" />
              <animate attributeName="opacity" values="1;1;0;0;1" keyTimes="0;0.86;0.88;0.98;1" dur={D} repeatCount="indefinite" />
            </g>

            {/* Packing sparkles */}
            <g className="hs-sparkle" opacity="0">
              <path d="M96 296l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
              <path d="M140 300l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" />
              <animate attributeName="opacity" values="0;0;1;0.3;1;0;0" keyTimes="0;0.15;0.18;0.21;0.24;0.27;1" dur={D} repeatCount="indefinite" />
            </g>

            {/* Items being loaded at pickup */}
            {ITEMS.map((it, i) => {
              const [a, s, e] = it.load;
              return (
                <g key={`load-${i}`} opacity="0">
                  <use href={it.sym} />
                  <animateMotion path={`M${it.x0} 334Q${(it.x0 + 172) / 2} 292 172 322`} keyPoints="0;0;1;1" keyTimes={`0;${s};${e};1`}
                    calcMode="linear" dur={D} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes={`0;${a};${a + 0.02};${e - 0.01};${e};1`} dur={D} repeatCount="indefinite" />
                </g>
              );
            })}

            {/* Moving van */}
            <g>
              <animateMotion path={VAN_PATH} keyPoints="0;0.375;0.375;0.695;0.695;1;1" keyTimes={VAN_TIMES}
                calcMode="spline" keySplines={VAN_SPLINES} dur={D} repeatCount="indefinite" />
                            <g>
                <animateTransform attributeName="transform" type="scale" values="1;1;1;0.8;0.8;0.8;0.8" keyTimes={VAN_TIMES}
                  calcMode="spline" keySplines={VAN_SPLINES} dur={D} repeatCount="indefinite" />
                <ellipse cx="0" cy="3" rx="62" ry="7" className="hs-shadow" />
                <polygon points="-58,-64 -48,-72 22,-72 12,-64" className="hs-van-top" />
                <rect x="-58" y="-64" width="70" height="52" rx="7" className="hs-van-cargo" />
                <rect x="-50" y="-57" width="54" height="22" rx="4" className="hs-van-window" />
                {ITEMS.map((it, i) => (
                  <g key={`mini-${i}`} opacity="0">
                    <rect x={-46 + i * 16} y="-47" width="12" height="10" rx="1.5" className="hs-mini" />
                    <rect x={-41 + i * 16} y="-47" width="2" height="10" className="hs-tape" />
                    <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes={`0;${it.load[2]};${it.load[2] + 0.005};${it.unload[0]};${it.unload[0] + 0.005};1`}
                      dur={D} repeatCount="indefinite" />
                  </g>
                ))}
                <rect x="-58" y="-31" width="70" height="6" className="hs-van-stripe" />
                <text x="-23" y="-15" textAnchor="middle" className="hs-van-logo">Pack&amp;Go</text>
                <path d="M12-50H36Q44-50 48-42L56-28Q58-25 58-21V-16Q58-12 54-12H12Z" className="hs-van-cab" />
                <path d="M18-45H34Q39-45 42-40L49-29H18Z" className="hs-van-glass" />
                <rect x="52" y="-22" width="6" height="4" rx="2" className="hs-light" />
                <rect x="-61" y="-14" width="121" height="5" rx="2.5" className="hs-bumper" />
                <Wheel x={-34} />
                <Wheel x={34} />
              </g>
            </g>

            {/* Items being unloaded at the new home */}
            {ITEMS.map((it, i) => {
              const [s, e] = it.unload;
              return (
                <g key={`unload-${i}`} opacity="0">
                  <g transform="scale(0.82)"><use href={it.sym} /></g>
                  <animateMotion path={`M414 238Q${(414 + it.fx) / 2} 196 ${it.fx} ${it.fy}`} keyPoints="0;0;1;1" keyTimes={`0;${s};${e};1`}
                    calcMode="linear" dur={D} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes={`0;${s};${s + 0.005};0.96;0.985;1`} dur={D} repeatCount="indefinite" />
                </g>
              );
            })}

            {/* Delivered badge */}
            <g transform="translate(516 112)">
              <circle r="16" className="hs-ring" opacity="0">
                <animate attributeName="r" values="16;16;34;34" keyTimes="0;0.86;0.94;1" dur={D} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0;0;0.55;0;0" keyTimes="0;0.86;0.87;0.94;1" dur={D} repeatCount="indefinite" />
              </circle>
              <g>
                <animateTransform attributeName="transform" type="scale" values="0;0;1.18;1;1;0" keyTimes="0;0.86;0.89;0.91;0.97;1" dur={D} repeatCount="indefinite" />
                <circle r="16" className="hs-success" />
                <path d="M-7 0l4.5 4.5L7-5" className="hs-check" />
              </g>
            </g>

            {/* Tracking status card */}
            <g transform="translate(22 22)" className="hs-card-wrap">
              <rect width="228" height="72" rx="14" className="hs-card" />
              <circle cx="30" cy="36" r="16" className="hs-card-icon" />
              <g transform="translate(21 30)" className="hs-card-truck">
                <rect width="11" height="9" rx="1.5" />
                <path d="M11 3h4l3 3v3h-7z" />
                <circle cx="3.5" cy="10.5" r="2" />
                <circle cx="14" cy="10.5" r="2" />
              </g>
              {CARD_TEXT.map((c) => (
                <text key={c.text} x="56" y="30" className="hs-card-title" opacity={c.from === 0 ? 1 : 0}>
                  {c.text}
                  <animate attributeName="opacity" calcMode="discrete" {...visibility(c.from, c.to)} dur={D} repeatCount="indefinite" />
                </text>
              ))}
              <text x="56" y="46" className="hs-card-sub">Old home → New home</text>
              <rect x="56" y="54" width="156" height="5" rx="2.5" className="hs-card-track" />
              <rect x="56" y="54" width="0" height="5" rx="2.5" className="hs-card-bar">
                <animate attributeName="width" values="0;30;62;128;156;156;0" keyTimes="0;0.14;0.40;0.72;0.86;0.97;1" dur={D} repeatCount="indefinite" />
              </rect>
            </g>
          </g>
        </svg>
      </div>

      <ol className="hero-stages" aria-label="Your move, step by step">
        {STAGES.map((s, i) => (
          <li key={s.key}>
            <button
              type="button"
              className={`hero-stage ${i === stage ? 'active' : ''} ${i < stage ? 'done' : ''}`}
              aria-current={i === stage ? 'step' : undefined}
              onClick={() => onStageClick?.(s.tab)}
              title={`Go to ${s.label}`}
            >
              <span className="hero-stage-dot">{i + 1}</span>
              {s.label}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
};
