'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/hooks/useI18n'

export function Nav() {
  const pathname = usePathname()
  const { t } = useI18n()

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
      <div className="item">⌕ KERESÉS</div>
    </div>
  )
}
