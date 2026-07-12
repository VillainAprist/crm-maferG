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

  // Mostrar botón volver solo si es un token de código QR real de venta (no el de demostración offline)
  const showBackButton = !!urlToken && urlToken !== '3fa85f64-5717-4562-b3fc-2c963f66afa6'

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

