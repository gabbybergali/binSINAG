"use client";

import React from 'react';
import { BarChart3, Map, Bell, Trash2, Award, User, Sparkles } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  alertCount: number;
}

export default function Sidebar({ activeTab, setActiveTab, alertCount }: SidebarProps) {
  const menuItems = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'map', label: 'Live Bin Map', icon: Map },
    { id: 'alerts', label: 'Active Alerts', icon: Bell, badge: alertCount > 0 ? alertCount : undefined },
  ];

  return (
    <>
      {/* Desktop Sidebar (hidden on small mobile screens) */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col justify-between text-slate-700 h-screen sticky top-0 shadow-sm z-20 shrink-0">
        <div>
          {/* Brand / Logo */}
          <div className="p-4 border-b border-slate-100 flex items-center space-x-3">
            <img src="/binsinag-logo.png" alt="binSINAG Logo" className="h-10 w-auto object-contain drop-shadow-xs" />
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">binSINAG</h1>
              <p className="text-[10px] text-emerald-700 uppercase tracking-widest font-extrabold mt-0.5">LGU Command Center</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-200 group cursor-pointer ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold shadow-sm'
                      : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-transparent font-medium'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-5 w-5 ${isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-600'}`} />
                    <span className="text-sm tracking-tight">{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="bg-rose-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full animate-bounce">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Session profile block */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center space-x-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="h-9 w-9 bg-emerald-600 border border-emerald-500 rounded-xl flex items-center justify-center text-white font-bold shadow-sm shrink-0">
              <User className="h-4 w-4" />
            </div>
            <div className="truncate">
              <h4 className="text-xs font-black text-slate-900">Juan Palad</h4>
              <p className="text-[10px] text-emerald-700 font-bold">Municipal Officer</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (visible only on mobile viewports) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-around p-2 z-50 shadow-lg">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl relative transition-all ${
                isActive ? 'text-emerald-600 font-black' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="h-5 w-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
              {item.badge !== undefined && (
                <span className="absolute top-1 right-2 bg-rose-500 text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center animate-pulse">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
