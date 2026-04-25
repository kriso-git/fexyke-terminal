'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  { k: 'IDX', label: 'FŐOLDAL', href: '/' },
  { k: 'PRF', label: 'PROFIL',  href: '/profile' },
  { k: 'CTL', label: 'ADMIN',   href: '/control' },
]

export function Nav() {
  const pathname = usePathname()

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
