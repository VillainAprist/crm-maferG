import { useState, useMemo } from 'react'
import type { Alerta, LoteProceso, LoteInsumoConsumido } from '../../types'
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
  const [filtroTextoAlerta, setFiltroTextoAlerta] = useState('')
  const [tabActivo, setTabActivo] = useState<'PENDIENTE' | 'RESUELTA' | 'TODAS'>('PENDIENTE')

  // Traceability states
  const [procesosByLote, setProcesosByLote] = useState<Record<number, LoteProceso[]>>({})
  const [loadingProcesos, setLoadingProcesos] = useState<Record<number, boolean>>({})
  const [insumosByLote, setInsumosByLote] = useState<Record<number, LoteInsumoConsumido[]>>({})
  const [loadingInsumos, setLoadingInsumos] = useState<Record<number, boolean>>({})

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

  async function fetchInsumos(idLote: number) {
    if (insumosByLote[idLote] || loadingInsumos[idLote]) return
    setLoadingInsumos(prev => ({ ...prev, [idLote]: true }))
    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/lotes/${idLote}/insumos`)
      if (res.ok) {
        const data = await res.json() as LoteInsumoConsumido[]
        setInsumosByLote(prev => ({ ...prev, [idLote]: data }))
      }
    } catch (e) {
      console.error('Error al cargar insumos del lote:', e)
    } finally {
      setLoadingInsumos(prev => ({ ...prev, [idLote]: false }))
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
      fetchInsumos(idLote)
    }
  }

  const pendientes = alertas.filter((a) => a.estado === 'PENDIENTE').length
  const resueltas = alertas.filter((a) => a.estado === 'RESUELTA').length

  const alertasFiltradas = useMemo(() => {
    let list = alertas;
    
    // Filtro por Tab
    if (tabActivo !== 'TODAS') {
      list = list.filter((a) => a.estado === tabActivo);
    }
    
    // Filtro por Buscador (cliente o lote)
    const query = filtroTextoAlerta.toLowerCase().trim();
    if (query) {
      list = list.filter((a) => 
        a.cliente.toLowerCase().includes(query) ||
        a.lote.toLowerCase().includes(query)
      );
    }
    
    // Ordenar (PENDIENTE primero, luego por ID descendente)
    return [...list].sort((a, b) => {
      if (a.estado === 'PENDIENTE' && b.estado !== 'PENDIENTE') return -1;
      if (a.estado !== 'PENDIENTE' && b.estado === 'PENDIENTE') return 1;
      return b.id.localeCompare(a.id);
    });
  }, [alertas, filtroTextoAlerta, tabActivo])

  if (alertasLoading) {
    return <div className="text-center py-8 text-secondary animate-pulse">Cargando alertas de calidad...</div>
  }

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
        a.id === resolverModal ? { ...a, estado: 'RESUELTA' as const, comentarioResolucion: resolverComentario } : a,
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

      {/* Indicadores rápidos */}
      <div className="grid grid-cols-3 gap-3 text-left">
        <div className="border border-border-primary rounded-2xl p-3 bg-white shadow-xs">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Pendientes</p>
          <strong className="text-2xl font-black text-red-600">{pendientes}</strong>
        </div>
        <div className="border border-border-primary rounded-2xl p-3 bg-white shadow-xs">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Resueltas</p>
          <strong className="text-2xl font-black text-accent-dark">{resueltas}</strong>
        </div>
        <div className="border border-border-primary rounded-2xl p-3 bg-white shadow-xs">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Total</p>
          <strong className="text-2xl font-black text-primary">{alertas.length}</strong>
        </div>
      </div>

      {/* Buscador y Control de Tabs */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between pt-1">
        {/* Input Buscador */}
        <div className="relative flex-1 text-left">
          <input
            type="text"
            placeholder="🔍 Buscar por cliente o lote..."
            value={filtroTextoAlerta}
            onChange={(e) => setFiltroTextoAlerta(e.target.value)}
            className="w-full border border-border-primary rounded-xl px-3.5 py-2 text-xs text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent"
          />
          {filtroTextoAlerta && (
            <button
              onClick={() => setFiltroTextoAlerta('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 cursor-pointer border-0 bg-transparent"
            >
              ✕
            </button>
          )}
        </div>

        {/* Tabs de Filtro */}
        <div className="flex items-center gap-1 bg-primary-light p-1 rounded-xl border border-border-primary shadow-sm self-start md:self-auto">
          <button
            type="button"
            onClick={() => setTabActivo('PENDIENTE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${tabActivo === 'PENDIENTE' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-primary'}`}
          >
            🔴 Pendientes ({pendientes})
          </button>
          <button
            type="button"
            onClick={() => setTabActivo('RESUELTA')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${tabActivo === 'RESUELTA' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-primary'}`}
          >
            🟢 Resueltas ({resueltas})
          </button>
          <button
            type="button"
            onClick={() => setTabActivo('TODAS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${tabActivo === 'TODAS' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-primary'}`}
          >
            📋 Todas ({alertas.length})
          </button>
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

      {alertas.length > 0 && alertasFiltradas.length === 0 && (
        <div className="text-center py-10 border border-dashed border-border-primary rounded-2xl bg-white/40">
          <p className="text-xs text-secondary font-bold">No se encontraron alertas que coincidan con la búsqueda o filtro.</p>
        </div>
      )}

      <div className="grid gap-3">
        {alertasFiltradas.map((item) => {
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

                  {/* Acciones de Contacto Rápido */}
                  {item.estado === 'PENDIENTE' && (item.email || item.telefono) && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {item.telefono && (
                        <a
                          href={`https://wa.me/51${item.telefono.trim().replace(/\s+/g, '')}?text=${encodeURIComponent(
                            `Hola ${item.cliente}, te saludamos de Mafer-G. Nos contactamos contigo porque recibimos tus comentarios sobre el lote ${item.lote} con una puntuación de ${item.puntuacion}/10. Lamentamos la mala experiencia y queremos ayudarte a solucionarlo.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-all shadow-xs no-underline"
                        >
                          💬 Contactar por WhatsApp
                        </a>
                      )}
                      {item.email && (
                        <a
                          href={`mailto:${item.email}?subject=${encodeURIComponent(
                            `Solución de Calidad Mafer-G - Alerta #${item.id}`
                          )}&body=${encodeURIComponent(
                            `Hola ${item.cliente},\n\nLe saludamos de Mafer-G. Le escribimos con relación a sus comentarios recibidos sobre el lote ${item.lote}.\n\nLamentamos profundamente su insatisfacción y deseamos brindarle una solución lo antes posible. ¿Podría indicarnos a qué teléfono llamarle o coordinar el cambio de la prenda?\n\nAtentamente,\nAtención al Cliente - Mafer-G`
                          )}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-[10px] transition-all shadow-xs no-underline"
                        >
                          ✉️ Enviar Correo Electrónico
                        </a>
                      )}
                    </div>
                  )}

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

                  {item.estado === 'RESUELTA' && (
                    <div>
                      <span className="text-gray-400 font-extrabold block text-[9px] uppercase tracking-wider mb-1">Medida correctiva / Solución aplicada</span>
                      <div className="bg-[#e8fff5] border-l-2 border-accent pl-3.5 py-2.5 text-primary font-medium text-xs rounded-r-2xl border border-[#cce2db] mb-3">
                        {item.comentarioResolucion || 'Alerta resuelta sin comentarios registrados.'}
                      </div>
                    </div>
                  )}

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

                  <div className="pt-3 border-t border-dashed border-border-light">
                    <span className="text-gray-400 font-extrabold block text-[9px] uppercase tracking-wider mb-2">Materiales e Insumos Consumidos</span>
                    {loadingInsumos[item.idLote] ? (
                      <p className="text-xs text-gray-400 animate-pulse font-medium">Cargando insumos...</p>
                    ) : insumosByLote[item.idLote] && insumosByLote[item.idLote].length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2">
                        {insumosByLote[item.idLote].map((ins, idx) => (
                          <div key={idx} className="bg-[#fcfdfe] border border-border-light rounded-xl px-3 py-2 flex items-center justify-between">
                            <div>
                              <strong className="text-primary text-xs">{ins.nombreMaterial}</strong>
                              <p className="text-[10px] text-secondary mt-0.5 font-medium">
                                Cantidad: {ins.cantidad} {ins.unidadMedida}
                              </p>
                            </div>
                            <span className="text-xs font-extrabold text-primary">
                              S/ {ins.costoTotal.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic font-medium">No se registraron materiales consumidos para este lote.</p>
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

            {/* Plantillas Rápidas */}
            <div className="text-left space-y-1.5">
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Plantillas de Solución Rápida</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setResolverComentario("Se ofreció disculpas al cliente y se le compensó con un cupón de descuento del 5%.")}
                  className="px-2 py-1 rounded-lg border border-border-primary bg-primary-light hover:bg-[#e4f3ee] text-[9px] text-primary font-bold cursor-pointer transition-all"
                >
                  🏷️ Cupón 5%
                </button>
                <button
                  type="button"
                  onClick={() => setResolverComentario("Se coordinó el cambio físico de la prenda defectuosa en tienda.")}
                  className="px-2 py-1 rounded-lg border border-border-primary bg-primary-light hover:bg-[#e4f3ee] text-[9px] text-primary font-bold cursor-pointer transition-all"
                >
                  🔄 Cambio Prenda
                </button>
                <button
                  type="button"
                  onClick={() => setResolverComentario("Se contactó telefónicamente al cliente y se resolvieron sus dudas de calidad. Caso cerrado.")}
                  className="px-2 py-1 rounded-lg border border-border-primary bg-primary-light hover:bg-[#e4f3ee] text-[9px] text-primary font-bold cursor-pointer transition-all"
                >
                  📞 Llamada Resuelta
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
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
