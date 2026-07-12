import { useState, useEffect } from 'react'
import type { Producto } from '../../types'
import { API_BASE } from '../../config'

export function CatalogoView({
  onBack,
  onNavigateToAdmin,
  showBackButton = false,
  couponCode
}: {
  onBack: () => void
  onNavigateToAdmin: () => void
  showBackButton?: boolean
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
    <div className="w-full max-w-4xl mx-auto animate-fadeIn font-sans text-primary">
      <div className="space-y-6">
        
        {/* Banner del cupón si el cliente es promotor */}
        {couponCode && (
          <div className="bg-accent-light border border-accent/25 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-pulse-slow">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎁</span>
              <div className="text-left">
                <p className="text-[10px] font-extrabold tracking-[0.15em] text-accent-dark uppercase">Beneficio de Fidelidad</p>
                <p className="text-sm font-extrabold text-primary">¡15% de Descuento Activo!</p>
                <p className="text-[11px] text-secondary leading-normal">Muestra este código al realizar tu pedido manual o por WhatsApp.</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-secondary/60 uppercase">Código</p>
              <span className="font-mono font-extrabold text-sm bg-white border border-accent/30 px-2 py-1 rounded select-all text-accent-dark shadow-inner">
                {couponCode}
              </span>
            </div>
          </div>
        )}

        {/* Cabecera del catálogo */}
        <header className="flex items-center justify-between p-4 bg-white/90 backdrop-blur-md rounded-2xl border border-border-primary shadow-sm mb-4">
          <div className="flex gap-2">
            {showBackButton && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-border-primary bg-white text-secondary hover:text-primary hover:bg-primary-light transition-all text-xs font-bold cursor-pointer"
              >
                ← Volver
              </button>
            )}
            <button
              onClick={onNavigateToAdmin}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-border-primary bg-white text-secondary hover:text-primary hover:bg-primary-light transition-all text-xs font-bold cursor-pointer"
            >
              🔑 Acceso Personal
            </button>
          </div>
          <div className="flex items-center gap-2.5">
            <img
              src="/maferG-logo/mafergLOGO.png"
              alt="Logo MAFER-G"
              className="h-8 w-auto object-contain"
            />
            <div className="text-left hidden xs:block">
              <span className="text-[10px] font-extrabold tracking-[0.25em] text-accent uppercase block">MAFER-G</span>
              <span className="text-xs font-bold text-secondary">Colección Infantil Premium</span>
            </div>
          </div>
        </header>

        {/* Listado Principal o Detalle de Producto */}
        {!productoDetalle ? (
          <div className="space-y-6">
            <div className="text-left space-y-1 bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-border-primary shadow-sm">
              <h1 className="text-2xl font-extrabold text-primary">Catálogo de Colección</h1>
              <p className="text-xs text-secondary">Explora nuestras prendas finas tejidas con el mejor algodón para bebés y niños.</p>
            </div>

            {/* Categorías (Scroll Horizontal) */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {categorias.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoriaActiva(cat)}
                  className={`px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                    categoriaActiva === cat
                      ? 'bg-primary text-white border-primary shadow-sm shadow-primary/10'
                      : 'bg-white border-border-primary text-secondary hover:bg-primary-light hover:text-primary'
                  }`}
                >
                  {cat.charAt(0) + cat.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-center py-12 text-secondary font-semibold bg-white/80 rounded-3xl border border-border-primary">
                Cargando catálogo dinámico...
              </div>
            ) : error ? (
              <div className="text-center py-12 text-red-500 font-semibold bg-white/80 rounded-3xl border border-border-primary">
                {error}
              </div>
            ) : productosFiltrados.length === 0 ? (
              <div className="text-center py-12 text-secondary/60 font-semibold border-2 border-dashed border-border-primary bg-white/80 rounded-3xl">
                No hay prendas disponibles en esta categoría.
              </div>
            ) : (
              /* Rejilla de Productos */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {productosFiltrados.map(prod => (
                  <div
                    key={prod.id}
                    onClick={() => setProductoDetalle(prod)}
                    className="bg-white/90 border border-border-primary rounded-[28px] overflow-hidden cursor-pointer hover:bg-white hover:shadow-[0_16px_36px_rgba(25,52,44,0.08)] transition-all duration-300 group text-left"
                  >
                    <div className="h-64 overflow-hidden relative bg-primary-light">
                      {prod.imagenUrl ? (
                        <img
                          src={prod.imagenUrl}
                          alt={prod.nombrePrenda}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl bg-primary-light">👕</div>
                      )}
                      <span className="absolute top-3 right-3 text-[9px] font-extrabold tracking-[0.1em] bg-accent text-white px-2.5 py-0.5 rounded-full uppercase">
                        {prod.categoriaInfantil || 'Colección'}
                      </span>
                    </div>
                    <div className="p-5 space-y-2">
                      <p className="text-[10px] font-semibold text-secondary/50 tracking-wider uppercase font-mono">{prod.sku}</p>
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-lg text-primary leading-snug truncate pr-2">{prod.nombrePrenda}</h3>
                        <div className="text-right flex-shrink-0">
                          {mostrarDescuento ? (
                            <div className="flex flex-col items-end leading-none">
                              <span className="text-[10px] text-gray-400 line-through">S/ {prod.precio?.toFixed(2)}</span>
                              <span className="font-extrabold text-base text-accent-dark">S/ {calcularPrecioConDescuento(prod.precio || 0)}</span>
                            </div>
                          ) : (
                            <span className="font-extrabold text-base text-primary">S/ {prod.precio?.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-secondary line-clamp-2 leading-relaxed">
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
          <div className="bg-white/95 border border-border-primary rounded-[32px] overflow-hidden shadow-md animate-fadeIn text-left">
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Imagen Grande */}
              <div className="h-[400px] md:h-full min-h-[300px] bg-primary-light relative">
                {productoDetalle.imagenUrl ? (
                  <img
                    src={productoDetalle.imagenUrl}
                    alt={productoDetalle.nombrePrenda}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-8xl bg-primary-light">👕</div>
                )}
                <button
                  onClick={() => setProductoDetalle(null)}
                  className="absolute top-4 left-4 grid h-10 w-10 place-items-center rounded-full border border-border-primary bg-white/90 text-primary shadow-md backdrop-blur-sm hover:bg-white transition-all cursor-pointer font-bold text-lg"
                >
                  ←
                </button>
              </div>

              {/* Detalles */}
              <div className="p-6 md:p-8 flex flex-col justify-between space-y-6">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-accent block mb-2 font-mono">
                    {productoDetalle.categoriaInfantil || 'Colección'} · {productoDetalle.sku}
                  </span>
                  
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <h1 className="text-2xl font-bold leading-tight text-primary">{productoDetalle.nombrePrenda}</h1>
                    <div className="text-right flex-shrink-0">
                      {mostrarDescuento ? (
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-gray-400 line-through">S/ {productoDetalle.precio?.toFixed(2)}</span>
                          <span className="rounded-full bg-accent-light border border-accent/20 px-3.5 py-1.5 text-lg font-extrabold tracking-tight text-accent-dark">
                            S/ {calcularPrecioConDescuento(productoDetalle.precio || 0)}
                          </span>
                        </div>
                      ) : (
                        <span className="rounded-full bg-primary-light border border-border-primary px-3.5 py-1.5 text-lg font-extrabold tracking-tight text-primary">
                          S/ {productoDetalle.precio?.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[13px] leading-relaxed text-secondary border-t border-border-primary pt-4 mb-6">
                    {productoDetalle.descripcion || 'Fina prenda de colección confeccionada bajo estrictos estándares de control de calidad para asegurar el bienestar de tu bebé.'}
                  </p>

                  <div className="space-y-4 border-t border-border-primary pt-4">
                    <div>
                      <h4 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-secondary/60">Material / Composición</h4>
                      <p className="text-xs text-primary mt-1 font-medium">{productoDetalle.material || '100% Algodón Pima Peruano'}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-secondary/60">Instrucciones de cuidado</h4>
                      <p className="text-xs text-primary mt-1 italic font-medium">{productoDetalle.cuidados || 'Lavar con agua fría, no usar blanqueador, secar a la sombra.'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <button
                    onClick={() => handlePedirWhatsApp(productoDetalle)}
                    className="w-full h-12 bg-emerald-600 text-white hover:bg-emerald-700 rounded-[14px] font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border-none"
                  >
                    💬 Solicitar Pedido por WhatsApp
                  </button>
                  <button
                    onClick={() => setProductoDetalle(null)}
                    className="w-full h-11 border border-border-primary text-secondary bg-white hover:bg-gray-50 rounded-[14px] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Volver al Catálogo
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer solicitado con Redes y Teléfono editable */}
        <footer className="border-t border-border-primary pt-8 pb-4 text-center space-y-4 bg-white/80 backdrop-blur-md rounded-2xl p-4 border shadow-xs">
          <div className="flex justify-center gap-6 text-sm font-semibold text-secondary">
            <a href="https://instagram.com/maferg" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
              Instagram
            </a>
            <span>•</span>
            <a href="https://facebook.com/maferg" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
              Facebook
            </a>
            <span>•</span>
            <a href="https://tiktok.com/@maferg" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
              TikTok
            </a>
          </div>
          <div className="text-xs text-secondary/85 space-y-1">
            <p className="font-extrabold text-secondary">Contacto Comercial / Pedidos:</p>
            <p className="font-mono text-sm text-primary font-extrabold">+51 999 999 999</p>
          </div>
          <p className="text-[10px] text-secondary/55 font-bold tracking-wider uppercase">
            © {new Date().getFullYear()} MAFER-G TEXTIL S.A.C.
          </p>
        </footer>

      </div>
    </div>
  )
}
