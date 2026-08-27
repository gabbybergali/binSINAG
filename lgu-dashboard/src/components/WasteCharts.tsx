"use client";

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { Gauge, Scale, MapPin, AlertCircle, ShieldCheck, AlertTriangle } from 'lucide-react';

interface WasteChartsProps {
  telemetryHistory: any[];
  aggregateStats: {
    total_organic: number;
    total_non_organic: number;
    total_recyclable: number;
  };
  collectionsHistory: any[];
}

const BARANGAY_FILL_DATA = [
  { barangay: 'Brgy 669', fill: 82.5, status: 'Alert' },
  { barangay: 'Brgy 402', fill: 68.0, status: 'Warning' },
  { barangay: 'Brgy 712', fill: 45.0, status: 'Normal' },
  { barangay: 'Brgy 305', fill: 28.5, status: 'Normal' },
  { barangay: 'Brgy 518', fill: 89.2, status: 'Alert' },
];

const BARANGAY_WEIGHT_DATA = [
  { barangay: 'Brgy 669', weight: 42.8 },
  { barangay: 'Brgy 402', weight: 31.4 },
  { barangay: 'Brgy 712', weight: 22.0 },
  { barangay: 'Brgy 305', weight: 15.6 },
  { barangay: 'Brgy 518', weight: 48.2 },
];

export default function WasteCharts({ telemetryHistory }: WasteChartsProps) {
  const fillTrendData = telemetryHistory.length > 0 ? telemetryHistory.map(item => ({
    time: new Date(item.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    fill: parseFloat(item.fill_level),
    weight: parseFloat(item.weight_kg)
  })) : [
    { time: '08:00 AM', fill: 35, weight: 12.4 },
    { time: '10:00 AM', fill: 48, weight: 18.2 },
    { time: '12:00 PM', fill: 62, weight: 26.8 },
    { time: '02:00 PM', fill: 75, weight: 34.1 },
    { time: '04:00 PM', fill: 84, weight: 42.5 },
    { time: '06:00 PM', fill: 55, weight: 28.0 }
  ];

  const municipalityAvgFill = Math.round(
    BARANGAY_FILL_DATA.reduce((acc, curr) => acc + curr.fill, 0) / BARANGAY_FILL_DATA.length
  );

  const municipalityAvgWeight = (
    BARANGAY_WEIGHT_DATA.reduce((acc, curr) => acc + curr.weight, 0) / BARANGAY_WEIGHT_DATA.length
  ).toFixed(1);

  return (
    <div className="space-y-8">
      {/* Bin Status Indicators Legend Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-black text-slate-800 tracking-tight">Bin Status Indicators</h4>
          <p className="text-xs text-slate-500 font-medium">Automatic thresholds based on ESP32 LoRa sensor readings</p>
        </div>

        <div className="flex items-center space-x-4 text-xs font-bold">
          <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-2xl text-emerald-800">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>🟢 Green — Normal (&lt;70%)</span>
          </div>

          <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-2xl text-amber-800">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span>🟡 Yellow — Warning (70-85%)</span>
          </div>

          <div className="flex items-center space-x-2 bg-rose-50 border border-rose-200 px-3.5 py-2 rounded-2xl text-rose-800">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <span>🔴 Red — Alert (&ge;85% Pickup Priority)</span>
          </div>
        </div>
      </div>

      {/* A. Bin Fill-Level Analytics Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-emerald-900">
          <Gauge className="h-5 w-5 text-emerald-600" />
          <h3 className="text-base font-extrabold tracking-tight">A. Bin Fill-Level Analytics</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Municipality-Wide Fill Level */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Municipality-Wide</span>
              <h4 className="text-lg font-black text-slate-800 mt-1">Average Bin Fill Level</h4>
              <p className="text-xs text-slate-500 mt-1">Across all monitored municipal smart bins</p>
            </div>

            <div className="my-6 text-center">
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-36 h-36">
                  <circle cx="72" cy="72" r="60" stroke="#f1f5f9" strokeWidth="14" fill="transparent" />
                  <circle
                    cx="72"
                    cy="72"
                    r="60"
                    stroke="#059669"
                    strokeWidth="14"
                    fill="transparent"
                    strokeDasharray={377}
                    strokeDashoffset={377 - (377 * municipalityAvgFill) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-black text-slate-900">{municipalityAvgFill}%</span>
                  <span className="text-[9px] font-bold text-emerald-600 uppercase">Avg Capacity</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center font-medium bg-slate-50 py-2 rounded-xl border border-slate-100">
              Optimal operating range maintained across 78% of nodes.
            </p>
          </div>

          {/* Barangay Fill Level Chart */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Barangay Breakdown</span>
                <h4 className="text-base font-extrabold text-slate-800">Average Bin Fill Level per Barangay</h4>
              </div>
              <MapPin className="h-5 w-5 text-emerald-600" />
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={BARANGAY_FILL_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="barangay" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="fill" name="Fill Level (%)" radius={[8, 8, 0, 0]} barSize={40}>
                    {BARANGAY_FILL_DATA.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.fill >= 80 ? '#ef4444' : entry.fill >= 65 ? '#f59e0b' : '#10b981'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* B. Waste Weight Analytics Section */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center space-x-2 text-emerald-900">
          <Scale className="h-5 w-5 text-emerald-600" />
          <h3 className="text-base font-extrabold tracking-tight">B. Waste Weight Analytics</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Municipality-Wide Waste Weight */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Municipality-Wide</span>
              <h4 className="text-lg font-black text-slate-800 mt-1">Average Waste Weight</h4>
              <p className="text-xs text-slate-500 mt-1">Load cell weight sensor telemetry</p>
            </div>

            <div className="my-6 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-3xl p-6 text-center">
              <span className="text-4xl font-black text-emerald-900 tracking-tight">{municipalityAvgWeight}</span>
              <span className="text-base font-bold text-emerald-700 ml-1">kg / bin</span>
              <p className="text-xs text-slate-500 font-semibold mt-2">Overall Municipal Avg Weight Load</p>
            </div>

            <p className="text-xs text-slate-500 text-center font-medium bg-slate-50 py-2 rounded-xl border border-slate-100">
              Total Weight Monitored: <span className="font-bold text-slate-800">1,254.5 kg</span>
            </p>
          </div>

          {/* Barangay Waste Weight Chart */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Barangay Weight Comparison</span>
                <h4 className="text-base font-extrabold text-slate-800">Average Waste Weight per Barangay (kg)</h4>
              </div>
              <Scale className="h-5 w-5 text-emerald-600" />
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={BARANGAY_WEIGHT_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="barangay" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="weight" name="Avg Weight (kg)" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#colorWeight)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
