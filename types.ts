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
}
