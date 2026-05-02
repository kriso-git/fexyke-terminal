'use client'

import { Chip } from '@/components/ui/Chip'

const ONLINE_MS = 5 * 60 * 1000

export function isOnline(lastSeen?: string | null): boolean {
  if (!lastSeen) return false
  const t = new Date(lastSeen).getTime()
  if (isNaN(t)) return false
  return Date.now() - t < ONLINE_MS
}

export function formatLastSeen(lastSeen?: string | null): string {
  if (!lastSeen) return 'sosem'
  const t = new Date(lastSeen).getTime()
  if (isNaN(t)) return ''
  const diff = (Date.now() - t) / 1000
  if (diff < 60) return 'most'
  if (diff < 3600) return `${Math.floor(diff / 60)} perce`
  if (diff < 86400) return `${Math.floor(diff / 3600)} órája`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} napja`
  return new Date(lastSeen).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })
}

export function roleLabel(role?: string | null): string {
  if (role === 'superadmin') return 'SUPERADMIN'
  if (role === 'admin') return 'ADMIN'
  return 'TAG'
}

interface RolePresenceChipProps {
  role?: string | null
  lastSeen?: string | null
  fontSize?: number
}

/**
 * Compact chip used wherever a comment / signal author is shown.
 * — When the author is online (last_seen < 5 min): role chip with a green dot.
 * — When offline: small "Utoljára X perce" chip instead.
 */
export function RolePresenceChip({ role, lastSeen, fontSize = 9 }: RolePresenceChipProps) {
  const online = isOnline(lastSeen)
  const label = roleLabel(role)
  const color = role === 'superadmin' ? 'mag' : role === 'admin' ? 'accent' : 'cyan'

  if (online) {
    return <Chip kind={color} dot style={{ fontSize }}>{label}</Chip>
  }
  return (
    <Chip kind="dash" style={{ fontSize }}>
      {label} · UTOLJÁRA {formatLastSeen(lastSeen)}
    </Chip>
  )
}
