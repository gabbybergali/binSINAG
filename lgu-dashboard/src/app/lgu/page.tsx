"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { io, Socket } from 'socket.io-client';
import { Zap, RefreshCw, LogOut, Brain, Sparkles, Cpu } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import StatsGrid from '../../components/StatsGrid';
import AlertsPanel from '../../components/AlertsPanel';
import WasteCharts from '../../components/WasteCharts';
import AIInsightsDrawer from '../../components/AIInsightsDrawer';

// Dynamically import Leaflet Map (SSR disabled)
const LiveMap = dynamic(() => import('../../components/LiveMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[520px] rounded-3xl border border-slate-200 bg-slate-100 flex flex-col items-center justify-center text-slate-500">
      <RefreshCw className="h-8 w-8 animate-spin text-emerald-600 mb-3" />
      <span className="text-xs font-bold tracking-wider">Loading Spatial GIS Tiles...</span>
    </div>
  )
});

interface Bin {
  id: string;
  bin_code: string;
  latitude: number;
  longitude: number;
  fill_level: number;
  weight_kg: number;
  battery_level: number;
  status: string;
  last_telemetry_at?: string;
}

const MOCK_BINS: Bin[] = [
  { id: '1', bin_code: 'BIN-MNL-001', latitude: 14.5995, longitude: 120.9842, fill_level: 45.5, weight_kg: 18.2, battery_level: 98, status: 'Normal', last_telemetry_at: new Date().toISOString() },
  { id: '2', bin_code: 'BIN-MNL-002', latitude: 14.6015, longitude: 120.9892, fill_level: 86.3, weight_kg: 38.5, battery_level: 89, status: 'Overflowing', last_telemetry_at: new Date().toISOString() },
  { id: '3', bin_code: 'BIN-MNL-003', latitude: 14.5935, longitude: 120.9752, fill_level: 12.0, weight_kg: 4.8, battery_level: 92, status: 'Normal', last_telemetry_at: new Date().toISOString() },
  { id: '4', bin_code: 'BIN-MNL-004', latitude: 14.6075, longitude: 120.9822, fill_level: 74.0, weight_kg: 29.4, battery_level: 78, status: 'Warning', last_telemetry_at: new Date().toISOString() },
  { id: '5', bin_code: 'BIN-MNL-005', latitude: 14.5885, longitude: 120.9922, fill_level: 92.0, weight_kg: 48.0, battery_level: 74, status: 'Overflowing', last_telemetry_at: new Date().toISOString() }
];

export default function LGUDashboardRoute() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('analytics');
  const [bins, setBins] = useState<Bin[]>(MOCK_BINS);
  const [connected, setConnected] = useState<boolean>(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState<boolean>(false);
  const [wasteStats, setWasteStats] = useState({
    total_organic: 342,
    total_non_organic: 512,
    total_recyclable: 894,
    total_collections: 48,
    total_weight_collected_kg: 1254.5
  });

  const BACKEND_URL = 'http://localhost:5000';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const binsRes = await fetch(`${BACKEND_URL}/api/v1/bins`);
        if (binsRes.ok) {
          const binsData = await binsRes.json();
          if (binsData.length > 0) setBins(binsData);
        }

        const statsRes = await fetch(`${BACKEND_URL}/api/v1/analytics/waste-stats`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setWasteStats({
            total_organic: statsData.telemetry_aggregates.total_organic,
            total_non_organic: statsData.telemetry_aggregates.total_non_organic,
            total_recyclable: statsData.telemetry_aggregates.total_recyclable,
            total_collections: statsData.collection_aggregates.total_collections,
            total_weight_collected_kg: statsData.collection_aggregates.total_weight_collected_kg
          });
        }
      } catch (err) {
        console.warn('Backend offline. Running dashboard in mock/demo mode:', err);
      }
    };

    fetchData();

    const socket: Socket = io(BACKEND_URL, {
      transports: ['websocket'],
      autoConnect: true
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('bin:telemetry', (updatedBin: any) => {
      setBins(prevBins => {
        const idx = prevBins.findIndex(b => b.id === updatedBin.bin_id || b.bin_code === updatedBin.bin_code);
        if (idx !== -1) {
          const newBins = [...prevBins];
          newBins[idx] = {
            ...newBins[idx],
            fill_level: updatedBin.fill_level,
            weight_kg: updatedBin.weight_kg,
            battery_level: updatedBin.battery_level,
            status: updatedBin.status,
            last_telemetry_at: updatedBin.timestamp
          };
          return newBins;
        }
        return prevBins;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const totalBins = bins.length;
  const avgFillLevel = bins.reduce((acc, bin) => acc + bin.fill_level, 0) / (totalBins || 1);
  const alertsList = bins.filter(bin => bin.fill_level >= 70 || bin.status === 'Overflowing' || bin.battery_level < 20);
  const alertBinsCount = bins.filter(bin => bin.fill_level >= 80 || bin.status === 'Overflowing').length;

  const handleSimulateUplink = () => {
    const randomIdx = Math.floor(Math.random() * bins.length);
    const targetBin = bins[randomIdx];
    const newFill = Math.min(targetBin.fill_level + 15, 100);
    const newWeight = targetBin.weight_kg + 3.5;
    
    setBins(prevBins => {
      const copy = [...prevBins];
      copy[randomIdx] = {
        ...targetBin,
        fill_level: newFill,
        weight_kg: newWeight,
        status: newFill >= 80 ? 'Overflowing' : targetBin.status,
        last_telemetry_at: new Date().toISOString()
      };
      return copy;
    });

    setWasteStats(prev => ({
      ...prev,
      total_recyclable: prev.total_recyclable + 5
    }));
  };

  const handleSimulateCollection = (binId: string) => {
    setBins(prevBins => {
      return prevBins.map(b => {
        if (b.id === binId) {
          return {
            ...b,
            fill_level: 0,
            weight_kg: 0,
            status: 'Normal',
            last_telemetry_at: new Date().toISOString()
          };
        }
        return b;
      });
    });

    setWasteStats(prev => ({
      ...prev,
      total_collections: prev.total_collections + 1,
      total_weight_collected_kg: prev.total_weight_collected_kg + 25.5
    }));
  };

  const handleLogout = () => {
    router.push('/');
  };

  return (
    <div className="flex bg-slate-50 min-h-screen text-slate-900 font-sans relative flex-col md:flex-row">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} alertCount={alertBinsCount} />

      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto h-screen">
        {/* Top Header & Menu Ribbon */}
        <header className="bg-white border border-slate-200 rounded-3xl p-4 md:p-5 mb-6 md:mb-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 z-10">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center space-x-3">
              <img src="/binsinag-logo.png" alt="binSINAG Logo" className="md:hidden h-8 w-auto object-contain" />
              <div>
                <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">LGU Command Dashboard</h2>
                <p className="text-[10px] md:text-xs text-slate-500 font-medium mt-0.5">BinSINAG Smart Solid Waste Management Network</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="md:hidden p-2 text-rose-600 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          {/* Menu Ribbon & Far-Right AI Insights Button */}
          <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 p-1.5 rounded-2xl">
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                  activeTab === 'analytics' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('map')}
                className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                  activeTab === 'map' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Live Map
              </button>
            </div>

            <div className="flex items-center space-x-2">
              {/* Trigger Telemetry */}
              <button 
                onClick={handleSimulateUplink}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-all cursor-pointer border border-slate-200"
                title="Simulate Uplink"
              >
                <Zap className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Uplink</span>
              </button>

              {/* FAR RIGHT AI INSIGHTS BUTTON */}
              <button 
                onClick={() => setAiDrawerOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold rounded-2xl transition-all cursor-pointer shadow-md shadow-emerald-600/20 border border-emerald-500 animate-pulse"
                title="Click for AI Insights"
              >
                <Brain className="h-4 w-4 text-white" />
                <span>AI Insights</span>
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              </button>

              <button 
                onClick={handleLogout}
                className="p-2 bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-900 rounded-2xl transition-all cursor-pointer"
                title="Logout"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Metric Cards Grid */}
        <StatsGrid 
          totalBins={totalBins} 
          avgFillLevel={avgFillLevel} 
          alertBins={alertBinsCount} 
          totalCollectedKg={wasteStats.total_weight_collected_kg} 
        />

        {/* Tab 1: Analytics (Default Page View) */}
        {activeTab === 'analytics' && (
          <WasteCharts 
            telemetryHistory={[]} 
            aggregateStats={wasteStats} 
            collectionsHistory={[]} 
          />
        )}

        {/* Tab 2: Live GIS Map */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            <LiveMap bins={bins} apiConnected={connected} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <AlertsPanel alerts={alertsList} />
              </div>

              {/* Hardware Microcontroller Status */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-emerald-800">
                    <Cpu className="h-5 w-5 text-emerald-600" />
                    <h3 className="text-base font-extrabold text-slate-900">Smart Bin Node Status</h3>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1">Real-time network node telemetry</p>
                </div>

                <div className="space-y-3 my-4">
                  {bins.map((bin) => {
                    const isOnline = bin.battery_level >= 15;
                    return (
                      <div key={bin.id} className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center space-x-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                          <span className="font-extrabold text-slate-800">{bin.bin_code}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isOnline 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-[10px] text-slate-400 font-semibold text-center">
                  Ultrasonic & Weight sensors auto-uplink telemetry every 5 mins
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Active Alerts */}
        {activeTab === 'alerts' && (
          <AlertsPanel alerts={alertsList} />
        )}
      </main>

      {/* AI Insights Hover Drawer Component */}
      <AIInsightsDrawer 
        isOpen={aiDrawerOpen} 
        onClose={() => setAiDrawerOpen(false)}
        avgFillLevel={avgFillLevel}
        alertBinsCount={alertBinsCount}
      />
    </div>
  );
}
