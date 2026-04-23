'use client'

import { useMemo } from 'react'

interface AvatarProps {
  id?: string
  size?: number
}

export function Avatar({ id = 'F3X-000', size = 40 }: AvatarProps) {
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

  return (
    <div className="avatar" style={{ width: size, height: size }}>
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
