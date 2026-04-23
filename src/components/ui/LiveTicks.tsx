'use client'

import { useState, useEffect, useMemo } from 'react'

interface LiveTicksProps {
  count?: number
  height?: number
  color?: string
}

export function LiveTicks({ count = 24, height = 28, color = 'var(--accent)' }: LiveTicksProps) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 160)
    return () => clearInterval(t)
  }, [])

  const bars = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const s = Math.sin((tick + i * 0.7) * 0.4) * 0.5 + 0.5
      const n = Math.abs(Math.sin(tick * 0.23 + i * 1.9)) * 0.4
      return Math.max(0.1, Math.min(1, s * 0.7 + n))
    })
  }, [tick, count])

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height, width: '100%' }}>
      {bars.map((h, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${h * 100}%`,
            background: color,
            opacity: 0.25 + h * 0.75,
            boxShadow: `0 0 4px ${color}`,
          }}
        />
      ))}
    </div>
  )
}
