import { SourceChunks, type SourceChunk } from './SourceChunks'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: SourceChunk[]
  streaming?: boolean
}

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  return (
    <div style={{ ...styles.row, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{ maxWidth: '72%' }}>
        <div
          style={{
            ...styles.bubble,
            ...(isUser ? styles.userBubble : styles.assistantBubble),
          }}
        >
          {message.content}
          {message.streaming && <span style={styles.cursor}>▍</span>}
        </div>
        {!isUser && message.sources && message.sources.length > 0 && !message.streaming && (
          <SourceChunks sources={message.sources} />
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    marginBottom: 12,
  },
  bubble: {
    padding: '10px 14px',
    borderRadius: 12,
    fontSize: 14,
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  userBubble: {
    background: '#2563eb',
    color: '#fff',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    background: '#fff',
    color: '#111',
    border: '1px solid #e5e7eb',
    borderBottomLeftRadius: 4,
  },
  cursor: {
    display: 'inline-block',
    animation: 'blink 0.7s step-end infinite',
    marginLeft: 2,
  },
}
