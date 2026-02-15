import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { AuthProvider } from '../../contexts/AuthContext'
import Login from '../Login'

const renderLogin = () => {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    </AuthProvider>
  )
}

describe('Login page', () => {
  it('renders the basic form', () => {
    renderLogin()

    expect(screen.getByRole('heading', { name: /PiarAPP/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Iniciar Sesi/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Contras/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Iniciar Ses/i })).toBeInTheDocument()
  })
})
