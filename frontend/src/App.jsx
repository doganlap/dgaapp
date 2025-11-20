import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { LocaleProvider } from './context/LocaleContext'

import Landing from './pages/Landing'
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
import Regulators from './pages/grc/Regulators'
import Frameworks from './pages/grc/Frameworks'
import Controls from './pages/grc/Controls'
import Scoring from './pages/grc/Scoring'
import VisualJourney from './pages/grc/VisualJourney'
import GRCReports from './pages/grc/Reports'
import Layout from './components/Layout'
import DGALayout from './components/DGALayout'
import GRCLayout from './components/GRCLayout'



function App() {
  return (
    <LocaleProvider>
      <AuthProvider>
        <Router>
              <Routes>
            {/* Landing Page - No Layout */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Landing />} />
            </Route>

            {/* DGA Routes - Separate DGA Layout */}
            <Route path="/dga" element={<DGALayout />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="entities" element={<Entities />} />
              <Route path="programs" element={<Programs />} />
              <Route path="budget" element={<Budget />} />
              <Route path="reports" element={<Reports />} />
              <Route path="users" element={<Users />} />
              <Route path="finance-demo" element={<FinanceDemo />} />
            </Route>

            {/* GRC Routes - Separate GRC Layout */}
            <Route path="/grc" element={<GRCLayout />}>
              <Route path="dashboard" element={<GRCDashboard />} />
              <Route path="risks" element={<Risks />} />
              <Route path="compliance" element={<Compliance />} />
              <Route path="insights" element={<Insights />} />
              <Route path="regulators" element={<Regulators />} />
              <Route path="frameworks" element={<Frameworks />} />
              <Route path="controls" element={<Controls />} />
              <Route path="scoring" element={<Scoring />} />
              <Route path="journey" element={<VisualJourney />} />
              <Route path="reports" element={<GRCReports />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </LocaleProvider>
  )
}

export default App
