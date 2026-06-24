import { useState } from 'react'

interface ProductoCatalogo {
  id: number
  sku: string
  nombre: string
  categoria: string
  descripcion: string
  precio: number
  material: string
  cuidados: string
  imagenUrl: string
}

const PRODUCTOS_MOCK: ProductoCatalogo[] = [
  {
    id: 1,
    sku: 'SKU-SET-001',
    nombre: 'Conjunto Infantil Rayas',
    categoria: 'Conjuntos',
    descripcion: 'Un tierno conjunto de dos piezas confeccionado en algodón orgánico de tacto ultrasuave. Diseñado con un clásico patrón de rayas finas y broches hipoalergénicos.',
    precio: 89,
    material: '100% Algodón Pima Orgánico',
    cuidados: 'Lavar a máquina con agua fría, ciclo delicado. Secar a la sombra.',
    imagenUrl: 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&w=600&q=80&fit=crop'
  },
  {
    id: 2,
    sku: 'SKU-VEST-002',
    nombre: 'Vestido Algodón Flores',
    categoria: 'Vestidos',
    descripcion: 'Vestido fresco y ligero con un delicado estampado floral. Perfecto para celebraciones de primavera, con mangas englobadas y un forro interior suave.',
    precio: 120,
    material: '92% Algodón, 8% Lino natural',
    cuidados: 'Lavado a mano preferentemente. Planchar a temperatura baja.',
    imagenUrl: 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?auto=format&w=600&q=80&fit=crop'
  },
  {
    id: 3,
    sku: 'SKU-PANT-003',
    nombre: 'Pantalón Jean Bebé',
    categoria: 'Pantalones',
    descripcion: 'Jean elástico con pretina rib y cordón ajustable para la máxima comodidad de tu bebé. Tela resistente al juego diario y de tacto amigable.',
    precio: 75,
    material: '78% Algodón, 20% Poliéster reciclado, 2% Elastano',
    cuidados: 'Lavar al revés. No usar blanqueador.',
    imagenUrl: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&w=600&q=80&fit=crop'
  },
  {
    id: 4,
    sku: 'SKU-JACK-004',
    nombre: 'Casaca Acolchada Invierno',
    categoria: 'Casacas',
    descripcion: 'Casaca abrigadora con relleno térmico ligero y capucha desmontable. Tela exterior repelente a lloviznas y puños ajustados cortavientos.',
    precio: 145,
    material: '100% Poliéster reciclado con forro polar interior',
    cuidados: 'Lavar a máquina en agua tibia. Secadora a baja temperatura.',
    imagenUrl: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&w=600&q=80&fit=crop'
  },
  {
    id: 5,
    sku: 'SKU-POLO-005',
    nombre: 'Polo Algodón Orgánico',
    categoria: 'Polos',
    descripcion: 'Básico indispensable en el armario infantil. Polo de cuello redondo con cuello expandible para facilitar el cambio de ropa y estampado al agua.',
    precio: 45,
    material: '100% Algodón Peruano de fibra larga',
    cuidados: 'Lavar con colores similares. Planchar al revés.',
    imagenUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&w=600&q=80&fit=crop'
  }
]

export function CatalogoView({
  onBack,
  couponCode
}: {
  onBack: () => void
  couponCode?: string | null
}) {
  const [categoriaActiva, setCategoriaActiva] = useState<string>('TODOS')
  const [productoDetalle, setProductoDetalle] = useState<ProductoCatalogo | null>(null)

  const categorias = ['TODOS', 'CONJUNTOS', 'VESTIDOS', 'PANTALONES', 'CASACAS', 'POLOS']

  const productosFiltrados = PRODUCTOS_MOCK.filter(prod => {
    if (categoriaActiva === 'TODOS') return true
    return prod.categoria.toUpperCase() === categoriaActiva
  })

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
                <p className="text-[11px] text-[#555555]/80 leading-normal">Muestra este código al realizar tu pedido manual.</p>
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
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#555555]/10 bg-white/60 hover:bg-white transition-all text-xs font-bold"
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
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                    categoriaActiva === cat
                      ? 'bg-[#555555] text-[#EDEAE0] border-[#555555]'
                      : 'bg-white/40 border-[#555555]/10 text-[#555555]/70 hover:bg-white/80'
                  }`}
                >
                  {cat.charAt(0) + cat.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {/* Rejilla de Productos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {productosFiltrados.map(prod => (
                <div
                  key={prod.id}
                  onClick={() => setProductoDetalle(prod)}
                  className="bg-white/50 border border-[#555555]/10 rounded-[28px] overflow-hidden cursor-pointer hover:bg-white hover:shadow-[0_16px_36px_rgba(85,85,85,0.06)] transition-all duration-300 group text-left"
                >
                  <div className="h-64 overflow-hidden relative bg-[#e4ddce]">
                    <img
                      src={prod.imagenUrl}
                      alt={prod.nombre}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute top-3 right-3 text-[9px] font-bold tracking-[0.1em] bg-[#555555] text-[#EDEAE0] px-2.5 py-0.5 rounded-full uppercase">
                      {prod.categoria}
                    </span>
                  </div>
                  <div className="p-5 space-y-2">
                    <p className="text-[10px] font-semibold text-[#555555]/50 tracking-wider uppercase font-mono">{prod.sku}</p>
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-lg text-[#555555] leading-snug">{prod.nombre}</h3>
                      <span className="font-extrabold text-lg text-[#555555] ml-2">S/ {prod.precio}</span>
                    </div>
                    <p className="text-xs text-[#555555]/70 line-clamp-2 leading-relaxed">{prod.descripcion}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Vista de Detalle (Inspirada en el Canvas Concept) */
          <div className="bg-white/80 border border-[#555555]/10 rounded-[32px] overflow-hidden shadow-sm animate-fadeIn text-left">
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Imagen Grande */}
              <div className="h-[400px] md:h-full min-h-[300px] bg-[#e4ddce] relative">
                <img
                  src={productoDetalle.imagenUrl}
                  alt={productoDetalle.nombre}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setProductoDetalle(null)}
                  className="absolute top-4 left-4 grid h-11 w-11 place-items-center rounded-full border border-[#555555]/10 bg-[#EDEAE0]/80 text-[#555555] shadow-md backdrop-blur-sm hover:bg-white transition-all"
                >
                  ←
                </button>
              </div>

              {/* Detalles */}
              <div className="p-6 md:p-8 flex flex-col justify-between space-y-6">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#555555]/55 block mb-2 font-mono">
                    {productoDetalle.categoria} · {productoDetalle.sku}
                  </span>
                  <div className="flex justify-between items-center gap-4 mb-4">
                    <h1 className="text-3xl font-semibold leading-tight text-[#555555]">{productoDetalle.nombre}</h1>
                    <span className="rounded-full bg-[#FFE4E1] px-4 py-2 text-xl font-bold tracking-tight text-[#555555]">
                      S/ {productoDetalle.precio}
                    </span>
                  </div>

                  <p className="text-[14px] leading-relaxed text-[#555555]/80 border-t border-[#555555]/10 pt-4 mb-6">
                    {productoDetalle.descripcion}
                  </p>

                  <div className="space-y-4 border-t border-[#555555]/10 pt-4">
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#555555]/50">Material / Composición</h4>
                      <p className="text-xs text-[#555555] mt-1 font-medium">{productoDetalle.material}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#555555]/50">Instrucciones de cuidado</h4>
                      <p className="text-xs text-[#555555] mt-1 italic font-medium">{productoDetalle.cuidados}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setProductoDetalle(null)}
                  className="w-full h-12 bg-[#555555] text-white hover:opacity-90 rounded-[14px] font-bold text-xs uppercase tracking-wider transition-all shadow-md mt-6"
                >
                  Volver al Catálogo
                </button>
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
