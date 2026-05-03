'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/useI18n'

interface ShareButtonProps {
  url: string          // absolute or relative; absolutized at click time
  title?: string
  text?: string
  size?: 'sm' | 'md'
  variant?: 'icon' | 'button'
}

export function ShareButton({ url, title, text, size = 'sm', variant = 'icon' }: ShareButtonProps) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)

  async function share() {
    const absolute = url.startsWith('http')
      ? url
      : (typeof window !== 'undefined' ? window.location.origin + url : url)
    try {
      if (typeof navigator !== 'undefined' && (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share) {
        await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({ url: absolute, title, text })
        return
      }
    } catch { /* user cancelled or unsupported — fall through to clipboard */ }
    try {
      await navigator.clipboard.writeText(absolute)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Last-resort: legacy execCommand
      const ta = document.createElement('textarea')
      ta.value = absolute
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch {}
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }

  const fs = size === 'sm' ? 10 : 11
  const padX = size === 'sm' ? 8 : 12
  const padY = size === 'sm' ? 4 : 6

  if (variant === 'icon') {
    return (
      <button
        type="button"
        aria-label={t('share.label')}
        title={copied ? t('share.copied') : t('share.label')}
        onClick={share}
        className="btn btn-ghost btn-sm"
        style={{
          padding: `${padY}px ${padX}px`,
          fontSize: fs,
          minHeight: 0,
          letterSpacing: '.12em',
          color: copied ? 'var(--accent)' : 'var(--ink-2)',
          borderColor: copied ? 'var(--accent)' : 'var(--border-1)',
        }}
      >
        {copied ? `✓ ${t('share.copied')}` : `↗ ${t('share.label')}`}
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={share}
      className="btn btn-sm"
      style={{
        padding: `${padY}px ${padX}px`, fontSize: fs, minHeight: 0,
        color: copied ? 'var(--accent)' : undefined,
        borderColor: copied ? 'var(--accent)' : undefined,
      }}
    >
      {copied ? `✓ ${t('share.copied')}` : `↗ ${t('share.label')}`}
    </button>
  )
}
