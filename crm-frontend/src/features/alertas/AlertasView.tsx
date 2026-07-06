import { useState } from 'react'
import type { Alerta, LoteProceso } from '../../types'
import { API_BASE } from '../../config'

export function AlertasView({
  alertasLoading,
  alertas,
  fetchAlertas,
  setAlertas
}: {
  alertasLoading: boolean
  alertas: Alerta[]
  fetchAlertas: () => void
  setAlertas: React.Dispatch<React.SetStateAction<Alerta[]>>
}) {
  const [resolverModal, setResolverModal] = useState<string | null>(null)
  const [resolverComentario, setResolverComentario] = useState('')
  const [resolviendoId, setResolviendoId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

  // Traceability states
  const [procesosByLote, setProcesosByLote] = useState<Record<number, LoteProceso[]>>({})
  const [loadingProcesos, setLoadingProcesos] = useState<Record<number, boolean>>({})

  async function fetchProcesos(idLote: number) {
    if (procesosByLote[idLote] || loadingProcesos[idLote]) return
    setLoadingProcesos(prev => ({ ...prev, [idLote]: true }))
    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/lotes/${idLote}/procesos`)
      if (res.ok) {
        const data = await res.json() as LoteProceso[]
        setProcesosByLote(prev => ({ ...prev, [idLote]: data }))
      }
    } catch (e) {
      console.error('Error al cargar la bitácora del lote:', e)
    } finally {
      setLoadingProcesos(prev => ({ ...prev, [idLote]: false }))
    }
  }

  function toggleExpand(id: string, idLote: number) {
    const nextState = !expandedIds[id]
    setExpandedIds((prev) => ({
      ...prev,
      [id]: nextState
    }))
    if (nextState) {
      fetchProcesos(idLote)
    }
  }

  if (alertasLoading) {
    return <div className="text-center py-8 text-secondary animate-pulse">Cargando alertas de calidad...</div>
  }

  const sortedAlertas = [...alertas].sort((a, b) => {
    if (a.estado === 'PENDIENTE' && b.estado !== 'PENDIENTE') return -1
    if (a.estado !== 'PENDIENTE' && b.estado === 'PENDIENTE') return 1
    return 0
  })

  const pendientes = alertas.filter((a) => a.estado === 'PENDIENTE').length

  async function handleResolver() {
    if (!resolverModal) return
    setResolviendoId(resolverModal)
    try {
      const res = await fetch(
        `${API_BASE}/api/nps/admin/alertas/${resolverModal}/resolver`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comentario: resolverComentario }),
        },
      )
      if (!res.ok) {
        setResolviendoId(null)
        return
      }
    } catch {
      // Silenciar por si falla offline mock
    }
    setAlertas((prev) =>
      prev.map((a) =>
        a.id === resolverModal ? { ...a, estado: 'RESUELTA' as const } : a,
      ),
    )
    setResolverModal(null)
    setResolverComentario('')
    setResolviendoId(null)
  }

  return (
    <div className="space-y-4">
      <div className="text-left">
        <h2 className="text-lg font-extrabold text-primary">Alertas de Calidad</h2>
        <p className="text-xs text-secondary mt-1">
          Seguimiento a evaluaciones negativas (NPS inferior a 5) recibidas de clientes.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-left">
        <div className="border border-border-primary rounded-2xl p-4 bg-white shadow-xs">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Pendientes</p>
          <strong className="text-3xl font-black text-red-600">{pendientes}</strong>
        </div>
        <div className="border border-border-primary rounded-2xl p-4 bg-white shadow-xs">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Total</p>
          <strong className="text-3xl font-black text-primary">{alertas.length}</strong>
        </div>
      </div>

      {alertas.length === 0 && !alertasLoading && (
        <div className="text-center py-10 border-2 border-dashed border-border-primary rounded-2xl bg-white/40 space-y-4">
          <div className="text-4xl animate-bounce">🎉</div>
          <div>
            <h3 className="font-extrabold text-primary text-sm">¡Sin Alertas de Calidad!</h3>
            <p className="text-xs text-secondary max-w-[240px] mx-auto mt-1 leading-relaxed">Excelente. Toda la producción textil cumple con las expectativas y nivel de satisfacción de los clientes.</p>
          </div>
          <button
            className="px-5 py-2.5 rounded-full bg-primary text-white font-extrabold text-xs cursor-pointer hover:bg-primary-hover shadow-sm transition-all"
            onClick={fetchAlertas}
          >
            Recargar
          </button>
        </div>
      )}

      <div className="grid gap-3">
        {sortedAlertas.map((item) => {
          const isExpanded = expandedIds[item.id]
          const isAnonimo = !item.email && !item.telefono
          return (
            <div
              key={item.id}
              className={`border border-border-primary rounded-2xl bg-white p-4 flex flex-col gap-2 transition-all hover-card-trigger shadow-sm border-l-4 ${
                item.estado === 'PENDIENTE' ? 'border-l-red-500' : 'border-l-accent'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                <div className="min-w-0">
                  <h4 className="text-sm font-extrabold text-primary truncate">
                    {item.cliente || 'Cliente Anónimo'}
                  </h4>
                  <p className="text-xs text-secondary font-medium truncate mt-0.5">
                    Lote: <span className="font-mono text-primary font-bold">{item.lote}</span> · NPS: <span className={`font-bold ${item.puntuacion <= 4 ? 'text-red-500' : 'text-amber-500'}`}>{item.puntuacion}</span> · Alerta #{item.id}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 justify-end">
                  <button
                    onClick={() => toggleExpand(item.id, item.idLote)}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl border border-border-primary text-primary bg-white hover:bg-gray-50 cursor-pointer transition-all shadow-xs"
                  >
                    {isExpanded ? 'Ocultar Detalle' : 'Ver Detalle'}
                  </button>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                      item.estado === 'PENDIENTE'
                        ? 'border-red-200 bg-red-50 text-red-600'
                        : 'border-accent/30 bg-accent-light text-accent-dark'
                    }`}
                  >
                    {item.estado}
                  </span>
                  {item.estado === 'PENDIENTE' && (
                    <button
                      className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-accent text-white cursor-pointer hover:bg-accent-dark transition-all shadow-sm shadow-accent/10"
                      onClick={() => setResolverModal(item.id)}
                    >
                      Resolver
                    </button>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-2.5 pt-3.5 border-t border-border-light text-xs space-y-3.5 animate-fadeIn text-left">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-secondary bg-[#f8fcfa] rounded-2xl p-3 border border-border-light shadow-inner">
                    <div>
                      <span className="text-gray-400 font-extrabold block text-[9px] uppercase tracking-wider mb-0.5">Cliente</span>
                      <strong className="text-primary text-sm">{item.cliente}</strong>
                      {isAnonimo && (
                        <span className="ml-1.5 text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-gray-200 text-gray-500 border border-gray-300">
                          ANÓNIMO
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-400 font-extrabold block text-[9px] uppercase tracking-wider mb-0.5">Ciudad</span>
                      <strong className="text-primary">{item.ciudad || 'No especificada'}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 font-extrabold block text-[9px] uppercase tracking-wider mb-0.5">Correo Electrónico</span>
                      {item.email ? (
                        <span className="font-mono text-primary font-bold select-all text-xs">{item.email}</span>
                      ) : (
                        <span className="text-gray-400 italic">No proporcionado</span>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-400 font-extrabold block text-[9px] uppercase tracking-wider mb-0.5">Teléfono de Contacto</span>
                      {item.telefono ? (
                        <span className="font-mono text-primary font-bold select-all text-xs">{item.telefono}</span>
                      ) : (
                        <span className="text-gray-400 italic">No proporcionado</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-400 font-extrabold block text-[9px] uppercase tracking-wider mb-1">Detalle / Comentario de insatisfacción</span>
                    {item.comentario ? (
                      <div className="bg-red-50/60 border-l-2 border-red-400 pl-3.5 py-2.5 text-red-800 italic text-xs rounded-r-2xl border border-red-100/50 shadow-xs mb-3">
                        "{item.comentario}"
                      </div>
                    ) : (
                      <div className="text-gray-400 italic font-medium mb-3">El cliente no ingresó comentarios adicionales de calidad.</div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-dashed border-border-light">
                    <span className="text-gray-400 font-extrabold block text-[9px] uppercase tracking-wider mb-2">Trazabilidad de Confección del Lote</span>
                    {loadingProcesos[item.idLote] ? (
                      <p className="text-xs text-gray-400 animate-pulse font-medium">Cargando bitácora de confección...</p>
                    ) : procesosByLote[item.idLote] && procesosByLote[item.idLote].length > 0 ? (
                      <div className="relative border-l-2 border-accent/25 pl-4 ml-1.5 space-y-4 my-2">
                        {procesosByLote[item.idLote].map((p) => (
                          <div key={p.idProceso} className="relative text-xs text-left">
                            <span className="absolute -left-[22px] top-1 w-2.5 h-2.5 rounded-full bg-accent border-2 border-white shadow-xs" />
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 bg-[#fafdfe] border border-border-light rounded-xl px-3 py-2">
                              <div>
                                <span className="font-extrabold text-[#173c34] text-xs">{p.operacion}</span>
                                <p className="text-[10px] text-secondary mt-0.5 font-medium">
                                  Realizado por: <strong className="text-primary">{p.nombreOperador}</strong> {p.nombreMaquina ? `· Máquina: ${p.nombreMaquina} (${p.codigoMaquina})` : ''}
                                </p>
                              </div>
                              <span className="text-[10px] text-gray-400 font-mono self-end sm:self-center bg-[#f2faf7] px-2 py-0.5 rounded-md border border-[#e4f3ee]">
                                {p.fechaRegistro}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic font-medium">No se registraron operaciones de producción para este lote.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal resolver */}
      {resolverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs transition-all animate-fadeIn">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl space-y-3">
            <h3 className="text-base font-extrabold text-primary text-left">
              Resolver Alerta #{resolverModal}
            </h3>
            <label className="flex flex-col gap-1.5 text-left">
              <span className="text-xs font-bold text-secondary">
                Sustento técnico de la solución
              </span>
              <textarea
                value={resolverComentario}
                onChange={(e) => setResolverComentario(e.target.value)}
                placeholder="Describe qué medidas correctivas se aplicaron en el lote..."
                className="border border-border-primary rounded-xl px-3.5 py-2.5 text-xs text-primary bg-[#fafdfe] min-h-[100px] resize-y focus:outline-none focus:ring-1 focus:ring-accent"
                autoFocus
              />
            </label>
            <div className="flex gap-2">
              <button
                className="flex-1 py-2.5 rounded-full border border-border-primary text-secondary font-bold text-sm cursor-pointer hover:bg-gray-50 transition-all"
                onClick={() => { setResolverModal(null); setResolverComentario('') }}
              >
                Cancelar
              </button>
              <button
                className="flex-1 py-2.5 rounded-full bg-primary text-white font-bold text-sm cursor-pointer hover:bg-primary-hover transition-all disabled:opacity-50"
                onClick={handleResolver}
                disabled={resolviendoId === resolverModal}
              >
                {resolviendoId === resolverModal ? 'Guardando...' : 'Resolver Alerta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  )
}
