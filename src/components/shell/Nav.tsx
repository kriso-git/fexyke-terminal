'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/hooks/useI18n'

export function Nav() {
  const pathname = usePathname()
  const { t, lang, setLang, LANGS } = useI18n()

  const ITEMS = [
    { k: 'IDX', label: t('nav.idx'), href: '/' },
    { k: 'PRF', label: t('nav.prf'), href: '/profile' },
    { k: 'CTL', label: t('nav.ctl'), href: '/control' },
  ]

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <div className="nav">
      {ITEMS.map((it, i) => (
        <Link
          key={it.k}
          href={it.href}
          className={`item${isActive(it.href) ? ' active' : ''}`}
        >
          <span className="n">{String(i).padStart(2, '0')}</span>
          {it.label}
        </Link>
      ))}
      <div className="spacer" />
      <div className="item nav-lang" style={{ display:'flex', gap:4, padding:'4px 12px', alignItems:'center' }}>
        {LANGS.map(l => (
          <button
            key={l}
            onClick={() => setLang(l)}
            style={{
              padding:'2px 6px',
              border:`1px solid ${l===lang?'var(--accent)':'transparent'}`,
              background: l===lang ? 'var(--accent-soft)' : 'transparent',
              color: l===lang ? 'var(--accent)' : 'var(--ink-2)',
              fontFamily:'var(--f-sys)',
              fontSize:10,
              letterSpacing:'.12em',
              cursor:'pointer',
            }}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  )
}
