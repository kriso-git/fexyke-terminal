'use client'

import { useMemo } from 'react'

interface DataStreamProps {
  side?: 'left' | 'right'
}

function genLines(side: 'left' | 'right') {
  const tags = ['TX','RX','SYN','ACK','CRC','KEY','HDR','PKT','NOD','LNK','REL','LOG','DIF','OPS','THR']
  const seed = side === 'left' ? 0x9F2A : 0x7C41
  const hex = (n: number) => n.toString(16).padStart(4,'0').toUpperCase()
  let x = seed
  const out: { t: string; cls: string }[] = []
  for (let i = 0; i < 140; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff
    const tag = tags[x % tags.length]
    const hx1 = hex((x >> 4) & 0xffff)
    const hx2 = hex((x >> 12) & 0xffff)
    const cls = (x % 13) === 0 ? 'hi' : (x % 17) === 0 ? 'cy' : (x % 29) === 0 ? 'mg' : ''
    out.push({ t: `${tag}·${hx1}${hx2}`, cls })
  }
  return out
}

export function DataStream({ side = 'left' }: DataStreamProps) {
  const lines = useMemo(() => genLines(side), [side])
  const doubled = [...lines, ...lines]

  return (
    <div className={`datastream ${side}`} aria-hidden>
      <div className="datastream-track">
        {doubled.map((l, i) => (
          <div key={i} className={`datastream-line${l.cls ? ' ' + l.cls : ''}`}>
            {l.t}
          </div>
        ))}
      </div>
    </div>
  )
}
