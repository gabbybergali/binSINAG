"use client";

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

interface LiveMapProps {
  bins: Bin[];
  apiConnected?: boolean;
}

export default function LiveMap({ bins, apiConnected = false }: LiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        center: [14.5995, 120.9842],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

      // Light tiles (CartoDB Positron)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const binIds = new Set(bins.map(b => b.id));
    Object.keys(markersRef.current).forEach(id => {
      if (!binIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    bins.forEach(bin => {
      if (isNaN(bin.latitude) || isNaN(bin.longitude)) return;

      const fillPercent = Math.min(Math.max(bin.fill_level, 0), 100);
      
      // Status Indicator Rule:
      // 🔴 Red — Alert (>= 85% or Overflowing)
      // 🟡 Yellow — Warning (70% - 84%)
      // 🟢 Green — Normal (< 70%)
      let colorClass = 'bg-emerald-500';
      let ringColor = 'ring-emerald-400';
      let statusLabel = '🟢 Normal';

      if (bin.status === 'Overflowing' || fillPercent >= 85) {
        colorClass = 'bg-rose-500';
        ringColor = 'ring-rose-400';
        statusLabel = '🔴 Alert (Pickup Required)';
      } else if (fillPercent >= 70) {
        colorClass = 'bg-amber-500';
        ringColor = 'ring-amber-400';
        statusLabel = '🟡 Warning';
      }

      const iconHTML = `
        <div class="relative flex items-center justify-center w-8 h-8">
          <span class="absolute inline-flex h-full w-full rounded-full ${colorClass} opacity-75 ${fillPercent >= 85 ? 'animate-ping' : 'animate-pulse'}"></span>
          <span class="relative inline-flex rounded-full h-5 w-5 ${colorClass} border-2 border-white shadow-md flex items-center justify-center text-[9px] font-black text-white">
          </span>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHTML,
        className: 'custom-div-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const latLng = L.latLng(bin.latitude, bin.longitude);
      
      if (markersRef.current[bin.id]) {
        markersRef.current[bin.id].setLatLng(latLng);
        markersRef.current[bin.id].setIcon(customIcon);
      } else {
        const marker = L.marker(latLng, { icon: customIcon }).addTo(map);
        markersRef.current[bin.id] = marker;
      }

      const popupContent = `
        <div class="p-4 bg-white text-slate-800 font-sans min-w-[220px] rounded-2xl shadow-lg border border-slate-200">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
            <span class="text-xs font-black text-slate-900 tracking-wider">${bin.bin_code}</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${
              fillPercent >= 85 ? 'bg-rose-100 text-rose-800' :
              fillPercent >= 70 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
            }">${statusLabel}</span>
          </div>
          <div class="space-y-2">
            <div>
              <div class="flex justify-between items-center text-xs mb-1">
                <span class="text-slate-500 font-medium">Ultrasonic Fill Level:</span>
                <span class="font-bold text-slate-900">${fillPercent.toFixed(1)}%</span>
              </div>
              <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div class="h-full rounded-full ${
                  fillPercent >= 85 ? 'bg-rose-500' : fillPercent >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                }" style="width: ${fillPercent}%"></div>
              </div>
            </div>
            <div class="flex justify-between items-center text-xs pt-1">
              <span class="text-slate-500 font-medium">Load Weight Sensor:</span>
              <span class="font-bold text-slate-900">${bin.weight_kg.toFixed(2)} kg</span>
            </div>
            <div class="flex justify-between items-center text-xs">
              <span class="text-slate-500 font-medium">Network Status:</span>
              <span class="font-bold text-emerald-700">Online Active</span>
            </div>
            <div class="text-[9px] text-slate-400 pt-2 border-t border-slate-100 flex justify-between">
              <span>Battery Node: ${bin.battery_level.toFixed(0)}%</span>
            </div>
          </div>
        </div>
      `;
      markersRef.current[bin.id].bindPopup(popupContent, {
        className: 'custom-leaflet-popup'
      });
    });

  }, [bins]);

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden border border-slate-200 shadow-md bg-slate-100">
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {/* Top Left Label */}
      <div className="absolute top-4 left-4 z-[999] bg-white/90 backdrop-blur-md border border-slate-200 px-4 py-2.5 rounded-2xl shadow-sm">
        <h4 className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Spatial GIS Monitoring</h4>
        <p className="text-xs font-extrabold text-slate-900">Municipal Smart Bin Node Map</p>
      </div>

      {/* Top Right API Requirement & Connection Badge */}
      <div className="absolute top-4 right-4 z-[999] bg-white/90 backdrop-blur-md border border-slate-200 px-3.5 py-2 rounded-2xl shadow-sm flex items-center space-x-2">
        <span className={`h-2.5 w-2.5 rounded-full ${apiConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'}`} />
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
            {apiConnected ? 'Live API Online' : 'API Required (http://localhost:5000)'}
          </span>
          <span className="text-[9px] text-slate-400 font-semibold">
            {apiConnected ? 'REST & WebSockets Uplink Connected' : 'Live Backend API Required for Real-time GPS Uplink'}
          </span>
        </div>
      </div>
    </div>
  );
}
