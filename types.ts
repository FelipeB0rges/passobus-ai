export interface Coordinate {
  lat: number;
  lng: number;
}

// Estados do ônibus na máquina de estados
export enum BusState {
  AVAILABLE = 'AVAILABLE',           // Disponível para pegar passageiros (pode estar em qualquer lugar)
  CRUISING = 'CRUISING',             // Circulando pela cidade sem passageiros
  GOING_TO_PICKUP = 'GOING_TO_PICKUP',
  BOARDING = 'BOARDING',
  GOING_TO_DROPOFF = 'GOING_TO_DROPOFF',
  DISEMBARKING = 'DISEMBARKING',
}

export enum PassengerStatus {
  WAITING = 'AGUARDANDO',
  ON_BOARD = 'EM_VIAGEM',
  COMPLETED = 'FINALIZADO',
}

// Atribuição atual do ônibus (um passageiro por vez)
export interface BusAssignment {
  passengerId: string;
  pickupLocation: Coordinate;
  dropoffLocation: Coordinate;
  pickupPath: Coordinate[];   // Rota pré-calculada até o pickup
  dropoffPath: Coordinate[];  // Rota pré-calculada do pickup até o dropoff
}

// Interface simplificada do ônibus
export interface Bus {
  id: string;
  name: string;
  color: string;
  capacity: number;

  // Posição e movimento (fonte única de verdade)
  location: Coordinate;
  path: Coordinate[];        // Rota atual que o ônibus está seguindo

  // Máquina de estados
  state: BusState;
  stateStartTime: number;    // Quando o estado atual começou

  // Atribuição atual (null se ocioso)
  assignment: BusAssignment | null;

  // Passageiros a bordo
  passengersOnBoard: string[];
}

export interface Passenger {
  id: string;
  name: string;
  origin: Coordinate;
  destination: Coordinate;
  status: PassengerStatus;
  assignedBusId: string | null;
  requestTime: number;
  isBot: boolean;
  avatarColor: string;
  // Campos opcionais para tracking de viagem
  boardingTime?: number;
  dropoffTime?: number;
  tripDistanceKm?: number;
}

// ============================================
// CONFIGURACAO E METRICAS DA SIMULACAO
// ============================================

// Configuracao da Simulacao
export interface SimulationConfig {
  targetWaitingPassengers: number;    // 0-100 (default: 10)
  passengerGenerationRate: number;    // 0.1-10 por segundo
  isPaused: boolean;
  speedMultiplier: number;            // 1, 2, 5, 10
  simulatedHour: number;              // 0-23
  useRealisticDemand: boolean;        // horario de pico
  // Auto-scaling da frota (economia)
  fleetAutoScale: boolean;            // true = automatico, false = manual
  minBuses: number;                   // Minimo de onibus (default: 3)
  maxBuses: number;                   // Maximo de onibus (default: 20)
}

// Metricas em tempo real
export interface SimulationMetrics {
  averageWaitTime: number;            // TME em segundos
  passengersWaiting: number;
  passengersOnBoard: number;
  passengersServedTotal: number;
  fleetUtilization: number;           // 0-100%
  busesActive: number;
  busesIdle: number;
}

// Tipo de parada de onibus
export type BusStopType = 'terminal' | 'parada';

// Dados basicos de parada
export interface BusStopData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: BusStopType;
}

// Parada com peso por zona (para geracao ponderada)
export interface WeightedBusStop extends BusStopData {
  weight: number;                     // 1-10 importancia
  peakMultiplier: {
    morning: number;   // 7-9h
    evening: number;   // 17-19h
    offPeak: number;
  };
}

// Template para gerar onibus dinamicamente
export interface BusTemplate {
  namePrefix: string;
  color: string;
  capacity: number;
}
