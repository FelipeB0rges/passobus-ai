import { useMemo, useRef, useEffect } from 'react';
import { Bus, Passenger, PassengerStatus, BusState, SimulationMetrics } from '../types';
import { TARGET_TME_SECONDS } from '../constants';

/**
 * Configuracao do auto-scaling da frota
 */
export interface FleetAutoScaleConfig {
  minBuses: number;           // Minimo de onibus (default: 3)
  maxBuses: number;           // Maximo de onibus (default: 20)
  passengersPerBus: number;   // Meta de passageiros por onibus (default: 3)
  scaleUpThreshold: number;   // TME em segundos para adicionar onibus (default: 300 = 5min)
  scaleDownThreshold: number; // Tempo ocioso em segundos para remover (default: 60)
  evaluationInterval: number; // Intervalo de avaliacao em ms (default: 5000)
}

export const DEFAULT_FLEET_CONFIG: FleetAutoScaleConfig = {
  minBuses: 3,
  maxBuses: 20,
  passengersPerBus: 3,
  scaleUpThreshold: 300,    // 5 minutos - meta SOLUMOBI
  scaleDownThreshold: 60,   // 1 minuto ocioso
  evaluationInterval: 5000,
};

/**
 * Resultado do calculo de auto-scaling
 */
export interface FleetScaleDecision {
  recommendedBusCount: number;
  currentBusCount: number;
  action: 'add' | 'remove' | 'maintain';
  reason: string;
  demandScore: number;         // 0-100: quao ocupada esta a demanda
  efficiencyScore: number;     // 0-100: quao eficiente esta a frota
}

/**
 * Calcula a quantidade ideal de onibus baseado na demanda
 *
 * Algoritmo:
 * 1. Conta passageiros esperando e a bordo
 * 2. Calcula TME atual
 * 3. Verifica utilizacao da frota
 * 4. Decide: adicionar, remover ou manter
 *
 * Principio: ECONOMIA - se nao ha demanda, nao ha onibus extras
 */
export function calculateOptimalFleetSize(
  buses: Bus[],
  passengers: Passenger[],
  metrics: SimulationMetrics,
  config: FleetAutoScaleConfig = DEFAULT_FLEET_CONFIG
): FleetScaleDecision {
  const currentBusCount = buses.length;

  // Conta passageiros ativos (esperando ou a bordo)
  const waitingPassengers = passengers.filter(
    p => p.status === PassengerStatus.WAITING
  ).length;
  const onBoardPassengers = passengers.filter(
    p => p.status === PassengerStatus.ON_BOARD
  ).length;
  const activePassengers = waitingPassengers + onBoardPassengers;

  // Conta onibus ociosos (AVAILABLE ou CRUISING sem missao)
  const idleBuses = buses.filter(
    b => (b.state === BusState.AVAILABLE || b.state === BusState.CRUISING) && !b.assignment
  ).length;

  // Conta onibus em servico ativo
  const activeBuses = currentBusCount - idleBuses;

  // TME em segundos
  const tme = metrics.averageWaitTime;

  // Calcula scores
  const demandScore = Math.min(100, (activePassengers / (currentBusCount * config.passengersPerBus)) * 100);
  const efficiencyScore = currentBusCount > 0 ? (activeBuses / currentBusCount) * 100 : 0;

  // ----- LOGICA DE DECISAO -----

  // Caso 1: TME muito alto E passageiros esperando -> ADICIONAR
  if (tme > config.scaleUpThreshold && waitingPassengers > 0 && currentBusCount < config.maxBuses) {
    const busesNeeded = Math.ceil(waitingPassengers / config.passengersPerBus);
    const recommendedBusCount = Math.min(
      config.maxBuses,
      Math.max(currentBusCount + 1, currentBusCount + Math.ceil(busesNeeded / 2))
    );

    return {
      recommendedBusCount,
      currentBusCount,
      action: 'add',
      reason: `TME alto (${Math.round(tme)}s) com ${waitingPassengers} esperando`,
      demandScore,
      efficiencyScore,
    };
  }

  // Caso 2: Muitos passageiros por onibus ativo -> ADICIONAR
  const passengersPerActiveBus = activeBuses > 0 ? activePassengers / activeBuses : activePassengers;
  if (passengersPerActiveBus > config.passengersPerBus * 1.5 && currentBusCount < config.maxBuses) {
    return {
      recommendedBusCount: Math.min(config.maxBuses, currentBusCount + 1),
      currentBusCount,
      action: 'add',
      reason: `Sobrecarga: ${passengersPerActiveBus.toFixed(1)} passageiros/onibus`,
      demandScore,
      efficiencyScore,
    };
  }

  // Caso 3: Muitos onibus ociosos E pouca demanda -> REMOVER
  // Regra de economia: se mais de 50% da frota esta ociosa E demanda baixa
  const idleRatio = idleBuses / currentBusCount;
  if (idleRatio > 0.5 && activePassengers < currentBusCount && currentBusCount > config.minBuses) {
    // Calcula quantos onibus realmente precisamos
    const neededBuses = Math.max(
      config.minBuses,
      Math.ceil(activePassengers / config.passengersPerBus) + 1 // +1 para margem
    );

    if (neededBuses < currentBusCount) {
      return {
        recommendedBusCount: neededBuses,
        currentBusCount,
        action: 'remove',
        reason: `${idleBuses} onibus ociosos, demanda de ${activePassengers} passageiros`,
        demandScore,
        efficiencyScore,
      };
    }
  }

  // Caso 4: Sem passageiros -> manter minimo
  if (activePassengers === 0 && currentBusCount > config.minBuses) {
    return {
      recommendedBusCount: config.minBuses,
      currentBusCount,
      action: 'remove',
      reason: 'Sem passageiros ativos',
      demandScore,
      efficiencyScore,
    };
  }

  // Caso 5: Frota abaixo do minimo -> ADICIONAR
  if (currentBusCount < config.minBuses) {
    return {
      recommendedBusCount: config.minBuses,
      currentBusCount,
      action: 'add',
      reason: `Frota abaixo do minimo (${config.minBuses})`,
      demandScore,
      efficiencyScore,
    };
  }

  // Default: manter
  return {
    recommendedBusCount: currentBusCount,
    currentBusCount,
    action: 'maintain',
    reason: 'Frota equilibrada',
    demandScore,
    efficiencyScore,
  };
}

/**
 * Hook para auto-scaling da frota
 *
 * Retorna a decisao atual e historico de ajustes
 */
export function useFleetAutoScale(
  buses: Bus[],
  passengers: Passenger[],
  metrics: SimulationMetrics,
  config: FleetAutoScaleConfig = DEFAULT_FLEET_CONFIG,
  isPaused: boolean = false
): FleetScaleDecision {
  const decision = useMemo(() => {
    return calculateOptimalFleetSize(buses, passengers, metrics, config);
  }, [buses, passengers, metrics, config]);

  return decision;
}

/**
 * Formata a razao da decisao para exibicao
 */
export function formatScaleReason(decision: FleetScaleDecision): string {
  switch (decision.action) {
    case 'add':
      return `+${decision.recommendedBusCount - decision.currentBusCount} onibus: ${decision.reason}`;
    case 'remove':
      return `-${decision.currentBusCount - decision.recommendedBusCount} onibus: ${decision.reason}`;
    default:
      return decision.reason;
  }
}

/**
 * Retorna icone/cor baseado na acao
 */
export function getScaleActionStyle(action: 'add' | 'remove' | 'maintain'): {
  color: string;
  bgColor: string;
  icon: 'plus' | 'minus' | 'check';
} {
  switch (action) {
    case 'add':
      return { color: 'text-green-600', bgColor: 'bg-green-100', icon: 'plus' };
    case 'remove':
      return { color: 'text-amber-600', bgColor: 'bg-amber-100', icon: 'minus' };
    default:
      return { color: 'text-slate-600', bgColor: 'bg-slate-100', icon: 'check' };
  }
}
