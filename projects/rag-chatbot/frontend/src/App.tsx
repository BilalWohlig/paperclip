import { useState, useRef, useCallback, KeyboardEvent } from 'react'
import { ChatWindow } from './components/ChatWindow'
import { type Message } from './components/MessageBubble'
import { type SourceChunk } from './components/SourceChunks'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return

    const userMsg: Message = { id: generateId(), role: 'user', content: text }
    const assistantId = generateId()
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      streaming: true,
    }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulatedContent = ''
      let finalSources: SourceChunk[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue

          let event: { type: string; content?: string; sources?: SourceChunk[] }
          try {
            event = JSON.parse(raw)
          } catch {
            continue
          }

          if (event.type === 'chunk' && event.content) {
            accumulatedContent += event.content
            const snap = accumulatedContent
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId ? { ...m, content: snap, streaming: true } : m,
              ),
            )
          } else if (event.type === 'sources' && event.sources) {
            finalSources = event.sources
          } else if (event.type === 'done') {
            break
          }
        }
      }

      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: accumulatedContent, streaming: false, sources: finalSources }
            : m,
        ),
      )
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return

      const errMsg = err instanceof Error ? err.message : String(err)
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? {
                ...m,
                content: `Error: ${errMsg}. Is the backend running at ${API_URL}?`,
                streaming: false,
              }
            : m,
        ),
      )
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [input, streaming])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage()
      }
    },
    [sendMessage],
  )

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.title}>RAG Chatbot</h1>
        <p style={styles.subtitle}>Ask questions about your document</p>
      </header>

      <div style={styles.chatContainer}>
        <ChatWindow messages={messages} />

        <div style={styles.inputArea}>
          {streaming && (
            <div style={styles.loadingBar}>
              <span style={styles.loadingDots}>
                <span>·</span><span>·</span><span>·</span>
              </span>
              <span style={{ marginLeft: 6, fontSize: 12, color: '#6b7280' }}>Generating…</span>
            </div>
          )}
          <div style={styles.inputRow}>
            <textarea
              style={styles.textarea}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question… (Enter to send, Shift+Enter for new line)"
              disabled={streaming}
              rows={2}
            />
            <button
              style={{
                ...styles.sendButton,
                ...(streaming || !input.trim() ? styles.sendButtonDisabled : {}),
              }}
              onClick={sendMessage}
              disabled={streaming || !input.trim()}
            >
              Send
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes bounce {
          0%, 80%, 100% { opacity: 0.2; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-4px); }
        }
        .loading-dots span {
          display: inline-block;
          animation: bounce 1.2s infinite;
          font-size: 18px;
          line-height: 1;
          color: #6b7280;
        }
        .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
        .loading-dots span:nth-child(3) { animation-delay: 0.4s; }
        textarea:focus { outline: 2px solid #2563eb; outline-offset: -1px; }
        textarea:disabled { background: #f9fafb; cursor: not-allowed; }
      `}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0 16px 24px',
    background: '#f0f2f5',
  },
  header: {
    textAlign: 'center',
    padding: '24px 0 16px',
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: '#111',
    letterSpacing: '-0.3px',
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  chatContainer: {
    width: '100%',
    maxWidth: 800,
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 140px)',
    minHeight: 400,
  },
  inputArea: {
    borderTop: '1px solid #e5e7eb',
    padding: '12px 16px',
  },
  loadingBar: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 8,
  },
  loadingDots: {
    display: 'inline-flex',
    gap: 2,
  },
  inputRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'flex-end',
  },
  textarea: {
    flex: 1,
    resize: 'none',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    fontSize: 14,
    lineHeight: 1.5,
    fontFamily: 'inherit',
    background: '#fff',
    transition: 'border-color 0.15s',
  },
  sendButton: {
    padding: '10px 18px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    transition: 'background 0.15s',
  },
  sendButtonDisabled: {
    background: '#93c5fd',
    cursor: 'not-allowed',
  },
}
