import { useLocation, Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import '../styles/Breadcrumbs.css'

const SEGMENT_LABELS: Record<string, string> = {
  miembros: 'Socios',
  noticias: 'Noticias',
  eventos: 'Eventos',
  productos: 'Tienda',
  tareas: 'Tareas',
  ranking: 'Ranking',
  canales: 'Canales',
  documentacion: 'Documentos',
  editar: 'Configuración',
  premios: 'Premios',
  crear: 'Crear',
  admin: 'Administrar',
  socios: 'Socios',
}

function segmentLabel(seg: string) {
  if (SEGMENT_LABELS[seg]) return SEGMENT_LABELS[seg]
  // Numeric IDs → skip (don't show in breadcrumb)
  if (/^\d+$/.test(seg)) return null
  return seg.charAt(0).toUpperCase() + seg.slice(1)
}

interface BreadcrumbsProps {
  clubName?: string
}

export default function Breadcrumbs({ clubName }: BreadcrumbsProps) {
  const { pathname } = useLocation()

  // Only render inside /clubes/:clubId
  const match = pathname.match(/^\/clubes\/(\d+)(.*)$/)
  if (!match) return null

  const rest = match[2] // e.g. '/miembros' or '/noticias/crear'
  const restSegments = rest.split('/').filter(Boolean) // ['miembros'] or ['noticias', 'crear']

  // First crumb: club home
  const clubBase = `/clubes/${match[1]}`
  const crumbs: { label: string; to: string }[] = [
    { label: clubName || 'Inicio', to: clubBase },
  ]

  // Add segment crumbs (stop at first numeric — it's an entity ID)
  let path = clubBase
  for (const seg of restSegments) {
    const label = segmentLabel(seg)
    if (label === null) break // numeric ID, stop
    path = `${path}/${seg}`
    crumbs.push({ label, to: path })
  }

  // If only one crumb and we're at the club root, nothing to show
  if (crumbs.length <= 1 && restSegments.length === 0) return null

  return (
    <nav className="breadcrumbs" aria-label="Ubicación actual">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1
        return (
          <span key={crumb.to} className="breadcrumb-item">
            {i > 0 && <ChevronRight size={14} className="breadcrumb-sep" />}
            {isLast ? (
              <span className="breadcrumb-current">{crumb.label}</span>
            ) : (
              <Link to={crumb.to} className="breadcrumb-link">{crumb.label}</Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
