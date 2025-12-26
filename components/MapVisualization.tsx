import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Bus, Passenger, PassengerStatus, BusState } from '../types';
import L from 'leaflet';
import { BUS_STOPS } from '../constants';

export interface MapHandle {
  fitAllBuses: () => void;
  centerOnBus: (busId: string) => void;
}

interface MapVisualizationProps {
  buses: Bus[];
  passengers: Passenger[];
  onStopClick: (stop: typeof BUS_STOPS[0]) => void;
  selectedOriginId?: string | null;
  selectedDestId?: string | null;
  focusOnBusId?: string | null;
  autoFollow?: boolean;
}

// Ícone do Ônibus - moderno e delicado
const getBusIconHtml = (color: string, state: BusState, hasPassenger: boolean) => {
  const pulseClass = hasPassenger ? 'bus-pulse' : '';

  return `
    <div class="${pulseClass}" style="
      width: 36px;
      height: 36px;
      background: ${color};
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: translateY(-50%);
      box-shadow: 0 2px 8px rgba(0,0,0,0.2), 0 0 0 2px rgba(255,255,255,0.9);
    ">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 6v6M15 6v6M2 12h19.6"/>
        <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H6c-1.1 0-2.1.8-2.4 1.8l-1.4 5c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3"/>
        <circle cx="7" cy="18" r="2"/>
        <circle cx="17" cy="18" r="2"/>
      </svg>
    </div>
  `;
};

function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${(b | (g << 8) | (r << 16)).toString(16).padStart(6, '0')}`;
}

// Ícone de Parada de Ônibus
const getBusStopIconHtml = (
  type: 'terminal' | 'parada',
  isOrigin: boolean,
  isDest: boolean,
  waitingCount: number = 0
) => {
  const isSelected = isOrigin || isDest;

  // ORIGEM - Ícone de pessoa esperando (azul)
  if (isOrigin) {
    return `
      <div style="position: relative; filter: drop-shadow(0 3px 6px rgba(37,99,235,0.4));">
        <div style="
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8" r="4"/>
            <path d="M20 21a8 8 0 0 0-16 0"/>
          </svg>
        </div>
        <div style="
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          background: #1d4ed8;
          color: white;
          font-size: 9px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          white-space: nowrap;
          border: 2px solid white;
        ">VOCÊ</div>
      </div>
    `;
  }

  // DESTINO - Ícone de bandeira (verde)
  if (isDest) {
    return `
      <div style="position: relative; filter: drop-shadow(0 3px 6px rgba(16,185,129,0.4));">
        <div style="
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
            <line x1="4" x2="4" y1="22" y2="15"/>
          </svg>
        </div>
        <div style="
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          background: #059669;
          color: white;
          font-size: 9px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          white-space: nowrap;
          border: 2px solid white;
        ">DESTINO</div>
      </div>
    `;
  }

  // Terminal - maior, com ícone de ônibus
  if (type === 'terminal') {
    const badgeHtml = waitingCount > 0 ? `
      <div style="
        position: absolute;
        top: -4px;
        right: -4px;
        background: #ef4444;
        color: white;
        font-size: 10px;
        font-weight: 700;
        min-width: 18px;
        height: 18px;
        border-radius: 9px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
      ">${waitingCount}</div>
    ` : '';

    return `
      <div style="position: relative; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));">
        <div style="
          background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/>
            <rect x="2" y="3" width="20" height="16" rx="2"/>
          </svg>
        </div>
        ${badgeHtml}
      </div>
    `;
  }

  // Parada normal - ícone de parada de ônibus (bus-stop-pointer)
  const badgeHtml = waitingCount > 0 ? `
    <div style="
      position: absolute;
      top: -4px;
      right: -6px;
      background: #ef4444;
      color: white;
      font-size: 9px;
      font-weight: 700;
      min-width: 16px;
      height: 16px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
      z-index: 10;
    ">${waitingCount}</div>
  ` : '';

  return `
    <div style="position: relative; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
      <svg width="32" height="32" viewBox="0 0 51.787 51.787" fill="#3b82f6" xmlns="http://www.w3.org/2000/svg">
        <path d="M25.892,0c-7.646,0-13.845,6.198-13.845,13.845c0,1.494,0.244,2.929,0.68,4.274c0.981,3.461,12.292,33.668,12.292,33.668
          s12.014-27.703,13.83-33.096c0.565-1.511,0.891-3.14,0.891-4.848C39.738,6.199,33.539,0,25.892,0z M25.892,24.761
          c-6,0-10.865-4.867-10.865-10.865c0-6.003,4.865-10.868,10.865-10.868c6.003,0,10.866,4.865,10.866,10.868
          C36.758,19.894,31.895,24.761,25.892,24.761z"/>
        <path fill="#1e293b" d="M30.511,6.326h-9.237c-0.948,0-1.72,0.835-1.72,1.866v10.039c0,0.685,0.341,1.28,0.848,1.604v1.073
          c0,0.353,0.567,0.636,1.271,0.636c0.701,0,1.271-0.283,1.271-0.636v-0.812H24.5v-0.001h3.217v0.001h1.195v0.812
          c0,0.353,0.568,0.636,1.271,0.636s1.271-0.283,1.271-0.636v-1.116c0.471-0.334,0.78-0.907,0.78-1.562V8.191
          C32.232,7.162,31.461,6.326,30.511,6.326z M23.22,7.121h5.344V7.64H23.22V7.121z M24.291,17.061h-3.373v-1.248h3.373V17.061z
           M27.715,19.941h-3.217v-0.99h3.217V19.941z M31.037,17.061h-3.374v-1.248h3.374V17.061z M31.185,12.773
          c0,0.127-0.224,0.23-0.5,0.23H21.1c-0.275,0-0.499-0.104-0.499-0.23V8.339c0-0.128,0.224-0.232,0.499-0.232h9.585
          c0.276,0,0.5,0.104,0.5,0.232V12.773z"/>
      </svg>
      ${badgeHtml}
    </div>
  `;
};

const MapVisualization = forwardRef<MapHandle, MapVisualizationProps>(({
  buses,
  passengers,
  onStopClick,
  selectedOriginId,
  selectedDestId,
  focusOnBusId,
  autoFollow = true,
}, ref) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const busMarkersRef = useRef<{ [key: string]: L.Marker }>({});
  const stopMarkersRef = useRef<{ [key: string]: L.Marker }>({});
  const routeLinesRef = useRef<{ [key: string]: L.Polyline }>({});

  const onStopClickRef = useRef(onStopClick);

  useEffect(() => {
    onStopClickRef.current = onStopClick;
  }, [onStopClick]);

  useImperativeHandle(ref, () => ({
    fitAllBuses: () => {
      if (!mapInstanceRef.current || buses.length === 0) return;
      const bounds = L.latLngBounds(buses.map(b => [b.location.lat, b.location.lng]));
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    },
    centerOnBus: (busId: string) => {
      if (!mapInstanceRef.current) return;
      const bus = buses.find(b => b.id === busId);
      if (bus) {
        mapInstanceRef.current.panTo([bus.location.lat, bus.location.lng], {
          animate: true,
          duration: 0.5,
        });
      }
    },
  }));

  // Inicializa o mapa
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true,
      }).setView([-28.2628, -52.4087], 14);

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        { maxZoom: 20 }
      ).addTo(map);

      // CSS para animação
      const style = document.createElement('style');
      style.textContent = `
        @keyframes bus-pulse-animation {
          0%, 100% { box-shadow: 0 4px 12px rgba(0,0,0,0.25); }
          50% { box-shadow: 0 4px 20px rgba(0,0,0,0.35), 0 0 0 8px rgba(59,130,246,0.15); }
        }
        .bus-pulse { animation: bus-pulse-animation 2s ease-in-out infinite; }
      `;
      document.head.appendChild(style);

      // Paradas
      BUS_STOPS.forEach((stop) => {
        const icon = L.divIcon({
          className: 'stop-icon',
          html: getBusStopIconHtml(stop.type, false, false, 0),
          iconSize: stop.type === 'terminal' ? [32, 32] : [20, 20],
          iconAnchor: stop.type === 'terminal' ? [16, 16] : [10, 10],
        });

        const marker = L.marker([stop.lat, stop.lng], { icon }).addTo(map);
        marker.on('click', () => onStopClickRef.current?.(stop));
        stopMarkersRef.current[stop.id] = marker;
      });

      mapInstanceRef.current = map;
    }
  }, []);

  // Passageiros esperando
  const getWaitingCountAtStop = (stopLat: number, stopLng: number): number => {
    const TOLERANCE = 0.001;
    return passengers.filter(
      (p) =>
        p.status === PassengerStatus.WAITING &&
        Math.abs(p.origin.lat - stopLat) < TOLERANCE &&
        Math.abs(p.origin.lng - stopLng) < TOLERANCE
    ).length;
  };

  // Atualiza paradas
  useEffect(() => {
    BUS_STOPS.forEach((stop) => {
      const marker = stopMarkersRef.current[stop.id];
      if (marker) {
        const isOrigin = stop.id === selectedOriginId;
        const isDest = stop.id === selectedDestId;
        const isSelected = isOrigin || isDest;
        const waitingCount = getWaitingCountAtStop(stop.lat, stop.lng);

        const size = isSelected ? 44 : stop.type === 'terminal' ? 32 : 20;

        const icon = L.divIcon({
          className: 'stop-icon',
          html: getBusStopIconHtml(stop.type, isOrigin, isDest, waitingCount),
          iconSize: [size, size + (isSelected ? 16 : 0)],
          iconAnchor: [size / 2, size / 2],
        });
        marker.setIcon(icon);
        marker.setZIndexOffset(isSelected ? 2000 : waitingCount > 0 ? 1000 : 0);
      }
    });
  }, [selectedOriginId, selectedDestId, passengers]);

  // Foco no ônibus
  useEffect(() => {
    if (!mapInstanceRef.current || !focusOnBusId || !autoFollow) return;
    const bus = buses.find((b) => b.id === focusOnBusId);
    if (bus) {
      mapInstanceRef.current.panTo([bus.location.lat, bus.location.lng], {
        animate: true,
        duration: 0.8,
      });
    }
  }, [focusOnBusId, buses, autoFollow]);

  // Atualiza ônibus e rotas
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    buses.forEach((bus) => {
      const hasPassenger = bus.passengersOnBoard.length > 0 || bus.state === BusState.GOING_TO_PICKUP;

      if (!busMarkersRef.current[bus.id]) {
        const icon = L.divIcon({
          className: 'custom-bus-icon',
          html: getBusIconHtml(bus.color, bus.state, hasPassenger),
          iconSize: [42, 42],
          iconAnchor: [21, 21],
        });
        const marker = L.marker([bus.location.lat, bus.location.lng], { icon }).addTo(map);
        busMarkersRef.current[bus.id] = marker;
      } else {
        const marker = busMarkersRef.current[bus.id];
        marker.setLatLng([bus.location.lat, bus.location.lng]);
        const icon = L.divIcon({
          className: 'custom-bus-icon',
          html: getBusIconHtml(bus.color, bus.state, hasPassenger),
          iconSize: [42, 42],
          iconAnchor: [21, 21],
        });
        marker.setIcon(icon);
        marker.setZIndexOffset(3000);
      }

      // Rotas
      if (bus.path.length > 1) {
        const latlngs = bus.path.map((c) => [c.lat, c.lng] as [number, number]);

        if (!routeLinesRef.current[bus.id]) {
          const polyline = L.polyline(latlngs, {
            color: bus.color,
            weight: 5,
            opacity: 0.7,
            lineJoin: 'round',
            lineCap: 'round',
          }).addTo(map);
          routeLinesRef.current[bus.id] = polyline;
        } else {
          routeLinesRef.current[bus.id].setLatLngs(latlngs);
        }
      } else if (routeLinesRef.current[bus.id]) {
        routeLinesRef.current[bus.id].remove();
        delete routeLinesRef.current[bus.id];
      }
    });
  }, [buses]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainerRef} className="w-full h-full" style={{ background: '#f1f5f9' }} />
    </div>
  );
});

MapVisualization.displayName = 'MapVisualization';
export default MapVisualization;
