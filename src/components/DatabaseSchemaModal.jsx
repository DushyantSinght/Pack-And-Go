import React, { useState, useEffect } from 'react';
import {
  Database,
  Server,
  Layers,
  Table,
  CheckCircle2,
  RefreshCw,
  Key,
  ShieldCheck,
  Code2,
  X,
  Sparkles,
  ExternalLink,
  ChevronRight,
  HardDrive
} from 'lucide-react';
import { api } from '../services/api';
import { useMove } from '../context/MoveContext';

export const DatabaseSchemaModal = ({ isOpen, onClose }) => {
  const { showToast } = useMove();
  const [dbStatus, setDbStatus] = useState(null);
  const [schemas, setSchemas] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('users');
  const [collectionDocs, setCollectionDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('schema'); // 'schema' | 'live-data' | 'connection'

  const fetchStatusAndSchema = async () => {
    setLoading(true);
    try {
      const [statusRes, schemaRes] = await Promise.all([
        api.getDBStatus(),
        api.getDBSchema()
      ]);
      setDbStatus(statusRes);
      if (schemaRes?.schemas) {
        setSchemas(schemaRes.schemas);
      }
    } catch (err) {
      console.error('Error fetching DB status', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollectionData = async (collName) => {
    try {
      if (collName === 'users') {
        const res = await api.getUsers();
        setCollectionDocs(res?.users || []);
      } else if (collName === 'luggagepassports') {
        const res = await api.getPassports();
        setCollectionDocs(res?.passports || []);
      } else if (collName === 'marketplaceitems') {
        const res = await api.getMarketplaceItems();
        setCollectionDocs(res?.items || []);
      } else if (collName === 'pooledcorridors') {
        const res = await api.getCorridors();
        setCollectionDocs(res?.corridors || []);
      } else if (collName === 'campushubs') {
        const res = await api.getCampusHubs();
        setCollectionDocs(res?.hubs || []);
      } else if (collName === 'movebookings') {
        const res = await api.getCurrentMove();
        setCollectionDocs(res?.move ? [res.move] : []);
      }
    } catch (err) {
      console.error('Error fetching collection data', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatusAndSchema();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && activeTab === 'live-data') {
      fetchCollectionData(selectedCollection);
    }
  }, [isOpen, activeTab, selectedCollection]);

  const handleReseed = async () => {
    setLoading(true);
    try {
      await api.reseedDatabase(true);
      showToast('MongoDB database reseeded successfully with fresh documents!', 'success');
      await fetchStatusAndSchema();
      if (activeTab === 'live-data') {
        fetchCollectionData(selectedCollection);
      }
    } catch (err) {
      showToast(`Reseed error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentSchemaObj = schemas.find((s) => s.collection === selectedCollection) || schemas[0];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 250,
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-glow)',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '1050px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-xl)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.08), rgba(99, 102, 241, 0.08))'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF'
            }}>
              <Database size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>MongoDB Database & Schema Architecture</h3>
                <span className="badge badge-emerald" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={12} />
                  {dbStatus?.status?.isConnected ? 'Live Connected' : 'Connecting'}
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Instance: <code>{dbStatus?.status?.host}:{dbStatus?.status?.port}/{dbStatus?.status?.dbName}</code> • Mongoose 9 ODM • 6 Core Schemas
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleReseed}
              disabled={loading}
              className="btn btn-secondary btn-sm"
              style={{ gap: '6px', fontSize: '0.8rem' }}
              title="Reseed initial collection documents"
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              Reseed Database
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Status Metrics Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          padding: '16px 24px',
          background: 'rgba(255, 255, 255, 0.015)',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Database Engine</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>MongoDB Local</div>
            <div style={{ fontSize: '0.75rem', color: '#10B981' }}>port 27017 • active</div>
          </div>
          <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Collections</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>6 Managed Collections</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mongoose typed schemas</div>
          </div>
          <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Document Count</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', marginTop: '2px' }}>
              {dbStatus?.totalDocuments || 21} Records
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Persisted in disk</div>
          </div>
          <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>REST API Endpoints</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>Express 5 + Mongoose</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Proxy /api ➔ :5001</div>
          </div>
        </div>

        {/* View Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '0 24px',
          background: 'var(--bg-main)'
        }}>
          <button
            onClick={() => setActiveTab('schema')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'transparent',
              color: activeTab === 'schema' ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'schema' ? '2px solid var(--primary)' : '2px solid transparent',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Layers size={15} />
            Mongoose Schema Specifications
          </button>
          <button
            onClick={() => setActiveTab('live-data')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'transparent',
              color: activeTab === 'live-data' ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'live-data' ? '2px solid var(--primary)' : '2px solid transparent',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Table size={15} />
            Live MongoDB Records Viewer
          </button>
          <button
            onClick={() => setActiveTab('connection')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'transparent',
              color: activeTab === 'connection' ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'connection' ? '2px solid var(--primary)' : '2px solid transparent',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Server size={15} />
            Connection & Environment Details
          </button>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left Sidebar: Collection Selector */}
          <div style={{
            width: '260px',
            borderRight: '1px solid var(--border-subtle)',
            background: 'var(--bg-elevated)',
            overflowY: 'auto',
            padding: '16px 12px'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px', paddingLeft: '8px' }}>
              Database Collections ({schemas.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {schemas.map((s) => {
                const count = dbStatus?.collections?.[s.collection]?.count ?? 0;
                const isSelected = selectedCollection === s.collection;
                return (
                  <button
                    key={s.collection}
                    onClick={() => setSelectedCollection(s.collection)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid transparent',
                      background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                      color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Table size={14} opacity={0.7} />
                        <span>{s.collection}</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Model: {s.model}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: 'var(--text-muted)'
                    }}>
                      {count} docs
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Main Panel */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            {activeTab === 'schema' && currentSchemaObj && (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                      <code>{currentSchemaObj.collection}</code>
                    </h4>
                    <span className="badge badge-cyan">Model: {currentSchemaObj.model}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {currentSchemaObj.description}
                  </p>
                </div>

                {/* Schema Fields Table */}
                <div style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-muted)' }}>Field</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-muted)' }}>BSON / Type</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-muted)' }}>Constraints</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-muted)' }}>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentSchemaObj.fields.map((f, idx) => (
                        <tr
                          key={f.name}
                          style={{
                            borderBottom: idx === currentSchemaObj.fields.length - 1 ? 'none' : '1px solid var(--border-subtle)',
                            background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)'
                          }}
                        >
                          <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                            <code>{f.name}</code>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{
                              color: f.type.includes('ObjectId') ? '#F59E0B' : f.type.includes('Number') ? '#3B82F6' : '#10B981',
                              fontWeight: 600,
                              fontFamily: 'monospace'
                            }}>
                              {f.type}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {f.required && (
                                <span style={{ fontSize: '0.65rem', padding: '2px 5px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', fontWeight: 700 }}>
                                  REQUIRED
                                </span>
                              )}
                              {f.unique && (
                                <span style={{ fontSize: '0.65rem', padding: '2px 5px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', fontWeight: 700 }}>
                                  UNIQUE
                                </span>
                              )}
                              {f.indexed && (
                                <span style={{ fontSize: '0.65rem', padding: '2px 5px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: '#6366F1', fontWeight: 700 }}>
                                  INDEXED
                                </span>
                              )}
                              {f.enum && (
                                <span style={{ fontSize: '0.65rem', padding: '2px 5px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', fontWeight: 700 }}>
                                  ENUM
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>
                            {f.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'live-data' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                      Live Documents: <code>{selectedCollection}</code>
                    </h4>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Retrieved in real-time from active MongoDB collection
                    </p>
                  </div>
                  <span className="badge badge-emerald">
                    {collectionDocs.length} Documents Fetched
                  </span>
                </div>

                {collectionDocs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <p>No documents found or loading...</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {collectionDocs.map((doc, idx) => (
                      <div
                        key={doc._id || doc.boxId || doc.itemId || doc.bookingId || idx}
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          padding: '14px',
                          fontFamily: 'monospace',
                          fontSize: '0.8rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
                            {doc.label || doc.title || doc.name || doc.bookingId || `Document #${idx + 1}`}
                          </span>
                          <span>ID: {doc._id || doc.boxId || doc.itemId}</span>
                        </div>
                        <pre style={{
                          margin: 0,
                          padding: '10px',
                          background: 'var(--bg-main)',
                          borderRadius: '6px',
                          overflowX: 'auto',
                          color: '#E2E8F0',
                          lineHeight: 1.4
                        }}>
                          {JSON.stringify(doc, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'connection' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <h4 style={{ margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HardDrive size={18} color="var(--primary)" /> MongoDB Connection Parameters
                  </h4>
                  <table style={{ width: '100%', fontSize: '0.85rem' }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '8px 0', color: 'var(--text-muted)', width: '180px' }}>Connection URI:</td>
                        <td><code>mongodb://127.0.0.1:27017/packandgo</code></td>
                      </tr>
                      <tr>
                        <td style={{ padding: '8px 0', color: 'var(--text-muted)' }}>Active Database:</td>
                        <td><strong>packandgo</strong></td>
                      </tr>
                      <tr>
                        <td style={{ padding: '8px 0', color: 'var(--text-muted)' }}>Driver & Version:</td>
                        <td>Mongoose 9.11.3 (Node.js MongoDB Driver)</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '8px 0', color: 'var(--text-muted)' }}>Server Port:</td>
                        <td>5001 (Proxied via Vite dev server)</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '8px 0', color: 'var(--text-muted)' }}>Environment File:</td>
                        <td><code>pack-and-go/server/.env</code></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="glass-panel" style={{ padding: '20px' }}>
                  <h4 style={{ margin: '0 0 10px' }}>Using MongoDB Atlas (Cloud)</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    To connect to a cloud MongoDB Atlas cluster, simply update <code>server/.env</code>:
                  </p>
                  <pre style={{
                    padding: '12px',
                    background: 'var(--bg-main)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    color: '#10B981',
                    overflowX: 'auto'
                  }}>
                    MONGODB_URI=mongodb+srv://&lt;username&gt;:&lt;password&gt;@cluster0.mongodb.net/packandgo?retryWrites=true&w=majority
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
