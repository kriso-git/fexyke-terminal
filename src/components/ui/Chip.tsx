import { ReactNode, CSSProperties } from 'react'

type ChipKind = 'default' | 'accent' | 'solid' | 'cyan' | 'mag' | 'dash' | 'warn' | 'err'

interface ChipProps {
  children: ReactNode
  kind?: ChipKind
  dot?: boolean
  style?: CSSProperties
}

export function Chip({ children, kind = 'default', dot, style }: ChipProps) {
  const cls = `chip${kind !== 'default' ? ' ' + kind : ''}`
  return (
    <span className={cls} style={style}>
      {dot && <span className="chip-dot" />}
      {children}
    </span>
  )
}
