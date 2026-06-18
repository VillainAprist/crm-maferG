import { useState } from 'react'
import type { Alerta } from '../types'
import { API_BASE } from '../config'

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

  function toggleExpand(id: string) {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  if (alertasLoading) {
    return <div className="text-center py-8 text-gray-400">Cargando...</div>
  }

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
      // Si falla silenciamos por si se hace offline mode mock
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
      <h2 className="text-lg font-bold text-[#173c34]">Alertas de calidad</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="border border-[#dbe7e2] rounded-xl p-3 bg-[#f8fcfa]">
          <p className="text-xs text-[#58766d] mb-0.5">Pendientes</p>
          <strong className="text-2xl font-bold text-[#1c4a3f]">{pendientes}</strong>
        </div>
        <div className="border border-[#dbe7e2] rounded-xl p-3 bg-[#f8fcfa]">
          <p className="text-xs text-[#58766d] mb-0.5">Total</p>
          <strong className="text-2xl font-bold text-[#1c4a3f]">{alertas.length}</strong>
        </div>
      </div>

      {alertas.length === 0 && !alertasLoading && (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-3">No hay alertas</p>
          <button
            className="px-4 py-2 rounded-full bg-gradient-to-r from-[#54b8a0] to-[#47a993] text-white font-bold text-sm cursor-pointer"
            onClick={fetchAlertas}
          >
            Recargar
          </button>
        </div>
      )}

      <div className="grid gap-2.5">
        {alertas.map((item) => {
          const isExpanded = expandedIds[item.id]
          const isAnonimo = !item.email && !item.telefono
          return (
            <div
              key={item.id}
              className={`border border-[#d8e6e1] rounded-xl bg-[#fcfffe] p-3.5 flex flex-col gap-1.5 transition-colors ${
                item.estado === 'PENDIENTE' ? 'hover:bg-[#fffdf7]' : 'hover:bg-[#f6fdfa]'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#1e4a40] truncate">
                    {item.id}
                  </p>
                  <p className="text-xs text-[#628076] truncate">
                    {item.cliente} · Lote {item.lote} · NPS {item.puntuacion} {item.ciudad ? `· ${item.ciudad}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleExpand(item.id)}
                    className="text-xs font-bold px-2.5 py-1.5 rounded-full border border-[#d8e6e1] text-[#1c4a3f] bg-white hover:bg-gray-50 cursor-pointer transition-all"
                  >
                    {isExpanded ? 'Ocultar' : 'Ver Detalles'}
                  </button>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      item.estado === 'PENDIENTE'
                        ? 'border-[#edc57a] bg-[#fff8e9] text-[#8a6316]'
                        : 'border-[#93d3be] bg-[#edfdf7] text-[#1f735d]'
                    }`}
                  >
                    {item.estado}
                  </span>
                  {item.estado === 'PENDIENTE' && (
                    <button
                      className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#54b8a0] text-white cursor-pointer hover:bg-[#47a993] transition-all"
                      onClick={() => setResolverModal(item.id)}
                    >
                      Resolver
                    </button>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-2.5 pt-2.5 border-t border-[#eef4f1] text-xs space-y-2.5 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#53796f] bg-[#f8fcfa] rounded-lg p-2.5 border border-[#eef4f1]">
                    <div>
                      <span className="text-gray-400 font-semibold block text-[10px] uppercase tracking-wider mb-0.5">Cliente</span>
                      <strong className="text-[#1c4a3f] text-sm">{item.cliente}</strong>
                      {isAnonimo && (
                        <span className="ml-1.5 text-[9px] font-bold px-1 rounded bg-gray-100 text-gray-500 border border-gray-200">
                          ANÓNIMO
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold block text-[10px] uppercase tracking-wider mb-0.5">Ciudad</span>
                      <strong className="text-[#1c4a3f]">{item.ciudad || 'No especificada'}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold block text-[10px] uppercase tracking-wider mb-0.5">Correo Electrónico</span>
                      {item.email ? (
                        <span className="font-mono text-[#1c4a3f] font-semibold select-all text-xs">{item.email}</span>
                      ) : (
                        <span className="text-gray-400 italic">No proporcionado</span>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold block text-[10px] uppercase tracking-wider mb-0.5">Teléfono de Contacto</span>
                      {item.telefono ? (
                        <span className="font-mono text-[#1c4a3f] font-semibold select-all text-xs">{item.telefono}</span>
                      ) : (
                        <span className="text-gray-400 italic">No proporcionado</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-400 font-semibold block text-[10px] uppercase tracking-wider mb-1">Comentario del Cliente</span>
                    {item.comentario ? (
                      <div className="bg-[#fef2f2] border-l-2 border-rose-400 pl-3 py-2 text-[#991b1b] italic text-xs rounded-r-md">
                        "{item.comentario}"
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">El cliente no ingresó comentarios de calidad.</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm transition-all animate-fadeIn">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl space-y-3">
            <h3 className="text-base font-bold text-[#173c34]">
              Resolver alerta {resolverModal}
            </h3>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#53796f]">
                Sustento técnico
              </span>
              <textarea
                value={resolverComentario}
                onChange={(e) => setResolverComentario(e.target.value)}
                placeholder="Describe la solución aplicada..."
                className="border border-[#d0ded9] rounded-[10px] px-3 py-2.5 text-sm text-[#16342d] bg-[#fafdfe] min-h-[100px] resize-y focus:outline-2 focus:outline-[rgba(71,169,147,0.3)]"
                autoFocus
              />
            </label>
            <div className="flex gap-2">
              <button
                className="flex-1 py-2.5 rounded-full border border-gray-300 text-gray-600 font-bold text-sm cursor-pointer hover:bg-gray-50 transition-all"
                onClick={() => { setResolverModal(null); setResolverComentario('') }}
              >
                Cancelar
              </button>
              <button
                className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-[#54b8a0] to-[#47a993] text-white font-bold text-sm cursor-pointer hover:opacity-90 transition-all disabled:opacity-50"
                onClick={handleResolver}
                disabled={resolviendoId === resolverModal}
              >
                {resolviendoId === resolverModal ? 'Guardando...' : 'Resolver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
