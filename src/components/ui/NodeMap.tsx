'use client'

import { useMemo } from 'react'

interface NodeMapProps {
  highlight?: number
  count?: number
  seed?: number
}

export function NodeMap({ highlight = 2, count = 10, seed = 7 }: NodeMapProps) {
  const nodes = useMemo(() => {
    const arr: [number, number][] = []
    let s = seed
    for (let i = 0; i < count; i++) {
      s = (s * 9301 + 49297) % 233280
      const x = 8 + (s / 233280) * 180
      s = (s * 9301 + 49297) % 233280
      const y = 8 + (s / 233280) * 120
      arr.push([x, y])
    }
    return arr
  }, [count, seed])

  return (
    <svg viewBox="0 0 200 140" style={{ width: '100%', height: '100%', display: 'block' }}>
      {nodes.map((p, i) =>
        i < nodes.length - 1 ? (
          <line
            key={'l' + i}
            x1={p[0]} y1={p[1]}
            x2={nodes[i + 1][0]} y2={nodes[i + 1][1]}
            stroke="var(--border-1)" strokeWidth="0.5" vectorEffect="non-scaling-stroke"
          />
        ) : null
      )}
      {nodes.map((p, i) => (
        <g key={i}>
          <circle
            cx={p[0]} cy={p[1]}
            r={i === highlight ? 3.2 : 1.8}
            fill={i === highlight ? 'var(--accent)' : 'var(--bg-2)'}
            stroke={i === highlight ? 'var(--accent)' : 'var(--ink-3)'}
            strokeWidth="1" vectorEffect="non-scaling-stroke"
            style={i === highlight ? { filter: 'drop-shadow(0 0 3px var(--accent))' } : undefined}
          />
          {i === highlight && (
            <circle
              cx={p[0]} cy={p[1]} r="6"
              fill="none" stroke="var(--accent)" strokeWidth="0.5"
              vectorEffect="non-scaling-stroke" opacity="0.6"
            />
          )}
        </g>
      ))}
    </svg>
  )
}
