import { Coordinate, Bus, BusState } from './types';

export interface BusStopData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'terminal' | 'parada';
}

// Localização da Garagem (ponto central)
export const GARAGE_LOCATION: Coordinate = {
  lat: -28.2628,
  lng: -52.4087
};

// Paradas fixas em Passo Fundo
export const BUS_STOPS: BusStopData[] = [
  { id: 'stop-1', name: 'Shopping Bella Città', lat: -28.2635, lng: -52.4075, type: 'terminal' },
  { id: 'stop-2', name: 'UPF (Campus I)', lat: -28.2325, lng: -52.3815, type: 'terminal' },
  { id: 'stop-3', name: 'Hospital São Vicente', lat: -28.2610, lng: -52.4110, type: 'parada' },
  { id: 'stop-4', name: 'Parque da Gare', lat: -28.2670, lng: -52.4150, type: 'parada' },
  { id: 'stop-5', name: 'Catedral', lat: -28.2625, lng: -52.4080, type: 'parada' },
  { id: 'stop-6', name: 'Bairro Boqueirão', lat: -28.2750, lng: -52.4250, type: 'parada' },
  { id: 'stop-7', name: 'Bairro São Cristóvão', lat: -28.2500, lng: -52.3900, type: 'parada' },
  { id: 'stop-8', name: 'Rodoviária', lat: -28.2700, lng: -52.4200, type: 'terminal' },
  { id: 'stop-9', name: 'Bourbon Shopping', lat: -28.2580, lng: -52.4000, type: 'parada' },
  { id: 'stop-10', name: 'Praça Tamandaré', lat: -28.2600, lng: -52.4050, type: 'parada' },
  { id: 'stop-11', name: 'IFSUL', lat: -28.2550, lng: -52.3950, type: 'parada' },
  { id: 'stop-12', name: 'Stok Center', lat: -28.2800, lng: -52.4300, type: 'parada' },
  { id: 'stop-13', name: 'Petrópolis', lat: -28.2450, lng: -52.3850, type: 'parada' },
  { id: 'stop-14', name: 'Vila Rodrigues', lat: -28.2550, lng: -52.4150, type: 'parada' },
  { id: 'stop-15', name: 'Lucas Araújo', lat: -28.2400, lng: -52.4000, type: 'parada' }
];

// Ônibus iniciais - espalhados pela cidade para simular fluxo ativo
export const INITIAL_BUSES: Bus[] = [
  {
    id: 'bus-1',
    name: 'Expresso Centro',
    location: { lat: -28.2635, lng: -52.4075 }, // Shopping Bella Città
    capacity: 40,
    color: '#2563eb',
    path: [],
    state: BusState.AVAILABLE, // Disponível para pegar passageiros
    stateStartTime: Date.now(),
    assignment: null,
    passengersOnBoard: [],
  },
  {
    id: 'bus-2',
    name: 'Linha UPF',
    location: { lat: -28.2325, lng: -52.3815 }, // UPF
    capacity: 45,
    color: '#dc2626',
    path: [],
    state: BusState.AVAILABLE,
    stateStartTime: Date.now(),
    assignment: null,
    passengersOnBoard: [],
  },
  {
    id: 'bus-3',
    name: 'Integração Boqueirão',
    location: { lat: -28.2750, lng: -52.4250 }, // Boqueirão
    capacity: 35,
    color: '#059669',
    path: [],
    state: BusState.AVAILABLE,
    stateStartTime: Date.now(),
    assignment: null,
    passengersOnBoard: [],
  },
  {
    id: 'bus-4',
    name: 'Circular Petrópolis',
    location: { lat: -28.2450, lng: -52.3850 }, // Petrópolis
    capacity: 30,
    color: '#d97706',
    path: [],
    state: BusState.AVAILABLE,
    stateStartTime: Date.now(),
    assignment: null,
    passengersOnBoard: [],
  },
  {
    id: 'bus-5',
    name: 'Rápido Rodoviária',
    location: { lat: -28.2700, lng: -52.4200 }, // Rodoviária
    capacity: 40,
    color: '#7c3aed',
    path: [],
    state: BusState.AVAILABLE,
    stateStartTime: Date.now(),
    assignment: null,
    passengersOnBoard: [],
  },
];

export const MOCK_NAMES = [
  'João', 'Maria', 'Pedro', 'Ana', 'Lucas', 'Julia', 'Mateus', 'Larissa',
  'Bruno', 'Carla', 'Diego', 'Fernanda', 'Gabriel', 'Helena', 'Igor', 'Jéssica'
];

export const AVATAR_COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#22d3ee', '#818cf8', '#c084fc', '#f472b6'
];

// Configurações de simulação
export const USER_ROUTE_COLOR = '#0f172a';
export const BUS_SPEED = 0.0000025;
export const BOARDING_TIME = 3000; // 3 segundos de parada
