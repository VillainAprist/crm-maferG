import { useState, useMemo } from 'react'
import { PublicSurvey } from './features/evaluaciones'
import { AdminDashboard } from './features/dashboard'
import { CatalogoView } from './features/catalogo'

function App() {
  // Extraer el token de lote de la URL para ruteo e histórico
  const urlToken = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('token')
  }, [])

  // Ruteo inteligente:
  // Si la URL contiene un token de lote (ej: ?token=xxx), iniciamos en la encuesta.
  // Si no contiene token, iniciamos mostrando el Catálogo directamente.
  const initialView = useMemo(() => {
    return urlToken ? 'survey' : 'catalog'
  }, [urlToken])

  const [view, setView] = useState<'survey' | 'catalog' | 'admin'>(initialView)
  const [couponCode, setCouponCode] = useState<string | null>(null)

  // Mostrar botón volver si el usuario accedió con un código QR (token)
  const showBackButton = !!urlToken

  return (
    <div className="min-h-svh flex items-center justify-center p-4 sm:p-6 transition-all">
      {view === 'survey' && (
        <PublicSurvey
          setAdminMode={(mode) => setView(mode ? 'admin' : 'survey')}
          onNavigateToCatalog={(coupon) => {
            setCouponCode(coupon)
            setView('catalog')
          }}
        />
      )}
      {view === 'catalog' && (
        <CatalogoView
          onBack={() => setView('survey')}
          onNavigateToAdmin={() => setView('admin')}
          showBackButton={showBackButton}
          couponCode={couponCode}
        />
      )}
      {view === 'admin' && (
        <AdminDashboard
          setAdminMode={(mode) => setView(mode ? 'admin' : 'survey')}
          onNavigateToCatalog={() => setView('catalog')}
        />
      )}
    </div>
  )
}

export default App

