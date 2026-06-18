import { useState } from 'react'
import type { Evaluacion } from '../types'

export function EvaluacionesView({
  evaluaciones,
  loading,
  fetchEvaluaciones
}: {
  evaluaciones: Evaluacion[]
  loading: boolean
  fetchEvaluaciones: () => void
}) {
  const [filtro, setFiltro] = useState<'TODAS' | 'PROMOTOR' | 'PASIVO' | 'DETRACTOR'>('TODAS')
  const [busqueda, setBusqueda] = useState('')

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Cargando opiniones...</div>
  }

  // Filtrar evaluaciones
  const evaluacionesFiltradas = evaluaciones.filter((item) => {
    const cumpleFiltro = filtro === 'TODAS' || item.clasificacion === filtro
    const cumpleBusqueda =
      item.cliente.toLowerCase().includes(busqueda.toLowerCase()) ||
      item.lote.toLowerCase().includes(busqueda.toLowerCase())
    return cumpleFiltro && cumpleBusqueda
  })

  const countTotal = evaluaciones.length
  const countPromotores = evaluaciones.filter((e) => e.clasificacion === 'PROMOTOR').length
  const countPasivos = evaluaciones.filter((e) => e.clasificacion === 'PASIVO').length
  const countDetractores = evaluaciones.filter((e) => e.clasificacion === 'DETRACTOR').length

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#173c34]">Opiniones y Encuestas</h2>
          <p className="text-xs text-[#58766d]">Historial de todas las encuestas respondidas por los clientes.</p>
        </div>
        <button
          className="self-start md:self-auto px-4 py-2 rounded-full bg-gradient-to-r from-[#54b8a0] to-[#47a993] text-white font-bold text-xs cursor-pointer hover:opacity-90 transition"
          onClick={fetchEvaluaciones}
        >
          Recargar
        </button>
      </div>

      {/* KPI Cards Mini */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <button
          onClick={() => setFiltro('TODAS')}
          className={`border rounded-xl p-2.5 text-left transition-all cursor-pointer ${
            filtro === 'TODAS'
              ? 'border-[#1e4a40] bg-[#e8fff5] shadow-sm'
              : 'border-[#dbe7e2] bg-[#f8fcfa] hover:bg-[#f0f7f5]'
          }`}
        >
          <p className="text-[10px] uppercase tracking-wider font-semibold text-[#58766d] mb-0.5">Todas</p>
          <strong className="text-xl font-bold text-[#1c4a3f]">{countTotal}</strong>
        </button>
        <button
          onClick={() => setFiltro('PROMOTOR')}
          className={`border rounded-xl p-2.5 text-left transition-all cursor-pointer ${
            filtro === 'PROMOTOR'
              ? 'border-[#1e4a40] bg-[#e8fff5] shadow-sm'
              : 'border-[#dbe7e2] bg-[#f8fcfa] hover:bg-[#f0f7f5]'
          }`}
        >
          <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600 mb-0.5">Promotores</p>
          <strong className="text-xl font-bold text-emerald-700">{countPromotores}</strong>
        </button>
        <button
          onClick={() => setFiltro('PASIVO')}
          className={`border rounded-xl p-2.5 text-left transition-all cursor-pointer ${
            filtro === 'PASIVO'
              ? 'border-[#1e4a40] bg-[#e8fff5] shadow-sm'
              : 'border-[#dbe7e2] bg-[#f8fcfa] hover:bg-[#f0f7f5]'
          }`}
        >
          <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-600 mb-0.5">Pasivos</p>
          <strong className="text-xl font-bold text-amber-700">{countPasivos}</strong>
        </button>
        <button
          onClick={() => setFiltro('DETRACTOR')}
          className={`border rounded-xl p-2.5 text-left transition-all cursor-pointer ${
            filtro === 'DETRACTOR'
              ? 'border-[#1e4a40] bg-[#e8fff5] shadow-sm'
              : 'border-[#dbe7e2] bg-[#f8fcfa] hover:bg-[#f0f7f5]'
          }`}
        >
          <p className="text-[10px] uppercase tracking-wider font-semibold text-rose-600 mb-0.5">Detractores</p>
          <strong className="text-xl font-bold text-rose-700">{countDetractores}</strong>
        </button>
      </div>

      {/* Buscador */}
      <div className="flex gap-2">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por cliente o código de lote..."
          className="flex-1 border border-[#d0ded9] rounded-[10px] px-3.5 py-2 text-sm text-[#16342d] bg-[#fafdfe] focus:outline-2 focus:outline-[rgba(71,169,147,0.3)] placeholder:text-gray-400"
        />
        {busqueda && (
          <button
            onClick={() => setBusqueda('')}
            className="px-3 text-xs text-gray-500 hover:text-gray-700 font-semibold cursor-pointer"
          >
            Limpiar
          </button>
        )}
      </div>

      {evaluacionesFiltradas.length === 0 && (
        <div className="text-center py-12 border border-dashed border-[#b8d0c6] rounded-2xl bg-[#f8fffc]">
          <p className="text-gray-400 text-sm">No se encontraron encuestas con los filtros actuales.</p>
        </div>
      )}

      {/* Grid de Encuestas */}
      <div className="grid gap-3">
        {evaluacionesFiltradas.map((item) => {
          const isAnonimo = !item.email && !item.telefono
          return (
            <div
              key={item.id}
              className={`border rounded-xl p-4 bg-white shadow-sm transition-all hover:shadow-md border-l-4 ${
                item.clasificacion === 'PROMOTOR'
                  ? 'border-[#d8e6e1] border-l-[#34d399]'
                  : item.clasificacion === 'PASIVO'
                  ? 'border-[#d8e6e1] border-l-[#fbbf24]'
                  : 'border-[#d8e6e1] border-l-[#f87171]'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div>
                  <h3 className="font-bold text-[#1e4a40] text-sm flex items-center gap-1.5 flex-wrap">
                    <span>{item.cliente}</span>
                    {isAnonimo && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200">
                        ANÓNIMO
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-gray-400">
                    Lote: <strong className="text-[#58766d]">{item.lote}</strong> · {item.fecha} {item.ciudad ? `· ${item.ciudad}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div
                    className={`text-center px-3 py-1 rounded-full font-black text-xs border ${
                      item.clasificacion === 'PROMOTOR'
                        ? 'bg-[#edfdf7] border-[#93d3be] text-[#1f735d]'
                        : item.clasificacion === 'PASIVO'
                        ? 'bg-[#fff8e9] border-[#edc57a] text-[#8a6316]'
                        : 'bg-[#fef2f2] border-[#fca5a5] text-[#991b1b]'
                    }`}
                  >
                    NPS {item.puntuacion}
                  </div>
                </div>
              </div>

              {/* Información de contacto */}
              {!isAnonimo && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-xs text-[#53796f] bg-[#f8fcfa] rounded-lg p-2 mb-2.5 border border-[#eef4f1]">
                  {item.email && (
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-gray-400 shrink-0">✉</span>
                      <span className="truncate select-all font-mono">{item.email}</span>
                    </div>
                  )}
                  {item.telefono && (
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-gray-400 shrink-0">📞</span>
                      <span className="truncate select-all font-mono">{item.telefono}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Comentarios del cliente */}
              {item.comentario ? (
                <div className="bg-[#fcfdfd] border-l-2 border-gray-300 pl-3 py-1.5 text-xs text-[#3d5a51] italic">
                  "{item.comentario}"
                </div>
              ) : (
                <p className="text-[11px] text-gray-400 italic">Sin comentarios de calidad adicionales.</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
