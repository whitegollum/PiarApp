import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import APIService from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import '../styles/OpenClawChat.css';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

interface OpenClawChatProps {
  clubId: number;
  clubName: string;
}

export default function OpenClawChat({ clubId, clubName }: OpenClawChatProps) {
  const { usuario } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Check if there are user messages to decide initial state (if persisted in future)
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [debugResults, setDebugResults] = useState<any>(null);
  const [isDebugging, setIsDebugging] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const extractText = (content: any): string => {
    let text = '';
    if (typeof content === 'string') {
      text = content;
    } else if (Array.isArray(content)) {
      text = content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join(' ');
    } else if (typeof content === 'object' && content !== null) {
      text = content.text || '';
    }
    // Clean up internal tags like [[reply_to_current]]
    return text.replace(/\[\[.*?\]\]/g, '').trim();
  };

  // Verificar conexión cuando se expande el chat y periódicamente
  useEffect(() => {
    if (isExpanded) {
      const checkConnection = async () => {
        try {
          // Verificar conexión WebSocket real con OpenClaw
          const response: any = await APIService.get(`/chat/openclaw/status`);
          if (response.connected) {
            setConnectionStatus('online');
          } else {
            console.error('OpenClaw not connected:', response.error);
            setConnectionStatus('offline');
          }
        } catch (error) {
          console.error('OpenClaw connection check failed:', error);
          setConnectionStatus('offline');
        }
      };
      
      // Verificar inmediatamente al expandir
      checkConnection();
      
      // Verificar cada 30 segundos mientras está expandido
      const intervalId = setInterval(checkConnection, 30000);
      
      // Limpiar intervalo cuando se colapsa o desmonta
      return () => clearInterval(intervalId);
    } else {
      // Resetear a "checking" cuando se colapsa
      setConnectionStatus('checking');
    }
  }, [isExpanded, clubId]);

  useEffect(() => {
    if (isExpanded && !hasLoadedHistory) {
      const loadHistory = async () => {
        try {
          const response: any = await APIService.get(`/chat/openclaw/history?limit=20&club_id=${clubId}`);
          // Adjust based on actual API response structure (e.g., response.messages or response directly)
          const historyData = Array.isArray(response) ? response : (response.messages || []);
          
          if (historyData.length > 0) {
            // Process messages: assume history returns oldest->newest or newest->oldest.
            // If timestamps exist, sort by timestamp ascending (oldest first).
            const historyMessages: Message[] = historyData.map((msg: any, index: number) => ({
              id: msg.id || `hist-${index}-${Date.now()}`,
              sender: (msg.role === 'user' || msg.sender === 'user') ? 'user' : 'bot',
              text: extractText(msg.content || msg.text),
              // Use Date.now() fallback if no timestamp, preserving index order as tie-breaker
              timestamp: msg.timestamp ? new Date(msg.timestamp * 1000) : new Date(Date.now() - (historyData.length - index) * 1000) 
            }));

            // Sort by timestamp ascending (oldest to newest) so chat reads top-down
            historyMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            
            setMessages(prev => {
              // Ensure we don't duplicate or lose current session messages
              // Filter out welcome message to re-insert at top
              const welcome = prev.find(m => m.id === 'welcome');
              const currentSessionIds = new Set(prev.map(m => m.id));
              
              // Filter out history messages that might already be in current session (unlikely but safe)
              const newHistory = historyMessages.filter(h => !currentSessionIds.has(h.id));
              
              const others = prev.filter(m => m.id !== 'welcome');
              
              if (welcome) {
                  return [welcome, ...newHistory, ...others];
              }
              return [...newHistory, ...others];
            });
          }
        } catch (err) {
          console.error("Error loading history:", err);
        } finally {
          setHasLoadedHistory(true);
        }
      };
      loadHistory();
    }
  }, [isExpanded, hasLoadedHistory]);

  useEffect(() => {
    if (isExpanded) {
      scrollToBottom();
    }
  }, [messages, isExpanded]);

  const handleInputFocus = () => {
    if (!isExpanded) {
      setIsExpanded(true);
    }
  };

  const handleCollapse = () => {
    setIsExpanded(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const chatPayload = {
        club_id: clubId,
        messages: [
           ...messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
           { role: 'user', content: inputText }
        ]
      };

      const res = await APIService.post<{reply: string}>('/chat/openclaw', chatPayload);
      const botReply = extractText(res.reply);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: botReply,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: 'Lo siento, tuve problemas para conectar con mis servidores.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const runDiagnostic = async () => {
    setIsDebugging(true);
    setShowDebugModal(true);
    setDebugResults(null);
    
    try {
      const result = await APIService.get('/chat/openclaw/debug');
      setDebugResults(result);
    } catch (error: any) {
      setDebugResults({
        success: false,
        error: error.message || 'Failed to run diagnostic',
        steps: [{ step: 'request_error', status: 'error', details: error.toString() }]
      });
    } finally {
      setIsDebugging(false);
    }
  };

  return (
    <div className={`openclaw-chat-container ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {isExpanded && (
        <>
          <div className="openclaw-header">
            <div className="header-info">
              <div className="openclaw-avatar">🤖</div>
              <div className="openclaw-title">
                <h3>OpenClaw Bot</h3>
                <span className={`openclaw-status status-${connectionStatus}`}>
                  {connectionStatus === 'online' && '🟢 En línea'}
                  {connectionStatus === 'offline' && '🔴 Sin conexión'}
                  {connectionStatus === 'checking' && '🟡 Verificando...'}
                </span>
              </div>
            </div>
            <div className="header-actions">
              {usuario?.es_superadmin && (
                <button 
                  className="debug-btn" 
                  onClick={runDiagnostic} 
                  title="Diagnóstico de conexión (Solo superadmins)"
                  disabled={isDebugging}
                >
                  🔧
                </button>
              )}
              <button className="minimize-btn" onClick={handleCollapse} title="Minimizar chat">
                −
              </button>
            </div>
          </div>
      
          <div className="openclaw-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.sender}`}>
                <div className="message-content">
                  {React.createElement(ReactMarkdown as any, { remarkPlugins: [remarkGfm], children: msg.text })}
                </div>
                <div className="message-time">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message bot openclaw-loading">
                 <div className="typing-indicator">
                    <span></span><span></span><span></span>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </>
      )}

      <form className="openclaw-input-area" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onFocus={handleInputFocus}
          placeholder={isExpanded ? "Escribe tu mensaje..." : `Pregunta algo a OpenClaw sobre ${clubName}...`}
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !inputText.trim()}>
          ➤
        </button>
      </form>

      {/* Debug Modal */}
      {showDebugModal && (
        <div className="debug-modal-overlay" onClick={() => setShowDebugModal(false)}>
          <div className="debug-modal" onClick={(e) => e.stopPropagation()}>
            <div className="debug-modal-header">
              <h3>🔧 Diagnóstico de Conexión OpenClaw</h3>
              <button onClick={() => setShowDebugModal(false)}>×</button>
            </div>
            <div className="debug-modal-body">
              {isDebugging && (
                <div className="debug-loading">
                  <div className="spinner"></div>
                  <p>Ejecutando diagnóstico...</p>
                </div>
              )}
              
              {debugResults && (
                <div className="debug-results">
                  <div className={`debug-summary ${debugResults.success ? 'success' : 'error'}`}>
                    <strong>Estado:</strong> {debugResults.success ? '✅ Conexión exitosa' : '❌ Error en conexión'}
                    {debugResults.error && <div className="error-message">Error: {debugResults.error}</div>}
                  </div>

                  {debugResults.config && (
                    <div className="debug-section">
                      <h4>📋 Configuración</h4>
                      <ul>
                        <li><strong>URL:</strong> {debugResults.config.ws_url}</li>
                        <li><strong>Auth Mode:</strong> {debugResults.config.auth_mode}</li>
                        <li><strong>Password configurada:</strong> {debugResults.config.has_password ? '✅ Sí' : '❌ No'}</li>
                        <li><strong>API Key configurada:</strong> {debugResults.config.has_api_key ? '✅ Sí' : '❌ No'}</li>
                        {debugResults.config.client_id && (
                          <li><strong>Client ID:</strong> {debugResults.config.client_id}</li>
                        )}
                        {debugResults.config.protocol_version && (
                          <li><strong>Protocol Version:</strong> {debugResults.config.protocol_version}</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {debugResults.steps && debugResults.steps.length > 0 && (
                    <div className="debug-section">
                      <h4>🔍 Pasos de Diagnóstico</h4>
                      <div className="debug-steps">
                        {debugResults.steps.map((step: any, index: number) => (
                          <div key={index} className={`debug-step ${step.status}`}>
                            <div className="step-header">
                              <span className="step-icon">
                                {step.status === 'ok' ? '✅' : '❌'}
                              </span>
                              <span className="step-name">{step.step}</span>
                            </div>
                            <div className="step-details">{step.details}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="debug-actions">
                    <button className="btn-secondary" onClick={() => setShowDebugModal(false)}>
                      Cerrar
                    </button>
                    <button className="btn-primary" onClick={runDiagnostic} disabled={isDebugging}>
                      Volver a ejecutar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
