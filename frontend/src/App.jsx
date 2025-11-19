import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { LocaleProvider } from './context/LocaleContext'

import Dashboard from './pages/Dashboard'
import Entities from './pages/Entities'
import Programs from './pages/Programs'
import Budget from './pages/Budget'
import Reports from './pages/Reports'
import Users from './pages/Users'
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
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </LocaleProvider>
  )
}

export default App
