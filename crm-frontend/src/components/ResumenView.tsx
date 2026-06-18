import { useState } from 'react'
import { KpiCard } from './KpiCard'
import type { ResumenData, Evaluacion, Cupon } from '../types'
import { EvaluacionesView } from './EvaluacionesView'
import { CuponesView } from './CuponesView'

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
  const [subTab, setSubTab] = useState<'opiniones' | 'cupones' | 'eventos'>('opiniones')
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

  // Calcula rotación para el gauge (-100 a +100 mapeado a 0-180 grados)
  const npsRotation = ((npsEstimado + 100) / 200) * 180

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-[#173c34]">Resumen operativo</h2>

      {/* Controles de Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[#f8fcfa] border border-[#dbe7e2] rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#53796f]">Segmentación:</span>
          <div className="flex bg-white p-1 rounded-xl border border-[#d6e5e2] shadow-sm">
            <button
              onClick={() => setSegmentoFiltro('TODOS')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                segmentoFiltro === 'TODOS' ? 'bg-[#1e4a40] text-white shadow-sm' : 'text-[#53796f] hover:text-[#1c4a3f]'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setSegmentoFiltro('B2B')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                segmentoFiltro === 'B2B' ? 'bg-[#1e4a40] text-white shadow-sm' : 'text-[#53796f] hover:text-[#1c4a3f]'
              }`}
            >
              B2B (Mayoristas)
            </button>
            <button
              onClick={() => setSegmentoFiltro('B2C')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                segmentoFiltro === 'B2C' ? 'bg-[#1e4a40] text-white shadow-sm' : 'text-[#53796f] hover:text-[#1c4a3f]'
              }`}
            >
              B2C (Minoristas)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#53796f]">Periodo:</span>
          <div className="flex bg-white p-1 rounded-xl border border-[#d6e5e2] shadow-sm">
            <button
              onClick={() => setFechaFiltro('TODO')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                fechaFiltro === 'TODO' ? 'bg-[#1e4a40] text-white shadow-sm' : 'text-[#53796f] hover:text-[#1c4a3f]'
              }`}
            >
              Todo
            </button>
            <button
              onClick={() => setFechaFiltro('HOY')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                fechaFiltro === 'HOY' ? 'bg-[#1e4a40] text-white shadow-sm' : 'text-[#53796f] hover:text-[#1c4a3f]'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setFechaFiltro('SEMANA')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                fechaFiltro === 'SEMANA' ? 'bg-[#1e4a40] text-white shadow-sm' : 'text-[#53796f] hover:text-[#1c4a3f]'
              }`}
            >
              7 días
            </button>
            <button
              onClick={() => setFechaFiltro('MES')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                fechaFiltro === 'MES' ? 'bg-[#1e4a40] text-white shadow-sm' : 'text-[#53796f] hover:text-[#1c4a3f]'
              }`}
            >
              30 días
            </button>
          </div>
        </div>
      </div>

      {/* NPS Gauge Visual */}
      <div className="bg-[#f2faf7] border border-[#d6e5e2] rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex-1 space-y-2">
          <h3 className="font-bold text-[#1c4a3f] text-xl">Net Promoter Score</h3>
          <p className="text-sm text-[#4f6f66]">
            Métrica de lealtad general. Se calcula restando el porcentaje de detractores al porcentaje de promotores.
          </p>
          <div className="pt-2 flex gap-4 text-xs font-semibold text-[#53796f]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> Promotores ({pctProm}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span> Pasivos ({pctPas}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Detractores ({pctDet}%)
            </span>
          </div>
        </div>

        <div className="relative w-[200px] h-[100px] flex justify-center items-end shrink-0 overflow-hidden">
          {/* Semicírculo Base (Rojo a Verde) */}
          <div className="absolute top-0 w-[200px] h-[200px] rounded-full" 
               style={{
                 background: 'conic-gradient(from 270deg, #ef4444 0deg, #eab308 90deg, #22c55e 180deg)',
                 clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)'
               }}
          ></div>
          {/* Círculo interno para hueco del gauge */}
          <div className="absolute top-[20px] w-[160px] h-[160px] rounded-full bg-[#f2faf7]"></div>
          
          {/* Aguja indicadora */}
          <div className="absolute bottom-0 w-[160px] h-[2px] bg-transparent origin-center flex justify-start items-center"
               style={{ transform: `rotate(${npsRotation}deg) translateY(-50%)`, bottom: '0px', left: '20px' }}>
            <div className="w-[10px] h-[10px] rounded-full bg-[#1c4a3f] border-2 border-white -translate-y-1 -translate-x-1"></div>
          </div>
          
          <div className="absolute bottom-2 text-center">
            <span className="block text-3xl font-black text-[#1c4a3f]">{npsEstimado}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Encuestas" value={totalEncuestas} />
        <KpiCard label="Respuestas hoy" value={respuestasHoy} />
        <KpiCard label="Alertas pendientes" value={alertasPendientes} highlight={alertasPendientes > 0} />
        <KpiCard label="Promotores" value={promotores} />
      </div>

      {/* Sub-pestañas locales para Opiniones, Cupones e Eventos */}
      <div className="pt-4 border-t border-[#dce7e4]">
        <div className="flex gap-1 mb-4 bg-[#f2faf7] p-1.5 rounded-xl border border-[#d6e5e2] max-w-md">
          <button
            onClick={() => setSubTab('opiniones')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'opiniones'
                ? 'bg-[#1e4a40] text-white shadow-sm'
                : 'text-[#53796f] hover:bg-[#e0ede9]'
            }`}
          >
            Opiniones ({evaluaciones.length})
          </button>
          <button
            onClick={() => setSubTab('cupones')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'cupones'
                ? 'bg-[#1e4a40] text-white shadow-sm'
                : 'text-[#53796f] hover:bg-[#e0ede9]'
            }`}
          >
            Cupones ({cupones.length})
          </button>
          <button
            onClick={() => setSubTab('eventos')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'eventos'
                ? 'bg-[#1e4a40] text-white shadow-sm'
                : 'text-[#53796f] hover:bg-[#e0ede9]'
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

          {subTab === 'cupones' && (
            <CuponesView
              cupones={cupones}
              fetchCupones={fetchCupones}
            />
          )}

          {subTab === 'eventos' && (
            <div className="space-y-3">
              <div className="mb-2">
                <h3 className="text-sm font-bold text-[#173c34]">Historial de Actividad Reciente</h3>
                <p className="text-[11px] text-[#58766d]">Registro de los últimos eventos del sistema en tiempo real.</p>
              </div>

              {!ultimosEventos || ultimosEventos.length === 0 ? (
                <p className="text-sm text-gray-400 italic py-4 text-center">No hay eventos recientes registrados.</p>
              ) : (
                <div className="border border-dashed border-[#b8d0c6] rounded-xl bg-[#f8fffc] p-4 space-y-2.5">
                  {ultimosEventos.map((ev, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs text-[#5c7770]">
                      <span className="font-mono bg-[#e8fff5] px-2 py-0.5 rounded text-[10px] text-[#1c4a3f] font-bold shrink-0">{ev.hora}</span>
                      <div className="min-w-0 flex-1 truncate">
                        <strong className="text-[#1c4a3f] font-bold">{ev.titulo}</strong>
                        {ev.meta && <span className="text-gray-400 ml-1.5">({ev.meta})</span>}
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
