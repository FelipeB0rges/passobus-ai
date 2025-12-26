import { Bus, BusState, Coordinate } from '../types';
import { BOARDING_TIME } from '../constants';

interface StateTransition {
  newState: BusState;
}

/**
 * Determina o próximo estado do ônibus baseado no estado atual e condições.
 * Função pura - sem efeitos colaterais.
 */
export function getNextState(
  bus: Bus,
  currentTime: number,
  hasReachedDestination: boolean
): StateTransition {
  const timeInState = currentTime - bus.stateStartTime;

  switch (bus.state) {
    case BusState.AVAILABLE:
      // Transição para buscar passageiro quando recebe atribuição
      // (A atribuição é feita externamente, aqui só verificamos)
      if (bus.assignment && bus.path.length > 0) {
        return { newState: BusState.GOING_TO_PICKUP };
      }
      return { newState: bus.state };

    case BusState.GOING_TO_PICKUP:
      if (hasReachedDestination) {
        return { newState: BusState.BOARDING };
      }
      return { newState: bus.state };

    case BusState.BOARDING:
      if (timeInState >= BOARDING_TIME) {
        return { newState: BusState.GOING_TO_DROPOFF };
      }
      return { newState: bus.state };

    case BusState.GOING_TO_DROPOFF:
      if (hasReachedDestination) {
        return { newState: BusState.DISEMBARKING };
      }
      return { newState: bus.state };

    case BusState.DISEMBARKING:
      if (timeInState >= BOARDING_TIME) {
        // Fica disponível imediatamente onde está
        return { newState: BusState.AVAILABLE };
      }
      return { newState: bus.state };

    default:
      return { newState: BusState.AVAILABLE };
  }
}

/**
 * Retorna o destino do ônibus baseado no seu estado atual.
 */
export function getDestinationForState(bus: Bus): Coordinate | null {
  switch (bus.state) {
    case BusState.GOING_TO_PICKUP:
      return bus.assignment?.pickupLocation ?? null;
    case BusState.GOING_TO_DROPOFF:
      return bus.assignment?.dropoffLocation ?? null;
    default:
      return null;
  }
}

/**
 * Verifica se o ônibus está em um estado de movimento.
 */
export function isBusMoving(state: BusState): boolean {
  return [
    BusState.CRUISING,
    BusState.GOING_TO_PICKUP,
    BusState.GOING_TO_DROPOFF,
  ].includes(state);
}

/**
 * Verifica se o ônibus está disponível para novas atribuições.
 * Ônibus em CRUISING também está disponível (pode ser interrompido).
 */
export function isBusAvailable(bus: Bus): boolean {
  return (bus.state === BusState.AVAILABLE || bus.state === BusState.CRUISING) && !bus.assignment;
}
