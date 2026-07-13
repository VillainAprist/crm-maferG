// MAFER-G CRM Admin Dashboard - Vercel redeploy trigger
import { useState, useEffect } from 'react'
import type { ResumenData, Alerta, AdminTab, Lote, Producto, Evaluacion, Maquina, Venta, Cliente, Usuario, Inventario } from '../../types'
import { ResumenView } from './ResumenView'
import { AlertasView } from '../alertas'
import { LotesView } from '../lotes'
import { VentasView } from '../ventas'
import { CatalogoAdminView } from '../catalogo'
import { RecursosView } from '../recursos'
import { API_BASE } from '../../config'

export function AdminDashboard({ onNavigateToCatalog }: { onNavigateToCatalog: () => void }) {
  const [adminAuth, setAdminAuth] = useState(false)
  const [userInput, setUserInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [loginError, setLoginError] = useState('')
  const [userRole, setUserRole] = useState<'admin' | 'operador' | 'ventas' | 'soporte' | null>(null)

  const [adminTab, setAdminTab] = useState<AdminTab>('resumen')
  const [resumenData, setResumenData] = useState<ResumenData | null>(null)
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [maquinas, setMaquinas] = useState<Maquina[]>([])
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([])

  // New States
  const [ventas, setVentas] = useState<Venta[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [inventario, setInventario] = useState<Inventario[]>([])
  
  // Estados para modal de costos en Inventario General
  const [selectedLoteParaModal, setSelectedLoteParaModal] = useState<Lote | null>(null)
  const [filtroTipoPrenda, setFiltroTipoPrenda] = useState('')
  const [selectedCategoria, setSelectedCategoria] = useState('')

  const [loadingAdmin, setLoadingAdmin] = useState(false)
  const [alertasLoading, setAlertasLoading] = useState(false)
  const [lotesLoading, setLotesLoading] = useState(false)
  const [maquinasLoading, setMaquinasLoading] = useState(false)
  const [usuariosLoading, setUsuariosLoading] = useState(false)
  const [evaluacionesLoading, setEvaluacionesLoading] = useState(false)
  const [ventasLoading, setVentasLoading] = useState(false)
  const [inventarioLoading, setInventarioLoading] = useState(false)

  const pendingAlertsCount = resumenData?.alertasPendientes ?? 0
  const tabs: { key: AdminTab; label: string }[] = userRole === 'admin' ? [
    { key: 'resumen', label: 'Resumen' },
    { key: 'alertas', label: `Alertas${pendingAlertsCount > 0 ? ` (${pendingAlertsCount})` : ''}` },
    { key: 'inventario', label: 'Inventario General' },
    { key: 'ventas', label: 'Reporte de Ventas' },
    { key: 'catalogo', label: 'Gestionar Catálogo' },
    { key: 'recursos', label: 'Recursos' },
  ] : userRole === 'operador' ? [
    { key: 'lotes', label: 'Control de Lotes' },
    { key: 'inventario', label: 'Inventario General' }
  ] : userRole === 'ventas' ? [
    { key: 'ventas', label: 'Terminal POS' },
    { key: 'inventario', label: 'Inventario General' }
  ] : []

  // Interceptor global de fetch para inyectar token de autorización y manejar expiraciones
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : (input as any).url;
      if (url.includes('/api/nps/admin/')) {
        const token = localStorage.getItem('auth_token');
        if (token) {
          init = init || {};
          const headers = new Headers(init.headers || {});
          headers.set('Authorization', `Bearer ${token}`);
          init.headers = headers;
        }
      }
      const response = await originalFetch(input, init);
      if (response.status === 401 && url.includes('/api/nps/admin/')) {
        // Limpiar sesión expirada y redirigir al login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_role');
        setAdminAuth(false);
        setUserRole(null);
      }
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Restore session from localStorage if token is present
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedRole = localStorage.getItem('user_role') as any;
    if (savedToken && savedRole) {
      setAdminAuth(true);
      setUserRole(savedRole);
      setAdminTab(savedRole === 'admin' ? 'resumen' : savedRole === 'operador' ? 'lotes' : savedRole === 'ventas' ? 'ventas' : 'alertas');
      // Fetch initial data based on role
      if (savedRole === 'admin') {
        fetchResumen(); fetchAlertas(); fetchEvaluaciones(); fetchLotes(); fetchProductos(); fetchMaquinas(); fetchVentas(); fetchClientes(); fetchUsuarios(); fetchInventario();
      } else if (savedRole === 'operador') {
        fetchLotes(); fetchProductos(); fetchMaquinas(); fetchUsuarios();
      } else if (savedRole === 'ventas') {
        fetchLotes(); fetchVentas(); fetchClientes(); fetchProductos(); fetchMaquinas(); fetchUsuarios();
      } else if (savedRole === 'soporte') {
        fetchAlertas();
      }
    }
  }, []);

  async function handleLogin() {
    const user = userInput.trim().toLowerCase()
    const pass = passwordInput

    if (!user || !pass) {
      setLoginError('Usuario y contraseña son requeridos.')
      return
    }

    setLoginError('')
    setLoadingAdmin(true)

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
      })
      const data = await res.json()
      if (!res.ok) {
        setLoginError(data.error || 'Error al iniciar sesión.')
        return
      }

      // Guardar sesión en localStorage
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('user_role', data.role)

      setAdminAuth(true)
      setUserRole(data.role)
      setAdminTab(data.role === 'admin' ? 'resumen' : data.role === 'operador' ? 'lotes' : data.role === 'ventas' ? 'ventas' : 'alertas')
      setUserInput('')
      setPasswordInput('')

      // Cargar datos
      if (data.role === 'admin') {
        fetchResumen(); fetchAlertas(); fetchEvaluaciones(); fetchLotes(); fetchProductos(); fetchMaquinas(); fetchVentas(); fetchClientes(); fetchUsuarios(); fetchInventario();
      } else if (data.role === 'operador') {
        fetchLotes(); fetchProductos(); fetchMaquinas(); fetchUsuarios();
      } else if (data.role === 'ventas') {
        fetchLotes(); fetchVentas(); fetchClientes(); fetchProductos(); fetchMaquinas(); fetchUsuarios();
      } else if (data.role === 'soporte') {
        fetchAlertas();
      }

    } catch (err) {
      setLoginError('Error de conexión al servidor.')
    } finally {
      setLoadingAdmin(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_role')
    setAdminAuth(false)
    setUserRole(null)
    setUserInput('')
    setPasswordInput('')
    setLoginError('')
    setResumenData(null)
    setAlertas([])
    setLotes([])
    setProductos([])
    setMaquinas([])
    setEvaluaciones([])
    setVentas([])
    setClientes([])
    setUsuarios([])
    setInventario([])
  }

  async function fetchMaquinas() {
    setMaquinasLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/maquinas`)
      if (res.ok) {
        const data = (await res.json()) as Maquina[]
        setMaquinas(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setMaquinasLoading(false)
    }
  }

  async function fetchVentas() {
    setVentasLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/ventas`)
      if (res.ok) {
        const data = (await res.json()) as Venta[]
        setVentas(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setVentasLoading(false)
    }
  }

  async function fetchInventario() {
    setInventarioLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/inventario`)
      if (res.ok) {
        const data = (await res.json()) as Inventario[]
        setInventario(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setInventarioLoading(false)
    }
  }

  async function fetchClientes() {
    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/clientes`)
      if (res.ok) {
        const data = (await res.json()) as Cliente[]
        setClientes(data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function fetchUsuarios() {
    setUsuariosLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/usuarios`)
      if (res.ok) {
        const data = (await res.json()) as Usuario[]
        setUsuarios(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setUsuariosLoading(false)
    }
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

  // fetchCupones removido de la vista de administración

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
    }
    if (tab === 'alertas' && alertas.length === 0) fetchAlertas()
    if (tab === 'lotes') {
      fetchLotes()
      fetchProductos()
      fetchUsuarios()
      fetchMaquinas()
    }
    if (tab === 'maquinas') {
      fetchMaquinas()
    }
    if (tab === 'ventas') {
      fetchVentas()
      fetchClientes()
      fetchLotes()
    }
    if (tab === 'inventario') {
      fetchInventario()
    }
  }

  if (!adminAuth) {
    return (
      <div className="w-full max-w-sm mx-auto bg-white rounded-[28px] border border-border-primary shadow-[0_16px_40px_rgba(25,52,44,0.12)] p-6 animate-scaleIn">
        <div className="text-center mb-5">
          <img
            src="/maferG-logo/mafergLOGO.png"
            alt="Logo MAFER-G"
            className="h-16 w-auto mx-auto mb-4 object-contain"
          />
          <h2 className="text-lg font-extrabold text-primary flex items-center justify-center gap-1.5">
            <span>Acceso Personal</span>
            <span className="text-sm">🔒</span>
          </h2>
          <p className="text-xs text-secondary mt-1">Ingresa tus credenciales de acceso</p>
        </div>

        <div className="space-y-3 mb-4 text-left">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-secondary">Usuario</span>
            <input
              type="text"
              value={userInput}
              onChange={(e) => { setUserInput(e.target.value); setLoginError('') }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleLogin() }}
              className="border border-[#cce2db] rounded-xl px-4 py-2.5 text-xs text-primary bg-[#fafdfe] focus:outline-2 focus:outline-accent/30 transition-all font-semibold"
              placeholder="Ej. admin"
              autoFocus
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-secondary">Contraseña</span>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setLoginError('') }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleLogin() }}
              className="border border-[#cce2db] rounded-xl px-4 py-2.5 text-xs text-primary bg-[#fafdfe] focus:outline-2 focus:outline-accent/30 transition-all"
              placeholder="••••••••"
            />
          </label>
        </div>

        {loginError && <p className="text-red-600 text-xs mb-4 text-center font-bold">{loginError}</p>}

        <button
          className="w-full py-3.5 rounded-full bg-gradient-to-r from-accent to-[#47a993] text-white text-xs font-extrabold uppercase tracking-wide cursor-pointer hover:opacity-95 transition-all shadow-md shadow-accent/20"
          onClick={handleLogin}
          disabled={!userInput || !passwordInput}
        >
          Ingresar al Sistema
        </button>

        <button
          className="w-full mt-2 text-xs text-primary hover:text-primary-dark cursor-pointer py-2 transition-colors font-medium"
          onClick={onNavigateToCatalog}
        >
          Ver Catálogo
        </button>



      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto animate-fadeIn">
      <header className="flex items-center justify-between mb-4 bg-white p-4 rounded-2xl border border-border-primary shadow-sm">
        <div className="flex items-center gap-3">
          <img
            src="/maferG-logo/mafergLOGO.png"
            alt="Logo MAFER-G"
            className="h-10 w-auto object-contain"
          />
          <div className="h-6 w-px bg-gray-200" />
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-extrabold text-primary">
                {userRole === 'admin'
                  ? 'Panel de Control'
                  : userRole === 'operador'
                    ? 'Módulo Operario'
                    : userRole === 'ventas'
                      ? 'Terminal POS'
                      : 'Soporte y NPS'}
              </h1>
              <span className={`text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider ${userRole === 'admin'
                ? 'bg-primary text-white'
                : userRole === 'operador'
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : userRole === 'ventas'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'bg-green-100 text-green-800 border border-green-200'
                }`}>
                {userRole === 'admin' ? 'Administrador' : userRole === 'operador' ? 'Operario' : userRole === 'ventas' ? 'Ventas' : 'Atención al Cliente'}
              </span>
            </div>
            <p className="text-[11px] text-secondary font-medium">CRM + Calidad Textil</p>
          </div>
        </div>
        <button
          className="text-xs font-bold px-4 py-2 rounded-full border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors shadow-sm animate-fadeIn"
          onClick={handleLogout}
        >
          Cerrar Sesión
        </button>
      </header>

      {(userRole === 'admin' || userRole === 'operador' || userRole === 'ventas') && (
        <div className="flex gap-2 mb-4 bg-white p-1.5 rounded-2xl border border-border-primary shadow-sm overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all whitespace-nowrap ${adminTab === tab.key
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-secondary hover:bg-primary-light hover:text-primary'
                }`}
              onClick={() => handleTabChange(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-[24px] border border-border-primary shadow-sm p-6 min-h-[400px]">
        {adminTab === 'resumen' && userRole === 'admin' && (
          <ResumenView
            loadingAdmin={loadingAdmin}
            resumenData={resumenData}
            fetchResumen={fetchResumen}
            evaluaciones={evaluaciones}
            evaluacionesLoading={evaluacionesLoading}
            fetchEvaluaciones={fetchEvaluaciones}
          />
        )}
        {adminTab === 'alertas' && (userRole === 'admin' || userRole === 'soporte') && (
          <AlertasView alertasLoading={alertasLoading} alertas={alertas} fetchAlertas={fetchAlertas} setAlertas={setAlertas} />
        )}
        {adminTab === 'lotes' && (
          <LotesView
            lotes={lotes}
            productos={productos}
            maquinas={maquinas}
            usuarios={usuarios}
            userRole={userRole}
            loading={lotesLoading}
            fetchLotes={fetchLotes}
            fetchProductos={fetchProductos}
          />
        )}
        {adminTab === 'recursos' && userRole === 'admin' && (
          <RecursosView
            maquinas={maquinas}
            maquinasLoading={maquinasLoading}
            fetchMaquinas={fetchMaquinas}
            usuarios={usuarios}
            usuariosLoading={usuariosLoading}
            fetchUsuarios={fetchUsuarios}
          />
        )}
        {adminTab === 'ventas' && (userRole === 'admin' || userRole === 'ventas') && (
          <VentasView
            ventas={ventas}
            lotes={lotes}
            clientes={clientes}
            loading={ventasLoading}
            fetchVentas={fetchVentas}
            fetchLotes={fetchLotes}
            fetchClientes={fetchClientes}
            isAdmin={userRole === 'admin'}
          />
        )}
        {adminTab === 'inventario' && (userRole === 'admin' || userRole === 'operador' || userRole === 'ventas') && (
          <div className="space-y-6 animate-fadeIn text-left">
            <div>
              <h2 className="text-lg font-bold text-[#173c34]">Inventario General de Prendas</h2>
              <p className="text-sm text-[#4f6f66]">
                Resumen consolidado de producción, ventas y stock actual para cada tipo de prenda en la empresa.
              </p>
            </div>

            {/* Filtros de Búsqueda y Categoría */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-[#fafdfe] border border-[#dce7e4] p-4 rounded-2xl">
              <div className="flex gap-2 items-center w-full md:max-w-xs shrink-0">
                <span className="text-xs font-extrabold text-[#2d5a50] uppercase shrink-0">🔍 Buscar:</span>
                <div className="relative w-full">
                  <input
                    type="text"
                    placeholder="Ej: Polo, Casaca, Bebé..."
                    value={filtroTipoPrenda}
                    onChange={(e) => setFiltroTipoPrenda(e.target.value)}
                    className="w-full px-3 py-1.5 pr-8 border border-[#dce7e4] bg-white rounded-xl text-xs font-semibold focus:outline-none focus:border-[#47a993] text-primary"
                  />
                  {filtroTipoPrenda && (
                    <button
                      type="button"
                      onClick={() => setFiltroTipoPrenda('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 font-bold px-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="h-px w-full md:h-6 md:w-px bg-gray-200 shrink-0" />

              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-extrabold text-[#2d5a50] uppercase shrink-0">Prenda:</span>
                <button
                  type="button"
                  onClick={() => setSelectedCategoria('')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                    selectedCategoria === ''
                      ? 'bg-primary text-white border-primary shadow-sm shadow-primary/10'
                      : 'bg-white text-[#2d5a50] border-[#dce7e4] hover:bg-primary-light hover:text-primary'
                  }`}
                >
                  Todos
                </button>
                {Array.from(new Set(inventario.map(item => item.categoriaInfantil).filter(Boolean))).map((categoria) => (
                  <button
                    key={categoria}
                    type="button"
                    onClick={() => setSelectedCategoria(categoria)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                      selectedCategoria.toLowerCase() === categoria.toLowerCase()
                        ? 'bg-primary text-white border-primary shadow-sm shadow-primary/10'
                        : 'bg-white text-[#2d5a50] border-[#dce7e4] hover:bg-primary-light hover:text-primary'
                    }`}
                  >
                    {categoria}
                  </button>
                ))}
              </div>
            </div>

            {inventarioLoading ? (
              <div className="text-center py-8 text-gray-400">Cargando inventario...</div>
            ) : inventario.length === 0 ? (
              <div className="text-center py-8 text-gray-400 border border-dashed border-[#dce7e4] rounded-2xl">
                No hay registros de inventario.
              </div>
            ) : (
              <div className="overflow-x-auto border border-[#dce7e4] rounded-xl bg-white shadow-sm">
                <table className="w-full text-sm text-left text-gray-500">
                  <thead className="text-xs text-[#1c4a3f] uppercase bg-[#f2faf7] border-b border-[#dce7e4]">
                    <tr>
                      <th className="px-4 py-3 font-bold">Prenda</th>
                      <th className="px-4 py-3 font-bold">SKU</th>
                      <th className="px-4 py-3 font-bold">Categoría</th>
                      <th className="px-4 py-3 text-center font-bold">Total Producido</th>
                      <th className="px-4 py-3 text-center font-bold">Total Vendido</th>
                      <th className="px-4 py-3 text-center font-bold">Stock Disponible</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eef4f2]">
                    {inventario.filter(item => {
                      const search = filtroTipoPrenda.trim().toLowerCase()
                      const matchesSearch = !search ||
                        item.nombrePrenda.toLowerCase().includes(search) ||
                        item.sku.toLowerCase().includes(search)
                      
                      const matchesCategory = !selectedCategoria ||
                        (item.categoriaInfantil && item.categoriaInfantil.toLowerCase() === selectedCategoria.toLowerCase())
                      
                      return matchesSearch && matchesCategory
                    }).map((item) => {
                      const lotesDeProducto = lotes.filter(l => l.sku === item.sku)
                      const loteAsociado = lotesDeProducto[0]

                      return (
                        <tr
                          key={item.idProducto}
                          onClick={() => {
                            if (loteAsociado) {
                              setSelectedLoteParaModal(loteAsociado)
                            }
                          }}
                          className={`transition-colors border-b border-[#eef4f2] ${
                            loteAsociado
                              ? 'hover:bg-[#f2faf7] cursor-pointer'
                              : 'opacity-70'
                          }`}
                        >
                          <td className="px-4 py-3 font-semibold text-[#16342d]">
                            {item.nombrePrenda}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-[#53796f]">{item.sku}</td>
                          <td className="px-4 py-3 text-xs text-[#2d5a50]">{item.categoriaInfantil || 'Sin Categoría'}</td>
                          <td className="px-4 py-3 text-center text-xs text-gray-600 font-semibold">{item.totalProducido} uds.</td>
                          <td className="px-4 py-3 text-center text-xs text-gray-600 font-semibold">{item.totalVendido} uds.</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${item.stockDisponible > 20
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : item.stockDisponible > 0
                                ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                              }`}>
                              {item.stockDisponible} uds.
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {selectedLoteParaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs animate-fadeIn p-4">
            <div className="bg-white rounded-2xl border border-[#dce7e4] shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-scaleIn">
              {/* Modal Header */}
              <div className="px-6 py-4 bg-[#f2faf7] border-b border-[#dce7e4] flex justify-between items-center flex-shrink-0 text-left">
                <div>
                  <h3 className="font-extrabold text-[#173c34] text-sm uppercase tracking-wide">Gestión y Trazabilidad del Lote</h3>
                  <p className="text-[11px] text-[#4f6f66]">Código: <span className="font-mono font-bold text-primary">{selectedLoteParaModal.codigoLote}</span> | Prenda: <span className="font-bold text-primary">{selectedLoteParaModal.nombrePrenda}</span></p>
                </div>
                <button
                  onClick={() => setSelectedLoteParaModal(null)}
                  className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>
              
              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                <LotesView
                  lotes={[lotes.find(l => l.idLote === selectedLoteParaModal.idLote) || selectedLoteParaModal]}
                  productos={productos}
                  maquinas={maquinas}
                  usuarios={usuarios}
                  userRole={userRole}
                  loading={false}
                  fetchLotes={fetchLotes}
                  fetchProductos={fetchProductos}
                />
              </div>
              
              {/* Modal Footer */}
              <div className="px-6 py-4 bg-white border-t border-[#eef4f2] flex justify-end flex-shrink-0">
                <button
                  onClick={() => setSelectedLoteParaModal(null)}
                  className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-[#2d5a50] text-xs font-bold rounded-full transition-all cursor-pointer"
                >
                  Cerrar Ventana
                </button>
              </div>
            </div>
          </div>
        )}
        {adminTab === 'catalogo' && userRole === 'admin' && (
          <CatalogoAdminView
            productos={productos}
            fetchProductos={fetchProductos}
          />
        )}
      </div>
    </div>
  )
}
