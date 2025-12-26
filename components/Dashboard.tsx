import React, { useState, useEffect, useCallback, useRef } from 'react';
import MapVisualization, { MapHandle } from './MapVisualization';
import { Bus, Passenger, PassengerStatus, BusState } from '../types';
import { INITIAL_BUSES, BUS_STOPS, MOCK_NAMES, AVATAR_COLORS } from '../constants';
import { useSimulation } from '../hooks/useSimulation';
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

// Logo do PassoBus
const PassoBusLogo = () => (
  <div className="flex items-center gap-3">
    <div className="relative">
      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/>
          <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H6c-1.1 0-2.1.8-2.4 1.8l-1.4 5c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3"/>
          <circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
        </svg>
      </div>
      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
      </div>
    </div>
    <div>
      <h1 className="font-bold text-base leading-none tracking-tight text-slate-900">PassoBus</h1>
      <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider">Smart Transit</span>
    </div>
  </div>
);

// Gera passageiro bot
const generateRandomPassenger = (id: string): Passenger => {
  const origin = BUS_STOPS[Math.floor(Math.random() * BUS_STOPS.length)];
  let destination = BUS_STOPS[Math.floor(Math.random() * BUS_STOPS.length)];
  while (destination.id === origin.id) {
    destination = BUS_STOPS[Math.floor(Math.random() * BUS_STOPS.length)];
  }

  return {
    id,
    name: MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)],
    origin: { lat: origin.lat, lng: origin.lng },
    destination: { lat: destination.lat, lng: destination.lng },
    status: PassengerStatus.WAITING,
    requestTime: Date.now(),
    isBot: true,
    assignedBusId: null,
    avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
  };
};

type UIStatus = 'IDLE' | 'CHOOSING_DEST' | 'SELECTING_BUS' | 'REQUESTING' | 'QUEUED' | 'WAITING' | 'ON_BOARD' | 'FINISHED';

const Dashboard: React.FC = () => {
  const mapRef = useRef<MapHandle>(null);

  const initialPassengers = React.useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => generateRandomPassenger(`bot-init-${i}`));
  }, []);

  const { buses, passengers, addPassenger, requestBusForUser, cancelPassenger, cleanupCompletedBots } = useSimulation(
    INITIAL_BUSES,
    initialPassengers
  );

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

  // Gera bots constantemente para cidade viva
  useEffect(() => {
    const generateBots = () => {
      const currentPassengers = passengersRef.current;
      const botsWaiting = currentPassengers.filter(
        (p) => p.isBot && p.status === PassengerStatus.WAITING && !p.assignedBusId
      ).length;

      // Mantém sempre passageiros esperando para ônibus não ficarem parados
      if (botsWaiting < 10) {
        addPassenger(generateRandomPassenger(`bot-${Date.now()}-${Math.random()}`));
      }
    };

    // Gera a cada 1 segundo para manter cidade mais ativa
    const interval = setInterval(generateBots, 1000);
    // Gera alguns imediatamente
    for (let i = 0; i < 5; i++) {
      setTimeout(() => generateBots(), i * 200);
    }

    return () => clearInterval(interval);
  }, [addPassenger]);

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
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-start pointer-events-none">
        <div className="bg-white/90 backdrop-blur-xl px-4 py-3 rounded-2xl shadow-lg shadow-black/5 border border-white/50 pointer-events-auto">
          <PassoBusLogo />
        </div>

        {/* Controles */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          <button
            onClick={() => mapRef.current?.fitAllBuses()}
            className="bg-white/90 backdrop-blur-xl p-3 rounded-xl shadow-lg shadow-black/5 border border-white/50 hover:bg-white transition-all active:scale-95"
            title="Ver todos"
          >
            <Maximize2 size={18} className="text-slate-700" />
          </button>
          {assignedBus && (
            <button
              onClick={() => {
                setAutoFollow(!autoFollow);
                if (!autoFollow) mapRef.current?.centerOnBus(assignedBus.id);
              }}
              className={`p-3 rounded-xl shadow-lg shadow-black/5 border transition-all active:scale-95 ${
                autoFollow
                  ? 'bg-blue-500 border-blue-400 text-white'
                  : 'bg-white/90 backdrop-blur-xl border-white/50 text-slate-700'
              }`}
            >
              <Crosshair size={18} />
            </button>
          )}
        </div>
      </div>

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
        />
      </div>

      {/* Painel inferior */}
      <div className="absolute bottom-0 left-0 right-0 z-30 p-4 pb-8 pointer-events-none flex flex-col items-center justify-end">
        <div className="w-full max-w-md bg-white/95 backdrop-blur-2xl shadow-[0_-4px_30px_rgb(0,0,0,0.1)] border border-slate-200/50 rounded-3xl p-5 pointer-events-auto">

          {/* Seleção de rota */}
          {(uiStatus === 'IDLE' || uiStatus === 'CHOOSING_DEST') && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-900">Para onde você vai?</h2>
                {selectedOrigin && (
                  <button onClick={resetApp} className="p-1.5 rounded-full hover:bg-slate-100">
                    <X size={16} className="text-slate-400" />
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {/* Origem */}
                <div className={`p-3.5 rounded-2xl flex items-center gap-3 transition-all ${
                  selectedOrigin
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300'
                }`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedOrigin ? 'bg-blue-500' : 'bg-blue-400'
                  }`}>
                    <User size={18} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                      Sua localização
                    </span>
                    <span className={`font-semibold truncate block ${selectedOrigin ? 'text-slate-800' : 'text-blue-600'}`}>
                      {selectedOrigin ? selectedOrigin.name : 'Toque em uma parada no mapa'}
                    </span>
                  </div>
                  {selectedOrigin && <CheckCircle2 size={20} className="text-blue-500 flex-shrink-0" />}
                </div>

                {/* Linha conectora */}
                <div className="flex items-center gap-3 pl-5">
                  <div className="w-0.5 h-4 bg-slate-200 rounded-full"></div>
                </div>

                {/* Destino */}
                <div className={`p-3.5 rounded-2xl flex items-center gap-3 transition-all ${
                  selectedDest
                    ? 'bg-green-50 border border-green-200'
                    : selectedOrigin
                    ? 'bg-gradient-to-r from-green-50 to-emerald-100 border-2 border-green-300'
                    : 'bg-slate-50 border border-slate-200 opacity-60'
                }`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedDest ? 'bg-green-500' : selectedOrigin ? 'bg-green-400' : 'bg-slate-300'
                  }`}>
                    <Flag size={18} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`block text-[10px] font-bold uppercase tracking-wider ${
                      selectedOrigin ? 'text-green-600' : 'text-slate-400'
                    }`}>
                      Destino
                    </span>
                    <span className={`font-semibold truncate block ${
                      selectedDest ? 'text-slate-800' : selectedOrigin ? 'text-green-600' : 'text-slate-400'
                    }`}>
                      {selectedDest ? selectedDest.name : selectedOrigin ? 'Toque no destino' : 'Selecione origem primeiro'}
                    </span>
                  </div>
                  {selectedDest && <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />}
                </div>
              </div>
            </>
          )}

          {/* Seleção de ônibus */}
          {uiStatus === 'SELECTING_BUS' && (
            <>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Escolha o ônibus</h2>
                  <p className="text-xs text-slate-500">
                    {sortedBuses.length} ônibus • ordenados por tempo
                  </p>
                </div>
                <button onClick={resetApp} className="p-1.5 rounded-full hover:bg-slate-100">
                  <X size={16} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {sortedBuses.map(({ bus, etaSeconds, queuePosition }, index) => {
                  const isFirst = index === 0;
                  const isAvailable = queuePosition === 0;
                  const statusText = isAvailable ? 'Disponível' : getBusStatusText(bus);
                  const statusColor = isAvailable ? 'text-green-600' : 'text-amber-600';

                  return (
                    <button
                      key={bus.id}
                      onClick={() => selectBus(bus.id)}
                      className={`w-full p-3 rounded-xl flex items-center justify-between text-left transition-all ${
                        isFirst
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/30'
                          : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center relative"
                          style={{ backgroundColor: isFirst ? 'rgba(255,255,255,0.2)' : bus.color }}
                        >
                          <BusIcon size={18} className="text-white" />
                          {!isAvailable && !isFirst && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                              <span className="text-[9px] font-bold text-white">1</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className={`font-semibold text-sm ${isFirst ? 'text-white' : 'text-slate-900'}`}>
                            {bus.name}
                          </h3>
                          <span className={`text-xs ${isFirst ? 'text-blue-100' : statusColor}`}>
                            {isFirst && !isAvailable ? 'Próximo da fila' : statusText}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`block font-bold ${isFirst ? 'text-white' : 'text-slate-700'}`}>
                          ~{formatSeconds(etaSeconds)}
                        </span>
                        {isFirst && <span className="text-[10px] text-blue-100">mais rápido</span>}
                        {!isFirst && !isAvailable && (
                          <span className="text-[10px] text-amber-600">após 1 passageiro</span>
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
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Loader2 size={28} className="animate-spin text-blue-500" />
              </div>
              <h2 className="font-bold text-slate-900 mb-1">Calculando rota...</h2>
              <p className="text-slate-500 text-sm">Aguarde um momento</p>
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
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                        Aguardando
                      </span>
                      <button onClick={resetApp} className="text-xs text-red-500 font-semibold hover:text-red-600">
                        Cancelar
                      </button>
                    </div>
                    <p className="text-sm text-slate-600">
                      Você é o próximo da fila
                    </p>
                  </div>
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg relative"
                    style={{ backgroundColor: assignedBus.color }}
                  >
                    <BusIcon size={22} className="text-white" />
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center shadow">
                      <Clock size={12} className="text-white" />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3">
                  <Loader2 size={18} className="text-amber-600 animate-spin" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-slate-800">{assignedBus.name}</p>
                    <p className="text-xs text-amber-700">{getQueueDescription()}</p>
                  </div>
                </div>

                <div className="text-xs text-slate-500 text-center">
                  O ônibus virá buscá-lo assim que terminar a viagem atual.
                </div>
              </div>
            );
          })()}

          {/* Esperando / A bordo */}
          {(uiStatus === 'WAITING' || uiStatus === 'ON_BOARD') && assignedBus && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      uiStatus === 'WAITING' ? 'text-blue-600' : 'text-green-600'
                    }`}>
                      {uiStatus === 'WAITING' ? 'Ônibus a caminho' : 'Em viagem'}
                    </span>
                    {uiStatus === 'WAITING' && (
                      <button onClick={resetApp} className="text-xs text-red-500 font-semibold hover:text-red-600">
                        Cancelar
                      </button>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-900">{eta || '--'}</span>
                    {eta && eta !== 'Chegando...' && <span className="text-sm text-slate-400">restante</span>}
                  </div>
                </div>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: assignedBus.color }}
                >
                  <BusIcon size={22} className="text-white" />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                <Navigation size={18} className="text-slate-400" />
                <div className="flex-1">
                  <p className="font-semibold text-sm text-slate-800">{assignedBus.name}</p>
                  <p className="text-xs text-slate-500">
                    {uiStatus === 'WAITING' ? `Aguarde na ${selectedOrigin?.name}` : `Destino: ${selectedDest?.name}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(assignedBus.state) }}></span>
                  <span className="text-xs text-slate-500">{getBusStatusText(assignedBus)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Concluído */}
          {uiStatus === 'FINISHED' && (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-green-500/30">
                <CheckCircle2 size={28} strokeWidth={2.5} />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Você chegou!</h2>
              <p className="text-slate-500 text-sm mb-4">{selectedDest?.name}</p>
              <button
                onClick={resetApp}
                className="w-full py-3.5 bg-slate-900 text-white font-semibold rounded-xl shadow-lg hover:bg-slate-800 active:scale-[0.98] transition-all"
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
