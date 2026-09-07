import { X, Radio } from 'lucide-react'
import { FPV_SYSTEMS, GOGGLE_LABEL, FREQ_MHZ } from '../utils/fpvSystems'

interface Props {
  onClose: () => void
}

const CANALES_CANONICOS = [1, 2, 3, 4, 5, 6, 7, 8]

export default function TablaFrecuenciasModal({ onClose }: Props) {
  return (
    <div className="qr-modal-overlay" onClick={onClose}>
      <div className="tabla-freq-modal" onClick={(e) => e.stopPropagation()}>
        <div className="qr-modal-header">
          <div className="qr-modal-title">
            <Radio size={18} />
            <span>Tabla de equivalencia de frecuencias</span>
          </div>
          <button className="qr-modal-close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="tabla-freq-body">
          <table className="tabla-freq">
            <thead>
              <tr>
                {FPV_SYSTEMS.map((sys) => (
                  <th key={sys.id}>{sys.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CANALES_CANONICOS.map((canonicalNum) => (
                <tr key={canonicalNum}>
                  {FPV_SYSTEMS.map((sys) => {
                    const label = GOGGLE_LABEL[sys.id][canonicalNum - 1]
                    const freq = FREQ_MHZ[sys.id][canonicalNum - 1]
                    return (
                      <td key={sys.id}>
                        {label ? (
                          <>
                            <span className="tabla-freq-label">{label}</span>
                            {freq && <span className="tabla-freq-mhz">{freq} MHz</span>}
                          </>
                        ) : (
                          <span className="tabla-freq-nd">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
