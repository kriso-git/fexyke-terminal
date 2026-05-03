'use client'

import { useEffect, useRef, useState } from 'react'
import { useI18n, type Lang } from '@/hooks/useI18n'

interface LangPickerProps {
  align?: 'left' | 'right'
  size?: 'sm' | 'md'
}

export function LangPicker({ align = 'right', size = 'md' }: LangPickerProps) {
  const { lang, setLang, LANGS, LANG_LABELS } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDocClick); document.removeEventListener('keydown', onKey) }
  }, [open])

  const padX = size === 'sm' ? 7 : 10
  const padY = size === 'sm' ? 3 : 5
  const fs   = size === 'sm' ? 10 : 11

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: `${padY}px ${padX}px`,
          border: '1px solid var(--border-1)',
          background: open ? 'var(--accent-soft)' : 'var(--bg-2)',
          color: open ? 'var(--accent)' : 'var(--ink-1)',
          fontFamily: 'var(--f-sys)', fontSize: fs, letterSpacing: '.14em',
          cursor: 'pointer', minHeight: 0, lineHeight: 1.2,
        }}
      >
        <span aria-hidden style={{ fontSize: fs }}>◢</span>
        {LANG_LABELS[lang]}
        <span aria-hidden style={{ fontSize: fs, opacity: .7 }}>{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute', top: '100%', marginTop: 4,
            [align]: 0,
            background: 'var(--bg-1)',
            border: '1px solid var(--accent)',
            boxShadow: '0 0 0 1px rgba(24,233,104,.15), 0 14px 36px -10px rgba(0,0,0,.85)',
            display: 'flex', flexDirection: 'column',
            minWidth: 80, zIndex: 8500,
          } as React.CSSProperties}
        >
          {LANGS.map(l => (
            <button
              key={l}
              role="option"
              aria-selected={l === lang}
              onClick={() => { setLang(l as Lang); setOpen(false) }}
              style={{
                padding: '6px 12px', textAlign: 'left',
                background: l === lang ? 'var(--accent-soft)' : 'transparent',
                color: l === lang ? 'var(--accent)' : 'var(--ink-1)',
                border: 'none', borderBottom: '1px solid var(--border-0)',
                fontFamily: 'var(--f-sys)', fontSize: fs, letterSpacing: '.14em',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { if (l !== lang) e.currentTarget.style.background = 'var(--bg-2)' }}
              onMouseLeave={e => { if (l !== lang) e.currentTarget.style.background = 'transparent' }}
            >
              {LANG_LABELS[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
