import { useState } from 'react'
import { TrabajadoresView } from './TrabajadoresView'
import { MaquinasView } from './MaquinasView'
import type { Maquina, Usuario } from '../types'

interface RecursosViewProps {
  maquinas: Maquina[]
  maquinasLoading: boolean
  fetchMaquinas: () => Promise<void>
  usuarios: Usuario[]
  usuariosLoading: boolean
  fetchUsuarios: () => Promise<void>
}

export function RecursosView({
  maquinas,
  maquinasLoading,
  fetchMaquinas,
  usuarios,
  usuariosLoading,
  fetchUsuarios
}: RecursosViewProps) {
  const [subTab, setSubTab] = useState<'trabajadores' | 'maquinas'>('trabajadores')

  return (
    <div className="space-y-5 animate-fadeIn text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-primary">Recursos del Taller</h2>
          <p className="text-xs text-secondary mt-0.5">Administración de maquinarias industriales y personal operativo registrado.</p>
        </div>
        
        {/* Sub-tabs locales */}
        <div className="flex items-center gap-1 bg-primary-light p-1 rounded-xl border border-border-primary shadow-sm self-start shrink-0">
          <button
            type="button"
            onClick={() => setSubTab('trabajadores')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'trabajadores'
                ? 'bg-primary text-white shadow-sm'
                : 'text-secondary hover:text-primary'
            }`}
          >
            👥 Trabajadores ({usuarios.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('maquinas')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'maquinas'
                ? 'bg-primary text-white shadow-sm'
                : 'text-secondary hover:text-primary'
            }`}
          >
            ⚙️ Máquinas ({maquinas.length})
          </button>
        </div>
      </div>

      <div className="border border-border-primary rounded-[20px] p-5 bg-white shadow-xs">
        {subTab === 'trabajadores' && (
          <TrabajadoresView
            usuarios={usuarios}
            loading={usuariosLoading}
            fetchUsuarios={fetchUsuarios}
          />
        )}
        
        {subTab === 'maquinas' && (
          <MaquinasView
            maquinas={maquinas}
            loading={maquinasLoading}
            fetchMaquinas={fetchMaquinas}
          />
        )}
      </div>
    </div>
  )
}
