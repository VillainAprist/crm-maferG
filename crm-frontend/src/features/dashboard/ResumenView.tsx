import { useState } from 'react'
import type { ResumenData, Evaluacion } from '../../types'
import { EvaluacionesView } from '../evaluaciones'

export function ResumenView({
  loadingAdmin,
  resumenData,
  fetchResumen,
  evaluaciones,
  evaluacionesLoading,
  fetchEvaluaciones
}: {
  loadingAdmin: boolean
  resumenData: ResumenData | null
  fetchResumen: () => void
  evaluaciones: Evaluacion[]
  evaluacionesLoading: boolean
  fetchEvaluaciones: () => void
}) {
  const [segmentoFiltro, setSegmentoFiltro] = useState<'TODOS' | 'B2B' | 'B2C'>('TODOS')
  const [fechaFiltro, setFechaFiltro] = useState<'TODO' | 'ESTE_MES' | 'MES_PASADO' | 'ESTE_ANIO'>('TODO')

  if (loadingAdmin) {
    return <div className="text-center py-8 text-gray-400">Cargando...</div>
  }
  if (!resumenData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-3">No se pudo cargar el resumen</p>
        <button
          className="px-4 py-2 rounded-full bg-gradient-to-r from-[#54b8a0] to-[#47a993] text-white font-bold text-sm cursor-pointer"
          onClick={fetchResumen}
        >
          Reintentar
        </button>
      </div>
    )
  }

  // 1. Filtrar las evaluaciones según segmento y rango de fecha
  const evaluacionesFiltradas = evaluaciones.filter((ev) => {
    // Filtrar por Segmento
    if (segmentoFiltro !== 'TODOS' && ev.tipoCliente !== segmentoFiltro) {
      return false
    }

    // Filtrar por Fecha
    if (fechaFiltro === 'TODO') return true

    const evDate = new Date(ev.fecha + 'T00:00:00')
    const now = new Date()

    const evYear = evDate.getFullYear()
    const evMonth = evDate.getMonth()

    const nowYear = now.getFullYear()
    const nowMonth = now.getMonth()

    if (fechaFiltro === 'ESTE_MES') {
      return evYear === nowYear && evMonth === nowMonth
    }

    if (fechaFiltro === 'MES_PASADO') {
      const targetMonth = nowMonth === 0 ? 11 : nowMonth - 1
      const targetYear = nowMonth === 0 ? nowYear - 1 : nowYear
      return evYear === targetYear && evMonth === targetMonth
    }

    if (fechaFiltro === 'ESTE_ANIO') {
      return evYear === nowYear
    }

    return true
  })

  // 2. Recalcular KPIs dinámicamente en tiempo real
  const totalEncuestas = evaluacionesFiltradas.length
  const promotores = evaluacionesFiltradas.filter((e) => e.clasificacion === 'PROMOTOR').length
  const pasivos = evaluacionesFiltradas.filter((e) => e.clasificacion === 'PASIVO').length
  const detractores = evaluacionesFiltradas.filter((e) => e.clasificacion === 'DETRACTOR').length

  let npsEstimado = 0
  if (totalEncuestas > 0) {
    const pctPromVal = (promotores / totalEncuestas) * 100
    const pctDetVal = (detractores / totalEncuestas) * 100
    npsEstimado = Math.round(pctPromVal - pctDetVal)
  }

  const pctProm = totalEncuestas > 0 ? Math.round((promotores / totalEncuestas) * 100) : 0
  const pctDet = totalEncuestas > 0 ? Math.round((detractores / totalEncuestas) * 100) : 0
  const pctPas = totalEncuestas > 0 ? Math.round((pasivos / totalEncuestas) * 100) : 0

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-extrabold text-primary text-left">Resumen Operativo</h2>

      {/* Controles de Filtros */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-white border border-border-primary rounded-2xl p-4 shadow-sm text-left">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
          <span className="text-xs font-bold text-secondary shrink-0">Segmentación:</span>
          <div className="flex bg-[#f2faf7] p-1 rounded-xl border border-border-light w-full sm:w-auto overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSegmentoFiltro('TODOS')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                segmentoFiltro === 'TODOS' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-primary'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setSegmentoFiltro('B2B')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                segmentoFiltro === 'B2B' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-primary'
              }`}
            >
              B2B (Mayoristas)
            </button>
            <button
              onClick={() => setSegmentoFiltro('B2C')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                segmentoFiltro === 'B2C' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-primary'
              }`}
            >
              B2C (Minoristas)
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-secondary shrink-0">Periodo:</span>
          <div className="flex bg-[#f2faf7] p-1 rounded-xl border border-border-light w-full sm:w-auto overflow-x-auto no-scrollbar">
            <button
              onClick={() => setFechaFiltro('TODO')}
              className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                fechaFiltro === 'TODO' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-primary'
              }`}
            >
              Todo
            </button>
            <button
              onClick={() => setFechaFiltro('ESTE_MES')}
              className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                fechaFiltro === 'ESTE_MES' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-primary'
              }`}
            >
              Este Mes
            </button>
            <button
              onClick={() => setFechaFiltro('MES_PASADO')}
              className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                fechaFiltro === 'MES_PASADO' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-primary'
              }`}
            >
              Mes Pas.
            </button>
            <button
              onClick={() => setFechaFiltro('ESTE_ANIO')}
              className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                fechaFiltro === 'ESTE_ANIO' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-primary'
              }`}
            >
              Este Año
            </button>
          </div>
        </div>
      </div>

      {/* NPS Modern Segmented Bar */}
      <div className="bg-primary-light border border-border-primary rounded-3xl p-6 flex flex-col md:flex-row items-stretch justify-between gap-6">
        <div className="flex-1 space-y-3 text-left">
          <h3 className="font-extrabold text-primary text-xl">Net Promoter Score (NPS)</h3>
          <p className="text-sm text-secondary leading-relaxed">
            Métrica de satisfacción y lealtad de clientes. Se calcula restando el porcentaje de detractores al porcentaje de promotores.
          </p>
          <div className="flex flex-wrap gap-4 pt-1 text-xs font-bold text-secondary">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-accent"></span> Promotores ({promotores} / {pctProm}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span> Pasivos ({pasivos} / {pctPas}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500"></span> Detractores ({detractores} / {pctDet}%)
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-center items-center md:items-end min-w-[200px] shrink-0 gap-3 text-center md:text-right">
          <div>
            <span className="text-xs font-extrabold text-secondary uppercase tracking-wider block">NPS Estimado</span>
            <div className="flex items-baseline gap-1 justify-center md:justify-end mt-0.5">
              <span className="text-5xl font-black text-primary tracking-tight">
                {npsEstimado >= 0 ? `+${npsEstimado}` : npsEstimado}
              </span>
            </div>
          </div>
          
          {/* Segmented Horizontal Bar */}
          <div className="w-full max-w-[240px] h-3 bg-gray-200 rounded-full overflow-hidden flex shadow-inner">
            {pctProm > 0 && <div className="bg-accent h-full transition-all duration-500" style={{ width: `${pctProm}%` }} />}
            {pctPas > 0 && <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${pctPas}%` }} />}
            {pctDet > 0 && <div className="bg-red-500 h-full transition-all duration-500" style={{ width: `${pctDet}%` }} />}
          </div>
          {totalEncuestas === 0 && (
            <span className="text-[10px] text-gray-400 font-bold uppercase">Sin datos suficientes</span>
          )}
        </div>
      </div>

      {/* Opiniones y Encuestas directamente */}
      <div className="pt-4 border-t border-border-light bg-[#fafdfe] border border-[#d8e6e1] rounded-2xl p-4 min-h-[300px]">
        <EvaluacionesView
          evaluaciones={evaluacionesFiltradas}
          loading={evaluacionesLoading}
          fetchEvaluaciones={fetchEvaluaciones}
        />
      </div>
    </div>
  )
}
