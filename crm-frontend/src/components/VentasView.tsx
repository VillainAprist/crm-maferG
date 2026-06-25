import { useState, useMemo } from 'react'
import type { Lote, Venta, Cliente, ResumenVentas } from '../types'
import { API_BASE } from '../config'

interface VentasViewProps {
  ventas: Venta[]
  lotes: Lote[]
  clientes: Cliente[]
  loading: boolean
  fetchVentas: () => Promise<void>
  fetchLotes: () => Promise<void>
  fetchClientes: () => Promise<void>
}

function formatSoles(n?: number | null) {
  if (n === undefined || n === null || isNaN(n)) return 'S/ 0.00'
  return 'S/ ' + n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function VentasView({
  ventas,
  lotes,
  clientes,
  loading,
  fetchVentas,
  fetchLotes,
  fetchClientes
}: VentasViewProps) {
  const [vistaActiva, setVistaActiva] = useState<'pos' | 'analisis'>('pos')

  // POS Form States
  const [idLote, setIdLote] = useState<number | ''>('')
  const [unidadVenta, setUnidadVenta] = useState<'UNIDAD' | 'DOCENA'>('DOCENA')
  const [cantidadInput, setCantidadInput] = useState<number | ''>(1)
  const [precioUnitario, setPrecioUnitario] = useState<number | ''>('')
  const [codigoCupon, setCodigoCupon] = useState('')
  const [cuponEstado, setCuponEstado] = useState<'idle' | 'valido' | 'invalido'>('idle')
  const [cuponMsg, setCuponMsg] = useState('')

  // Cliente selection States
  const [modoCliente, setModoCliente] = useState<'existente' | 'nuevo'>('existente')
  const [idCliente, setIdCliente] = useState<number | ''>('')

  // Nuevo Cliente States
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTipo, setClienteTipo] = useState<'B2C' | 'B2B'>('B2B')
  const [clienteEmail, setClienteEmail] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')
  const [clienteCiudad, setClienteCiudad] = useState('')

  // Control States
  const [registrando, setRegistrando] = useState(false)
  const [error, setError] = useState('')
  const [ultimaVenta, setUltimaVenta] = useState<Venta | null>(null)
  const [filtroVenta, setFiltroVenta] = useState('')

  // Analisis States
  const [resumenVentas, setResumenVentas] = useState<ResumenVentas | null>(null)
  const [loadingAnalisis, setLoadingAnalisis] = useState(false)

  // Derived calculations
  const loteSeleccionado = lotes.find((l) => l.idLote === Number(idLote))
  const stockMax = loteSeleccionado ? loteSeleccionado.stock : 0
  const stockDocenas = Math.floor(stockMax / 12)

  const cantidadUnidades = unidadVenta === 'DOCENA'
    ? (cantidadInput !== '' ? Number(cantidadInput) * 12 : 0)
    : (cantidadInput !== '' ? Number(cantidadInput) : 0)

  const descuentoPct = cuponEstado === 'valido' ? 15 : 0
  const subtotal = precioUnitario !== '' ? Number(precioUnitario) * (unidadVenta === 'DOCENA' ? Number(cantidadInput) || 0 : cantidadUnidades) : 0
  const descuentoMonto = subtotal * descuentoPct / 100
  const totalFinal = subtotal - descuentoMonto

  const mostrarResumen = !!idLote && cantidadInput !== '' && Number(cantidadInput) > 0 && precioUnitario !== '' && Number(precioUnitario) > 0

  async function verificarCupon() {
    if (!codigoCupon.trim()) return
    // Busca el cupón en la lista de cupones ya cargada o consulta al backend
    setCuponEstado('idle')
    setCuponMsg('')
    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/cupones`)
      if (res.ok) {
        const data = await res.json() as { codigo: string; estado: string; vence: string }[]
        const found = data.find(c => c.codigo.toUpperCase() === codigoCupon.trim().toUpperCase())
        if (!found) {
          setCuponEstado('invalido')
          setCuponMsg('El código de cupón no existe.')
        } else if (found.estado !== 'DISPONIBLE') {
          setCuponEstado('invalido')
          setCuponMsg(`Cupón ${found.estado.toLowerCase()}. No se puede aplicar.`)
        } else {
          setCuponEstado('valido')
          setCuponMsg('Cupón válido — 15% de descuento aplicado.')
        }
      }
    } catch {
      setCuponEstado('invalido')
      setCuponMsg('No se pudo verificar el cupón.')
    }
  }

  async function handleRegistrarVenta(e: React.FormEvent) {
    e.preventDefault()
    if (!idLote || !cantidadInput || precioUnitario === '') return

    if (cantidadUnidades > stockMax) {
      setError(`Stock insuficiente. Solo quedan ${stockMax} uds (${stockDocenas} docenas) en este lote.`)
      return
    }
    if (cantidadUnidades <= 0) {
      setError('La cantidad debe ser mayor a 0.')
      return
    }

    if (modoCliente === 'nuevo') {
      if (!clienteNombre.trim()) {
        setError('Debe ingresar el nombre del cliente.')
        return
      }
      if (!clienteEmail.trim() && !clienteTelefono.trim()) {
        setError('Debe ingresar al menos un correo o teléfono para el cliente.')
        return
      }
    } else {
      if (!idCliente) {
        setError('Debe seleccionar un cliente existente.')
        return
      }
    }

    setError('')
    setRegistrando(true)
    setUltimaVenta(null)

    const payload = {
      idLote: Number(idLote),
      idCliente: modoCliente === 'existente' ? Number(idCliente) : null,
      clienteNombre: modoCliente === 'nuevo' ? clienteNombre.trim() : null,
      clienteTipo: modoCliente === 'nuevo' ? clienteTipo : null,
      clienteEmail: modoCliente === 'nuevo' ? clienteEmail.trim() : null,
      clienteTelefono: modoCliente === 'nuevo' ? clienteTelefono.trim() : null,
      clienteCiudad: modoCliente === 'nuevo' ? clienteCiudad.trim() : null,
      cantidadVendida: cantidadUnidades,
      precioUnitario: Number(precioUnitario),
      unidadVenta,
      codigoCupon: cuponEstado === 'valido' ? codigoCupon.trim() : null
    }

    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/ventas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al registrar la venta.')
        return
      }
      setUltimaVenta(data as Venta)
      setIdLote('')
      setCantidadInput(1)
      setPrecioUnitario('')
      setIdCliente('')
      setClienteNombre('')
      setClienteEmail('')
      setClienteTelefono('')
      setClienteCiudad('')
      setCodigoCupon('')
      setCuponEstado('idle')
      setCuponMsg('')
      await fetchVentas()
      await fetchLotes()
      await fetchClientes()
    } catch {
      setError('Error de conexión al registrar la venta.')
    } finally {
      setRegistrando(false)
    }
  }

  function handlePrintTicket(venta: Venta) {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    const docenas = venta.unidadVenta === 'DOCENA' ? Math.floor(venta.cantidadVendida / 12) : null
    const cantLabel = docenas ? `${docenas} docena${docenas !== 1 ? 's' : ''} (${venta.cantidadVendida} uds.)` : `${venta.cantidadVendida} uds.`
    const precioLabel = venta.unidadVenta === 'DOCENA' ? '/docena' : '/unidad'
    const subtotalTicket = venta.precioUnitario * (docenas ?? venta.cantidadVendida)
    const descuentoTicket = subtotalTicket * venta.descuentoPorcentaje / 100

    printWindow.document.write(`
      <html>
        <head>
          <title>MAFER-G — Venta #${venta.idVenta}</title>
          <style>
            body { font-family: 'Segoe UI', sans-serif; text-align: center; padding: 30px; margin: 0; background: #fff; }
            .ticket-card { border: 2px dashed #1e4a40; padding: 24px; display: inline-block; border-radius: 12px; background: #fafcfb; max-width: 320px; text-align: left; }
            h1 { font-size: 18px; margin: 0 0 4px; color: #1e4a40; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; }
            .sub { font-size: 11px; color: #53796f; margin: 0 0 12px; text-align: center; }
            .divider { border-top: 1px dashed #cce2db; margin: 12px 0; }
            p { font-size: 13px; margin: 5px 0; color: #2d5a50; }
            .precio-row { display: flex; justify-content: space-between; font-size: 13px; color: #2d5a50; margin: 4px 0; }
            .total-row { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; color: #1e4a40; margin-top: 8px; }
            .descuento { color: #d97706; }
            img { width: 160px; height: 160px; margin: 12px auto; display: block; border: 1px solid #e2ece9; border-radius: 8px; padding: 4px; background: white; }
            .instruction { font-size: 10px; color: #53796f; font-weight: bold; line-height: 1.4; text-align: center; }
            .footer-info { font-size: 10px; color: #8faea6; margin-top: 10px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="ticket-card">
            <h1>MAFER-G</h1>
            <div class="sub">Comprobante de Venta #${venta.idVenta}</div>
            <div class="divider"></div>
            <p><strong>Cliente:</strong> ${venta.nombreCliente}</p>
            <p><strong>Prenda:</strong> ${venta.nombrePrenda}</p>
            <p><strong>Lote:</strong> ${venta.codigoLote}</p>
            <div class="divider"></div>
            <div class="precio-row"><span>Cantidad:</span><span>${cantLabel}</span></div>
            <div class="precio-row"><span>Precio${precioLabel}:</span><span>${formatSoles(venta.precioUnitario)}</span></div>
            <div class="precio-row"><span>Subtotal:</span><span>${formatSoles(subtotalTicket)}</span></div>
            ${venta.descuentoPorcentaje > 0 ? `<div class="precio-row descuento"><span>Descuento (${venta.descuentoPorcentaje}%):</span><span>- ${formatSoles(descuentoTicket)}</span></div>` : ''}
            <div class="divider"></div>
            <div class="total-row"><span>TOTAL:</span><span>${formatSoles(venta.montoTotal)}</span></div>
            <div class="divider"></div>
            <img src="${API_BASE}/api/nps/admin/etiqueta/${venta.tokenQr}/qr" alt="QR Encuesta" />
            <p class="instruction">Escanea el QR y comparte tu opinión sobre el producto. ¡Tu voz mejora la calidad MAFER-G!</p>
            <div class="footer-info">Fecha: ${venta.fechaVenta}</div>
          </div>
          <script>window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  async function fetchAnalisis() {
    setLoadingAnalisis(true)
    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/ventas/resumen`)
      if (res.ok) setResumenVentas(await res.json() as ResumenVentas)
    } catch { /* sin analisis */ } finally {
      setLoadingAnalisis(false)
    }
  }

  const ventasFiltradas = useMemo(() => ventas.filter((v) =>
    v.nombreCliente.toLowerCase().includes(filtroVenta.toLowerCase()) ||
    v.codigoLote.toLowerCase().includes(filtroVenta.toLowerCase()) ||
    v.nombrePrenda.toLowerCase().includes(filtroVenta.toLowerCase())
  ), [ventas, filtroVenta])

  const totalHistorial = useMemo(() =>
    ventas.reduce((acc, v) => acc + (v.montoTotal ?? 0), 0), [ventas])

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header con toggle POS / Análisis */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
        <div>
          <h2 className="text-lg font-extrabold text-primary">Ventas & Punto de Venta</h2>
          <p className="text-xs text-secondary mt-0.5">Registra ventas por unidades o docenas. El sistema genera QR de encuesta automáticamente.</p>
        </div>
        <div className="flex items-center gap-1 bg-primary-light p-1 rounded-xl border border-border-primary shadow-sm self-start">
          <button
            type="button"
            onClick={() => setVistaActiva('pos')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${vistaActiva === 'pos' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-primary'}`}
          >
            🧾 POS
          </button>
          <button
            type="button"
            onClick={() => { setVistaActiva('analisis'); if (!resumenVentas) fetchAnalisis() }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${vistaActiva === 'analisis' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-primary'}`}
          >
            📊 Análisis
          </button>
        </div>
      </div>

      {/* Modal de venta registrada */}
      {ultimaVenta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-[28px] border border-border-primary shadow-2xl p-6 w-full max-w-sm animate-scaleIn text-center space-y-4">
            <span className="inline-block text-[10px] font-extrabold bg-accent-light text-accent-dark px-3 py-1 rounded-full border border-[#cce2db] uppercase tracking-wider">
              ✔️ Venta Registrada
            </span>
            <div className="space-y-1">
              <h4 className="font-extrabold text-lg text-primary">{ultimaVenta.nombreCliente}</h4>
              <p className="text-xs text-secondary font-medium">{ultimaVenta.nombrePrenda} — {ultimaVenta.codigoLote}</p>
            </div>

            {/* Resumen de precios en modal */}
            <div className="bg-primary-light border border-border-primary rounded-2xl p-3.5 text-left space-y-1.5 text-xs">
              <div className="flex justify-between text-secondary">
                <span>
                  {ultimaVenta.unidadVenta === 'DOCENA'
                    ? `${Math.floor(ultimaVenta.cantidadVendida / 12)} doc (${ultimaVenta.cantidadVendida} uds.)`
                    : `${ultimaVenta.cantidadVendida} uds.`}
                  {' '}× {formatSoles(ultimaVenta.precioUnitario)}
                  {ultimaVenta.unidadVenta === 'DOCENA' ? '/doc' : '/ud'}
                </span>
                <span className="font-bold">{formatSoles(ultimaVenta.precioUnitario * (ultimaVenta.unidadVenta === 'DOCENA' ? Math.floor(ultimaVenta.cantidadVendida / 12) : ultimaVenta.cantidadVendida))}</span>
              </div>
              {ultimaVenta.descuentoPorcentaje > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Descuento cupón (-{ultimaVenta.descuentoPorcentaje}%)</span>
                  <span className="font-bold">- {formatSoles(ultimaVenta.precioUnitario * (ultimaVenta.unidadVenta === 'DOCENA' ? Math.floor(ultimaVenta.cantidadVendida / 12) : ultimaVenta.cantidadVendida) * ultimaVenta.descuentoPorcentaje / 100)}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-primary border-t border-border-primary pt-1.5 mt-1">
                <span>TOTAL COBRADO</span>
                <span className="text-sm">{formatSoles(ultimaVenta.montoTotal)}</span>
              </div>
            </div>

            <div className="w-40 h-40 bg-[#fafdfe] border border-border-primary rounded-2xl flex items-center justify-center p-3 mx-auto shadow-inner">
              <img
                src={`${API_BASE}/api/nps/admin/etiqueta/${ultimaVenta.tokenQr}/qr`}
                alt="QR Encuesta"
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-[10px] text-secondary leading-relaxed px-2">
              Entrega este QR al cliente para que califique el lote y obtenga su próximo cupón de fidelidad.
            </p>
            <div className="space-y-2 pt-1">
              <button
                onClick={() => handlePrintTicket(ultimaVenta)}
                className="w-full py-3 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-primary/10"
              >
                🖨️ Imprimir Ticket con Desglose
              </button>
              <button
                onClick={() => setUltimaVenta(null)}
                className="w-full py-2.5 rounded-full border border-border-primary text-secondary text-xs font-bold hover:bg-gray-50 transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── VISTA POS ─── */}
      {vistaActiva === 'pos' && (
        <div className="space-y-6">
          <form onSubmit={handleRegistrarVenta} className="bg-primary-light border border-border-primary rounded-2xl p-5 space-y-5 text-left shadow-sm">
            <h3 className="font-bold text-primary text-sm">Punto de Venta — Mayorista</h3>

            {/* Lote + Unidad + Cantidad + Precio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5 md:col-span-2">
                <span className="text-xs font-bold text-secondary">Lote del Producto</span>
                <select
                  required
                  value={idLote}
                  onChange={(e) => { setIdLote(e.target.value !== '' ? Number(e.target.value) : ''); setCantidadInput(1) }}
                  className="border border-border-primary rounded-xl px-3 py-2.5 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="">Selecciona Lote (Prenda - SKU)</option>
                  {lotes.map((l) => (
                    <option key={l.idLote} value={l.idLote} disabled={l.stock <= 0}>
                      {l.codigoLote} — {l.nombrePrenda} ({l.stock <= 0 ? 'Sin Stock' : `${l.stock} uds / ${Math.floor(l.stock / 12)} doc`})
                    </option>
                  ))}
                </select>
              </label>

              {/* Toggle Unidad/Docena */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-secondary">Unidad de Venta</span>
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-border-primary self-start">
                  <button
                    type="button"
                    onClick={() => { setUnidadVenta('DOCENA'); setCantidadInput(1) }}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${unidadVenta === 'DOCENA' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-primary'}`}
                  >
                    Docenas
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUnidadVenta('UNIDAD'); setCantidadInput(1) }}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${unidadVenta === 'UNIDAD' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-primary'}`}
                  >
                    Unidades
                  </button>
                </div>
                {loteSeleccionado && (
                  <span className="text-[10px] text-secondary font-semibold">
                    Stock: {stockMax} uds ({stockDocenas} docenas completas)
                  </span>
                )}
              </div>

              {/* Cantidad */}
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-secondary">
                  Cantidad ({unidadVenta === 'DOCENA' ? 'docenas' : 'unidades'})
                </span>
                <input
                  type="number"
                  required
                  min={1}
                  max={unidadVenta === 'DOCENA' ? stockDocenas || 1 : stockMax || 1}
                  value={cantidadInput}
                  onChange={(e) => setCantidadInput(e.target.value !== '' ? Number(e.target.value) : '')}
                  className="border border-border-primary rounded-xl px-3 py-2.5 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent"
                />
                {cantidadInput !== '' && Number(cantidadInput) > 0 && (
                  <span className="text-[10px] text-accent-dark font-bold">
                    = {cantidadUnidades} unidades totales
                  </span>
                )}
              </label>

              {/* Precio negociado */}
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-secondary">
                  Precio negociado ({unidadVenta === 'DOCENA' ? 'por docena' : 'por unidad'}) — S/.
                </span>
                <input
                  type="number"
                  required
                  min={0}
                  step="0.50"
                  placeholder={unidadVenta === 'DOCENA' ? 'Ej. 78.00' : 'Ej. 7.00'}
                  value={precioUnitario}
                  onChange={(e) => setPrecioUnitario(e.target.value !== '' ? Number(e.target.value) : '')}
                  className="border border-border-primary rounded-xl px-3 py-2.5 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </label>

              {/* Cupón */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <span className="text-xs font-bold text-secondary">Código de Cupón (opcional)</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ej. CUPON-MARIA-2026"
                    value={codigoCupon}
                    onChange={(e) => { setCodigoCupon(e.target.value.toUpperCase()); setCuponEstado('idle'); setCuponMsg('') }}
                    className="border border-border-primary rounded-xl px-3 py-2.5 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent flex-1 uppercase font-mono"
                  />
                  <button
                    type="button"
                    onClick={verificarCupon}
                    disabled={!codigoCupon.trim()}
                    className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover disabled:opacity-40 transition-all cursor-pointer shadow-sm whitespace-nowrap"
                  >
                    Verificar
                  </button>
                </div>
                {cuponMsg && (
                  <span className={`text-[10px] font-bold flex items-center gap-1 ${cuponEstado === 'valido' ? 'text-emerald-700' : 'text-red-600'}`}>
                    {cuponEstado === 'valido' ? '✅' : '❌'} {cuponMsg}
                  </span>
                )}
              </div>
            </div>

            {/* Panel de resumen en tiempo real */}
            {mostrarResumen && (
              <div className="bg-white border border-border-primary rounded-2xl p-4 space-y-2 animate-fadeIn shadow-sm">
                <p className="text-[10px] font-extrabold text-secondary uppercase tracking-wider mb-2">Resumen de la venta</p>
                <div className="flex justify-between text-xs text-secondary">
                  <span>
                    {unidadVenta === 'DOCENA'
                      ? `${cantidadInput} doc (${cantidadUnidades} uds.) × ${formatSoles(Number(precioUnitario))}/doc`
                      : `${cantidadInput} uds. × ${formatSoles(Number(precioUnitario))}/ud`}
                  </span>
                  <span className="font-bold text-primary">{formatSoles(subtotal)}</span>
                </div>
                {descuentoPct > 0 && (
                  <div className="flex justify-between text-xs text-amber-700">
                    <span>Descuento cupón (-{descuentoPct}%)</span>
                    <span className="font-bold">- {formatSoles(descuentoMonto)}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-sm text-primary border-t border-border-primary pt-2 mt-1">
                  <span>TOTAL A COBRAR</span>
                  <span className="text-accent-dark">{formatSoles(totalFinal)}</span>
                </div>
              </div>
            )}

            {/* Toggle Cliente */}
            <div className="border-t border-border-light pt-4">
              <div className="flex items-center justify-between mb-3.5">
                <span className="text-xs font-bold text-primary">Cliente</span>
                <div className="flex items-center gap-1 bg-white rounded-xl p-0.5 border border-border-primary">
                  <button type="button" onClick={() => { setModoCliente('existente'); setError('') }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${modoCliente === 'existente' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-primary'}`}>
                    Registrado
                  </button>
                  <button type="button" onClick={() => { setModoCliente('nuevo'); setError('') }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${modoCliente === 'nuevo' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-primary'}`}>
                    Nuevo
                  </button>
                </div>
              </div>

              {modoCliente === 'existente' ? (
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-secondary">Buscar Cliente Registrado</span>
                  <select
                    required={modoCliente === 'existente'}
                    value={idCliente}
                    onChange={(e) => setIdCliente(e.target.value !== '' ? Number(e.target.value) : '')}
                    className="border border-border-primary rounded-xl px-3 py-2.5 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="">Selecciona cliente...</option>
                    {clientes.map((c) => (
                      <option key={c.idCliente} value={c.idCliente}>
                        [{c.tipoCliente}] {c.nombreRazonSocial} {c.ciudad ? `— ${c.ciudad}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fadeIn">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-secondary">Nombres / Razón Social</span>
                    <input type="text" required={modoCliente === 'nuevo'} placeholder="Ej. Distribuidora El Sol S.A." value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)}
                      className="border border-border-primary rounded-xl px-3 py-2 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent" />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-secondary">Tipo Cliente</span>
                    <select value={clienteTipo} onChange={(e) => setClienteTipo(e.target.value as 'B2C' | 'B2B')}
                      className="border border-border-primary rounded-xl px-3 py-2 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent">
                      <option value="B2B">Mayorista (B2B)</option>
                      <option value="B2C">Minorista (B2C)</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-secondary">Correo Electrónico</span>
                    <input type="email" placeholder="contacto@ejemplo.com" value={clienteEmail} onChange={(e) => setClienteEmail(e.target.value)}
                      className="border border-border-primary rounded-xl px-3 py-2 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent" />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-secondary">Teléfono</span>
                    <input type="tel" placeholder="987654321" value={clienteTelefono} onChange={(e) => setClienteTelefono(e.target.value)}
                      className="border border-border-primary rounded-xl px-3 py-2 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent" />
                  </label>
                  <label className="flex flex-col gap-1.5 md:col-span-2">
                    <span className="text-xs font-bold text-secondary">Ciudad</span>
                    <input type="text" placeholder="Ej. Lima" value={clienteCiudad} onChange={(e) => setClienteCiudad(e.target.value)}
                      className="border border-border-primary rounded-xl px-3 py-2 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent" />
                  </label>
                </div>
              )}
            </div>

            {error && <p className="text-red-600 text-xs font-bold bg-red-50 p-2.5 rounded-xl border border-red-100">{error}</p>}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={registrando || !idLote || !cantidadInput || precioUnitario === ''}
                className="px-6 py-3 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary-hover cursor-pointer disabled:opacity-50 transition-all shadow-sm"
              >
                {registrando ? 'Procesando...' : 'Registrar Venta & Generar QR'}
              </button>
            </div>
          </form>

          {/* Historial */}
          <div className="space-y-3 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-primary text-sm">Historial de Ventas</h3>
                {ventas.length > 0 && (
                  <p className="text-[10px] text-secondary font-semibold mt-0.5">
                    {ventas.length} ventas · Total facturado: <span className="text-accent-dark font-extrabold">{formatSoles(totalHistorial)}</span>
                  </p>
                )}
              </div>
              <input
                type="text"
                placeholder="Buscar por cliente, prenda o lote..."
                value={filtroVenta}
                onChange={(e) => setFiltroVenta(e.target.value)}
                className="border border-border-primary rounded-xl px-3.5 py-2 text-xs text-primary bg-white w-full sm:w-64 focus:outline-2 focus:outline-accent/30 transition-all shadow-sm"
              />
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="h-12 bg-white border border-border-primary rounded-xl skeleton animate-pulse-slow"></div>
                ))}
              </div>
            ) : ventasFiltradas.length === 0 ? (
              <div className="text-center py-10 text-secondary border border-dashed border-border-primary rounded-2xl text-xs font-semibold">
                {ventas.length === 0 ? 'No se han registrado ventas.' : 'No se encontraron resultados.'}
              </div>
            ) : (
              <div className="overflow-x-auto border border-border-primary rounded-2xl bg-white shadow-sm no-scrollbar">
                <table className="w-full text-sm text-left text-gray-500">
                  <thead className="text-[10px] text-primary uppercase bg-primary-light border-b border-border-primary">
                    <tr>
                      <th className="px-4 py-3.5 font-bold">Fecha</th>
                      <th className="px-4 py-3.5 font-bold">Cliente</th>
                      <th className="px-4 py-3.5 font-bold">Lote / Prenda</th>
                      <th className="px-4 py-3.5 text-center font-bold">Cantidad</th>
                      <th className="px-4 py-3.5 text-right font-bold">Precio</th>
                      <th className="px-4 py-3.5 text-right font-bold">Total</th>
                      <th className="px-4 py-3.5 text-center font-bold">Acc.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light text-xs">
                    {ventasFiltradas.map((v) => {
                      const docenas = v.unidadVenta === 'DOCENA' ? Math.floor(v.cantidadVendida / 12) : null
                      return (
                        <tr key={v.idVenta} className="hover:bg-[#fbfdfe] transition-colors">
                          <td className="px-4 py-3 text-secondary font-mono whitespace-nowrap">{v.fechaVenta}</td>
                          <td className="px-4 py-3 font-extrabold text-primary">{v.nombreCliente}</td>
                          <td className="px-4 py-3">
                            <span className="inline-block text-[9px] font-bold bg-[#e8fff5] text-[#1c4a3f] px-2 py-0.5 rounded mr-1.5 border border-[#cce2db] font-mono">{v.codigoLote}</span>
                            <span className="text-primary font-semibold">{v.nombrePrenda}</span>
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-primary whitespace-nowrap">
                            {docenas ? `${docenas} doc` : `${v.cantidadVendida} uds`}
                            <span className="text-secondary font-normal"> ({v.cantidadVendida} uds)</span>
                          </td>
                          <td className="px-4 py-3 text-right text-secondary whitespace-nowrap">
                            {formatSoles(v.precioUnitario)}/{v.unidadVenta === 'DOCENA' ? 'doc' : 'ud'}
                            {v.descuentoPorcentaje > 0 && (
                              <span className="ml-1 text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">-{v.descuentoPorcentaje}%</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-extrabold text-primary">{formatSoles(v.montoTotal)}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handlePrintTicket(v)}
                              className="px-2.5 py-1.5 rounded-lg bg-primary-light hover:bg-[#d0ded9] text-primary font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-sm text-[10px]"
                            >
                              🖨️ Ticket
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── VISTA ANÁLISIS ─── */}
      {vistaActiva === 'analisis' && (
        <div className="space-y-6 animate-fadeIn text-left">
          {loadingAnalisis ? (
            <div className="text-center py-12 text-secondary animate-pulse">Cargando análisis de ventas...</div>
          ) : !resumenVentas ? (
            <div className="text-center py-12">
              <p className="text-secondary text-sm mb-3">No se pudo cargar el análisis.</p>
              <button onClick={fetchAnalisis} className="px-4 py-2 rounded-full bg-primary text-white text-xs font-bold cursor-pointer hover:bg-primary-hover">Reintentar</button>
            </div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total Facturado', value: formatSoles(resumenVentas.totalFacturado), icon: '💰' },
                  { label: 'N° de Ventas', value: String(resumenVentas.totalVentas), icon: '🧾' },
                  { label: 'Unidades Vendidas', value: `${resumenVentas.totalUnidadesVendidas} uds (${Math.floor(resumenVentas.totalUnidadesVendidas / 12)} doc)`, icon: '📦' },
                  { label: 'Ticket Promedio', value: formatSoles(resumenVentas.promedioVenta), icon: '📈' },
                ].map((kpi) => (
                  <div key={kpi.label} className="bg-white border border-border-primary rounded-2xl p-4 shadow-sm space-y-1">
                    <span className="text-lg">{kpi.icon}</span>
                    <p className="text-xs text-secondary font-semibold">{kpi.label}</p>
                    <p className="text-sm font-extrabold text-primary">{kpi.value}</p>
                  </div>
                ))}
              </div>

              {/* Gráfico por Producto */}
              {resumenVentas.porProducto.length > 0 && (
                <div className="bg-white border border-border-primary rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-sm font-extrabold text-primary">Facturación por Prenda</h3>
                  {(() => {
                    const maxMonto = Math.max(...resumenVentas.porProducto.map(p => p.monto))
                    return resumenVentas.porProducto.map((p) => (
                      <div key={p.nombrePrenda} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-primary truncate max-w-[55%]">{p.nombrePrenda}</span>
                          <span className="text-secondary">{p.unidades} uds · <span className="font-bold text-accent-dark">{formatSoles(p.monto)}</span></span>
                        </div>
                        <div className="h-2.5 bg-primary-light rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-accent to-[#47a993] rounded-full transition-all duration-700"
                            style={{ width: maxMonto > 0 ? `${(p.monto / maxMonto) * 100}%` : '0%' }}
                          />
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              )}

              {/* Gráfico por Mes */}
              {resumenVentas.porMes.length > 0 && (
                <div className="bg-white border border-border-primary rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-sm font-extrabold text-primary">Facturación Mensual (últimos 6 meses)</h3>
                  {(() => {
                    const maxMonto = Math.max(...resumenVentas.porMes.map(m => m.monto))
                    return resumenVentas.porMes.map((m) => (
                      <div key={m.mes} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-primary font-mono">{m.mes}</span>
                          <span className="text-secondary">{m.unidades} uds · <span className="font-bold text-accent-dark">{formatSoles(m.monto)}</span></span>
                        </div>
                        <div className="h-2.5 bg-primary-light rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#3b9dd6] to-[#54b8d6] rounded-full transition-all duration-700"
                            style={{ width: maxMonto > 0 ? `${(m.monto / maxMonto) * 100}%` : '0%' }}
                          />
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              )}

              {resumenVentas.porProducto.length === 0 && resumenVentas.porMes.length === 0 && (
                <div className="text-center py-10 text-secondary border border-dashed border-border-primary rounded-2xl text-xs font-semibold">
                  Aún no hay ventas con precio registrado para mostrar análisis.
                </div>
              )}

              <div className="flex justify-end">
                <button onClick={fetchAnalisis} className="text-xs text-secondary hover:text-primary font-semibold cursor-pointer transition-colors">
                  🔄 Actualizar análisis
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
