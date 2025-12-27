import { useState, useEffect, useCallback, useRef } from 'react';
import { Bus, Passenger, BusState, PassengerStatus, SimulationConfig } from '../types';
import { createAssignmentWithRoutes } from '../services/assignmentService';
import { getNextState, isBusMoving, isBusAvailable } from '../services/busStateMachine';
import { getStreetRoute } from '../services/routingService';
import { BUS_SPEED, BUS_STOPS, DEFAULT_SIMULATION_CONFIG, BUS_TEMPLATES, WEIGHTED_BUS_STOPS } from '../constants';

interface SimulationState {
  buses: Bus[];
  passengers: Passenger[];
}

export function useSimulation(
  initialBuses: Bus[],
  initialPassengers: Passenger[],
  config: SimulationConfig = DEFAULT_SIMULATION_CONFIG
) {
  const [state, setState] = useState<SimulationState>({
    buses: initialBuses,
    passengers: initialPassengers,
  });

  // Refs para evitar closures stale
  const stateRef = useRef(state);
  const configRef = useRef(config);
  const processingRef = useRef<Set<string>>(new Set());
  const busProcessingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Atualiza ref da config
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Processa atribuições - roda frequentemente
  useEffect(() => {
    const processAssignments = async () => {
      // Pula se pausado
      if (configRef.current.isPaused) return;

      const { buses, passengers } = stateRef.current;

      // Ônibus disponíveis
      const availableBuses = buses.filter(
        (b) => isBusAvailable(b) && !busProcessingRef.current.has(b.id)
      );

      if (availableBuses.length === 0) return;

      const assignments = [];
      const usedBuses = new Set<string>();

      // PRIORIDADE 1: Passageiros que já reservaram um ônibus específico (fila)
      for (const bus of availableBuses) {
        if (usedBuses.has(bus.id)) continue;

        // Procura passageiro que reservou ESTE ônibus específico
        const queuedPassenger = passengers.find(
          (p) => p.assignedBusId === bus.id &&
                 p.status === PassengerStatus.WAITING &&
                 !processingRef.current.has(p.id) &&
                 !buses.find(b => b.assignment?.passengerId === p.id)
        );

        if (queuedPassenger) {
          usedBuses.add(bus.id);
          processingRef.current.add(queuedPassenger.id);
          busProcessingRef.current.add(bus.id);
          assignments.push({ passenger: queuedPassenger, bus });
        }
      }

      // PRIORIDADE 2: Bots sem ônibus atribuído
      const waitingBots = passengers.filter(
        (p) => p.isBot &&
               p.status === PassengerStatus.WAITING &&
               !p.assignedBusId &&
               !processingRef.current.has(p.id)
      );

      for (const passenger of waitingBots) {
        const available = availableBuses.filter(b => !usedBuses.has(b.id));
        if (available.length === 0) break;

        const nearest = available.reduce((best, bus) => {
          const distBest = Math.hypot(
            best.location.lat - passenger.origin.lat,
            best.location.lng - passenger.origin.lng
          );
          const distBus = Math.hypot(
            bus.location.lat - passenger.origin.lat,
            bus.location.lng - passenger.origin.lng
          );
          return distBus < distBest ? bus : best;
        });

        usedBuses.add(nearest.id);
        processingRef.current.add(passenger.id);
        busProcessingRef.current.add(nearest.id);
        assignments.push({ passenger, bus: nearest });
      }

      if (assignments.length === 0) return;

      // Reserva os ônibus imediatamente
      setState((s) => {
        const busUpdates = new Map(assignments.map(a => [a.bus.id, a.passenger.id]));
        const passengerUpdates = new Map(assignments.map(a => [a.passenger.id, a.bus.id]));

        return {
          buses: s.buses.map((b) =>
            busUpdates.has(b.id)
              ? { ...b, state: BusState.GOING_TO_PICKUP, stateStartTime: Date.now() }
              : b
          ),
          passengers: s.passengers.map((p) =>
            passengerUpdates.has(p.id)
              ? { ...p, assignedBusId: passengerUpdates.get(p.id)! }
              : p
          ),
        };
      });

      // Calcula rotas em paralelo
      await Promise.all(
        assignments.map(async ({ passenger, bus }) => {
          try {
            const assignment = await createAssignmentWithRoutes(
              bus.location,
              passenger
            );

            setState((s) => ({
              ...s,
              buses: s.buses.map((b) =>
                b.id === bus.id
                  ? { ...b, assignment, path: assignment.pickupPath }
                  : b
              ),
            }));
          } catch (error) {
            console.error('Erro ao criar rota:', error);
            // Reverte
            setState((s) => ({
              buses: s.buses.map((b) =>
                b.id === bus.id && !b.assignment
                  ? { ...b, state: BusState.AVAILABLE }
                  : b
              ),
              passengers: s.passengers.map((p) =>
                p.id === passenger.id
                  ? { ...p, assignedBusId: null }
                  : p
              ),
            }));
          } finally {
            processingRef.current.delete(passenger.id);
            busProcessingRef.current.delete(bus.id);
          }
        })
      );
    };

    // Roda a cada 200ms para manter cidade ativa
    const interval = setInterval(processAssignments, 200);
    processAssignments();

    return () => clearInterval(interval);
  }, []);

  // Cruising - ônibus ociosos circulam pela cidade
  const cruisingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const startCruising = async () => {
      // Pula se pausado
      if (configRef.current.isPaused) return;

      const { buses, passengers } = stateRef.current;

      for (const bus of buses) {
        // Se ônibus está AVAILABLE há mais de 1 segundo e não está sendo processado
        if (
          bus.state === BusState.AVAILABLE &&
          !bus.assignment &&
          bus.path.length === 0 &&
          !busProcessingRef.current.has(bus.id) &&
          !cruisingRef.current.has(bus.id) &&
          Date.now() - bus.stateStartTime > 1000
        ) {
          // Verifica se não há passageiro esperando por este ônibus
          const hasQueuedPassenger = passengers.some(
            (p) => p.assignedBusId === bus.id && p.status === PassengerStatus.WAITING
          );

          if (hasQueuedPassenger) continue;

          cruisingRef.current.add(bus.id);

          // Escolhe uma parada aleatória diferente da posição atual
          const randomStop = BUS_STOPS[Math.floor(Math.random() * BUS_STOPS.length)];

          try {
            const path = await getStreetRoute(bus.location, { lat: randomStop.lat, lng: randomStop.lng });

            if (path.length > 1) {
              setState((s) => ({
                ...s,
                buses: s.buses.map((b) =>
                  b.id === bus.id && b.state === BusState.AVAILABLE && !b.assignment
                    ? { ...b, state: BusState.CRUISING, stateStartTime: Date.now(), path }
                    : b
                ),
              }));
            }
          } catch (error) {
            // Ignora erro - tenta novamente depois
          } finally {
            cruisingRef.current.delete(bus.id);
          }
        }
      }
    };

    const interval = setInterval(startCruising, 500);
    return () => clearInterval(interval);
  }, []);

  // Loop de animação
  useEffect(() => {
    let animationFrameId: number;

    const gameLoop = () => {
      // Se pausado, continua o loop mas não processa
      if (configRef.current.isPaused) {
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      setState((prevState) => {
        const now = Date.now();
        let { buses, passengers } = prevState;
        const speedMultiplier = configRef.current.speedMultiplier;

        // MÁQUINA DE ESTADOS
        buses = buses.map((bus) => {
          // Aguarda rota ser calculada
          if (bus.state === BusState.GOING_TO_PICKUP && !bus.assignment) {
            return bus;
          }

          // CRUISING - quando chega no destino, fica AVAILABLE
          if (bus.state === BusState.CRUISING && bus.path.length <= 1) {
            return {
              ...bus,
              state: BusState.AVAILABLE,
              stateStartTime: now,
              path: [],
            };
          }

          const hasReachedDestination = bus.path.length <= 1;
          const { newState } = getNextState(bus, now, hasReachedDestination);

          if (newState !== bus.state) {
            if (newState === BusState.BOARDING) {
              const passengerId = bus.assignment?.passengerId;
              if (passengerId) {
                passengers = passengers.map((p) =>
                  p.id === passengerId ? { ...p, status: PassengerStatus.ON_BOARD } : p
                );
              }
            }

            if (newState === BusState.DISEMBARKING) {
              const passengerId = bus.assignment?.passengerId;
              if (passengerId) {
                passengers = passengers.map((p) =>
                  p.id === passengerId ? { ...p, status: PassengerStatus.COMPLETED } : p
                );
              }
            }

            if (newState === BusState.AVAILABLE) {
              return {
                ...bus,
                state: newState,
                stateStartTime: now,
                assignment: null,
                passengersOnBoard: [],
                path: [],
              };
            }

            if (newState === BusState.GOING_TO_DROPOFF && bus.assignment) {
              return {
                ...bus,
                state: newState,
                stateStartTime: now,
                path: bus.assignment.dropoffPath,
                passengersOnBoard: [bus.assignment.passengerId],
              };
            }

            return { ...bus, state: newState, stateStartTime: now };
          }

          return bus;
        });

        // MOVIMENTO (com multiplicador de velocidade)
        const effectiveSpeed = BUS_SPEED * speedMultiplier;

        buses = buses.map((bus) => {
          if (!isBusMoving(bus.state) || bus.path.length < 2) return bus;

          const nextPoint = bus.path[1];
          const dx = nextPoint.lng - bus.location.lng;
          const dy = nextPoint.lat - bus.location.lat;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < effectiveSpeed) {
            return { ...bus, location: nextPoint, path: bus.path.slice(1) };
          }

          const ratio = effectiveSpeed / distance;
          return {
            ...bus,
            location: {
              lat: bus.location.lat + dy * ratio,
              lng: bus.location.lng + dx * ratio,
            },
          };
        });

        return { buses, passengers };
      });

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const addPassenger = useCallback((passenger: Passenger) => {
    setState((s) => ({ ...s, passengers: [...s.passengers, passenger] }));
  }, []);

  const requestBusForUser = useCallback(async (
    passenger: Passenger,
    busId: string
  ): Promise<boolean> => {
    const { buses } = stateRef.current;
    const bus = buses.find(b => b.id === busId);

    if (!bus) return false;

    // Se o ônibus está ocupado, adiciona à fila (apenas marca o assignedBusId)
    if (!isBusAvailable(bus) || busProcessingRef.current.has(busId)) {
      // Adiciona passageiro à fila - será processado quando ônibus ficar livre
      setState((s) => ({
        ...s,
        passengers: [...s.passengers, { ...passenger, assignedBusId: busId }],
      }));
      return true; // Retorna true porque foi adicionado à fila
    }

    // Ônibus disponível - processa imediatamente
    busProcessingRef.current.add(busId);

    setState((s) => ({
      buses: s.buses.map((b) =>
        b.id === busId
          ? { ...b, state: BusState.GOING_TO_PICKUP, stateStartTime: Date.now() }
          : b
      ),
      passengers: [...s.passengers, { ...passenger, assignedBusId: busId }],
    }));

    try {
      const assignment = await createAssignmentWithRoutes(bus.location, passenger);

      setState((s) => ({
        ...s,
        buses: s.buses.map((b) =>
          b.id === busId ? { ...b, assignment, path: assignment.pickupPath } : b
        ),
      }));

      return true;
    } catch (error) {
      console.error('Erro:', error);
      setState((s) => ({
        buses: s.buses.map((b) =>
          b.id === busId && !b.assignment
            ? { ...b, state: BusState.AVAILABLE, assignment: null, path: [] }
            : b
        ),
        passengers: s.passengers.filter(p => p.id !== passenger.id),
      }));
      return false;
    } finally {
      busProcessingRef.current.delete(busId);
    }
  }, []);

  const cancelPassenger = useCallback((passengerId: string) => {
    setState((s) => {
      const passenger = s.passengers.find(p => p.id === passengerId);
      if (!passenger) return s;

      return {
        buses: s.buses.map((b) => {
          if (b.assignment?.passengerId === passengerId && b.state === BusState.GOING_TO_PICKUP) {
            return { ...b, state: BusState.AVAILABLE, stateStartTime: Date.now(), assignment: null, path: [] };
          }
          return b;
        }),
        passengers: s.passengers.filter(p => p.id !== passengerId),
      };
    });
  }, []);

  const cleanupCompletedBots = useCallback(() => {
    setState((s) => ({
      ...s,
      passengers: s.passengers.filter(
        (p) => !p.isBot || p.status !== PassengerStatus.COMPLETED
      ),
    }));
  }, []);

  // Adiciona um novo onibus a frota
  const addBus = useCallback(() => {
    setState((s) => {
      const newIndex = s.buses.length;
      const template = BUS_TEMPLATES[newIndex % BUS_TEMPLATES.length];
      const stop = WEIGHTED_BUS_STOPS[newIndex % WEIGHTED_BUS_STOPS.length];

      const newBus: Bus = {
        id: `bus-${Date.now()}-${newIndex}`,
        name: `${template.namePrefix} ${newIndex + 1}`,
        location: { lat: stop.lat, lng: stop.lng },
        capacity: template.capacity,
        color: template.color,
        path: [],
        state: BusState.AVAILABLE,
        stateStartTime: Date.now(),
        assignment: null,
        passengersOnBoard: [],
      };

      return { ...s, buses: [...s.buses, newBus] };
    });
  }, []);

  // Remove um onibus ocioso da frota (economia)
  const removeBus = useCallback(() => {
    setState((s) => {
      // Encontra um onibus AVAILABLE ou CRUISING sem assignment para remover
      const idleBusIndex = s.buses.findIndex(
        (b) => (b.state === BusState.AVAILABLE || b.state === BusState.CRUISING) &&
               !b.assignment &&
               b.passengersOnBoard.length === 0
      );

      if (idleBusIndex === -1) return s; // Nenhum onibus ocioso

      const newBuses = s.buses.filter((_, i) => i !== idleBusIndex);
      return { ...s, buses: newBuses };
    });
  }, []);

  // Ajusta a frota para o tamanho desejado
  const setFleetSize = useCallback((targetSize: number) => {
    setState((s) => {
      const currentSize = s.buses.length;
      if (targetSize === currentSize) return s;

      if (targetSize > currentSize) {
        // Adicionar onibus
        const newBuses: Bus[] = [];
        for (let i = currentSize; i < targetSize; i++) {
          const template = BUS_TEMPLATES[i % BUS_TEMPLATES.length];
          const stop = WEIGHTED_BUS_STOPS[i % WEIGHTED_BUS_STOPS.length];

          newBuses.push({
            id: `bus-${Date.now()}-${i}`,
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
        return { ...s, buses: [...s.buses, ...newBuses] };
      } else {
        // Remover onibus ociosos
        const toRemove = currentSize - targetSize;
        let removed = 0;
        const newBuses = s.buses.filter((b) => {
          if (removed >= toRemove) return true;
          if ((b.state === BusState.AVAILABLE || b.state === BusState.CRUISING) &&
              !b.assignment && b.passengersOnBoard.length === 0) {
            removed++;
            return false;
          }
          return true;
        });
        return { ...s, buses: newBuses };
      }
    });
  }, []);

  return {
    buses: state.buses,
    passengers: state.passengers,
    addPassenger,
    requestBusForUser,
    cancelPassenger,
    cleanupCompletedBots,
    addBus,
    removeBus,
    setFleetSize,
  };
}
