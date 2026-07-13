import { useState, useMemo, useEffect } from 'react'
import type { PantallaPublica, ApiResponse, LoteResumen } from '../../types'
import { API_BASE } from '../../config'

export function PublicSurvey({
  setAdminMode,
  onNavigateToCatalog
}: {
  setAdminMode: (mode: boolean) => void
  onNavigateToCatalog: (coupon: string | null) => void
}) {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const urlToken = params.get('token')

  const [token, setToken] = useState<string | null>(urlToken)
  const [manualToken, setManualToken] = useState('')

  const [pantalla, setPantalla] = useState<PantallaPublica>('bienvenida')

  const [loteInfo, setLoteInfo] = useState<LoteResumen | null>(null)
  const [validandoLote, setValidandoLote] = useState(false)
  const [loteYaRespondido, setLoteYaRespondido] = useState(false)

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
            if (data.clienteNombre) setNombre(data.clienteNombre)
            if (data.clienteCiudad) setCiudad(data.clienteCiudad)
            if (data.clienteEmail) setEmail(data.clienteEmail)
            if (data.clienteTelefono) setTelefono(data.clienteTelefono)
            if (data.clienteTipo) setMayorista(data.clienteTipo === 'B2B')
            if (data.clienteEmail || data.clienteTelefono) {
              setAceptoDatos(true)
            }
          }
        } else {
          setPantalla('token-invalido')
        }
      } catch {
        setPantalla('token-invalido')
        setError('Error de conexión con el servidor. No se pudieron cargar los datos.')
      } finally {
        setValidandoLote(false)
      }
    }

    validarYObtenerResumen()
  }, [token])

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
          if (!data.yaRespondido) {
            if (data.clienteNombre) setNombre(data.clienteNombre)
            if (data.clienteCiudad) setCiudad(data.clienteCiudad)
            if (data.clienteEmail) setEmail(data.clienteEmail)
            if (data.clienteTelefono) setTelefono(data.clienteTelefono)
            if (data.clienteTipo) setMayorista(data.clienteTipo === 'B2B')
            if (data.clienteEmail || data.clienteTelefono) {
              setAceptoDatos(true)
            }
          }
        }
      } catch (e) {
        console.error(e)
      } finally {
        setValidandoLote(false)
      }
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
      if (okData.clasificacion === 'DETRACTOR') {
        setPantalla('detractor')
      } else if (okData.clasificacion === 'PASIVO') {
        setPantalla('pasivo')
      } else {
        setPantalla('promotor')
      }
    } catch {
      setError('Error de conexión. No se pudo enviar la encuesta.')
    } finally {
      setEnviando(false)
    }
  }



  function scoreColor(score: number): string {
    if (score <= 4) return 'bg-red-500 text-white border-red-500 shadow-sm shadow-red-200';
    if (score <= 7) return 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-200';
    return 'bg-accent text-white border-accent shadow-sm shadow-accent-200';
  }

  function scoreHover(score: number): string {
    if (score <= 4) return 'hover:bg-red-50 hover:text-red-700 hover:border-red-300';
    if (score <= 7) return 'hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300';
    return 'hover:bg-accent-light hover:text-accent-dark hover:border-accent-dark/30';
  }

  function scoreBase(score: number): string {
    return puntuacion === score ? scoreColor(score) : 'bg-white text-gray-700 border-border-primary ' + scoreHover(score)
  }

  function handlePaso2Next() {
    if (puntuacion === null) return;
    setPaso(3);
  }

  return (
    <div className="w-full max-w-md mx-auto animate-fadeIn px-4 sm:px-0">
      <header className="mb-4 flex items-center gap-3 text-left">
        <img
          src="/maferG-logo/mafergLOGO.png"
          alt="Logo MAFER-G"
          className="h-10 w-auto object-contain"
        />
        <div>
          <div className="text-xs font-extrabold uppercase tracking-widest text-accent">
            MAFER-G Intelligent Connect
          </div>
          <p className="text-sm text-secondary font-medium">CRM + Calidad Textil</p>
        </div>
      </header>

      <div className="bg-white rounded-[28px] border border-border-primary shadow-[0_16px_40px_rgba(25,52,44,0.08)] p-6 flex flex-col gap-4 min-h-[440px] transition-all duration-300">
        {validandoLote && (
          <div className="space-y-4 w-full animate-pulse flex-1 flex flex-col justify-center">
            <div className="h-5 w-1/3 bg-gray-200 rounded-full skeleton mb-2"></div>
            <div className="border border-border-light bg-gray-50/50 rounded-2xl p-4 space-y-3">
              <div className="h-3 w-1/4 bg-gray-200 rounded skeleton"></div>
              <div className="h-5 w-3/4 bg-gray-200 rounded skeleton"></div>
              <div className="h-3 w-1/2 bg-gray-200 rounded skeleton"></div>
            </div>
            <div className="h-8 w-full bg-gray-200 rounded skeleton mt-6"></div>
            <div className="h-4 w-5/6 bg-gray-200 rounded skeleton"></div>
            <div className="h-12 w-full bg-gray-200 rounded-full skeleton mt-4"></div>
          </div>
        )}

        {!validandoLote && loteYaRespondido && (
          <div className="text-center py-6 space-y-5 animate-scaleIn flex-1 flex flex-col justify-center">
            <div className="text-6xl animate-bounce">📝</div>
            <h1 className="text-2xl font-extrabold text-primary leading-tight">
              Encuesta ya Respondida
            </h1>
            <p className="text-secondary text-sm leading-relaxed px-2">
              Este lote o pedido ({loteInfo?.codigoLote}) ya ha sido calificado previamente. ¡Muchas gracias por tu valioso tiempo!
            </p>
            {loteInfo && (
              <div className="border border-dashed border-[#b8d0c6] rounded-2xl p-4 bg-[#f8fffc] text-left text-xs space-y-2 mx-1 shadow-sm">
                <p className="text-secondary"><strong>Prenda:</strong> {loteInfo.nombrePrenda}</p>
                <p className="text-secondary"><strong>SKU:</strong> <span className="font-mono">{loteInfo.sku}</span></p>
                <p className="text-secondary"><strong>Cantidad:</strong> {loteInfo.cantidad} unidades</p>
                <p className="text-secondary"><strong>Fecha Confección:</strong> {loteInfo.fechaConfeccion}</p>
              </div>
            )}
            <button
              className="w-full mt-4 py-3.5 rounded-full bg-primary text-white font-extrabold uppercase tracking-wider cursor-pointer hover:bg-primary-hover active:scale-[0.98] transition-all shadow-md shadow-primary/10 flex items-center justify-center gap-2"
              onClick={() => onNavigateToCatalog(null)}
            >
              Ver Catálogo de Colección 👕
            </button>
          </div>
        )}

        {!validandoLote && !loteYaRespondido && pantalla === 'token-invalido' && (
          <div className="text-center py-6 space-y-4 animate-scaleIn flex-1 flex flex-col justify-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-50 border border-red-100 flex items-center justify-center shadow-inner">
              <span className="text-red-500 text-3xl font-extrabold">!</span>
            </div>
            <h1 className="text-xl font-extrabold text-red-700">Código QR Inválido</h1>
            <p className="text-secondary text-sm leading-relaxed">
              No hemos podido identificar esta compra. Por favor, escanea un código QR válido o ingresa el código de forma manual.
            </p>

            <div className="border-t border-border-light pt-5 mt-2 space-y-4">
              <div className="text-left space-y-2">
                <span className="text-xs font-bold text-secondary">Ingresar código de forma manual</span>
                <div className="flex gap-2">
                  <input
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="Introduce el UUID del token"
                    className="flex-1 border border-border-primary rounded-xl px-4 py-3 text-sm text-primary bg-[#fafdfe] focus:outline-2 focus:outline-accent/30 transition-all font-mono"
                  />
                  <button
                    className="px-5 py-3 rounded-xl bg-accent text-white text-sm font-bold cursor-pointer hover:bg-accent-dark transition-all duration-300 disabled:opacity-50"
                    onClick={() => {
                      if (manualToken.trim()) {
                        setToken(manualToken.trim())
                        window.history.replaceState(null, '', `?token=${manualToken.trim()}`)
                      }
                    }}
                    disabled={!manualToken.trim()}
                  >
                    Validar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {!validandoLote && !loteYaRespondido && pantalla === 'bienvenida' && (
          <div className="animate-fadeIn space-y-5 flex-1 flex flex-col justify-between">
            <div className="space-y-4">

              
              {loteInfo ? (
                <div className="border border-border-light bg-gradient-to-br from-primary-light to-white rounded-2xl p-5 text-left shadow-sm">
                  <span className="inline-block text-[9px] font-extrabold bg-primary text-white px-2.5 py-0.5 rounded-full mb-2 uppercase tracking-wider">
                    Detalles de tu compra
                  </span>
                  <div className="space-y-2 mt-1">
                    <p className="text-xs text-secondary flex justify-between">
                      <span>Lote de confección:</span> <span className="font-bold text-primary font-mono">{loteInfo.codigoLote}</span>
                    </p>
                    <p className="text-base text-primary font-extrabold">
                      {loteInfo.nombrePrenda}
                    </p>
                    <div className="border-t border-dashed border-border-primary pt-2 space-y-1.5">
                      <p className="text-xs text-secondary flex justify-between">
                        <span>SKU:</span> <span className="font-mono text-secondary font-semibold">{loteInfo.sku}</span>
                      </p>
                      {loteInfo.cantidad && (
                        <p className="text-xs text-secondary flex justify-between">
                          <span>Cantidad adquirida:</span> <span className="font-bold text-primary">{loteInfo.cantidad} unidades</span>
                        </p>
                      )}
                      {loteInfo.categoriaInfantil && (
                        <p className="text-xs text-secondary flex justify-between">
                          <span>Categoría:</span> <span className="font-medium text-primary">{loteInfo.categoriaInfantil}</span>
                        </p>
                      )}
                    </div>
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

              <div className="space-y-2 text-center">
                <h1 className="text-2xl font-extrabold text-primary leading-tight">
                  ¿Cómo fue tu experiencia?
                </h1>
                <p className="text-secondary text-sm px-2 leading-relaxed">
                  Ayúdanos a mejorar la calidad de nuestros productos textiles respondiendo 3 breves preguntas.
                </p>
              </div>
            </div>

            <button
              className="w-full py-4 rounded-full bg-gradient-to-r from-accent to-[#47a993] text-white font-extrabold uppercase tracking-wider cursor-pointer hover:opacity-95 active:scale-[0.98] transition-all shadow-md shadow-accent/20 mt-4"
              onClick={() => setPantalla('encuesta')}
            >
              Iniciar encuesta
            </button>
          </div>
        )}

        {!validandoLote && !loteYaRespondido && pantalla === 'encuesta' && (
          <div className="flex flex-col h-full animate-fadeIn flex-1">
            <div className="flex items-center justify-between text-xs font-bold text-secondary mb-5">
              <span>PASO {paso} DE 3</span>
              <div className="flex gap-2">
                <div className={`w-8 h-2 rounded-full transition-all duration-300 ${paso >= 1 ? 'bg-accent' : 'bg-border-light'}`} />
                <div className={`w-8 h-2 rounded-full transition-all duration-300 ${paso >= 2 ? 'bg-accent' : 'bg-border-light'}`} />
                <div className={`w-8 h-2 rounded-full transition-all duration-300 ${paso >= 3 ? 'bg-accent' : 'bg-border-light'}`} />
              </div>
            </div>

            {paso === 1 && (
              <div className="space-y-5 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-extrabold text-primary leading-snug">
                      ¿Tu compra fue al por mayor o al por menor?
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      className={`p-4 rounded-2xl border-2 text-left cursor-pointer transition-all flex flex-col justify-between h-28 ${
                        mayorista
                          ? 'border-accent bg-accent-light/50 text-primary shadow-sm shadow-accent/10'
                          : 'border-border-primary bg-[#fafdfe] text-gray-400 hover:border-gray-300'
                      }`}
                      onClick={() => setMayorista(true)}
                    >
                      <span className="text-3xl">🏢</span>
                      <span className="text-sm font-extrabold">Mayorista / B2B</span>
                    </button>
                    <button
                      type="button"
                      className={`p-4 rounded-2xl border-2 text-left cursor-pointer transition-all flex flex-col justify-between h-28 ${
                        !mayorista
                          ? 'border-accent bg-accent-light/50 text-primary shadow-sm shadow-accent/10'
                          : 'border-border-primary bg-[#fafdfe] text-gray-400 hover:border-gray-300'
                      }`}
                      onClick={() => setMayorista(false)}
                    >
                      <span className="text-3xl">👤</span>
                      <span className="text-sm font-extrabold">Minorista / B2C</span>
                    </button>
                  </div>

                  <div className="space-y-3 pt-2">
                    <label className="flex flex-col gap-1.5 text-left">
                      <span className="text-xs font-bold text-secondary">
                        Nombre / Razón Social <span className="font-normal text-gray-400">(opcional)</span>
                      </span>
                      <input
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Tu nombre o el de tu empresa"
                        className="border border-border-primary rounded-xl px-4 py-3 text-sm text-primary bg-white focus:outline-2 focus:outline-accent/30 transition-all shadow-sm"
                      />
                    </label>

                    <label className="flex flex-col gap-1.5 text-left">
                      <span className="text-xs font-bold text-secondary">
                        Ciudad <span className="font-normal text-gray-400">(opcional)</span>
                      </span>
                      <input
                        value={ciudad}
                        onChange={(e) => setCiudad(e.target.value)}
                        placeholder="Ej. Lima"
                        className="border border-border-primary rounded-xl px-4 py-3 text-sm text-primary bg-white focus:outline-2 focus:outline-accent/30 transition-all shadow-sm"
                      />
                    </label>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    className="w-full py-3.5 rounded-full bg-primary text-white font-extrabold hover:bg-primary-dark cursor-pointer transition-all duration-300 shadow-md shadow-primary/10"
                    onClick={() => setPaso(2)}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}

            {paso === 2 && (
              <div className="space-y-5 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <h2 className="text-lg font-extrabold text-primary leading-snug text-left">
                    En una escala del 0 al 10, ¿qué tan satisfecho estás con la calidad de este lote?
                  </h2>

                  {/* 48px large touch targets grid */}
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 justify-center" role="group" aria-label="Puntuación">
                    {Array.from({ length: 11 }, (_, i) => i).map((score) => (
                      <button
                        key={score}
                        type="button"
                        className={`h-12 rounded-xl border text-sm font-extrabold cursor-pointer transition-all duration-200 flex items-center justify-center ${scoreBase(score)}`}
                        onClick={() => setPuntuacion(score)}
                      >
                        {score}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-between px-2 text-xs font-bold text-gray-400">
                    <span>Nada satisfecho</span>
                    <span>Muy satisfecho</span>
                  </div>

                  {puntuacion !== null && puntuacion <= 4 && (
                    <div className="animate-fadeIn space-y-2 mt-2">
                      <p className="text-sm font-extrabold text-primary text-left">¿Cuál fue el inconveniente?</p>
                      <select
                        className="w-full p-3 border border-border-primary rounded-xl bg-white text-gray-700 font-medium focus:outline-2 focus:outline-accent/30 shadow-sm"
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
                      
                      {errorTipo === 'Otro' && (
                        <div className="mt-2">
                          <label className="flex flex-col gap-1.5 text-left">
                            <span className="text-xs font-bold text-secondary">Detalle del problema</span>
                            <input
                              type="text"
                              value={errorDetalle}
                              onChange={(e) => setErrorDetalle(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                              placeholder="Describe brevemente el error..."
                              className="border border-border-primary rounded-xl px-4 py-3 text-sm text-primary bg-white focus:outline-2 focus:outline-accent/30 transition-all shadow-sm"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  <label className="flex flex-col gap-1.5 text-left">
                    <span className="text-xs font-bold text-secondary">
                      Comentario <span className="font-normal text-gray-400">(opcional)</span>
                    </span>
                    <textarea
                      value={comentario}
                      onChange={(e) => setComentario(e.target.value)}
                      placeholder="Cuéntanos más detalles de tu experiencia..."
                      className="border border-border-primary rounded-xl px-4 py-3 text-sm text-primary bg-white min-h-[90px] resize-y focus:outline-2 focus:outline-accent/30 transition-all shadow-sm"
                    />
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    className="flex-1 py-3.5 rounded-full border border-border-primary text-secondary font-bold text-sm cursor-pointer hover:bg-gray-50 transition-all"
                    onClick={() => setPaso(1)}
                  >
                    Atrás
                  </button>
                  <button
                    type="button"
                    className="flex-1 py-3.5 rounded-full bg-primary text-white font-bold text-sm cursor-pointer hover:bg-primary-hover transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handlePaso2Next}
                    disabled={puntuacion === null || (puntuacion <= 4 && (!errorTipo || (errorTipo === 'Otro' && !errorDetalle.trim())))}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}

            {paso === 3 && (
              <div className="space-y-5 flex-1 text-left animate-fadeIn flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-extrabold text-primary leading-tight">
                      Registro Opcional de Beneficios
                    </h2>
                    <p className="text-xs text-secondary mt-1">
                      No es obligatorio registrarse para enviar tu calificación, pero te da acceso a beneficios.
                    </p>
                  </div>

                  {/* Incentive Card - displayed BEFORE checkbox to motivate */}
                  <div className="border border-accent/25 bg-accent-light/50 rounded-2xl p-4 flex gap-3 items-center shadow-sm">
                    <span className="text-3xl shrink-0">🎁</span>
                    <div>
                      <h3 className="text-xs font-extrabold text-[#227e69] uppercase tracking-wider">
                        ¡Obtén un Beneficio Especial!
                      </h3>
                      <p className="text-[11px] text-secondary leading-normal mt-0.5">
                        Si tu puntuación es de **8 a 10 (Promotor)** y registras tus datos, te enviaremos un **cupón de descuento de fidelización** exclusivo al instante.
                      </p>
                    </div>
                  </div>

                  <label className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${aceptoDatos ? 'border-accent bg-accent-light' : 'border-border-primary bg-[#fafdfe] hover:border-gray-300'}`}>
                    <input
                      type="checkbox"
                      checked={aceptoDatos}
                      onChange={(e) => setAceptoDatos(e.target.checked)}
                      className="mt-1 accent-accent w-4 h-4 cursor-pointer"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-bold text-primary block mb-0.5">
                        Deseo registrar mis datos
                      </span>
                      <span className="text-[11px] text-secondary block leading-tight">
                        Para recibir cupones de descuento y promociones exclusivas de MAFER-G.
                      </span>
                    </div>
                  </label>

                  {aceptoDatos && (
                    <div className="space-y-3 p-4 border border-border-light rounded-2xl bg-white shadow-inner animate-fadeIn">
                      <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-bold text-secondary">Correo electrónico</span>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="correo@ejemplo.com"
                          className="border border-border-primary rounded-xl px-4 py-2.5 text-sm text-primary bg-white focus:outline-2 focus:outline-accent/30 transition-all shadow-sm"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-bold text-secondary">Teléfono de contacto</span>
                        <input
                          value={telefono}
                          onChange={(e) => setTelefono(e.target.value)}
                          placeholder="Ej. 987654321"
                          className="border border-border-primary rounded-xl px-4 py-2.5 text-sm text-primary bg-white focus:outline-2 focus:outline-accent/30 transition-all shadow-sm"
                        />
                      </label>
                      {!email.trim() && !telefono.trim() && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg font-medium">
                          Ingresa al menos un correo o teléfono para recibir tu cupón.
                        </p>
                      )}
                    </div>
                  )}

                  {error && <p className="text-red-600 text-sm font-semibold bg-red-50 p-2.5 rounded-xl border border-red-100">{error}</p>}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    className="flex-1 py-3.5 rounded-full border border-border-primary text-secondary font-bold text-sm cursor-pointer hover:bg-gray-50 transition-all"
                    onClick={() => setPaso(2)}
                    disabled={enviando}
                  >
                    Atrás
                  </button>
                  <button
                    type="button"
                    className="flex-1 py-3.5 rounded-full bg-gradient-to-r from-accent to-[#47a993] text-white font-extrabold text-sm cursor-pointer hover:opacity-95 active:scale-[0.98] transition-all shadow-md shadow-accent/20 flex items-center justify-center"
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
          <div className="text-center py-6 space-y-5 animate-scaleIn flex-1 flex flex-col justify-center text-left">
            <div className="text-6xl animate-bounce text-center">🎉</div>
            <h1 className="text-2xl font-extrabold text-accent-dark text-center leading-tight">
              ¡Gracias por tu recomendación!
            </h1>
            <p className="text-secondary text-sm leading-relaxed px-2 text-center">
              Tu opinión nos ayuda a seguir mejorando nuestros productos y mantener la máxima calidad textil.
            </p>
            {resultado?.codigoCupon && (
              <div className="border-2 border-dashed border-[#7cb9aa] rounded-2xl p-5 bg-[#f4fffb] shadow-sm transform transition-all hover:scale-[1.02] duration-300">
                <p className="text-[10px] text-accent font-extrabold uppercase mb-2 tracking-wider text-center">Tu cupón de fidelización</p>
                <p className="font-mono font-extrabold text-2xl text-[#227e69] tracking-widest bg-white py-2.5 rounded-xl border border-[#c4e6dc] shadow-inner select-all text-center">
                  {resultado.codigoCupon}
                </p>
                <p className="text-[10px] text-gray-400 mt-2 text-center font-medium">Válido por 30 días en tu próxima compra</p>
              </div>
            )}
            <p className="text-xs text-secondary bg-gray-50 border border-border-light p-3.5 rounded-xl leading-relaxed text-center font-medium">{resultado?.mensaje}</p>
            
            <div className="space-y-3 pt-2">
              <button
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-accent to-[#47a993] text-white font-extrabold uppercase tracking-wider cursor-pointer hover:opacity-95 active:scale-[0.98] transition-all shadow-md shadow-accent/20 flex items-center justify-center gap-2"
                onClick={() => onNavigateToCatalog(resultado?.codigoCupon || null)}
              >
                Explorar Catálogo y Usar Cupón 🛍️
              </button>
              <button
                className="w-full py-3 rounded-full border border-border-primary text-secondary font-bold text-sm cursor-pointer hover:bg-gray-50 transition-all duration-300"
                onClick={() => {
                  reiniciarFormulario()
                  setPantalla('bienvenida')
                }}
              >
                Volver al Inicio
              </button>
            </div>
          </div>
        )}

        {pantalla === 'pasivo' && (
          <div className="text-center py-6 space-y-5 animate-scaleIn flex-1 flex flex-col justify-center text-left">
            <div className="text-6xl animate-bounce text-center">✨</div>
            <h1 className="text-2xl font-extrabold text-primary text-center leading-tight">
              ¡Gracias por tu opinión!
            </h1>
            <p className="text-secondary text-sm leading-relaxed px-2 text-center">
              Tu valoración nos ayuda a perfeccionar la calidad textil de cada prenda que confeccionamos.
            </p>
            {resultado?.mensaje && (
              <p className="text-xs text-secondary bg-gray-50 border border-border-light p-3.5 rounded-xl leading-relaxed text-center font-medium">{resultado.mensaje}</p>
            )}

            {resultado?.codigoCupon && (
              <div className="border-2 border-dashed border-[#7cb9aa] rounded-2xl p-5 bg-[#f4fffb] shadow-sm transform transition-all hover:scale-[1.02] duration-300">
                <p className="text-[10px] text-accent font-extrabold uppercase mb-2 tracking-wider text-center">Tu cupón de fidelización</p>
                <p className="font-mono font-extrabold text-2xl text-[#227e69] tracking-widest bg-white py-2.5 rounded-xl border border-[#c4e6dc] shadow-inner select-all text-center">
                  {resultado.codigoCupon}
                </p>
                <p className="text-[10px] text-gray-400 mt-2 text-center font-medium">Válido por 30 días en tu próxima compra</p>
              </div>
            )}
            
            <div className="space-y-3 pt-2">
              <button
                className="w-full py-3.5 rounded-full bg-primary text-white font-extrabold uppercase tracking-wider cursor-pointer hover:bg-primary-hover active:scale-[0.98] transition-all shadow-md shadow-primary/10 flex items-center justify-center gap-2"
                onClick={() => onNavigateToCatalog(resultado?.codigoCupon || null)}
              >
                Ver Catálogo de Productos 👕
              </button>
              <button
                className="w-full py-3 rounded-full border border-border-primary text-secondary font-bold text-sm cursor-pointer hover:bg-gray-50 transition-all duration-300"
                onClick={() => {
                  reiniciarFormulario()
                  setPantalla('bienvenida')
                }}
              >
                Volver al Inicio
              </button>
            </div>
          </div>
        )}

        {pantalla === 'detractor' && (
          <div className="text-center py-6 space-y-5 animate-scaleIn flex-1 flex flex-col justify-center text-left">
            <div className="text-6xl opacity-90 text-center">💙</div>
            <h1 className="text-2xl font-extrabold text-primary text-center leading-tight">
              Lamentamos tu experiencia
            </h1>
            <p className="text-secondary text-sm leading-relaxed px-2 text-center">
              Tu opinión es muy importante. Hemos abierto una alerta de calidad inmediata para revisar lo ocurrido con este lote y evitar que se repita.
            </p>
            {resultado?.mensaje && (
              <p className="text-xs text-secondary bg-red-50/50 border border-red-100 p-3.5 rounded-xl leading-relaxed text-center font-medium">{resultado.mensaje}</p>
            )}

            {resultado?.codigoCupon && (
              <div className="border-2 border-dashed border-[#7cb9aa] rounded-2xl p-5 bg-[#f4fffb] shadow-sm transform transition-all hover:scale-[1.02] duration-300">
                <p className="text-[10px] text-accent font-extrabold uppercase mb-2 tracking-wider text-center">Tu cupón de fidelización</p>
                <p className="font-mono font-extrabold text-2xl text-[#227e69] tracking-widest bg-white py-2.5 rounded-xl border border-[#c4e6dc] shadow-inner select-all text-center">
                  {resultado.codigoCupon}
                </p>
                <p className="text-[10px] text-gray-400 mt-2 text-center font-medium">Válido por 30 días en tu próxima compra</p>
              </div>
            )}
            
            <div className="space-y-3 pt-2">
              <a
                href={`https://wa.me/51970767654?text=Hola,%20califiqu%C3%A9%20el%20lote%20${loteInfo?.codigoLote || 'N/A'}%20de%20la%20prenda%20${loteInfo?.nombrePrenda || 'Textil'}%20con%20una%20nota%20baja%20y%20me%20gustar%C3%ADa%20ser%20atendido.`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 rounded-full bg-[#25D366] text-white text-xs font-extrabold uppercase tracking-wider cursor-pointer hover:opacity-95 active:scale-[0.98] transition-all shadow-md shadow-green-500/20 flex items-center justify-center gap-2 text-center leading-normal"
              >
                💬 Contactar Soporte por WhatsApp
              </a>
              <button
                className="w-full py-3 rounded-full border border-border-primary text-secondary font-bold text-sm cursor-pointer hover:bg-gray-50 transition-all duration-300"
                onClick={() => onNavigateToCatalog(resultado?.codigoCupon || null)}
              >
                Ver Catálogo de Colección
              </button>
              <button
                className="w-full py-2.5 rounded-full border border-transparent text-gray-400 font-bold text-xs cursor-pointer hover:text-secondary transition-all"
                onClick={() => {
                  reiniciarFormulario()
                  setPantalla('bienvenida')
                }}
              >
                Volver al Inicio
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="mt-6 text-center">
        <button
          className="text-xs font-bold text-gray-400 hover:text-primary cursor-pointer transition-colors px-4 py-2 rounded-full hover:bg-white/50"
          onClick={() => setAdminMode(true)}
        >
          Acceso Personal
        </button>
      </footer>
    </div>
  )
}
