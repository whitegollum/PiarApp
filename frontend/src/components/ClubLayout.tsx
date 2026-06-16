import { useState, useEffect } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useClubRole } from '../hooks/useClubRole'
import { alertaService } from '../services/alertaService'
import APIService from '../services/api'
import Navbar from './Navbar'
import ClubSidebar from './ClubSidebar'
import Breadcrumbs from './Breadcrumbs'
import '../styles/ClubLayout.css'

interface Club {
  id: number
  nombre: string
  logo_url?: string
}

export default function ClubLayout() {
  const { clubId } = useParams<{ clubId: string }>()
  const { usuario } = useAuth()
  const { role } = useClubRole(clubId)

  const [clubName, setClubName] = useState('')
  const [clubLogo, setClubLogo] = useState<string | undefined>(undefined)
  const [totalAlertas, setTotalAlertas] = useState(0)

  const canEdit = !!(role === 'administrador' || role === 'propietario' || usuario?.es_superadmin)

  useEffect(() => {
    if (!clubId) return
    APIService.get<Club>(`/clubes/${clubId}`)
      .then(c => {
        setClubName(c.nombre)
        setClubLogo(c.logo_url || undefined)
      })
      .catch(() => {})
  }, [clubId])

  useEffect(() => {
    if (!clubId || !canEdit) return
    alertaService.obtenerContadorAlertas(parseInt(clubId))
      .then(res => setTotalAlertas(res.total || 0))
      .catch(() => {})
  }, [clubId, canEdit])

  return (
    <div className="club-layout">
      <Navbar
        clubName={clubName}
        clubLogo={clubLogo}
        clubId={clubId}
        canEdit={canEdit}
        totalAlertas={totalAlertas}
      />
      <div className="club-layout-body">
        <ClubSidebar />
        <main className="club-layout-content">
          <Breadcrumbs clubName={clubName} />
          <Outlet />
        </main>
      </div>
    </div>
  )
}
