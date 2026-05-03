'use client'

import { useMemo } from 'react'

interface AvatarProps {
  id?: string
  size?: number
  src?: string | null
  lastSeen?: string | null
  showPresence?: boolean
}

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000

export function Avatar({ id = '0000', size = 40, src, lastSeen, showPresence = true }: AvatarProps) {
  const shapes = useMemo(() => {
    const n = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    const arr: number[] = []
    let s = n
    for (let i = 0; i < 9; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff
      arr.push(s % 2)
    }
    return arr
  }, [id])

  const online = useMemo(() => {
    if (!showPresence || !lastSeen) return false
    const t = new Date(lastSeen).getTime()
    if (isNaN(t)) return false
    return Date.now() - t < ONLINE_THRESHOLD_MS
  }, [lastSeen, showPresence])

  const ringStyle: React.CSSProperties = online
    ? { boxShadow: '0 0 0 1.5px var(--accent), 0 0 6px rgba(24,233,104,.6)' }
    : {}

  if (src) {
    return (
      <div className="avatar" style={{ width: size, height: size, overflow: 'hidden', ...ringStyle }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
      </div>
    )
  }

  return (
    <div className="avatar" style={{ width: size, height: size, ...ringStyle }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3,1fr)',
          gap: 2,
          width: size * 0.6,
          height: size * 0.6,
          position: 'relative',
          zIndex: 2,
        }}
      >
        {shapes.map((v, i) => (
          <div
            key={i}
            style={{
              width: '100%',
              aspectRatio: '1',
              background: v ? 'var(--accent)' : 'transparent',
              boxShadow: v ? '0 0 3px var(--accent)' : 'none',
            }}
          />
        ))}
      </div>
    </div>
  )
}
