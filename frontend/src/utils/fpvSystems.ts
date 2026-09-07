/**
 * Tabla de equivalencias entre canales canónicos (numerados según RaceBand R1-R8)
 * y los distintos sistemas de gafas FPV.
 * Compartida entre la vista de socios (ClubCanales) y la de invitados (ClubCanalesInvitado)
 */
import type { CanalEstado, CanalUsuario } from '../services/canalesService'

export type FpvSystem = 'raceband' | 'dji' | 'o3' | 'o4' | 'walksnail'

export const FPV_SYSTEMS: { id: FpvSystem; label: string }[] = [
  { id: 'raceband',  label: 'Analógico / HDZero / DJI O4 (Race)' },
  { id: 'dji',       label: 'DJI Vista / Air Unit'                },
  { id: 'o3',        label: 'DJI O3 (FCC)'                        },
  { id: 'o4',        label: 'DJI O4 (FCC)'                        },
  { id: 'walksnail', label: 'Walksnail'                           },
]

// Label que aparece en las gafas para cada canal canónico (índice 0 = canal 1 / R1)
export const GOGGLE_LABEL: Record<FpvSystem, (string | null)[]> = {
  raceband:  ['R1',  'R2',  'R3',  'R4',  'R5',           'R6',   'R7',  'R8' ],
  dji:       ['CH1', 'CH2', 'CH3', 'CH4', 'CH5',          'CH8',  'CH6', 'CH7'],
  o3:        ['O3-1','O3-2', null, 'O3-3','O3-4',         'O3-5', 'O3-6','O3-7'],
  o4:        ['O4-1','O4-2','O4-3','O4-4','O4-5 / O4-6',  null,   'O4-7', null ],
  walksnail: ['WS1', 'WS2', 'WS3', 'WS4', 'WS5',          'Public','WS6','WS7'],
}

// Frecuencia (MHz) para cada canal canónico (índice 0 = canal 1 / R1)
export const FREQ_MHZ: Record<FpvSystem, (string | null)[]> = {
  raceband:  ['5658', '5695', '5732', '5769', '5806',        '5843',  '5880', '5917'],
  dji:       ['5660', '5695', '5735', '5770', '5805',        '5839',  '5878', '5914'],
  o3:        ['5669', '5705', null,   '5769', '5805',        '5840',  '5876', '5912'],
  o4:        ['5669', '5705', '5741', '5769', '5790 / 5815', null,    '5876', null  ],
  walksnail: ['5660', '5695', '5735', '5770', '5805',        '5839',  '5878', '5914'],
}

// Orden de visualización: canales canónicos ordenados según el número de canal en las gafas
export const DISPLAY_ORDER: Record<FpvSystem, number[]> = {
  raceband:  [1, 2, 3, 4, 5, 6, 7, 8],
  dji:       [1, 2, 3, 4, 5, 7, 8, 6], // DJI CH1→C1, CH2→C2, …, CH6→C7, CH7→C8, CH8→C6
  o3:        [1, 2, 4, 5, 6, 7, 8, 3], // O3-1..O3-7 en orden; C3 no disponible al final
  o4:        [1, 2, 3, 4, 5, 7, 6, 8], // O4-1..O4-4, O4-5/O4-6, O4-7; C6 y C8 no disponibles al final
  walksnail: [1, 2, 3, 4, 5, 6, 7, 8],
}

export function getGoggleLabel(canonicalNum: number, system: FpvSystem): string | null {
  return GOGGLE_LABEL[system][canonicalNum - 1] ?? null
}

export function getFreq(canonicalNum: number, system: FpvSystem): string | null {
  return FREQ_MHZ[system][canonicalNum - 1] ?? null
}

/**
 * Tarjeta ocupable en la rejilla de canales. Casi siempre hay una tarjeta por
 * canal canónico, salvo en DJI O4 (FCC): O4-5 y O4-6 son dos frecuencias
 * físicas distintas dentro del canal canónico 5 que no interfieren entre sí,
 * así que se muestran y se ocupan como dos tarjetas independientes.
 */
export interface FpvSlot {
  key: string
  canalNumero: number
  subCanal: string | null
  label: string | null
  freq: string | null
}

// Frecuencias reales de O4-5 y O4-6 (ver tabla de equivalencias, canal canónico 5)
const O4_CANAL5_SUBSLOTS: { subCanal: string; label: string; freq: string }[] = [
  { subCanal: 'O4-5', label: 'O4-5', freq: '5790' },
  { subCanal: 'O4-6', label: 'O4-6', freq: '5815' },
]

export function getDisplaySlots(system: FpvSystem): FpvSlot[] {
  const slots: FpvSlot[] = []
  for (const canalNumero of DISPLAY_ORDER[system]) {
    if (system === 'o4' && canalNumero === 5) {
      for (const sub of O4_CANAL5_SUBSLOTS) {
        slots.push({ key: `5-${sub.subCanal}`, canalNumero: 5, subCanal: sub.subCanal, label: sub.label, freq: sub.freq })
      }
      continue
    }
    slots.push({
      key: String(canalNumero),
      canalNumero,
      subCanal: null,
      label: getGoggleLabel(canalNumero, system),
      freq: getFreq(canalNumero, system),
    })
  }
  return slots
}

export interface FpvSlotView extends FpvSlot {
  usuarios: CanalUsuario[]
  enVuelo: boolean
  pilotoVolando: string | null
}

/**
 * Une los slots ocupables del sistema FPV seleccionado con el estado real de
 * los canales devuelto por el backend. Para las tarjetas O4-5/O4-6 filtra los
 * ocupantes: cuentan los de esa subfrecuencia y los que no usan O4 (sub_canal
 * null), ya que estos últimos interfieren con ambas subfrecuencias.
 */
export function buildSlotViews(canales: CanalEstado[], system: FpvSystem): FpvSlotView[] {
  return getDisplaySlots(system).map(slot => {
    const canal = canales.find(c => c.canal_numero === slot.canalNumero)
    const usuariosBase = canal?.usuarios ?? []
    const usuarios = slot.subCanal
      ? usuariosBase.filter(u => u.sub_canal === null || u.sub_canal === slot.subCanal)
      : usuariosBase
    const pilotoEnVuelo = usuarios.find(u => u.en_vuelo)
    return {
      ...slot,
      usuarios,
      enVuelo: !!pilotoEnVuelo,
      pilotoVolando: pilotoEnVuelo?.nombre ?? null,
    }
  })
}
