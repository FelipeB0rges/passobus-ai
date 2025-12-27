import { Passenger, PassengerStatus, WeightedBusStop, SimulationConfig } from '../types';
import { WEIGHTED_BUS_STOPS, MOCK_NAMES, AVATAR_COLORS } from '../constants';

// Determina o periodo do dia baseado na hora
type DayPeriod = 'morning' | 'evening' | 'offPeak';

function getDayPeriod(hour: number): DayPeriod {
  if (hour >= 7 && hour < 9) return 'morning';
  if (hour >= 17 && hour < 19) return 'evening';
  return 'offPeak';
}

// Seleciona uma parada ponderada por importancia e horario
function selectWeightedStop(
  stops: WeightedBusStop[],
  hour: number,
  useRealisticDemand: boolean,
  excludeId?: string
): WeightedBusStop {
  const period = getDayPeriod(hour);

  // Filtra a parada excluida e calcula pesos
  const availableStops = stops.filter(s => s.id !== excludeId);

  const weights = availableStops.map(stop => {
    const baseWeight = stop.weight;
    const timeMultiplier = useRealisticDemand ? stop.peakMultiplier[period] : 1;
    return {
      stop,
      weight: baseWeight * timeMultiplier,
    };
  });

  // Calcula peso total
  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);

  // Selecao aleatoria ponderada
  let random = Math.random() * totalWeight;
  for (const { stop, weight } of weights) {
    random -= weight;
    if (random <= 0) return stop;
  }

  // Fallback para ultima parada
  return weights[weights.length - 1].stop;
}

// Gera um passageiro com origem/destino ponderados por zona e horario
export function generateWeightedPassenger(
  id: string,
  config: SimulationConfig
): Passenger {
  const origin = selectWeightedStop(
    WEIGHTED_BUS_STOPS,
    config.simulatedHour,
    config.useRealisticDemand
  );

  const destination = selectWeightedStop(
    WEIGHTED_BUS_STOPS,
    config.simulatedHour,
    config.useRealisticDemand,
    origin.id // Exclui a origem como destino
  );

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
}

// Gera um passageiro simples (para uso do usuario ou testes)
export function generateSimplePassenger(
  id: string,
  originIndex: number,
  destinationIndex: number,
  isBot: boolean = false
): Passenger {
  const stops = WEIGHTED_BUS_STOPS;
  const origin = stops[originIndex % stops.length];
  const destination = stops[destinationIndex % stops.length];

  return {
    id,
    name: MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)],
    origin: { lat: origin.lat, lng: origin.lng },
    destination: { lat: destination.lat, lng: destination.lng },
    status: PassengerStatus.WAITING,
    requestTime: Date.now(),
    isBot,
    assignedBusId: null,
    avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
  };
}

// Retorna uma descricao do periodo atual
export function getPeriodDescription(hour: number): string {
  const period = getDayPeriod(hour);
  switch (period) {
    case 'morning':
      return 'Pico da Manha (7-9h)';
    case 'evening':
      return 'Pico da Tarde (17-19h)';
    default:
      return 'Fora de Pico';
  }
}

// Verifica se esta em horario de pico
export function isPeakHour(hour: number): boolean {
  return getDayPeriod(hour) !== 'offPeak';
}
