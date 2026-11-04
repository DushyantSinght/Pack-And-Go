import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Navigation,
  Crosshair,
  Layers,
  MapPin,
  Truck,
  Shield,
  Clock,
  Radio,
  Maximize2
} from 'lucide-react';

export const InteractiveLeafletMap = ({ corridorId = 'blr-koramangala-whitefield' }) => {
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const truckMarkerRef = useRef(null);
  const [mapStyle, setMapStyle] = useState('carto-dark'); // carto-dark | osm-standard | carto-light
  const [currentSpeed, setCurrentSpeed] = useState(34);
  const [gpsStatus, setGpsStatus] = useState({ lat: 12.9400, lng: 77.6700, sats: 12, hdop: 0.9 });

  // Corridor Waypoint Datasets
  const corridorData = {
    'blr-koramangala-whitefield': {
      center: [12.9460, 77.6850],
      zoom: 12,
      stops: [
        { name: 'Stop 1: Koramangala 4th Block', coords: [12.9345, 77.6266], type: 'pickup', desc: 'Pickup Completed (08:30 AM)' },
        { name: 'Stop 2: HSR Layout Sector 1', coords: [12.9121, 77.6446], type: 'pickup', desc: 'Pickup Completed (09:15 AM)' },
        { name: 'Stop 3: Marathahalli Bridge', coords: [12.9591, 77.6974], type: 'waypoint', desc: 'Active Geofence Approaching' },
        { name: 'Stop 4: Hope Farm, Whitefield', coords: [12.9818, 77.7505], type: 'delivery', desc: 'Final Destination (Est. 10:45 AM)' }
      ],
      truck: { coords: [12.9420, 77.6710], heading: 55, street: 'Outer Ring Road, Bellandur Flyover' },
      routeCoords: [
        [12.9345, 77.6266],
        [12.9210, 77.6350],
        [12.9121, 77.6446],
        [12.9250, 77.6600],
        [12.9420, 77.6710], // current truck position
        [12.9591, 77.6974],
        [12.9700, 77.7200],
        [12.9818, 77.7505]
      ]
    },
    'del-gurugram-noida': {
      center: [28.5600, 77.2200],
      zoom: 11,
      stops: [
        { name: 'Stop 1: Hauz Khas / IIT Delhi', coords: [28.5450, 77.1926], type: 'pickup', desc: 'Pickup Completed' },
        { name: 'Stop 2: Cyber City Gurugram', coords: [28.4950, 77.0890], type: 'pickup', desc: 'Completed' },
        { name: 'Stop 3: Sector 62 Noida', coords: [28.6280, 77.3649], type: 'delivery', desc: 'Final Destination' }
      ],
      truck: { coords: [28.5300, 77.2400], heading: 80, street: 'DND Flyway Corridor' },
      routeCoords: [
        [28.4950, 77.0890],
        [28.5450, 77.1926],
        [28.5300, 77.2400],
        [28.6280, 77.3649]
      ]
    },
    'mum-powai-pune': {
      center: [18.8500, 73.2000],
      zoom: 9,
      stops: [
        { name: 'Stop 1: IIT Bombay, Powai', coords: [19.1250, 72.9150], type: 'pickup', desc: 'Completed' },
        { name: 'Stop 2: BKC Commercial Hub', coords: [19.0674, 72.8687], type: 'pickup', desc: 'Completed' },
        { name: 'Stop 3: Hinjawadi Phase 1, Pune', coords: [18.5913, 73.7389], type: 'delivery', desc: 'Destination' }
      ],
      truck: { coords: [18.8200, 73.2500], heading: 120, street: 'Mumbai-Pune Expressway Toll' },
      routeCoords: [
        [19.1250, 72.9150],
        [19.0674, 72.8687],
        [18.9800, 73.1100],
        [18.8200, 73.2500],
        [18.5913, 73.7389]
      ]
    }
  };

  const activeData = corridorData[corridorId] || corridorData['blr-koramangala-whitefield'];

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Remove existing map instance if any
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    // Initialize Map
    const map = L.map(mapContainerRef.current, {
      center: activeData.center,
      zoom: activeData.zoom,
      zoomControl: false,
      attributionControl: false
    });

    leafletMapRef.current = map;

    // Tile Layer based on mapStyle
    let tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    if (mapStyle === 'carto-dark') {
      tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    } else if (mapStyle === 'osm-standard') {
      tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);

    // Add Route Polyline
    const fullRoute = L.polyline(activeData.routeCoords, {
      color: '#D4AF37',
      weight: 4,
      opacity: 0.85,
      dashArray: '8, 8'
    }).addTo(map);

    // Add Waypoint Markers
    activeData.stops.forEach((stop) => {
      const isDelivery = stop.type === 'delivery';
      const isPickup = stop.type === 'pickup';

      const iconHtml = `
        <div style="
          background: ${isDelivery ? '#D4AF37' : isPickup ? '#10B981' : '#6366F1'};
          color: #FFFFFF;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          border: 2px solid #FFFFFF;
        ">
          ${isDelivery ? '🏁' : isPickup ? '📦' : '📍'}
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-leaflet-marker',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker(stop.coords, { icon: customIcon }).addTo(map);
      marker.bindPopup(`
        <div style="padding: 4px; font-family: sans-serif; font-size: 12px; color: #0F172A;">
          <strong>${stop.name}</strong><br />
          <span style="color: #64748B;">${stop.desc}</span>
        </div>
      `);
    });

    // Add 150m Geofence around upcoming stop (Stop 3 / Marathahalli)
    const geofenceStop = activeData.stops[2] || activeData.stops[activeData.stops.length - 1];
    L.circle(geofenceStop.coords, {
      radius: 200, // 200 meters
      color: '#10B981',
      fillColor: '#10B981',
      fillOpacity: 0.15,
      dashArray: '4, 6',
      weight: 2
    }).addTo(map).bindPopup('<strong>150m Verified Geofence</strong><br />Move Captain auto-checkin triggers inside this boundary.');

    // Add Moving Truck Marker
    const truckIconHtml = `
      <div style="position: relative;">
        <div style="
          position: absolute;
          top: -12px;
          left: -12px;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: rgba(212, 175, 55, 0.25);
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
        <div style="
          background: #0F172A;
          border: 2px solid #D4AF37;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(212, 175, 55, 0.4);
          font-size: 16px;
        ">
          🚛
        </div>
      </div>
    `;

    const truckIcon = L.divIcon({
      html: truckIconHtml,
      className: 'custom-truck-marker',
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });

    const truckMarker = L.marker(activeData.truck.coords, { icon: truckIcon }).addTo(map);
    truckMarker.bindPopup(`
      <div style="padding: 4px; font-family: sans-serif; font-size: 12px; color: #0F172A;">
        <strong>Tata Ace EV • KA-01-MJ-4921</strong><br />
        Speed: 34 km/h • Temp: 24°C • Shock: 0G<br />
        <span style="color: #059669; font-weight: bold;">Geofence Telemetry Online</span>
      </div>
    `);
    truckMarkerRef.current = truckMarker;

    // Cleanup
    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, [corridorId, mapStyle]);

  // Recenter Map on Truck
  const handleRecenter = () => {
    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo(activeData.truck.coords, 14, { duration: 1.2 });
    }
  };

  // Zoom In / Out
  const handleZoomIn = () => leafletMapRef.current && leafletMapRef.current.zoomIn();
  const handleZoomOut = () => leafletMapRef.current && leafletMapRef.current.zoomOut();

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '340px',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      border: '1px solid var(--border-subtle)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
    }}>
      {/* Leaflet DOM Node */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Top Floating Telemetry Overlay Bar */}
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '12px',
        right: '12px',
        zIndex: 400,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 'var(--radius-sm)',
        padding: '8px 14px',
        fontSize: '0.8rem',
        color: '#FFFFFF'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="radar-dot"></span>
          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>LIVE GPS ROUTING</span>
          <span style={{ color: 'var(--text-dim)' }}>•</span>
          <span style={{ color: '#E2E8F0', fontSize: '0.75rem' }}>{activeData.truck.street}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.75rem' }}>
          <span>Speed: <strong style={{ color: '#10B981' }}>{currentSpeed} km/h</strong></span>
          <span>ETA: <strong style={{ color: 'var(--primary)' }}>32 mins</strong></span>
          <span style={{ color: 'var(--text-dim)' }}>GPS: {gpsStatus.sats} Sats</span>
        </div>
      </div>

      {/* Right Map Floating Controls */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        zIndex: 400,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <button
          onClick={handleRecenter}
          className="btn btn-secondary btn-sm"
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            color: '#FFFFFF',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            width: '36px',
            height: '36px',
            padding: 0,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          title="Recenter on Truck"
        >
          <Crosshair size={16} color="var(--primary)" />
        </button>

        <button
          onClick={() => setMapStyle((prev) => (prev === 'carto-dark' ? 'osm-standard' : 'carto-dark'))}
          className="btn btn-secondary btn-sm"
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            color: '#FFFFFF',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            width: '36px',
            height: '36px',
            padding: 0,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          title="Toggle Dark / Standard OpenStreetMap Tiles"
        >
          <Layers size={16} />
        </button>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <button
            onClick={handleZoomIn}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              width: '36px',
              height: '32px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '16px'
            }}
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            style={{
              background: 'transparent',
              border: 'none',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF',
              width: '36px',
              height: '32px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '16px'
            }}
          >
            −
          </button>
        </div>
      </div>

      {/* Bottom Left Legend */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        zIndex: 400,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 'var(--radius-sm)',
        padding: '6px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '0.72rem',
        color: 'var(--text-muted)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }}></span>
          <span>Pickups</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#D4AF37' }}></span>
          <span>Destination</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.3)', border: '1px dashed #10B981' }}></span>
          <span>150m Geofence</span>
        </div>
      </div>
    </div>
  );
};
