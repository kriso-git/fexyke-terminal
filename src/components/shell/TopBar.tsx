'use client'

import { useState, useEffect } from 'react'
import { logout } from '@/app/actions'

interface TopBarProps {
  user?: string | null
  status?: string
  sessionId?: string
}

export function TopBar({ user, status = 'ONLINE', sessionId = 'SES-7F2A-0481' }: TopBarProps) {
  const [clock, setClock] = useState<Date | null>(null)

  useEffect(() => {
    setClock(new Date())
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const fmt = (d: Date) => {
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')
    return `${hh}:${mm}:${ss} UTC`
  }

  return (
    <div className="topbar">
      <div className="cell brand">F3XYKEE · TERMINAL</div>
      <div className="cell">
        <span className="dot" /> {status}
      </div>
      <div className="cell">NODE · F3X-PRI-01</div>
      <div className="cell">CIKLUS · 047</div>
      <div className="cell grow">◢ ÉLŐ ADATHÁLÓZATI INTERFÉSZ · V0.1</div>
      {clock && <div className="cell">{fmt(clock)}</div>}
      <div className="cell">{sessionId}</div>
      {user ? (
        <>
          <div className="cell" style={{ color: 'var(--accent)' }}>◉ {user}</div>
          <div className="cell">
            <button
              onClick={() => logout()}
              className="btn btn-ghost btn-sm"
              style={{ padding:'2px 8px', fontSize:10, letterSpacing:'.15em' }}
            >
              KILÉPÉS
            </button>
          </div>
        </>
      ) : (
        <div className="cell" style={{ color: 'var(--ink-3)' }}>◯ VENDÉG</div>
      )}
    </div>
  )
}
