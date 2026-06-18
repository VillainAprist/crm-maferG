import { useState, useMemo, useEffect } from 'react'
import type { PantallaPublica, NpsClasificacion, ApiResponse, LoteResumen } from '../types'
import { API_BASE } from '../config'

export function PublicSurvey({ setAdminMode }: { setAdminMode: (mode: boolean) => void }) {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const urlToken = params.get('token')

  const [token, setToken] = useState<string | null>(urlToken)
  const [manualToken, setManualToken] = useState('')
  const [cargandoDemo, setCargandoDemo] = useState(false)
  const [modoDemo, setModoDemo] = useState(false)

  const [pantalla, setPantalla] = useState<PantallaPublica>(
    token ? 'bienvenida' : 'token-invalido',
  )

  const [loteInfo, setLoteInfo] = useState<LoteResumen | null>(null)
  const [validandoLote, setValidandoLote] = useState(false)
  const [loteYaRespondido, setLoteYaRespondido] = useState(false)

  useEffect(() => {
    if (!token) return

    async function validarYObtenerResumen() {
      setValidandoLote(true)
      setError('')
      setLoteYaRespondido(false)
      try {
        const res = await fetch(`${API_BASE}/api/nps/public/lote/${token}`)
        if (res.ok) {
          const data = (await res.json()) as LoteResumen
          setLoteInfo(data)
          if (data.yaRespondido) {
            setLoteYaRespondido(true)
          } else {
            setPantalla('bienvenida')
          }
        } else {
          setPantalla('token-invalido')
        }
      } catch {
        // En caso de caída de backend, si estamos en modo demo fallback offline:
        if (token === '3fa85f64-5717-4562-b3fc-2c963f66afa6') {
          setLoteInfo({
            codigoLote: 'LOTE-2026-024',
            nombrePrenda: 'Conjunto Infantil Rayas (Demo)',
            sku: 'SKU-SET-001',
            categoriaInfantil: 'Conjuntos',
            fechaConfeccion: '2026-06-18',
            yaRespondido: false,
            cantidad: 24
          })
          setPantalla('bienvenida')
        } else {
          setPantalla('token-invalido')
        }
      } finally {
        setValidandoLote(false)
      }
    }

    validarYObtenerResumen()
  }, [token])

  // Formulario states
  const [paso, setPaso] = useState(1)
  const [mayorista, setMayorista] = useState(false)
  const [nombre, setNombre] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [aceptoDatos, setAceptoDatos] = useState(false)
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [errorDetalle, setErrorDetalle] = useState('')

  const [puntuacion, setPuntuacion] = useState<number | null>(null)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [errorTipo, setErrorTipo] = useState<string>('')
  const [resultado, setResultado] = useState<ApiResponse | null>(null)

  async function reiniciarFormulario() {
    setPaso(1)
    setMayorista(false)
    setNombre('')
    setCiudad('')
    setAceptoDatos(false)
    setEmail('')
    setTelefono('')
    setPuntuacion(null)
    setComentario('')
    setError('')
    setErrorTipo('')
    setErrorDetalle('')
    setResultado(null)

    if (token) {
      setValidandoLote(true)
      try {
        const res = await fetch(`${API_BASE}/api/nps/public/lote/${token}`)
        if (res.ok) {
          const data = (await res.json()) as LoteResumen
          setLoteInfo(data)
          setLoteYaRespondido(data.yaRespondido)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setValidandoLote(false)
      }
    }
  }


  async function cargarTokenDemo() {
    setCargandoDemo(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/nps/public/demo-token`)
      if (res.ok) {
        const data = (await res.json()) as { token_qr: string }
        const demoToken = data.token_qr
        setToken(demoToken)
        setModoDemo(false)
        window.history.replaceState(null, '', `?token=${demoToken}`)
        setPantalla('bienvenida')
      } else {
        modoDemoFallback()
      }
    } catch {
      modoDemoFallback()
    } finally {
      setCargandoDemo(false)
    }
  }

  function modoDemoFallback() {
    setModoDemo(true)
    const fakeToken = '3fa85f64-5717-4562-b3fc-2c963f66afa6'
    setToken(fakeToken)
    window.history.replaceState(null, '', `?token=${fakeToken}`)
    setPantalla('bienvenida')
  }

  function ejecutarModoDemoOffline() {
    setModoDemo(true)
    const clasificacion: NpsClasificacion = puntuacion !== null ? getClasificacion(puntuacion) : 'PASIVO';
    const codigoCupon = (clasificacion === 'PROMOTOR' && aceptoDatos) ? 'MAFERG-DEMO' + Math.random().toString(36).slice(2, 5).toUpperCase() : null
    const mensaje = clasificacion === 'DETRACTOR'
      ? 'Gracias por tu feedback. Abrimos una alerta de calidad para atender tu caso.'
      : clasificacion === 'PROMOTOR'
      ? (aceptoDatos
        ? 'Gracias por recomendarnos. Generamos tu cupon de fidelizacion.'
        : 'Gracias por recomendarnos. Tu opinion nos ayuda a seguir mejorando.')
      : 'Gracias por tu evaluacion. Seguimos mejorando nuestros productos.'
    
    const mock: ApiResponse = {
      idCliente: 1,
      idEvaluacion: 1,
      clasificacion,
      alertaCreada: clasificacion === 'DETRACTOR',
      cuponCreado: clasificacion === 'PROMOTOR' && aceptoDatos,
      codigoCupon,
      mensaje,
    }
    setResultado(mock)
    if (clasificacion === 'DETRACTOR' || clasificacion === 'PASIVO') {
      setPantalla('detractor')
    } else {
      setPantalla('promotor')
    }
  }

  async function enviarEncuesta() {
    if (puntuacion === null) return
    setError('')
    setEnviando(true)
    setResultado(null)

    try {
      const res = await fetch(`${API_BASE}/api/nps/public/ingesta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenQr: token,
          puntuacion,
          comentario,
          email: aceptoDatos ? email.trim() : '',
          telefono: aceptoDatos ? telefono.trim() : '',
          nombre: nombre.trim(),
          ciudad: ciudad.trim(),
          mayorista,
          errorTipo: errorTipo || undefined,
          errorDetalle: errorDetalle || undefined
        })
      })
      const data = (await res.json()) as ApiResponse | { error: string }
      if (!res.ok) {
        setError('error' in data ? data.error : 'Error al enviar encuesta')
        return
      }
      const okData = data as ApiResponse
      setResultado(okData)
      if (okData.clasificacion === 'DETRACTOR' || okData.clasificacion === 'PASIVO') {
        setPantalla('detractor')
      } else {
        setPantalla('promotor')
      }
    } catch {
      ejecutarModoDemoOffline()
    } finally {
      setEnviando(false)
    }
  }

  function getClasificacion(score: number): NpsClasificacion {
    if (score <= 4) return 'DETRACTOR';
    if (score <= 7) return 'PASIVO';
    return 'PROMOTOR';
  }

  function scoreColor(score: number): string {
    if (score <= 4) return 'bg-red-500 text-white border-red-500';
    if (score <= 7) return 'bg-yellow-500 text-white border-yellow-500';
    return 'bg-green-500 text-white border-green-500';
  }

  function scoreHover(score: number): string {
    if (score <= 4) return 'hover:bg-red-100 hover:text-red-700 hover:border-red-300';
    if (score <= 7) return 'hover:bg-yellow-100 hover:text-yellow-700 hover:border-yellow-300';
    return 'hover:bg-green-100 hover:text-green-700 hover:border-green-300';
  }

  function scoreBase(score: number): string {
    return puntuacion === score ? scoreColor(score) : 'bg-white text-gray-700 border-gray-300 ' + scoreHover(score)
  }

  function handlePaso2Next() {
  if (puntuacion === null) return;
  // Avanzar al paso 3 para registrar datos opcionales
  setPaso(3);
}

  return (
    <div className="w-full max-w-md mx-auto animate-fadeIn">
      <header className="mb-3 text-left">
        <h1 className="text-lg font-bold text-[#16342d] tracking-wide">
          MAFER-G Intelligent Connect
        </h1>
        <p className="text-sm text-[#4f6f66]">CRM + Calidad Textil</p>
      </header>

      <div className="bg-white rounded-[28px] border border-[#dce7e4] shadow-[0_16px_40px_rgba(25,52,44,0.15)] p-5 flex flex-col gap-4 min-h-[400px]">
        {validandoLote && (
          <div className="flex flex-col items-center justify-center flex-1 py-12 space-y-4">
            <div className="w-12 h-12 border-4 border-[#e2ebe8] border-t-[#54b8a0] rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-[#53796f]">Validando código QR...</p>
          </div>
        )}

        {!validandoLote && loteYaRespondido && (
          <div className="text-center py-8 space-y-5 animate-fadeIn">
            <div className="text-6xl animate-bounce">📝</div>
            <h2 className="text-2xl font-bold text-[#14342e]">
              Encuesta ya Respondida
            </h2>
            <p className="text-gray-500 px-4 text-sm">
              Este lote o pedido ({loteInfo?.codigoLote}) ya ha sido calificado previamente. ¡Muchas gracias por tu valioso tiempo!
            </p>
            {loteInfo && (
              <div className="border border-dashed border-[#b8d0c6] rounded-xl p-4 bg-[#f8fffc] text-left text-xs space-y-1.5 mx-2">
                <p className="text-[#53796f]"><strong>Prenda:</strong> {loteInfo.nombrePrenda}</p>
                <p className="text-[#53796f]"><strong>SKU:</strong> {loteInfo.sku}</p>
                <p className="text-[#53796f]"><strong>Cantidad:</strong> {loteInfo.cantidad} unidades</p>
                <p className="text-[#53796f]"><strong>Fecha Confección:</strong> {loteInfo.fechaConfeccion}</p>
              </div>
            )}
            <button
              className="w-full mt-2 py-3 rounded-full border-2 border-gray-200 text-gray-600 font-bold text-sm cursor-pointer hover:border-[#54b8a0] hover:text-[#54b8a0] transition-all"
              onClick={() => setAdminMode(true)}
            >
              Ir al Panel Administrativo
            </button>
          </div>
        )}

        {!validandoLote && !loteYaRespondido && pantalla === 'token-invalido' && (
          <div className="text-center py-6 space-y-3 animate-fadeIn">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center shadow-inner">
              <span className="text-red-500 text-3xl font-bold">!</span>
            </div>
            <h2 className="text-xl font-bold text-red-700">QR Inválido</h2>
            <p className="text-gray-500 text-sm">
              Escanea un código QR válido o usa una opción de prueba.
            </p>

            <div className="border-t border-gray-100 pt-4 mt-2 space-y-3">
              <button
                className="w-full py-3 rounded-full bg-[#1c4a3f] text-white font-bold cursor-pointer hover:bg-[#153830] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                onClick={cargarTokenDemo}
                disabled={cargandoDemo}
              >
                {cargandoDemo ? 'Cargando...' : 'Usar token de prueba'}
              </button>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">o</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <label className="flex flex-col gap-1.5 text-left">
                <span className="text-xs font-semibold text-[#53796f]">
                  Ingresa un token manualmente
                </span>
                <div className="flex gap-2">
                  <input
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="UUID del token"
                    className="flex-1 border border-[#d0ded9] rounded-xl px-3 py-2.5 text-sm text-[#16342d] bg-[#fafdfe] focus:outline-2 focus:outline-[rgba(71,169,147,0.3)]"
                  />
                  <button
                    className="px-4 py-2.5 rounded-xl bg-[#54b8a0] text-white text-sm font-bold cursor-pointer hover:bg-[#459e89] transition-all disabled:opacity-50"
                    onClick={() => {
                      if (manualToken.trim()) {
                        setToken(manualToken.trim())
                        window.history.replaceState(null, '', `?token=${manualToken.trim()}`)
                      }
                    }}
                    disabled={!manualToken.trim()}
                  >
                    Ir
                  </button>
                </div>
              </label>
            </div>
          </div>
        )}

        {!validandoLote && !loteYaRespondido && pantalla === 'bienvenida' && (
          <div className="animate-fadeIn space-y-4">
            {modoDemo && (
              <div className="text-center">
                <span className="inline-block text-[10px] font-bold text-yellow-700 bg-yellow-100 border border-yellow-300 px-2.5 py-1 rounded-full shadow-sm">
                  MODO DEMO (offline)
                </span>
              </div>
            )}
            
            {loteInfo ? (
              <div className="border border-[#d6e5e2] bg-gradient-to-br from-[#f2faf7] to-[#ffffff] rounded-2xl p-4 text-left shadow-inner">
                <span className="inline-block text-[9px] font-extrabold bg-[#1e4a40] text-white px-2.5 py-0.5 rounded-full mb-1">
                  Resumen de Compra
                </span>
                <div className="space-y-1.5 mt-1">
                  <p className="text-xs text-[#53796f] flex justify-between">
                    <span>Lote:</span> <span className="font-bold text-[#14342e] font-mono">{loteInfo.codigoLote}</span>
                  </p>
                  <p className="text-sm text-[#14342e] font-bold">
                    {loteInfo.nombrePrenda}
                  </p>
                  <p className="text-xs text-[#53796f] flex justify-between pt-1 border-t border-dashed border-[#dce7e4]">
                    <span>SKU:</span> <span className="font-mono text-gray-500">{loteInfo.sku}</span>
                  </p>
                  {loteInfo.cantidad && (
                    <p className="text-xs text-[#53796f] flex justify-between">
                      <span>Cantidad:</span> <span className="font-bold text-[#14342e]">{loteInfo.cantidad} unidades</span>
                    </p>
                  )}
                  {loteInfo.categoriaInfantil && (
                    <p className="text-xs text-[#53796f] flex justify-between">
                      <span>Categoría:</span> <span>{loteInfo.categoriaInfantil}</span>
                    </p>
                  )}
                  {loteInfo.fechaConfeccion && (
                    <p className="text-[10px] text-gray-400 text-right pt-1">
                      Fecha: {loteInfo.fechaConfeccion}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-[140px] rounded-2xl bg-gradient-to-br from-[#c7ebe1] via-[#f5f8e6] to-[#e8fff8] border border-[#d6e5e2] flex items-center justify-center">
                <span className="text-5xl opacity-80">✨</span>
              </div>
            )}

            <h1 className="text-2xl font-bold text-[#14342e] leading-tight text-center">
              ¿Cómo fue tu experiencia?
            </h1>
            <p className="text-gray-500 text-center text-sm px-2">
              Ayúdanos a mejorar la calidad de nuestros productos textiles respondiendo 3 breves preguntas.
            </p>
            <button
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#54b8a0] to-[#47a993] text-white font-bold uppercase tracking-wider cursor-pointer hover:opacity-90 transition-all shadow-md mt-2"
              onClick={() => setPantalla('encuesta')}
            >
              Iniciar encuesta
            </button>
          </div>
        )}

        {!validandoLote && !loteYaRespondido && pantalla === 'encuesta' && (
          <div className="flex flex-col h-full animate-fadeIn">
            <div className="flex items-center justify-between text-xs font-semibold text-[#53796f] mb-4">
              <span>PASO {paso} DE 3</span>
              <div className="flex gap-1.5">
                <div className={`w-6 h-1.5 rounded-full transition-all duration-300 ${paso >= 1 ? 'bg-[#54b8a0]' : 'bg-[#e2ebe8]'}`} />
                <div className={`w-6 h-1.5 rounded-full transition-all duration-300 ${paso >= 2 ? 'bg-[#54b8a0]' : 'bg-[#e2ebe8]'}`} />
                <div className={`w-6 h-1.5 rounded-full transition-all duration-300 ${paso >= 3 ? 'bg-[#54b8a0]' : 'bg-[#e2ebe8]'}`} />
              </div>
            </div>

            {paso === 1 && (
              <div className="space-y-5 flex-1">
                <div>
                  <h2 className="text-lg font-bold text-[#14342e] leading-snug">
                    ¿Tu compra fue al por mayor o al por menor?
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className={`p-4 rounded-2xl border-2 text-left cursor-pointer transition-all flex flex-col justify-between h-24 ${
                      mayorista
                        ? 'border-[#54b8a0] bg-[#f2faf7] text-[#14342e] shadow-sm'
                        : 'border-[#dce7e4] bg-[#fafdfe] text-gray-500 hover:border-gray-300'
                    }`}
                    onClick={() => setMayorista(true)}
                  >
                    <span className="text-2xl">🏢</span>
                    <span className="text-sm font-bold">Mayorista / B2B</span>
                  </button>
                  <button
                    type="button"
                    className={`p-4 rounded-2xl border-2 text-left cursor-pointer transition-all flex flex-col justify-between h-24 ${
                      !mayorista
                        ? 'border-[#54b8a0] bg-[#f2faf7] text-[#14342e] shadow-sm'
                        : 'border-[#dce7e4] bg-[#fafdfe] text-gray-500 hover:border-gray-300'
                    }`}
                    onClick={() => setMayorista(false)}
                  >
                    <span className="text-2xl">👤</span>
                    <span className="text-sm font-bold">Minorista / B2C</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <label className="flex flex-col gap-1.5 text-left">
                    <span className="text-xs font-semibold text-[#53796f]">
                      Nombre / Razón Social <span className="font-normal text-gray-400">(opcional)</span>
                    </span>
                    <input
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Tu nombre o empresa"
                      className="border border-[#d0ded9] rounded-xl px-3 py-2.5 text-sm text-[#16342d] bg-white focus:outline-2 focus:outline-[rgba(71,169,147,0.3)] transition-all"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5 text-left">
                    <span className="text-xs font-semibold text-[#53796f]">
                      Ciudad <span className="font-normal text-gray-400">(opcional)</span>
                    </span>
                    <input
                      value={ciudad}
                      onChange={(e) => setCiudad(e.target.value)}
                      placeholder="Ej. Lima"
                      className="border border-[#d0ded9] rounded-xl px-3 py-2.5 text-sm text-[#16342d] bg-white focus:outline-2 focus:outline-[rgba(71,169,147,0.3)] transition-all"
                    />
                  </label>
                </div>

                <div className="mt-auto pt-4">
                  <button
                    type="button"
                    className="w-full py-3.5 rounded-full bg-[#1c4a3f] text-white font-bold cursor-pointer hover:bg-[#153830] transition-all shadow-md"
                    onClick={() => setPaso(2)}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}

            {paso === 2 && (
              <div className="space-y-5 flex-1">
                <h2 className="text-lg font-bold text-[#14342e]">
                  En una escala del 0 al 10, ¿qué tan satisfecho estás con la calidad de este lote?
                </h2>

                <div className="flex flex-wrap gap-1.5 justify-center" role="group" aria-label="Puntuación">
                  {Array.from({ length: 11 }, (_, i) => i).map((score) => (
                    <button
                      key={score}
                      type="button"
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg border-2 text-sm font-bold cursor-pointer transition-all duration-200 ${scoreBase(score)}`}
                      onClick={() => setPuntuacion(score)}
                    >
                      {score}
                    </button>
                  ))}
                </div>

                <div className="flex justify-between px-2 text-xs font-semibold text-gray-400">
                  <span>Nada satisfecho</span>
                  <span>Muy satisfecho</span>
                </div>

                {puntuacion !== null && puntuacion <= 4 && (
                  <div className="animate-fadeIn">
                    <p className="text-sm font-bold text-[#14342e] mb-2">¿Cuál es el problema?</p>
                    <select
                      className="w-full p-2 border rounded-lg bg-white text-gray-600"
                      value={errorTipo}
                      onChange={(e) => setErrorTipo(e.target.value)}
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="Calidad del tejido">Calidad del tejido</option>
                      <option value="Entrega tardía">Entrega tardía</option>
                      <option value="Producto dañado">Producto dañado</option>
                      <option value="Falta de stock">Falta de stock</option>
                      <option value="Otro">Otro</option>
                    </select>
                    {/* Campo para "Otro" */}
                    {errorTipo === 'Otro' && (
                      <div className="mt-2">
                        <label className="flex flex-col gap-1.5 text-left">
                          <span className="text-xs font-semibold text-[#53796f]">Detalle del problema</span>
                          <input
                            type="text"
                            value={errorDetalle}
                            onChange={(e) => setErrorDetalle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                            placeholder="Describe el error..."
                            className="border border-[#d0ded9] rounded-xl px-3 py-2.5 text-sm text-[#16342d] bg-white focus:outline-2 focus:outline-[rgba(71,169,147,0.3)] transition-all"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                )}

                <label className="flex flex-col gap-1.5 text-left">
                  <span className="text-xs font-semibold text-[#53796f]">
                    Comentario <span className="font-normal text-gray-400">(opcional)</span>
                  </span>
                  <textarea
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    placeholder="Cuéntanos tu experiencia..."
                    className="border border-[#d0ded9] rounded-xl px-3 py-2.5 text-sm text-[#16342d] bg-white min-h-[80px] resize-y focus:outline-2 focus:outline-[rgba(71,169,147,0.3)] transition-all"
                  />
                </label>

                <div className="flex gap-3 mt-auto pt-4">
                  <button
                    type="button"
                    className="flex-1 py-3.5 rounded-full border border-[#d0ded9] text-gray-600 font-bold text-sm cursor-pointer hover:bg-gray-50 transition-all"
                    onClick={() => setPaso(1)}
                  >
                    Atrás
                  </button>
                  <button
                    type="button"
                    className="flex-1 py-3.5 rounded-full bg-[#1c4a3f] text-white font-bold text-sm cursor-pointer hover:bg-[#153830] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handlePaso2Next}
                    disabled={puntuacion === null || (puntuacion <= 4 && (!errorTipo || (errorTipo === 'Otro' && !errorDetalle.trim())))}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}

            {paso === 3 && (
              <div className="space-y-4 flex-1 text-left">
                <div>
                  <h2 className="text-lg font-bold text-[#14342e]">
                    Registro opcional de beneficios
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    No es obligatorio registrarse para enviar tu calificación.
                  </p>
                </div>

                <label className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${aceptoDatos ? 'border-[#54b8a0] bg-[#f2faf7]' : 'border-[#dce7e4] bg-[#fafdfe] hover:border-gray-300'}`}>
                  <input
                    type="checkbox"
                    checked={aceptoDatos}
                    onChange={(e) => setAceptoDatos(e.target.checked)}
                    className="mt-1 accent-[#54b8a0] w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-bold text-[#14342e] block mb-0.5">
                      Deseo registrar mis datos
                    </span>
                    <span className="text-xs text-gray-500 block leading-tight">
                      Para recibir cupones de descuento y promociones exclusivas de MAFER-G.
                    </span>
                  </div>
                </label>

                {aceptoDatos && (
                  <div className="space-y-3 p-4 border border-[#e2ebe8] rounded-2xl bg-white shadow-sm animate-fadeIn">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-[#53796f]">Correo electrónico</span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="correo@ejemplo.com"
                        className="border border-[#d0ded9] rounded-xl px-3 py-2.5 text-sm text-[#16342d] bg-white focus:outline-2 focus:outline-[rgba(71,169,147,0.3)] transition-all"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-[#53796f]">Teléfono</span>
                      <input
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        placeholder="Ej. 987654321"
                        className="border border-[#d0ded9] rounded-xl px-3 py-2.5 text-sm text-[#16342d] bg-white focus:outline-2 focus:outline-[rgba(71,169,147,0.3)] transition-all"
                      />
                    </label>
                    {!email.trim() && !telefono.trim() && (
                      <p className="text-xs text-[#a06d15] bg-[#fff8eb] border border-[#f5ddb5] px-3 py-2 rounded-lg font-medium">
                        Ingresa al menos un correo o teléfono para recibir tu cupón.
                      </p>
                    )}
                  </div>
                )}

                {error && <p className="text-red-600 text-sm font-semibold bg-red-50 p-2 rounded-lg">{error}</p>}

                <div className="flex gap-3 mt-auto pt-4">
                  <button
                    type="button"
                    className="flex-1 py-3.5 rounded-full border border-[#d0ded9] text-gray-600 font-bold text-sm cursor-pointer hover:bg-gray-50 transition-all"
                    onClick={() => setPaso(2)}
                    disabled={enviando}
                  >
                    Atrás
                  </button>
                  <button
                    type="button"
                    className="flex-1 py-3.5 rounded-full bg-gradient-to-r from-[#54b8a0] to-[#47a993] text-white font-bold text-sm cursor-pointer hover:opacity-90 transition-all shadow-md disabled:opacity-50 flex items-center justify-center"
                    onClick={enviarEncuesta}
                    disabled={enviando || (aceptoDatos && !email.trim() && !telefono.trim())}
                  >
                    {enviando ? 'Enviando...' : 'Enviar encuesta'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {pantalla === 'promotor' && (
          <div className="text-center py-8 space-y-5 animate-fadeIn">
            <div className="text-6xl animate-bounce">🎉</div>
            <h2 className="text-2xl font-bold text-green-700">
              ¡Gracias por tu recomendación!
            </h2>
            <p className="text-gray-500 px-4">
              Tu opinión nos ayuda a seguir mejorando nuestros productos.
            </p>
            {resultado?.codigoCupon && (
              <div className="border-2 border-dashed border-[#7cb9aa] rounded-xl p-5 bg-[#f4fffb] shadow-sm transform transition-all hover:scale-105">
                <p className="text-xs text-[#4f6f66] font-bold uppercase mb-2 tracking-wider">Tu cupón de fidelización</p>
                <p className="font-mono font-bold text-2xl text-[#227e69] tracking-widest bg-white py-2 rounded-lg border border-[#c4e6dc]">
                  {resultado.codigoCupon}
                </p>
                <p className="text-xs text-gray-400 mt-2">Válido por 30 días en tu próxima compra</p>
              </div>
            )}
            <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100">{resultado?.mensaje}</p>
            <button
              className="w-full mt-2 py-3 rounded-full border-2 border-gray-200 text-gray-600 font-bold text-sm cursor-pointer hover:border-[#54b8a0] hover:text-[#54b8a0] transition-all"
              onClick={() => {
                reiniciarFormulario()
                setPantalla('bienvenida')
              }}
            >
              Responder otra encuesta
            </button>
          </div>
        )}

        {pantalla === 'detractor' && (
          <div className="text-center py-8 space-y-5 animate-fadeIn">
            <div className="text-6xl opacity-90">💙</div>
            <h2 className="text-2xl font-bold text-[#14342e]">
              Gracias por indicarnos el problema
            </h2>
            <p className="text-gray-500 px-4">
              Hemos registrado el tipo de error que seleccionaste y nuestro equipo lo revisará.
            </p>
            {resultado?.mensaje && (
              <p className="text-sm text-[#54796f] italic bg-[#f2faf7] p-3 rounded-lg border border-[#d6e5e2]">{resultado.mensaje}</p>
            )}
            <button
              className="w-full mt-2 py-3 rounded-full border-2 border-gray-200 text-gray-600 font-bold text-sm cursor-pointer hover:border-[#14342e] hover:text-[#14342e] transition-all"
              onClick={() => {
                reiniciarFormulario()
                setPantalla('bienvenida')
              }}
            >
              Responder otra encuesta
            </button>
          </div>
        )}
      </div>

      <footer className="mt-6 text-center">
        <button
          className="text-xs font-semibold text-gray-400 hover:text-[#1c4a3f] cursor-pointer transition-colors px-4 py-2"
          onClick={() => setAdminMode(true)}
        >
          Panel Administrativo
        </button>
      </footer>
    </div>
  )
}
