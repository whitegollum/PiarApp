import React, { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, Microscope, List, Plus, Trash2, Send } from 'lucide-react'
import { ChatService, ChatMessage, SessionSummary } from '../services/chatService'
import '../styles/ChatPanel.css'

interface ChatPanelProps {
  clubId: number
  clubName: string
}

export default function ChatPanel({ clubId, clubName }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showSessions, setShowSessions] = useState(false)
  const [debugMode, setDebugMode] = useState(false)
  const [debugLog, setDebugLog] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isExpanded) {
      scrollToBottom()
    }
  }, [messages, isExpanded])

  // Cargar sesiones al expandir
  useEffect(() => {
    if (isExpanded) {
      loadSessions()
    }
  }, [isExpanded, clubId])

  const loadSessions = async () => {
    try {
      const data = await ChatService.listSessions(clubId)
      setSessions(data)
    } catch (err) {
      console.error('Error loading sessions:', err)
    }
  }

  const loadSessionMessages = async (sessionId: number) => {
    try {
      const msgs = await ChatService.getSessionMessages(sessionId)
      setMessages(msgs)
      setActiveSessionId(sessionId)
      setShowSessions(false)
    } catch (err) {
      console.error('Error loading messages:', err)
    }
  }

  const startNewSession = () => {
    setMessages([])
    setActiveSessionId(null)
    setShowSessions(false)
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || isLoading) return

    const userText = inputText.trim()
    setInputText('')
    setIsLoading(true)

    // Optimistic: show user message immediately
    const tempUserMsg: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: userText,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempUserMsg])

    try {
      const res = await ChatService.sendMessage(userText, activeSessionId, clubId)
      setActiveSessionId(res.session_id)

      if (debugMode) {
        setDebugLog(prev => [...prev,
          `→ POST /chat/send {message: "${userText.slice(0, 50)}...", session_id: ${activeSessionId}, club_id: ${clubId}}`,
          `← 200 OK | session_id: ${res.session_id} | messages: ${res.messages.length}`,
          `← response: "${(res.response || '').slice(0, 200)}"`,
          ...res.messages.map(m => `  [${m.role}] ${m.content?.slice(0, 100) || '(vacío)'}${m.tokens_in ? ` (in:${m.tokens_in} out:${m.tokens_out})` : ''}`),
        ])
      }

      // Replace optimistic message with real messages from server
      setMessages(prev => {
        const withoutTemp = prev.filter(m => m.id !== tempUserMsg.id)
        return [...withoutTemp, ...res.messages.filter(m => m.role !== 'tool')]
      })

      // Refresh sessions list
      loadSessions()
    } catch (error: any) {
      console.error('Error sending message:', error)
      const status = error?.response?.status || '?'
      const detail = error?.response?.data?.detail || error?.response?.data || error?.message || 'Error desconocido'
      const errorStr = typeof detail === 'object' ? JSON.stringify(detail, null, 2) : String(detail)

      if (debugMode) {
        setDebugLog(prev => [...prev,
          `→ POST /chat/send {message: "${userText.slice(0, 50)}...", session_id: ${activeSessionId}, club_id: ${clubId}}`,
          `← ERROR ${status}: ${errorStr}`,
          `  Full error: ${JSON.stringify(error?.response?.data || error?.message || error, null, 2)}`,
        ])
      }

      const errMsg: ChatMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: debugMode
          ? `❌ Error ${status}: ${errorStr}`
          : 'Lo siento, hubo un error al procesar tu mensaje. Inténtalo de nuevo.',
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const handleArchive = async (sessionId: number) => {
    try {
      await ChatService.archiveSession(sessionId)
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      if (activeSessionId === sessionId) {
        startNewSession()
      }
    } catch (err) {
      console.error('Error archiving session:', err)
    }
  }

  const handleInputFocus = () => {
    if (!isExpanded) setIsExpanded(true)
  }

  return (
    <div className={`chat-panel-container ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {isExpanded && (
        <>
          <div className="chat-panel-header">
            <div className="header-left">
              <div className="chat-avatar"><Bot size={20} /></div>
              <div className="chat-title">
                <h3>Flybot</h3>
                <span className="chat-subtitle">{clubName}</span>
              </div>
            </div>
            <div className="header-actions">
              <button
                className="btn-icon"
                onClick={() => { setDebugMode(!debugMode); if (!debugMode) setDebugLog([]) }}
                title={debugMode ? 'Desactivar debug' : 'Activar debug'}
                style={debugMode ? { background: '#fef3c7', borderRadius: '4px' } : undefined}
              >
                <Microscope size={16} />
              </button>
              <button
                className="btn-icon"
                onClick={() => setShowSessions(!showSessions)}
                title="Sesiones"
              >
                <List size={16} />
              </button>
              <button
                className="btn-icon"
                onClick={startNewSession}
                title="Nueva conversación"
              >
                <Plus size={16} />
              </button>
              <button
                className="btn-icon"
                onClick={() => setIsExpanded(false)}
                title="Minimizar"
              >
                −
              </button>
            </div>
          </div>

          {showSessions ? (
            <div className="chat-sessions-list">
              <div className="sessions-header">
                <span>Conversaciones</span>
                <button className="btn-icon small" onClick={startNewSession}>+ Nueva</button>
              </div>
              {sessions.length === 0 ? (
                <p className="sessions-empty">No hay conversaciones previas</p>
              ) : (
                sessions.map(s => (
                  <div
                    key={s.id}
                    className={`session-item ${s.id === activeSessionId ? 'active' : ''}`}
                  >
                    <div className="session-info" onClick={() => loadSessionMessages(s.id)}>
                      <span className="session-title">{s.title || 'Sin título'}</span>
                      <span className="session-meta">
                        {s.message_count} msgs · {new Date(s.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      className="btn-icon small danger"
                      onClick={() => handleArchive(s.id)}
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="chat-messages">
              {messages.length === 0 && (
                <div className="chat-welcome">
                  <p>¡Hola! Soy <strong>Flybot</strong>, tu asistente para <strong>{clubName}</strong>.</p>
                  <p>Puedo ayudarte con información sobre miembros, eventos y más.</p>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`chat-message ${msg.role}`}>
                  <div className="message-bubble">
                    {React.createElement(ReactMarkdown as any, {
                      remarkPlugins: [remarkGfm],
                      children: msg.content,
                    })}
                  </div>
                  <div className="message-time">
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="chat-message assistant">
                  <div className="message-bubble typing">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </>
      )}

      {debugMode && debugLog.length > 0 && (
        <div style={{
          background: '#1f2937', color: '#e5e7eb', padding: '0.5rem',
          fontSize: '0.7rem', fontFamily: 'monospace', maxHeight: '150px',
          overflow: 'auto', borderTop: '2px solid #f59e0b', lineHeight: '1.3',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>DEBUG</span>
            <button onClick={() => setDebugLog([])} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '0.65rem' }}>limpiar</button>
          </div>
          {debugLog.map((line, i) => (
            <div key={i} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{line}</div>
          ))}
        </div>
      )}

      <form className="chat-input-area" onSubmit={handleSend}>
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onFocus={handleInputFocus}
          placeholder={isExpanded ? 'Escribe tu mensaje...' : `Pregunta algo a Flybot sobre ${clubName}...`}
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !inputText.trim()}>
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
