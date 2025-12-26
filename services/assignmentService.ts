import { Bus, Passenger, Coordinate, BusAssignment } from '../types';
import { isBusAvailable } from './busStateMachine';
import { preCalculateRoutes } from './routingService';

/**
 * Calcula a distância euclidiana entre dois pontos.
 */
function calculateDistance(a: Coordinate, b: Coordinate): number {
  const latDiff = a.lat - b.lat;
  const lngDiff = a.lng - b.lng;
  return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
}

/**
 * Encontra o ônibus disponível mais próximo de uma localização.
 * Retorna null se não houver ônibus disponível.
 */
export function findNearestAvailableBus(
  buses: Bus[],
  passengerOrigin: Coordinate
): Bus | null {
  const availableBuses = buses.filter(isBusAvailable);

  if (availableBuses.length === 0) return null;

  let nearestBus: Bus | null = null;
  let shortestDistance = Infinity;

  for (const bus of availableBuses) {
    const distance = calculateDistance(bus.location, passengerOrigin);
    if (distance < shortestDistance) {
      shortestDistance = distance;
      nearestBus = bus;
    }
  }

  return nearestBus;
}

/**
 * Cria uma atribuição de passageiro para um ônibus (sem rotas).
 * Use createAssignmentWithRoutes para incluir rotas pré-calculadas.
 */
export function createAssignment(
  passenger: Passenger,
  pickupPath: Coordinate[] = [],
  dropoffPath: Coordinate[] = []
): BusAssignment {
  return {
    passengerId: passenger.id,
    pickupLocation: passenger.origin,
    dropoffLocation: passenger.destination,
    pickupPath,
    dropoffPath,
  };
}

/**
 * Cria uma atribuição com rotas pré-calculadas.
 * Calcula ambas as rotas (pickup e dropoff) em paralelo.
 */
export async function createAssignmentWithRoutes(
  busLocation: Coordinate,
  passenger: Passenger
): Promise<BusAssignment> {
  const { pickupPath, dropoffPath } = await preCalculateRoutes(
    busLocation,
    passenger.origin,
    passenger.destination
  );

  return {
    passengerId: passenger.id,
    pickupLocation: passenger.origin,
    dropoffLocation: passenger.destination,
    pickupPath,
    dropoffPath,
  };
}

/**
 * Calcula o ETA estimado baseado no tamanho do caminho.
 * Retorna o tempo em segundos.
 *
 * Baseado na velocidade real: BUS_SPEED = 0.0000025 graus/frame
 * A 60fps, isso é ~0.00015 graus/segundo
 * 1 grau ≈ 111km, então 0.00015 graus ≈ 16.6m/s ≈ 60km/h
 *
 * Distância média entre pontos OSRM ≈ 10-20 metros
 * Então cada ponto ≈ 1 segundo de viagem
 */
export function calculateETASeconds(pathLength: number): number {
  const SECONDS_PER_PATH_POINT = 1.0;
  return pathLength * SECONDS_PER_PATH_POINT;
}

/**
 * Formata o ETA para exibição.
 */
export function formatETA(pathLength: number): string {
  if (pathLength === 0) {
    return 'Calculando...';
  }

  const totalSeconds = calculateETASeconds(pathLength);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (totalSeconds < 30) {
    return 'Chegando...';
  }

  if (minutes === 0) {
    return `${seconds}s`;
  }

  if (minutes < 2) {
    return `${minutes}min ${seconds}s`;
  }

  return `${minutes} min`;
}
