import { useMemo } from 'react';
import { Bus, Passenger, PassengerStatus, BusState, SimulationMetrics } from '../types';

/**
 * Hook para calcular metricas da simulacao em tempo real
 * Inclui TME (Tempo Medio de Espera), utilizacao da frota, etc.
 */
export function useSimulationMetrics(
  buses: Bus[],
  passengers: Passenger[]
): SimulationMetrics {
  return useMemo(() => {
    const now = Date.now();

    // Passageiros por status
    const waitingPassengers = passengers.filter(
      p => p.status === PassengerStatus.WAITING
    );
    const onBoardPassengers = passengers.filter(
      p => p.status === PassengerStatus.ON_BOARD
    );
    const completedPassengers = passengers.filter(
      p => p.status === PassengerStatus.COMPLETED
    );

    // Calcula tempo de espera medio (TME)
    const waitTimes = waitingPassengers.map(p => (now - p.requestTime) / 1000);
    const averageWaitTime = waitTimes.length > 0
      ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length
      : 0;

    // Onibus por estado
    const idleStates = [BusState.AVAILABLE, BusState.CRUISING];
    const busesIdle = buses.filter(b => idleStates.includes(b.state)).length;
    const busesActive = buses.length - busesIdle;

    // Utilizacao da frota (porcentagem de onibus em servico)
    const fleetUtilization = buses.length > 0
      ? (busesActive / buses.length) * 100
      : 0;

    return {
      averageWaitTime,
      passengersWaiting: waitingPassengers.length,
      passengersOnBoard: onBoardPassengers.length,
      passengersServedTotal: completedPassengers.length,
      fleetUtilization,
      busesActive,
      busesIdle,
    };
  }, [buses, passengers]);
}

/**
 * Formata o tempo de espera para exibicao
 */
export function formatWaitTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

/**
 * Retorna o status do TME baseado nas metas SOLUMOBI
 * Verde: < 5min, Amarelo: 5-10min, Vermelho: > 10min
 */
export function getTMEStatus(averageWaitTimeSeconds: number): 'good' | 'warning' | 'critical' {
  if (averageWaitTimeSeconds <= 300) return 'good';      // < 5 min
  if (averageWaitTimeSeconds <= 600) return 'warning';   // 5-10 min
  return 'critical';                                      // > 10 min
}

/**
 * Retorna a cor CSS baseada no status do TME
 */
export function getTMEColor(status: 'good' | 'warning' | 'critical'): string {
  switch (status) {
    case 'good': return 'text-green-500';
    case 'warning': return 'text-amber-500';
    case 'critical': return 'text-red-500';
  }
}
