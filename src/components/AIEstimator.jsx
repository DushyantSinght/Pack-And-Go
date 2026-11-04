import React, { useState } from 'react';
import { useMove } from '../context/MoveContext';
import { ROOM_PRESETS, VOICE_SAMPLE_TRANSCRIPTS } from '../data/mockData';
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
    applyVoiceEstimate,
    setActiveTab,
    showToast,
    openPayment,
    openInvoice
  } = useMove();

  const [activeMode, setActiveMode] = useState('photo'); // 'photo' | 'voice'
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [customPhotoUrl, setCustomPhotoUrl] = useState(null);
  const [selectedVoiceSample, setSelectedVoiceSample] = useState(VOICE_SAMPLE_TRANSCRIPTS[0]);

  // Current selected preset object
  const activePreset = ROOM_PRESETS.find((p) => p.id === currentEstimate.presetId) || ROOM_PRESETS[0];

  // Handle custom image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCustomPhotoUrl(event.target.result);
        showToast('Scanning uploaded photo with Pack&Go CV Engine...', 'info');
        setTimeout(() => {
          showToast('Scan complete! 8 household items detected with 94.8% confidence.', 'success');
        }, 1200);
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger microphone simulation or real Web Speech API
  const handleToggleVoice = () => {
    if (!isRecording) {
      setIsRecording(true);
      showToast('Listening... Describe your room, furniture, and box count.', 'info');

      // Check if browser supports Web Speech API
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = false;
          recognition.lang = 'en-IN';

          recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setIsRecording(false);
            // Apply parsed voice estimate
            applyVoiceEstimate({
              detectedItems: ['User Verbal Inventory', 'Study Table', 'Mattress', 'Cartons'],
              cuFt: 110,
              labour: '2 Men, 2.5 Hours',
              cartons: { small: 2, medium: 4, large: 2, wardrobe: 1 },
              pooledPrice: 3250,
              soloPrice: 6000
            });
            showToast(`Heard: "${transcript}"`, 'success');
          };

          recognition.onerror = () => {
            simulateVoiceParsing();
          };

          recognition.start();
          return;
        } catch (err) {
          simulateVoiceParsing();
          return;
        }
      }
      simulateVoiceParsing();
    } else {
      setIsRecording(false);
    }
  };

  const simulateVoiceParsing = () => {
    setTimeout(() => {
      setIsRecording(false);
      applyVoiceEstimate(selectedVoiceSample);
    }, 2000);
  };

  const handleLockPrice = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
    showToast('Guaranteed Upfront Price Locked! Proceeding to Digital Luggage Passport.', 'success');
    setTimeout(() => {
      setActiveTab('passport');
    }, 800);
  };

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
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Patented Computer Vision & NLP</span>
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
                  Upload Custom Room Sweep
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
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

              {/* Detected Items List */}
              <div style={{ marginTop: '18px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
                  DETECTED BELONGINGS ({activePreset.items.length} ITEMS)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {activePreset.items.map((item) => (
                    <span
                      key={item.id}
                      style={{
                        fontSize: '0.75rem',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-sm)',
                        background: item.fragile ? 'rgba(217, 107, 117, 0.12)' : 'var(--bg-elevated)',
                        border: item.fragile ? '1px solid rgba(217, 107, 117, 0.3)' : '1px solid var(--border-subtle)',
                        color: item.fragile ? 'var(--rose)' : 'var(--text-main)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {item.name}
                      <strong style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{item.cuFt} ft³</strong>
                    </span>
                  ))}
                </div>
              </div>
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

              {/* Sample Voice Walkthrough Transcripts */}
              <div style={{ marginTop: '20px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
                  OR TRY PRE-RECORDED VOICE PROMPTS:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {VOICE_SAMPLE_TRANSCRIPTS.map((vt) => (
                    <div
                      key={vt.id}
                      onClick={() => {
                        setSelectedVoiceSample(vt);
                        applyVoiceEstimate(vt);
                      }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        background: selectedVoiceSample.id === vt.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        border: selectedVoiceSample.id === vt.id ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>{vt.label}</span>
                        <span className="badge badge-indigo" style={{ fontSize: '0.65rem' }}>{vt.cuFt} cu. ft.</span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>
                        "{vt.text}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: AI Dynamic Quotation & Price-Lock */}
        <div className="glass-panel glass-panel-glow" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="badge badge-emerald">
                <ShieldAlert size={12} /> Guaranteed Price-Lock
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
                100% Upfront Commitment
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
                <Users size={16} color="var(--accent)" /> Certified Crew:
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
                  Solo Charter Truck: ₹{currentEstimate.soloPrice.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                  ₹{currentEstimate.pooledPrice.toLocaleString('en-IN')}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="badge badge-emerald" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                  SAVE {currentEstimate.savingsPercent}%
                </span>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Shared Capacity Savings
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '8px' }}>
              Includes: Loading, Unloading, Digital Luggage Passports, Geofenced Handover & ₹50,000 Transit Escrow.
            </div>
          </div>

          {/* Lock Price Action Button */}
          <button
            onClick={handleLockPrice}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', gap: '10px', fontWeight: 700 }}
          >
            <Lock size={18} />
            Lock Price & Generate Box QR Passports
            <ArrowRight size={18} />
          </button>

          {/* Quick Pay & Corporate Invoice Secondary Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              onClick={openPayment}
              className="btn btn-outline-emerald btn-sm"
              style={{ gap: '6px', fontSize: '0.8rem', padding: '10px' }}
            >
              <CreditCard size={15} />
              Pay via UPI Escrow
            </button>
            <button
              onClick={openInvoice}
              className="btn btn-secondary btn-sm"
              style={{ gap: '6px', fontSize: '0.8rem', padding: '10px' }}
            >
              <FileText size={15} />
              Reimbursement Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
