'use client'

import { useEffect, useRef, useState } from 'react'

export function TiszaEgg() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  function handleClick() {
    if (!audioRef.current) {
      const a = new Audio('/assets/tiszamegnyerte.mp3')
      a.volume = 0.75
      a.onended = () => setPlaying(false)
      audioRef.current = a
    }
    const a = audioRef.current
    if (playing) {
      a.pause()
      a.currentTime = 0
      setPlaying(false)
    } else {
      a.play().then(() => setPlaying(true)).catch(() => {})
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title="🇭🇺"
      aria-label="Easter egg"
      className={`tisza-egg${playing ? ' tisza-egg-playing' : ''}`}
      style={{
        position: 'fixed',
        bottom: 18,
        left: 18,
        zIndex: 7000,
        width: 56,
        height: 56,
        padding: 6,
        background: 'var(--bg-1)',
        border: '1px solid var(--accent)',
        boxShadow: '0 0 0 1px rgba(24,233,104,.18), 0 0 14px -2px rgba(24,233,104,.35)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'box-shadow .18s, transform .18s, background .18s',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Corner accents — matches the panel aesthetic across the app */}
      <span aria-hidden style={{ position:'absolute', top:-1, left:-1,  width:6, height:6, borderTop:'1px solid var(--accent)',    borderLeft:'1px solid var(--accent)' }}/>
      <span aria-hidden style={{ position:'absolute', top:-1, right:-1, width:6, height:6, borderTop:'1px solid var(--accent)',    borderRight:'1px solid var(--accent)' }}/>
      <span aria-hidden style={{ position:'absolute', bottom:-1, left:-1, width:6, height:6, borderBottom:'1px solid var(--accent)', borderLeft:'1px solid var(--accent)' }}/>
      <span aria-hidden style={{ position:'absolute', bottom:-1, right:-1, width:6, height:6, borderBottom:'1px solid var(--accent)', borderRight:'1px solid var(--accent)' }}/>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/tisza-logo.png"
        alt=""
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          pointerEvents: 'none',
          filter: playing
            ? 'drop-shadow(0 0 6px rgba(24,233,104,.7))'
            : 'drop-shadow(0 0 3px rgba(24,233,104,.35))',
          transition: 'filter .18s',
        }}
      />
    </button>
  )
}
