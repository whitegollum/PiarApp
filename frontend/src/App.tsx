import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'
import APIService from './services/api'
import { useEffect } from 'react'

// Páginas de autenticación
import Login from './pages/Login'
import FirstAccess from './pages/FirstAccess'
import Register from './pages/Register'
import AcceptInvitation from './pages/AcceptInvitation'
import GoogleOAuthCallback from './pages/GoogleOAuthCallback'

import Dashboard from './pages/Dashboard'
import ClubDetail from './pages/ClubDetail'
import ClubEdit from './pages/ClubEdit'
import CreateClub from './pages/CreateClub'
import ClubMembers from './pages/ClubMembers'
import SocioForm from './pages/SocioForm'
import Profile from './pages/Profile'
import Settings from './pages/Settings'

import ClubEvents from './pages/ClubEvents'
import ClubNews from './pages/ClubNews'
import CreateNews from './pages/CreateNews'
import EditNews from './pages/EditNews'
import CreateEvent from './pages/CreateEvent'
import EditEvent from './pages/EditEvent'
import AdminClubs from './pages/admin/AdminClubs'
import AdminEmailConfig from './pages/admin/AdminEmailConfig'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminAlertas from './pages/admin/AdminAlertas'
import AdminDatabase from './pages/admin/AdminDatabase'
import ClubDocumentacion from './pages/ClubDocumentacion'
import ProductosCatalogo from './pages/ProductosCatalogo'
import ProductosAdmin from './pages/ProductosAdmin'
import ClubTareas from './pages/ClubTareas'
import TareaDetail from './pages/TareaDetail'
import CreateTarea from './pages/CreateTarea'
import EditTarea from './pages/EditTarea'
import ClubRanking from './pages/ClubRanking'
import AdminPremios from './pages/AdminPremios'

// Componente para verificar configuración inicial
const SetupCheck = () => {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const checkSetup = async () => {
      // Evitar loop infinito si ya estamos en la página de setup
      if (location.pathname === '/auth/setup-inicial') return

      try {
        const response = await APIService.get<{ setup_required: boolean }>('/auth/setup-required', { skipAuth: true })
        
        if (response && response.setup_required) {
          console.log("Redirigiendo a configuración inicial...")
          navigate('/auth/setup-inicial')
        }
      } catch (error) {
        console.error('Error verificando estado de configuración:', error)
      }
    }

    checkSetup()
  }, [navigate, location.pathname])

  return null
}

function App() {

  return (
    <AuthProvider>
      <Router>
        <SetupCheck />
        <Routes>
          {/* Rutas de admin */}
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/clubes" element={<ProtectedRoute><AdminClubs /></ProtectedRoute>} />
          <Route path="/admin/email" element={<ProtectedRoute><AdminEmailConfig /></ProtectedRoute>} />
          <Route path="/admin/alertas" element={<ProtectedRoute><AdminAlertas /></ProtectedRoute>} />
          <Route path="/admin/database" element={<ProtectedRoute><AdminDatabase /></ProtectedRoute>} />

          {/* Rutas públicas */}
          <Route path="/auth/setup-inicial" element={<FirstAccess />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/registro" element={<Register />} />
          <Route path="/auth/google/callback" element={<GoogleOAuthCallback />} />
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
            path="/clubes/:clubId/socios/crear"
            element={
              <ProtectedRoute>
                <SocioForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clubes/:clubId/socios/:socioId/editar"
            element={
              <ProtectedRoute>
                <SocioForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="/clubes/:clubId/noticias"
            element={
              <ProtectedRoute>
                <ClubNews />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clubes/:clubId/noticias/crear"
            element={
              <ProtectedRoute>
                <CreateNews />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clubes/:clubId/noticias/:noticiaId/editar"
            element={
              <ProtectedRoute>
                <EditNews />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clubes/:clubId/eventos"
            element={
              <ProtectedRoute>
                <ClubEvents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clubes/:clubId/eventos/crear"
            element={
              <ProtectedRoute>
                <CreateEvent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clubes/:clubId/eventos/:eventoId/editar"
            element={
              <ProtectedRoute>
                <EditEvent />
              </ProtectedRoute>
            }
          />

          <Route
            path="/clubes/:clubId/productos"
            element={
              <ProtectedRoute>
                <ProductosCatalogo />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clubes/:clubId/productos/admin"
            element={
              <ProtectedRoute>
                <ProductosAdmin />
              </ProtectedRoute>
            }
          />

          <Route path="/clubes/:clubId/tareas" element={<ProtectedRoute><ClubTareas /></ProtectedRoute>} />
          <Route path="/clubes/:clubId/tareas/crear" element={<ProtectedRoute><CreateTarea /></ProtectedRoute>} />
          <Route path="/clubes/:clubId/tareas/:tareaId" element={<ProtectedRoute><TareaDetail /></ProtectedRoute>} />
          <Route path="/clubes/:clubId/tareas/:tareaId/editar" element={<ProtectedRoute><EditTarea /></ProtectedRoute>} />
          <Route path="/clubes/:clubId/ranking" element={<ProtectedRoute><ClubRanking /></ProtectedRoute>} />
          <Route path="/clubes/:clubId/premios" element={<ProtectedRoute><AdminPremios /></ProtectedRoute>} />

          <Route
            path="/perfil"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route path="/perfil/socio" element={<Navigate to="/perfil" />} />
          <Route
            path="/perfil/documentacion"
            element={
              <ProtectedRoute>
                <ClubDocumentacion />
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
