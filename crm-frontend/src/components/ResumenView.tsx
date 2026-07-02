import { useState } from 'react'
import { KpiCard } from './KpiCard'
import type { ResumenData, Evaluacion, Cupon } from '../types'
import { EvaluacionesView } from './EvaluacionesView'

export function ResumenView({
  loadingAdmin,
  resumenData,
  fetchResumen,
  evaluaciones,
  evaluacionesLoading,
  fetchEvaluaciones,
  cupones,
  fetchCupones
}: {
  loadingAdmin: boolean
  resumenData: ResumenData | null
  fetchResumen: () => void
  evaluaciones: Evaluacion[]
  evaluacionesLoading: boolean
  fetchEvaluaciones: () => void
  cupones: Cupon[]
  fetchCupones: () => void
}) {
  const [subTab, setSubTab] = useState<'opiniones' | 'eventos'>('opiniones')
  const [segmentoFiltro, setSegmentoFiltro] = useState<'TODOS' | 'B2B' | 'B2C'>('TODOS')
  const [fechaFiltro, setFechaFiltro] = useState<'TODO' | 'HOY' | 'SEMANA' | 'MES'>('TODO')

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

  const {
    alertasPendientes,
    ultimosEventos
  } = resumenData

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
    now.setHours(0, 0, 0, 0)

    if (fechaFiltro === 'HOY') {
      const todayStr = now.toLocaleDateString('sv-SE')
      return ev.fecha === todayStr
    }

    if (fechaFiltro === 'SEMANA') {
      const diffTime = now.getTime() - evDate.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays >= 0 && diffDays <= 7
    }

    if (fechaFiltro === 'MES') {
      const diffTime = now.getTime() - evDate.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays >= 0 && diffDays <= 30
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

  const todayStr = new Date().toLocaleDateString('sv-SE')
  const respuestasHoy = evaluacionesFiltradas.filter((e) => e.fecha === todayStr).length

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
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                fechaFiltro === 'TODO' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-primary'
              }`}
            >
              Todo
            </button>
            <button
              onClick={() => setFechaFiltro('HOY')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                fechaFiltro === 'HOY' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-primary'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setFechaFiltro('SEMANA')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                fechaFiltro === 'SEMANA' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-primary'
              }`}
            >
              7 días
            </button>
            <button
              onClick={() => setFechaFiltro('MES')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                fechaFiltro === 'MES' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-primary'
              }`}
            >
              30 días
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Encuestas" value={totalEncuestas} />
        <KpiCard label="Respuestas hoy" value={respuestasHoy} />
        <KpiCard label="Alertas pendientes" value={alertasPendientes} highlight={alertasPendientes > 0} />
        <KpiCard label="Promotores" value={promotores} />
      </div>

      {/* Sub-pestañas locales para Opiniones e Eventos */}
      <div className="pt-4 border-t border-border-light">
        <div className="flex gap-1 mb-4 bg-primary-light p-1.5 rounded-xl border border-border-light max-w-sm">
          <button
            onClick={() => setSubTab('opiniones')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'opiniones'
                ? 'bg-primary text-white shadow-sm'
                : 'text-secondary hover:bg-white/50 hover:text-primary'
            }`}
          >
            Opiniones ({evaluaciones.length})
          </button>
          <button
            onClick={() => setSubTab('eventos')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'eventos'
                ? 'bg-primary text-white shadow-sm'
                : 'text-secondary hover:bg-white/50 hover:text-primary'
            }`}
          >
            Actividad ({ultimosEventos ? ultimosEventos.length : 0})
          </button>
        </div>

        <div className="bg-[#fafdfe] border border-[#d8e6e1] rounded-2xl p-4 min-h-[300px]">
          {subTab === 'opiniones' && (
            <EvaluacionesView
              evaluaciones={evaluaciones}
              loading={evaluacionesLoading}
              fetchEvaluaciones={fetchEvaluaciones}
            />
          )}

          {/* Cupones removidos de la vista estratégica */}

          {subTab === 'eventos' && (
            <div className="space-y-3 text-left">
              <div className="mb-2">
                <h3 className="text-sm font-extrabold text-primary">Historial de Actividad Reciente</h3>
                <p className="text-[11px] text-secondary">Registro de los últimos eventos del sistema en tiempo real.</p>
              </div>

              {!ultimosEventos || ultimosEventos.length === 0 ? (
                <p className="text-sm text-gray-400 italic py-6 text-center bg-[#fbfdfd] border border-dashed border-border-light rounded-xl">
                  No hay eventos registrados recientemente.
                </p>
              ) : (
                <div className="border border-border-light rounded-2xl bg-white p-4 space-y-3 shadow-inner max-h-[350px] overflow-y-auto">
                  {ultimosEventos.map((ev, i) => (
                    <div key={i} className="flex items-start gap-3 text-xs text-[#5c7770] border-b border-gray-50 pb-2.5 last:border-0 last:pb-0">
                      <span className="font-mono bg-accent-light px-2.5 py-0.5 rounded text-[10px] text-accent-dark font-extrabold shrink-0">{ev.hora}</span>
                      <div className="min-w-0 flex-1">
                        <strong className="text-primary font-bold">{ev.titulo}</strong>
                        {ev.meta && <span className="text-gray-400 block text-[10px] mt-0.5">{ev.meta}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
