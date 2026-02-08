import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

// Páginas de autenticación
import Login from './pages/Login'
import Register from './pages/Register'
import AcceptInvitation from './pages/AcceptInvitation'

// Páginas protegidas
import Dashboard from './pages/Dashboard'
import ClubDetail from './pages/ClubDetail'
import ClubEdit from './pages/ClubEdit'
import CreateClub from './pages/CreateClub'
import ClubMembers from './pages/ClubMembers'
import Profile from './pages/Profile'
import Settings from './pages/Settings'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/registro" element={<Register />} />
          <Route path="/auth/aceptar-invitacion" element={<AcceptInvitation />} />

          {/* Rutas protegidas */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/clubes/crear"
            element={
              <ProtectedRoute>
                <CreateClub />
              </ProtectedRoute>
            }
          />

          <Route
            path="/clubes/:clubId"
            element={
              <ProtectedRoute>
                <ClubDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/clubes/:clubId/editar"
            element={
              <ProtectedRoute>
                <ClubEdit />
              </ProtectedRoute>
            }
          />

          <Route
            path="/clubes/:clubId/miembros"
            element={
              <ProtectedRoute>
                <ClubMembers />
              </ProtectedRoute>
            }
          />

          <Route
            path="/perfil"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/configuracion"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />

          {/* Ruta por defecto */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
