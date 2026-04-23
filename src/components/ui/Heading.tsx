interface HeadingProps {
  tag?: string
  title: string
  sub?: string
  align?: 'left' | 'center'
}

export function Heading({ tag, title, sub, align = 'left' }: HeadingProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        alignItems: align === 'center' ? 'center' : 'flex-start',
      }}
    >
      {tag && <span className="sys muted">◢ {tag}</span>}
      <h2 className="display" style={{ margin: 0, fontSize: 36, lineHeight: 1.02, color: 'var(--ink-0)' }}>
        {title}
      </h2>
      {sub && (
        <div className="muted" style={{ maxWidth: 640, fontSize: 13, lineHeight: 1.55 }}>
          {sub}
        </div>
      )}
    </div>
  )
}
