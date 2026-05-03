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
        padding: 0,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: playing ? 1 : 0.5,
        transition: 'opacity .2s, transform .2s',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/TISZA_2024.svg.png"
        alt=""
        style={{
          width: 64,
          height: 'auto',
          objectFit: 'contain',
          pointerEvents: 'none',
          borderRadius: 4,
        }}
      />
    </button>
  )
}
