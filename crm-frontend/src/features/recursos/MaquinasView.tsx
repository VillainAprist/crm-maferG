import { useState } from 'react'
import type { Maquina } from '../../types'
import { API_BASE } from '../../config'

interface MaquinasViewProps {
  maquinas: Maquina[]
  loading: boolean
  fetchMaquinas: () => Promise<void>
}

export function MaquinasView({ maquinas, loading, fetchMaquinas }: MaquinasViewProps) {
  const [codigoMaquina, setCodigoMaquina] = useState('')
  const [nombreMaquina, setNombreMaquina] = useState('')
  const [tipoMaquina, setTipoMaquina] = useState('')
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  async function handleCrearMaquina(e: React.FormEvent) {
    e.preventDefault()
    if (!codigoMaquina.trim() || !nombreMaquina.trim()) return

    setError('')
    setExito('')
    setCreando(true)

    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/maquinas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigoMaquina: codigoMaquina.trim().toUpperCase(),
          nombreMaquina: nombreMaquina.trim(),
          tipoMaquina: tipoMaquina.trim(),
          activo: true
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al registrar la máquina.')
        return
      }

      setExito(`Máquina ${codigoMaquina} registrada exitosamente.`)
      setCodigoMaquina('')
      setNombreMaquina('')
      setTipoMaquina('')
      await fetchMaquinas()
    } catch {
      setError('Error de conexión con el servidor.')
    } finally {
      setCreando(false)
    }
  }

  const [toggling, setToggling] = useState<number | null>(null)
  async function handleToggleMaquina(id: number) {
    if (toggling !== null) return
    setToggling(id)
    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/maquinas/${id}/toggle`, {
        method: 'POST'
      })
      if (res.ok) {
        await fetchMaquinas()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-lg font-bold text-[#173c34]">Gestión de Máquinas del Taller</h2>
        <p className="text-sm text-[#4f6f66]">Registra y administra las máquinas de confección para el control de inventario y trazabilidad.</p>
      </div>

      {/* Formulario de Registro */}
      <form onSubmit={handleCrearMaquina} className="bg-[#f2faf7] border border-[#d6e5e2] rounded-2xl p-5 space-y-4">
        <h3 className="font-bold text-[#1c4a3f] text-sm">Registrar Nueva Máquina</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex flex-col gap-1.5 text-left">
            <span className="text-xs font-semibold text-[#53796f]">Código de Máquina</span>
            <input
              type="text"
              required
              value={codigoMaquina}
              onChange={(e) => setCodigoMaquina(e.target.value)}
              placeholder="Ej. MAQ-REC-04"
              className="border border-[#d0ded9] rounded-xl px-3 py-2.5 text-sm text-[#16342d] bg-white focus:outline-2 focus:outline-[rgba(71,169,147,0.3)] transition-all"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-left">
            <span className="text-xs font-semibold text-[#53796f]">Nombre / Descripción</span>
            <input
              type="text"
              required
              value={nombreMaquina}
              onChange={(e) => setNombreMaquina(e.target.value)}
              placeholder="Ej. Recta Industrial Juki 2"
              className="border border-[#d0ded9] rounded-xl px-3 py-2.5 text-sm text-[#16342d] bg-white focus:outline-2 focus:outline-[rgba(71,169,147,0.3)] transition-all"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-left">
            <span className="text-xs font-semibold text-[#53796f]">Tipo de Máquina</span>
            <select
              value={tipoMaquina}
              onChange={(e) => setTipoMaquina(e.target.value)}
              className="border border-[#d0ded9] rounded-xl px-3 py-2.5 text-sm text-[#16342d] bg-white focus:outline-2 focus:outline-[rgba(71,169,147,0.3)] transition-all"
            >
              <option value="">Seleccione un tipo</option>
              <option value="Recta">Recta</option>
              <option value="Remalladora">Remalladora</option>
              <option value="Recubridora">Recubridora / Collaretera</option>
              <option value="Cortadora">Cortadora</option>
              <option value="Bordadora">Bordadora</option>
              <option value="Otro">Otro / Auxiliar</option>
            </select>
          </label>
        </div>

        {error && <p className="text-red-600 text-sm font-semibold bg-red-50 p-2.5 rounded-lg border border-red-100">{error}</p>}
        {exito && <p className="text-green-700 text-sm font-semibold bg-green-50 p-2.5 rounded-lg border border-green-100">{exito}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={creando || !codigoMaquina.trim() || !nombreMaquina.trim()}
            className="px-5 py-2.5 rounded-full bg-[#1c4a3f] text-white text-sm font-bold hover:bg-[#153830] cursor-pointer disabled:opacity-50 transition-all shadow-sm"
          >
            {creando ? 'Registrando...' : 'Registrar Máquina'}
          </button>
        </div>
      </form>

      {/* Listado de Máquinas */}
      <div className="space-y-3 pt-4 border-t border-gray-100">
        <h3 className="font-bold text-[#1c4a3f] text-sm text-left">Máquinas Registradas</h3>
        
        {loading && maquinas.length === 0 ? (
          <div className="text-center py-8 text-gray-400">Cargando máquinas...</div>
        ) : maquinas.length === 0 ? (
          <div className="text-center py-8 text-gray-400 border-2 border-dashed border-[#dce7e4] rounded-2xl">
            No hay máquinas registradas en el taller. Registra una arriba para empezar.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {maquinas.map((maq) => (
              <div 
                key={maq.idMaquina} 
                className="bg-white border border-[#dce7e4] rounded-2xl p-4 text-left hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold bg-[#e8fff5] text-[#1c4a3f] px-2 py-0.5 rounded-full font-mono">
                      {maq.codigoMaquina}
                    </span>
                    <button
                      onClick={() => handleToggleMaquina(maq.idMaquina)}
                      disabled={toggling !== null}
                      type="button"
                      className={`text-[9px] font-bold px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
                        maq.activo
                          ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                          : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                      }`}
                    >
                      {toggling === maq.idMaquina ? '...' : maq.activo ? 'Desactivar 🛑' : 'Activar ⚡'}
                    </button>
                  </div>
                  <h4 className="text-sm font-bold text-[#16342d] mt-2">
                    {maq.nombreMaquina}
                  </h4>
                  <p className="text-xs text-[#53796f] mt-1">
                    Tipo: <span className="font-semibold">{maq.tipoMaquina || 'No especificado'}</span>
                  </p>
                </div>
                <div className="text-[10px] text-gray-400 text-right mt-3">
                  Estado: {maq.activo ? 'Operativa' : 'Fuera de Servicio'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
