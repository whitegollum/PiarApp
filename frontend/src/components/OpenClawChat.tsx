import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import APIService from '../services/api';
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Check if there are user messages to decide initial state (if persisted in future)
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
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

  return (
    <div className={`openclaw-chat-container ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {isExpanded && (
        <>
          <div className="openclaw-header">
            <div className="header-info">
              <div className="openclaw-avatar">🤖</div>
              <div className="openclaw-title">
                <h3>OpenClaw Bot</h3>
                <span className="openclaw-status">En línea</span>
              </div>
            </div>
            <button className="minimize-btn" onClick={handleCollapse} title="Minimizar chat">
              −
            </button>
          </div>
      
          <div className="openclaw-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.sender}`}>
                <div className="message-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.text}
                  </ReactMarkdown>
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
    </div>
  );
}
