'use client'

import { useI18n } from '@/hooks/useI18n'

export function LangBar() {
  const { lang, setLang, LANGS } = useI18n()
  return (
    <div style={{
      display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, flexWrap: 'wrap',
      padding: '8px 96px 8px 24px',
      borderBottom: '1px solid var(--border-1)',
      background: 'var(--bg-1)',
    }}>
      {LANGS.map(l => (
        <button
          key={l}
          onClick={() => setLang(l)}
          style={{
            padding: '3px 8px',
            border: `1px solid ${l === lang ? 'var(--accent)' : 'var(--border-1)'}`,
            background: l === lang ? 'var(--accent-soft)' : 'transparent',
            color: l === lang ? 'var(--accent)' : 'var(--ink-2)',
            fontFamily: 'var(--f-sys)', fontSize: 10, letterSpacing: '.12em',
            cursor: 'pointer',
          }}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
