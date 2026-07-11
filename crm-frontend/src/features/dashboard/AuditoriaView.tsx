import { useEffect, useState } from 'react'
import type { LogAuditoria } from '../../types'
import { API_BASE } from '../../config'

export function AuditoriaView() {
  const [logs, setLogs] = useState<LogAuditoria[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroAccion, setFiltroAccion] = useState('')
  const [busqueda, setBusqueda] = useState('')

  async function fetchLogs() {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/auditoria`)
      if (res.ok) {
        const data = await res.json() as LogAuditoria[]
        setLogs(data)
      }
    } catch (e) {
      console.error('Error al cargar logs de auditoría:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  // Filtrar logs
  const logsFiltrados = logs.filter(log => {
    const coincideAccion = filtroAccion === '' || log.accion === filtroAccion
    const coincideBusqueda = busqueda.trim() === '' || 
      log.usuario.toLowerCase().includes(busqueda.toLowerCase()) ||
      log.detalle.toLowerCase().includes(busqueda.toLowerCase()) ||
      log.accion.toLowerCase().includes(busqueda.toLowerCase())
    return coincideAccion && coincideBusqueda
  })

  // Obtener acciones únicas para el selector de filtro
  const accionesUnicas = Array.from(new Set(logs.map(l => l.accion)))

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#173c34]">Bitácora de Auditoría</h2>
          <p className="text-sm text-[#4f6f66]">
            Historial detallado de las operaciones de seguridad y transacciones críticas en el sistema.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-full transition-all cursor-pointer shadow-sm disabled:opacity-50"
        >
          {loading ? 'Actualizando...' : '🔄 Actualizar Logs'}
        </button>
      </div>

      {/* Controles de Filtro */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#fafdfe] border border-[#dce7e4] p-4 rounded-2xl">
        <label className="flex flex-col gap-1.5 text-xs font-extrabold text-[#2d5a50]">
          Filtrar por Acción
          <select
            value={filtroAccion}
            onChange={(e) => setFiltroAccion(e.target.value)}
            className="border border-[#dce7e4] rounded-xl px-3 py-2.5 text-xs bg-white text-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Todas las acciones</option>
            {accionesUnicas.map(acc => (
              <option key={acc} value={acc}>{acc}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-extrabold text-[#2d5a50]">
          Búsqueda rápida
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por usuario o detalle..."
            className="border border-[#dce7e4] rounded-xl px-3.5 py-2 text-xs bg-white text-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
      </div>

      {/* Tabla de Logs */}
      {loading ? (
        <div className="text-center py-10 text-secondary animate-pulse">Cargando bitácora de auditoría...</div>
      ) : logsFiltrados.length === 0 ? (
        <div className="text-center py-10 text-secondary border-2 border-dashed border-[#dce7e4] rounded-2xl text-xs font-bold bg-[#fafdfe]/50">
          No se encontraron registros de auditoría que coincidan con los filtros.
        </div>
      ) : (
        <div className="overflow-x-auto border border-[#dce7e4] rounded-2xl bg-white shadow-xs">
          <table className="w-full text-xs text-left text-gray-500">
            <thead className="text-[10px] text-[#1c4a3f] bg-[#f2faf7] uppercase tracking-wider font-extrabold border-b border-[#dce7e4]">
              <tr>
                <th className="px-5 py-3.5">ID Log</th>
                <th className="px-5 py-3.5">Fecha y Hora</th>
                <th className="px-5 py-3.5">Usuario</th>
                <th className="px-5 py-3.5">Acción</th>
                <th className="px-5 py-3.5">Detalle Operación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef4f2]">
              {logsFiltrados.map((log) => {
                // Determinar el estilo de la acción
                let badgeStyle = 'bg-gray-50 text-gray-600 border-gray-200'
                if (log.accion.includes('LOGIN')) {
                  badgeStyle = 'bg-blue-50 text-blue-700 border-blue-100'
                } else if (log.accion.includes('CREAR') || log.accion.includes('REGISTRAR')) {
                  badgeStyle = 'bg-green-50 text-green-700 border-green-100'
                } else if (log.accion.includes('RESOLVER')) {
                  badgeStyle = 'bg-teal-50 text-teal-700 border-teal-100'
                } else if (log.accion.includes('TOGGLE')) {
                  badgeStyle = 'bg-purple-50 text-purple-700 border-purple-100'
                }

                return (
                  <tr key={log.idLog} className="hover:bg-[#fafdfe] transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-gray-400">
                      #{log.idLog}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-secondary font-medium">
                      {log.fechaRegistro}
                    </td>
                    <td className="px-5 py-4 font-semibold text-primary">
                      {log.usuario}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[9px] font-extrabold uppercase tracking-wide ${badgeStyle}`}>
                        {log.accion}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-primary leading-relaxed max-w-sm sm:max-w-md font-medium">
                      {log.detalle}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
