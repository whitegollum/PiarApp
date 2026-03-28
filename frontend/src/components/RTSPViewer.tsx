import { useEffect, useRef, useState } from 'react'
import '../styles/RTSPViewer.css'

interface RTSPViewerProps {
  url: string
  title?: string
}

export default function RTSPViewer({ url, title = "Cámara en vivo" }: RTSPViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string>('')
  const [streamType, setStreamType] = useState<'hls' | 'direct' | 'rtsp' | 'unknown'>('unknown')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!url) {
      setError('No hay URL de cámara configurada')
      setIsLoading(false)
      return
    }

    // Detectar tipo de stream por la URL
    const urlLower = url.toLowerCase()
    if (urlLower.includes('.m3u8') || urlLower.includes('hls')) {
      setStreamType('hls')
      loadHLSStream(url)
    } else if (urlLower.startsWith('rtsp://')) {
      setStreamType('rtsp')
      setError('Las URLs RTSP necesitan ser convertidas a HLS o WebRTC. Por favor, configura una URL HLS (.m3u8) en su lugar.')
      setIsLoading(false)
    } else if (urlLower.startsWith('http://') || urlLower.startsWith('https://')) {
      setStreamType('direct')
      setIsLoading(false)
    } else {
      setStreamType('unknown')
      setError('Formato de URL no soportado. Usa HLS (m3u8) o HTTP(S) directo.')
      setIsLoading(false)
    }
  }, [url])

  const loadHLSStream = async (streamUrl: string) => {
    if (!videoRef.current) return

    // Primero intentar con HLS nativo del navegador (Safari)
    if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = streamUrl
      setIsLoading(false)
      return
    }

    // Si no soporta HLS nativo, intentar cargar hls.js
    try {
      // Importación dinámica de hls.js
      const Hls = (await import('hls.js')).default

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90
        })

        hls.loadSource(streamUrl)
        hls.attachMedia(videoRef.current)

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false)
          videoRef.current?.play().catch(err => {
            console.log('Autoplay prevented:', err)
            setError('Haz clic en reproducir para ver la cámara')
          })
        })

        hls.on(Hls.Events.ERROR, (_event, data) => {
          console.error('HLS Error:', data)
          if (data.fatal) {
            setError(`Error al cargar stream: ${data.type}`)
            setIsLoading(false)
          }
        })

        return () => hls.destroy()
      } else {
        setError('Tu navegador no soporta streaming HLS. Prueba con Chrome, Firefox o Safari.')
        setIsLoading(false)
      }
    } catch (err) {
      console.error('Error loading HLS:', err)
      setError('Error al cargar reproductor de video. Instala dependencias: npm install hls.js')
      setIsLoading(false)
    }
  }

  if (!url) {
    return null
  }

  return (
    <div className="rtsp-viewer-container">
      <div className="rtsp-viewer-header">
        <h3>📹 {title}</h3>
        {streamType !== 'unknown' && (
          <span className="stream-type-badge">
            {streamType === 'hls' && '🔴 HLS'}
            {streamType === 'direct' && '🔴 Stream Directo'}
            {streamType === 'rtsp' && '⚠️ RTSP'}
          </span>
        )}
      </div>

      <div className="rtsp-viewer-content">
        {isLoading && (
          <div className="rtsp-loading">
            <div className="spinner"></div>
            <p>Cargando stream...</p>
          </div>
        )}

        {error && (
          <div className="rtsp-error">
            <span className="error-icon">⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {!error && (
          <video
            ref={videoRef}
            className="rtsp-video"
            controls
            autoPlay
            muted
            playsInline
            onError={() => {
              setError('Error al cargar el video. Verifica que la URL sea correcta y accesible.')
              setIsLoading(false)
            }}
            onLoadedData={() => setIsLoading(false)}
          >
            {streamType === 'direct' && (
              <source src={url} type="video/mp4" />
            )}
            Tu navegador no soporta el elemento de video.
          </video>
        )}
      </div>

      <div className="rtsp-viewer-footer">
        <small>
          {streamType === 'rtsp' && 'Configure una URL HLS para visualizar la cámara'}
          {streamType === 'hls' && 'Streaming en tiempo real'}
          {streamType === 'direct' && 'Video directo'}
          {streamType === 'unknown' && 'Tipo de stream desconocido'}
        </small>
      </div>
    </div>
  )
}
