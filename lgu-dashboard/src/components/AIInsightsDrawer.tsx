"use client";

import { Sparkles, X, Brain, AlertTriangle, TrendingUp, CheckCircle2, ArrowRight, Lightbulb } from 'lucide-react';

interface AIInsightsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  avgFillLevel: number;
  alertBinsCount: number;
}

export default function AIInsightsDrawer({ isOpen, onClose, avgFillLevel, alertBinsCount }: AIInsightsDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
      <div 
        className="w-full max-w-md bg-white h-full shadow-2xl border-l border-emerald-100 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 text-white flex items-center justify-between sticky top-0 z-10 shadow-md">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl">
              <Brain className="h-6 w-6 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">AI Waste Insights</h2>
              <p className="text-xs text-emerald-100 font-medium">Real-Time Sensor Telemetry Intelligence</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer"
            title="Close AI Insights"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Status Badge */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center space-x-3">
            <Sparkles className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-900 font-semibold leading-relaxed">
              AI Engine analyzed real-time data across monitored municipal smart bins.
            </p>
          </div>

          {/* AI Summary Section */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-emerald-800">
              <Brain className="h-4.5 w-4.5 text-emerald-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider">AI Waste Summary</h3>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-start space-x-3">
                <AlertTriangle className={`h-5 w-5 ${alertBinsCount > 0 ? 'text-amber-500' : 'text-emerald-500'} shrink-0 mt-0.5`} />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Current Accumulation Level</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Municipality average fill level is <span className="font-bold text-emerald-700">{avgFillLevel.toFixed(1)}%</span>. 
                    {alertBinsCount > 0 
                      ? ` ${alertBinsCount} bin(s) have passed the 80% collection threshold and require immediate pickup.` 
                      : ' All bins currently operating within normal capacity thresholds.'}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3 flex items-start space-x-3">
                <TrendingUp className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">High-Waste Barangay Focus</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    <span className="font-bold text-slate-900">Barangay 669</span> shows an unusual +34% spike in organic and recyclable waste generation during weekend peak hours.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Smart Recommendations Section */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-emerald-800">
              <Lightbulb className="h-4.5 w-4.5 text-emerald-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Smart Recommendations</h3>
            </div>

            <div className="space-y-3">
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 flex items-start space-x-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">Dispatch Pickup Route #1</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Dispatch Truck Driver to <span className="font-bold text-emerald-800">BIN-MNL-002</span> & <span className="font-bold text-emerald-800">BIN-MNL-005</span> first to prevent overflow before 6:00 PM.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-start space-x-3 shadow-sm">
                <ArrowRight className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Adjust Frequency Schedule</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Increase collection frequency in commercial zones of <span className="font-bold text-slate-800">Barangay 402</span> from 2x to 3x weekly based on historical sensor patterns.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-start space-x-3 shadow-sm">
                <Sparkles className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Citizen Incentive Drive</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Launch a 2x Bonus Points event for i-Segregate! in <span className="font-bold text-slate-800">Barangay 305</span> to boost community compliance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-600/20"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
}
