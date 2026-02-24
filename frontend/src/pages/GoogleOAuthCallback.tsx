import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import APIService from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import {
  clearGoogleOAuthState,
  getStoredGoogleRedirect,
  getStoredGoogleState
} from '../services/googleOAuth'
import '../styles/Auth.css'

interface GoogleOAuthResponse {
  usuario: {
    id: number
    email: string
    nombre_completo: string
    fecha_creacion: string
  }
  tokens: {
    access_token: string
    refresh_token: string
  }
}

export default function GoogleOAuthCallback() {
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login } = useAuth()

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const errorParam = searchParams.get('error')
    const storedState = getStoredGoogleState()
    const redirectUri = getStoredGoogleRedirect()

    if (errorParam) {
      setError('Google canceló el inicio de sesión')
      clearGoogleOAuthState()
      return
    }

    if (!code || !state || !storedState || state !== storedState) {
      setError('Estado de autenticación inválido. Intenta nuevamente.')
      clearGoogleOAuthState()
      return
    }

    const exchangeCode = async () => {
      try {
        const response = await APIService.post<GoogleOAuthResponse>(
          '/auth/google-oauth',
          {
            code,
            redirect_uri: redirectUri
          },
          { skipAuth: true }
        )

        login(response.usuario, response.tokens.access_token, response.tokens.refresh_token)
        clearGoogleOAuthState()
        navigate('/')
      } catch (err) {
        const errorMessage = (err as any).message || 'No se pudo iniciar sesión con Google'
        setError(errorMessage)
        clearGoogleOAuthState()
      }
    }

    exchangeCode()
  }, [searchParams, navigate, login])

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>PiarAPP</h1>
          <p>Gestión de Clubs de Aeromodelismo</p>
        </div>

        <div className="auth-content">
          <h2>Conectando con Google</h2>

          {!error ? (
            <div className="alert alert-info">
              Procesando autenticación...
            </div>
          ) : (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          {error && (
            <div className="auth-footer">
              <p>
                <Link to="/auth/login">Volver a iniciar sesión</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
