import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { X, QrCode, Copy, Check } from 'lucide-react'
import { InvitadosService, QRInvitadoResponse } from '../services/invitadosService'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  clubId: number
  onClose: () => void
}

export default function QRInvitadoModal({ clubId, onClose }: Props) {
  const { getAccessToken } = useAuth()
  const [qrData, setQrData] = useState<QRInvitadoResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return
    InvitadosService.obtenerQR(clubId, token)
      .then(setQrData)
      .catch(() => setError('No se pudo generar el QR'))
      .finally(() => setLoading(false))
  }, [clubId, getAccessToken])

  const copiarUrl = () => {
    if (!qrData) return
    navigator.clipboard.writeText(qrData.url).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }

  return (
    <div className="qr-modal-overlay" onClick={onClose}>
      <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="qr-modal-header">
          <div className="qr-modal-title">
            <QrCode size={18} />
            <span>Invitar como invitado</span>
          </div>
          <button className="qr-modal-close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="qr-modal-body">
          {loading && <p className="qr-modal-loading">Generando QR…</p>}
          {error && <p className="qr-modal-error">{error}</p>}
          {qrData && (
            <>
              <div className="qr-modal-code">
                <QRCodeSVG
                  value={qrData.url}
                  size={220}
                  level="M"
                  includeMargin
                />
              </div>
              <p className="qr-modal-instrucciones">
                Muestra este QR a tu invitado. Podrá ver y ocupar canales
                <strong> sin registrarse</strong>.
              </p>
              <div className="qr-modal-url-row">
                <span className="qr-modal-url">{qrData.url}</span>
                <button className="btn btn-secondary btn-sm" onClick={copiarUrl}>
                  {copiado ? <Check size={14} /> : <Copy size={14} />}
                  {copiado ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
