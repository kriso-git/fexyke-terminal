'use client'

import { useI18n } from '@/hooks/useI18n'

export function LangPicker() {
  const { lang, setLang, LANGS, LANG_LABELS } = useI18n()

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {LANGS.map(l => (
        <button
          key={l}
          className={`chip${l === lang ? ' chip-accent' : ''}`}
          style={{ cursor: 'pointer' }}
          onClick={() => setLang(l)}
        >
          {LANG_LABELS[l]}
        </button>
      ))}
    </div>
  )
}
