import { useState, useEffect, useRef } from 'react';
import { 
  Wifi, 
  WifiOff, 
  CheckCircle2, 
  QrCode, 
  RotateCw, 
  Compass,
  Database
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { db, type OfflineCollection } from './db/indexedDB';

// Cartodb Dark basemap
const MAP_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

interface Waypoint {
  id: string;
  bin_code: string;
  latitude: number;
  longitude: number;
  fill_level: number;
  weight_kg: number;
}

export default function App() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [activeRoute, setActiveRoute] = useState<any>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [completedBins, setCompletedBins] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState<boolean>(false);
  const [outboxCount, setOutboxCount] = useState<number>(0);
  
  // Scanning state
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanTargetBin, setScanTargetBin] = useState<Waypoint | null>(null);
  const [manualWeight, setManualWeight] = useState<string>('15.0');
  
  // Leaflet references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const BACKEND_URL = 'http://localhost:5000';

  // 1. Listen for Network Changes and local DB status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerOutboxSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial outbox check
    updateOutboxCount();

    // Check for cached route in IndexedDB on boot
    db.cachedRoute.get('active-route').then((cached) => {
      if (cached) {
        setActiveRoute(cached);
        setWaypoints(cached.waypoints);
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updateOutboxCount = async () => {
    const count = await db.outbox.count();
    setOutboxCount(count);
  };

  // 2. Fetch and optimize route
  const handleLoadRoute = async () => {
    if (!isOnline) {
      alert("Offline Mode: Unable to fetch fresh route optimizations. Loading cached route from IndexedDB.");
      const cached = await db.cachedRoute.get('active-route');
      if (cached) {
        setActiveRoute(cached);
        setWaypoints(cached.waypoints);
        setCompletedBins(new Set());
      } else {
        alert("No cached route found. Connect to network to download instructions.");
      }
      return;
    }

    try {
      // Driver starting coordinate (Manila center default)
      const res = await fetch(`${BACKEND_URL}/api/v1/routes/optimize?start_lon=120.9842&start_lat=14.5995`);
      if (res.ok) {
        const data = await res.json();
        
        // Cache in IndexedDB for offline persistence
        const routeRecord = {
          id: 'active-route',
          waypoints: data.waypoints,
          geometry: data.geometry,
          duration_sec: data.duration_sec,
          distance_meters: data.distance_meters,
          timestamp: new Date().toISOString()
        };
        await db.cachedRoute.put(routeRecord);
        
        setActiveRoute(routeRecord);
        setWaypoints(data.waypoints);
        setCompletedBins(new Set());
      }
    } catch (err) {
      console.error("Error loading optimized route:", err);
      // Fallback load mock local route for offline demoing
      const mockRoute = {
        id: 'active-route',
        waypoints: [
          { id: '1', bin_code: 'BIN-MNL-001', latitude: 14.5995, longitude: 120.9842, fill_level: 82.5, weight_kg: 35.0 },
          { id: '2', bin_code: 'BIN-MNL-002', latitude: 14.6015, longitude: 120.9892, fill_level: 95.0, weight_kg: 45.2 },
          { id: '5', bin_code: 'BIN-MNL-005', latitude: 14.5885, longitude: 120.9922, fill_level: 88.0, weight_kg: 40.8 }
        ],
        geometry: null,
        duration_sec: 2400,
        distance_meters: 5200,
        timestamp: new Date().toISOString()
      };
      await db.cachedRoute.put(mockRoute);
      setActiveRoute(mockRoute);
      setWaypoints(mockRoute.waypoints);
      setCompletedBins(new Set());
    }
  };

  // 3. Render Leaflet Map and Route lines
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        center: [14.5995, 120.9842],
        zoom: 13,
        zoomControl: false
      });

      L.tileLayer(MAP_TILES, {
        attribution: '&copy; OpenStreetMap &copy; CARTO'
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Remove old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }

    if (waypoints.length === 0) return;

    const latlngs: L.LatLngExpression[] = [];

    // Plot start depot point
    const depotIcon = L.divIcon({
      html: `<div class="w-6 h-6 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center shadow-lg"><span class="text-[9px] font-bold text-white">D</span></div>`,
      className: 'custom-depot-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
    const depotMarker = L.marker([14.5995, 120.9842], { icon: depotIcon }).addTo(map);
    markersRef.current.push(depotMarker);
    latlngs.push(L.latLng(14.5995, 120.9842));

    // Plot waypoint pins
    waypoints.forEach((wp, index) => {
      const isDone = completedBins.has(wp.id);
      
      const pinIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center w-8 h-8">
            <span class="absolute inline-flex h-full w-full rounded-full ${isDone ? 'bg-slate-500' : 'bg-emerald-500 animate-ping'} opacity-40"></span>
            <div class="w-6 h-6 rounded-full ${isDone ? 'bg-slate-700' : 'bg-emerald-500'} border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
              ${index + 1}
            </div>
          </div>
        `,
        className: 'custom-wp-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([wp.latitude, wp.longitude], { icon: pinIcon }).addTo(map);
      marker.bindPopup(`<strong class="text-slate-900">${wp.bin_code}</strong><br><span class="text-slate-600">Capacity: ${wp.fill_level}%</span>`);
      markersRef.current.push(marker);
      latlngs.push(L.latLng(wp.latitude, wp.longitude));
    });

    // Draw straight connecting paths (in case OSRM geometry wasn't pre-loaded/cached)
    if (latlngs.length > 1) {
      const poly = L.polyline(latlngs, { color: '#10b981', weight: 4, opacity: 0.8 }).addTo(map);
      routePolylineRef.current = poly;
      map.fitBounds(poly.getBounds(), { padding: [30, 30] });
    }

  }, [waypoints, completedBins]);

  // 4. Trigger Outbox Synchronization
  const triggerOutboxSync = async () => {
    if (!navigator.onLine) return;
    
    const count = await db.outbox.count();
    if (count === 0) return;

    setSyncing(true);
    const pending = await db.outbox.toArray();
    
    let successfulSyncs = 0;

    for (const item of pending) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/collections/record`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Mock driver credentials header
            'Authorization': 'Bearer ' + localStorage.getItem('driver_token') 
          },
          body: JSON.stringify({
            bin_id: item.bin_id,
            verification_method: item.verification_method,
            weight_collected_kg: item.weight_collected_kg,
            fill_level_before: item.fill_level_before
          })
        });

        if (res.ok) {
          // Remove from outbox queue
          if (item.id) {
            await db.outbox.delete(parseInt(item.id));
            successfulSyncs++;
          }
        }
      } catch (err) {
        console.warn("Failed to sync offline record. Will retry later.", err);
      }
    }

    setSyncing(false);
    updateOutboxCount();
    if (successfulSyncs > 0) {
      alert(`Network restored! Synced ${successfulSyncs} offline collection updates successfully.`);
    }
  };

  // 5. QR Code Scanner control
  const handleOpenScanner = (bin: Waypoint) => {
    setScanTargetBin(bin);
    setScanning(true);

    // Give the DOM a tiny bit to render scanner container element
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
      scanner.render(
        async (decodedText) => {
          // Success Callback
          if (decodedText.includes(bin.bin_code)) {
            scanner.clear();
            setScanning(false);
            recordCollectionSuccess(bin, 'QR_SCAN');
          } else {
            alert(`QR mismatch! Code read: "${decodedText}". Expected bin code: "${bin.bin_code}"`);
          }
        },
        () => {
          // Ignore scanning path errors (which stream on camera frames lookups)
        }
      );
    }, 100);
  };

  const handleManualCollection = (bin: Waypoint) => {
    recordCollectionSuccess(bin, 'MANUAL_TAP');
  };

  // 6. Record collection to DB or IndexedDB
  const recordCollectionSuccess = async (bin: Waypoint, method: 'QR_SCAN' | 'MANUAL_TAP') => {
    const weight = parseFloat(manualWeight) || 15.0;

    const collectionLog: OfflineCollection = {
      bin_id: bin.id,
      bin_code: bin.bin_code,
      verification_method: method,
      weight_collected_kg: weight,
      fill_level_before: bin.fill_level,
      timestamp: new Date().toISOString()
    };

    if (isOnline) {
      // Send directly to API
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/collections/record`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(collectionLog)
        });
        
        if (!res.ok) throw new Error("API rejected collection record");
        
        alert(`Recorded collection for ${bin.bin_code} successfully!`);
      } catch (err) {
        console.warn("Direct upload failed. Falling back to local outbox:", err);
        await db.outbox.add(collectionLog);
        updateOutboxCount();
      }
    } else {
      // Save offline outbox
      await db.outbox.add(collectionLog);
      updateOutboxCount();
      alert(`App is offline! Saved collection update for ${bin.bin_code} in IndexedDB. Will sync when network returns.`);
    }

    setCompletedBins(prev => new Set([...prev, bin.id]));
  };

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 font-sans max-w-md mx-auto flex flex-col justify-between border-x border-slate-900 shadow-2xl relative">
      
      {/* Header bar */}
      <header className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between sticky top-0 z-[1000]">
        <div className="flex items-center space-x-2.5">
          <img src="/binsinag-logo.png" alt="binSINAG" className="h-8 w-auto object-contain" />
          <h1 className="text-base font-bold text-white">Driver Logistics</h1>
        </div>

        {/* Network indicator badge */}
        <div className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold border ${
          isOnline 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400 animate-pulse'
        }`}>
          {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          <span>{isOnline ? 'Online' : 'Offline Mode'}</span>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-4 space-y-6 pb-24 overflow-y-auto">
        
        {/* Outbox indicators if items waiting */}
        {outboxCount > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3.5 rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 animate-bounce" />
              <span className="text-xs font-semibold">{outboxCount} updates queued in outbox</span>
            </div>
            {isOnline && (
              <button 
                onClick={triggerOutboxSync}
                disabled={syncing}
                className="text-[10px] bg-amber-500 text-slate-950 font-bold px-2.5 py-1 rounded-lg"
              >
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
          </div>
        )}

        {/* Map Container panel */}
        <div ref={mapContainerRef} className="w-full h-64 rounded-2xl overflow-hidden border border-slate-900 bg-slate-900/40 relative" />

        {/* Route Details Stats Panel */}
        {activeRoute && (
          <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl flex justify-around text-center">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Est. Duration</p>
              <p className="text-sm font-extrabold text-emerald-400 mt-1">{(activeRoute.duration_sec / 60).toFixed(0)} mins</p>
            </div>
            <div className="border-r border-slate-850" />
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Route Distance</p>
              <p className="text-sm font-extrabold text-emerald-400 mt-1">{(activeRoute.distance_meters / 1000).toFixed(1)} km</p>
            </div>
            <div className="border-r border-slate-850" />
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Completion</p>
              <p className="text-sm font-extrabold text-emerald-400 mt-1">{completedBins.size} / {waypoints.length}</p>
            </div>
          </div>
        )}

        {/* Load Route trigger */}
        <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Task</h3>
            <p className="text-sm font-semibold text-white mt-0.5">
              {waypoints.length > 0 ? `${waypoints.length} Bins to collect` : 'No active route'}
            </p>
          </div>
          <button 
            onClick={handleLoadRoute}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span>Optimize Route</span>
          </button>
        </div>

        {/* Waypoint list */}
        <div className="space-y-3">
          <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest pl-1">Routing Sequence</h4>
          {waypoints.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-6">Tap Optimize Route above to assign targets.</p>
          ) : (
            waypoints.map((wp, index) => {
              const isDone = completedBins.has(wp.id);
              return (
                <div 
                  key={wp.id} 
                  className={`border rounded-2xl p-4 flex items-center justify-between transition-all ${
                    isDone 
                      ? 'bg-slate-900/30 border-slate-900 text-slate-500' 
                      : 'bg-slate-900 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isDone ? 'bg-slate-800 text-slate-600' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {index + 1}
                    </span>
                    <div>
                      <h5 className={`text-sm font-bold ${isDone ? 'line-through text-slate-600' : 'text-white'}`}>{wp.bin_code}</h5>
                      <p className="text-xs text-slate-500 font-medium">Capacity fill: {wp.fill_level.toFixed(0)}%</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {isDone ? (
                      <div className="flex items-center space-x-1 text-slate-600 text-xs font-bold px-2.5 py-1">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Collected</span>
                      </div>
                    ) : (
                      <div className="flex space-x-1.5">
                        <button 
                          onClick={() => handleOpenScanner(wp)}
                          className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 rounded-xl transition-all cursor-pointer"
                          title="Scan QR Code to Confirm"
                        >
                          <QrCode className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleManualCollection(wp)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-xl transition-all cursor-pointer"
                        >
                          Tapped Clear
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* QR Scanning Modal overlay */}
      {scanning && scanTargetBin && (
        <div className="absolute inset-0 bg-slate-950/95 z-[9999] flex flex-col justify-between p-6">
          <div className="text-center pt-8">
            <h2 className="text-lg font-bold text-white">Scan Bin Code</h2>
            <p className="text-xs text-slate-500 mt-1">Point your camera at QR on {scanTargetBin.bin_code}</p>
          </div>

          {/* HTML5 Qrcode Scan Element */}
          <div className="w-full aspect-square bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative flex items-center justify-center">
            <div id="reader" className="w-full h-full" />
          </div>

          <div className="pb-8 space-y-4">
            {/* Input weight payload */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Set Payload Collected Weight (kg)</label>
              <input 
                type="number" 
                value={manualWeight} 
                onChange={(e) => setManualWeight(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-bold"
              />
            </div>
            <button 
              onClick={() => { setScanning(false); setScanTargetBin(null); }}
              className="w-full py-3.5 bg-slate-850 hover:bg-slate-800 text-slate-400 text-sm font-bold rounded-2xl cursor-pointer transition-all"
            >
              Cancel Scan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
