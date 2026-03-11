import { useState } from 'react'

export interface SourceChunk {
  content: string
  chunkIndex: number
  sourceFile: string
}

interface SourceChunksProps {
  sources: SourceChunk[]
}

export function SourceChunks({ sources }: SourceChunksProps) {
  const [open, setOpen] = useState(false)

  if (sources.length === 0) return null

  return (
    <div style={styles.container}>
      <button
        onClick={() => setOpen(o => !o)}
        style={styles.toggle}
        aria-expanded={open}
      >
        {open ? '▾' : '▸'} {sources.length} source{sources.length !== 1 ? 's' : ''}
      </button>
      {open && (
        <div style={styles.list}>
          {sources.map((chunk, i) => (
            <div key={i} style={styles.card}>
              <div style={styles.meta}>
                <span style={styles.badge}>#{chunk.chunkIndex}</span>
                <span style={styles.file}>{chunk.sourceFile}</span>
              </div>
              <p style={styles.excerpt}>
                {chunk.content.length > 200
                  ? chunk.content.slice(0, 200) + '…'
                  : chunk.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginTop: 8,
  },
  toggle: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    color: '#6b7280',
    padding: '2px 0',
    fontWeight: 500,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginTop: 6,
  },
  card: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    padding: '8px 10px',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  badge: {
    background: '#e5e7eb',
    borderRadius: 4,
    padding: '1px 6px',
    fontSize: 11,
    fontWeight: 600,
    color: '#374151',
  },
  file: {
    fontSize: 11,
    color: '#6b7280',
    fontStyle: 'italic',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  excerpt: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 1.5,
  },
}
