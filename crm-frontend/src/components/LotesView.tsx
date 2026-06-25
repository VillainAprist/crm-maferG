import { useState } from 'react'
import type { Lote, Producto, Maquina, Usuario, LoteProceso } from '../types'
import { API_BASE } from '../config'

interface LotesViewProps {
  lotes: Lote[]
  productos: Producto[]
  maquinas: Maquina[]
  usuarios: Usuario[]
  userRole?: string | null
  loading: boolean
  fetchLotes: () => Promise<void>
  fetchProductos?: () => Promise<void>
}

export function LotesView({
  lotes,
  productos,
  maquinas,
  usuarios,
  userRole,
  loading,
  fetchLotes,
  fetchProductos
}: LotesViewProps) {
  // Batch Form States
  const [codigoLote, setCodigoLote] = useState('')
  const [idProducto, setIdProducto] = useState<number | ''>('')
  const [cantidad, setCantidad] = useState<number | ''>(1)
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [mostrarFormLote, setMostrarFormLote] = useState(false)

  // New Garment states
  const [mostrarFormPrenda, setMostrarFormPrenda] = useState(false)
  const [nuevaPrendaSku, setNuevaPrendaSku] = useState('')
  const [nuevaPrendaNombre, setNuevaPrendaNombre] = useState('')
  const [nuevaPrendaCategoria, setNuevaPrendaCategoria] = useState('')
  const [creandoPrenda, setCreandoPrenda] = useState(false)
  const [prendaError, setPrendaError] = useState('')

  // Expandable Details (Production Log) States
  const [loteExpandido, setLoteExpandido] = useState<number | null>(null)
  const [procesosLote, setProcesosLote] = useState<Record<number, LoteProceso[]>>({})
  const [cargandoProcesos, setCargandoProcesos] = useState<Record<number, boolean>>({})
  const [procesoError, setProcesoError] = useState<Record<number, string>>({})

  // Log Process Form States
  const [idOperador, setIdOperador] = useState<number | ''>('')
  const [maquinaProceso, setMaquinaProceso] = useState<number | ''>('')
  const [operacionSeleccionada, setOperacionSeleccionada] = useState('Costura')
  const [registrandoProceso, setRegistrandoProceso] = useState(false)

  const [copiadoLote, setCopiadoLote] = useState<string | null>(null)
  const [fechaFiltro, setFechaFiltro] = useState<'TODO' | 'HOY' | 'SEMANA' | 'MES'>('TODO')

  const operacionesDisponibles = [
    'Corte',
    'Costura',
    'Remalle',
    'Recubierto/Collareta',
    'Ojal y Botón',
    'Acabado/Limpieza',
    'Planchado',
    'Control de Calidad',
    'Empaque'
  ]

  // Filter lots
  const lotesFiltrados = lotes.filter((lote) => {
    if (fechaFiltro === 'TODO') return true

    const evDate = new Date(lote.fechaConfeccion + 'T00:00:00')
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    if (fechaFiltro === 'HOY') {
      const todayStr = now.toLocaleDateString('sv-SE')
      return lote.fechaConfeccion === todayStr
    }

    if (fechaFiltro === 'SEMANA') {
      const diffTime = now.getTime() - evDate.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays >= 0 && diffDays <= 7
    }

    if (fechaFiltro === 'MES') {
      const diffTime = now.getTime() - evDate.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays >= 0 && diffDays <= 30
    }

    return true
  })

  async function handleCrearLote(e: React.FormEvent) {
    e.preventDefault()
    if (!codigoLote.trim() || !idProducto) return

    setError('')
    setExito('')
    setCreando(true)

    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/lotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigoLote: codigoLote.trim(),
          idProducto: Number(idProducto),
          cantidad: Number(cantidad) || 1,
          idMaquina: null // Set initially null, machines are added in the process log
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al crear el lote.')
        return
      }

      setExito(`Lote ${codigoLote} registrado exitosamente. Agrega los pasos de confección abajo.`)
      setCodigoLote('')
      setIdProducto('')
      setCantidad(1)
      await fetchLotes()
    } catch {
      setError('Error de conexión con el servidor.')
    } finally {
      setCreando(false)
    }
  }

  async function handleCrearPrenda(e: React.FormEvent) {
    e.preventDefault()
    if (!nuevaPrendaSku.trim() || !nuevaPrendaNombre.trim()) return

    setCreandoPrenda(true)
    setPrendaError('')

    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: nuevaPrendaSku.trim(),
          nombrePrenda: nuevaPrendaNombre.trim(),
          categoriaInfantil: nuevaPrendaCategoria.trim() || null
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setPrendaError(data.error || 'Error al crear la prenda.')
        return
      }

      // Success
      setNuevaPrendaSku('')
      setNuevaPrendaNombre('')
      setNuevaPrendaCategoria('')
      setMostrarFormPrenda(false)
      
      // Refresh list in parent and auto-select new product
      if (fetchProductos) {
        await fetchProductos()
      }
      setIdProducto(data.id)
    } catch {
      setPrendaError('Error de conexión al registrar prenda.')
    } finally {
      setCreandoPrenda(false)
    }
  }

  async function toggleLote(idLote: number) {
    if (loteExpandido === idLote) {
      setLoteExpandido(null)
      return
    }
    setLoteExpandido(idLote)
    await refreshProcesos(idLote)
  }

  async function refreshProcesos(idLote: number) {
    setCargandoProcesos((prev) => ({ ...prev, [idLote]: true }))
    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/lotes/${idLote}/procesos`)
      if (res.ok) {
        const data = (await res.json()) as LoteProceso[]
        setProcesosLote((prev) => ({ ...prev, [idLote]: data }))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setCargandoProcesos((prev) => ({ ...prev, [idLote]: false }))
    }
  }

  async function handleAddProceso(idLote: number, e: React.FormEvent) {
    e.preventDefault()
    if (!idOperador || !operacionSeleccionada) return

    setRegistrandoProceso(true)
    setProcesoError((prev) => ({ ...prev, [idLote]: '' }))
    
    const payload = {
      idLote,
      idUsuario: Number(idOperador),
      idMaquina: maquinaProceso ? Number(maquinaProceso) : null,
      operacion: operacionSeleccionada
    }

    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/lotes/${idLote}/procesos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const data = await res.json()
        setProcesoError((prev) => ({ ...prev, [idLote]: data.error || 'Error al registrar la operación.' }))
        return
      }

      // Reset Form Fields
      setIdOperador('')
      setMaquinaProceso('')
      setOperacionSeleccionada('Costura')

      // Refresh log
      await refreshProcesos(idLote)
    } catch {
      setProcesoError((prev) => ({ ...prev, [idLote]: 'Error de conexión con el servidor.' }))
    } finally {
      setRegistrandoProceso(false)
    }
  }

  function handlePrintQr(tokenQr: string, codigo: string, prenda: string, cant: number, stock: number) {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html>
        <head>
          <title>Etiqueta QR Lote (Legacy) ${codigo}</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              text-align: center;
              padding: 40px;
              margin: 0;
              background-color: #ffffff;
            }
            .label-card {
              border: 3px double #1e4a40;
              padding: 30px;
              display: inline-block;
              border-radius: 16px;
              background: #fafcfb;
              box-shadow: 0 4px 10px rgba(0,0,0,0.05);
            }
            h1 {
              font-size: 20px;
              margin: 0 0 15px 0;
              color: #1e4a40;
              text-transform: uppercase;
              letter-spacing: 1px;
              border-bottom: 2px solid #e2ece9;
              padding-bottom: 10px;
            }
            .info {
              font-size: 15px;
              margin: 8px 0;
              color: #2d5a50;
              text-align: left;
            }
            .info strong {
              color: #14342e;
            }
            img {
              width: 220px;
              height: 220px;
              margin: 20px 0;
              border: 1px solid #cce2db;
              border-radius: 8px;
              padding: 5px;
              background: white;
            }
            .footer-text {
              font-size: 11px;
              color: #6a8e85;
              margin-top: 15px;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <div class="label-card">
            <h1>MAFER-G Lote Legacy</h1>
            <div class="info"><strong>Lote:</strong> ${codigo}</div>
            <div class="info"><strong>Prenda:</strong> ${prenda}</div>
            <div class="info"><strong>Cant. Inicial:</strong> ${cant} uds. | <strong>Stock:</strong> ${stock}</div>
            <img src="${API_BASE}/api/nps/admin/etiqueta/${tokenQr}/qr" alt="QR Code" />
            <div class="footer-text">Escanea para calificar este lote (Código de prueba)</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  function handleCopyLink(tokenQr: string, codigo: string) {
    const link = `${window.location.origin}/?token=${tokenQr}`
    navigator.clipboard.writeText(link).then(() => {
      setCopiadoLote(codigo)
      setTimeout(() => setCopiadoLote(null), 2000)
    })
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-left">
        <h2 className="text-lg font-extrabold text-primary">
          {userRole === 'operador' ? 'Trazabilidad y Bitácora de Confección' : 'Gestión de Lotes de Producción'}
        </h2>
        <p className="text-xs text-secondary mt-1">
          {userRole === 'operador'
            ? 'Registra las operaciones realizadas (Corte, Costura, Remalle) e indica qué operario y qué máquina participaron.'
            : 'Registra los lotes confeccionados en el taller y realiza el seguimiento del stock y bitácoras.'}
        </p>
      </div>

      {/* Accordion form for new Lote creation (only for Admin/Operario) */}
      {(userRole === 'admin' || userRole === 'operador') && (
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-border-primary shadow-sm text-left">
            <div>
              <h3 className="font-bold text-primary text-sm">Registrar Nuevo Lote</h3>
              <p className="text-[11px] text-secondary">Crea una nueva partida de prendas confeccionadas</p>
            </div>
            <button
              onClick={() => {
                setMostrarFormLote(!mostrarFormLote);
                setError('');
                setExito('');
              }}
              type="button"
              className={`px-4.5 py-2 rounded-full text-xs font-bold transition-all duration-300 flex items-center gap-1 cursor-pointer shadow-sm ${
                mostrarFormLote 
                  ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                  : 'bg-primary text-white hover:bg-primary-hover shadow-primary/10'
              }`}
            >
              {mostrarFormLote ? '✕ Cancelar' : '+ Nuevo Lote'}
            </button>
          </div>

          {mostrarFormLote && (
            <form onSubmit={handleCrearLote} className="bg-primary-light border border-border-primary rounded-2xl p-5 space-y-4 animate-scaleIn text-left">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex flex-col gap-1.5 text-left">
                  <span className="text-xs font-bold text-secondary">Código de Lote</span>
                  <input
                    type="text"
                    required
                    value={codigoLote}
                    onChange={(e) => setCodigoLote(e.target.value)}
                    placeholder="Ej. LOTE-2026-001"
                    className="border border-border-primary rounded-xl px-3 py-2.5 text-sm text-primary bg-white focus:outline-2 focus:outline-accent/30 transition-all shadow-sm"
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-left">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-secondary">Prenda / Producto</span>
                    <button
                      type="button"
                      onClick={() => { setMostrarFormPrenda(!mostrarFormPrenda); setPrendaError(''); }}
                      className="text-[10px] font-bold text-accent hover:text-accent-dark transition-colors cursor-pointer"
                    >
                      {mostrarFormPrenda ? '✕ Cancelar' : '+ Nueva Prenda'}
                    </button>
                  </div>
                  <select
                    required
                    value={idProducto}
                    onChange={(e) => setIdProducto(e.target.value !== '' ? Number(e.target.value) : '')}
                    className="border border-border-primary rounded-xl px-3 py-2.5 text-sm text-primary bg-white focus:outline-2 focus:outline-accent/30 transition-all shadow-sm"
                  >
                    <option value="">Seleccione una prenda</option>
                    {productos.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.nombrePrenda} ({prod.sku})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5 text-left">
                  <span className="text-xs font-bold text-secondary">Cantidad (uds.)</span>
                  <input
                    type="number"
                    required
                    min={1}
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value !== '' ? Number(e.target.value) : '')}
                    placeholder="Ej. 100"
                    className="border border-border-primary rounded-xl px-3 py-2.5 text-sm text-primary bg-white focus:outline-2 focus:outline-accent/30 transition-all shadow-sm"
                  />
                </label>
              </div>

              {mostrarFormPrenda && (
                <div className="border border-dashed border-[#b8d0c6] bg-[#f8fffc] rounded-2xl p-4 space-y-3 animate-fadeIn mt-2 shadow-inner">
                  <h4 className="text-xs font-extrabold text-primary uppercase tracking-wider">Registrar Nueva Prenda</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label className="flex flex-col gap-1 text-xs">
                      <span className="font-bold text-secondary">SKU Único</span>
                      <input
                        type="text"
                        required
                        placeholder="Ej. SKU-POLO-VERANO"
                        value={nuevaPrendaSku}
                        onChange={(e) => setNuevaPrendaSku(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                        className="border border-border-primary rounded-xl px-3 py-2 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                      <span className="font-bold text-secondary">Nombre de Prenda</span>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Polos de verano bebe"
                        value={nuevaPrendaNombre}
                        onChange={(e) => setNuevaPrendaNombre(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                        className="border border-border-primary rounded-xl px-3 py-2 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                      <span className="font-bold text-secondary">Categoría Infantil</span>
                      <input
                        type="text"
                        placeholder="Ej. Polos (Opcional)"
                        value={nuevaPrendaCategoria}
                        onChange={(e) => setNuevaPrendaCategoria(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                        className="border border-border-primary rounded-xl px-3 py-2 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </label>
                  </div>
                  {prendaError && (
                    <p className="text-red-600 text-[10px] font-bold bg-red-50 p-2 rounded-lg border border-red-100">
                      {prendaError}
                    </p>
                  )}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={(e) => handleCrearPrenda(e)}
                      disabled={creandoPrenda || !nuevaPrendaSku.trim() || !nuevaPrendaNombre.trim()}
                      className="px-4 py-2 bg-accent text-white rounded-lg text-xs font-bold hover:bg-accent-dark disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      {creandoPrenda ? 'Registrando...' : 'Registrar Prenda'}
                    </button>
                  </div>
                </div>
              )}

              {error && <p className="text-red-600 text-xs font-bold bg-red-50 p-2.5 rounded-xl border border-red-100">{error}</p>}
              {exito && <p className="text-green-700 text-xs font-bold bg-green-50 p-2.5 rounded-xl border border-green-100">{exito}</p>}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={creando || !codigoLote.trim() || !idProducto}
                  className="px-5 py-2.5 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary-hover cursor-pointer disabled:opacity-50 transition-all shadow-sm"
                >
                  {creando ? 'Registrando...' : 'Confirmar Lote'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Listado de Lotes */}
      <div className="space-y-3 pt-4 border-t border-border-light text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-semibold text-primary">
          <h3 className="font-extrabold text-primary text-sm">Lotes de Producción Registrados</h3>

          {/* Filtro de Fecha */}
          <div className="flex items-center gap-1 bg-[#f2faf7] p-1 rounded-xl border border-border-light shadow-xs max-w-fit">
            {['TODO', 'HOY', 'SEMANA', 'MES'].map((f) => (
              <button
                key={f}
                onClick={() => setFechaFiltro(f as 'TODO' | 'HOY' | 'SEMANA' | 'MES')}
                type="button"
                className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                  fechaFiltro === f ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-primary'
                }`}
              >
                {f === 'TODO' ? 'Todo' : f === 'HOY' ? 'Hoy' : f === 'SEMANA' ? '7 días' : '30 días'}
              </button>
            ))}
          </div>
        </div>

        {loading && lotes.length === 0 ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="bg-white border border-border-primary rounded-2xl p-5 space-y-4 animate-pulse-slow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex gap-2">
                      <div className="h-4 w-20 bg-gray-200 rounded skeleton"></div>
                      <div className="h-4 w-24 bg-gray-200 rounded skeleton"></div>
                    </div>
                    <div className="h-5 w-1/3 bg-gray-200 rounded skeleton"></div>
                    <div className="h-3 w-1/2 bg-gray-200 rounded skeleton"></div>
                  </div>
                  <div className="h-10 w-28 bg-gray-200 rounded-xl skeleton"></div>
                </div>
              </div>
            ))}
          </div>
        ) : lotesFiltrados.length === 0 ? (
          <div className="text-center py-10 text-secondary border-2 border-dashed border-border-primary rounded-2xl text-sm font-semibold">
            No se encontraron lotes de producción para este periodo.
          </div>
        ) : (
          <div className="space-y-4">
            {lotesFiltrados.map((lote) => {
              const isExpanded = loteExpandido === lote.idLote
              const procesos = procesosLote[lote.idLote] || []
              const cargandoProc = cargandoProcesos[lote.idLote] || false

              return (
                <div
                  key={lote.idLote}
                  className="bg-white border border-border-primary rounded-2xl p-5 hover-card-trigger transition-all duration-300 space-y-4 shadow-sm"
                >
                  {/* Header de la Tarjeta */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-block text-[10px] font-extrabold bg-accent-light text-accent-dark px-2.5 py-0.5 rounded-full border border-[#cce2db] font-mono">
                          {lote.codigoLote}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">Registrado: {lote.fechaConfeccion}</span>
                      </div>
                      <h4 className="text-base font-extrabold text-primary">{lote.nombrePrenda}</h4>
                      <p className="text-xs text-secondary font-medium">
                        SKU: <span className="font-mono text-primary">{lote.sku}</span> | Cant. Inicial: <span className="font-extrabold text-primary">{lote.cantidad} uds.</span>
                      </p>
                    </div>

                    {/* Stock & Acción Principal */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-50">
                      <div className="text-left sm:text-right">
                        <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Inventario Actual</div>
                        <div className="text-lg font-black text-primary">
                          {lote.stock} / {lote.cantidad} <span className="text-xs font-bold text-secondary">uds.</span>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleLote(lote.idLote)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                          isExpanded
                            ? 'bg-primary text-white shadow-primary/20'
                            : 'bg-primary-light text-primary border border-border-light hover:bg-[#e2ebe8]'
                        }`}
                      >
                        {isExpanded ? '✕ Ocultar Bitácora' : '⚙️ Ver Bitácora'}
                      </button>
                    </div>
                  </div>

                  {/* Panel Expandido: Bitácora de Confección */}
                  {isExpanded && (
                    <div className="border-t border-border-light pt-5 mt-2 grid grid-cols-1 lg:grid-cols-3 gap-6 animate-scaleIn">
                      {/* Formulario para registrar proceso (para admin y operarios) */}
                      {(userRole === 'admin' || userRole === 'operador') && (
                        <div className="bg-[#fafdfe] border border-border-primary rounded-xl p-4 space-y-3 h-fit shadow-inner">
                          <h5 className="text-[10px] font-extrabold text-primary uppercase tracking-wider">Añadir Operación</h5>
                          <form onSubmit={(e) => handleAddProceso(lote.idLote, e)} className="space-y-3 text-left">
                            <label className="flex flex-col gap-1 text-xs">
                              <span className="font-bold text-secondary">Operación / Proceso</span>
                              <select
                                value={operacionSeleccionada}
                                onChange={(e) => setOperacionSeleccionada(e.target.value)}
                                className="border border-border-primary rounded-lg px-2.5 py-2 bg-white text-primary text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                              >
                                {operacionesDisponibles.map((op) => (
                                  <option key={op} value={op}>{op}</option>
                                ))}
                              </select>
                            </label>

                            <label className="flex flex-col gap-1 text-xs">
                              <span className="font-bold text-secondary">Operario a cargo</span>
                              <select
                                required
                                value={idOperador}
                                onChange={(e) => setIdOperador(e.target.value !== '' ? Number(e.target.value) : '')}
                                className="border border-border-primary rounded-lg px-2.5 py-2 bg-white text-primary text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                              >
                                <option value="">Seleccione Operario</option>
                                {usuarios.map((u) => (
                                  <option key={u.idUsuario} value={u.idUsuario}>
                                    {u.nombres} (@{u.username})
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="flex flex-col gap-1 text-xs">
                              <span className="font-bold text-secondary">Máquina utilizada <span className="font-normal text-gray-400">(opcional)</span></span>
                              <select
                                value={maquinaProceso}
                                onChange={(e) => setMaquinaProceso(e.target.value !== '' ? Number(e.target.value) : '')}
                                className="border border-border-primary rounded-lg px-2.5 py-2 bg-white text-primary text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                              >
                                <option value="">Ninguna (Manual)</option>
                                {maquinas.map((m) => (
                                  <option key={m.idMaquina} value={m.idMaquina}>
                                    {m.nombreMaquina} ({m.codigoMaquina})
                                  </option>
                                ))}
                              </select>
                            </label>

                            {procesoError[lote.idLote] && (
                              <p className="text-red-600 text-[10px] font-bold bg-red-50 p-2 rounded-lg border border-red-100 mt-2">
                                {procesoError[lote.idLote]}
                              </p>
                            )}

                            <button
                              type="submit"
                              disabled={registrandoProceso || !idOperador}
                              className="w-full py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-hover transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                            >
                              {registrandoProceso ? 'Registrando...' : 'Registrar Operación'}
                            </button>
                          </form>
                        </div>
                      )}

                      {/* Timeline Log */}
                      <div className="lg:col-span-2 space-y-3 text-left">
                        <h5 className="text-[10px] font-extrabold text-primary uppercase tracking-wider mb-2">Historial de Confección</h5>
                        
                        {cargandoProc ? (
                          <p className="text-xs text-secondary italic animate-pulse">Cargando historial...</p>
                        ) : procesos.length === 0 ? (
                          <div className="text-center py-8 text-gray-400 border border-dashed border-border-primary rounded-xl text-xs font-medium bg-[#fafdfe]">
                            No se han registrado operaciones en el taller para este lote.
                          </div>
                        ) : (
                          <div className="relative pl-4 border-l-2 border-border-light space-y-4">
                            {procesos.map((p) => (
                              <div key={p.idProceso} className="relative animate-fadeIn">
                                {/* Dot */}
                                <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-accent border border-white shadow-xs"></div>
                                
                                <div className="bg-white border border-border-light rounded-xl p-3 shadow-xs hover:border-accent/30 transition-colors">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-extrabold text-primary">{p.operacion}</span>
                                    <span className="text-[9px] text-gray-400 font-mono font-medium bg-gray-50 px-1.5 py-0.5 rounded">{p.fechaRegistro}</span>
                                  </div>
                                  <p className="text-[11px] text-secondary mt-1">
                                    👤 Operario: <strong className="text-primary font-bold">{p.nombreOperador}</strong>
                                    {p.nombreMaquina && (
                                      <>
                                        {' '}| ⚙️ Máquina: <strong className="text-primary font-bold">{p.nombreMaquina} ({p.codigoMaquina})</strong>
                                      </>
                                    )}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Legacy Actions for Admin */}
                        {userRole === 'admin' && (
                          <div className="flex gap-2 pt-4 border-t border-border-light mt-4">
                            <button
                              onClick={() => handlePrintQr(lote.tokenQr, lote.codigoLote, lote.nombrePrenda, lote.cantidad, lote.stock)}
                              className="px-3 py-1.5 rounded-lg bg-primary-light text-primary text-xs font-bold hover:bg-[#d0ded9] transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              🖨️ Imprimir QR de Lote
                            </button>
                            <button
                              onClick={() => handleCopyLink(lote.tokenQr, lote.codigoLote)}
                              className="px-3 py-1.5 rounded-lg bg-gray-50 text-secondary border border-border-light text-xs font-bold hover:bg-gray-100 transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              {copiadoLote === lote.codigoLote ? '✅ Copiado' : '🔗 Copiar Enlace QR'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
