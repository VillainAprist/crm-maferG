import { useState } from 'react'
import { PublicSurvey } from './components/PublicSurvey'
import { AdminDashboard } from './components/AdminDashboard'

function App() {
  const [adminMode, setAdminMode] = useState(false)

  return (
    <div className="min-h-svh flex items-center justify-center p-4 sm:p-6 transition-all">
      {!adminMode ? (
        <PublicSurvey setAdminMode={setAdminMode} />
      ) : (
        <AdminDashboard setAdminMode={setAdminMode} />
      )}
    </div>
  )
}

export default App
