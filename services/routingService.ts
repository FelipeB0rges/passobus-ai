import { Coordinate } from '../types';

// Cache em memória para evitar requisições duplicadas
const routeCache: { [key: string]: Coordinate[] } = {};

// Fila de requisições para controlar concorrência
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 3;
const requestQueue: Array<() => void> = [];

// Gera chave de cache
const generateCacheKey = (points: Coordinate[]) => {
  return points.map(p => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join(';');
};

// Processa fila de requisições
const processQueue = () => {
  if (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT_REQUESTS) {
    const next = requestQueue.shift();
    if (next) next();
  }
};

// Delay para retry com backoff
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Faz requisição com retry
const fetchWithRetry = async (
  url: string,
  maxRetries: number = 3,
  timeoutMs: number = 8000
): Promise<Response | null> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        return response;
      }

      // Se não é erro de rate limit, não faz retry
      if (response.status !== 429 && response.status !== 503) {
        console.warn(`[OSRM] Erro ${response.status} na tentativa ${attempt}`);
        return null;
      }

      // Rate limit ou servidor ocupado - espera e tenta novamente
      console.warn(`[OSRM] Rate limit/503 - tentativa ${attempt}/${maxRetries}`);
      await delay(1000 * attempt); // Backoff exponencial

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.warn(`[OSRM] Timeout na tentativa ${attempt}/${maxRetries}`);
        } else {
          console.warn(`[OSRM] Erro na tentativa ${attempt}/${maxRetries}:`, error.message);
        }
      }

      if (attempt < maxRetries) {
        await delay(500 * attempt);
      }
    }
  }

  return null;
};

// Função principal de roteamento
export const getStreetRoute = async (start: Coordinate, end: Coordinate): Promise<Coordinate[]> => {
  return getFullRoute([start, end]);
};

// Calcula rota completa entre múltiplos pontos
export const getFullRoute = async (points: Coordinate[]): Promise<Coordinate[]> => {
  if (points.length < 2) return [];

  const cacheKey = generateCacheKey(points);

  // Verifica cache
  if (routeCache[cacheKey]) {
    return [...routeCache[cacheKey]];
  }

  // Controle de concorrência
  return new Promise((resolve) => {
    const executeRequest = async () => {
      activeRequests++;

      try {
        const safePoints = points.slice(0, 15);

        // Formato OSRM: lon,lat;lon,lat;...
        const coordinatesString = safePoints
          .map(p => `${p.lng},${p.lat}`)
          .join(';');

        const url = `https://router.project-osrm.org/route/v1/driving/${coordinatesString}?overview=full&geometries=geojson`;

        const response = await fetchWithRetry(url);

        if (!response) {
          console.warn('[OSRM] Todas as tentativas falharam - usando linha reta');
          resolve(points);
          return;
        }

        const data = await response.json();

        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
          console.warn('[OSRM] Resposta inválida:', data.code);
          resolve(points);
          return;
        }

        const coordinates = data.routes[0].geometry.coordinates;

        // Converte de [lng, lat] para {lat, lng}
        const route: Coordinate[] = coordinates.map((coord: number[]) => ({
          lat: coord[1],
          lng: coord[0]
        }));

        // Atualiza cache
        routeCache[cacheKey] = route;

        // Limpa cache se muito grande
        const cacheKeys = Object.keys(routeCache);
        if (cacheKeys.length > 500) {
          delete routeCache[cacheKeys[0]];
        }

        resolve(route);

      } catch (error) {
        console.error('[OSRM] Erro inesperado:', error);
        resolve(points);
      } finally {
        activeRequests--;
        processQueue();
      }
    };

    // Adiciona à fila ou executa imediatamente
    if (activeRequests < MAX_CONCURRENT_REQUESTS) {
      executeRequest();
    } else {
      requestQueue.push(executeRequest);
    }
  });
};

// Pré-calcula múltiplas rotas em paralelo
export const preCalculateRoutes = async (
  busLocation: Coordinate,
  pickupLocation: Coordinate,
  dropoffLocation: Coordinate
): Promise<{ pickupPath: Coordinate[]; dropoffPath: Coordinate[] }> => {
  console.log('[OSRM] Pré-calculando rotas...');

  const [pickupPath, dropoffPath] = await Promise.all([
    getStreetRoute(busLocation, pickupLocation),
    getStreetRoute(pickupLocation, dropoffLocation)
  ]);

  console.log(`[OSRM] Rotas calculadas: pickup=${pickupPath.length} pontos, dropoff=${dropoffPath.length} pontos`);

  return { pickupPath, dropoffPath };
};
