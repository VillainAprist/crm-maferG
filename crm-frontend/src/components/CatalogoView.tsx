import { useState, useEffect } from 'react'
import type { Producto } from '../types'
import { API_BASE } from '../config'

export function CatalogoView({
  onBack,
  couponCode
}: {
  onBack: () => void
  couponCode?: string | null
}) {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categoriaActiva, setCategoriaActiva] = useState<string>('TODOS')
  const [productoDetalle, setProductoDetalle] = useState<Producto | null>(null)

  const categorias = ['TODOS', 'CONJUNTOS', 'VESTIDOS', 'PANTALONES', 'CASACAS', 'POLOS']

  // Cargar productos desde el endpoint público
  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch(`${API_BASE}/api/nps/public/productos`)
        if (res.ok) {
          const data = await res.json() as Producto[]
          setProductos(data)
        } else {
          setError('No se pudo cargar el catálogo de productos.')
        }
      } catch {
        setError('Error de conexión al cargar el catálogo.')
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [])

  const productosFiltrados = productos.filter(prod => {
    if (categoriaActiva === 'TODOS') return true
    return prod.categoriaInfantil?.toUpperCase() === categoriaActiva
  })

  const mostrarDescuento = !!couponCode
  
  const calcularPrecioConDescuento = (precio: number) => {
    return (precio * 0.85).toFixed(2)
  }

  const handlePedirWhatsApp = (prod: Producto) => {
    const telefonoWhatsApp = "51999999999" // Teléfono comercial de MAFER-G
    const textoCupon = couponCode ? `\n*Cupón de Descuento Activo:* ${couponCode} (15% OFF)` : ""
    const precioFinal = mostrarDescuento ? calcularPrecioConDescuento(prod.precio || 0) : (prod.precio || 0).toFixed(2)
    
    const mensaje = `Hola MAFER-G, me gustaría realizar un pedido de la siguiente prenda de su catálogo:\n\n` +
      `*Prenda:* ${prod.nombrePrenda}\n` +
      `*SKU:* ${prod.sku}\n` +
      `*Composición:* ${prod.material || 'Algodón Premium'}\n` +
      `*Precio:* S/ ${precioFinal}${textoCupon}\n\n` +
      `¿Cómo coordinamos el pago y envío?`

    const url = `https://wa.me/${telefonoWhatsApp}?text=${encodeURIComponent(mensaje)}`
    window.open(url, '_blank')
  }

  return (
    <div className="min-h-screen w-full bg-[var(--color-primary-light)] text-[var(--color-primary)] overflow-x-clip px-4 py-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Banner del cupón si el cliente es promotor */}
        {couponCode && (
          <div className="bg-[#FFE4E1] border border-[#555555]/14 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-pulse-slow">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎁</span>
              <div className="text-left">
                <p className="text-[10px] font-bold tracking-[0.15em] text-[#555555]/60 uppercase">Beneficio de Fidelidad</p>
                <p className="text-sm font-extrabold text-[#555555]">¡15% de Descuento Activo!</p>
                <p className="text-[11px] text-[#555555]/80 leading-normal">Muestra este código al realizar tu pedido manual o por WhatsApp.</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-[#555555]/60 uppercase">Código</p>
              <span className="font-mono font-extrabold text-sm bg-white/70 px-2 py-1 rounded border border-[#555555]/20 select-all">
                {couponCode}
              </span>
            </div>
          </div>
        )}

        {/* Cabecera del catálogo */}
        <header className="flex items-center justify-between pb-4 border-b border-[#555555]/10">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#555555]/10 bg-white/60 hover:bg-white transition-all text-xs font-bold cursor-pointer"
          >
            ← Volver
          </button>
          <div className="text-right">
            <span className="text-[10px] font-bold tracking-[0.25em] text-[#555555]/60 uppercase block">MAFER-G</span>
            <span className="text-xs font-bold text-[#555555]/80">Colección Infantil Premium</span>
          </div>
        </header>

        {/* Listado Principal o Detalle de Producto */}
        {!productoDetalle ? (
          <div className="space-y-6">
            <div className="text-left space-y-2">
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#555555]">Catálogo de Colección</h1>
              <p className="text-xs text-[#555555]/70">Explora nuestras prendas finas tejidas con el mejor algodón para bebés y niños.</p>
            </div>

            {/* Categorías (Scroll Horizontal) */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {categorias.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoriaActiva(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                    categoriaActiva === cat
                      ? 'bg-[#555555] text-[#EDEAE0] border-[#555555]'
                      : 'bg-white/40 border-[#555555]/10 text-[#555555]/70 hover:bg-white/80'
                  }`}
                >
                  {cat.charAt(0) + cat.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-500 font-semibold">Cargando catálogo dinámico...</div>
            ) : error ? (
              <div className="text-center py-12 text-red-500 font-semibold">{error}</div>
            ) : productosFiltrados.length === 0 ? (
              <div className="text-center py-12 text-gray-400 font-semibold border-2 border-dashed border-[#555555]/10 rounded-3xl">
                No hay prendas disponibles en esta categoría.
              </div>
            ) : (
              /* Rejilla de Productos */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {productosFiltrados.map(prod => (
                  <div
                    key={prod.id}
                    onClick={() => setProductoDetalle(prod)}
                    className="bg-white/50 border border-[#555555]/10 rounded-[28px] overflow-hidden cursor-pointer hover:bg-white hover:shadow-[0_16px_36px_rgba(85,85,85,0.06)] transition-all duration-300 group text-left"
                  >
                    <div className="h-64 overflow-hidden relative bg-[#e4ddce]">
                      {prod.imagenUrl ? (
                        <img
                          src={prod.imagenUrl}
                          alt={prod.nombrePrenda}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl bg-[#e4ddce]">👕</div>
                      )}
                      <span className="absolute top-3 right-3 text-[9px] font-bold tracking-[0.1em] bg-[#555555] text-[#EDEAE0] px-2.5 py-0.5 rounded-full uppercase">
                        {prod.categoriaInfantil || 'Colección'}
                      </span>
                    </div>
                    <div className="p-5 space-y-2">
                      <p className="text-[10px] font-semibold text-[#555555]/50 tracking-wider uppercase font-mono">{prod.sku}</p>
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-lg text-[#555555] leading-snug truncate pr-2">{prod.nombrePrenda}</h3>
                        <div className="text-right flex-shrink-0">
                          {mostrarDescuento ? (
                            <div className="flex flex-col items-end leading-none">
                              <span className="text-[10px] text-gray-400 line-through">S/ {prod.precio?.toFixed(2)}</span>
                              <span className="font-extrabold text-base text-emerald-600">S/ {calcularPrecioConDescuento(prod.precio || 0)}</span>
                            </div>
                          ) : (
                            <span className="font-extrabold text-base text-[#555555]">S/ {prod.precio?.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-[#555555]/70 line-clamp-2 leading-relaxed">
                        {prod.descripcion || 'Sin descripción disponible para esta prenda de colección.'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Vista de Detalle */
          <div className="bg-white/80 border border-[#555555]/10 rounded-[32px] overflow-hidden shadow-sm animate-fadeIn text-left">
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Imagen Grande */}
              <div className="h-[400px] md:h-full min-h-[300px] bg-[#e4ddce] relative">
                {productoDetalle.imagenUrl ? (
                  <img
                    src={productoDetalle.imagenUrl}
                    alt={productoDetalle.nombrePrenda}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-8xl bg-[#e4ddce]">👕</div>
                )}
                <button
                  onClick={() => setProductoDetalle(null)}
                  className="absolute top-4 left-4 grid h-11 w-11 place-items-center rounded-full border border-[#555555]/10 bg-[#EDEAE0]/80 text-[#555555] shadow-md backdrop-blur-sm hover:bg-white transition-all cursor-pointer"
                >
                  ←
                </button>
              </div>

              {/* Detalles */}
              <div className="p-6 md:p-8 flex flex-col justify-between space-y-6">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#555555]/55 block mb-2 font-mono">
                    {productoDetalle.categoriaInfantil || 'Colección'} · {productoDetalle.sku}
                  </span>
                  
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <h1 className="text-2xl font-bold leading-tight text-[#555555]">{productoDetalle.nombrePrenda}</h1>
                    <div className="text-right flex-shrink-0">
                      {mostrarDescuento ? (
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-gray-400 line-through">S/ {productoDetalle.precio?.toFixed(2)}</span>
                          <span className="rounded-full bg-emerald-50 border border-emerald-150 px-3.5 py-1.5 text-lg font-bold tracking-tight text-emerald-700">
                            S/ {calcularPrecioConDescuento(productoDetalle.precio || 0)}
                          </span>
                        </div>
                      ) : (
                        <span className="rounded-full bg-[#FFE4E1] px-3.5 py-1.5 text-lg font-bold tracking-tight text-[#555555]">
                          S/ {productoDetalle.precio?.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[13px] leading-relaxed text-[#555555]/80 border-t border-[#555555]/10 pt-4 mb-6">
                    {productoDetalle.descripcion || 'Fina prenda de colección confeccionada bajo estrictos estándares de control de calidad para asegurar el bienestar de tu bebé.'}
                  </p>

                  <div className="space-y-4 border-t border-[#555555]/10 pt-4">
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#555555]/50">Material / Composición</h4>
                      <p className="text-xs text-[#555555] mt-1 font-medium">{productoDetalle.material || '100% Algodón Pima Peruano'}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#555555]/50">Instrucciones de cuidado</h4>
                      <p className="text-xs text-[#555555] mt-1 italic font-medium">{productoDetalle.cuidados || 'Lavar con agua fría, no usar blanqueador, secar a la sombra.'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <button
                    onClick={() => handlePedirWhatsApp(productoDetalle)}
                    className="w-full h-12 bg-emerald-600 text-white hover:bg-emerald-700 rounded-[14px] font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    💬 Solicitar Pedido por WhatsApp
                  </button>
                  <button
                    onClick={() => setProductoDetalle(null)}
                    className="w-full h-11 border border-[#555555]/20 text-[#555555] hover:bg-black/5 rounded-[14px] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Volver al Catálogo
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer solicitado con Redes y Teléfono editable */}
        <footer className="border-t border-[#555555]/10 pt-8 pb-4 text-center space-y-4">
          <div className="flex justify-center gap-6 text-sm font-semibold text-[#555555]/70">
            <a href="https://instagram.com/maferg" target="_blank" rel="noreferrer" className="hover:text-[#555555] transition-colors">
              Instagram
            </a>
            <span>•</span>
            <a href="https://facebook.com/maferg" target="_blank" rel="noreferrer" className="hover:text-[#555555] transition-colors">
              Facebook
            </a>
            <span>•</span>
            <a href="https://tiktok.com/@maferg" target="_blank" rel="noreferrer" className="hover:text-[#555555] transition-colors">
              TikTok
            </a>
          </div>
          <div className="text-xs text-[#555555]/50 space-y-1">
            <p className="font-bold text-[#555555]/70">Contacto Comercial / Pedidos:</p>
            <p className="font-mono text-sm text-[#555555]/80 font-bold">+51 999 999 999</p>
          </div>
          <p className="text-[10px] text-[#555555]/40 font-bold tracking-wider uppercase">
            © {new Date().getFullYear()} MAFER-G TEXTIL S.A.C.
          </p>
        </footer>

      </div>
    </div>
  )
}
