import { Coordinate, Bus, BusState, SimulationConfig, WeightedBusStop, BusTemplate, BusStopData } from './types';

// Localização da Garagem (ponto central)
export const GARAGE_LOCATION: Coordinate = {
  lat: -28.2628,
  lng: -52.4087
};

// ============================================
// PARADAS REAIS DE ONIBUS - OPENSTREETMAP
// Dados extraidos do OpenStreetMap (OSM) - Dezembro 2024
// Cobertura: area urbana de Passo Fundo, RS
// ============================================
export const BUS_STOPS: BusStopData[] = [
  // --- TERMINAIS E PONTOS PRINCIPAIS ---
  { id: 'stop-1', name: 'Rodoviária de Passo Fundo', lat: -28.2549137, lng: -52.3946965, type: 'terminal' },
  { id: 'stop-2', name: 'Parada da Rodoviária', lat: -28.2554151, lng: -52.3953177, type: 'terminal' },
  { id: 'stop-3', name: 'Centro - Prefeitura', lat: -28.2628681, lng: -52.4110635, type: 'parada' },
  { id: 'stop-4', name: 'Clube Comercial', lat: -28.2611434, lng: -52.4081534, type: 'parada' },
  { id: 'stop-5', name: 'Centro - Ponto Principal', lat: -28.2610953, lng: -52.4075024, type: 'parada' },
  // --- ZONA NORTE (UPF / Petrópolis) ---
  { id: 'stop-6', name: 'Parada do Gordo', lat: -28.2414403, lng: -52.3856536, type: 'parada' },
  { id: 'stop-7', name: 'Petrópolis Norte', lat: -28.2458695, lng: -52.3810216, type: 'parada' },
  { id: 'stop-8', name: 'UPF Acesso', lat: -28.2464324, lng: -52.3794284, type: 'parada' },
  { id: 'stop-9', name: 'Bairro São José', lat: -28.2482252, lng: -52.3892969, type: 'parada' },
  { id: 'stop-10', name: 'São Cristóvão', lat: -28.2514959, lng: -52.3935991, type: 'parada' },
  { id: 'stop-11', name: 'Vila Planaltina', lat: -28.2525846, lng: -52.3945960, type: 'parada' },
  { id: 'stop-12', name: 'Av. Brasil Norte', lat: -28.2543717, lng: -52.3973684, type: 'parada' },
  { id: 'stop-13', name: 'IFSUL', lat: -28.2553111, lng: -52.3861550, type: 'parada' },
  { id: 'stop-14', name: 'Bairro Bom Jesus', lat: -28.2550085, lng: -52.3978393, type: 'parada' },
  // --- ZONA CENTRO ---
  { id: 'stop-15', name: 'Mario Tintas', lat: -28.2588417, lng: -52.4035370, type: 'parada' },
  { id: 'stop-16', name: 'Praça Tochetto', lat: -28.2591273, lng: -52.4038229, type: 'parada' },
  { id: 'stop-17', name: 'Av. Brasil Centro', lat: -28.2594818, lng: -52.4074789, type: 'parada' },
  { id: 'stop-18', name: 'Centro Histórico', lat: -28.2623874, lng: -52.4059962, type: 'parada' },
  { id: 'stop-19', name: 'Hospital São Vicente', lat: -28.2625795, lng: -52.4112801, type: 'parada' },
  { id: 'stop-20', name: 'Catedral', lat: -28.2626471, lng: -52.4100823, type: 'parada' },
  { id: 'stop-21', name: 'Praça Marechal Floriano', lat: -28.2635270, lng: -52.4133762, type: 'parada' },
  { id: 'stop-22', name: 'Shopping Bella Città', lat: -28.2635462, lng: -52.4082372, type: 'terminal' },
  { id: 'stop-23', name: 'Bourbon Passo Fundo', lat: -28.2640008, lng: -52.4051628, type: 'parada' },
  { id: 'stop-24', name: 'Fagundes dos Reis', lat: -28.2645313, lng: -52.4155702, type: 'parada' },
  { id: 'stop-25', name: 'Parque da Gare', lat: -28.2648022, lng: -52.4149713, type: 'parada' },
  { id: 'stop-26', name: 'Centro Sul', lat: -28.2656561, lng: -52.4043799, type: 'parada' },
  // --- ZONA LESTE ---
  { id: 'stop-27', name: 'Vila Cruzeiro', lat: -28.2664509, lng: -52.3964319, type: 'parada' },
  { id: 'stop-28', name: 'Parque Bela Vista', lat: -28.2669411, lng: -52.4067712, type: 'parada' },
  { id: 'stop-29', name: 'Bairro Vera Cruz', lat: -28.2690308, lng: -52.3896466, type: 'parada' },
  { id: 'stop-30', name: 'Vila Exposição', lat: -28.2690835, lng: -52.3886247, type: 'parada' },
  { id: 'stop-31', name: 'Bairro Zachia', lat: -28.2699507, lng: -52.3970720, type: 'parada' },
  { id: 'stop-32', name: 'São Luiz Gonzaga', lat: -28.2706919, lng: -52.3919659, type: 'parada' },
  { id: 'stop-33', name: 'Bairro Nenê Graeff', lat: -28.2710517, lng: -52.3868311, type: 'parada' },
  { id: 'stop-34', name: 'Cohab Lindóia', lat: -28.2718384, lng: -52.3864234, type: 'parada' },
  { id: 'stop-35', name: 'Operário', lat: -28.2724907, lng: -52.3902152, type: 'parada' },
  { id: 'stop-36', name: 'Bairro Boqueirão Leste', lat: -28.2738134, lng: -52.3965079, type: 'parada' },
  // --- ZONA SUL (Boqueirão) ---
  { id: 'stop-37', name: 'Av. Sete de Setembro', lat: -28.2690500, lng: -52.4066056, type: 'parada' },
  { id: 'stop-38', name: 'Boqueirão Centro', lat: -28.2709094, lng: -52.4026045, type: 'parada' },
  { id: 'stop-39', name: 'Lucas Araújo', lat: -28.2721778, lng: -52.4074060, type: 'parada' },
  { id: 'stop-40', name: 'Vila Rodrigues', lat: -28.2736193, lng: -52.4086912, type: 'parada' },
  { id: 'stop-41', name: 'Av. Presidente Vargas', lat: -28.2751429, lng: -52.4080710, type: 'parada' },
  { id: 'stop-42', name: 'Boqueirão Sul', lat: -28.2753766, lng: -52.4000683, type: 'parada' },
  { id: 'stop-43', name: 'Victor Issler', lat: -28.2755051, lng: -52.4023127, type: 'parada' },
  { id: 'stop-44', name: 'Vila Luíza', lat: -28.2769798, lng: -52.4123706, type: 'parada' },
  { id: 'stop-45', name: 'Bairro São Luiz', lat: -28.2776118, lng: -52.4079777, type: 'parada' },
  { id: 'stop-46', name: 'Vila Industrial', lat: -28.2776425, lng: -52.4078563, type: 'parada' },
  { id: 'stop-47', name: 'Av. Rio Grande', lat: -28.2777555, lng: -52.4117628, type: 'parada' },
  { id: 'stop-48', name: 'Bairro Jaboticabal', lat: -28.2792013, lng: -52.4020658, type: 'parada' },
  { id: 'stop-49', name: 'Boqueirão Extremo Sul', lat: -28.2812961, lng: -52.4022052, type: 'parada' },
  { id: 'stop-50', name: 'Portal da Cidade', lat: -28.2834113, lng: -52.4066462, type: 'parada' },
  // --- ZONA OESTE ---
  { id: 'stop-51', name: 'Lucas Araújo Oeste', lat: -28.2471629, lng: -52.4153355, type: 'parada' },
  { id: 'stop-52', name: 'Vila Santa Maria', lat: -28.2476172, lng: -52.4145242, type: 'parada' },
  { id: 'stop-53', name: 'Bairro Planaltina', lat: -28.2558349, lng: -52.4012827, type: 'parada' },
  { id: 'stop-54', name: 'Centro Oeste', lat: -28.2570181, lng: -52.4008930, type: 'parada' },
  { id: 'stop-55', name: 'Vila São Jorge', lat: -28.2580457, lng: -52.4176450, type: 'parada' },
  { id: 'stop-56', name: 'São Valentim', lat: -28.2615067, lng: -52.4128076, type: 'parada' },
  { id: 'stop-57', name: 'Caravela', lat: -28.2686459, lng: -52.4390788, type: 'parada' },
  { id: 'stop-58', name: 'Stok Center', lat: -28.2733644, lng: -52.4364625, type: 'parada' },
  { id: 'stop-59', name: 'Bairro Padre Ulrico', lat: -28.2738370, lng: -52.4174521, type: 'parada' },
  { id: 'stop-60', name: 'Av. Mauá', lat: -28.2741687, lng: -52.4163317, type: 'parada' },
  { id: 'stop-61', name: 'Vila Donária', lat: -28.2760775, lng: -52.4169191, type: 'parada' },
  { id: 'stop-62', name: 'Bairro Adolfo Groth', lat: -28.2787912, lng: -52.4160820, type: 'parada' },
  { id: 'stop-63', name: 'Distrito Industrial', lat: -28.2793463, lng: -52.4157842, type: 'parada' },
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

// ============================================
// CONFIGURACOES DO PAINEL DE CONTROLE
// ============================================

// Configuracao padrao da simulacao
export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  targetWaitingPassengers: 10,
  passengerGenerationRate: 1.0,
  isPaused: false,
  speedMultiplier: 1,
  simulatedHour: 12,
  useRealisticDemand: false,
  // Auto-scaling da frota (economia)
  fleetAutoScale: true,  // Automatico por padrao
  minBuses: 3,           // Minimo 3 onibus
  maxBuses: 20,          // Maximo 20 onibus
};

// Metas SOLUMOBI (Tempo Medio de Espera)
export const TARGET_TME_SECONDS = { min: 300, max: 600 }; // 5-10 minutos

// ============================================
// PARADAS PONDERADAS - Dados OSM com pesos de demanda
// Pesos baseados em: terminais (9-10), comercio (7-8), residencial (5-6), industrial (3-4)
// Multiplicadores de pico: manha (7-9h), tarde (17-19h)
// ============================================
export const WEIGHTED_BUS_STOPS: WeightedBusStop[] = [
  // --- TERMINAIS (peso alto) ---
  { id: 'stop-1', name: 'Rodoviária de Passo Fundo', lat: -28.2549137, lng: -52.3946965,
    type: 'terminal', weight: 10, peakMultiplier: { morning: 2.0, evening: 2.0, offPeak: 1.5 } },
  { id: 'stop-2', name: 'Parada da Rodoviária', lat: -28.2554151, lng: -52.3953177,
    type: 'terminal', weight: 9, peakMultiplier: { morning: 2.0, evening: 2.0, offPeak: 1.5 } },
  { id: 'stop-22', name: 'Shopping Bella Città', lat: -28.2635462, lng: -52.4082372,
    type: 'terminal', weight: 9, peakMultiplier: { morning: 0.5, evening: 2.5, offPeak: 1.0 } },
  // --- CENTRO (peso alto) ---
  { id: 'stop-3', name: 'Centro - Prefeitura', lat: -28.2628681, lng: -52.4110635,
    type: 'parada', weight: 8, peakMultiplier: { morning: 1.5, evening: 1.5, offPeak: 1.0 } },
  { id: 'stop-4', name: 'Clube Comercial', lat: -28.2611434, lng: -52.4081534,
    type: 'parada', weight: 8, peakMultiplier: { morning: 1.2, evening: 1.5, offPeak: 1.0 } },
  { id: 'stop-5', name: 'Centro - Ponto Principal', lat: -28.2610953, lng: -52.4075024,
    type: 'parada', weight: 8, peakMultiplier: { morning: 1.5, evening: 1.5, offPeak: 1.0 } },
  { id: 'stop-19', name: 'Hospital São Vicente', lat: -28.2625795, lng: -52.4112801,
    type: 'parada', weight: 8, peakMultiplier: { morning: 1.5, evening: 1.5, offPeak: 1.2 } },
  { id: 'stop-20', name: 'Catedral', lat: -28.2626471, lng: -52.4100823,
    type: 'parada', weight: 7, peakMultiplier: { morning: 1.2, evening: 1.2, offPeak: 1.0 } },
  { id: 'stop-23', name: 'Bourbon Passo Fundo', lat: -28.2640008, lng: -52.4051628,
    type: 'parada', weight: 8, peakMultiplier: { morning: 0.5, evening: 2.0, offPeak: 1.0 } },
  // --- EDUCAÇÃO (alto peso manhã) ---
  { id: 'stop-8', name: 'UPF Acesso', lat: -28.2464324, lng: -52.3794284,
    type: 'parada', weight: 9, peakMultiplier: { morning: 3.0, evening: 2.5, offPeak: 0.5 } },
  { id: 'stop-13', name: 'IFSUL', lat: -28.2553111, lng: -52.3861550,
    type: 'parada', weight: 8, peakMultiplier: { morning: 2.5, evening: 2.0, offPeak: 0.5 } },
  // --- BAIRROS RESIDENCIAIS (peso médio) ---
  { id: 'stop-6', name: 'Parada do Gordo', lat: -28.2414403, lng: -52.3856536,
    type: 'parada', weight: 6, peakMultiplier: { morning: 2.0, evening: 1.5, offPeak: 0.8 } },
  { id: 'stop-7', name: 'Petrópolis Norte', lat: -28.2458695, lng: -52.3810216,
    type: 'parada', weight: 6, peakMultiplier: { morning: 2.0, evening: 1.5, offPeak: 0.8 } },
  { id: 'stop-10', name: 'São Cristóvão', lat: -28.2514959, lng: -52.3935991,
    type: 'parada', weight: 6, peakMultiplier: { morning: 2.0, evening: 1.5, offPeak: 0.8 } },
  { id: 'stop-14', name: 'Bairro Bom Jesus', lat: -28.2550085, lng: -52.3978393,
    type: 'parada', weight: 5, peakMultiplier: { morning: 2.0, evening: 1.5, offPeak: 0.8 } },
  { id: 'stop-25', name: 'Parque da Gare', lat: -28.2648022, lng: -52.4149713,
    type: 'parada', weight: 6, peakMultiplier: { morning: 0.8, evening: 1.5, offPeak: 1.0 } },
  { id: 'stop-40', name: 'Vila Rodrigues', lat: -28.2736193, lng: -52.4086912,
    type: 'parada', weight: 5, peakMultiplier: { morning: 2.0, evening: 1.5, offPeak: 0.8 } },
  { id: 'stop-39', name: 'Lucas Araújo', lat: -28.2721778, lng: -52.4074060,
    type: 'parada', weight: 6, peakMultiplier: { morning: 2.0, evening: 1.5, offPeak: 0.8 } },
  { id: 'stop-44', name: 'Vila Luíza', lat: -28.2769798, lng: -52.4123706,
    type: 'parada', weight: 5, peakMultiplier: { morning: 2.0, evening: 1.5, offPeak: 0.8 } },
  // --- BOQUEIRÃO (zona sul) ---
  { id: 'stop-38', name: 'Boqueirão Centro', lat: -28.2709094, lng: -52.4026045,
    type: 'parada', weight: 6, peakMultiplier: { morning: 2.0, evening: 1.5, offPeak: 0.8 } },
  { id: 'stop-42', name: 'Boqueirão Sul', lat: -28.2753766, lng: -52.4000683,
    type: 'parada', weight: 5, peakMultiplier: { morning: 2.0, evening: 1.5, offPeak: 0.8 } },
  { id: 'stop-48', name: 'Bairro Jaboticabal', lat: -28.2792013, lng: -52.4020658,
    type: 'parada', weight: 5, peakMultiplier: { morning: 2.0, evening: 1.5, offPeak: 0.8 } },
  // --- ZONA LESTE ---
  { id: 'stop-29', name: 'Bairro Vera Cruz', lat: -28.2690308, lng: -52.3896466,
    type: 'parada', weight: 5, peakMultiplier: { morning: 2.0, evening: 1.5, offPeak: 0.8 } },
  { id: 'stop-32', name: 'São Luiz Gonzaga', lat: -28.2706919, lng: -52.3919659,
    type: 'parada', weight: 5, peakMultiplier: { morning: 2.0, evening: 1.5, offPeak: 0.8 } },
  { id: 'stop-35', name: 'Operário', lat: -28.2724907, lng: -52.3902152,
    type: 'parada', weight: 5, peakMultiplier: { morning: 2.0, evening: 1.5, offPeak: 0.8 } },
  // --- ZONA OESTE ---
  { id: 'stop-51', name: 'Lucas Araújo Oeste', lat: -28.2471629, lng: -52.4153355,
    type: 'parada', weight: 5, peakMultiplier: { morning: 2.0, evening: 1.5, offPeak: 0.8 } },
  { id: 'stop-57', name: 'Caravela', lat: -28.2686459, lng: -52.4390788,
    type: 'parada', weight: 5, peakMultiplier: { morning: 2.0, evening: 1.5, offPeak: 0.8 } },
  { id: 'stop-58', name: 'Stok Center', lat: -28.2733644, lng: -52.4364625,
    type: 'parada', weight: 6, peakMultiplier: { morning: 0.5, evening: 2.0, offPeak: 1.0 } },
  // --- INDUSTRIAL (baixo peso) ---
  { id: 'stop-63', name: 'Distrito Industrial', lat: -28.2793463, lng: -52.4157842,
    type: 'parada', weight: 4, peakMultiplier: { morning: 2.5, evening: 2.0, offPeak: 0.3 } },
];

// Templates para gerar onibus dinamicamente (ate 20)
export const BUS_TEMPLATES: BusTemplate[] = [
  { namePrefix: 'Expresso', color: '#2563eb', capacity: 40 },
  { namePrefix: 'Linha', color: '#dc2626', capacity: 45 },
  { namePrefix: 'Integração', color: '#059669', capacity: 35 },
  { namePrefix: 'Circular', color: '#d97706', capacity: 30 },
  { namePrefix: 'Rápido', color: '#7c3aed', capacity: 40 },
  { namePrefix: 'Executivo', color: '#0891b2', capacity: 35 },
  { namePrefix: 'Direto', color: '#be185d', capacity: 30 },
  { namePrefix: 'Regional', color: '#4f46e5', capacity: 40 },
];

// Funcao auxiliar para gerar onibus a partir dos templates
export function generateBusesFromTemplates(count: number): Bus[] {
  const buses: Bus[] = [];
  const stops = WEIGHTED_BUS_STOPS;

  for (let i = 0; i < count; i++) {
    const template = BUS_TEMPLATES[i % BUS_TEMPLATES.length];
    const stop = stops[i % stops.length];

    buses.push({
      id: `bus-${i + 1}`,
      name: `${template.namePrefix} ${i + 1}`,
      location: { lat: stop.lat, lng: stop.lng },
      capacity: template.capacity,
      color: template.color,
      path: [],
      state: BusState.AVAILABLE,
      stateStartTime: Date.now(),
      assignment: null,
      passengersOnBoard: [],
    });
  }

  return buses;
}
