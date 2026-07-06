import { useState, useEffect } from 'react'
import type { Producto } from '../../types'
import { API_BASE } from '../../config'

// Extender interfaz de Window para TypeScript
declare global {
  interface Window {
    cloudinary: any;
  }
}

interface CatalogoAdminViewProps {
  productos: Producto[]
  fetchProductos: () => Promise<void>
}

export function CatalogoAdminView({ productos, fetchProductos }: CatalogoAdminViewProps) {
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null)
  
  // Formulario states
  const [descripcion, setDescripcion] = useState('')
  const [precio, setPrecio] = useState<number | ''>('')
  const [material, setMaterial] = useState('')
  const [cuidados, setCuidados] = useState('')
  const [imagenUrl, setImagenUrl] = useState('')

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  // Cargar dinámicamente el script del widget de Cloudinary
  useEffect(() => {
    if (!window.cloudinary) {
      const script = document.createElement('script')
      script.src = 'https://upload-widget.cloudinary.com/global/all.js'
      script.async = true
      document.body.appendChild(script)
    }
  }, [])

  // Cargar datos en el formulario al seleccionar producto
  useEffect(() => {
    if (productoSeleccionado) {
      setDescripcion(productoSeleccionado.descripcion || '')
      setPrecio(productoSeleccionado.precio !== undefined ? productoSeleccionado.precio : '')
      setMaterial(productoSeleccionado.material || '')
      setCuidados(productoSeleccionado.cuidados || '')
      setImagenUrl(productoSeleccionado.imagenUrl || '')
      setError('')
      setExito('')
    } else {
      setDescripcion('')
      setPrecio('')
      setMaterial('')
      setCuidados('')
      setImagenUrl('')
    }
  }, [productoSeleccionado])

  const abrirWidgetCloudinary = () => {
    if (!window.cloudinary) {
      setError('El servicio de subida de Cloudinary aún se está cargando. Inténtalo de nuevo en unos segundos.')
      return
    }

    const widget = window.cloudinary.createUploadWidget({
      cloudName: 'ohhdahjh',
      uploadPreset: 'preset_maferg',
      sources: ['local', 'url', 'camera'],
      multiple: false,
      cropping: true, // Habilitar recorte opcional
      croppingAspectRatio: 1, // Relación de aspecto cuadrada (1:1) perfecta para e-commerce
      showSkipCropButton: true
    }, (error: any, result: any) => {
      if (!error && result && result.event === "success") {
        setImagenUrl(result.info.secure_url)
        setExito('¡Imagen subida a Cloudinary exitosamente!')
      } else if (error) {
        setError('Error al subir la imagen a Cloudinary.')
      }
    })

    widget.open()
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productoSeleccionado) return

    setGuardando(true)
    setError('')
    setExito('')

    const updatedProduct = {
      ...productoSeleccionado,
      descripcion: descripcion.trim() || null,
      precio: precio !== '' ? Number(precio) : 0,
      material: material.trim() || null,
      cuidados: cuidados.trim() || null,
      imagenUrl: imagenUrl.trim() || null
    }

    try {
      const res = await fetch(`${API_BASE}/api/nps/admin/productos/${productoSeleccionado.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProduct)
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al guardar los cambios en la base de datos.')
        return
      }

      setExito('¡Ficha técnica de catálogo guardada con éxito!')
      
      // Recargar lista de productos del dashboard y actualizar la selección local
      await fetchProductos()
      setProductoSeleccionado(data)
    } catch {
      setError('Error de conexión con el servidor backend.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      <div>
        <h2 className="text-xl font-extrabold text-[#173c34]">Gestión de Catálogo Comercial</h2>
        <p className="text-sm text-[#4f6f66]">
          Configura descripciones, precios, materiales e imágenes de Cloudinary para las prendas del catálogo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Columna Izquierda: Listado de Prendas */}
        <div className="md:col-span-1 border border-[#dce7e4] rounded-2xl bg-[#fcfdfe] p-4 flex flex-col h-[550px]">
          <h3 className="text-xs font-extrabold tracking-wider text-[#2d5a50] uppercase mb-3">Prendas en Sistema</h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar">
            {productos.map((prod) => {
              const seleccionado = productoSeleccionado?.id === prod.id
              return (
                <button
                  key={prod.id}
                  onClick={() => setProductoSeleccionado(prod)}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                    seleccionado
                      ? 'bg-primary border-primary text-white shadow-md'
                      : 'bg-white border-[#dce7e4] hover:bg-[#f2faf7] hover:border-[#b4d2ca] text-[#2d5a50]'
                  }`}
                >
                  <div className={`h-12 w-12 rounded-lg bg-[#e4ddce] overflow-hidden flex-shrink-0 flex items-center justify-center border ${
                    seleccionado ? 'border-white/20' : 'border-[#dce7e4]'
                  }`}>
                    {prod.imagenUrl ? (
                      <img src={prod.imagenUrl} alt={prod.nombrePrenda} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-lg">👕</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-mono font-bold uppercase ${seleccionado ? 'text-white/70' : 'text-gray-400'}`}>
                      {prod.sku}
                    </p>
                    <h4 className="font-bold text-sm truncate leading-normal">{prod.nombrePrenda}</h4>
                    <p className={`text-xs truncate ${seleccionado ? 'text-white/80' : 'text-gray-500'}`}>
                      {prod.precio ? `S/ ${prod.precio.toFixed(2)}` : 'Sin precio asignado'}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Columna Derecha: Formulario de Ficha Comercial */}
        <div className="md:col-span-2 border border-[#dce7e4] rounded-2xl bg-white p-6 shadow-sm flex flex-col justify-between min-h-[550px]">
          {productoSeleccionado ? (
            <form onSubmit={handleGuardar} className="space-y-4 flex flex-col h-full justify-between">
              
              <div className="space-y-4 overflow-y-auto pr-1 no-scrollbar flex-1">
                <div className="flex items-center justify-between pb-3 border-b border-[#eef4f2]">
                  <div>
                    <span className="text-[10px] font-mono font-bold bg-[#f2faf7] border border-[#dce7e4] text-[#2d5a50] px-2 py-0.5 rounded-full uppercase">
                      {productoSeleccionado.sku}
                    </span>
                    <h3 className="font-extrabold text-lg text-[#16342d] mt-1">{productoSeleccionado.nombrePrenda}</h3>
                  </div>
                  <span className="text-xs font-semibold text-gray-400">
                    Categoría: {productoSeleccionado.categoriaInfantil || 'Ninguna'}
                  </span>
                </div>

                {/* Notificaciones de Éxito / Error */}
                {exito && (
                  <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs font-semibold">
                    {exito}
                  </div>
                )}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                    {error}
                  </div>
                )}

                {/* Grid del Formulario */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-[#2d5a50] uppercase">Precio Sugerido (S/)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={precio}
                      onChange={(e) => setPrecio(e.target.value !== '' ? Number(e.target.value) : '')}
                      className="w-full px-3 py-2 border border-[#dce7e4] rounded-xl text-sm focus:outline-none focus:border-[#47a993] transition-all font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-[#2d5a50] uppercase">Composición / Material</label>
                    <input
                      type="text"
                      placeholder="Ej. 100% Algodón Pima Orgánico"
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                      className="w-full px-3 py-2 border border-[#dce7e4] rounded-xl text-sm focus:outline-none focus:border-[#47a993] transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-[#2d5a50] uppercase">Descripción Comercial</label>
                  <textarea
                    rows={3}
                    placeholder="Describe los beneficios y diseño de la prenda..."
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    className="w-full px-3 py-2 border border-[#dce7e4] rounded-xl text-sm focus:outline-none focus:border-[#47a993] transition-all resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-[#2d5a50] uppercase">Instrucciones de Cuidado</label>
                  <input
                    type="text"
                    placeholder="Ej. Lavar a máquina con agua fría, no usar lejía."
                    value={cuidados}
                    onChange={(e) => setCuidados(e.target.value)}
                    className="w-full px-3 py-2 border border-[#dce7e4] rounded-xl text-sm focus:outline-none focus:border-[#47a993] transition-all"
                  />
                </div>

                {/* Subida de Imagen */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-extrabold text-[#2d5a50] uppercase block">Imagen del Catálogo</label>
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <button
                      type="button"
                      onClick={abrirWidgetCloudinary}
                      className="px-4 py-2.5 rounded-xl border-2 border-dashed border-[#b4d2ca] hover:border-primary text-[#2d5a50] hover:text-primary bg-[#f2faf7] hover:bg-white text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2"
                    >
                      ☁️ Subir con Cloudinary
                    </button>
                    {imagenUrl && (
                      <div className="flex-1 min-w-0 text-xs text-gray-500 font-mono truncate bg-gray-50 p-2 rounded-lg border border-gray-100">
                        {imagenUrl}
                      </div>
                    )}
                  </div>

                  {/* Preview de la imagen */}
                  {imagenUrl && (
                    <div className="mt-3 relative h-36 w-36 rounded-2xl overflow-hidden border border-[#dce7e4] bg-[#fbfdfe]">
                      <img src={imagenUrl} alt="Vista previa" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImagenUrl('')}
                        className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center text-xs shadow-md transition-all cursor-pointer font-bold"
                        title="Eliminar imagen"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>

              </div>

              {/* Botón de envío */}
              <div className="pt-4 border-t border-[#eef4f2] flex justify-end">
                <button
                  type="submit"
                  disabled={guardando}
                  className={`px-6 py-3 rounded-full bg-primary text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-md shadow-primary/10 cursor-pointer ${
                    guardando ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-hover active:scale-[0.98]'
                  }`}
                >
                  {guardando ? 'Guardando...' : 'Guardar Cambios 💾'}
                </button>
              </div>

            </form>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 p-8">
              <span className="text-5xl mb-3">🛍️</span>
              <h4 className="font-bold text-[#2d5a50]">Ninguna prenda seleccionada</h4>
              <p className="text-xs text-gray-500 max-w-xs mt-1">
                Selecciona una prenda de la lista de la izquierda para configurar su información comercial de catálogo.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
