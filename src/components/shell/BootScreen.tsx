'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const BOOT_LINES: { t: string; c: 'ok' | 'warn' | 'err' | 'dim' | '' }[] = [
  { t: 'F3XYKEE_TERMINAL v0.4.7 — booting...', c: 'ok' },
  { t: 'BIOS SEED: 0xF3XYKEE · mem test ........... 16384 MB OK', c: 'dim' },
  { t: 'loading kernel module [hud.sys] .................. [OK]', c: 'ok' },
  { t: 'loading kernel module [scanlines.sys] ............ [OK]', c: 'ok' },
  { t: 'loading kernel module [presence.sys] ............. [OK]', c: 'ok' },
  { t: 'mounting /entries ................................ [OK]', c: 'ok' },
  { t: 'mounting /signals ................................ [OK]', c: 'ok' },
  { t: 'mounting /messages ............................... [OK]', c: 'ok' },
  { t: 'mounting /friendships ............................ [OK]', c: 'ok' },
  { t: 'syncing supabase nodes ........................... [LIVE]', c: 'ok' },
  { t: 'checking node f3x-pri-01 ......................... [STABLE]', c: 'ok' },
  { t: 'checking integrity ............................... [0.98]', c: 'warn' },
  { t: 'init operator session ............................ [READY]', c: 'ok' },
  { t: '', c: '' },
  { t: 'I was meant to be new...', c: 'dim' },
  { t: 'I was meant to be beautiful.', c: 'ok' },
]

const STORAGE_KEY = 'f3x_boot_seen'

export function BootScreen() {
  // Run synchronously before first paint so we don't see the page flash through.
  const [mounted, setMounted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return !sessionStorage.getItem(STORAGE_KEY)
  })
  const [shown, setShown]     = useState<number>(0)
  const [fading, setFading]   = useState(false)
  const [done, setDone]       = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return !!sessionStorage.getItem(STORAGE_KEY)
  })
  const finishedRef           = useRef(false)

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return
    if (mounted && !done) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      document.documentElement.classList.remove('booting')
    }
    return () => { document.body.style.overflow = '' }
  }, [mounted, done])

  useEffect(() => {
    if (!mounted || done) return
    // Stop animating lines once everything is shown — wait for a click.
    if (shown >= BOOT_LINES.length) return
    const next = BOOT_LINES[shown]
    const delay = next.t === '' ? 80 : 100 + Math.random() * 80
    const t = setTimeout(() => setShown(n => n + 1), delay)
    return () => clearTimeout(t)
  }, [mounted, shown, done])

  function finish() {
    if (finishedRef.current) return
    finishedRef.current = true
    // Reveal page underneath as the boot fades out
    if (typeof document !== 'undefined') document.documentElement.classList.remove('booting')
    setFading(true)
    setTimeout(() => {
      sessionStorage.setItem(STORAGE_KEY, '1')
      setDone(true)
    }, 500)
  }

  // Click-only skip — handled on the overlay onClick below

  if (!mounted || done) return null

  return (
    <div
      className="boot-screen-overlay"
      onClick={finish}
      role="presentation"
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: '#000',
        color: 'var(--accent)',
        fontFamily: 'var(--f-mono)',
        textShadow: '0 0 6px rgba(24,233,104,.4)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start',
        padding: 'max(40px, env(safe-area-inset-top)) 40px max(40px, env(safe-area-inset-bottom))',
        cursor: 'pointer',
        opacity: fading ? 0 : 1,
        transform: fading ? 'scale(1.04)' : 'scale(1)',
        filter: fading ? 'blur(8px)' : 'none',
        transition: 'opacity .5s, transform .5s, filter .5s',
        overflow: 'hidden',
      }}
    >
      {/* Scanline overlay */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,.30) 3px)',
        pointerEvents: 'none',
      }}/>
      {/* Vignette */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,.65) 100%)',
        pointerEvents: 'none',
      }}/>

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, lineHeight: 1.45, maxWidth: 820, width: '100%' }}>
        {BOOT_LINES.slice(0, shown).map((l, i) => (
          <div key={i} style={{
            opacity: 0,
            animation: 'crtline .15s forwards',
            color: l.c === 'ok' ? 'var(--accent)' : l.c === 'warn' ? 'var(--amber)' : l.c === 'err' ? 'var(--red)' : l.c === 'dim' ? 'var(--ink-2)' : 'var(--ink-1)',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {l.t || ' '}
          </div>
        ))}
        {shown >= BOOT_LINES.length && (
          <span aria-hidden style={{
            display: 'inline-block', width: 10, height: 16, background: 'var(--accent)',
            marginTop: 6, animation: 'crt-blink .8s steps(2) infinite',
          }}/>
        )}
      </div>

      <div aria-hidden style={{
        position: 'absolute', bottom: 16, right: 20,
        fontSize: 10, color: 'var(--ink-3)', letterSpacing: '.18em',
      }}>
        ▸ KATTINTÁS A FOLYTATÁSHOZ
      </div>

      <style>{`
        @keyframes crtline { to { opacity: 1; } }
        @keyframes crt-blink { 50% { opacity: 0; } }
      `}</style>
    </div>
  )
}
