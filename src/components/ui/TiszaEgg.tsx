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
        // Past the 48px-wide DataStream sidebar on the left
        left: 64,
        zIndex: 7000,
        width: 88,
        height: 88,
        padding: 0,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform .18s, filter .18s',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
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
            ? 'drop-shadow(0 0 12px rgba(24,233,104,.85))'
            : 'drop-shadow(0 0 6px rgba(24,233,104,.45))',
          transition: 'filter .18s',
        }}
      />
    </button>
  )
}
