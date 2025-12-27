import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import MapVisualization, { MapHandle } from './MapVisualization';
import SimulationControlPanel from './SimulationControlPanel';
import { Bus, Passenger, PassengerStatus, BusState, SimulationConfig } from '../types';
import { INITIAL_BUSES, BUS_STOPS, MOCK_NAMES, AVATAR_COLORS, DEFAULT_SIMULATION_CONFIG, generateBusesFromTemplates } from '../constants';
import { useSimulation } from '../hooks/useSimulation';
import { useSimulationMetrics } from '../hooks/useSimulationMetrics';
import { useFleetAutoScale, DEFAULT_FLEET_CONFIG } from '../hooks/useFleetAutoScale';
import { generateWeightedPassenger } from '../utils/passengerGenerator';
import { formatETA } from '../services/assignmentService';
import { isBusAvailable } from '../services/busStateMachine';
import {
  Bus as BusIcon,
  Loader2,
  CheckCircle2,
  Clock,
  ChevronRight,
  X,
  Navigation,
  Maximize2,
  Crosshair,
  User,
  Flag,
  MapPin
} from 'lucide-react';

// Logo do PassoBus - Compacto no mobile
const PassoBusLogo = () => (
  <div className="flex items-center gap-2 sm:gap-3">
    <div className="relative">
      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
        <svg className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px]" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/>
          <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H6c-1.1 0-2.1.8-2.4 1.8l-1.4 5c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3"/>
          <circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
        </svg>
      </div>
      <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
        <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-white rounded-full animate-pulse"></div>
      </div>
    </div>
    <div>
      <h1 className="font-bold text-sm sm:text-base leading-none tracking-tight text-slate-900">PassoBus</h1>
      <span className="text-[8px] sm:text-[10px] text-blue-600 font-semibold uppercase tracking-wider">Smart Transit</span>
    </div>
  </div>
);

type UIStatus = 'IDLE' | 'CHOOSING_DEST' | 'SELECTING_BUS' | 'REQUESTING' | 'QUEUED' | 'WAITING' | 'ON_BOARD' | 'FINISHED';

const Dashboard: React.FC = () => {
  const mapRef = useRef<MapHandle>(null);

  // Estado da configuracao da simulacao
  const [simulationConfig, setSimulationConfig] = useState<SimulationConfig>(DEFAULT_SIMULATION_CONFIG);

  // Gera onibus iniciais baseado na config
  const initialBuses = useMemo(() => {
    return generateBusesFromTemplates(simulationConfig.activeBusCount);
  }, []); // Nao recria quando activeBusCount muda - gerenciado separadamente

  // Gera passageiros iniciais
  const initialPassengers = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) =>
      generateWeightedPassenger(`bot-init-${i}`, simulationConfig)
    );
  }, []);

  // Hook de simulacao com config
  const { buses, passengers, addPassenger, requestBusForUser, cancelPassenger, cleanupCompletedBots, setFleetSize } = useSimulation(
    initialBuses,
    initialPassengers,
    simulationConfig
  );

  // Calcula metricas em tempo real
  const metrics = useSimulationMetrics(buses, passengers);

  // Auto-scaling da frota baseado em demanda
  const fleetDecision = useFleetAutoScale(
    buses,
    passengers,
    metrics,
    {
      ...DEFAULT_FLEET_CONFIG,
      minBuses: simulationConfig.minBuses,
      maxBuses: simulationConfig.maxBuses,
    },
    simulationConfig.isPaused
  );

  // Handler para mudancas na config
  const handleConfigChange = useCallback((newConfig: Partial<SimulationConfig>) => {
    setSimulationConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  // Auto-scaling: aplica decisao da frota automaticamente
  const lastFleetAdjustRef = useRef(0);
  useEffect(() => {
    if (simulationConfig.isPaused || !simulationConfig.fleetAutoScale) return;

    const now = Date.now();
    // Throttle: ajusta frota no maximo a cada 3 segundos
    if (now - lastFleetAdjustRef.current < 3000) return;

    if (fleetDecision.action !== 'maintain') {
      lastFleetAdjustRef.current = now;
      setFleetSize(fleetDecision.recommendedBusCount);
    }
  }, [fleetDecision, simulationConfig.isPaused, simulationConfig.fleetAutoScale, setFleetSize]);

  const [selectedOrigin, setSelectedOrigin] = useState<typeof BUS_STOPS[0] | null>(null);
  const [selectedDest, setSelectedDest] = useState<typeof BUS_STOPS[0] | null>(null);
  const [currentUserPassengerId, setCurrentUserPassengerId] = useState<string | null>(null);
  const [uiStatus, setUiStatus] = useState<UIStatus>('IDLE');
  const [autoFollow, setAutoFollow] = useState(true);

  // Ref para evitar recriar intervalo
  const passengersRef = useRef(passengers);
  useEffect(() => {
    passengersRef.current = passengers;
  }, [passengers]);

  // Ref para config atual (evita closures stale)
  const configRef = useRef(simulationConfig);
  useEffect(() => {
    configRef.current = simulationConfig;
  }, [simulationConfig]);

  // Gera bots constantemente para cidade viva (com config dinamica)
  useEffect(() => {
    // Pula se pausado
    if (simulationConfig.isPaused) return;

    const generateBots = () => {
      const currentConfig = configRef.current;
      if (currentConfig.isPaused) return;

      const currentPassengers = passengersRef.current;
      const botsWaiting = currentPassengers.filter(
        (p) => p.isBot && p.status === PassengerStatus.WAITING && !p.assignedBusId
      ).length;

      // Usa targetWaitingPassengers da config
      if (botsWaiting < currentConfig.targetWaitingPassengers) {
        addPassenger(generateWeightedPassenger(
          `bot-${Date.now()}-${Math.random()}`,
          currentConfig
        ));
      }
    };

    // Intervalo baseado na taxa de geracao
    const intervalMs = 1000 / simulationConfig.passengerGenerationRate;
    const interval = setInterval(generateBots, intervalMs);

    // Gera alguns imediatamente
    for (let i = 0; i < 5; i++) {
      setTimeout(() => generateBots(), i * 200);
    }

    return () => clearInterval(interval);
  }, [addPassenger, simulationConfig.isPaused, simulationConfig.passengerGenerationRate]);

  // Limpa bots
  useEffect(() => {
    const interval = setInterval(cleanupCompletedBots, 15000);
    return () => clearInterval(interval);
  }, [cleanupCompletedBots]);

  // Atualiza UI
  useEffect(() => {
    if (!currentUserPassengerId) {
      if (!selectedOrigin) setUiStatus('IDLE');
      else if (!selectedDest) setUiStatus('CHOOSING_DEST');
      return;
    }

    const passenger = passengers.find((p) => p.id === currentUserPassengerId);
    if (!passenger) return;

    const bus = passenger.assignedBusId ? buses.find(b => b.id === passenger.assignedBusId) : null;

    switch (passenger.status) {
      case PassengerStatus.WAITING:
        if (bus?.assignment?.passengerId === passenger.id) {
          // Ônibus está vindo buscar o usuário
          setUiStatus('WAITING');
        } else if (bus && bus.assignment) {
          // Ônibus ocupado com outro passageiro - usuário na fila
          setUiStatus('QUEUED');
        } else {
          // Calculando rota
          setUiStatus('REQUESTING');
        }
        break;
      case PassengerStatus.ON_BOARD:
        setUiStatus('ON_BOARD');
        break;
      case PassengerStatus.COMPLETED:
        setUiStatus('FINISHED');
        break;
    }
  }, [passengers, buses, currentUserPassengerId, selectedOrigin, selectedDest]);

  const resetApp = useCallback(() => {
    if (currentUserPassengerId) cancelPassenger(currentUserPassengerId);
    setSelectedOrigin(null);
    setSelectedDest(null);
    setCurrentUserPassengerId(null);
    setUiStatus('IDLE');
    setAutoFollow(true);
  }, [currentUserPassengerId, cancelPassenger]);

  const handleStopClick = useCallback(
    (stop: typeof BUS_STOPS[0]) => {
      if (currentUserPassengerId) return;
      if (!selectedOrigin) {
        setSelectedOrigin(stop);
        setUiStatus('CHOOSING_DEST');
      } else if (!selectedDest) {
        if (stop.id === selectedOrigin.id) return;
        setSelectedDest(stop);
        setUiStatus('SELECTING_BUS');
      }
    },
    [selectedOrigin, selectedDest, currentUserPassengerId]
  );

  const selectBus = useCallback(
    async (busId: string) => {
      if (!selectedOrigin || !selectedDest) return;

      const newPassenger: Passenger = {
        id: `user-${Date.now()}`,
        name: 'VOCÊ',
        origin: { lat: selectedOrigin.lat, lng: selectedOrigin.lng },
        destination: { lat: selectedDest.lat, lng: selectedDest.lng },
        status: PassengerStatus.WAITING,
        requestTime: Date.now(),
        isBot: false,
        assignedBusId: null,
        avatarColor: '#0f172a',
      };

      setCurrentUserPassengerId(newPassenger.id);
      setUiStatus('REQUESTING');

      const success = await requestBusForUser(newPassenger, busId);
      if (!success) {
        setCurrentUserPassengerId(null);
        setUiStatus('SELECTING_BUS');
      }
    },
    [selectedOrigin, selectedDest, requestBusForUser]
  );

  const userPassenger = passengers.find((p) => p.id === currentUserPassengerId);
  const assignedBus = userPassenger?.assignedBusId
    ? buses.find((b) => b.id === userPassenger.assignedBusId)
    : null;

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    return Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lng1 - lng2, 2));
  };

  // Converte distância em segundos (calibrado com BUS_SPEED)
  const distanceToSeconds = (dist: number): number => Math.ceil(dist * 6700);

  // Calcula tempo restante do path atual
  const pathTimeRemaining = (path: { lat: number; lng: number }[]): number => {
    if (path.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < path.length - 1; i++) {
      total += calculateDistance(path[i].lat, path[i].lng, path[i + 1].lat, path[i + 1].lng);
    }
    return distanceToSeconds(total);
  };

  // Calcula ETA total considerando trajeto atual do ônibus
  const calculateFullETA = (bus: Bus, targetLat: number, targetLng: number): { etaSeconds: number; queuePosition: number } => {
    const BOARDING_SECONDS = 3; // 3000ms = 3s
    const now = Date.now();
    const timeInState = Math.floor((now - bus.stateStartTime) / 1000);

    // Tempo para chegar até o pickup do usuário a partir de uma posição
    const timeToUserFrom = (fromLat: number, fromLng: number) =>
      distanceToSeconds(calculateDistance(fromLat, fromLng, targetLat, targetLng));

    switch (bus.state) {
      case BusState.AVAILABLE:
      case BusState.CRUISING:
        // Direto até o usuário (CRUISING pode ser interrompido)
        return {
          etaSeconds: timeToUserFrom(bus.location.lat, bus.location.lng),
          queuePosition: 0
        };

      case BusState.GOING_TO_PICKUP:
        // Tempo restante até pickup + embarque + viagem até destino + desembarque + ir até usuário
        if (bus.assignment) {
          const toPickup = pathTimeRemaining(bus.path);
          const toDropoff = pathTimeRemaining(bus.assignment.dropoffPath);
          const dropoffLoc = bus.assignment.dropoffLocation;
          const toUser = timeToUserFrom(dropoffLoc.lat, dropoffLoc.lng);
          return {
            etaSeconds: toPickup + BOARDING_SECONDS + toDropoff + BOARDING_SECONDS + toUser,
            queuePosition: 1
          };
        }
        return { etaSeconds: 99999, queuePosition: 1 };

      case BusState.BOARDING:
        // Tempo restante de embarque + viagem até destino + desembarque + ir até usuário
        if (bus.assignment) {
          const boardingRemaining = Math.max(0, BOARDING_SECONDS - timeInState);
          const toDropoff = pathTimeRemaining(bus.assignment.dropoffPath);
          const dropoffLoc = bus.assignment.dropoffLocation;
          const toUser = timeToUserFrom(dropoffLoc.lat, dropoffLoc.lng);
          return {
            etaSeconds: boardingRemaining + toDropoff + BOARDING_SECONDS + toUser,
            queuePosition: 1
          };
        }
        return { etaSeconds: 99999, queuePosition: 1 };

      case BusState.GOING_TO_DROPOFF:
        // Tempo restante até destino + desembarque + ir até usuário
        if (bus.assignment) {
          const toDropoff = pathTimeRemaining(bus.path);
          const dropoffLoc = bus.assignment.dropoffLocation;
          const toUser = timeToUserFrom(dropoffLoc.lat, dropoffLoc.lng);
          return {
            etaSeconds: toDropoff + BOARDING_SECONDS + toUser,
            queuePosition: 1
          };
        }
        return { etaSeconds: 99999, queuePosition: 1 };

      case BusState.DISEMBARKING:
        // Tempo restante de desembarque + ir até usuário
        const disembarkRemaining = Math.max(0, BOARDING_SECONDS - timeInState);
        const toUser = timeToUserFrom(bus.location.lat, bus.location.lng);
        return {
          etaSeconds: disembarkRemaining + toUser,
          queuePosition: 1
        };

      default:
        return { etaSeconds: 99999, queuePosition: 0 };
    }
  };

  // Ordena todos os ônibus por ETA (não apenas disponíveis)
  const sortedBuses = React.useMemo(() => {
    if (!selectedOrigin) return [];
    return buses
      .map((bus) => {
        const { etaSeconds, queuePosition } = calculateFullETA(bus, selectedOrigin.lat, selectedOrigin.lng);
        return { bus, etaSeconds, queuePosition };
      })
      .sort((a, b) => a.etaSeconds - b.etaSeconds);
  }, [buses, selectedOrigin]);

  const eta = assignedBus ? formatETA(assignedBus.path.length) : null;

  const getBusStatusText = (bus: Bus): string => {
    switch (bus.state) {
      case BusState.AVAILABLE: return 'Disponível';
      case BusState.CRUISING: return 'Circulando';
      case BusState.GOING_TO_PICKUP: return 'Indo buscar';
      case BusState.BOARDING: return 'Embarcando';
      case BusState.GOING_TO_DROPOFF: return 'Em viagem';
      case BusState.DISEMBARKING: return 'Desembarcando';
      default: return '';
    }
  };

  const getStatusColor = (state: BusState): string => {
    switch (state) {
      case BusState.AVAILABLE:
      case BusState.CRUISING: return '#10b981'; // Verde - disponível
      case BusState.GOING_TO_PICKUP:
      case BusState.GOING_TO_DROPOFF: return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const formatSeconds = (seconds: number): string => {
    if (seconds >= 99999) return '--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}min ${secs}s`;
    return `${secs}s`;
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden text-slate-900 font-sans bg-slate-100">
      {/* Header - Compacto no mobile */}
      <div className="absolute top-0 left-0 right-0 p-2 sm:p-4 z-20 flex justify-between items-start pointer-events-none safe-top">
        <div className="bg-white/90 backdrop-blur-xl px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl shadow-lg shadow-black/5 border border-white/50 pointer-events-auto">
          <PassoBusLogo />
        </div>

        {/* Controles - Touch-friendly */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          <button
            onClick={() => mapRef.current?.fitAllBuses()}
            className="bg-white/90 backdrop-blur-xl w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl shadow-lg shadow-black/5 border border-white/50 hover:bg-white transition-all active:scale-95"
            title="Ver todos"
          >
            <Maximize2 size={20} className="text-slate-700" />
          </button>
          {assignedBus && (
            <button
              onClick={() => {
                setAutoFollow(!autoFollow);
                if (!autoFollow) mapRef.current?.centerOnBus(assignedBus.id);
              }}
              className={`w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl shadow-lg shadow-black/5 border transition-all active:scale-95 ${
                autoFollow
                  ? 'bg-blue-500 border-blue-400 text-white'
                  : 'bg-white/90 backdrop-blur-xl border-white/50 text-slate-700'
              }`}
            >
              <Crosshair size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Painel de Controle da Simulacao */}
      <SimulationControlPanel
        config={simulationConfig}
        metrics={metrics}
        fleetDecision={fleetDecision}
        onConfigChange={handleConfigChange}
      />

      {/* Mapa */}
      <div className="absolute inset-0 z-0">
        <MapVisualization
          ref={mapRef}
          buses={buses}
          passengers={passengers}
          onStopClick={handleStopClick}
          selectedOriginId={selectedOrigin?.id}
          selectedDestId={selectedDest?.id}
          focusOnBusId={assignedBus?.id}
          autoFollow={autoFollow}
          focusMode={!!assignedBus} // Ativa modo foco quando usuário tem ônibus atribuído
        />
      </div>

      {/* Painel inferior - Mobile-first com safe area */}
      <div className="absolute bottom-0 left-0 right-0 z-30 p-3 sm:p-4 pointer-events-none flex flex-col items-center justify-end safe-bottom">
        <div className="w-full sm:max-w-md bg-white/95 backdrop-blur-2xl shadow-[0_-4px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 rounded-2xl sm:rounded-3xl p-4 sm:p-5 pointer-events-auto">

          {/* Seleção de rota */}
          {(uiStatus === 'IDLE' || uiStatus === 'CHOOSING_DEST') && (
            <>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">Para onde você vai?</h2>
                {selectedOrigin && (
                  <button onClick={resetApp} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors">
                    <X size={18} className="text-slate-400" />
                  </button>
                )}
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                {/* Origem */}
                <div className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl flex items-center gap-3 transition-all ${
                  selectedOrigin
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300'
                }`}>
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    selectedOrigin ? 'bg-blue-500' : 'bg-blue-400'
                  }`}>
                    <User size={16} className="text-white sm:hidden" />
                    <User size={18} className="text-white hidden sm:block" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-[9px] sm:text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                      Sua localização
                    </span>
                    <span className={`font-semibold text-sm sm:text-base truncate block ${selectedOrigin ? 'text-slate-800' : 'text-blue-600'}`}>
                      {selectedOrigin ? selectedOrigin.name : 'Toque em uma parada no mapa'}
                    </span>
                  </div>
                  {selectedOrigin && <CheckCircle2 size={18} className="text-blue-500 flex-shrink-0 sm:hidden" />}
                  {selectedOrigin && <CheckCircle2 size={20} className="text-blue-500 flex-shrink-0 hidden sm:block" />}
                </div>

                {/* Linha conectora */}
                <div className="flex items-center gap-3 pl-4 sm:pl-5">
                  <div className="w-0.5 h-3 sm:h-4 bg-slate-200 rounded-full"></div>
                </div>

                {/* Destino */}
                <div className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl flex items-center gap-3 transition-all ${
                  selectedDest
                    ? 'bg-green-50 border border-green-200'
                    : selectedOrigin
                    ? 'bg-gradient-to-r from-green-50 to-emerald-100 border-2 border-green-300'
                    : 'bg-slate-50 border border-slate-200 opacity-60'
                }`}>
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    selectedDest ? 'bg-green-500' : selectedOrigin ? 'bg-green-400' : 'bg-slate-300'
                  }`}>
                    <Flag size={16} className="text-white sm:hidden" />
                    <Flag size={18} className="text-white hidden sm:block" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
                      selectedOrigin ? 'text-green-600' : 'text-slate-400'
                    }`}>
                      Destino
                    </span>
                    <span className={`font-semibold text-sm sm:text-base truncate block ${
                      selectedDest ? 'text-slate-800' : selectedOrigin ? 'text-green-600' : 'text-slate-400'
                    }`}>
                      {selectedDest ? selectedDest.name : selectedOrigin ? 'Toque no destino' : 'Selecione origem primeiro'}
                    </span>
                  </div>
                  {selectedDest && <CheckCircle2 size={18} className="text-green-500 flex-shrink-0 sm:hidden" />}
                  {selectedDest && <CheckCircle2 size={20} className="text-green-500 flex-shrink-0 hidden sm:block" />}
                </div>
              </div>
            </>
          )}

          {/* Seleção de ônibus */}
          {uiStatus === 'SELECTING_BUS' && (
            <>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">Escolha o ônibus</h2>
                  <p className="text-[10px] sm:text-xs text-slate-500">
                    {sortedBuses.length} ônibus • ordenados por tempo
                  </p>
                </div>
                <button onClick={resetApp} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors">
                  <X size={18} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-1.5 sm:space-y-2 max-h-[35vh] sm:max-h-[40vh] overflow-y-auto hide-scrollbar -mx-1 px-1">
                {sortedBuses.map(({ bus, etaSeconds, queuePosition }, index) => {
                  const isFirst = index === 0;
                  const isAvailable = queuePosition === 0;
                  const statusText = isAvailable ? 'Disponível' : getBusStatusText(bus);
                  const statusColor = isAvailable ? 'text-green-600' : 'text-amber-600';

                  return (
                    <button
                      key={bus.id}
                      onClick={() => selectBus(bus.id)}
                      className={`w-full min-h-[52px] p-2.5 sm:p-3 rounded-xl flex items-center justify-between text-left transition-all active:scale-[0.98] ${
                        isFirst
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/30'
                          : 'bg-slate-50 hover:bg-slate-100 active:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center relative flex-shrink-0"
                          style={{ backgroundColor: isFirst ? 'rgba(255,255,255,0.2)' : bus.color }}
                        >
                          <BusIcon size={16} className="text-white sm:hidden" />
                          <BusIcon size={18} className="text-white hidden sm:block" />
                          {!isAvailable && !isFirst && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                              <span className="text-[9px] font-bold text-white">1</span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className={`font-semibold text-xs sm:text-sm truncate ${isFirst ? 'text-white' : 'text-slate-900'}`}>
                            {bus.name}
                          </h3>
                          <span className={`text-[10px] sm:text-xs ${isFirst ? 'text-blue-100' : statusColor}`}>
                            {isFirst && !isAvailable ? 'Próximo da fila' : statusText}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <span className={`block font-bold text-sm sm:text-base ${isFirst ? 'text-white' : 'text-slate-700'}`}>
                          ~{formatSeconds(etaSeconds)}
                        </span>
                        {isFirst && <span className="text-[9px] sm:text-[10px] text-blue-100">mais rápido</span>}
                        {!isFirst && !isAvailable && (
                          <span className="text-[9px] sm:text-[10px] text-amber-600">após 1 passageiro</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Calculando rota */}
          {uiStatus === 'REQUESTING' && (
            <div className="text-center py-4 sm:py-6">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
                <Loader2 size={24} className="animate-spin text-blue-500 sm:hidden" />
                <Loader2 size={28} className="animate-spin text-blue-500 hidden sm:block" />
              </div>
              <h2 className="font-bold text-sm sm:text-base text-slate-900 mb-1">Calculando rota...</h2>
              <p className="text-slate-500 text-xs sm:text-sm">Aguarde um momento</p>
            </div>
          )}

          {/* Na fila - ônibus ocupado */}
          {uiStatus === 'QUEUED' && assignedBus && (() => {
            // Descrição inteligente do que o ônibus está fazendo
            const getQueueDescription = () => {
              if (!assignedBus.assignment) return 'Preparando próxima viagem';

              switch (assignedBus.state) {
                case BusState.GOING_TO_PICKUP:
                  return 'Buscando passageiro anterior';
                case BusState.BOARDING:
                  return 'Embarcando passageiro';
                case BusState.GOING_TO_DROPOFF:
                  return 'Levando passageiro ao destino';
                case BusState.DISEMBARKING:
                  return 'Desembarcando passageiro';
                default:
                  return 'Finalizando viagem atual';
              }
            };

            return (
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600">
                        Aguardando
                      </span>
                      <button onClick={resetApp} className="text-[10px] sm:text-xs text-red-500 font-semibold active:text-red-700 min-h-[32px] px-2 -mx-2">
                        Cancelar
                      </button>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600">
                      Você é o próximo da fila
                    </p>
                  </div>
                  <div
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-lg relative flex-shrink-0"
                    style={{ backgroundColor: assignedBus.color }}
                  >
                    <BusIcon size={18} className="text-white sm:hidden" />
                    <BusIcon size={22} className="text-white hidden sm:block" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-amber-500 rounded-full flex items-center justify-center shadow">
                      <Clock size={10} className="text-white sm:hidden" />
                      <Clock size={12} className="text-white hidden sm:block" />
                    </div>
                  </div>
                </div>

                <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2.5 sm:gap-3">
                  <Loader2 size={16} className="text-amber-600 animate-spin flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs sm:text-sm text-slate-800 truncate">{assignedBus.name}</p>
                    <p className="text-[10px] sm:text-xs text-amber-700">{getQueueDescription()}</p>
                  </div>
                </div>

                <div className="text-[10px] sm:text-xs text-slate-500 text-center">
                  O ônibus virá buscá-lo assim que terminar a viagem atual.
                </div>
              </div>
            );
          })()}

          {/* Esperando / A bordo */}
          {(uiStatus === 'WAITING' || uiStatus === 'ON_BOARD') && assignedBus && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                      uiStatus === 'WAITING' ? 'text-blue-600' : 'text-green-600'
                    }`}>
                      {uiStatus === 'WAITING' ? 'Ônibus a caminho' : 'Em viagem'}
                    </span>
                    {uiStatus === 'WAITING' && (
                      <button onClick={resetApp} className="text-[10px] sm:text-xs text-red-500 font-semibold active:text-red-700 min-h-[32px] px-2 -mx-2">
                        Cancelar
                      </button>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1.5 sm:gap-2">
                    <span className="text-2xl sm:text-3xl font-bold text-slate-900">{eta || '--'}</span>
                    {eta && eta !== 'Chegando...' && <span className="text-xs sm:text-sm text-slate-400">restante</span>}
                  </div>
                </div>
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
                  style={{ backgroundColor: assignedBus.color }}
                >
                  <BusIcon size={18} className="text-white sm:hidden" />
                  <BusIcon size={22} className="text-white hidden sm:block" />
                </div>
              </div>

              <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5 sm:gap-3">
                <Navigation size={16} className="text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-xs sm:text-sm text-slate-800 truncate">{assignedBus.name}</p>
                  <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                    {uiStatus === 'WAITING' ? `Aguarde na ${selectedOrigin?.name}` : `Destino: ${selectedDest?.name}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full" style={{ backgroundColor: getStatusColor(assignedBus.state) }}></span>
                  <span className="text-[10px] sm:text-xs text-slate-500 hidden sm:inline">{getBusStatusText(assignedBus)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Concluído */}
          {uiStatus === 'FINISHED' && (
            <div className="text-center py-3 sm:py-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-green-400 to-green-500 text-white rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-lg shadow-green-500/30">
                <CheckCircle2 size={24} strokeWidth={2.5} className="sm:hidden" />
                <CheckCircle2 size={28} strokeWidth={2.5} className="hidden sm:block" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-1">Você chegou!</h2>
              <p className="text-slate-500 text-xs sm:text-sm mb-3 sm:mb-4 truncate px-4">{selectedDest?.name}</p>
              <button
                onClick={resetApp}
                className="w-full min-h-[48px] py-3 sm:py-3.5 bg-slate-900 text-white font-semibold text-sm sm:text-base rounded-xl shadow-lg hover:bg-slate-800 active:bg-slate-950 active:scale-[0.98] transition-all"
              >
                Nova viagem
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
