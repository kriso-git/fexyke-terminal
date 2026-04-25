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
    return `${hh}:${mm}:${ss}`
  }

  const getWeek = (d: Date) => {
    const date = new Date(d)
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7)
    const w1 = new Date(date.getFullYear(), 0, 4)
    return 1 + Math.round(((date.getTime() - w1.getTime()) / 86400000 - 3 + (w1.getDay() + 6) % 7) / 7)
  }

  return (
    <div className="topbar">
      <div className="cell brand">F3XYKEE · BLOG</div>
      <div className="cell">
        <span className="dot" /> {status}
      </div>
      <div className="cell topbar-hide">SZERVER · BUD-01</div>
      <div className="cell topbar-hide">{clock ? `${clock.getFullYear()} · ${getWeek(clock)}. HÉT` : '---'}</div>
      <div className="cell grow topbar-hide">◢ ÉLŐ BLOG FELÜLET · V0.1</div>
      {clock && <div className="cell topbar-hide">{fmt(clock)} UTC</div>}
      <div className="cell topbar-hide">{sessionId}</div>
      {user ? (
        <>
          <div className="cell" style={{ color: 'var(--accent)', fontSize: 10 }}>◉ {user.split(' · ')[0]}</div>
          <div className="cell">
            <button
              onClick={() => logout()}
              className="btn btn-ghost btn-sm"
              style={{ padding:'4px 10px', fontSize:10, letterSpacing:'.12em', minHeight:0 }}
            >
              KI
            </button>
          </div>
        </>
      ) : (
        <div className="cell" style={{ color: 'var(--ink-3)' }}>◯ VENDÉG</div>
      )}
    </div>
  )
}
