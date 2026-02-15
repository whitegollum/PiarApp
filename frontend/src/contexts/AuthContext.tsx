import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import APIService from '../services/api'

interface Usuario {
  id: number
  email: string
  nombre_completo: string
  google_id?: string
  fecha_creacion: string
  ultimo_login?: string
  email_verificado?: boolean
  es_superadmin?: boolean
  notifications_enabled?: boolean
  email_digest?: string
  dark_mode?: boolean
  language?: string
}

interface AuthContextType {
  usuario: Usuario | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (usuario: Usuario, accessToken: string, refreshToken: string) => void
  logout: () => void
  updateUser: (usuario: Usuario) => void
  getAccessToken: () => string | null
  getRefreshToken: () => string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initializeAuth = async () => {
      // Cargar usuario y tokens del localStorage al iniciar
      const storedUser = localStorage.getItem('user')
      const accessToken = localStorage.getItem('access_token')

      if (storedUser && accessToken) {
        try {
          // 1. Establecer estado inicial desde localStorage para respuesta rápida
          const parsedUser = JSON.parse(storedUser)
          setUsuario(parsedUser)

          // 2. Intentar actualizar datos frescos desde el servidor
          try {
            // Nota: APIService maneja automáticamente el refresh del token si expira
            const freshUser = await APIService.get<Usuario>('/auth/usuarios/me')
            setUsuario(freshUser)
            localStorage.setItem('user', JSON.stringify(freshUser))
          } catch (apiError) {
            console.warn('No se pudo actualizar la información del usuario desde el servidor:', apiError)
          }
        } catch (error) {
          console.error('Error parsing stored user:', error)
          localStorage.removeItem('user')
          localStorage.removeItem('access_token')
        }
      }
      setIsLoading(false)
    }

    initializeAuth()
  }, [])

  const login = (usuario: Usuario, accessToken: string, refreshToken: string) => {
    setUsuario(usuario)
    localStorage.setItem('user', JSON.stringify(usuario))
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
  }

  const logout = () => {
    setUsuario(null)
    localStorage.removeItem('user')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }

  const updateUser = (usuario: Usuario) => {
    setUsuario(usuario)
    localStorage.setItem('user', JSON.stringify(usuario))
  }

  const getAccessToken = () => {
    return localStorage.getItem('access_token')
  }

  const getRefreshToken = () => {
    return localStorage.getItem('refresh_token')
  }

  const value: AuthContextType = {
    usuario,
    isAuthenticated: !!usuario,
    isLoading,
    login,
    logout,
    updateUser,
    getAccessToken,
    getRefreshToken
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider')
  }
  return context
}
