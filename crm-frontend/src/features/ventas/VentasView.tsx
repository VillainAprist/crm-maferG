import { useState, useMemo, useEffect } from 'react'
import type { Lote, Venta, Cliente, ResumenVentas } from '../../types'
import { API_BASE } from '../../config'

interface VentasViewProps {
  ventas: Venta[]
  lotes: Lote[]
  clientes: Cliente[]
  loading: boolean
  fetchVentas: () => Promise<void>
  fetchLotes: () => Promise<void>
  fetchClientes: () => Promise<void>
  isAdmin?: boolean
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
  fetchClientes,
  isAdmin = false
}: VentasViewProps) {
  const [vistaActiva, setVistaActiva] = useState<'pos' | 'analisis'>(isAdmin ? 'analisis' : 'pos')

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
  const [filtroPeriodo, setFiltroPeriodo] = useState<'TODO' | 'ESTE_MES' | 'MES_PASADO' | 'ANIO_ACTUAL'>('TODO')

  useEffect(() => {
    if (isAdmin && !resumenVentas) {
      fetchAnalisis()
    }
  }, [isAdmin])

  // Derived calculations
  const loteSeleccionado = lotes.find((l) => l.idLote === Number(idLote))
  const stockMax = loteSeleccionado ? loteSeleccionado.stock : 0
  const stockDocenas = Math.floor(stockMax / 12)

  const cantidadUnidades = unidadVenta === 'DOCENA'
    ? (cantidadInput !== '' ? Number(cantidadInput) * 12 : 0)
    : (cantidadInput !== '' ? Number(cantidadInput) : 0)

  const stockInsuficiente = cantidadUnidades > stockMax && !!idLote && cantidadInput !== '' && Number(cantidadInput) > 0

  const descuentoPct = cuponEstado === 'valido' ? 5 : 0
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
          setCuponMsg('Cupón válido — 5% de descuento aplicado.')
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
            .x12-badge { background: #e8fff5; color: #1e4a40; padding: 1px 4px; border-radius: 4px; font-weight: bold; font-size: 10px; border: 1px solid #cce2db; margin-left: 4px; }
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
            <div class="precio-row">
              <span>Precio${precioLabel}:</span>
              <span>
                ${formatSoles(venta.precioUnitario)}
                ${docenas ? ' <span class="x12-badge">x12</span>' : ''}
              </span>
            </div>
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
    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/ventas/resumen`)
      if (res.ok) setResumenVentas(await res.json() as ResumenVentas)
    } catch { /* sin analisis */ }
  }

  const [paginaActual, setPaginaActual] = useState(1)
  const itemsPorPagina = 10
  const [ordenColumna, setOrdenColumna] = useState<'fecha' | 'cliente' | 'prenda' | 'cantidad' | 'precio' | 'total'>('fecha')
  const [ordenDireccion, setOrdenDireccion] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    setPaginaActual(1)
  }, [filtroVenta])

  function handleOrdenar(columna: 'fecha' | 'cliente' | 'prenda' | 'cantidad' | 'precio' | 'total') {
    if (ordenColumna === columna) {
      setOrdenDireccion(ordenDireccion === 'asc' ? 'desc' : 'asc')
    } else {
      setOrdenColumna(columna)
      setOrdenDireccion('asc')
    }
    setPaginaActual(1)
  }

  const ventasFiltradas = useMemo(() => {
    let filtered = ventas.filter((v) =>
      v.nombreCliente.toLowerCase().includes(filtroVenta.toLowerCase()) ||
      v.codigoLote.toLowerCase().includes(filtroVenta.toLowerCase()) ||
      v.nombrePrenda.toLowerCase().includes(filtroVenta.toLowerCase())
    )

    filtered = [...filtered].sort((a, b) => {
      let valA: any = ''
      let valB: any = ''

      if (ordenColumna === 'fecha') {
        valA = a.fechaVenta
        valB = b.fechaVenta
      } else if (ordenColumna === 'cliente') {
        valA = a.nombreCliente.toLowerCase()
        valB = b.nombreCliente.toLowerCase()
      } else if (ordenColumna === 'prenda') {
        valA = a.nombrePrenda.toLowerCase()
        valB = b.nombrePrenda.toLowerCase()
      } else if (ordenColumna === 'cantidad') {
        valA = a.cantidadVendida
        valB = b.cantidadVendida
      } else if (ordenColumna === 'precio') {
        valA = a.precioUnitario
        valB = b.precioUnitario
      } else if (ordenColumna === 'total') {
        valA = a.montoTotal
        valB = b.montoTotal
      }

      if (valA < valB) return ordenDireccion === 'asc' ? -1 : 1
      if (valA > valB) return ordenDireccion === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [ventas, filtroVenta, ordenColumna, ordenDireccion])

  const ventasPaginadas = useMemo(() => {
    const inicio = (paginaActual - 1) * itemsPorPagina
    return ventasFiltradas.slice(inicio, inicio + itemsPorPagina)
  }, [ventasFiltradas, paginaActual])

  const totalPaginas = Math.ceil(ventasFiltradas.length / itemsPorPagina) || 1

  const totalHistorial = useMemo(() =>
    ventas.reduce((acc, v) => acc + (v.montoTotal ?? 0), 0), [ventas])

  const dateStr = useMemo(() => new Date().toISOString().substring(0, 7), []) // "2026-07"
  const currentYear = useMemo(() => new Date().getFullYear().toString(), []) // "2026"

  const prevMonthStr = useMemo(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().substring(0, 7)
  }, []) // "2026-06"

  const ventasFiltradasPorPeriodo = useMemo(() => {
    return ventas.filter((v) => {
      if (filtroPeriodo === 'ESTE_MES') return v.fechaVenta.startsWith(dateStr)
      if (filtroPeriodo === 'MES_PASADO') return v.fechaVenta.startsWith(prevMonthStr)
      if (filtroPeriodo === 'ANIO_ACTUAL') return v.fechaVenta.startsWith(currentYear)
      return true
    })
  }, [ventas, filtroPeriodo, dateStr, prevMonthStr, currentYear])

  const metricasFinancieras = useMemo(() => {
    let bruto = 0
    let descuentos = 0
    let neto = 0
    let costo = 0
    let unidades = 0

    ventasFiltradasPorPeriodo.forEach((v) => {
      const cant = v.cantidadVendida
      const originalSubtotal = v.precioUnitario * (v.unidadVenta === 'DOCENA' ? cant / 12 : cant)
      const desc = originalSubtotal * v.descuentoPorcentaje / 100
      
      bruto += originalSubtotal
      descuentos += desc
      neto += v.montoTotal
      costo += (v.costoUnitarioLote || 0) * cant
      unidades += cant
    })

    const utilidad = neto - costo
    const margen = neto > 0 ? (utilidad / neto) * 100 : 0
    const ticketPromedio = ventasFiltradasPorPeriodo.length > 0 ? neto / ventasFiltradasPorPeriodo.length : 0

    return { bruto, descuentos, neto, costo, utilidad, margen, unidades, ticketPromedio }
  }, [ventasFiltradasPorPeriodo])

  const estadisticasMensuales = useMemo(() => {
    const grupos: Record<string, {
      mes: string
      totalVentas: number
      unidades: number
      bruto: number
      descuentos: number
      neto: number
      costo: number
      utilidad: number
      margen: number
    }> = {}

    ventas.forEach((v) => {
      const mesKey = v.fechaVenta.substring(0, 7) // "YYYY-MM"
      if (!grupos[mesKey]) {
        grupos[mesKey] = {
          mes: mesKey,
          totalVentas: 0,
          unidades: 0,
          bruto: 0,
          descuentos: 0,
          neto: 0,
          costo: 0,
          utilidad: 0,
          margen: 0
        }
      }
      
      const cant = v.cantidadVendida
      const originalSubtotal = v.precioUnitario * (v.unidadVenta === 'DOCENA' ? cant / 12 : cant)
      const desc = originalSubtotal * v.descuentoPorcentaje / 100

      grupos[mesKey].totalVentas += 1
      grupos[mesKey].unidades += cant
      grupos[mesKey].bruto += originalSubtotal
      grupos[mesKey].descuentos += desc
      grupos[mesKey].neto += v.montoTotal
      grupos[mesKey].costo += (v.costoUnitarioLote || 0) * cant
    })

    const list = Object.values(grupos).map((g) => {
      const utilidad = g.neto - g.costo
      const margen = g.neto > 0 ? (utilidad / g.neto) * 100 : 0
      return { ...g, utilidad, margen }
    })

    return list.sort((a, b) => b.mes.localeCompare(a.mes))
  }, [ventas])

  const rankingPrendas = useMemo(() => {
    const prendas: Record<string, {
      nombrePrenda: string
      unidades: number
      neto: number
    }> = {}

    ventasFiltradasPorPeriodo.forEach((v) => {
      const prendaKey = v.nombrePrenda
      if (!prendas[prendaKey]) {
        prendas[prendaKey] = {
          nombrePrenda: prendaKey,
          unidades: 0,
          neto: 0
        }
      }
      prendas[prendaKey].unidades += v.cantidadVendida
      prendas[prendaKey].neto += v.montoTotal
    })

    return Object.values(prendas).sort((a, b) => b.neto - a.neto)
  }, [ventasFiltradasPorPeriodo])

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header con toggle POS / Análisis */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
        <div>
          <h2 className="text-lg font-extrabold text-primary">
            {isAdmin ? 'Reporte & Análisis de Ventas' : 'Ventas & Punto de Venta'}
          </h2>
          <p className="text-xs text-secondary mt-0.5">
            {isAdmin 
              ? 'Análisis comercial, facturación histórica y estadísticas de rendimiento.' 
              : 'Registra ventas por unidades o docenas. El sistema genera QR de encuesta automáticamente.'}
          </p>
        </div>
        {!isAdmin && (
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
        )}
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
                  {ultimaVenta.unidadVenta === 'DOCENA' ? (
                    <span className="inline-flex items-center gap-1.5 flex-wrap">
                      <span>{Math.floor(ultimaVenta.cantidadVendida / 12)} doc</span>
                      <span className="bg-[#e8fff5] text-[#1c4a3f] px-1.5 py-0.5 rounded-md font-extrabold text-[9px] border border-[#cce2db]">
                        x12
                      </span>
                      <span>({ultimaVenta.cantidadVendida} uds.) × {formatSoles(ultimaVenta.precioUnitario)}/doc</span>
                    </span>
                  ) : (
                    <span>{ultimaVenta.cantidadVendida} uds. × {formatSoles(ultimaVenta.precioUnitario)}/ud</span>
                  )}
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
                  max={unidadVenta === 'DOCENA' ? (stockDocenas > 0 ? stockDocenas : 999) : (stockMax > 0 ? stockMax : 999)}
                  value={cantidadInput}
                  onChange={(e) => setCantidadInput(e.target.value !== '' ? Number(e.target.value) : '')}
                  className={`border rounded-xl px-3 py-2.5 text-sm text-primary bg-white focus:outline-none focus:ring-1 ${
                    stockInsuficiente
                      ? 'border-red-400 focus:ring-red-400 bg-red-50'
                      : 'border-border-primary focus:ring-accent'
                  }`}
                />
                {cantidadInput !== '' && Number(cantidadInput) > 0 && !stockInsuficiente && (
                  <span className="text-[10px] text-accent-dark font-bold">
                    = {cantidadUnidades} unidades totales
                  </span>
                )}
                {stockInsuficiente && (
                  <span className="text-[10px] text-red-600 font-bold flex items-center gap-1">
                    ⚠️ Stock insuficiente. Máx: {unidadVenta === 'DOCENA' ? `${stockDocenas} doc (${stockMax} uds)` : `${stockMax} uds`}
                  </span>
                )}
              </label>

              {/* Precio negociado */}
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-secondary flex justify-between items-center">
                  <span>Precio negociado ({unidadVenta === 'DOCENA' ? 'por docena' : 'por unidad'}) — S/.</span>
                  {loteSeleccionado && (
                    <span className="text-[10px] text-accent-dark font-extrabold bg-[#e8fff5] px-2 py-0.5 rounded-md border border-[#cce2db] animate-fadeIn whitespace-nowrap">
                      Catálogo: {unidadVenta === 'DOCENA' ? `${formatSoles(loteSeleccionado.precioReferencia * 12)}` : `${formatSoles(loteSeleccionado.precioReferencia)}`}
                    </span>
                  )}
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
                {loteSeleccionado && unidadVenta === 'DOCENA' && (
                  <span className="text-[9px] text-secondary font-medium">
                    * Precio unitario de catálogo: {formatSoles(loteSeleccionado.precioReferencia)}
                  </span>
                )}
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
                    {unidadVenta === 'DOCENA' ? (
                      <span className="flex items-center gap-1.5 flex-wrap">
                        <span>{cantidadInput} doc</span>
                        <span className="bg-[#e8fff5] text-[#1c4a3f] px-1.5 py-0.5 rounded-md font-extrabold text-[9px] border border-[#cce2db]">
                          x12
                        </span>
                        <span>({cantidadUnidades} uds.) × {formatSoles(Number(precioUnitario))}/doc</span>
                      </span>
                    ) : (
                      <span>{cantidadInput} uds. × {formatSoles(Number(precioUnitario))}/ud</span>
                    )}
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
                disabled={registrando || !idLote || !cantidadInput || precioUnitario === '' || stockInsuficiente}
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
                      <th className="px-4 py-3.5 font-bold cursor-pointer hover:bg-[#dce7e4] select-none transition-colors" onClick={() => handleOrdenar('fecha')}>
                        Fecha {ordenColumna === 'fecha' ? (ordenDireccion === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th className="px-4 py-3.5 font-bold cursor-pointer hover:bg-[#dce7e4] select-none transition-colors" onClick={() => handleOrdenar('cliente')}>
                        Cliente {ordenColumna === 'cliente' ? (ordenDireccion === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th className="px-4 py-3.5 font-bold cursor-pointer hover:bg-[#dce7e4] select-none transition-colors" onClick={() => handleOrdenar('prenda')}>
                        Lote / Prenda {ordenColumna === 'prenda' ? (ordenDireccion === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th className="px-4 py-3.5 text-center font-bold cursor-pointer hover:bg-[#dce7e4] select-none transition-colors" onClick={() => handleOrdenar('cantidad')}>
                        Cantidad {ordenColumna === 'cantidad' ? (ordenDireccion === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th className="px-4 py-3.5 text-right font-bold cursor-pointer hover:bg-[#dce7e4] select-none transition-colors" onClick={() => handleOrdenar('precio')}>
                        Precio {ordenColumna === 'precio' ? (ordenDireccion === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      {isAdmin && <th className="px-4 py-3.5 text-right font-bold">Costo Confección</th>}
                      {isAdmin && <th className="px-4 py-3.5 text-right font-bold">Utilidad</th>}
                      <th className="px-4 py-3.5 text-right font-bold cursor-pointer hover:bg-[#dce7e4] select-none transition-colors" onClick={() => handleOrdenar('total')}>
                        Total {ordenColumna === 'total' ? (ordenDireccion === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th className="px-4 py-3.5 text-center font-bold">Acc.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light text-xs">
                    {ventasPaginadas.map((v) => {
                      const docenas = v.unidadVenta === 'DOCENA' ? Math.floor(v.cantidadVendida / 12) : null
                      const costoUnit = v.costoUnitarioLote || 0
                      const costoTotalVenta = costoUnit * v.cantidadVendida
                      const utilidad = v.montoTotal - costoTotalVenta
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
                            {v.unidadVenta === 'DOCENA' && (
                              <span className="ml-1.5 text-[9px] font-extrabold bg-[#e8fff5] text-[#1c4a3f] px-1 py-0.5 rounded border border-[#cce2db]">
                                x12
                              </span>
                            )}
                            {v.descuentoPorcentaje > 0 && (
                              <span className="ml-1 text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">-{v.descuentoPorcentaje}%</span>
                            )}
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-3 text-right text-secondary whitespace-nowrap font-medium">
                              {formatSoles(costoTotalVenta)}
                              <span className="block text-[9px] text-gray-400 font-mono">
                                (U: {formatSoles(costoUnit)})
                              </span>
                            </td>
                          )}
                          {isAdmin && (
                            <td className={`px-4 py-3 text-right font-extrabold whitespace-nowrap ${utilidad >= 0 ? 'text-green-600 bg-green-50/20' : 'text-red-600 bg-red-50/20'} rounded`}>
                              {formatSoles(utilidad)}
                            </td>
                          )}
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
                {/* Controles de paginación */}
                {totalPaginas > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-[#fafdfe] border-t border-border-primary">
                    <span className="text-[11px] text-secondary font-semibold">
                      Mostrando {itemsPorPagina * (paginaActual - 1) + 1} a {Math.min(itemsPorPagina * paginaActual, ventasFiltradas.length)} de {ventasFiltradas.length} ventas
                    </span>
                    <div className="flex gap-2 select-none">
                      <button
                        type="button"
                        onClick={() => setPaginaActual(p => Math.max(p - 1, 1))}
                        disabled={paginaActual === 1}
                        className="px-3 py-1.5 rounded-lg border border-border-primary text-[10px] font-bold bg-white text-secondary hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                      >
                        ◄ Anterior
                      </button>
                      <span className="px-3 py-1.5 text-[10px] text-primary font-extrabold bg-[#e8fff5] border border-[#cce2db] rounded-lg">
                        Pág. {paginaActual} / {totalPaginas}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPaginaActual(p => Math.min(p + 1, totalPaginas))}
                        disabled={paginaActual === totalPaginas}
                        className="px-3 py-1.5 rounded-lg border border-border-primary text-[10px] font-bold bg-white text-secondary hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                      >
                        Siguiente ►
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── VISTA ANÁLISIS ─── */}
      {vistaActiva === 'analisis' && (
        <div className="space-y-6 animate-fadeIn text-left">
          {loading ? (
            <div className="text-center py-12 text-secondary animate-pulse font-medium">Cargando análisis de ventas...</div>
          ) : (
            <>
              {/* Selector de Rango Temporal */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#fafdfe] border border-[#cce2db] rounded-2xl p-4 shadow-sm text-left">
                <div>
                  <h3 className="font-extrabold text-primary text-xs uppercase tracking-wider">Rango Temporal de Análisis</h3>
                  <p className="text-[10px] text-secondary font-medium mt-0.5">Filtra las métricas clave y el ranking de prendas en tiempo real.</p>
                </div>
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-border-light shadow-xs max-w-fit self-start sm:self-center">
                  {[
                    { key: 'TODO', label: 'Histórico' },
                    { key: 'ESTE_MES', label: 'Este Mes' },
                    { key: 'MES_PASADO', label: 'Mes Pasado' },
                    { key: 'ANIO_ACTUAL', label: 'Año en Curso' },
                  ].map((btn) => (
                    <button
                      key={btn.key}
                      onClick={() => setFiltroPeriodo(btn.key as any)}
                      type="button"
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                        filtroPeriodo === btn.key ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-primary'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* KPIs Financieros */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: 'Ventas Brutas', value: formatSoles(metricasFinancieras.bruto), icon: '📊' },
                  { label: 'Descuentos', value: `- ${formatSoles(metricasFinancieras.descuentos)}`, icon: '🏷️', danger: metricasFinancieras.descuentos > 0 },
                  { label: 'Ventas Netas', value: formatSoles(metricasFinancieras.neto), icon: '💰', highlight: true },
                  { label: 'Costo Producción', value: formatSoles(metricasFinancieras.costo), icon: '🧵' },
                  { 
                    label: 'Utilidad Estimada', 
                    value: formatSoles(metricasFinancieras.utilidad), 
                    icon: '💎',
                    badge: `${metricasFinancieras.margen.toFixed(1)}%`
                  },
                  { label: 'Ticket Promedio', value: formatSoles(metricasFinancieras.ticketPromedio), icon: '📈' },
                ].map((kpi) => (
                  <div key={kpi.label} className="bg-white border border-border-primary rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[92px]">
                    <div className="flex items-center justify-between gap-1.5 mb-1 w-full">
                      <span className="text-sm">{kpi.icon}</span>
                      {kpi.badge && (
                        <span className="text-[8px] font-black uppercase bg-[#e8fff5] text-[#16a34a] border border-[#bbf7d0] px-1.5 py-0.5 rounded-full">
                          {kpi.badge}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-[9px] text-secondary font-bold uppercase tracking-wider leading-none">{kpi.label}</p>
                      <p className={`text-[13px] font-black mt-1.5 truncate ${
                        kpi.danger ? 'text-amber-700' : kpi.highlight ? 'text-accent-dark text-sm' : 'text-primary'
                      }`}>
                        {kpi.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Gráficos y Tablas en 2 Columnas */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                
                {/* Tabla de Desempeño Mensual (Col-span 2) */}
                <div className="lg:col-span-2 bg-white border border-border-primary rounded-2xl p-5 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-xs font-extrabold text-primary uppercase tracking-wider">Cuadro de Mando Mensual</h3>
                    <p className="text-[10px] text-secondary mt-0.5 font-medium">Historial contable agrupado mensualmente con tasas de rentabilidad.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#cce2db] text-secondary font-extrabold text-[8px] uppercase tracking-wider bg-primary-light">
                          <th className="py-2.5 px-3 rounded-l-lg">Mes</th>
                          <th className="py-2.5 px-2 text-center">Ventas</th>
                          <th className="py-2.5 px-2 text-right">V. Bruta</th>
                          <th className="py-2.5 px-2 text-right">Descuentos</th>
                          <th className="py-2.5 px-2 text-right">V. Neta</th>
                          <th className="py-2.5 px-2 text-right">Costo Prod.</th>
                          <th className="py-2.5 px-2 text-right">Utilidad</th>
                          <th className="py-2.5 px-3 text-center rounded-r-lg">Margen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {estadisticasMensuales.map((m) => (
                          <tr key={m.mes} className="hover:bg-[#fafdfe] transition-colors font-medium">
                            <td className="py-3 px-3 font-mono font-bold text-primary">{m.mes}</td>
                            <td className="py-3 px-2 text-center text-secondary">{m.totalVentas} <span className="text-[9px] text-gray-400">({m.unidades} uds)</span></td>
                            <td className="py-3 px-2 text-right text-secondary">{formatSoles(m.bruto)}</td>
                            <td className="py-3 px-2 text-right text-amber-700 font-semibold">{m.descuentos > 0 ? `- ${formatSoles(m.descuentos)}` : 'S/ 0.00'}</td>
                            <td className="py-3 px-2 text-right text-primary font-extrabold">{formatSoles(m.neto)}</td>
                            <td className="py-3 px-2 text-right text-secondary">{formatSoles(m.costo)}</td>
                            <td className="py-3 px-2 text-right text-accent-dark font-black">{formatSoles(m.utilidad)}</td>
                            <td className="py-3 px-3 text-center">
                              <span className="inline-block text-[9px] font-extrabold bg-[#e8fff5] text-[#16a34a] border border-[#bbf7d0] px-2 py-0.5 rounded-full">
                                {m.margen.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                        {estadisticasMensuales.length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-gray-400 font-medium bg-[#fafdfe] rounded-b-xl">
                              No hay registros de facturación para agrupar.
                            </td>
                          </tr>
                        )}
                      </tbody>
                      {estadisticasMensuales.length > 0 && (
                        <tfoot>
                          <tr className="border-t-2 border-[#1e4a40] font-extrabold text-primary bg-primary-light">
                            <td className="py-3 px-3 uppercase rounded-l-lg">TOTAL</td>
                            <td className="py-3 px-2 text-center">{ventas.length}</td>
                            <td className="py-3 px-2 text-right">{formatSoles(estadisticasMensuales.reduce((acc, x) => acc + x.bruto, 0))}</td>
                            <td className="py-3 px-2 text-right text-amber-700">
                              - {formatSoles(estadisticasMensuales.reduce((acc, x) => acc + x.descuentos, 0))}
                            </td>
                            <td className="py-3 px-2 text-right text-accent-dark font-black">{formatSoles(estadisticasMensuales.reduce((acc, x) => acc + x.neto, 0))}</td>
                            <td className="py-3 px-2 text-right">{formatSoles(estadisticasMensuales.reduce((acc, x) => acc + x.costo, 0))}</td>
                            <td className="py-3 px-2 text-right text-accent-dark font-black">
                              {formatSoles(estadisticasMensuales.reduce((acc, x) => acc + x.utilidad, 0))}
                            </td>
                            <td className="py-3 px-3 text-center rounded-r-lg">
                              {(() => {
                                const totNeto = estadisticasMensuales.reduce((acc, x) => acc + x.neto, 0)
                                const totUtil = estadisticasMensuales.reduce((acc, x) => acc + x.utilidad, 0)
                                const totMargen = totNeto > 0 ? (totUtil / totNeto) * 100 : 0
                                return (
                                  <span className="inline-block text-[9px] font-black bg-primary text-white px-2 py-0.5 rounded-full shadow-xs">
                                    {totMargen.toFixed(1)}%
                                  </span>
                                )
                              })()}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>

                {/* Ranking de Ventas por Prenda */}
                <div className="bg-white border border-border-primary rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h3 className="text-xs font-extrabold text-primary uppercase tracking-wider">Facturación por Prenda</h3>
                    <p className="text-[10px] text-secondary font-medium">Prendas con mayor demanda en el período filtrado.</p>
                  </div>
                  <div className="flex-1 mt-3 space-y-4">
                    {rankingPrendas.length > 0 ? (
                      (() => {
                        const maxNeto = Math.max(...rankingPrendas.map(p => p.neto))
                        return rankingPrendas.map((p) => (
                          <div key={p.nombrePrenda} className="space-y-1 text-left">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-primary truncate max-w-[55%]">{p.nombrePrenda}</span>
                              <span className="text-[10px] text-secondary font-semibold">
                                {p.unidades} uds · <span className="font-bold text-accent-dark">{formatSoles(p.neto)}</span>
                              </span>
                            </div>
                            <div className="h-2 bg-primary-light rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-accent to-[#47a993] rounded-full transition-all duration-700"
                                style={{ width: maxNeto > 0 ? `${(p.neto / maxNeto) * 100}%` : '0%' }}
                              />
                            </div>
                          </div>
                        ))
                      })()
                    ) : (
                      <div className="text-center py-10 text-gray-400 font-medium text-xs border border-dashed border-border-primary bg-[#fafdfe] rounded-xl">
                        No hay registros en este período.
                      </div>
                    )}
                  </div>
                  <div className="pt-4 mt-4 border-t border-gray-100 flex justify-end">
                    <button onClick={fetchVentas} className="text-[10px] text-secondary hover:text-primary font-bold uppercase tracking-wider cursor-pointer transition-colors flex items-center gap-1 bg-none border-none">
                      🔄 Actualizar Datos
                    </button>
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
