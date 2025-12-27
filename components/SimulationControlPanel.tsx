'use client';

import React, { useState } from 'react';
import { SimulationConfig, SimulationMetrics } from '../types';
import { formatWaitTime, getTMEStatus, getTMEColor } from '../hooks/useSimulationMetrics';
import { isPeakHour, getPeriodDescription } from '../utils/passengerGenerator';
import { FleetScaleDecision, getScaleActionStyle } from '../hooks/useFleetAutoScale';

interface SimulationControlPanelProps {
  config: SimulationConfig;
  metrics: SimulationMetrics;
  fleetDecision: FleetScaleDecision;
  onConfigChange: (newConfig: Partial<SimulationConfig>) => void;
}

export const SimulationControlPanel: React.FC<SimulationControlPanelProps> = ({
  config,
  metrics,
  fleetDecision,
  onConfigChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const tmeStatus = getTMEStatus(metrics.averageWaitTime);
  const tmeColorClass = getTMEColor(tmeStatus);
  const isPeak = isPeakHour(config.simulatedHour);
  const scaleStyle = getScaleActionStyle(fleetDecision.action);

  return (
    <>
      {/* Barra compacta no topo - otimizada para mobile */}
      <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none safe-top">
        <div className="p-2 sm:p-3 flex justify-center pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden">
            <div className="px-2 sm:px-3 py-1.5 sm:py-2 flex items-center gap-1.5 sm:gap-2">
              {/* Play/Pause */}
              <button
                onClick={() => onConfigChange({ isPaused: !config.isPaused })}
                className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg transition-all active:scale-95 ${
                  config.isPaused
                    ? 'bg-green-100 text-green-600'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {config.isPaused ? (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                )}
              </button>

              {/* Velocidade - compacto no mobile */}
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                {[1, 2, 5, 10].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => onConfigChange({ speedMultiplier: speed })}
                    className={`w-7 h-7 sm:w-8 sm:h-8 text-xs font-bold rounded-md transition-all active:scale-95 ${
                      config.speedMultiplier === speed
                        ? 'bg-blue-500 text-white'
                        : 'text-slate-600'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>

              {/* Separador - escondido no mobile pequeno */}
              <div className="hidden sm:block w-px h-6 bg-slate-200" />

              {/* Metricas - layout adaptavel */}
              <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                {/* TME */}
                <div className="flex items-center gap-1">
                  <svg className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${tmeColorClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className={`font-bold ${tmeColorClass}`}>
                    {formatWaitTime(metrics.averageWaitTime)}
                  </span>
                </div>

                {/* Passageiros - escondido no mobile muito pequeno */}
                <div className="hidden xs:flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-bold text-slate-700">{metrics.passengersWaiting}</span>
                </div>

                {/* Frota */}
                <div className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  <span className="font-bold text-slate-700">{fleetDecision.currentBusCount}</span>
                  {fleetDecision.action !== 'maintain' && (
                    <span className={`text-[10px] font-bold ${scaleStyle.color}`}>
                      {fleetDecision.action === 'add' ? '+' : '-'}
                      {Math.abs(fleetDecision.recommendedBusCount - fleetDecision.currentBusCount)}
                    </span>
                  )}
                </div>
              </div>

              {/* Botao Expandir */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 transition-all active:scale-95"
              >
                <svg
                  className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Painel Expandido - Modal em mobile */}
      {isExpanded && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
            onClick={() => setIsExpanded(false)}
          />

          {/* Painel como bottom sheet no mobile */}
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] bg-white rounded-t-3xl shadow-2xl overflow-hidden safe-bottom animate-slide-up">
            {/* Handle de arrastar */}
            <div className="flex justify-center py-2">
              <div className="w-10 h-1 bg-slate-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">Controles da Simulação</h2>
              <button
                onClick={() => setIsExpanded(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Conteudo scrollavel */}
            <div className="overflow-y-auto max-h-[calc(80vh-60px)] p-4 space-y-5 hide-scrollbar">
              {/* Controles de Populacao */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                  Controles de População
                </h3>

                {/* Passageiros em espera */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Meta de passageiros</span>
                    <span className="font-bold text-slate-800">{config.targetWaitingPassengers}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={config.targetWaitingPassengers}
                    onChange={(e) => onConfigChange({ targetWaitingPassengers: parseInt(e.target.value) })}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Taxa de geracao */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Taxa de geração</span>
                    <span className="font-bold text-slate-800">{config.passengerGenerationRate.toFixed(1)}/s</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={config.passengerGenerationRate}
                    onChange={(e) => onConfigChange({ passengerGenerationRate: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>

              {/* Gestao da Frota */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                  Frota Inteligente
                </h3>

                <div className={`p-3 rounded-xl ${scaleStyle.bgColor} border ${
                  fleetDecision.action === 'add' ? 'border-green-200' :
                  fleetDecision.action === 'remove' ? 'border-amber-200' : 'border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-xl ${scaleStyle.bgColor} flex items-center justify-center`}>
                        {fleetDecision.action === 'add' && (
                          <svg className={`w-5 h-5 ${scaleStyle.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        )}
                        {fleetDecision.action === 'remove' && (
                          <svg className={`w-5 h-5 ${scaleStyle.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        )}
                        {fleetDecision.action === 'maintain' && (
                          <svg className={`w-5 h-5 ${scaleStyle.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${scaleStyle.color}`}>
                          {fleetDecision.action === 'add' ? 'Adicionando' :
                           fleetDecision.action === 'remove' ? 'Reduzindo' : 'Equilibrado'}
                        </p>
                        <p className="text-xs text-slate-500 line-clamp-1">{fleetDecision.reason}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-2xl text-slate-800">{fleetDecision.currentBusCount}</p>
                      <p className="text-[10px] text-slate-400">ônibus</p>
                    </div>
                  </div>

                  {/* Barra de demanda */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Demanda</span>
                      <span>{Math.round(fleetDecision.demandScore)}%</span>
                    </div>
                    <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          fleetDecision.demandScore > 80 ? 'bg-red-500' :
                          fleetDecision.demandScore > 50 ? 'bg-amber-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(100, fleetDecision.demandScore)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Limites */}
                <div className="flex gap-2">
                  <div className="flex-1 p-3 rounded-xl bg-slate-50 text-center">
                    <span className="text-slate-400 text-xs block">Min</span>
                    <span className="font-bold text-lg text-slate-700">{config.minBuses}</span>
                  </div>
                  <div className="flex-1 p-3 rounded-xl bg-blue-50 text-center">
                    <span className="text-blue-400 text-xs block">Atual</span>
                    <span className="font-bold text-lg text-blue-600">{fleetDecision.currentBusCount}</span>
                  </div>
                  <div className="flex-1 p-3 rounded-xl bg-slate-50 text-center">
                    <span className="text-slate-400 text-xs block">Max</span>
                    <span className="font-bold text-lg text-slate-700">{config.maxBuses}</span>
                  </div>
                </div>
              </div>

              {/* Simulacao de Horario */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                  Horário de Pico
                </h3>

                <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer">
                  <span className="text-sm text-slate-700">Demanda realista</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={config.useRealisticDemand}
                      onChange={(e) => onConfigChange({ useRealisticDemand: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-12 h-7 rounded-full transition-colors ${
                      config.useRealisticDemand ? 'bg-blue-500' : 'bg-slate-300'
                    }`}>
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        config.useRealisticDemand ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </div>
                  </div>
                </label>

                {config.useRealisticDemand && (
                  <div className="space-y-2 p-3 bg-amber-50 rounded-xl">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Hora</span>
                      <span className={`font-bold ${isPeak ? 'text-amber-600' : 'text-slate-800'}`}>
                        {config.simulatedHour.toString().padStart(2, '0')}:00
                        {isPeak && ' (PICO)'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="23"
                      value={config.simulatedHour}
                      onChange={(e) => onConfigChange({ simulatedHour: parseInt(e.target.value) })}
                      className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <p className="text-xs text-amber-700 text-center">
                      {getPeriodDescription(config.simulatedHour)}
                    </p>
                  </div>
                )}
              </div>

              {/* Metricas */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                  Métricas
                </h3>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <div className="text-slate-400 text-xs">TME</div>
                    <div className={`font-bold text-xl ${tmeColorClass}`}>
                      {formatWaitTime(metrics.averageWaitTime)}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <div className="text-slate-400 text-xs">Passageiros</div>
                    <div className="font-bold text-xl text-slate-700">
                      {metrics.passengersWaiting + metrics.passengersOnBoard}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <div className="text-slate-400 text-xs">Utilização</div>
                    <div className="font-bold text-xl text-slate-700">
                      {Math.round(metrics.fleetUtilization)}%
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <div className="text-slate-400 text-xs">Atendidos</div>
                    <div className="font-bold text-xl text-slate-700">
                      {metrics.passengersServedTotal}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default SimulationControlPanel;
