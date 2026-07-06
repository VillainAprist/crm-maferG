import { useState } from 'react'
import type { Usuario } from '../../types'
import { API_BASE } from '../../config'

interface TrabajadoresViewProps {
  usuarios: Usuario[]
  loading: boolean
  fetchUsuarios: () => Promise<void>
}

export function TrabajadoresView({ usuarios, loading, fetchUsuarios }: TrabajadoresViewProps) {
  const [nombres, setNombres] = useState('')
  const [username, setUsername] = useState('')
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  async function handleCrearTrabajador(e: React.FormEvent) {
    e.preventDefault()
    if (!nombres.trim() || !username.trim()) return

    setError('')
    setExito('')
    setCreando(true)

    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idUsuario: 0,
          nombres: nombres.trim(),
          username: username.trim().toLowerCase(),
          activo: true
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al registrar el trabajador.')
        return
      }

      setExito(`Trabajador "${nombres}" registrado exitosamente. (Su PIN por defecto es el del rol de Operador).`)
      setNombres('')
      setUsername('')
      await fetchUsuarios()
    } catch {
      setError('Error de conexión con el servidor.')
    } finally {
      setCreando(false)
    }
  }

  const [toggling, setToggling] = useState<number | null>(null)
  async function handleToggleUsuario(id: number) {
    if (toggling !== null) return
    setToggling(id)
    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/usuarios/${id}/toggle`, {
        method: 'POST'
      })
      if (res.ok) {
        await fetchUsuarios()
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
        <h2 className="text-lg font-bold text-[#173c34]">Gestión de Trabajadores del Taller</h2>
        <p className="text-sm text-[#4f6f66]">Registra y administra los operarios de confección que intervienen en la creación de los bienes.</p>
      </div>

      {/* Formulario de Registro */}
      <form onSubmit={handleCrearTrabajador} className="bg-[#f2faf7] border border-[#d6e5e2] rounded-2xl p-5 space-y-4">
        <h3 className="font-bold text-[#1c4a3f] text-sm">Registrar Nuevo Trabajador</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 text-left">
            <span className="text-xs font-semibold text-[#53796f]">Nombres y Apellidos</span>
            <input
              type="text"
              required
              value={nombres}
              onChange={(e) => setNombres(e.target.value)}
              placeholder="Ej. Roberto Carlos Bazán"
              className="border border-[#d0ded9] rounded-xl px-3 py-2.5 text-sm text-[#16342d] bg-white focus:outline-2 focus:outline-[rgba(71,169,147,0.3)] transition-all"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-left">
            <span className="text-xs font-semibold text-[#53796f]">Nombre de Usuario (Login)</span>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ej. roberto.bazan"
              className="border border-[#d0ded9] rounded-xl px-3 py-2.5 text-sm text-[#16342d] bg-white focus:outline-2 focus:outline-[rgba(71,169,147,0.3)] transition-all"
            />
          </label>
        </div>

        {error && <p className="text-red-600 text-sm font-semibold bg-red-50 p-2.5 rounded-lg border border-red-100">{error}</p>}
        {exito && <p className="text-green-700 text-sm font-semibold bg-green-50 p-2.5 rounded-lg border border-green-100">{exito}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={creando || !nombres.trim() || !username.trim()}
            className="px-5 py-2.5 rounded-full bg-[#1c4a3f] text-white text-sm font-bold hover:bg-[#153830] cursor-pointer disabled:opacity-50 transition-all shadow-sm"
          >
            {creando ? 'Registrando...' : 'Registrar Trabajador'}
          </button>
        </div>
      </form>

      {/* Listado de Trabajadores */}
      <div className="space-y-3 pt-4 border-t border-gray-100">
        <h3 className="font-bold text-[#1c4a3f] text-sm text-left">Trabajadores Registrados (Operarios)</h3>
        
        {loading ? (
          <div className="text-center py-8 text-gray-400">Cargando trabajadores...</div>
        ) : usuarios.length === 0 ? (
          <div className="text-center py-8 text-gray-400 border-2 border-dashed border-[#dce7e4] rounded-2xl">
            No hay trabajadores registrados.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {usuarios.map((user) => (
              <div 
                key={user.idUsuario} 
                className="bg-white border border-[#dce7e4] rounded-2xl p-4 text-left hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold bg-[#e8fff5] text-[#1c4a3f] px-2 py-0.5 rounded-full">
                      ID: {user.idUsuario}
                    </span>
                    <button
                      onClick={() => handleToggleUsuario(user.idUsuario)}
                      disabled={toggling !== null}
                      type="button"
                      className={`text-[9px] font-bold px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
                        user.activo
                          ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                          : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                      }`}
                    >
                      {toggling === user.idUsuario ? '...' : user.activo ? 'Desactivar 🛑' : 'Activar ⚡'}
                    </button>
                  </div>
                  <h4 className="text-sm font-bold text-[#16342d] mt-2">
                    {user.nombres}
                  </h4>
                  <p className="text-xs text-[#53796f] mt-1">
                    Usuario: <span className="font-mono font-semibold">{user.username}</span>
                  </p>
                </div>
                <div className="text-[10px] text-gray-400 text-right mt-3">
                  Rol: Operador de Taller
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
