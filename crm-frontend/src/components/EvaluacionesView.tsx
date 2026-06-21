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
    return <div className="text-center py-8 text-secondary animate-pulse">Cargando opiniones de clientes...</div>
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-left">
        <div>
          <h2 className="text-lg font-extrabold text-primary">Opiniones y Encuestas</h2>
          <p className="text-xs text-secondary">Historial de todas las encuestas respondidas por los clientes.</p>
        </div>
        <button
          className="self-start md:self-auto px-4 py-2 rounded-full bg-primary text-white font-bold text-xs cursor-pointer hover:bg-primary-hover transition-all"
          onClick={fetchEvaluaciones}
        >
          Recargar
        </button>
      </div>

      {/* KPI Cards Mini */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-left">
        <button
          onClick={() => setFiltro('TODAS')}
          className={`border rounded-2xl p-3 text-left transition-all cursor-pointer shadow-xs hover-card-trigger ${
            filtro === 'TODAS'
              ? 'border-primary bg-primary-light shadow-sm'
              : 'border-border-primary bg-white hover:bg-gray-50'
          }`}
        >
          <p className="text-[9px] uppercase tracking-wider font-extrabold text-secondary mb-0.5">Todas</p>
          <strong className="text-xl font-black text-primary">{countTotal}</strong>
        </button>
        <button
          onClick={() => setFiltro('PROMOTOR')}
          className={`border rounded-2xl p-3 text-left transition-all cursor-pointer shadow-xs hover-card-trigger ${
            filtro === 'PROMOTOR'
              ? 'border-accent bg-accent-light shadow-sm'
              : 'border-border-primary bg-white hover:bg-gray-50'
          }`}
        >
          <p className="text-[9px] uppercase tracking-wider font-extrabold text-accent-dark mb-0.5">Promotores</p>
          <strong className="text-xl font-black text-accent-dark">{countPromotores}</strong>
        </button>
        <button
          onClick={() => setFiltro('PASIVO')}
          className={`border rounded-2xl p-3 text-left transition-all cursor-pointer shadow-xs hover-card-trigger ${
            filtro === 'PASIVO'
              ? 'border-amber-500 bg-amber-50 shadow-sm'
              : 'border-border-primary bg-white hover:bg-gray-50'
          }`}
        >
          <p className="text-[9px] uppercase tracking-wider font-extrabold text-amber-600 mb-0.5">Pasivos</p>
          <strong className="text-xl font-black text-amber-700">{countPasivos}</strong>
        </button>
        <button
          onClick={() => setFiltro('DETRACTOR')}
          className={`border rounded-2xl p-3 text-left transition-all cursor-pointer shadow-xs hover-card-trigger ${
            filtro === 'DETRACTOR'
              ? 'border-red-500 bg-red-50/50 shadow-sm'
              : 'border-border-primary bg-white hover:bg-gray-50'
          }`}
        >
          <p className="text-[9px] uppercase tracking-wider font-extrabold text-red-500 mb-0.5">Detractores</p>
          <strong className="text-xl font-black text-red-600">{countDetractores}</strong>
        </button>
      </div>

      {/* Buscador */}
      <div className="flex gap-2 text-left">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por cliente o código de lote..."
          className="flex-1 border border-border-primary rounded-xl px-4 py-2 text-xs text-primary bg-white focus:outline-2 focus:outline-accent/30 placeholder:text-gray-400 shadow-sm"
        />
        {busqueda && (
          <button
            onClick={() => setBusqueda('')}
            className="px-3 text-xs text-gray-500 hover:text-gray-700 font-bold cursor-pointer"
          >
            Limpiar
          </button>
        )}
      </div>

      {evaluacionesFiltradas.length === 0 && (
        <div className="text-center py-10 border border-dashed border-border-primary rounded-2xl bg-white/40">
          <p className="text-secondary text-xs font-semibold">No se encontraron encuestas con los filtros seleccionados.</p>
        </div>
      )}

      {/* Grid de Encuestas */}
      <div className="grid gap-3 text-left">
        {evaluacionesFiltradas.map((item) => {
          const isAnonimo = !item.email && !item.telefono
          return (
            <div
              key={item.id}
              className={`border border-border-primary rounded-2xl p-4 bg-white shadow-sm transition-all hover-card-trigger border-l-4 ${
                item.clasificacion === 'PROMOTOR'
                  ? 'border-l-accent'
                  : item.clasificacion === 'PASIVO'
                  ? 'border-l-amber-400'
                  : 'border-l-red-500'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div>
                  <h3 className="font-extrabold text-primary text-sm flex items-center gap-1.5 flex-wrap">
                    <span>{item.cliente || 'Cliente Anónimo'}</span>
                    {isAnonimo && (
                      <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-gray-200 text-gray-500 border border-gray-300">
                        ANÓNIMO
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-secondary font-medium">
                    Lote: <strong className="text-primary font-mono">{item.lote}</strong> · {item.fecha} {item.ciudad ? `· ${item.ciudad}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div
                    className={`text-center px-3 py-1 rounded-full font-extrabold text-[10px] uppercase border ${
                      item.clasificacion === 'PROMOTOR'
                        ? 'bg-accent-light border-accent/20 text-accent-dark'
                        : item.clasificacion === 'PASIVO'
                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                        : 'bg-red-50 border-red-200 text-red-600'
                    }`}
                  >
                    NPS {item.puntuacion}
                  </div>
                </div>
              </div>

              {/* Información de contacto */}
              {!isAnonimo && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-secondary bg-[#f8fcfa] rounded-xl p-2.5 mb-2.5 border border-border-light shadow-inner">
                  {item.email && (
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-gray-400 shrink-0">✉</span>
                      <span className="truncate select-all font-mono text-[11px] text-primary">{item.email}</span>
                    </div>
                  )}
                  {item.telefono && (
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-gray-400 shrink-0">📞</span>
                      <span className="truncate select-all font-mono text-[11px] text-primary">{item.telefono}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Comentarios del cliente */}
              {item.comentario ? (
                <div className="bg-[#fcfdfd] border-l-2 border-border-primary pl-3.5 py-2 text-xs text-secondary italic rounded-r-lg">
                  "{item.comentario}"
                </div>
              ) : (
                <p className="text-[10px] text-gray-400 italic">Sin comentarios adicionales del producto.</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

