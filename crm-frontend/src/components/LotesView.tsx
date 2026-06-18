import { useState } from 'react'
import type { Lote, Producto } from '../types'
import { API_BASE } from '../config'

interface LotesViewProps {
  lotes: Lote[]
  productos: Producto[]
  loading: boolean
  fetchLotes: () => Promise<void>
}

export function LotesView({ lotes, productos, loading, fetchLotes }: LotesViewProps) {
  const [codigoLote, setCodigoLote] = useState('')
  const [idProducto, setIdProducto] = useState<number | ''>('')
  const [cantidad, setCantidad] = useState<number | ''>(1)
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [copiadoLote, setCopiadoLote] = useState<string | null>(null)
  const [fechaFiltro, setFechaFiltro] = useState<'TODO' | 'HOY' | 'SEMANA' | 'MES'>('TODO')

  // Filtrar los lotes por fecha en el frontend en tiempo real
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
          cantidad: Number(cantidad) || 1
        })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Error al crear el lote.')
        return
      }
      
      setExito(`Lote ${codigoLote} creado exitosamente con su código QR.`)
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

  function handlePrintQr(tokenQr: string, codigo: string, prenda: string, cant: number) {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html>
        <head>
          <title>Etiqueta QR Lote ${codigo}</title>
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
              font-size: 22px;
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
            <h1>MAFER-G Control Calidad</h1>
            <div class="info"><strong>Lote:</strong> ${codigo}</div>
            <div class="info"><strong>Prenda:</strong> ${prenda}</div>
            <div class="info"><strong>Cantidad:</strong> ${cant} uds.</div>
            <img src="${API_BASE}/api/nps/admin/etiqueta/${tokenQr}/qr" alt="QR Code" />
            <div class="footer-text">Escanea con tu celular para calificar este lote</div>
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
      <div>
        <h2 className="text-lg font-bold text-[#173c34]">Gestión de Lotes y Códigos QR</h2>
        <p className="text-sm text-[#4f6f66]">Registra lotes de producción para generar sus etiquetas QR de encuestas NPS.</p>
      </div>

      {/* Formulario de Registro */}
      <form onSubmit={handleCrearLote} className="bg-[#f2faf7] border border-[#d6e5e2] rounded-2xl p-5 space-y-4">
        <h3 className="font-bold text-[#1c4a3f] text-sm">Registrar Nuevo Lote</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex flex-col gap-1.5 text-left">
            <span className="text-xs font-semibold text-[#53796f]">Código de Lote</span>
            <input
              type="text"
              required
              value={codigoLote}
              onChange={(e) => setCodigoLote(e.target.value)}
              placeholder="Ej. LOTE-2026-001"
              className="border border-[#d0ded9] rounded-xl px-3 py-2.5 text-sm text-[#16342d] bg-white focus:outline-2 focus:outline-[rgba(71,169,147,0.3)] transition-all"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-left">
            <span className="text-xs font-semibold text-[#53796f]">Prenda / Producto</span>
            <select
              required
              value={idProducto}
              onChange={(e) => setIdProducto(e.target.value !== '' ? Number(e.target.value) : '')}
              className="border border-[#d0ded9] rounded-xl px-3 py-2.5 text-sm text-[#16342d] bg-white focus:outline-2 focus:outline-[rgba(71,169,147,0.3)] transition-all"
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
            <span className="text-xs font-semibold text-[#53796f]">Cantidad (uds.)</span>
            <input
              type="number"
              required
              min={1}
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value !== '' ? Number(e.target.value) : '')}
              placeholder="Ej. 10"
              className="border border-[#d0ded9] rounded-xl px-3 py-2.5 text-sm text-[#16342d] bg-white focus:outline-2 focus:outline-[rgba(71,169,147,0.3)] transition-all"
            />
          </label>
        </div>

        {error && <p className="text-red-600 text-sm font-semibold bg-red-50 p-2.5 rounded-lg border border-red-100">{error}</p>}
        {exito && <p className="text-green-700 text-sm font-semibold bg-green-50 p-2.5 rounded-lg border border-green-100">{exito}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={creando || !codigoLote.trim() || !idProducto}
            className="px-5 py-2.5 rounded-full bg-[#1c4a3f] text-white text-sm font-bold hover:bg-[#153830] cursor-pointer disabled:opacity-50 transition-all shadow-sm flex items-center gap-2"
          >
            {creando ? 'Registrando...' : 'Generar Lote & QR'}
          </button>
        </div>
      </form>

      {/* Listado de Lotes */}
      <div className="space-y-3 pt-4 border-t border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-bold text-[#1c4a3f] text-sm">Lotes de Producción Registrados</h3>

          {/* Filtro de Fecha */}
          <div className="flex items-center gap-1.5 bg-[#f2faf7] p-1 rounded-lg border border-[#d6e5e2] shadow-sm">
            <button
              onClick={() => setFechaFiltro('TODO')}
              type="button"
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                fechaFiltro === 'TODO' ? 'bg-[#1e4a40] text-white shadow-sm' : 'text-[#53796f] hover:text-[#1c4a3f]'
              }`}
            >
              Todo
            </button>
            <button
              onClick={() => setFechaFiltro('HOY')}
              type="button"
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                fechaFiltro === 'HOY' ? 'bg-[#1e4a40] text-white shadow-sm' : 'text-[#53796f] hover:text-[#1c4a3f]'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setFechaFiltro('SEMANA')}
              type="button"
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                fechaFiltro === 'SEMANA' ? 'bg-[#1e4a40] text-white shadow-sm' : 'text-[#53796f] hover:text-[#1c4a3f]'
              }`}
            >
              7 días
            </button>
            <button
              onClick={() => setFechaFiltro('MES')}
              type="button"
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                fechaFiltro === 'MES' ? 'bg-[#1e4a40] text-white shadow-sm' : 'text-[#53796f] hover:text-[#1c4a3f]'
              }`}
            >
              30 días
            </button>
          </div>
        </div>
        
        {loading && lotes.length === 0 ? (
          <div className="text-center py-8 text-gray-400">Cargando lotes...</div>
        ) : lotesFiltrados.length === 0 ? (
          <div className="text-center py-8 text-gray-400 border-2 border-dashed border-[#dce7e4] rounded-2xl">
            {lotes.length === 0
              ? 'No hay lotes de producción registrados. Crea uno arriba para empezar.'
              : 'No se encontraron lotes para el periodo de fecha seleccionado.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lotesFiltrados.map((lote) => (
              <div 
                key={lote.idLote} 
                className="bg-white border border-[#dce7e4] rounded-2xl p-4 flex gap-4 hover:shadow-md transition-all duration-300"
              >
                {/* QR Preview */}
                <div className="w-24 h-24 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center p-1 shrink-0">
                  <img 
                    src={`${API_BASE}/api/nps/admin/etiqueta/${lote.tokenQr}/qr`} 
                    alt="QR Mini" 
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between text-left min-w-0">
                  <div>
                    <span className="inline-block text-[10px] font-bold bg-[#e8fff5] text-[#1c4a3f] px-2 py-0.5 rounded-full mb-1">
                      {lote.codigoLote}
                    </span>
                    <h4 className="text-sm font-bold text-[#16342d] truncate" title={lote.nombrePrenda}>
                      {lote.nombrePrenda}
                    </h4>
                    <p className="text-xs text-[#53796f] mt-0.5">
                      SKU: <span className="font-mono">{lote.sku}</span> | Cantidad: <span className="font-bold text-[#14342e]">{lote.cantidad} uds.</span>
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">Registrado: {lote.fechaConfeccion}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-2 pt-2 border-t border-gray-50">
                    <button
                      onClick={() => handlePrintQr(lote.tokenQr, lote.codigoLote, lote.nombrePrenda, lote.cantidad)}
                      className="px-3 py-1.5 rounded-lg bg-[#e2ebe8] text-[#1c4a3f] text-xs font-bold hover:bg-[#d0ded9] transition-all cursor-pointer flex items-center gap-1"
                    >
                      🖨️ Imprimir
                    </button>
                    <button
                      onClick={() => handleCopyLink(lote.tokenQr, lote.codigoLote)}
                      className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 transition-all cursor-pointer flex items-center gap-1"
                    >
                      {copiadoLote === lote.codigoLote ? '✅ Copiado' : '🔗 Copiar Link'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
