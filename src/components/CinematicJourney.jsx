// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import '../styles/scene.css';
import '../styles/journey.css';
import { Home, Package, Truck, Users, MapPinned, Sparkles, Pause, Play, ArrowRight } from 'lucide-react';

/*
 * "The Pack&Go Experience" — a cinematic miniature relocation world.
 * One SVG world (1600×760) animated with native SVG animation on a shared 24s timeline.
 * The "camera" is an animated viewBox that zooms into the pickup, follows the van through
 * the city and reveals the finished home. Pauses off-screen; viewers can pause it any time.
 */

const DUR = 24;
const D = `${DUR}s`;
const EASE = '0.45 0 0.55 1';

const STAGES = [
  { label: 'Pickup', icon: Home, at: 0 },
  { label: 'Packing', icon: Package, at: 0.16 },
  { label: 'In Transit', icon: Truck, at: 0.38 },
  { label: 'Shared Stop', icon: Users, at: 0.48 },
  { label: 'Delivery', icon: MapPinned, at: 0.7 },
  { label: 'Settled', icon: Sparkles, at: 0.86 }
];

// ---- Road geometry (shared by road, van motion and route line) ----
const PICKUP_X = 420;
const DEST_X = 1300;
const C1 = [[PICKUP_X, 640], [560, 640], [600, 520], [760, 520]];
const C2 = [[760, 520], [920, 520], [940, 600], [1080, 580]];
const C3 = [[1080, 580], [1200, 562], [1200, 500], [DEST_X, 500]];
const CURVES = 'C560 640 600 520 760 520C920 520 940 600 1080 580C1200 562 1200 500 1300 500';
const VAN_PATH = `M-100 640H${PICKUP_X}${CURVES}H1720`;
const ROAD_PATH = `M-300 640H${PICKUP_X}${CURVES}H1900`;
const ROUTE_PATH = `M${PICKUP_X} 640${CURVES}`;

const cubicLen = ([p0, p1, p2, p3]) => {
  let len = 0;
  let prev = p0;
  for (let i = 1; i <= 80; i += 1) {
    const t = i / 80;
    const mt = 1 - t;
    const x = mt ** 3 * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t ** 3 * p3[0];
    const y = mt ** 3 * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t ** 3 * p3[1];
    len += Math.hypot(x - prev[0], y - prev[1]);
    prev = [x, y];
  }
  return len;
};
const L_IN = PICKUP_X + 100;
const L_CURVES = cubicLen(C1) + cubicLen(C2) + cubicLen(C3);
const L_TOTAL = L_IN + L_CURVES + (1720 - DEST_X);
const KP_PICKUP = (L_IN / L_TOTAL).toFixed(4);
const KP_DEST = ((L_IN + L_CURVES) / L_TOTAL).toFixed(4);
// Shared (pooled) pickup stop in the city, where the first road curve ends
const STOP = C1[3];
const KP_STOP = ((L_IN + cubicLen(C1)) / L_TOTAL).toFixed(4);
const ROUTE_AT_STOP = (1 - cubicLen(C1) / L_CURVES).toFixed(4);

// Van: drive in · load (half full) · drive · shared stop (load more) · drive · unload own boxes · leave
const VAN_TIMES = '0;0.08;0.16;0.38;0.48;0.58;0.70;0.88;0.96;1';
const VAN_SPLINES = `0 0 1 1;0.2 0.1 0.3 1;0 0 1 1;${EASE};0 0 1 1;${EASE};0 0 1 1;0.5 0 0.9 0.6;0 0 1 1`;

// Camera keyframes (x y w h) for wide (2:1) and narrow (square) screens
const CAM_TIMES = '0;0.10;0.16;0.38;0.47;0.57;0.64;0.70;0.84;0.90;0.97;1';
const CAM_WIDE = [
  '40 0 1520 760', '60 290 760 380', '100 300 720 360', '120 300 720 360', '400 290 720 360', '430 290 720 360',
  '760 280 760 380', '920 250 720 360', '980 250 640 320', '860 150 760 380', '40 0 1520 760', '40 0 1520 760'
].join(';');
const CAM_NARROW = [
  '420 0 760 760', '150 330 420 420', '170 340 400 400', '180 340 400 400', '560 320 400 400', '580 320 400 400',
  '870 290 460 460', '1080 260 440 440', '1120 280 400 400', '1040 120 560 560', '420 0 760 760', '420 0 760 760'
].join(';');

// Two movers at the pickup and destination (three round trips each)
const trips = (starts, go, back) => {
  const times = ['0'];
  const pos = ['0 0'];
  starts.forEach((s) => {
    times.push(s, (s + go).toFixed(3), (s + go + back).toFixed(3));
    pos.push('0 0', 'D', '0 0');
  });
  times.push('1');
  pos.push('0 0');
  return { times: times.join(';'), pos };
};
const carry = (starts, go) => ({
  values: ['0', ...starts.flatMap(() => ['1', '0'])].join(';'),
  keyTimes: ['0', ...starts.flatMap((s) => [s, (s + go).toFixed(3)])].join(';')
});

const PICKUP_TRIPS = [[0.17, 0.24, 0.31], [0.19, 0.255, 0.32]];
const DEST_TRIPS = [[0.72, 0.76, 0.8], [0.74, 0.78, 0.82]];
const STACK_GONE = [0.17, 0.19, 0.24, 0.255, 0.31, 0.32];
// Shared stop: two movers carry the second customer's 4 boxes into the van
const POOL_TRIPS = [[0.492, 0.522], [0.507, 0.537]];
const POOL_GO = 0.012;
const POOL_GONE = [0.492, 0.507, 0.522, 0.537];

// Van cargo, shown as mini boxes through the window (12 slots: 6 own on the left, 6 shared on the right)
const OWN_LOAD = [0.195, 0.215, 0.265, 0.28, 0.335, 0.345];
const OWN_UNLOAD = [0.82, 0.8, 0.78, 0.76, 0.74, 0.72];
const POOL_LOAD = POOL_GONE.map((s) => +(s + POOL_GO).toFixed(3));
const slot = (i, x0) => [x0 + (i % 3) * 8.5, i < 3 ? -46 : -55];
const OWN_SLOTS = Array.from({ length: 6 }, (_, i) => slot(i, -48));
const POOL_SLOTS = Array.from({ length: 4 }, (_, i) => slot(i, -22));
// Load badge above the van: half load → shared load → onward after delivery
const LOAD_BADGES = [
  { text: 'Half load · 6 boxes', from: 0.345, to: POOL_LOAD[3] },
  { text: 'Shared load · 10 boxes', from: POOL_LOAD[3], to: 0.82 },
  { text: '4 boxes · next drop', from: 0.82, to: 0.95 }
];

// City skyline (x, base, width, height, depth)
const BUILDINGS = [
  [540, 470, 60, 120, 24, true], [610, 476, 50, 170, 22], [670, 472, 70, 95, 26], [760, 468, 56, 210, 24],
  [830, 474, 64, 140, 24], [905, 470, 52, 180, 22], [968, 476, 70, 110, 26, true], [1050, 466, 56, 150, 22],
  [1118, 470, 48, 90, 20, true]
];
const TREES = [
  [520, 700, 1.3], [700, 690, 1.1, true], [980, 690, 1.25], [1180, 650, 1, true], [1250, 440, 0.9],
  [480, 480, 1], [130, 560, 1.2], [1590, 462, 1.1], [860, 690, 0.9, true], [1360, 640, 1.2]
];

const Worker = ({ x, y, tripTimes, carryAnim, dx, show }) => (
  <g transform={`translate(${x} ${y})`}>
    <g opacity="0">
      <animate attributeName="opacity" {...show} dur={D} repeatCount="indefinite" />
      <g>
        <animateTransform attributeName="transform" type="translate" calcMode="spline"
          values={tripTimes.pos.map((p) => (p === 'D' ? `${dx} 0` : p)).join(';')}
          keyTimes={tripTimes.times} keySplines={Array(tripTimes.pos.length - 1).fill(EASE).join(';')}
          dur={D} repeatCount="indefinite" />
        <ellipse cx="0" cy="1" rx="8" ry="2.5" className="hs-shadow" />
        <rect x="-4" y="-8" width="3" height="8" rx="1.5" className="cj-leg" />
        <rect x="1" y="-8" width="3" height="8" rx="1.5" className="cj-leg" />
        <rect x="-5.5" y="-22" width="11" height="15" rx="5" className="cj-worker" />
        <circle cx="0" cy="-27" r="5" className="cj-skin" />
        <rect x="-5.5" y="-32" width="11" height="4" rx="2" className="cj-cap" />
        <g opacity="0">
          <rect x="-8" y="-46" width="16" height="13" rx="1.5" className="hs-box-front" />
          <rect x="-1.2" y="-46" width="2.4" height="13" className="hs-tape" />
          <animate attributeName="opacity" calcMode="discrete" {...carryAnim} dur={D} repeatCount="indefinite" />
        </g>
      </g>
    </g>
  </g>
);

export const CinematicJourney = ({ onNavigate }) => {
  const sectionRef = useRef(null);
  const svgRef = useRef(null);
  const [stage, setStage] = useState(0);
  // Start paused for people who ask their device for reduced motion; they can press play.
  const [userPaused, setUserPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 640px)').matches);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const onChange = (e) => setNarrow(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    const section = sectionRef.current;
    if (!svg || !section || typeof svg.pauseAnimations !== 'function') return undefined;
    let visible = false;

    const sync = () => {
      const t = (svg.getCurrentTime() % DUR) / DUR;
      section.style.setProperty('--cj-p', t.toFixed(4));
      let idx = 0;
      STAGES.forEach((s, i) => { if (t >= s.at) idx = i; });
      setStage((prev) => (prev === idx ? prev : idx));
    };
    const apply = () => {
      if (visible && !document.hidden && !userPaused) svg.unpauseAnimations();
      else svg.pauseAnimations();
      sync();
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) section.classList.add('is-revealed');
      apply();
    }, { threshold: 0.15 });
    io.observe(section);
    document.addEventListener('visibilitychange', apply);
    const timer = window.setInterval(() => { if (!svg.animationsPaused()) sync(); }, 200);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', apply);
      window.clearInterval(timer);
    };
  }, [userPaused]);

  const pickupWorkers = useMemo(() => PICKUP_TRIPS.map((s) => ({ t: trips(s, 0.025, 0.025), c: carry(s, 0.025) })), []);
  const destWorkers = useMemo(() => DEST_TRIPS.map((s) => ({ t: trips(s, 0.018, 0.018), c: carry(s, 0.018) })), []);
  const poolWorkers = useMemo(() => POOL_TRIPS.map((s) => ({ t: trips(s, POOL_GO, POOL_GO), c: carry(s, POOL_GO) })), []);

  return (
    <section className="cj" ref={sectionRef} aria-labelledby="cj-title">
      <div className="cj-head">
        <span className="cj-eyebrow">The Pack&amp;Go Experience</span>
        <h2 id="cj-title" className="cj-title">From Here to Home. <span className="gradient-text">We Move With You.</span></h2>
        <p className="cj-text">Every box has a story. Every journey has a destination. Let Pack&amp;Go make yours effortless.</p>
      </div>

      <div className="cj-stage" data-scroll-progress>
        <svg ref={svgRef} className="cj-svg" viewBox={narrow ? '420 0 760 760' : '40 0 1520 760'} preserveAspectRatio="xMidYMid slice"
          role="img" aria-labelledby="cj-svg-title cj-svg-desc">
          <title id="cj-svg-title">The Pack&amp;Go relocation journey</title>
          <desc id="cj-svg-desc">Movers load the Pack&amp;Go van half full at the first house, stop in the city to pick up a second customer's boxes on a shared route, then unload the first customer's boxes at their new home and drive on with the rest.</desc>

          <animate key={narrow ? 'n' : 'w'} attributeName="viewBox" values={narrow ? CAM_NARROW : CAM_WIDE} keyTimes={CAM_TIMES}
            calcMode="spline" keySplines={Array(11).fill(EASE).join(';')} dur={D} repeatCount="indefinite" />

          <defs>
            <linearGradient id="cj-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" className="cj-sky-top" />
              <stop offset="1" className="cj-sky-bottom" />
            </linearGradient>
            <linearGradient id="cj-edge" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" className="cj-edge-top" />
              <stop offset="1" className="cj-edge-bottom" />
            </linearGradient>
            <pattern id="cj-win" width="12" height="16" patternUnits="userSpaceOnUse">
              <rect x="3" y="4" width="6" height="8" rx="1" className="cj-win" />
            </pattern>
            <g id="cj-house">
              <rect x="4" y="-68" width="86" height="68" rx="3" className="hs-house" />
              <polygon points="90,-68 116,-80 116,-12 90,0" className="hs-house-side" />
              <polygon points="-4,-64 47,-104 98,-64" className="hs-roof" />
              <polygon points="47,-104 73,-116 124,-76 98,-64" className="hs-roof-side" />
              <rect x="36" y="-34" width="20" height="34" rx="3" className="hs-door" />
              <rect x="12" y="-54" width="16" height="14" rx="2" className="hs-window" />
              <rect x="66" y="-54" width="16" height="14" rx="2" className="hs-window" />
            </g>
            <g id="cj-box">
              <rect x="-11" y="-20" width="22" height="20" rx="1.5" className="hs-box-front" />
              <polygon points="-11,-20 -5,-26 17,-26 11,-20" className="hs-box-top" />
              <polygon points="11,-20 17,-26 17,-6 11,0" className="hs-box-side" />
              <rect x="-1.5" y="-20" width="3" height="20" className="hs-tape" />
            </g>
          </defs>

          {/* Sky, sun haze and drifting clouds */}
          <rect x="-400" y="-400" width="2400" height="1600" fill="url(#cj-sky)" />
          <circle cx="1240" cy="140" r="90" className="cj-sun" />
          {[[120, 60, 1.4], [700, 120, 1], [1300, 80, 1.2, true], [400, 180, 0.8, true]].map(([x, y, s, opt], i) => (
            <g key={x} className={`cj-cloud ${opt ? 'cj-opt' : ''}`}>
              <g transform={`scale(${s})`}>
                <ellipse cx="0" cy="0" rx="34" ry="16" />
                <ellipse cx="28" cy="-12" rx="26" ry="20" />
                <ellipse cx="56" cy="0" rx="26" ry="15" />
              </g>
              <animateTransform attributeName="transform" type="translate" values={`${x - 200} ${y};${x + 260} ${y};${x - 200} ${y}`}
                dur={`${60 + i * 14}s`} repeatCount="indefinite" />
            </g>
          ))}

          {/* Miniature world platform */}
          <path d="M-300 470Q400 410 800 450T1900 420V700H-300Z" className="cj-ground" />
          <path d="M-300 700H1900V790H-300Z" fill="url(#cj-edge)" />
          <path d="M-300 700H1900" className="cj-edge-line" />

          {/* City skyline */}
          {BUILDINGS.map(([x, base, w, h, d, opt]) => (
            <g key={x} className={opt ? 'cj-opt' : undefined}>
              <polygon points={`${x + w},${base - h} ${x + w + d},${base - h - d / 2} ${x + w + d},${base - d / 2} ${x + w},${base}`} className="cj-bld-side" />
              <polygon points={`${x},${base - h} ${x + d},${base - h - d / 2} ${x + w + d},${base - h - d / 2} ${x + w},${base - h}`} className="cj-bld-top" />
              <rect x={x} y={base - h} width={w} height={h} className="cj-bld" />
              <rect x={x + 4} y={base - h + 8} width={w - 8} height={h - 20} fill="url(#cj-win)" />
            </g>
          ))}

          {/* Road */}
          <path d={ROAD_PATH} className="cj-road-edge" />
          <path d={ROAD_PATH} className="cj-road" />
          <path d={ROAD_PATH} className="cj-road-line" />
          <path d={ROUTE_PATH} className="hs-route-plan" />
          <path d={ROUTE_PATH} pathLength="1" className="cj-route" strokeDasharray="1 1" strokeDashoffset="1">
            <animate attributeName="stroke-dashoffset" values={`1;1;${ROUTE_AT_STOP};${ROUTE_AT_STOP};0;0;1`} keyTimes="0;0.38;0.48;0.58;0.70;0.97;1"
              calcMode="spline" keySplines={`0 0 1 1;${EASE};0 0 1 1;${EASE};0 0 1 1;0 0 1 1`} dur={D} repeatCount="indefinite" />
          </path>

          {/* Trees */}
          {TREES.map(([x, y, s, opt]) => (
            <g key={`${x}-${y}`} transform={`translate(${x} ${y}) scale(${s})`} className={opt ? 'cj-opt' : undefined}>
              <ellipse cx="0" cy="2" rx="14" ry="4" className="hs-shadow" />
              <rect x="-2.5" y="-16" width="5" height="17" rx="2.5" className="hs-trunk" />
              <circle cx="0" cy="-28" r="16" className="hs-tree" />
              <circle cx="-6" cy="-33" r="7" className="hs-tree-light" />
            </g>
          ))}

          {/* Pickup house + packing stack */}
          <use href="#cj-house" transform="translate(150 612) scale(1.5)" />
          {[[244, 620], [268, 620], [292, 620], [256, 600], [280, 600], [268, 580]].map(([x, y], i) => {
            const appear = (0.03 + i * 0.012).toFixed(3);
            const gone = STACK_GONE[5 - i];
            return (
              <g key={`stack-${i}`} transform={`translate(${x} ${y})`} opacity="0">
                <use href="#cj-box" />
                <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes={`0;${appear};${(+appear + 0.01).toFixed(3)};${gone};${gone + 0.005};1`}
                  dur={D} repeatCount="indefinite" />
              </g>
            );
          })}

          {/* Shared pickup: a second customer's boxes waiting at the roadside */}
          <g transform={`translate(${STOP[0] + 132} ${STOP[1] + 26})`}>
            <g opacity="0">
              <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.38;0.41;0.58;0.61;1" dur={D} repeatCount="indefinite" />
              <ellipse cx="0" cy="1" rx="9" ry="2.5" className="hs-shadow" />
              <rect x="-4" y="-9" width="3" height="9" rx="1.5" className="cj-leg" />
              <rect x="1" y="-9" width="3" height="9" rx="1.5" className="cj-leg" />
              <rect x="-6" y="-24" width="12" height="16" rx="5" className="cj-customer" />
              <circle cx="0" cy="-29" r="5.5" className="cj-skin" />
              <path d="M-5.5 -31a5.5 5.5 0 0 1 11 0z" className="cj-hair" />
            </g>
          </g>
          {[[STOP[0] + 82, STOP[1] + 48], [STOP[0] + 106, STOP[1] + 48], [STOP[0] + 94, STOP[1] + 28], [STOP[0] + 118, STOP[1] + 48]].map(([x, y], i) => {
            const gone = POOL_GONE[[2, 1, 0, 3][i]];
            return (
              <g key={`pool-${i}`} transform={`translate(${x} ${y}) scale(0.9)`} opacity="0">
                <use href="#cj-box" />
                <rect x="-7" y="-16" width="8" height="6" rx="1" className="cj-pool-tag" />
                <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes={`0;0.39;0.41;${gone};${(gone + 0.005).toFixed(3)};1`}
                  dur={D} repeatCount="indefinite" />
              </g>
            );
          })}
          <g transform={`translate(${STOP[0] + 100} ${STOP[1] - 6})`}>
            <g opacity="0">
              <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.40;0.43;0.58;0.61;1" dur={D} repeatCount="indefinite" />
              <path d="M0 0C-12-15-16-23-16-32a16 16 0 1 1 32 0c0 9-4 17-16 32Z" className="cj-pin-pool" />
              <circle cx="0" cy="-32" r="6" className="hs-pin-dot" />
              <text x="0" y="-58" textAnchor="middle" className="cj-label">Shared pickup</text>
              <animateTransform attributeName="transform" type="translate" values="0 0;0 -6;0 0" dur="2.8s" repeatCount="indefinite" />
            </g>
          </g>

          {/* Location pins */}
          <g transform="translate(240 400)">
            <g opacity="0">
              <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.03;0.06;0.96;1" dur={D} repeatCount="indefinite" />
              <path d="M0 0C-12-15-16-23-16-32a16 16 0 1 1 32 0c0 9-4 17-16 32Z" className="hs-pin" />
              <circle cx="0" cy="-32" r="6" className="hs-pin-dot" />
              <text x="0" y="-58" textAnchor="middle" className="cj-label">Pickup</text>
              <animateTransform attributeName="transform" type="translate" values="0 0;0 -6;0 0" dur="2.8s" repeatCount="indefinite" />
            </g>
          </g>
          <g transform="translate(1458 296)" className="hs-pin-drop">
            <g opacity="0">
              <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.38;0.41;0.86;0.88;1" dur={D} repeatCount="indefinite" />
              <path d="M0 0C-12-15-16-23-16-32a16 16 0 1 1 32 0c0 9-4 17-16 32Z" className="hs-pin" />
              <circle cx="0" cy="-32" r="6" className="hs-pin-dot" />
              <text x="0" y="-58" textAnchor="middle" className="cj-label">New home</text>
              <animateTransform attributeName="transform" type="translate" values="0 0;0 -6;0 0" dur="2.8s" repeatCount="indefinite" />
            </g>
          </g>

          {/* Destination: modern home with interior that comes alive */}
          <g transform="translate(1372 474)">
            <ellipse cx="90" cy="4" rx="110" ry="10" className="hs-shadow" />
            <polygon points="150,-120 186,-138 186,-18 150,0" className="hs-house-side" />
            <rect x="0" y="-120" width="150" height="120" rx="3" className="hs-house" />
            <polygon points="0,-120 36,-138 186,-138 150,-120" className="cj-roof-top" />
            <rect x="-8" y="-128" width="166" height="9" rx="3" className="hs-roof" />
            <rect x="14" y="-100" width="72" height="56" rx="4" className="hs-window" />
            <rect x="100" y="-106" width="38" height="30" rx="3" className="hs-window" />
            <rect x="102" y="-62" width="30" height="62" rx="3" className="hs-door" />
            {/* Lights on */}
            {[[14, -100, 72, 56], [100, -106, 38, 30]].map(([x, y, w, h]) => (
              <rect key={x} x={x} y={y} width={w} height={h} rx="4" className="cj-light" opacity="0">
                <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.85;0.88;0.97;1" dur={D} repeatCount="indefinite" />
              </rect>
            ))}
            {/* Furniture arranged inside */}
            <g opacity="0">
              <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.83;0.86;0.97;1" dur={D} repeatCount="indefinite" />
              <rect x="22" y="-62" width="38" height="12" rx="4" className="hs-chair" />
              <rect x="22" y="-72" width="38" height="10" rx="4" className="hs-chair-dark" />
              <rect x="69" y="-90" width="2" height="40" className="hs-chair-leg" />
              <path d="M62 -90h16l-3 -9h-10z" className="cj-lamp" />
              <circle cx="70" cy="-86" r="14" className="cj-lamp-glow" />
            </g>
            {/* Garden */}
            {[[-12, 0, 10], [8, 2, 8], [168, 0, 10], [190, -4, 8]].map(([x, y, r]) => (
              <circle key={x} cx={x} cy={y - r} r={r} className="hs-tree" />
            ))}
          </g>

          {/* Boxes delivered to the new home */}
          {[[1360, 490, 0.74], [1384, 492, 0.78], [1372, 472, 0.82]].map(([x, y, t]) => (
            <g key={`yard-${x}-${y}`} transform={`translate(${x} ${y}) scale(0.9)`} opacity="0">
              <use href="#cj-box" />
              <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes={`0;${t};${t + 0.005};0.86;0.875;1`} dur={D} repeatCount="indefinite" />
            </g>
          ))}

          {/* Movers */}
          {pickupWorkers.map((w, i) => (
            <Worker key={`pw${i}`} x={300} y={626 + i * 8} dx={62} tripTimes={w.t} carryAnim={w.c}
              show={{ values: '0;0;1;1;0;0', keyTimes: '0;0.12;0.14;0.37;0.39;1' }} />
          ))}
          {destWorkers.map((w, i) => (
            <Worker key={`dw${i}`} x={1338} y={500 + i * 6} dx={34} tripTimes={w.t} carryAnim={w.c}
              show={{ values: '0;0;1;1;0;0', keyTimes: '0;0.70;0.72;0.84;0.86;1' }} />
          ))}
          {poolWorkers.map((w, i) => (
            <Worker key={`ow${i}`} x={STOP[0] + 74 + i * 8} y={STOP[1] + 44 + i * 4} dx={-62} tripTimes={w.t} carryAnim={w.c}
              show={{ values: '0;0;1;1;0;0', keyTimes: '0;0.48;0.49;0.565;0.575;1' }} />
          ))}

          {/* The Pack&Go van */}
          <g>
            <animateMotion path={VAN_PATH} keyPoints={`0;0;${KP_PICKUP};${KP_PICKUP};${KP_STOP};${KP_STOP};${KP_DEST};${KP_DEST};1;1`}
              keyTimes={VAN_TIMES} calcMode="spline" keySplines={VAN_SPLINES} dur={D} repeatCount="indefinite" />
            <g>
              <animateTransform attributeName="transform" type="scale" values="1.25;1.25;1.25;1.25;1.15;1.15;1.1;1.1;1.1;1.25" keyTimes={VAN_TIMES}
                calcMode="spline" keySplines={VAN_SPLINES} dur={D} repeatCount="indefinite" />
              <ellipse cx="0" cy="3" rx="64" ry="8" className="hs-shadow" />
              <polygon points="-58,-64 -48,-72 22,-72 12,-64" className="hs-van-top" />
              <rect x="-58" y="-64" width="70" height="52" rx="7" className="hs-van-cargo" />
              <rect x="-50" y="-57" width="54" height="22" rx="4" className="hs-van-window" />
              {/* Cargo seen through the window: 6 own boxes (half load), then 4 shared boxes */}
              {OWN_SLOTS.map(([x, y], i) => (
                <rect key={`own-${i}`} x={x} y={y} width="7" height="8" rx="1" className="cj-mini-own" opacity="0">
                  <animate attributeName="opacity" calcMode="discrete" values="0;1;0" keyTimes={`0;${OWN_LOAD[i]};${OWN_UNLOAD[i]}`} dur={D} repeatCount="indefinite" />
                </rect>
              ))}
              {POOL_SLOTS.map(([x, y], i) => (
                <rect key={`pool-${i}`} x={x} y={y} width="7" height="8" rx="1" className="cj-mini-pool" opacity="0">
                  <animate attributeName="opacity" calcMode="discrete" values="0;1;0" keyTimes={`0;${POOL_LOAD[i]};0.96`} dur={D} repeatCount="indefinite" />
                </rect>
              ))}
              {/* Load badge */}
              {LOAD_BADGES.map((b) => (
                <g key={b.text} opacity="0">
                  <animate attributeName="opacity" calcMode="discrete" values="0;1;0" keyTimes={`0;${b.from};${b.to}`} dur={D} repeatCount="indefinite" />
                  <rect x="-88" y="-104" width="130" height="22" rx="11" className="cj-load-badge" />
                  <text x="-23" y="-89" textAnchor="middle" className="cj-load-text">{b.text}</text>
                </g>
              ))}
              <rect x="-58" y="-31" width="70" height="6" className="hs-van-stripe" />
              <text x="-23" y="-15" textAnchor="middle" className="hs-van-logo">Pack&amp;Go</text>
              <path d="M12-50H36Q44-50 48-42L56-28Q58-25 58-21V-16Q58-12 54-12H12Z" className="hs-van-cab" />
              <path d="M18-45H34Q39-45 42-40L49-29H18Z" className="hs-van-glass" />
              <rect x="52" y="-22" width="6" height="4" rx="2" className="hs-light" />
              <rect x="-61" y="-14" width="121" height="5" rx="2.5" className="hs-bumper" />
              {[-34, 34].map((wx) => (
                <g key={wx} transform={`translate(${wx} -10)`}>
                  <circle r="11" className="hs-tire" />
                  <g>
                    <circle r="5" className="hs-hub" />
                    <path d="M-7 0H7M0-7V7" className="hs-spoke" />
                    <animateTransform attributeName="transform" type="rotate" values="0;700;700;700;1300;1300;2300;2300;3000;3000"
                      keyTimes={VAN_TIMES} calcMode="spline" keySplines={VAN_SPLINES} dur={D} repeatCount="indefinite" />
                  </g>
                </g>
              ))}
            </g>
          </g>

          {/* Evening light as the home comes alive */}
          <rect x="-400" y="-400" width="2400" height="1600" className="cj-dusk" opacity="0" pointerEvents="none">
            <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.84;0.89;0.95;1" dur={D} repeatCount="indefinite" />
          </rect>

          {/* Delivered badge + final message */}
          <g transform="translate(1455 300)">
            <circle r="22" className="hs-ring" opacity="0">
              <animate attributeName="r" values="22;22;48;48" keyTimes="0;0.87;0.93;1" dur={D} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0;0.6;0;0" keyTimes="0;0.87;0.88;0.93;1" dur={D} repeatCount="indefinite" />
            </circle>
            <g>
              <animateTransform attributeName="transform" type="scale" values="0;0;1.2;1;1;0;0" keyTimes="0;0.87;0.9;0.92;0.96;0.98;1" dur={D} repeatCount="indefinite" />
              <circle r="22" className="hs-success" />
              <path d="M-10 0l6.5 6.5L10-7" className="hs-check" />
            </g>
          </g>
          <g transform="translate(1030 196)" opacity="0">
            <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.88;0.9;0.96;0.98;1" dur={D} repeatCount="indefinite" />
            <rect width="300" height="84" rx="18" className="hs-card" />
            <circle cx="42" cy="42" r="20" className="hs-card-icon" />
            <path d="M33 42l6 6 12-13" className="cj-card-check" />
            <text x="76" y="38" className="cj-card-title">Welcome home!</text>
            <text x="76" y="60" className="cj-card-sub">Delivered with care by Pack&amp;Go</text>
          </g>
        </svg>

        <button type="button" className="cj-toggle" onClick={() => setUserPaused((p) => !p)}
          aria-label={userPaused ? 'Play animation' : 'Pause animation'}>
          {userPaused ? <Play size={16} /> : <Pause size={16} />}
        </button>
      </div>

      <ol className="cj-progress" aria-label="Journey progress">
        <li className="cj-progress-line" aria-hidden="true"><span /></li>
        {STAGES.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.label} className={`cj-step ${i === stage ? 'active' : ''} ${i < stage ? 'done' : ''}`} aria-current={i === stage ? 'step' : undefined}>
              <span className="cj-step-icon"><Icon size={18} /></span>
              <span className="cj-step-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="cj-step-label">{s.label}</span>
            </li>
          );
        })}
      </ol>

      <div className="cj-cta">
        <button type="button" className="btn btn-primary btn-lg" data-magnetic onClick={() => onNavigate?.('estimator')}>
          Start My Move <ArrowRight size={16} />
        </button>
        <button type="button" className="btn btn-secondary btn-lg" data-magnetic onClick={() => onNavigate?.('tracking')}>
          See Live Tracking
        </button>
      </div>
    </section>
  );
};
