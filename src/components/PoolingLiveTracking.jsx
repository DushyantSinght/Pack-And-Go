// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import React, { useState, useEffect } from 'react';
import { useMove } from '../context/MoveContext';
import { useComms } from '../context/CommsContext';
import { ACTIVE_POOLED_CORRIDORS } from '../data/mockData';
import {
  Truck,
  Navigation,
  Percent,
  Gauge,
  Thermometer,
  ShieldCheck,
  Phone,
  MessageSquare,
  MapPin,
  Clock,
  Radio,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Layers,
  Map
} from 'lucide-react';
import { InteractiveLeafletMap } from './InteractiveLeafletMap';
import { PackMyTruckVisualizer } from './PackMyTruckVisualizer';
import { LiveMoveMap } from './LiveMoveMap';

export const PoolingLiveTracking = () => {
  const {
    corridors,
    selectedCorridorId,
    setSelectedCorridorId,
    setActiveTab,
    myMoves,
    openMyMoves,
    openBooking
  } = useMove();
  const liveMove = (myMoves || []).find((m) => ['assigned', 'in_transit'].includes(m.status));

  const { openChat, requestCall } = useComms();
  const activeCorridor = corridors.find((c) => c.id === selectedCorridorId) || corridors[0];
  const [liveSpeed, setLiveSpeed] = useState(activeCorridor.currentSpeedKmH || 32);
  const [mapMode, setMapMode] = useState('leaflet'); // leaflet | schematic

  useEffect(() => setLiveSpeed(activeCorridor.currentSpeedKmH || 0), [activeCorridor]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* The customer's own live move, when there is one */}
      {liveMove ? (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>Your move {liveMove.bookingId}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{liveMove.transitStatus}{liveMove.captain ? ` • ${liveMove.captain.name}, ${liveMove.captain.vehicleNumber || ''}` : ''}</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => openMyMoves(liveMove.bookingId)}>Codes, chat & call</button>
          </div>
          <LiveMoveMap booking={liveMove} height={300} />
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            You don't have a move on the road right now. The corridors below are <strong>examples</strong> of how pooled routes work.
          </span>
          <button className="btn btn-primary btn-sm" onClick={openBooking}>Book a move</button>
        </div>
      )}
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-emerald">
                <Truck size={12} /> B2B Freight Pooling for Household Shifts
              </span>
              <span className="badge badge-indigo">
                <TrendingUp size={12} /> Cuts Cost by {activeCorridor.discountRate}%
              </span>
            </div>
            <h2 style={{ fontSize: '1.6rem' }}>Dynamic Shared-Capacity Pooling Engine</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Why pay 100% for a truck running half-empty? Pack&Go pairs your move along shared corridors with dynamic multi-stop routing.
            </p>
          </div>

          {/* Corridor Selector */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
            {corridors.map((corridor) => (
              <button
                key={corridor.id}
                onClick={() => setSelectedCorridorId(corridor.id)}
                className="btn btn-sm"
                style={{
                  background: selectedCorridorId === corridor.id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                  color: selectedCorridorId === corridor.id ? '#FFFFFF' : 'var(--text-muted)',
                  fontSize: '0.8rem',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                {corridor.city} Corridor
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Left Truck Capacity & Telemetry / Right Live Interactive Corridor Map */}
      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Left Column: Shared Truck Capacity Gauge & Fleet Details */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Gauge size={18} color="var(--primary)" />
                3D Shared Capacity Utilization
              </span>
              <span className="badge badge-emerald">
                {Math.round(((activeCorridor.totalCapacityCuFt - activeCorridor.remainingCapacityCuFt) / activeCorridor.totalCapacityCuFt) * 100)}% Optimized
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Vehicle: <strong>{activeCorridor.vehicle}</strong> (Total: {activeCorridor.totalCapacityCuFt} cu. ft.)
            </p>
          </div>

          {/* Truck Bed Volume Representation Bar */}
          <div style={{ background: 'var(--bg-elevated)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Truck Cabin ➔ Cargo Bay</span>
              <span>Rear Shutter / Ramp</span>
            </div>

            <div style={{
              display: 'flex',
              height: '42px',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)'
            }}>
              {activeCorridor.currentLoads.map((load, idx) => (
                <div
                  key={idx}
                  style={{
                    width: `${load.percentage}%`,
                    background: load.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    position: 'relative',
                    transition: 'all 0.3s ease'
                  }}
                  title={`${load.user}: ${load.cuFt} cu.ft (${load.percentage}%)`}
                >
                  {load.percentage}%
                </div>
              ))}
              {activeCorridor.remainingCapacityCuFt > 0 && (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  color: 'var(--text-dim)',
                  borderLeft: '1px dashed rgba(255, 255, 255, 0.2)'
                }}>
                  {activeCorridor.remainingCapacityCuFt} ft³ Free
                </div>
              )}
            </div>

            {/* Legend for Shared Moves */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
              {activeCorridor.currentLoads.map((load, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: load.color }}></span>
                    <strong style={{ color: 'var(--text-main)' }}>{load.user}</strong>
                  </div>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {load.cuFt} cu. ft. • {load.from} ➔ {load.to}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Telemetry Sensor Dashboard */}
          <div className="grid-3" style={{ gap: '10px' }}>
            <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <Gauge size={13} color="var(--primary)" /> GPS Speed
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                {liveSpeed} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>km/h</span>
              </div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <Thermometer size={13} color="var(--cyan)" /> Cargo Bay
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--cyan)', marginTop: '4px' }}>
                {activeCorridor.temperatureCelsius}°C
              </div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <ShieldCheck size={13} color="var(--amber)" /> Shock Impact
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--amber)', marginTop: '4px' }}>
                0 <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>G (Smooth)</span>
              </div>
            </div>
          </div>

          {/* Driver & Move Captain Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img
                src={activeCorridor.driver.photo}
                alt={activeCorridor.driver.name}
                style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{activeCorridor.driver.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Move Captain • ⭐ {activeCorridor.driver.rating} ({activeCorridor.driver.tripsCompleted} shifts)
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => requestCall({ contextType: 'driver', refId: activeCorridor.corridorId || activeCorridor.id })}
                className="btn btn-outline-emerald btn-sm"
                title="Call Driver"
              >
                <Phone size={14} /> Call
              </button>
              <button
                onClick={() => openChat({ contextType: 'driver', refId: activeCorridor.corridorId || activeCorridor.id })}
                className="btn btn-secondary btn-sm"
                title="Message Driver"
              >
                <MessageSquare size={14} /> Chat
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Simulated Corridor Map & Multi-Stop Timeline */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Navigation size={18} color="var(--accent)" />
                Live Corridor Telemetry & Geofence
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Map Mode Switcher */}
                <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-elevated)', padding: '2px', borderRadius: '6px' }}>
                  <button
                    onClick={() => setMapMode('leaflet')}
                    style={{
                      background: mapMode === 'leaflet' ? 'var(--primary)' : 'transparent',
                      color: mapMode === 'leaflet' ? '#FFFFFF' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    OSM GPS
                  </button>
                  <button
                    onClick={() => setMapMode('schematic')}
                    style={{
                      background: mapMode === 'schematic' ? 'var(--primary)' : 'transparent',
                      color: mapMode === 'schematic' ? '#FFFFFF' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Schematic
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="radar-dot"></span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>LIVE</span>
                </div>
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {activeCorridor.name}
            </p>
          </div>

          {/* Interactive Map Render */}
          {mapMode === 'leaflet' ? (
            <InteractiveLeafletMap corridorId={selectedCorridorId} />
          ) : (
          <div style={{
            position: 'relative',
            width: '100%',
            height: '240px',
            background: '#0B1120',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'inset 0 0 40px rgba(0, 0, 0, 0.8)'
          }}>
            {/* Map Grid Pattern */}
            <svg width="100%" height="100%" style={{ opacity: 0.25 }}>
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#6366F1" strokeWidth="0.5" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Transit Route Path SVG */}
            <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
              {/* Route line */}
              <path
                d="M 40 180 Q 150 160 220 110 T 420 60"
                fill="none"
                stroke="rgba(99, 102, 241, 0.4)"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <path
                d="M 40 180 Q 150 160 220 110"
                fill="none"
                stroke="#10B981"
                strokeWidth="4"
                strokeLinecap="round"
              />

              {/* Stop 1: Koramangala */}
              <circle cx="40" cy="180" r="7" fill="#10B981" />
              <text x="40" y="205" fill="#94A3B8" fontSize="10" textAnchor="middle" fontWeight="bold">
                Stop 1: Koramangala
              </text>

              {/* Stop 2: HSR (Your Pickup) */}
              <circle cx="150" cy="150" r="8" fill="#06B6D4" stroke="#FFF" strokeWidth="2" />
              <text x="150" y="132" fill="#22D3EE" fontSize="10" textAnchor="middle" fontWeight="bold">
                Stop 2: HSR (You)
              </text>

              {/* Stop 3: Marathahalli (Current Truck Location) */}
              <circle cx="220" cy="110" r="10" fill="#F59E0B" />
              <circle cx="220" cy="110" r="18" fill="rgba(245, 158, 11, 0.2)" />
              <text x="220" y="90" fill="#FBBF24" fontSize="10" textAnchor="middle" fontWeight="bold">
                Stop 3: Current Stop
              </text>

              {/* Stop 4: Whitefield (Destination) */}
              <circle cx="420" cy="60" r="7" fill="#6366F1" />
              <text x="420" y="45" fill="#818CF8" fontSize="10" textAnchor="middle" fontWeight="bold">
                Stop 4: Whitefield (Dest)
              </text>
            </svg>

            {/* Live Status Floating Banner */}
            <div style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              right: '12px',
              background: 'rgba(15, 23, 42, 0.9)',
              backdropFilter: 'blur(8px)',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              border: '1px solid var(--border-subtle)'
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Status: </span>
                <strong style={{ color: 'var(--text-main)' }}>{activeCorridor.liveStatus}</strong>
              </div>
              <div style={{ color: 'var(--amber)', fontWeight: 700 }}>
                ETA Destination: 42 Mins
              </div>
            </div>
          </div>
          )}

          {/* Dynamic Stops Timeline */}
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px' }}>
              CORRIDOR STOP PROGRESSION ({activeCorridor.stops.length} STOPS):
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeCorridor.stops.map((stop, idx) => (
                <div
                  key={stop.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: stop.status === 'Completed' ? 'rgba(16, 185, 129, 0.08)' : stop.status === 'Current Stop' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    border: stop.status === 'Current Stop' ? '1px solid var(--amber)' : '1px solid var(--border-subtle)',
                    fontSize: '0.85rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: stop.status === 'Completed' ? 'var(--primary)' : stop.status === 'Current Stop' ? 'var(--amber)' : 'rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}>
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {stop.location}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {stop.type === 'pickup' ? '📦 Pickup Window: ' : '🏠 Dropoff Window: '}{stop.time}
                      </div>
                    </div>
                  </div>

                  <div>
                    {stop.otpVerified ? (
                      <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                        <CheckCircle2 size={10} /> OTP Confirmed
                      </span>
                    ) : stop.status === 'Current Stop' ? (
                      <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>
                        In Progress
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        Upcoming
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Jump to Move-In Ready Themed Setup */}
          <button
            onClick={() => setActiveTab('themes')}
            className="btn btn-primary"
            style={{ width: '100%', gap: '8px' }}
          >
            Setup Destination Room Theme & Arrival Essentials
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* 2.5D Isometric Pack-My-Truck Load Visualizer Section */}
      <PackMyTruckVisualizer />
    </div>
  );
};
