"use client";

import React from 'react';
import { AlertOctagon, BatteryWarning, ShieldAlert, Navigation } from 'lucide-react';

interface AlertItem {
  id: string;
  bin_code: string;
  fill_level: number;
  battery_level: number;
  status: string;
  tamper_alert?: boolean;
  sensor_fault?: boolean;
}

interface AlertsPanelProps {
  alerts: AlertItem[];
  onLocateBin?: (latitude: number, longitude: number) => void;
}

export default function AlertsPanel({ alerts, onLocateBin }: AlertsPanelProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">Active System Alerts</h3>
          <p className="text-xs text-slate-500 font-medium">Critical thresholds & diagnostic alarms</p>
        </div>
        <span className={`px-3 py-1 text-xs font-bold rounded-full ${
          alerts.length > 0 ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-600'
        }`}>
          {alerts.length} Incidents Active
        </span>
      </div>

      {alerts.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400">
          <AlertOctagon className="h-10 w-10 text-emerald-500 mb-3 animate-pulse" />
          <p className="text-sm font-bold text-slate-700">All smart bins operating normally</p>
          <p className="text-xs text-slate-500 mt-1">No threshold breaches or faults registered</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
          {alerts.map((alert) => {
            const isOverflow = alert.fill_level >= 80 || alert.status === 'Overflowing';
            const isBatteryLow = alert.battery_level < 20;
            const isTampered = alert.tamper_alert;

            return (
              <div 
                key={alert.id}
                className="bg-slate-50 border border-rose-200/60 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:bg-white hover:shadow-md"
              >
                <div className="flex items-start space-x-3.5">
                  <div className={`p-2.5 rounded-2xl ${
                    isTampered ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                    isBatteryLow ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                    'bg-rose-100 text-rose-700 border border-rose-200'
                  }`}>
                    {isTampered ? <ShieldAlert className="h-5.5 w-5.5" /> : 
                     isBatteryLow ? <BatteryWarning className="h-5.5 w-5.5" /> :
                     <AlertOctagon className="h-5.5 w-5.5" />}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-extrabold text-slate-900 tracking-wider">{alert.bin_code}</h4>
                      <span className="text-[10px] text-slate-400 font-semibold">• Real-Time Telemetry</span>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {isOverflow && (
                        <span className="bg-rose-100 border border-rose-200 text-rose-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg">
                          🔴 Alert Threshold ({alert.fill_level.toFixed(1)}%)
                        </span>
                      )}
                      {isBatteryLow && (
                        <span className="bg-amber-100 border border-amber-200 text-amber-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg">
                          Low Battery ({alert.battery_level.toFixed(0)}%)
                        </span>
                      )}
                      {isTampered && (
                        <span className="bg-purple-100 border border-purple-200 text-purple-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg">
                          Tamper Alarm Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end md:self-center">
                  <button 
                    onClick={() => onLocateBin && onLocateBin(0, 0)}
                    className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl hover:bg-emerald-600 hover:text-white transition-all cursor-pointer shadow-xs"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    <span>Locate Bin</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
