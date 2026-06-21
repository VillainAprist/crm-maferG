import { useState } from 'react'
import type { Lote, Venta, Cliente } from '../types'
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

export function VentasView({
  ventas,
  lotes,
  clientes,
  loading,
  fetchVentas,
  fetchLotes,
  fetchClientes
}: VentasViewProps) {
  // POS Form States
  const [idLote, setIdLote] = useState<number | ''>('')
  const [cantidad, setCantidad] = useState<number | ''>(1)
  const [codigoCupon, setCodigoCupon] = useState('')
  
  // Cliente selection States
  const [modoCliente, setModoCliente] = useState<'existente' | 'nuevo'>('existente')
  const [idCliente, setIdCliente] = useState<number | ''>('')
  
  // Nuevo Cliente States
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTipo, setClienteTipo] = useState<'B2C' | 'B2B'>('B2C')
  const [clienteEmail, setClienteEmail] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')
  const [clienteCiudad, setClienteCiudad] = useState('')

  // Control States
  const [registrando, setRegistrando] = useState(false)
  const [error, setError] = useState('')
  const [ultimaVenta, setUltimaVenta] = useState<Venta | null>(null)
  
  // Filter States
  const [filtroVenta, setFiltroVenta] = useState('')

  // Get selected lot stock
  const loteSeleccionado = lotes.find((l) => l.idLote === Number(idLote))
  const stockMax = loteSeleccionado ? loteSeleccionado.stock : 0

  async function handleRegistrarVenta(e: React.FormEvent) {
    e.preventDefault()
    if (!idLote || !cantidad) return

    if (Number(cantidad) > stockMax) {
      setError(`Stock insuficiente. Solo quedan ${stockMax} unidades en este lote.`)
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
      cantidadVendida: Number(cantidad),
      codigoCupon: codigoCupon.trim() || null
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
      
      // Reset Form
      setIdLote('')
      setCantidad(1)
      setIdCliente('')
      setClienteNombre('')
      setClienteEmail('')
      setClienteTelefono('')
      setClienteCiudad('')
      setCodigoCupon('')
      
      // Refresh Lists
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

    printWindow.document.write(`
      <html>
        <head>
          <title>Encuesta de Satisfacción - Venta ${venta.idVenta}</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              text-align: center;
              padding: 30px;
              margin: 0;
              background-color: #ffffff;
            }
            .ticket-card {
              border: 2px dashed #1e4a40;
              padding: 24px;
              display: inline-block;
              border-radius: 12px;
              background: #fafcfb;
              max-width: 320px;
            }
            h1 {
              font-size: 18px;
              margin: 0 0 10px 0;
              color: #1e4a40;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            p {
              font-size: 13px;
              margin: 6px 0;
              color: #2d5a50;
            }
            .divider {
              border-top: 1px dashed #cce2db;
              margin: 15px 0;
            }
            img {
              width: 180px;
              height: 180px;
              margin: 15px 0;
              border: 1px solid #e2ece9;
              border-radius: 8px;
              padding: 4px;
              background: white;
            }
            .instruction {
              font-size: 11px;
              color: #53796f;
              font-weight: bold;
              line-height: 1.4;
            }
            .footer-info {
              font-size: 10px;
              color: #8faea6;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="ticket-card">
            <h1>MAFER-G</h1>
            <p>¡Gracias por tu preferencia!</p>
            <div class="divider"></div>
            <p style="text-align: left;"><strong>Cliente:</strong> ${venta.nombreCliente}</p>
            <p style="text-align: left;"><strong>Prenda:</strong> ${venta.nombrePrenda}</p>
            <p style="text-align: left;"><strong>Cant:</strong> ${venta.cantidadVendida} uds. | <strong>Lote:</strong> ${venta.codigoLote}</p>
            <div class="divider"></div>
            <img src="${API_BASE}/api/nps/admin/etiqueta/${venta.tokenQr}/qr" alt="QR Encuesta" />
            <p class="instruction">Califica tu compra escaneando el código QR superior y recibe un cupón de 10% de descuento.</p>
            <div class="footer-info">Ticket #${venta.idVenta} - ${venta.fechaVenta}</div>
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

  const ventasFiltradas = ventas.filter((v) => 
    v.nombreCliente.toLowerCase().includes(filtroVenta.toLowerCase()) ||
    v.codigoLote.toLowerCase().includes(filtroVenta.toLowerCase()) ||
    v.nombrePrenda.toLowerCase().includes(filtroVenta.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-left">
        <h2 className="text-lg font-extrabold text-primary">Registrar Venta & Generar Encuestas</h2>
        <p className="text-xs text-secondary mt-1">
          Selecciona las prendas y el cliente para registrar la compra. Esto generará un código QR único para que el cliente califique el producto desde su móvil.
        </p>
      </div>

      {/* POS overlay modal upon sale registration */}
      {ultimaVenta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-[28px] border border-border-primary shadow-2xl p-6 w-full max-w-sm animate-scaleIn text-center space-y-4">
            <span className="inline-block text-[10px] font-extrabold bg-accent-light text-accent-dark px-3 py-1 rounded-full border border-[#cce2db] uppercase tracking-wider">
              ✔️ Venta Registrada
            </span>
            <div className="space-y-1">
              <h4 className="font-extrabold text-lg text-primary">
                {ultimaVenta.nombreCliente}
              </h4>
              <p className="text-xs text-secondary font-medium">
                {ultimaVenta.nombrePrenda} ({ultimaVenta.cantidadVendida} uds. del lote {ultimaVenta.codigoLote})
              </p>
            </div>

            <div className="w-44 h-44 bg-[#fafdfe] border border-border-primary rounded-2xl flex items-center justify-center p-3.5 mx-auto shadow-inner">
              <img
                src={`${API_BASE}/api/nps/admin/etiqueta/${ultimaVenta.tokenQr}/qr`}
                alt="QR Encuesta"
                className="w-full h-full object-contain"
              />
            </div>

            <p className="text-[11px] text-secondary leading-relaxed px-2">
              Pide al cliente que escanee el código QR con su móvil para calificar el lote y obtener su cupón.
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => handlePrintTicket(ultimaVenta)}
                className="w-full py-3 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-primary/10"
              >
                🖨️ Imprimir Ticket de Encuesta
              </button>
              <button
                onClick={() => setUltimaVenta(null)}
                className="w-full py-2.5 rounded-full border border-border-primary text-secondary text-xs font-bold hover:bg-gray-50 transition-all cursor-pointer"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {/* Formulario */}
        <div className="w-full space-y-4">
          <form onSubmit={handleRegistrarVenta} className="bg-primary-light border border-border-primary rounded-2xl p-5 space-y-4 text-left shadow-sm">
            <h3 className="font-bold text-primary text-sm mb-2">Punto de Venta</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Lote */}
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-secondary">Lote del Producto</span>
                <select
                  required
                  value={idLote}
                  onChange={(e) => {
                    setIdLote(e.target.value !== '' ? Number(e.target.value) : '')
                    setCantidad(1)
                  }}
                  className="border border-border-primary rounded-xl px-3 py-2.5 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="">Selecciona Lote (Prenda - SKU)</option>
                  {lotes.map((l) => (
                    <option key={l.idLote} value={l.idLote} disabled={l.stock <= 0}>
                      {l.codigoLote} - {l.nombrePrenda} ({l.stock === 0 ? 'Sin Stock' : `Stock: ${l.stock} uds.`})
                    </option>
                  ))}
                </select>
              </label>

              {/* Cantidad */}
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-secondary">Cantidad a Vender</span>
                <input
                  type="number"
                  required
                  min={1}
                  max={stockMax || 1}
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value !== '' ? Number(e.target.value) : '')}
                  className="border border-border-primary rounded-xl px-3 py-2.5 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent"
                />
                {loteSeleccionado && (
                  <span className="text-[10px] text-emerald-800 font-extrabold mt-0.5">
                    Stock disponible: {stockMax} unidades
                  </span>
                )}
              </label>

              {/* Código de Cupón */}
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-secondary">Código de Cupón (Opcional)</span>
                <input
                  type="text"
                  placeholder="Ej. MAFERG-XYZ123"
                  value={codigoCupon}
                  onChange={(e) => setCodigoCupon(e.target.value)}
                  className="border border-border-primary rounded-xl px-3 py-2.5 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent uppercase"
                />
              </label>
            </div>

            {/* Toggle Cliente */}
            <div className="border-t border-border-light pt-4 mt-2">
              <div className="flex items-center justify-between mb-3.5">
                <span className="text-xs font-bold text-primary">Información del Cliente</span>
                <div className="flex items-center gap-1 bg-white rounded-xl p-0.5 border border-border-primary">
                  <button
                    type="button"
                    onClick={() => { setModoCliente('existente'); setError('') }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      modoCliente === 'existente' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-primary'
                    }`}
                  >
                    Registrado
                  </button>
                  <button
                    type="button"
                    onClick={() => { setModoCliente('nuevo'); setError('') }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      modoCliente === 'nuevo' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-primary'
                    }`}
                  >
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
                    <option value="">Selecciona Cliente</option>
                    {clientes.map((c) => (
                      <option key={c.idCliente} value={c.idCliente}>
                        {c.nombreRazonSocial} ({c.email || c.telefono || 'Sin datos de contacto'})
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fadeIn">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-secondary">Nombres / Razón Social</span>
                    <input
                      type="text"
                      required={modoCliente === 'nuevo'}
                      placeholder="Ej. Distribuidora S.A. o Juan Pérez"
                      value={clienteNombre}
                      onChange={(e) => setClienteNombre(e.target.value)}
                      className="border border-border-primary rounded-xl px-3 py-2 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-secondary">Tipo Cliente</span>
                    <select
                      value={clienteTipo}
                      onChange={(e) => setClienteTipo(e.target.value as 'B2C' | 'B2B')}
                      className="border border-border-primary rounded-xl px-3 py-2 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <option value="B2C">Minorista (B2C)</option>
                      <option value="B2B">Mayorista (B2B)</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-secondary">Correo Electrónico</span>
                    <input
                      type="email"
                      placeholder="juan@ejemplo.com"
                      value={clienteEmail}
                      onChange={(e) => setClienteEmail(e.target.value)}
                      className="border border-border-primary rounded-xl px-3 py-2 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-secondary">Teléfono</span>
                    <input
                      type="tel"
                      placeholder="987654321"
                      value={clienteTelefono}
                      onChange={(e) => setClienteTelefono(e.target.value)}
                      className="border border-border-primary rounded-xl px-3 py-2 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5 md:col-span-2">
                    <span className="text-xs font-bold text-secondary">Ciudad</span>
                    <input
                      type="text"
                      placeholder="Ej. Lima"
                      value={clienteCiudad}
                      onChange={(e) => setClienteCiudad(e.target.value)}
                      className="border border-border-primary rounded-xl px-3 py-2 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </label>
                </div>
              )}
            </div>

            {error && <p className="text-red-600 text-xs font-bold bg-red-50 p-2.5 rounded-xl border border-red-100">{error}</p>}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={registrando || !idLote || !cantidad}
                className="px-5 py-3 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary-hover cursor-pointer disabled:opacity-50 transition-all shadow-sm"
              >
                {registrando ? 'Procesando Venta...' : 'Registrar Venta & Generar Encuesta'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Historial de Ventas */}
      <div className="space-y-3 pt-4 border-t border-border-light text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-extrabold text-primary text-sm">Historial de Ventas Registradas</h3>
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
            {ventas.length === 0 ? 'No se han registrado ventas en el sistema.' : 'No se encontraron resultados para la búsqueda.'}
          </div>
        ) : (
          <div className="overflow-x-auto border border-border-primary rounded-2xl bg-white shadow-sm no-scrollbar">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-primary uppercase bg-primary-light border-b border-border-primary">
                <tr>
                  <th className="px-4 py-3.5 font-bold">Fecha</th>
                  <th className="px-4 py-3.5 font-bold">Cliente</th>
                  <th className="px-4 py-3.5 font-bold">Lote / Prenda</th>
                  <th className="px-4 py-3.5 text-center font-bold">Cant.</th>
                  <th className="px-4 py-3.5 text-center font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light text-xs">
                {ventasFiltradas.map((v) => (
                  <tr key={v.idVenta} className="hover:bg-[#fbfdfe] transition-colors">
                    <td className="px-4 py-3.5 text-secondary font-mono whitespace-nowrap">{v.fechaVenta}</td>
                    <td className="px-4 py-3.5 font-extrabold text-primary">
                      {v.nombreCliente}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-block text-[9px] font-bold bg-[#e8fff5] text-[#1c4a3f] px-2.5 py-0.5 rounded mr-2 border border-[#cce2db] font-mono">
                        {v.codigoLote}
                      </span>
                      <span className="text-primary font-bold">{v.nombrePrenda}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-primary">{v.cantidadVendida} uds.</td>
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => handlePrintTicket(v)}
                        className="px-2.5 py-1.5 rounded-lg bg-primary-light hover:bg-[#d0ded9] text-primary font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-sm"
                      >
                        🖨️ Re-Imprimir QR
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
