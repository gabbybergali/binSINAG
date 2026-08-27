"use client";

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Waypoint {
  id: string;
  bin_code: string;
  latitude: number;
  longitude: number;
  fill_level: number;
  weight_kg: number;
}

interface DriverMapProps {
  waypoints: Waypoint[];
  completedBins: Set<string>;
  roadGeometry?: [number, number][];
}

export default function DriverMap({ waypoints, completedBins, roadGeometry }: DriverMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const MAP_TILES = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        center: [14.5995, 120.9842],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer(MAP_TILES, {
        attribution: ''
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

    // Clear old markers & polylines
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }

    if (waypoints.length === 0) return;

    // Depot HQ start marker
    const depotIcon = L.divIcon({
      html: `<div class="w-7 h-7 rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center shadow-lg"><span class="text-[10px] font-black text-white">HQ</span></div>`,
      className: 'custom-depot-marker',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
    const depotMarker = L.marker([14.5995, 120.9842], { icon: depotIcon }).addTo(map);
    markersRef.current.push(depotMarker);

    // Plot waypoint pins with 🔴 Red (Full) and ⚪ Grey (Not Full) icons
    waypoints.forEach((wp, index) => {
      const isDone = completedBins.has(wp.id);
      const isFull = wp.fill_level >= 75 || !isDone;

      let markerBg = isFull ? 'bg-rose-600' : 'bg-slate-300';
      let ringBg = isFull ? 'bg-rose-500' : 'bg-slate-200';
      let textColor = isFull ? 'text-white' : 'text-slate-700';

      if (isDone) {
        markerBg = 'bg-emerald-500';
        ringBg = 'bg-emerald-400';
        textColor = 'text-white';
      }

      const pinIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center w-8 h-8">
            <span class="absolute inline-flex h-full w-full rounded-full ${ringBg} ${isFull && !isDone ? 'animate-ping' : ''} opacity-40"></span>
            <div class="w-7 h-7 rounded-full ${markerBg} border-2 border-white flex items-center justify-center text-[10px] font-extrabold ${textColor} shadow-md">
              ${isDone ? '✓' : isFull ? '🔴' : '⚪'}
            </div>
          </div>
        `,
        className: 'custom-wp-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([wp.latitude, wp.longitude], { icon: pinIcon }).addTo(map);
      marker.bindPopup(`
        <div class="p-2 bg-white text-slate-800 text-xs font-sans rounded-xl border border-slate-200">
          <strong class="text-slate-900 font-bold block mb-1">${wp.bin_code} (Stop #${index + 1})</strong>
          <span class="text-slate-500">Fill: <strong>${wp.fill_level}%</strong> (${isFull ? '🔴 Pickup Required' : '⚪ Capacity Available'})</span>
        </div>
      `);
      markersRef.current.push(marker);
    });

    // Render real-world road geometry polyline (snapped to real streets)
    let polylineCoords: L.LatLngExpression[] = [];

    if (roadGeometry && roadGeometry.length > 0) {
      polylineCoords = roadGeometry.map(pt => [pt[0], pt[1]]);
    } else {
      polylineCoords = [
        [14.5995, 120.9842],
        ...waypoints.map(w => [w.latitude, w.longitude] as [number, number])
      ];
    }

    if (polylineCoords.length > 1) {
      const poly = L.polyline(polylineCoords, { 
        color: '#059669', 
        weight: 6, 
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);
      
      routePolylineRef.current = poly;
      map.fitBounds(poly.getBounds(), { padding: [30, 30] });
    }

  }, [waypoints, completedBins, roadGeometry]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
