import React, { useState } from 'react';
import { useMove } from '../context/MoveContext';
import { ROOM_PRESETS } from '../data/mockData';
import { api } from '../services/api';
import {
  Camera,
  Mic,
  MicOff,
  Sparkles,
  Layers,
  Box,
  Truck,
  Users,
  Lock,
  ArrowRight,
  CheckCircle,
  Eye,
  RefreshCw,
  Info,
  ShieldAlert,
  FileText,
  CreditCard
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const AIEstimator = () => {
  const {
    currentEstimate,
    applyPreset,
    setActiveTab,
    showToast,
    applyItems,
    openBooking,
    openMyMoves
  } = useMove();
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState('');
  const [transcript, setTranscript] = useState('');
  const [newItem, setNewItem] = useState({ name: '', cuFt: '', fragile: false });

  const [activeMode, setActiveMode] = useState('photo'); // 'photo' | 'voice'
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [customPhotoUrl, setCustomPhotoUrl] = useState(null);

  // Current selected preset object
  const activePreset = ROOM_PRESETS.find((p) => p.id === currentEstimate.presetId) || ROOM_PRESETS[0];

  /** Shrink the photo client-side so uploads are fast and under the API limit. */
  const toJpeg = (file, maxSide = 1600) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, maxSide / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });

  // AI room scan: the photo goes to Claude, detected items land in the estimate.
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    let dataUrl;
    try {
      dataUrl = await toJpeg(file);
    } catch {
      showToast('Could not read that image.', 'error');
      return;
    }
    setCustomPhotoUrl(dataUrl);
    setScanning(true);
    setScanNote('');
    try {
      const r = await api.scanRoom(dataUrl);
      const append = currentEstimate.presetId === 'custom' && (currentEstimate.items || []).length > 0;
      applyItems(r.items, { append, label: `Found ${r.items.length} item${r.items.length === 1 ? '' : 's'} — check the list and edit anything that's wrong.` });
      setScanNote(r.notes || '');
    } catch (err) {
      showToast(/not configured/i.test(err.message) ? 'AI scan is not set up on this server yet — add your items by hand below.' : err.message, 'error');
    } finally {
      setScanning(false);
    }
  };

  const parseSpoken = async (text) => {
    setTranscript(text);
    setScanning(true);
    try {
      const r = await api.parseInventory(text);
      applyItems(r.items, { append: currentEstimate.presetId === 'custom', label: `Added ${r.items.length} item${r.items.length === 1 ? '' : 's'} from what you said.` });
    } catch (err) {
      showToast(/not configured/i.test(err.message) ? 'AI is not set up on this server — add items by hand below.' : err.message, 'error');
    } finally {
      setScanning(false);
    }
  };

  // Voice walkthrough with the browser's speech recognition.
  const handleToggleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Voice input isn\'t supported in this browser (try Chrome). You can type instead.', 'error');
      return;
    }
    if (isRecording) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => parseSpoken(event.results[0][0].transcript);
    recognition.onerror = (ev) => showToast(ev.error === 'not-allowed' ? 'Microphone permission denied.' : 'Didn\'t catch that — try again.', 'error');
    recognition.onend = () => setIsRecording(false);
    setIsRecording(true);
    recognition.start();
  };

  const removeItem = (id) => applyItems((currentEstimate.items || []).filter((it) => it.id !== id).map(({ box: _box, ...it }) => it));
  const addManualItem = (e) => {
    e.preventDefault();
    const cuFt = Number(newItem.cuFt);
    if (!newItem.name.trim() || !(cuFt > 0)) return;
    applyItems([{ id: Date.now(), name: newItem.name.trim(), category: 'Other', cuFt, weightKg: Math.round(cuFt * 1.6), fragile: newItem.fragile }], { append: true });
    setNewItem({ name: '', cuFt: '', fragile: false });
  };

  const handleLockPrice = () => {
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    openBooking();
  };

  // Typical city move (~10 km, ground floor) — same formula the server uses, for a quick preview.
  const preview = (() => {
    const cu = currentEstimate.totalCuFt || 0;
    const volume = cu * 18, distance = 5 * 28, base = 799;
    const pooled = Math.round((base + volume + distance - (volume + distance) * 0.4) * 1.18);
    const solo = Math.round((base + volume + distance) * 1.18);
    return { pooled, solo, save: solo ? Math.round((1 - pooled / solo) * 100) : 0 };
  })();

  const renderItemList = () => (
    <div style={{ marginTop: '18px' }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
        <span>YOUR ITEMS ({(currentEstimate.items || []).length}) • {currentEstimate.totalCuFt} ft³</span>
        {scanning && <span style={{ color: 'var(--primary)' }}>AI is reading…</span>}
      </div>
      {scanNote && <div style={{ fontSize: '0.76rem', color: 'var(--amber)', marginBottom: 8 }}>Note: {scanNote}</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {(currentEstimate.items || []).map((item) => (
          <span key={item.id} title={item.confidence ? `AI confidence: ${item.confidence}` : undefined} style={{
            fontSize: '0.75rem', padding: '4px 6px 4px 8px', borderRadius: 'var(--radius-sm)',
            background: item.fragile ? 'rgba(217, 107, 117, 0.12)' : 'var(--bg-elevated)',
            border: item.confidence === 'low' ? '1px dashed var(--amber)' : item.fragile ? '1px solid rgba(217, 107, 117, 0.3)' : '1px solid var(--border-subtle)',
            color: item.fragile ? 'var(--rose)' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px'
          }}>
            {item.name}
            <strong style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{item.cuFt} ft³</strong>
            <button onClick={() => removeItem(item.id)} title="Remove" aria-label={`Remove ${item.name}`} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '0 2px', fontSize: '0.9rem', lineHeight: 1 }}>×</button>
          </span>
        ))}
      </div>
      <form onSubmit={addManualItem} style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
        <input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="Add an item (e.g. Bookshelf)" style={{ flex: '2 1 160px', padding: '6px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontSize: '0.8rem' }} />
        <input value={newItem.cuFt} onChange={(e) => setNewItem({ ...newItem, cuFt: e.target.value })} type="number" min="0.5" step="0.5" placeholder="ft³" style={{ flex: '0 1 70px', padding: '6px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontSize: '0.8rem' }} />
        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={newItem.fragile} onChange={(e) => setNewItem({ ...newItem, fragile: e.target.checked })} /> Fragile
        </label>
        <button type="submit" className="btn btn-secondary btn-sm">Add</button>
      </form>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Mode Selector & Header */}
      <div className="glass-panel" style={{ padding: '20px 24px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-emerald">Zero-Touch Estimation</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>AI photo & voice estimate</span>
            </div>
            <h2 style={{ fontSize: '1.6rem' }}>AI Volumetric Scan & Price-Lock Engine</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Scan your belongings via room photo sweep or voice walkthrough. Locks in transparent pricing before a truck is dispatched.
            </p>
          </div>

          {/* Mode Switcher Buttons */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-elevated)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <button
              onClick={() => setActiveMode('photo')}
              className="btn btn-sm"
              style={{
                background: activeMode === 'photo' ? 'var(--primary)' : 'transparent',
                color: activeMode === 'photo' ? '#fff' : 'var(--text-muted)'
              }}
            >
              <Camera size={15} />
              Photo Sweep (CV)
            </button>
            <button
              onClick={() => setActiveMode('voice')}
              className="btn btn-sm"
              style={{
                background: activeMode === 'voice' ? 'var(--accent)' : 'transparent',
                color: activeMode === 'voice' ? '#fff' : 'var(--text-muted)'
              }}
            >
              <Mic size={15} />
              Voice Walkthrough
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Scanner / Right Quotation */}
      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Left Column: Visual CV Scanner or Voice Input */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {activeMode === 'photo' ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontWeight: 700, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={18} color="var(--primary)" />
                  Computer Vision Room Sweep
                </span>

                <button
                  onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', gap: '4px' }}
                >
                  <Eye size={13} />
                  {showBoundingBoxes ? 'Hide Bounding Boxes' : 'Show AI Bounding Boxes'}
                </button>
              </div>

              {/* Preset Selector Chips */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
                {ROOM_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setCustomPhotoUrl(null);
                      applyPreset(preset.id);
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: activePreset.id === preset.id && !customPhotoUrl ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      border: activePreset.id === preset.id && !customPhotoUrl ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                      color: activePreset.id === preset.id && !customPhotoUrl ? '#FFFFFF' : 'var(--text-muted)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>

              {/* Interactive Image Frame with AI Bounding Box Overlays */}
              <div style={{
                position: 'relative',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                aspectRatio: '16/10',
                background: '#000',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-md)'
              }}>
                <img
                  src={customPhotoUrl || activePreset.previewUrl}
                  alt="Room Scan Preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }}
                />

                {/* Simulated Bounding Boxes */}
                {showBoundingBoxes && !customPhotoUrl && activePreset.items.map((item, idx) => (
                  <div
                    key={item.id}
                    style={{
                      position: 'absolute',
                      left: `${item.box[0]}%`,
                      top: `${item.box[1]}%`,
                      width: `${item.box[2]}%`,
                      height: `${item.box[3]}%`,
                      border: item.fragile ? '2px solid #F43F5E' : '2px solid #10B981',
                      background: item.fragile ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      borderRadius: '4px',
                      pointerEvents: 'none',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      top: '-20px',
                      left: 0,
                      background: item.fragile ? '#F43F5E' : '#10B981',
                      color: '#FFFFFF',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '3px',
                      whiteSpace: 'nowrap'
                    }}>
                      {item.name} ({item.cuFt} cu.ft)
                    </span>
                  </div>
                ))}

                {/* AI HUD Overlay Banner */}
                <div style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '10px',
                  right: '10px',
                  background: 'rgba(15, 18, 26, 0.88)',
                  backdropFilter: 'blur(8px)',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  fontSize: '0.75rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="radar-dot" style={{ width: '8px', height: '8px' }}></span>
                    <span style={{ color: '#FFFFFF', fontWeight: 600 }}>
                      YOLOv8 + Depth Estimator Active
                    </span>
                  </div>
                  <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                    Confidence: 96.4% • Zero Human Surveyor Needed
                  </span>
                </div>
              </div>

              {/* Upload Own Room Photo */}
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                  <Camera size={15} />
                  {scanning ? 'Scanning with AI…' : 'Scan a room photo (AI)'}
                  <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} disabled={scanning} style={{ display: 'none' }} />
                </label>
                {customPhotoUrl && (
                  <button
                    onClick={() => setCustomPhotoUrl(null)}
                    className="btn btn-secondary btn-sm"
                    style={{ color: 'var(--rose)' }}
                  >
                    Reset to Preset
                  </button>
                )}
              </div>

              {/* Your item list (AI scan, voice, preset or manual) */}
              {renderItemList()}
            </div>
          ) : (
            /* Voice Walkthrough Mode */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontWeight: 700, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mic size={18} color="var(--accent)" />
                  Voice Walkthrough Audio Parser
                </span>
                <span className="badge badge-indigo">Natural Language</span>
              </div>

              {/* Voice Interactive Audio Visualizer Box */}
              <div style={{
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                padding: '30px 20px',
                textAlign: 'center',
                border: isRecording ? '2px solid var(--accent)' : '1px solid var(--border-subtle)',
                boxShadow: isRecording ? '0 0 30px rgba(212, 175, 55, 0.25)' : 'none',
                transition: 'all 0.3s ease'
              }}>
                <button
                  onClick={handleToggleVoice}
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: isRecording ? 'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)' : 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                    border: 'none',
                    color: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 8px 25px rgba(99, 102, 241, 0.4)',
                    marginBottom: '16px'
                  }}
                >
                  {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
                </button>

                <h3 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>
                  {isRecording ? 'Listening & Parsing Items in Real-Time...' : 'Tap to Start Voice Walkthrough'}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto' }}>
                  "I have a study table, ergonomic chair, 4 book cartons, and a microwave oven moving from Koramangala to Whitefield."
                </p>

                {isRecording && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '16px' }}>
                    {[16, 28, 42, 20, 36, 12, 40, 24, 18].map((h, i) => (
                      <span
                        key={i}
                        style={{
                          width: '4px',
                          height: `${h}px`,
                          background: 'var(--accent)',
                          borderRadius: '2px',
                          animation: 'pulseGlow 1s infinite alternate'
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {transcript && (
                <div style={{ marginTop: 14, fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Heard: “{transcript}”</div>
              )}
              <form
                onSubmit={(e) => { e.preventDefault(); const t = e.currentTarget.elements.desc.value.trim(); if (t) parseSpoken(t); }}
                style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>OR TYPE WHAT YOU'RE MOVING</label>
                <textarea name="desc" rows={3} placeholder="e.g. one double bed, a 3-seater sofa, fridge, washing machine, 12 boxes of books and kitchen stuff" style={{ padding: 10, borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', resize: 'vertical' }} />
                <button type="submit" disabled={scanning} className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }}>{scanning ? 'Working…' : 'Add these items'}</button>
              </form>
              {renderItemList()}
            </div>
          )}
        </div>

        {/* Right Column: AI Dynamic Quotation & Price-Lock */}
        <div className="glass-panel glass-panel-glow" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="badge badge-emerald">
                <ShieldAlert size={12} /> Fixed upfront price
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
                No moving-day surprises
              </span>
            </div>
            <h3 style={{ fontSize: '1.4rem' }}>Transparent Volumetric Breakdown</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Calculated dynamically from recognized 3D volumes. No in-person surveyor required, no moving-day price renegotiations.
            </p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid-3" style={{ gap: '10px' }}>
            <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estimated Volume</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>
                {currentEstimate.totalCuFt} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>cu.ft</span>
              </div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Weight</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--cyan)' }}>
                {currentEstimate.estimatedWeightKg} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>kg</span>
              </div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Required Boxes</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--amber)' }}>
                {Object.values(currentEstimate.cartons).reduce((a, b) => a + b, 0)} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>cartons</span>
              </div>
            </div>
          </div>

          {/* Carton Box Recommendation Breakdown */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Box size={14} /> AI RECOMMENDED CARTON PACKAGING:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '0.8rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Small: </span>
                <strong>{currentEstimate.cartons.small}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Medium: </span>
                <strong>{currentEstimate.cartons.medium}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Large: </span>
                <strong>{currentEstimate.cartons.large}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Wardrobe: </span>
                <strong>{currentEstimate.cartons.wardrobe}</strong>
              </div>
            </div>
          </div>

          {/* Vehicle & Labour Allocation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                <Truck size={16} color="var(--primary)" /> Allocated Pooled Fleet:
              </span>
              <strong>{currentEstimate.vehicle}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                <Users size={16} color="var(--accent)" /> Verified crew:
              </span>
              <strong>{currentEstimate.labour}</strong>
            </div>
          </div>

          {/* Price Comparison Card: Solo vs Pooled */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(99, 102, 241, 0.12) 100%)',
            border: '1px solid var(--border-glow)',
            borderRadius: 'var(--radius-md)',
            padding: '18px 20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                  Dedicated truck: ₹{preview.solo.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                  ₹{preview.pooled.toLocaleString('en-IN')}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="badge badge-emerald" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                  SAVE {preview.save}%
                </span>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  with a pooled truck
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '8px' }}>
              Estimate for a typical ~10 km city move incl. GST. Your exact price is calculated from your addresses and floors when you book. Includes loading, unloading and box QR passports.
            </div>
          </div>

          {/* Lock Price Action Button */}
          <button
            onClick={handleLockPrice}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', gap: '10px', fontWeight: 700 }}
          >
            <Lock size={18} />
            Book this move
            <ArrowRight size={18} />
          </button>

          {/* Existing bookings: pay, receipts, tracking */}
          <button onClick={() => openMyMoves()} className="btn btn-secondary btn-sm" style={{ gap: '6px', fontSize: '0.8rem', padding: '10px', width: '100%', justifyContent: 'center' }}>
            <FileText size={15} />
            My Moves — pay, receipts & tracking
          </button>
        </div>
      </div>
    </div>
  );
};
