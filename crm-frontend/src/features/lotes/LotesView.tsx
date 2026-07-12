import { useState, useEffect } from 'react'
import type { Lote, Producto, Maquina, Usuario, LoteProceso, LoteInsumoConsumido } from '../../types'
import { API_BASE } from '../../config'

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

  // Insumos por Lote States
  const [insumosLote, setInsumosLote] = useState<Record<number, LoteInsumoConsumido[]>>({})
  const [nombreInsumo, setNombreInsumo] = useState('')
  const [cantidadInsumo, setCantidadInsumo] = useState<number | ''>('')
  const [unidadInsumo, setUnidadInsumo] = useState('Metros')
  const [costoInsumo, setCostoInsumo] = useState<number | ''>('')
  const [agregandoInsumo, setAgregandoInsumo] = useState(false)

  // Log Process Form States
  const [idOperador, setIdOperador] = useState<number | ''>('')
  const [maquinaProceso, setMaquinaProceso] = useState<number | ''>('')
  const [operacionSeleccionada, setOperacionSeleccionada] = useState('Costura')
  const [registrandoProceso, setRegistrandoProceso] = useState(false)

  const [fechaFiltro, setFechaFiltro] = useState<'TODO' | 'HOY' | 'SEMANA' | 'MES'>('TODO')

  // Auto-expandir si hay exactamente un lote en la lista (para uso en modal)
  useEffect(() => {
    if (lotes.length === 1 && loteExpandido !== lotes[0].idLote) {
      const targetLote = lotes[0]
      setLoteExpandido(targetLote.idLote)
      Promise.all([
        refreshProcesos(targetLote.idLote),
        refreshInsumos(targetLote.idLote)
      ])
    }
  }, [lotes])

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
    await Promise.all([
      refreshProcesos(idLote),
      refreshInsumos(idLote)
    ])
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

  async function refreshInsumos(idLote: number) {
    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/lotes/${idLote}/insumos`)
      if (res.ok) {
        const data = (await res.json()) as LoteInsumoConsumido[]
        setInsumosLote((prev) => ({ ...prev, [idLote]: data }))
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function handleAddInsumo(idLote: number, e: React.FormEvent) {
    e.preventDefault()
    if (!nombreInsumo || !cantidadInsumo || !unidadInsumo || !costoInsumo) return

    setAgregandoInsumo(true)
    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/lotes/${idLote}/insumos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombreMaterial: nombreInsumo.trim(),
          cantidad: Number(cantidadInsumo),
          unidadMedida: unidadInsumo.trim(),
          costoTotal: Number(costoInsumo)
        })
      })
      if (res.ok) {
        setNombreInsumo('')
        setCantidadInsumo('')
        setCostoInsumo('')
        await refreshInsumos(idLote)
        await fetchLotes() // Recargar costos en la lista general
      }
    } catch (e) {
      console.error(e)
    } finally {
      setAgregandoInsumo(false)
    }
  }

  async function handleDeleteInsumo(idLote: number, idInsumoConsumido: number) {
    if (!window.confirm('¿Seguro que deseas eliminar este insumo?')) return
    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/lotes/insumos/${idInsumoConsumido}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        await refreshInsumos(idLote)
        await fetchLotes()
      }
    } catch (e) {
      console.error(e)
    }
  }
  async function handleUpdateCostoProceso(idProceso: number, costo: number, idLote: number) {
    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/lotes/procesos/${idProceso}/costo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ costo })
      })
      if (res.ok) {
        await refreshProcesos(idLote)
        await fetchLotes() // Recargar costos en la lista general
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function handleDeleteProceso(idProceso: number, idLote: number) {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta operación del historial de confección?')) return
    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/lotes/procesos/${idProceso}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        await refreshProcesos(idLote)
        await fetchLotes() // Recargar costos en la lista general
      } else {
        const errorText = await res.text()
        alert('Error al eliminar la operación: ' + errorText)
      }
    } catch (e) {
      console.error(e)
      alert('Error de conexión al eliminar la operación.')
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
      await fetchLotes()
    } catch {
      setProcesoError((prev) => ({ ...prev, [idLote]: 'Error de conexión con el servidor.' }))
    } finally {
      setRegistrandoProceso(false)
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-left">
        <h2 className="text-lg font-extrabold text-primary">
          {userRole === 'operador' ? 'Trazabilidad y Bitácora de Confección' : 'Control de Operaciones y Lotes'}
        </h2>
        <p className="text-xs text-secondary mt-1">
          {userRole === 'operador'
            ? 'Registra las operaciones realizadas (Corte, Costura, Remalle) e indica qué operario y qué máquina participaron.'
            : 'Registra los lotes confeccionados en el taller y realiza el seguimiento de las operaciones, stock y bitácoras.'}
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
                                {usuarios.filter(u => u.activo).map((u) => (
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
                                {maquinas.filter(m => m.activo).map((m) => (
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
                      <div className={`${userRole === 'admin' ? 'lg:col-span-1' : 'lg:col-span-2'} space-y-3 text-left`}>
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
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-extrabold text-primary">{p.operacion}</span>
                                      {userRole === 'admin' && (
                                        <button
                                          onClick={() => handleDeleteProceso(p.idProceso, lote.idLote)}
                                          className="text-red-500 hover:text-red-700 font-extrabold text-[10px] cursor-pointer hover:bg-red-50 p-1 rounded-md transition-colors"
                                          title="Eliminar esta operación"
                                        >
                                          🗑️
                                        </button>
                                      )}
                                    </div>
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
                                  {userRole === 'admin' ? (
                                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                                      <span className="text-[10px] font-extrabold text-[#2d5a50] uppercase">Costo Mano de Obra:</span>
                                      <div className="flex items-center gap-1">
                                        <span className="text-[10px] font-bold text-gray-400">S/</span>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          placeholder="0.00"
                                          defaultValue={p.costo}
                                          onBlur={async (e) => {
                                            const val = e.target.value !== '' ? Number(e.target.value) : 0
                                            if (val !== p.costo) {
                                              await handleUpdateCostoProceso(p.idProceso, val, lote.idLote)
                                            }
                                          }}
                                          className="w-16 px-1.5 py-0.5 border border-[#dce7e4] bg-white rounded text-[10px] font-bold text-primary focus:outline-none focus:border-accent"
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    p.costo > 0 && (
                                      <div className="mt-2 pt-1 border-t border-gray-50 text-[10px] font-semibold text-secondary">
                                        💰 Costo: <strong className="text-[#2d5a50]">S/ {p.costo.toFixed(2)}</strong>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                      </div>

                      {/* Columna de Costos (Solo Admin) */}
                      {userRole === 'admin' && (
                        <div className="bg-white border border-border-primary rounded-xl p-4 space-y-4 text-left shadow-xs">
                          <div>
                            <h5 className="text-[10px] font-extrabold text-primary uppercase tracking-wider">Trazabilidad de Costos</h5>
                            <p className="text-[10px] text-secondary">Control del lote: {lote.codigoLote}</p>
                          </div>

                          {/* KPIs de Costo */}
                          <div className="grid grid-cols-2 gap-2 bg-[#fcfdfe] p-2.5 rounded-xl border border-border-light text-xs font-semibold">
                            <div>
                              <span className="text-[9px] font-extrabold text-gray-400 block uppercase">Materiales</span>
                              <span className="text-sm font-black text-[#1e3e37]">S/ {(lote.costoMateriales || 0).toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-[9px] font-extrabold text-gray-400 block uppercase">Mano de Obra</span>
                              <span className="text-sm font-black text-[#1e3e37]">S/ {(lote.costoManoObra || 0).toFixed(2)}</span>
                            </div>
                            <div className="border-t border-gray-100 pt-1.5 mt-1.5 col-span-2 flex justify-between items-center text-[10px]">
                              <div>
                                <span className="text-[9px] font-extrabold text-gray-400 block uppercase">Costo Total</span>
                                <span className="text-sm font-black text-primary">S/ {(lote.costoTotal || 0).toFixed(2)}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] font-extrabold text-gray-400 block uppercase">Costo Unit.</span>
                                <span className="text-xs font-black text-accent-dark bg-[#e6f4f0] px-1.5 py-0.5 rounded-md border border-[#c3e6dc]">S/ {(lote.costoUnitario || 0).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Formulario Añadir Insumo */}
                          <form onSubmit={(e) => handleAddInsumo(lote.idLote, e)} className="space-y-2 border-t border-dashed border-border-light pt-3">
                            <h6 className="text-[9px] font-extrabold text-secondary uppercase tracking-wider">Añadir Insumo Real</h6>
                            <div className="space-y-2">
                              <input
                                type="text"
                                required
                                placeholder="Nombre de insumo (ej: Tela)"
                                value={nombreInsumo}
                                onChange={(e) => setNombreInsumo(e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-border-primary rounded-lg text-xs bg-white text-primary focus:outline-none"
                              />
                              <div className="grid grid-cols-3 gap-1.5">
                                <input
                                  type="number"
                                  required
                                  min="0.01"
                                  step="0.01"
                                  placeholder="Cant."
                                  value={cantidadInsumo}
                                  onChange={(e) => setCantidadInsumo(e.target.value !== '' ? Number(e.target.value) : '')}
                                  className="w-full px-2 py-1.5 border border-border-primary rounded-lg text-xs bg-white text-primary focus:outline-none"
                                />
                                <input
                                  type="text"
                                  required
                                  placeholder="Unidad (KG)"
                                  value={unidadInsumo}
                                  onChange={(e) => setUnidadInsumo(e.target.value)}
                                  className="w-full px-2 py-1.5 border border-border-primary rounded-lg text-xs bg-white text-primary focus:outline-none"
                                />
                                <input
                                  type="number"
                                  required
                                  min="0.01"
                                  step="0.01"
                                  placeholder="Costo"
                                  value={costoInsumo}
                                  onChange={(e) => setCostoInsumo(e.target.value !== '' ? Number(e.target.value) : '')}
                                  className="w-full px-2 py-1.5 border border-border-primary rounded-lg text-xs bg-white text-primary focus:outline-none"
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={agregandoInsumo}
                                className="w-full py-1.5 bg-accent hover:bg-accent-dark text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-xs"
                              >
                                {agregandoInsumo ? 'Añadiendo...' : '+ Registrar Gasto de Material'}
                              </button>
                            </div>
                          </form>

                          {/* Listado de Insumos Registrados */}
                          <div className="space-y-1.5 border-t border-border-light pt-3 max-h-[160px] overflow-y-auto pr-1 no-scrollbar">
                            <h6 className="text-[9px] font-extrabold text-secondary uppercase tracking-wider">Insumos Registrados</h6>
                            {(insumosLote[lote.idLote] || []).length === 0 ? (
                              <p className="text-[10px] text-gray-400 italic">No hay insumos registrados para este lote.</p>
                            ) : (
                              (insumosLote[lote.idLote] || []).map((ins) => (
                                <div key={ins.idInsumoConsumido} className="flex justify-between items-center bg-gray-50 border border-gray-100 rounded-lg p-2 text-[10px]">
                                  <div className="truncate pr-2">
                                    <strong className="text-primary font-bold">{ins.nombreMaterial}</strong>
                                    <span className="text-secondary ml-1">({ins.cantidad} {ins.unidadMedida})</span>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="font-extrabold text-[#2a4e44]">S/ {(ins.costoTotal || 0).toFixed(2)}</span>
                                    <button
                                      type="button"
                                      onClick={() => ins.idInsumoConsumido && handleDeleteInsumo(lote.idLote, ins.idInsumoConsumido)}
                                      className="text-red-500 hover:text-red-700 font-bold text-xs cursor-pointer"
                                      title="Eliminar insumo"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
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
