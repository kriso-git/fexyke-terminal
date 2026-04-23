import { ReactNode, CSSProperties } from 'react'

interface PanelProps {
  title?: string
  tag?: string
  chips?: ReactNode
  children: ReactNode
  style?: CSSProperties
  className?: string
  hud?: boolean
}

export function Panel({ title, tag, chips, children, style, className = '', hud = true }: PanelProps) {
  return (
    <div className={`panel${hud ? ' panel-hud' : ''} ${className}`} style={style}>
      {hud && <><span className="hud-br" /><span className="hud-bl" /></>}
      {(title || tag) && (
        <div className="panel-header">
          {tag && <span className="label">{tag}</span>}
          {title && <span>{title}</span>}
          <span style={{ flex: 1 }} />
          {chips}
        </div>
      )}
      <div className="panel-body">{children}</div>
    </div>
  )
}
