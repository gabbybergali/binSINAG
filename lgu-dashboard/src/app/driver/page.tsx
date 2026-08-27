"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { 
  Wifi, 
  WifiOff, 
  CheckCircle2, 
  QrCode, 
  RotateCw, 
  Compass,
  Database,
  RefreshCw,
  LogOut,
  Fuel,
  Navigation,
  Sparkles,
  Leaf,
  Zap,
  Layers,
  CornerUpRight
} from 'lucide-react';
import { db, type OfflineCollection } from '../../db/indexedDB';
import { 
  fetchRealWorldRoadRoute, 
  optimizeBinSequence, 
  type BinNode, 
  type AIRoutingStrategy, 
  type RouteManeuver 
} from '../../services/aiRoutingEngine';

// Dynamically import DriverMap (SSR disabled)
const DriverMap = dynamic(() => import('../../components/DriverMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center text-slate-500">
      <RefreshCw className="h-6 w-6 animate-spin text-emerald-600 mb-2" />
      <span className="text-[10px] font-extrabold">Loading Real-World GIS Map...</span>
    </div>
  )
});

export default function DriverRoutePortal() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [aiStrategy, setAiStrategy] = useState<AIRoutingStrategy>('balanced');
  const [roadGeometry, setRoadGeometry] = useState<[number, number][]>([]);
  const [maneuvers, setManeuvers] = useState<RouteManeuver[]>([]);
  const [routeMetrics, setRouteMetrics] = useState({
    distanceKm: 5.8,
    durationMins: 22,
    fuelSavedLiters: 2.1,
    co2SavedKg: 5.6
  });

  const [waypoints, setWaypoints] = useState<BinNode[]>([
    { id: '2', bin_code: 'BIN-MNL-002', latitude: 14.6015, longitude: 120.9892, fill_level: 95.0, weight_kg: 45.2, status: 'Overflowing' },
    { id: '5', bin_code: 'BIN-MNL-005', latitude: 14.5885, longitude: 120.9922, fill_level: 88.0, weight_kg: 40.8, status: 'Overflowing' },
    { id: '4', bin_code: 'BIN-MNL-004', latitude: 14.6075, longitude: 120.9822, fill_level: 74.0, weight_kg: 29.4, status: 'Warning' },
    { id: '1', bin_code: 'BIN-MNL-001', latitude: 14.5995, longitude: 120.9842, fill_level: 45.5, weight_kg: 18.2, status: 'Normal' }
  ]);

  const [completedBins, setCompletedBins] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState<boolean>(false);
  const [outboxCount, setOutboxCount] = useState<number>(0);
  const [optimizing, setOptimizing] = useState<boolean>(false);

  // QR Scanning state
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanTargetBin, setScanTargetBin] = useState<BinNode | null>(null);
  const [manualWeight, setManualWeight] = useState<string>('15.0');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      triggerOutboxSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    updateOutboxCount();
    // Run initial AI real-world routing
    runAIRouting(aiStrategy);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updateOutboxCount = async () => {
    const count = await db.outbox.count();
    setOutboxCount(count);
  };

  // Run AI Route Optimization and OSRM Real-World Road Fetching
  const runAIRouting = async (strategyToUse: AIRoutingStrategy) => {
    setOptimizing(true);
    setAiStrategy(strategyToUse);

    const depotLat = 14.5995;
    const depotLon = 120.9842;

    // 1. AI TSP Model sequence optimization
    const ordered = optimizeBinSequence(depotLat, depotLon, waypoints, strategyToUse);
    setWaypoints(ordered);

    // 2. Fetch OSRM real-world road geometry & turn maneuvers
    const result = await fetchRealWorldRoadRoute(depotLat, depotLon, ordered, strategyToUse);

    setRoadGeometry(result.roadGeometry);
    setManeuvers(result.maneuvers);
    setRouteMetrics({
      distanceKm: parseFloat((result.totalDistanceMeters / 1000).toFixed(1)),
      durationMins: Math.round(result.totalDurationSec / 60),
      fuelSavedLiters: result.fuelSavedLiters,
      co2SavedKg: result.co2SavedKg
    });

    setOptimizing(false);
  };

  const triggerOutboxSync = async () => {
    if (!navigator.onLine) return;
    const count = await db.outbox.count();
    if (count === 0) return;

    setSyncing(true);
    const pending = await db.outbox.toArray();
    let successfulSyncs = 0;

    for (const item of pending) {
      try {
        const res = await fetch(`http://localhost:5000/api/v1/collections/record`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bin_id: item.bin_id,
            verification_method: item.verification_method,
            weight_collected_kg: item.weight_collected_kg,
            fill_level_before: item.fill_level_before
          })
        });
        if (res.ok && item.id) {
          await db.outbox.delete(parseInt(item.id));
          successfulSyncs++;
        }
      } catch (err) {
        console.warn("Offline sync upload failed:", err);
      }
    }

    setSyncing(false);
    updateOutboxCount();
    if (successfulSyncs > 0) {
      alert(`Synced ${successfulSyncs} offline collections successfully!`);
    }
  };

  const handleOpenScanner = (bin: BinNode) => {
    setScanTargetBin(bin);
    setScanning(true);

    setTimeout(async () => {
      try {
        const { Html5QrcodeScanner } = await import('html5-qrcode');
        const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
        scanner.render(
          async (decodedText) => {
            if (decodedText.includes(bin.bin_code)) {
              scanner.clear();
              setScanning(false);
              recordCollectionSuccess(bin, 'QR_SCAN');
            } else {
              alert(`QR Code mismatch! Expected: ${bin.bin_code}, Got: ${decodedText}`);
            }
          },
          () => {}
        );
      } catch (e) {
        console.error("Scanner error:", e);
      }
    }, 200);
  };

  const handleManualCollection = (bin: BinNode) => {
    recordCollectionSuccess(bin, 'MANUAL_TAP');
  };

  const recordCollectionSuccess = async (bin: BinNode, method: 'QR_SCAN' | 'MANUAL_TAP') => {
    const weight = parseFloat(manualWeight) || 15.0;
    const collectionLog: OfflineCollection = {
      bin_id: bin.id,
      bin_code: bin.bin_code,
      verification_method: method,
      weight_collected_kg: weight,
      fill_level_before: bin.fill_level,
      timestamp: new Date().toISOString()
    };

    try {
      await db.outbox.add(collectionLog);
      updateOutboxCount();
    } catch (err) {
      console.warn("Local storage error:", err);
    }

    setCompletedBins(prev => new Set([...prev, bin.id]));
    alert(`Collection recorded for ${bin.bin_code}!`);
  };

  const handleLogout = () => {
    router.push('/');
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900 font-sans max-w-md mx-auto flex flex-col justify-between border-x border-slate-200 shadow-xl relative pb-10">
      
      {/* Header bar */}
      <header className="p-4 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-[1000] shadow-xs">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm">
            <Compass className="h-4.5 w-4.5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900">Real-World Road Routing</h1>
            <p className="text-[9px] text-emerald-700 font-bold">Smart Navigation System</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[9px] font-black border ${
            isOnline 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800 animate-pulse'
          }`}>
            {isOnline ? <Wifi className="h-3 w-3 text-emerald-600" /> : <WifiOff className="h-3 w-3 text-rose-600" />}
            <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </div>

          <button 
            onClick={handleLogout}
            className="p-1.5 bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-900 rounded-xl transition-all cursor-pointer"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-4 space-y-5 overflow-y-auto">
        
        {/* Outbox count banner */}
        {outboxCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 text-amber-600 animate-bounce" />
              <span className="text-xs font-bold">{outboxCount} collections queued in outbox</span>
            </div>
            {isOnline && (
              <button 
                onClick={triggerOutboxSync}
                disabled={syncing}
                className="text-[9px] bg-amber-600 text-white font-black px-2.5 py-1.5 rounded-lg cursor-pointer shadow-xs"
              >
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
          </div>
        )}

        {/* AI Routing Model Selector Header */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center space-x-1.5">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">AI Optimization Strategy</h3>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {optimizing ? 'Calculating Real Roads...' : 'OSRM Snapped'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => runAIRouting('eco')}
              className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                aiStrategy === 'eco' 
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' 
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Leaf className="h-4 w-4 mb-1" />
              <span className="text-[10px] font-black leading-tight">Eco-Fuel Saver</span>
            </button>

            <button
              onClick={() => runAIRouting('critical')}
              className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                aiStrategy === 'critical' 
                  ? 'bg-rose-600 text-white border-rose-600 shadow-md' 
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Zap className="h-4 w-4 mb-1" />
              <span className="text-[10px] font-black leading-tight">Critical Red Bins</span>
            </button>

            <button
              onClick={() => runAIRouting('balanced')}
              className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                aiStrategy === 'balanced' 
                  ? 'bg-teal-700 text-white border-teal-700 shadow-md' 
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Layers className="h-4 w-4 mb-1" />
              <span className="text-[10px] font-black leading-tight">Balanced Hybrid</span>
            </button>
          </div>
        </div>

        {/* Real-World Road Map Viewport */}
        <div className="w-full h-64 rounded-3xl overflow-hidden border border-slate-200 bg-slate-100 relative shadow-sm">
          <DriverMap 
            waypoints={waypoints} 
            completedBins={completedBins} 
            roadGeometry={roadGeometry} 
          />

          <div className="absolute bottom-3 left-3 z-[999] bg-white/90 backdrop-blur-md border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs flex items-center space-x-3 text-[10px] font-black text-slate-800">
            <span className="flex items-center space-x-1">
              <span>🛣️</span>
              <span>OSRM Real Roads</span>
            </span>
            <span className="flex items-center space-x-1">
              <span>🔴</span>
              <span>Full (&ge;75%)</span>
            </span>
          </div>
        </div>

        {/* Step-by-Step Turn Directions */}
        {maneuvers.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
              <CornerUpRight className="h-4 w-4 text-emerald-600" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Turn-by-Turn Navigation</h3>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {maneuvers.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-5 h-5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-extrabold text-slate-800">{m.instruction}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold shrink-0 pl-2">
                    {m.distance_meters}m
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Real Road Metrics & Fuel Savings */}
        <div className="bg-white border border-slate-200 p-4 rounded-3xl shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center space-x-2 text-emerald-800">
              <Fuel className="h-4.5 w-4.5 text-emerald-600" />
              <h3 className="text-xs font-black uppercase tracking-wider">Real Road Metrics & Fuel Savings</h3>
            </div>
            <button 
              onClick={() => runAIRouting(aiStrategy)} 
              className="text-slate-400 hover:text-emerald-700 p-1"
              title="Recalculate Route"
            >
              <RotateCw className={`h-3.5 w-3.5 ${optimizing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-emerald-50/60 border border-emerald-100 p-3 rounded-2xl">
              <span className="text-[9px] font-bold text-emerald-700 uppercase block mb-0.5">Real Road Distance</span>
              <p className="text-lg font-black text-slate-900">{routeMetrics.distanceKm} km</p>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-100 p-3 rounded-2xl">
              <span className="text-[9px] font-bold text-emerald-700 uppercase block mb-0.5">Driving Duration</span>
              <p className="text-lg font-black text-slate-900">{routeMetrics.durationMins} mins</p>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-100 p-3 rounded-2xl">
              <span className="text-[9px] font-bold text-emerald-700 uppercase block mb-0.5">Fuel Saved</span>
              <p className="text-lg font-black text-emerald-700">{routeMetrics.fuelSavedLiters} L</p>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-100 p-3 rounded-2xl">
              <span className="text-[9px] font-bold text-emerald-700 uppercase block mb-0.5">CO2 Avoided</span>
              <p className="text-lg font-black text-teal-800">{routeMetrics.co2SavedKg} kg</p>
            </div>
          </div>
        </div>

        {/* Optimized Waypoint Sequence List */}
        <div className="space-y-3">
          <h4 className="text-[10px] uppercase font-black text-slate-500 tracking-widest pl-1">AI Optimized Visiting Sequence</h4>
          {waypoints.map((wp, index) => {
            const isDone = completedBins.has(wp.id);
            const isFull = wp.fill_level >= 75;

            return (
              <div 
                key={wp.id} 
                className={`border rounded-2xl p-4 flex items-center justify-between transition-all ${
                  isDone 
                    ? 'bg-slate-100 border-slate-200 text-slate-400' 
                    : isFull 
                    ? 'bg-rose-50/60 border-rose-200 text-slate-800'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                    isDone ? 'bg-slate-300 text-slate-600' : isFull ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {index + 1}
                  </span>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <h5 className={`text-sm font-extrabold ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>{wp.bin_code}</h5>
                      <span className="text-[10px] font-bold">{isFull ? '🔴 Ready' : '⚪ Normal'}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Capacity: {wp.fill_level.toFixed(0)}% • {wp.weight_kg} kg</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {isDone ? (
                    <div className="flex items-center space-x-1 text-emerald-700 text-xs font-bold bg-emerald-100 px-2.5 py-1 rounded-xl">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Done</span>
                    </div>
                  ) : (
                    <div className="flex space-x-1.5">
                      <button 
                        onClick={() => handleOpenScanner(wp)}
                        className="p-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl transition-all cursor-pointer shadow-xs"
                        title="Scan QR Code"
                      >
                        <QrCode className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleManualCollection(wp)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 text-[10px] font-bold rounded-xl border border-slate-200 transition-all cursor-pointer"
                      >
                        Clear Bin
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* QR Scanning Modal overlay */}
      {scanning && scanTargetBin && (
        <div className="absolute inset-0 bg-slate-900/95 z-[9999] flex flex-col justify-between p-6 text-white">
          <div className="text-center pt-8">
            <h2 className="text-lg font-black">Scan Bin Code</h2>
            <p className="text-xs text-slate-300 mt-1">Point camera at QR code on {scanTargetBin.bin_code}</p>
          </div>

          <div className="w-full aspect-square bg-slate-800 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl relative flex items-center justify-center">
            <div id="reader" className="w-full h-full" />
          </div>

          <div className="pb-8 space-y-4">
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl">
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Payload Weight Collected (kg)</label>
              <input 
                type="number" 
                value={manualWeight} 
                onChange={(e) => setManualWeight(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold"
              />
            </div>
            <button 
              onClick={() => { setScanning(false); setScanTargetBin(null); }}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold rounded-2xl cursor-pointer transition-all border border-slate-700"
            >
              Cancel Scan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
