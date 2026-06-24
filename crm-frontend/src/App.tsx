import { useState } from 'react'
import { PublicSurvey } from './components/PublicSurvey'
import { AdminDashboard } from './components/AdminDashboard'
import { CatalogoView } from './components/CatalogoView'

function App() {
  const [view, setView] = useState<'survey' | 'catalog' | 'admin'>('survey')
  const [couponCode, setCouponCode] = useState<string | null>(null)

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

