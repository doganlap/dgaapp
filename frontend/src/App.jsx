import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { LocaleProvider } from './context/LocaleContext'

import Dashboard from './pages/Dashboard'
import Entities from './pages/Entities'
import Programs from './pages/Programs'
import Budget from './pages/Budget'
import Reports from './pages/Reports'
import Users from './pages/Users'
import FinanceDemo from './pages/FinanceDemo'
import GRCDashboard from './pages/grc/GRCDashboard'
import Risks from './pages/grc/Risks'
import Compliance from './pages/grc/Compliance'
import Insights from './pages/grc/Insights'
import Layout from './components/Layout'



function App() {
  return (
    <LocaleProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="entities" element={<Entities />} />
              <Route path="programs" element={<Programs />} />
              <Route path="budget" element={<Budget />} />
              <Route path="reports" element={<Reports />} />
              <Route path="users" element={<Users />} />
              <Route path="finance-demo" element={<FinanceDemo />} />
              {/* GRC Routes */}
              <Route path="grc" element={<GRCDashboard />} />
              <Route path="grc/risks" element={<Risks />} />
              <Route path="grc/compliance" element={<Compliance />} />
              <Route path="grc/insights" element={<Insights />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </LocaleProvider>
  )
}

export default App
