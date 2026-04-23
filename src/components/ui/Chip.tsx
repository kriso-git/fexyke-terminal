import { ReactNode } from 'react'

type ChipKind = 'default' | 'accent' | 'solid' | 'cyan' | 'mag' | 'dash' | 'warn' | 'err'

interface ChipProps {
  children: ReactNode
  kind?: ChipKind
  dot?: boolean
}

export function Chip({ children, kind = 'default', dot }: ChipProps) {
  const cls = `chip${kind !== 'default' ? ' ' + kind : ''}`
  return (
    <span className={cls}>
      {dot && <span className="chip-dot" />}
      {children}
    </span>
  )
}
