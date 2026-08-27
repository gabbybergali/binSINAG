"use client";

import React from 'react';
import { Trash2, Percent, ShieldAlert, Scale } from 'lucide-react';

interface StatsGridProps {
  totalBins: number;
  avgFillLevel: number;
  alertBins: number;
  totalCollectedKg: number;
}

export default function StatsGrid({ totalBins, avgFillLevel, alertBins, totalCollectedKg }: StatsGridProps) {
  const cards = [
    {
      label: 'Deployed Smart Bins',
      value: totalBins,
      icon: Trash2,
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      borderColor: 'border-emerald-200',
      description: 'Active Monitored Nodes'
    },
    {
      label: 'Average Fill Capacity',
      value: `${avgFillLevel.toFixed(1)}%`,
      icon: Percent,
      bgColor: 'bg-teal-50',
      textColor: 'text-teal-700',
      borderColor: 'border-teal-200',
      description: 'Ultrasonic Sensor Telemetry'
    },
    {
      label: 'Critical / Red Alerts',
      value: alertBins,
      icon: ShieldAlert,
      bgColor: 'bg-rose-50',
      textColor: 'text-rose-700',
      borderColor: 'border-rose-200',
      description: 'Prioritized for Truck Pickup',
      alert: alertBins > 0
    },
    {
      label: 'Total Waste Weight',
      value: `${totalCollectedKg.toFixed(1)} kg`,
      icon: Scale,
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-800',
      borderColor: 'border-emerald-200',
      description: 'Load Cell Sensor Telemetry'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white border border-slate-200 rounded-3xl p-4 md:p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">{card.label}</span>
              <div className={`p-3 ${card.bgColor} ${card.textColor} rounded-2xl border ${card.borderColor}`}>
                <Icon className={`h-5 w-5 ${card.alert ? 'animate-bounce text-rose-600' : ''}`} />
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">{card.value}</h3>
              <p className="text-xs text-slate-500 mt-1 font-semibold">{card.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
