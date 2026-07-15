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
  const [showWhatsappWidget, setShowWhatsappWidget] = useState(false)
  const [widgetMessage, setWidgetMessage] = useState('')
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

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
    return (precio * 0.95).toFixed(2)
  }

  const handlePedirWhatsApp = (prod: Producto) => {
    const telefonoWhatsApp = "51970767654" // Teléfono comercial de MAFER-G
    const textoCupon = couponCode ? `\n*Cupón de Descuento Activo:* ${couponCode} (5% OFF)` : ""
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

  const handleWidgetSend = () => {
    const text = widgetMessage.trim() || 'Hola MAFER-G, deseo realizar una consulta sobre el catálogo.'
    const url = `https://wa.me/51970767654?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
    setShowWhatsappWidget(false)
  }

  return (
    <>
      <div className="w-full max-w-4xl mx-auto animate-fadeIn font-sans text-primary">
        <div className="space-y-6">

        {/* Banner del cupón si el cliente es promotor */}
        {couponCode && (
          <div className="bg-accent-light border border-accent/25 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-pulse-slow">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎁</span>
              <div className="text-left">
                <p className="text-[10px] font-extrabold tracking-[0.15em] text-accent-dark uppercase">Beneficio de Fidelidad</p>
                <p className="text-sm font-extrabold text-primary">¡5% de Descuento Activo!</p>
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
            {/* Hero Banner Principal (Estilo Carter's) */}
            <div className="w-full rounded-[32px] overflow-hidden border border-border-primary shadow-sm bg-primary-light relative animate-fadeIn">
              <img
                src="/imagen_header.png"
                alt="Aires de Invierno MAFER-G"
                className="w-full h-auto block"
              />
            </div>

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
                  className={`px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${categoriaActiva === cat
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

        {/* Sección de Marca: ¿Por qué elegir MAFER-G? */}
        <section className="bg-white/90 border border-border-primary rounded-[32px] overflow-hidden shadow-sm p-6 md:p-8 space-y-6 text-left animate-fadeIn">
          {/* Cabecera */}
          <div className="flex flex-col items-center text-center space-y-3 pb-4 border-b border-border-primary">
            <img
              src="/maferG-logo/mafergLOGO.png"
              alt="Logo MAFER-G"
              className="h-12 w-auto object-contain"
            />
            <h2 className="text-xl md:text-2xl font-extrabold text-primary tracking-tight">
              Lo mejor en moda infantil peruana está en MAFER-G
            </h2>
            <p className="text-xs md:text-sm text-secondary max-w-2xl leading-relaxed">
              En MAFER-G nos dedicamos a confeccionar ropa cómoda y funcional para bebés y niños, pensando siempre en facilitar la vida de los papás. Nuestras prendas están elaboradas con materiales innovadores, llenos de color y pequeños detalles encantadores, reflejando nuestra filosofía de celebrar la infancia en cada prenda.
            </p>
          </div>

          {/* Banner de la Marca */}
          <div className="w-full rounded-2xl overflow-hidden shadow-xs border border-border-primary bg-primary-light">
            <img
              src="/imagen_brand.png"
              alt="Campaña MAFER-G"
              className="w-full h-auto object-cover object-center"
            />
          </div>

          {/* Por qué elegir MAFER-G */}
          <div className="space-y-6 pt-2">
            <h3 className="text-base font-extrabold text-primary uppercase tracking-wider text-center md:text-left">
              ¿Por qué elegir MAFER-G?
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-primary-light border border-border-primary rounded-2xl space-y-2 hover:bg-white hover:shadow-xs transition-all duration-300">
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-xs text-primary uppercase tracking-wider">Materiales de Calidad</h4>
                </div>
                <p className="text-xs text-secondary leading-relaxed">
                  Confeccionamos con la fibra de algodón más fina del mundo, garantizando prendas extremadamente suaves, frescas e hipoalergénicas que protegen la delicada piel de tu bebé.
                </p>
              </div>

              <div className="p-4 bg-primary-light border border-border-primary rounded-2xl space-y-2 hover:bg-white hover:shadow-xs transition-all duration-300">
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-xs text-primary uppercase tracking-wider">Comodidad y Estilo Funcional</h4>
                </div>
                <p className="text-xs text-secondary leading-relaxed">
                  Nuestros diseños son creados para dar total libertad de movimiento en sus juegos diarios, con detalles prácticos como broches estratégicos que hacen el vestir rápido y sencillo.
                </p>
              </div>

              <div className="p-4 bg-primary-light border border-border-primary rounded-2xl space-y-2 hover:bg-white hover:shadow-xs transition-all duration-300">
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-xs text-primary uppercase tracking-wider">Colores y Detalles Encantadores</h4>
                </div>
                <p className="text-xs text-secondary leading-relaxed">
                  Cada prenda celebra la infancia a través de paletas de color armoniosas y diseños únicos que despiertan la alegría de niños y niñas en sus aventuras cotidianas.
                </p>
              </div>

              <div className="p-4 bg-primary-light border border-border-primary rounded-2xl space-y-2 hover:bg-white hover:shadow-xs transition-all duration-300">
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-xs text-primary uppercase tracking-wider">Atención y Pedido Directo</h4>
                </div>
                <p className="text-xs text-secondary leading-relaxed">
                  Comprar en MAFER-G es simple. Elige en nuestro catálogo y contáctanos directamente a nuestro canal de WhatsApp para una asesoría y envío rápido y personalizado.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Sección de Preguntas Frecuentes (FAQ) */}
        <section className="bg-white/90 border border-border-primary rounded-[32px] p-6 md:p-8 space-y-6 text-left shadow-sm">
          <div className="space-y-1 border-b border-border-primary pb-4">
            <h2 className="text-xl font-extrabold text-primary tracking-tight">Preguntas Frecuentes</h2>
            <p className="text-xs text-secondary">Resolvemos tus dudas sobre compras, envíos, cambios y métodos de pago.</p>
          </div>

          <div className="space-y-3">
            {[
              {
                pregunta: "💳 ¿Qué métodos de pago aceptan?",
                respuesta: "Aceptamos Yape, Plin, transferencias bancarias directas (BCP, BBVA, Interbank) y pago contra entrega coordinado previamente según tu zona de cobertura en Lima."
              },
              {
                pregunta: "🚚 ¿Realizan envíos a todo el Perú y cuánto cuesta?",
                respuesta: "¡Sí! Realizamos envíos a todo el país. En Lima Metropolitana enviamos con nuestro motorizado express. Para provincias, despachamos vía Olva Courier o Shalom. El costo exacto se calcula según tu dirección y te lo detallamos por WhatsApp al confirmar tu pedido."
              },
              {
                pregunta: "⏱️ ¿Cuánto demora en llegar mi pedido?",
                respuesta: "En Lima Metropolitana recibirás tu pedido dentro de 24 a 48 horas útiles. Para provincias, el tiempo estimado de llegada es de 2 a 4 días hábiles dependiendo del destino y la frecuencia de reparto del courier."
              },
              {
                pregunta: "🔄 ¿Cómo realizo un cambio de talla o modelo?",
                respuesta: "Aceptamos cambios dentro de los primeros 7 días calendario tras recibir tu pedido. Las prendas deben estar en perfecto estado, con etiquetas originales y sin señales de uso. Los costos de envío de retorno y reenvío corren por cuenta del comprador."
              },
              {
                pregunta: "🌱 ¿De qué material es la ropa y qué tallas manejan?",
                respuesta: "Todas nuestras prendas son confeccionadas con 100% Algodón Pima Peruano de la más alta calidad, ideal por su suavidad e hipoalergenicidad en la piel de tu bebé. Ofrecemos tallas para bebés (de 0 a 24 meses) y niños pequeños (tallas 2 a 8)."
              }
            ].map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="border border-border-primary rounded-2xl overflow-hidden bg-white/50 transition-all duration-300"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full p-4 flex items-center justify-between gap-4 text-left font-bold text-xs md:text-sm text-primary hover:bg-primary-light transition-colors cursor-pointer border-none"
                  >
                    <span>{faq.pregunta}</span>
                    <span className={`transform transition-transform duration-300 text-secondary text-base ${isOpen ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>
                  <div
                    className={`grid transition-all duration-300 ease-in-out ${
                      isOpen ? 'grid-rows-[1fr] opacity-100 border-t border-border-primary/50' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="p-4 text-xs md:text-[13px] leading-relaxed text-secondary bg-primary-light/30">
                        {faq.respuesta}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Footer solicitado con Redes y Teléfono editable */}
        <footer className="border-t border-border-primary pt-8 pb-4 text-center space-y-6 bg-white/80 backdrop-blur-md rounded-2xl p-5 border shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center text-left max-w-4xl mx-auto">
            {/* Información de Contacto y Redes */}
            <div className="space-y-4">
              <h4 className="font-extrabold text-primary text-base">MAFER-G TEXTIL</h4>
              <p className="text-xs text-secondary leading-relaxed">
                Visítanos en nuestra tienda física ubicada en Gamarra. Atendemos pedidos mayoristas y envíos a todo el Perú.
              </p>
              <div className="flex gap-4 text-xs font-bold text-secondary">
                <a href="https://www.instagram.com/maferggg12/" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
                  Instagram
                </a>
                <span>•</span>
                <a href="https://www.facebook.com/profile.php?id=61591824843038" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
                  Facebook
                </a>
                <span>•</span>
                <a href="https://www.tiktok.com/@maferg.ic" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
                  TikTok
                </a>
              </div>
              <div className="text-xs text-secondary/85 space-y-1">
                <p className="font-extrabold text-secondary">Contacto Comercial / Pedidos:</p>
                <p className="font-mono text-sm text-primary font-extrabold">+51 970 767 654</p>
              </div>
            </div>

            {/* Ubicación Google Maps */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs text-secondary font-bold">
                <span>📍</span>
                <span>Galería Venero, Agustín Gamarra 569, La Victoria</span>
              </div>
              <div className="w-full h-40 rounded-xl overflow-hidden border border-border-primary shadow-inner bg-gray-50">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d975.4280316496919!2d-77.0141075303842!3d-12.063317187771245!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9105c89f76861273%3A0x4c3a3788ba0f04fb!2sTIENDA%20276-463%2C%20GALERIA%20VENERO%2C%20Agust%C3%ADn%20Gamarra%20569%2C%20La%20Victoria%2015018!5e0!3m2!1ses!2spe!4v1784098514118!5m2!1ses!2spe"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen={true}
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  title="Tienda Mafer-G en Galería Venero - Google Maps"
                ></iframe>
              </div>
            </div>
          </div>
          
          <div className="border-t border-border-primary/50 pt-4 text-center">
            <p className="text-[10px] text-secondary/55 font-bold tracking-wider uppercase">
              © {new Date().getFullYear()} MAFER-G TEXTIL S.A.C.
            </p>
          </div>
        </footer>

      </div>
    </div>

      {/* Widget de Chat de WhatsApp */}
      <div className="fixed bottom-6 right-6 z-50 font-sans">
        {showWhatsappWidget && (
          <div className="mb-4 w-[320px] bg-white border border-border-primary rounded-[24px] shadow-2xl overflow-hidden animate-slideUp text-left flex flex-col">
            {/* Header */}
            <div className="bg-primary text-white p-4 flex items-center justify-between relative">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                    <img
                      src="/maferG-logo/mafergLOGO.png"
                      alt="Avatar MAFER-G"
                      className="w-8 h-8 object-contain"
                    />
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-primary rounded-full animate-pulse"></span>
                </div>
                <div>
                  <h4 className="font-extrabold text-sm tracking-wide">Soporte MAFER-G</h4>
                  <p className="text-[10px] text-white/80">En línea · Responde al instante</p>
                </div>
              </div>
              <button
                onClick={() => setShowWhatsappWidget(false)}
                className="text-white/70 hover:text-white text-lg font-bold w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer border-none"
              >
                ✕
              </button>
            </div>

            {/* Chat Body */}
            <div className="p-4 bg-primary-light/40 space-y-4 max-h-[300px] overflow-y-auto">
              <div className="bg-white border border-border-primary rounded-2xl rounded-tl-none p-3 shadow-xs max-w-[85%] text-xs text-secondary leading-relaxed">
                ¡Hola! 👋 Bienvenido al catálogo de MAFER-G. ¿Cómo podemos ayudarte hoy con tu pedido o consulta?
              </div>
            </div>

            {/* Chat Input & Send Button */}
            <div className="p-3 bg-white border-t border-border-primary flex flex-col gap-2">
              <textarea
                value={widgetMessage}
                onChange={(e) => setWidgetMessage(e.target.value)}
                placeholder="Escribe tu mensaje aquí..."
                rows={2}
                className="w-full text-xs border border-border-primary rounded-xl p-2.5 resize-none focus:outline-none focus:border-accent transition-colors text-primary font-medium placeholder-secondary/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleWidgetSend();
                  }
                }}
              />
              <button
                onClick={handleWidgetSend}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/10 cursor-pointer border-none"
              >
                <span>Enviar a WhatsApp</span>
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Floating Action Button (FAB) */}
        <button
          onClick={() => setShowWhatsappWidget(!showWhatsappWidget)}
          aria-label="Abrir chat de WhatsApp"
          className="w-14 h-14 rounded-full shadow-lg hover:shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer relative group border-none z-50 p-0 overflow-hidden bg-transparent"
        >
          {/* Pulse Effect */}
          <span className="absolute -inset-1 rounded-full bg-emerald-400/30 animate-ping -z-10 group-hover:animate-none"></span>

          {/* WhatsApp Icon */}
          <img
            src="/wsp_logo.png"
            alt="WhatsApp"
            className="w-full h-full object-cover rounded-full"
          />
        </button>
      </div>
    </>
  )
}
