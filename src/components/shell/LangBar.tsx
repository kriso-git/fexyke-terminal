'use client'

import { LangPicker } from '@/components/ui/LangPicker'

export function LangBar() {
  return (
    <div style={{
      display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
      padding: '8px 96px 8px 24px',
      borderBottom: '1px solid var(--border-1)',
      background: 'var(--bg-1)',
    }}>
      <LangPicker align="right" size="sm"/>
    </div>
  )
}
