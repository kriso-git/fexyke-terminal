'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Chip } from '@/components/ui/Chip'
import { Panel } from '@/components/ui/Panel'
import { Meta } from '@/components/ui/Meta'
import { Avatar } from '@/components/ui/Avatar'
import { LiveTicks } from '@/components/ui/LiveTicks'
import { createProfileSignal, updateProfile, sendFriendRequest, acceptFriendRequest, removeFriend, deleteProfileSignal, toggleProfileSignalPin, toggleProfileSignalReaction, updateInterests } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/hooks/useI18n'
import { RolePresenceChip } from '@/components/ui/PresenceChip'
import { ShareButton } from '@/components/ui/ShareButton'
import type { Operator, Entry, ProfileSignal } from '@/lib/types'

type FriendshipState =
  | { state: 'self' }
  | { state: 'none' }
  | { state: 'pending_out'; id: string }
  | { state: 'pending_in'; id: string }
  | { state: 'friends'; id: string }


/* ─── FriendBtn ─── */
function FriendBtn({ targetId, friendship }: { targetId: string; friendship: FriendshipState }) {
  const { t } = useI18n()
  const [state, setState] = useState<FriendshipState>(friendship)
  const [pending, setPending] = useState(false)

  if (state.state === 'self') return null

  async function send() {
    setPending(true)
    const res = await sendFriendRequest(targetId)
    if (!res.error) setState({ state: 'pending_out', id: 'tmp' })
    setPending(false)
  }
  async function accept() {
    if (state.state !== 'pending_in') return
    setPending(true)
    const res = await acceptFriendRequest(state.id)
    if (!res.error) setState({ state: 'friends', id: state.id })
    setPending(false)
  }
  async function remove() {
    setPending(true)
    const res = await removeFriend(targetId)
    if (!res.error) setState({ state: 'none' })
    setPending(false)
  }

  return (
    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
      {state.state === 'none' && (
        <button className="btn btn-primary" disabled={pending} onClick={send}>{t('friend.request')}</button>
      )}
      {state.state === 'pending_out' && (
        <>
          <Chip kind="warn" dot>{t('friend.pending')}</Chip>
          <button className="btn btn-ghost" disabled={pending} onClick={remove}>{t('friend.cancel')}</button>
        </>
      )}
      {state.state === 'pending_in' && (
        <>
          <Chip kind="warn" dot>{t('friend.incoming')}</Chip>
          <button className="btn btn-primary" disabled={pending} onClick={accept}>{t('friend.accept')}</button>
          <button className="btn btn-ghost" disabled={pending} onClick={remove}>{t('friend.reject')}</button>
        </>
      )}
      {state.state === 'friends' && (
        <>
          <Chip kind="accent" dot>{t('friend.is_friend')}</Chip>
          <button className="btn btn-ghost" disabled={pending} onClick={remove}>{t('friend.remove')}</button>
        </>
      )}
    </div>
  )
}

/* ─── Profile signal row ─── */
function ProfileSignalRow({ s, isWallOwner, currentOperator, fmtDate, onDelete, onPinToggle }: {
  s: ProfileSignal
  isWallOwner: boolean
  currentOperator: Operator | null
  fmtDate: (iso: string) => string
  onDelete: (id: string) => void
  onPinToggle: (id: string, pinned: boolean) => void
}) {
  const [rx, setRx] = useState<Record<string,number>>(s.reactions ?? {})
  const [userRx, setUserRx] = useState<string[]>([])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const RX = ['👍','🔥','💀','😂','❤️']

  const canDelete = isWallOwner || currentOperator?.id === s.author_id || currentOperator?.role === 'superadmin'

  async function react(em: string) {
    if (!currentOperator || pending) return
    setPending(true); setError(null)
    const res = await toggleProfileSignalReaction(s.id, em)
    if (res?.error) setError(res.error)
    if (res?.reactions) setRx(res.reactions)
    if (res?.userReactions) setUserRx(res.userReactions)
    setPending(false)
  }

  async function del() {
    if (!confirm('Törlöd ezt az üzenetet?')) return
    setPending(true)
    const res = await deleteProfileSignal(s.id)
    setPending(false)
    if (res?.error) { setError(res.error); return }
    onDelete(s.id)
  }

  async function pin() {
    setPending(true)
    const res = await toggleProfileSignalPin(s.id, !s.pinned)
    setPending(false)
    if (res?.error) { setError(res.error); return }
    onPinToggle(s.id, !!res.pinned)
  }

  return (
    <div className="panel" style={{
      padding: 14, display:'grid', gridTemplateColumns:'40px 1fr', gap:12,
      borderColor: s.pinned ? 'var(--accent)' : 'var(--border-1)',
      boxShadow: s.pinned ? '0 0 0 1px rgba(24,233,104,.15)' : undefined,
    }}>
      <Link href={s.author?.callsign ? `/operators/${s.author.callsign}` : '#'} style={{ textDecoration:'none' }}>
        <Avatar id={s.author?.id ?? s.author_id} src={s.author?.avatar_url} lastSeen={s.author?.last_seen} size={40}/>
      </Link>
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8, flexWrap:'wrap' }}>
          <Link href={s.author?.callsign ? `/operators/${s.author.callsign}` : '#'} className="head" style={{ fontSize:15, color: s.author?.chat_color || 'var(--ink-0)', textDecoration:'none' }}>{s.author?.callsign ?? '—'}</Link>
          {s.pinned && <Chip kind="accent" dot style={{ fontSize:9 }}>KITŰZÖTT</Chip>}
          <span style={{ flex:1 }}/>
          <RolePresenceChip role={s.author?.role} lastSeen={s.author?.last_seen} fontSize={9}/>
          <span className="sys muted" style={{ fontSize:10 }}>{fmtDate(s.created_at)}</span>
        </div>
        {s.text && <div style={{ color:'var(--ink-0)', fontSize:14, lineHeight:1.6, wordBreak:'break-word' }}>{s.text}</div>}
        {s.image_url && (
          <div style={{ marginTop:8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.image_url} alt="" loading="lazy" decoding="async" style={{ maxWidth:'100%', maxHeight:360, objectFit:'contain', display:'block', background:'var(--bg-2)', border:'1px solid var(--border-1)' }}/>
          </div>
        )}
        {/* Reactions */}
        <div style={{ display:'flex', gap:5, marginTop:8, flexWrap:'wrap', alignItems:'center' }}>
          {RX.map(em => {
            const count = rx[em] ?? 0
            const active = userRx.includes(em)
            return (
              <button key={em} onClick={() => react(em)} disabled={!currentOperator || pending}
                style={{
                  display:'inline-flex', alignItems:'center', gap:3, padding:'3px 8px', fontSize:13,
                  border:`1px solid ${active ? 'var(--accent)' : 'var(--border-0)'}`,
                  background: active ? 'var(--accent-soft)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--ink-2)',
                  cursor: currentOperator ? 'pointer' : 'default',
                }}
              >
                {em}{count > 0 && <span style={{ fontSize:11, fontFamily:'var(--f-sys)' }}>{count}</span>}
              </button>
            )
          })}
        </div>
        <div style={{ display:'flex', gap:12, marginTop:8, paddingTop:8, borderTop:'1px dashed var(--border-1)', alignItems:'center', flexWrap:'wrap' }}>
          {isWallOwner && (
            <button onClick={pin} disabled={pending} className="sys"
              style={{ background:'none', border:'none', color: s.pinned ? 'var(--magenta)' : 'var(--cyan)', cursor:'pointer', fontSize:10, letterSpacing:'.12em', padding:0 }}>
              {s.pinned ? '◢ LEVESZ' : '◢ KITŰZ'}
            </button>
          )}
          {canDelete && (
            <button onClick={del} disabled={pending} className="sys"
              style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', fontSize:10, letterSpacing:'.12em', padding:0 }}>
              ◢ TÖRÖL
            </button>
          )}
          <span style={{ flex:1 }}/>
          <span className="sys dim" style={{ fontSize:10 }}>MSG-{s.id.slice(-4).toUpperCase()}</span>
        </div>
        {error && <div style={{ marginTop:6, fontSize:10, color:'var(--red)' }}>◢ {error}</div>}
      </div>
    </div>
  )
}

/* ─── PendingRow ─── */
function PendingRow({ friendshipId, requester }: { friendshipId: string; requester: Operator }) {
  const [pending, setPending] = useState(false)
  const [hidden, setHidden]   = useState(false)

  if (hidden) return null

  async function accept() {
    setPending(true)
    const res = await acceptFriendRequest(friendshipId)
    if (!res.error) setHidden(true)
    setPending(false)
  }
  async function reject() {
    setPending(true)
    const res = await removeFriend(requester.id)
    if (!res.error) setHidden(true)
    setPending(false)
  }
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <Avatar id={requester.id} src={requester.avatar_url} size={28}/>
      <div style={{ flex:1, minWidth:0 }}>
        <div className="head" style={{ fontSize:12 }}>{requester.callsign}</div>
        <div className="sys muted" style={{ fontSize:9 }}>LVL-0{requester.level}</div>
      </div>
      <button className="btn btn-primary btn-sm" disabled={pending} onClick={accept} style={{ padding:'2px 6px', fontSize:10 }}>✓</button>
      <button className="btn btn-ghost btn-sm" disabled={pending} onClick={reject} style={{ padding:'2px 6px', fontSize:10 }}>✕</button>
    </div>
  )
}

/* ─── UserSearch ─── */
function UserSearch({ operators }: { operators: Operator[] }) {
  const { t } = useI18n()
  const [query, setQuery]   = useState('')
  const [open, setOpen]     = useState(false)
  const inputRef            = useRef<HTMLInputElement>(null)

  const results = query.length > 0
    ? operators.filter(o => o.callsign.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : []

  return (
    <div className="user-search-wrap">
      <input
        ref={inputRef}
        className="input"
        placeholder={t('profile.user_search')}
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        style={{ fontSize:12 }}
      />
      {open && results.length > 0 && (
        <div className="user-search-list">
          {results.map(o => (
            <Link key={o.id} href={`/operators/${o.callsign}`} className="user-search-item">
              <Avatar id={o.id} src={o.avatar_url} lastSeen={o.last_seen} size={24}/>
              <span className="head" style={{ fontSize:13 }}>{o.callsign}</span>
              <span className="sys muted" style={{ fontSize:9, marginLeft:'auto' }}>LVL-0{o.level}</span>
              <span className="dot" style={{ width:6, height:6 }}/>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Root export ─── */
interface ProfileClientProps {
  operator: Operator | null
  entries: Entry[]
  profileSignals: ProfileSignal[]
  currentOperator: Operator | null
  friends: Operator[]
  pendingIn: { id: string; requester: Operator }[]
  friendship: FriendshipState
  allOperators: Operator[]
  stats: { likes: number; comments: number; reads: number }
}

export function ProfileClient({ operator, entries, profileSignals, currentOperator, friends, pendingIn, friendship, allOperators, stats }: ProfileClientProps) {
  const router = useRouter()
  const { t, lang } = useI18n()
  const [signalList, setSignalList] = useState<ProfileSignal[]>(profileSignals)
  const [psError, setPsError]     = useState<string | null>(null)
  const [psPending, setPsPending] = useState(false)
  const [psDone, setPsDone]       = useState(false)
  const [msgText, setMsgText]     = useState('')
  const [psImage, setPsImage]     = useState<string | null>(null)
  const [psImageUploading, setPsImageUploading] = useState(false)
  const fileInputRef              = useRef<HTMLInputElement>(null)

  const [isEditing, setIsEditing]   = useState(false)
  const [bioEdit, setBioEdit]       = useState('')
  const [interestsEdit, setInterestsEdit] = useState<string[]>([])
  const [interestInput, setInterestInput] = useState('')
  const [editPending, setEditPending] = useState(false)
  const [editError, setEditError]   = useState<string | null>(null)
  const [editDone, setEditDone]     = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef              = useRef<HTMLInputElement>(null)

  if (!operator) return <div className="shell" style={{ padding:'80px 20px', textAlign:'center' }}><div className="sys muted">Felhasználó nem található.</div></div>

  const op    = operator
  const sortedSigs = [...signalList].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
  const sigs  = sortedSigs
  const isSelf = currentOperator?.id === op.id
  const roleLabel = op.role === 'superadmin' ? t('profile.role_super') : op.role === 'admin' ? t('profile.role_admin') : t('profile.role_user')

  const localeMap: Record<string, string> = { hu:'hu-HU', en:'en-US', de:'de-DE', es:'es-ES', fr:'fr-FR', no:'no-NO', sv:'sv-SE' }
  const fmtDate = (iso: string) => {
    if (!iso) return '—'
    try { return new Date(iso).toLocaleDateString(localeMap[lang] ?? 'hu-HU', { month:'short', day:'numeric', year:'numeric' }) } catch { return iso }
  }

  async function handleProfileSignal(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    if (!msgText.trim() && !psImage) return
    setPsPending(true); setPsError(null)
    const fd = new FormData()
    fd.set('target_id', op.id)
    fd.set('text', msgText.trim())
    if (psImage) fd.set('image_url', psImage)
    const res = await createProfileSignal(fd)
    if (res?.error) { setPsError(res.error); setPsPending(false) }
    else {
      setMsgText(''); setPsImage(null); setPsDone(true); setPsPending(false)
      setTimeout(() => setPsDone(false), 1800)
      // Re-fetch the page so the new signal shows up
      if (typeof window !== 'undefined') window.location.reload()
    }
  }

  async function handleProfileImageUpload(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]
    if (!file) return
    setPsImageUploading(true); setPsError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Feltöltési hiba')
      setPsImage(data.url)
    } catch (e) {
      setPsError(e instanceof Error ? e.message : 'Feltöltési hiba')
    } finally {
      setPsImageUploading(false)
      if (ev.target) ev.target.value = ''
    }
  }

  async function handleEditProfile(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    setEditPending(true); setEditError(null)
    const fd = new FormData()
    fd.set('bio', bioEdit)
    const profileRes = await updateProfile(fd)
    if (profileRes?.error) { setEditError(profileRes.error); setEditPending(false); return }
    const intRes = await updateInterests(interestsEdit)
    if (intRes?.error) { setEditError(intRes.error); setEditPending(false); return }
    setEditDone(true); setEditPending(false); setIsEditing(false)
    setTimeout(() => setEditDone(false), 2000)
    router.refresh()
  }

  async function handleAvatarUpload(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      const fd = new FormData()
      fd.set('avatar_url', data.url)
      await updateProfile(fd)
      window.location.reload()
    } catch (e) {
      console.error(e)
    } finally {
      setAvatarUploading(false)
    }
  }

  return (
    <div className="shell">
      {/* Profile header */}
      <div className="profile-header-grid" style={{ display:'grid', gridTemplateColumns:'220px 1fr 320px', gap:28, padding:'36px 0 28px', borderBottom:'1px solid var(--border-1)', alignItems:'start' }}>

        {/* Avatar */}
        <div>
          <div style={{ width:200, height:200, background:'var(--bg-2)', border:'1px solid var(--accent)', position:'relative', boxShadow:'var(--accent-glow)', overflow:'hidden' }}>
            <Avatar id={op.id} src={op.avatar_url} lastSeen={isSelf ? new Date().toISOString() : op.last_seen} size={200}/>
            {([
              { top:-1, left:-1, borderTop:'1px solid var(--accent)', borderLeft:'1px solid var(--accent)' },
              { top:-1, right:-1, borderTop:'1px solid var(--accent)', borderRight:'1px solid var(--accent)' },
              { bottom:-1, left:-1, borderBottom:'1px solid var(--accent)', borderLeft:'1px solid var(--accent)' },
              { bottom:-1, right:-1, borderBottom:'1px solid var(--accent)', borderRight:'1px solid var(--accent)' },
            ] as React.CSSProperties[]).map((s, i) => (
              <div key={i} style={{ position:'absolute', width:12, height:12, ...s }}/>
            ))}
          </div>
          {isSelf && (
            <>
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginTop:10, width:200, justifyContent:'center' }}
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
              >
                {avatarUploading ? t('profile.avatar_uploading') : t('profile.avatar_change')}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                style={{ display:'none' }}
                accept="image/gif,image/jpeg,image/png,image/webp"
                onChange={handleAvatarUpload}
              />
            </>
          )}
        </div>

        {/* Callsign + bio + actions */}
        <div>
          <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
            <Chip kind="solid" dot>{op.id}</Chip>
            <Chip kind="accent">{roleLabel} · LVL-0{op.level}</Chip>
            {(() => {
              if (isSelf) return <Chip kind="cyan" dot>ONLINE</Chip>
              const ls = op.last_seen ? new Date(op.last_seen).getTime() : 0
              const online = ls && (Date.now() - ls < 5 * 60 * 1000)
              if (online) return <Chip kind="cyan" dot>ONLINE</Chip>
              if (!ls) return <Chip kind="dash">OFFLINE</Chip>
              const diff = (Date.now() - ls) / 1000
              const rel =
                diff < 3600 ? `${Math.floor(diff / 60)} perce`
                : diff < 86400 ? `${Math.floor(diff / 3600)} órája`
                : diff < 86400 * 7 ? `${Math.floor(diff / 86400)} napja`
                : new Date(op.last_seen!).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })
              return <Chip kind="dash">UTOLJÁRA · {rel}</Chip>
            })()}
          </div>
          <h1 className="display" style={{ margin:0, fontSize:72, lineHeight:.95, letterSpacing:'-.02em' }}>{op.callsign}</h1>
          <p style={{ maxWidth:620, color:'var(--ink-1)', fontSize:14, lineHeight:1.6, marginTop:14 }}>
            {op.bio ?? t('profile.no_bio')}
          </p>
          <div style={{ display:'flex', gap:8, marginTop:18, flexWrap:'wrap', alignItems:'center' }}>
            <FriendBtn targetId={op.id} friendship={friendship}/>
            <ShareButton url={`/operators/${op.callsign}`} title={op.callsign} variant="button" size="md"/>
            {isSelf && !isEditing && (
              <button className="btn" onClick={() => { setBioEdit(op.bio ?? ''); setInterestsEdit(op.interests ?? []); setIsEditing(true) }}>
                {t('profile.edit')}
              </button>
            )}
          </div>
          {isSelf && isEditing && (
            <form onSubmit={handleEditProfile} style={{ display:'flex', flexDirection:'column', gap:10, marginTop:16, maxWidth:560 }}>
              <textarea
                className="input"
                value={bioEdit}
                onChange={e => setBioEdit(e.target.value)}
                rows={4}
                placeholder={t('profile.bio_ph')}
              />

              {/* Interests editor */}
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <span className="sys muted" style={{ fontSize:10 }}>◢ {t('profile.topics')} (max 12)</span>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {interestsEdit.length === 0 && (
                    <span className="sys muted" style={{ fontSize:11 }}>Még nincs címke. Adj hozzá lentebb.</span>
                  )}
                  {interestsEdit.map(tag => (
                    <span key={tag} className="chip chip-cyan" style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 8px' }}>
                      {tag}
                      <button type="button" onClick={() => setInterestsEdit(prev => prev.filter(x => x !== tag))}
                        style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', fontSize:12, padding:0, marginLeft:2 }}
                        aria-label={`${tag} törlés`}
                      >✕</button>
                    </span>
                  ))}
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <input
                    className="input"
                    placeholder="#új címke"
                    value={interestInput}
                    onChange={e => setInterestInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault()
                        const v = interestInput.trim().replace(/^#+/, '').toLowerCase()
                        if (!v) return
                        const tag = `#${v}`
                        if (interestsEdit.length >= 12) return
                        if (!interestsEdit.includes(tag)) setInterestsEdit(prev => [...prev, tag])
                        setInterestInput('')
                      }
                    }}
                    style={{ flex:1, fontSize:12 }}
                  />
                  <button type="button" className="btn btn-ghost btn-sm"
                    disabled={!interestInput.trim() || interestsEdit.length >= 12}
                    onClick={() => {
                      const v = interestInput.trim().replace(/^#+/, '').toLowerCase()
                      if (!v) return
                      const tag = `#${v}`
                      if (interestsEdit.length >= 12) return
                      if (!interestsEdit.includes(tag)) setInterestsEdit(prev => [...prev, tag])
                      setInterestInput('')
                    }}
                  >+ HOZZÁAD</button>
                </div>
              </div>

              {editError && <div style={{ padding:'6px 10px', background:'rgba(255,58,58,.1)', border:'1px solid var(--red)', color:'var(--red)', fontFamily:'var(--f-sys)', fontSize:11 }}>◢ {editError}</div>}
              {editDone  && <div style={{ padding:'6px 10px', background:'rgba(24,233,104,.1)', border:'1px solid var(--accent)', color:'var(--accent)', fontFamily:'var(--f-sys)', fontSize:11 }}>{t('profile.saved')}</div>}
              <div style={{ display:'flex', gap:8 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsEditing(false)}>{t('profile.cancel')}</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={editPending}>
                  {editPending ? t('profile.saving') : t('profile.save')}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Stats */}
        <Panel tag={t('profile.stats')} title={t('profile.metrics')} className="panel-raised">
          {(() => {
            const xp = op.xp ?? 0
            const lvl = Math.min(10, Math.max(1, 1 + Math.floor(xp / 100)))
            const intoLvl = xp % 100
            const pct = Math.min(100, intoLvl)
            return (
              <div style={{ marginBottom:12, padding:'10px 12px', border:'1px solid var(--border-1)', background:'rgba(24,233,104,.04)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
                  <div>
                    <div className="sys muted" style={{ fontSize:9 }}>{t('profile.level_label')}</div>
                    <div className="head" style={{ fontSize:24, color:'var(--accent)', lineHeight:1 }}>LVL-0{lvl}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div className="sys muted" style={{ fontSize:9 }}>XP</div>
                    <div className="mono" style={{ fontSize:14, color:'var(--accent)' }}>{xp}</div>
                  </div>
                </div>
                <div style={{ height:6, background:'var(--bg-2)', border:'1px solid var(--border-1)', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', inset:0, width:`${pct}%`, background:'var(--accent)', boxShadow:'0 0 8px var(--accent)' }}/>
                </div>
                <div className="sys muted" style={{ fontSize:9, marginTop:4 }}>{intoLvl}/100 · {t('profile.next_lvl')}</div>
              </div>
            )
          })()}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[[t('profile.posts'), entries.length], [t('profile.friend_count'), friends.length], [t('card.likes'), stats.likes], [t('profile.readers'), stats.reads], [t('profile.comments'), stats.comments], [t('profile.month'), op.joined_cycle ?? 0]].map(([k,v]) => (
              <div key={String(k)} className="panel" style={{ padding:'8px 10px', background:'transparent' }}>
                <div className="sys muted" style={{ fontSize:9 }}>{k}</div>
                <div className="head" style={{ fontSize:22, color:'var(--accent)' }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ borderTop:'1px solid var(--border-1)', marginTop:12, paddingTop:12 }}>
            <div className="sys muted" style={{ fontSize:9, marginBottom:6 }}>{t('profile.activity')}</div>
            <LiveTicks count={30} height={32}/>
          </div>
        </Panel>
      </div>

      {/* Main + sidebar */}
      <div className="profile-main-grid" style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:28, padding:'28px 0 56px' }}>

        {/* Sidebar */}
        <aside style={{ display:'flex', flexDirection:'column', gap:18 }}>
          <UserSearch operators={allOperators}/>

          <Panel tag={`◢ ${t('profile.id')}`} title={t('profile.data')}>
            <Meta k={t('profile.name')}          v={op.callsign}/>
            <Meta k={t('profile.level_label')}   v={`LVL-0${op.level} · ${roleLabel}`}/>
            <Meta k={t('profile.joined')}        v={op.created_at ? fmtDate(op.created_at) : '—'}/>
          </Panel>

          <Panel tag="◢ TÉMÁK" title={t('profile.topics')}>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {(op.interests && op.interests.length > 0)
                ? op.interests.map(s => <Chip key={s} kind="cyan">{s}</Chip>)
                : <span className="sys muted" style={{ fontSize:11 }}>Még nincs megadva.</span>
              }
            </div>
          </Panel>

          <Panel tag="◢ HÁLÓZAT" title={`${t('profile.network')} · ${friends.length}`}>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {friends.length === 0 ? (
                <div className="sys muted" style={{ fontSize:11 }}>{t('profile.no_friends')}</div>
              ) : friends.slice(0, 8).map(f => (
                <Link key={f.id} href={`/operators/${f.callsign}`} style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none' }}>
                  <Avatar id={f.id} src={f.avatar_url} size={28}/>
                  <div>
                    <div className="head" style={{ fontSize:13 }}>{f.callsign}</div>
                    <div className="sys muted" style={{ fontSize:9 }}>LVL-0{f.level}</div>
                  </div>
                  <span className="dot" style={{ marginLeft:'auto', width:6, height:6 }}/>
                </Link>
              ))}
            </div>
          </Panel>

          {isSelf && pendingIn.length > 0 && (
            <Panel tag={`◢ ${t('profile.incoming')}`} title={`${t('profile.requests')} · ${pendingIn.length}`}>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {pendingIn.map(p => (
                  <PendingRow key={p.id} friendshipId={p.id} requester={p.requester}/>
                ))}
              </div>
            </Panel>
          )}
        </aside>

        {/* Profile wall */}
        <div>
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:16 }}>
            <div>
              <div className="sys muted" style={{ fontSize:9, marginBottom:4 }}>{t('profile.wall')}</div>
              <h2 className="head" style={{ margin:0, fontSize:24 }}>{t('profile.leave_msg')}</h2>
            </div>
            <Chip kind="accent">{sigs.length} {t('profile.msg_count')}</Chip>
          </div>

          {/* Composer */}
          {currentOperator ? (
            <form onSubmit={handleProfileSignal} style={{ marginBottom:18 }}>
              <input type="hidden" name="target_id" value={op.id}/>
              <div className="panel" style={{ padding:14, display:'flex', gap:12 }}>
                <Avatar id={currentOperator.id} src={currentOperator.avatar_url} lastSeen={currentOperator.last_seen} size={40}/>
                <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10 }}>
                  <textarea name="text" className="input" rows={3}
                    placeholder={t('profile.msg_ph')}
                    value={msgText} onChange={e => setMsgText(e.target.value)}/>
                  {psImage && (
                    <div style={{ position:'relative', maxWidth:300 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={psImage} alt="Csatolt kép" loading="lazy" style={{ width:'100%', maxHeight:200, objectFit:'contain', background:'var(--bg-2)', border:'1px solid var(--border-1)' }}/>
                      <button type="button" onClick={() => setPsImage(null)}
                        style={{ position:'absolute', top:4, right:4, width:24, height:24, background:'rgba(0,0,0,.7)', border:'1px solid var(--red)', color:'var(--red)', cursor:'pointer', fontSize:12 }}>✕</button>
                    </div>
                  )}
                  {psError && <div style={{ padding:'6px 10px', background:'rgba(255,58,58,.1)', border:'1px solid var(--red)', color:'var(--red)', fontFamily:'var(--f-sys)', fontSize:11 }}>◢ {psError}</div>}
                  {psDone  && <div style={{ padding:'6px 10px', background:'rgba(24,233,104,.1)', border:'1px solid var(--accent)', color:'var(--accent)', fontFamily:'var(--f-sys)', fontSize:11 }}>{t('profile.sent')}</div>}
                  <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                    <Chip kind="dash">{t('profile.as')} {currentOperator.callsign}</Chip>
                    <button type="button" className="btn btn-ghost btn-sm" style={{ padding:'3px 8px', opacity: psImageUploading ? 0.5 : 0.85 }}
                      disabled={psImageUploading}
                      onClick={() => fileInputRef.current?.click()}>
                      {psImageUploading ? '◢ FELTÖLTÉS…' : t('profile.attach_img')}
                    </button>
                    <input ref={fileInputRef} type="file" style={{ display:'none' }}
                      accept="image/gif,image/jpeg,image/png,image/webp"
                      onChange={handleProfileImageUpload}/>
                    <span style={{ flex:1 }}/>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={psPending || (!msgText.trim() && !psImage)}>
                      {psPending ? t('profile.sending') : t('profile.send')}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="panel" style={{ padding:14, marginBottom:18, textAlign:'center', color:'var(--ink-3)', fontFamily:'var(--f-sys)', fontSize:12, borderStyle:'dashed' }}>
              <Link href="/gate" style={{ color:'var(--accent)' }}>{t('hero.enter')}</Link> · {t('profile.login_for_msg')}
            </div>
          )}

          {/* Messages */}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {sigs.length === 0 ? (
              <div className="panel" style={{ padding:18, textAlign:'center', borderStyle:'dashed' }}>
                <div className="sys muted" style={{ fontSize:12 }}>Még nincsenek üzenetek a falon.</div>
              </div>
            ) : sigs.map(s => (
              <ProfileSignalRow
                key={s.id}
                s={s}
                isWallOwner={isSelf}
                currentOperator={currentOperator}
                fmtDate={fmtDate}
                onDelete={(id) => setSignalList(prev => prev.filter(x => x.id !== id))}
                onPinToggle={(id, pinned) => setSignalList(prev => prev.map(x => x.id === id ? { ...x, pinned } : x))}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
