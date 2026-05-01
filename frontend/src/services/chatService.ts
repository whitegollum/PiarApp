/**
 * Servicio para el agente de chat nativo (reemplaza OpenClaw)
 */
import APIService from './api'

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant' | 'tool'
  content: string
  created_at: string
  tokens_in?: number
  tokens_out?: number
}

export interface ChatResponse {
  session_id: number
  response: string
  messages: ChatMessage[]
}

export interface SessionSummary {
  id: number
  title: string | null
  club_id: number | null
  updated_at: string
  message_count: number
}

export interface AgentConfig {
  provider: string
  model_id: string
  enabled: boolean
  max_tokens: number
  temperature: number
}

export interface ProviderModel {
  id: string
  name: string
}

export interface PersonaFile {
  name: string
  content: string
}

export const ChatService = {
  /** Enviar mensaje al agente */
  async sendMessage(message: string, sessionId: number | null, clubId: number | null): Promise<ChatResponse> {
    return APIService.post<ChatResponse>('/chat/send', {
      message,
      session_id: sessionId,
      club_id: clubId,
    })
  },

  /** Listar sesiones del usuario */
  async listSessions(clubId?: number): Promise<SessionSummary[]> {
    const params = clubId ? `?club_id=${clubId}` : ''
    return APIService.get<SessionSummary[]>(`/chat/sessions${params}`)
  },

  /** Obtener mensajes de una sesión */
  async getSessionMessages(sessionId: number): Promise<ChatMessage[]> {
    return APIService.get<ChatMessage[]>(`/chat/sessions/${sessionId}/messages`)
  },

  /** Archivar (eliminar) una sesión */
  async archiveSession(sessionId: number): Promise<void> {
    await APIService.delete(`/chat/sessions/${sessionId}`)
  },

  /** Debug: enviar mensaje y recibir info diagnóstica completa */
  async debugMessage(message: string, clubId: number | null = null): Promise<DebugResponse> {
    return APIService.post<DebugResponse>('/chat/debug', { message, club_id: clubId })
  },
}

export interface DebugResponse {
  debug_log: DebugStep[]
  response: string | null
  tool_calls?: any[] | null
  tool_results?: any[] | null
  error?: string
}

export interface DebugStep {
  step: string
  [key: string]: any
}

export const AgentAdminService = {
  /** Obtener configuración del agente */
  async getConfig(): Promise<AgentConfig> {
    return APIService.get<AgentConfig>('/admin/agent/config')
  },

  /** Actualizar configuración del agente */
  async updateConfig(config: Partial<AgentConfig>): Promise<AgentConfig> {
    return APIService.put<AgentConfig>('/admin/agent/config', config)
  },

  /** Listar modelos de un provider */
  async listModels(provider: string): Promise<ProviderModel[]> {
    return APIService.get<ProviderModel[]>(`/admin/agent/providers/${provider}/models`)
  },

  /** Obtener archivo de persona */
  async getPersonaFile(filename: string): Promise<PersonaFile> {
    return APIService.get<PersonaFile>(`/admin/agent/persona/${filename}`)
  },

  /** Actualizar archivo de persona */
  async updatePersonaFile(filename: string, content: string): Promise<void> {
    await APIService.put(`/admin/agent/persona/${filename}`, { content })
  },

  /** Iniciar flujo OAuth OpenAI (PKCE) — devuelve URL para abrir en navegador */
  async startOpenAIOAuth(): Promise<{ authorization_url: string; state: string; redirect_uri: string; expires_in: number }> {
    return APIService.post('/admin/agent/oauth/openai/start')
  },

  /** Poll OAuth OpenAI — no requiere parámetros, el backend trackea el estado */
  async pollOpenAIOAuth(): Promise<{ status: string; detail?: string }> {
    return APIService.post('/admin/agent/oauth/openai/poll')
  },

  /** Iniciar flujo OAuth Copilot (device-code) */
  async startCopilotOAuth(): Promise<{ device_code: string; user_code: string; verification_uri: string; expires_in: number }> {
    return APIService.post('/admin/agent/oauth/copilot/start')
  },

  /** Poll OAuth Copilot */
  async pollCopilotOAuth(deviceCode: string): Promise<{ status: string; error?: string }> {
    return APIService.post('/admin/agent/oauth/copilot/poll', { device_code: deviceCode })
  },
}
