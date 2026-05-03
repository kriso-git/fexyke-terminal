'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/hooks/useI18n'
import { LangPicker } from '@/components/ui/LangPicker'

interface NavProps {
  role?: 'operator' | 'admin' | 'superadmin' | null
}

export function Nav({ role = null }: NavProps) {
  const pathname = usePathname()
  const { t } = useI18n()

  const ITEMS = [
    { k: 'IDX', label: t('nav.idx'), href: '/', show: true },
    { k: 'PRF', label: t('nav.prf'), href: '/profile', show: true },
    { k: 'CTL', label: t('nav.ctl'), href: '/control', show: role === 'superadmin' },
  ].filter(i => i.show)

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
      <div className="item nav-lang" style={{ display:'flex', alignItems:'center', padding:'4px 12px' }}>
        <LangPicker align="right" size="sm"/>
      </div>
    </div>
  )
}
