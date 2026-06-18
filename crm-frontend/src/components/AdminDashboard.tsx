import { useState } from 'react'
import type { ResumenData, Alerta, Cupon, AdminTab, Lote, Producto, Evaluacion } from '../types'
import { ResumenView } from './ResumenView'
import { AlertasView } from './AlertasView'
import { LotesView } from './LotesView'
import { API_BASE } from '../config'

export function AdminDashboard({ setAdminMode }: { setAdminMode: (mode: boolean) => void }) {
  const [adminAuth, setAdminAuth] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  
  const [adminTab, setAdminTab] = useState<AdminTab>('resumen')
  const [resumenData, setResumenData] = useState<ResumenData | null>(null)
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [cupones, setCupones] = useState<Cupon[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([])
  
  const [loadingAdmin, setLoadingAdmin] = useState(false)
  const [alertasLoading, setAlertasLoading] = useState(false)
  const [lotesLoading, setLotesLoading] = useState(false)
  const [evaluacionesLoading, setEvaluacionesLoading] = useState(false)

  const tabs: { key: AdminTab; label: string }[] = [
    { key: 'resumen', label: 'Resumen' },
    { key: 'alertas', label: 'Alertas' },
    { key: 'lotes', label: 'Lotes y QRs' },
  ]

  function handleLogin() {
    if (pinInput === '1234') {
      setAdminAuth(true)
      setPinInput('')
      setPinError('')
      fetchResumen()
      fetchAlertas()
      fetchEvaluaciones()
      fetchCupones()
      fetchLotes()
      fetchProductos()
    } else {
      setPinError('PIN incorrecto')
    }
  }

  function handleLogout() {
    setAdminAuth(false)
    setAdminMode(false)
    setPinInput('')
    setPinError('')
    setResumenData(null)
    setAlertas([])
    setCupones([])
    setLotes([])
    setProductos([])
    setEvaluaciones([])
  }

  async function fetchResumen() {
    setLoadingAdmin(true)
    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/resumen`)
      if (res.ok) {
        const data = (await res.json()) as ResumenData
        setResumenData(data)
        setLoadingAdmin(false)
        return
      }
    } catch {
      // Backend no disponible
    }
    // Mock data si falla
    setResumenData({
      npsEstimado: 42,
      totalEncuestas: 14,
      respuestasHoy: 18,
      detractores: 3,
      pasivos: 0,
      promotores: 11,
      alertasPendientes: 3,
      ultimosEventos: [],
    })
    setLoadingAdmin(false)
  }

  async function fetchAlertas() {
    setAlertasLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/alertas`)
      if (res.ok) {
        const data = (await res.json()) as Alerta[]
        setAlertas(data)
        setAlertasLoading(false)
        return
      }
    } catch {
      // Backend no disponible
    }
    setAlertas([])
    setAlertasLoading(false)
  }

  async function fetchCupones() {
    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/cupones`)
      if (res.ok) {
        const data = (await res.json()) as Cupon[]
        setCupones(data)
        return
      }
    } catch {
      // Backend no disponible
    }
    setCupones([])
  }

  async function fetchLotes() {
    setLotesLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/lotes`)
      if (res.ok) {
        const data = (await res.json()) as Lote[]
        setLotes(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLotesLoading(false)
    }
  }

  async function fetchProductos() {
    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/productos`)
      if (res.ok) {
        const data = (await res.json()) as Producto[]
        setProductos(data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function fetchEvaluaciones() {
    setEvaluacionesLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/evaluaciones`)
      if (res.ok) {
        const data = (await res.json()) as Evaluacion[]
        setEvaluaciones(data)
        setEvaluacionesLoading(false)
        return
      }
    } catch {
      // Backend no disponible
    }
    setEvaluaciones([])
    setEvaluacionesLoading(false)
  }

  function handleTabChange(tab: AdminTab) {
    setAdminTab(tab)
    if (tab === 'resumen') {
      fetchResumen()
      fetchEvaluaciones()
      fetchCupones()
    }
    if (tab === 'alertas' && alertas.length === 0) fetchAlertas()
    if (tab === 'lotes') {
      fetchLotes()
      fetchProductos()
    }
  }

  if (!adminAuth) {
    return (
      <div className="w-full max-w-sm mx-auto bg-white rounded-[28px] border border-[#dce7e4] shadow-[0_16px_40px_rgba(25,52,44,0.15)] p-6 animate-fadeIn">
        <div className="text-center mb-4">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#e8fff5] flex items-center justify-center">
            <span className="text-[#47a993] text-xl font-bold">🔒</span>
          </div>
          <h2 className="text-lg font-bold text-[#16342d]">Acceso Administrativo</h2>
          <p className="text-sm text-gray-500">Ingresa el PIN</p>
        </div>

        <label className="flex flex-col gap-1.5 mb-4">
          <span className="text-xs font-semibold text-[#53796f]">PIN</span>
          <input
            type="password"
            value={pinInput}
            onChange={(e) => { setPinInput(e.target.value); setPinError('') }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleLogin() }}
            maxLength={6}
            className="border border-[#d0ded9] rounded-[10px] px-3 py-2.5 text-sm text-center text-[#16342d] bg-[#fafdfe] focus:outline-2 focus:outline-[rgba(71,169,147,0.3)]"
            placeholder="****"
            autoFocus
          />
        </label>

        {pinError && <p className="text-red-600 text-sm mb-3 text-center font-semibold">{pinError}</p>}

        <button
          className="w-full py-3 rounded-full bg-gradient-to-r from-[#54b8a0] to-[#47a993] text-white font-bold cursor-pointer hover:opacity-90 transition-all disabled:opacity-50"
          onClick={handleLogin}
          disabled={!pinInput}
        >
          Ingresar
        </button>

        <button
          className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600 cursor-pointer py-2"
          onClick={() => setAdminMode(false)}
        >
          Volver a inicio
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto animate-fadeIn">
      <header className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-lg font-bold text-[#16342d]">Panel Admin</h1>
          <p className="text-sm text-[#4f6f66]">MAFER-G Intelligent Connect</p>
        </div>
        <button
          className="text-xs font-bold px-4 py-2 rounded-full border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors"
          onClick={handleLogout}
        >
          Salir
        </button>
      </header>

      <div className="flex gap-2 mb-4 bg-white p-1.5 rounded-2xl border border-[#dce7e4] shadow-sm overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all whitespace-nowrap ${
              adminTab === tab.key
                ? 'bg-[#1e4a40] text-white shadow-md'
                : 'text-[#53796f] hover:bg-[#f0f7f5]'
            }`}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[24px] border border-[#dce7e4] shadow-sm p-6 min-h-[400px]">
        {adminTab === 'resumen' && (
          <ResumenView
            loadingAdmin={loadingAdmin}
            resumenData={resumenData}
            fetchResumen={fetchResumen}
            evaluaciones={evaluaciones}
            evaluacionesLoading={evaluacionesLoading}
            fetchEvaluaciones={fetchEvaluaciones}
            cupones={cupones}
            fetchCupones={fetchCupones}
          />
        )}
        {adminTab === 'alertas' && <AlertasView alertasLoading={alertasLoading} alertas={alertas} fetchAlertas={fetchAlertas} setAlertas={setAlertas} />}
        {adminTab === 'lotes' && (
          <LotesView 
            lotes={lotes} 
            productos={productos} 
            loading={lotesLoading} 
            fetchLotes={fetchLotes} 
          />
        )}
      </div>
    </div>
  )
}
