'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Chip } from '@/components/ui/Chip'
import { Panel } from '@/components/ui/Panel'
import { Meta } from '@/components/ui/Meta'
import { Avatar } from '@/components/ui/Avatar'
import { LiveTicks } from '@/components/ui/LiveTicks'
import { createProfileSignal, updateProfile } from '@/app/actions'
import type { Operator, Entry, ProfileSignal } from '@/lib/types'

const SEED_OP: Operator = {
  id:'F3X-014', auth_id:null, callsign:'NULLSET', level:3, role:'admin', node:'f3x-pri-01', joined_cycle:12,
  bio:'Tizenkét ciklus óta figyelem a hideg szektorok protokoll-aláírásait. Hozzám érnek be először a külső rács szinkronjai.',
  created_at:'',
}

const SEED_SIGNALS: ProfileSignal[] = [
  { id:'ps1', target_id:'F3X-014', author_id:'F3X-001', text:'Jól láttad a sodródást. Szívesen együttműködom újra.', verified:true, created_at:'2026-04-20T14:31:00Z',
    author:{ id:'F3X-001', auth_id:null, callsign:'KURIER', level:4, role:'superadmin', node:'f3x-pri-01', joined_cycle:1, bio:null, created_at:'' } },
  { id:'ps2', target_id:'F3X-014', author_id:'F3X-022', text:'Köszi az elemzést — sokat segített a projekt irányítói oldalán.', verified:false, created_at:'2026-04-18T09:04:00Z',
    author:{ id:'F3X-022', auth_id:null, callsign:'HALO', level:2, role:'operator', node:'f3x-pri-01', joined_cycle:18, bio:null, created_at:'' } },
]

/* ─── FriendBtn ─── */
type FriendState = 'none' | 'pending' | 'friends'
function FriendBtn({ isSelf }: { isSelf: boolean }) {
  const [state, setState] = useState<FriendState>('none')
  if (isSelf) return null
  return (
    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
      {state === 'none' && (
        <button className="btn btn-primary" onClick={() => setState('pending')}>◢ ISMERŐS KÉRÉS</button>
      )}
      {state === 'pending' && (
        <>
          <Chip kind="warn" dot>FÜGGŐBEN</Chip>
          <button className="btn btn-ghost" onClick={() => setState('none')}>MÉGSE</button>
        </>
      )}
      {state === 'friends' && (
        <>
          <Chip kind="accent" dot>ISMERŐS</Chip>
          <button className="btn btn-ghost" onClick={() => setState('none')}>ELTÁVOLÍT</button>
        </>
      )}
    </div>
  )
}

/* ─── UserSearch ─── */
function UserSearch({ operators }: { operators: Operator[] }) {
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
        placeholder="⌕ Felhasználó keresése…"
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
              <Avatar id={o.id} size={24}/>
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
}

export function ProfileClient({ operator, entries, profileSignals, currentOperator }: ProfileClientProps) {
  const [psError, setPsError]     = useState<string | null>(null)
  const [psPending, setPsPending] = useState(false)
  const [psDone, setPsDone]       = useState(false)
  const [msgText, setMsgText]     = useState('')
  const fileInputRef              = useRef<HTMLInputElement>(null)

  const [isEditing, setIsEditing]   = useState(false)
  const [bioEdit, setBioEdit]       = useState('')
  const [editPending, setEditPending] = useState(false)
  const [editError, setEditError]   = useState<string | null>(null)
  const [editDone, setEditDone]     = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef              = useRef<HTMLInputElement>(null)

  const op    = operator ?? SEED_OP
  const sigs  = profileSignals.length > 0 ? profileSignals : SEED_SIGNALS
  const isSelf = currentOperator?.id === op.id
  const roleLabel = op.role === 'superadmin' ? 'SUPERADMIN' : op.role === 'admin' ? 'ADMIN' : 'FELHASZNÁLÓ'

  // Build a rough operator list from available signal authors
  const knownOps: Operator[] = []
  for (const s of sigs) { if (s.author && !knownOps.find(o => o.id === s.author!.id)) knownOps.push(s.author as Operator) }
  if (currentOperator && !knownOps.find(o => o.id === currentOperator.id)) knownOps.push(currentOperator)

  const fmtDate = (iso: string) => {
    if (!iso) return '—'
    try { return new Date(iso).toLocaleDateString('hu-HU', { month:'short', day:'numeric', year:'numeric' }) } catch { return iso }
  }

  async function handleProfileSignal(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    if (!msgText.trim()) return
    setPsPending(true); setPsError(null)
    const fd = new FormData(ev.currentTarget)
    fd.set('text', msgText.trim())
    const res = await createProfileSignal(fd)
    if (res?.error) { setPsError(res.error); setPsPending(false) }
    else { setMsgText(''); setPsDone(true); setPsPending(false); setTimeout(() => setPsDone(false), 1800) }
  }

  async function handleEditProfile(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    setEditPending(true); setEditError(null)
    const fd = new FormData()
    fd.set('bio', bioEdit)
    const res = await updateProfile(fd)
    if (res?.error) { setEditError(res.error); setEditPending(false) }
    else { setEditDone(true); setEditPending(false); setIsEditing(false); setTimeout(() => setEditDone(false), 2000) }
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
      <div style={{ display:'grid', gridTemplateColumns:'220px 1fr 320px', gap:28, padding:'36px 0 28px', borderBottom:'1px solid var(--border-1)', alignItems:'start' }}>

        {/* Avatar */}
        <div>
          <div style={{ width:200, height:200, background:'var(--bg-2)', border:'1px solid var(--accent)', position:'relative', boxShadow:'var(--accent-glow)', overflow:'hidden' }}>
            <Avatar id={op.id} src={op.avatar_url} size={200}/>
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
                {avatarUploading ? '◢ FELTÖLTÉS…' : '◢ AVATAR CSERE'}
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
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            <Chip kind="solid" dot>{op.id}</Chip>
            <Chip kind="accent">{roleLabel} · LVL-0{op.level}</Chip>
            <Chip kind="cyan">ONLINE</Chip>
          </div>
          <h1 className="display" style={{ margin:0, fontSize:72, lineHeight:.95, letterSpacing:'-.02em' }}>{op.callsign}</h1>
          <p style={{ maxWidth:620, color:'var(--ink-1)', fontSize:14, lineHeight:1.6, marginTop:14 }}>
            {op.bio ?? 'Nincs bemutatkozó szöveg.'}
          </p>
          <div style={{ display:'flex', gap:8, marginTop:18, flexWrap:'wrap', alignItems:'center' }}>
            <FriendBtn isSelf={isSelf}/>
            {isSelf && !isEditing && (
              <button className="btn" onClick={() => { setBioEdit(op.bio ?? ''); setIsEditing(true) }}>
                PROFIL SZERKESZTÉSE
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
                placeholder="Bemutatkozó szöveg…"
              />
              {editError && <div style={{ padding:'6px 10px', background:'rgba(255,58,58,.1)', border:'1px solid var(--red)', color:'var(--red)', fontFamily:'var(--f-sys)', fontSize:11 }}>◢ {editError}</div>}
              {editDone  && <div style={{ padding:'6px 10px', background:'rgba(24,233,104,.1)', border:'1px solid var(--accent)', color:'var(--accent)', fontFamily:'var(--f-sys)', fontSize:11 }}>◢ Profil mentve!</div>}
              <div style={{ display:'flex', gap:8 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsEditing(false)}>MÉGSE</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={editPending}>
                  {editPending ? '◢ MENTÉS…' : '◢ MENTÉS'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Stats */}
        <Panel tag="◢ STATISZTIKA" title="METRIKÁK" className="panel-raised">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[['POSZTOK', entries.length || 84], ['KEDVELÉSEK','412'], ['LÁNC','17'], ['OLVASÓK','3.2K'], ['KOMMENTEK','91'], ['HÓNAP', op.joined_cycle || 35]].map(([k,v]) => (
              <div key={String(k)} className="panel" style={{ padding:'8px 10px', background:'transparent' }}>
                <div className="sys muted" style={{ fontSize:9 }}>{k}</div>
                <div className="head" style={{ fontSize:22, color:'var(--accent)' }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ borderTop:'1px solid var(--border-1)', marginTop:12, paddingTop:12 }}>
            <div className="sys muted" style={{ fontSize:9, marginBottom:6 }}>◢ AKTIVITÁS · 30 NAP</div>
            <LiveTicks count={30} height={32}/>
          </div>
        </Panel>
      </div>

      {/* Main + sidebar */}
      <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:28, padding:'28px 0 56px' }}>

        {/* Sidebar */}
        <aside style={{ display:'flex', flexDirection:'column', gap:18 }}>
          <UserSearch operators={knownOps}/>

          <Panel tag="◢ AZONOSÍTÓ" title="ADATOK">
            <Meta k="NÉV"          v={op.callsign}/>
            <Meta k="SZINT"        v={`LVL-0${op.level} · ${roleLabel}`}/>
            <Meta k="CSATLAKOZOTT" v={op.created_at ? fmtDate(op.created_at) : '—'}/>
          </Panel>

          <Panel tag="◢ TÉMÁK" title="ÉRDEKLŐDÉSI KÖR">
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {['#protokoll','#memória','#rács','#ops','#archívum'].map(s => (
                <Chip key={s} kind="cyan">{s}</Chip>
              ))}
            </div>
          </Panel>

          <Panel tag="◢ HÁLÓZAT" title="KAPCSOLATOK">
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {sigs.slice(0,3).map(s => s.author && (
                <Link key={s.id} href={`/operators/${s.author.callsign}`} style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none' }}>
                  <Avatar id={s.author.id} size={28}/>
                  <div>
                    <div className="head" style={{ fontSize:13 }}>{s.author.callsign}</div>
                    <div className="sys muted" style={{ fontSize:9 }}>LVL-0{s.author.level}</div>
                  </div>
                  <span className="dot" style={{ marginLeft:'auto', width:6, height:6 }}/>
                </Link>
              ))}
            </div>
          </Panel>
        </aside>

        {/* Profile wall */}
        <div>
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:16 }}>
            <div>
              <div className="sys muted" style={{ fontSize:9, marginBottom:4 }}>◢ PROFIL FAL</div>
              <h2 className="head" style={{ margin:0, fontSize:24 }}>HAGYJ ÜZENETET</h2>
            </div>
            <Chip kind="accent">{sigs.length} ÜZENET</Chip>
          </div>

          {/* Composer */}
          {currentOperator ? (
            <form onSubmit={handleProfileSignal} style={{ marginBottom:18 }}>
              <input type="hidden" name="target_id" value={op.id}/>
              <div className="panel" style={{ padding:14, display:'flex', gap:12 }}>
                <Avatar id={currentOperator.id} size={40}/>
                <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10 }}>
                  <textarea name="text" className="input" rows={3}
                    placeholder={`Írj üzenetet ${op.callsign} profiljára…`}
                    value={msgText} onChange={e => setMsgText(e.target.value)}/>
                  {psError && <div style={{ padding:'6px 10px', background:'rgba(255,58,58,.1)', border:'1px solid var(--red)', color:'var(--red)', fontFamily:'var(--f-sys)', fontSize:11 }}>◢ {psError}</div>}
                  {psDone  && <div style={{ padding:'6px 10px', background:'rgba(24,233,104,.1)', border:'1px solid var(--accent)', color:'var(--accent)', fontFamily:'var(--f-sys)', fontSize:11 }}>◢ Üzenet elküldve!</div>}
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <Chip kind="dash">MINT {currentOperator.callsign}</Chip>
                    <button type="button" className="btn btn-ghost btn-sm" style={{ padding:'3px 8px', opacity:.7 }}
                      onClick={() => fileInputRef.current?.click()}>⊡ KÉP</button>
                    <input ref={fileInputRef} type="file" style={{ display:'none' }} accept="image/gif,image/jpeg,image/png,image/webp"/>
                    <span style={{ flex:1 }}/>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={psPending || !msgText.trim()}>
                      {psPending ? '◢ KÜLDÉS…' : '◢ ALÁÍR + KÜLD'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="panel" style={{ padding:14, marginBottom:18, textAlign:'center', color:'var(--ink-3)', fontFamily:'var(--f-sys)', fontSize:12, borderStyle:'dashed' }}>
              <Link href="/gate" style={{ color:'var(--accent)' }}>◢ BELÉPÉS</Link> · üzenet küldéséhez
            </div>
          )}

          {/* Messages */}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {sigs.map(s => (
              <div key={s.id} className="panel" style={{ padding:14, display:'grid', gridTemplateColumns:'40px 1fr', gap:12 }}>
                <Avatar id={s.author?.id ?? s.author_id} size={40}/>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                    <span className="head" style={{ fontSize:15 }}>{s.author?.callsign ?? '—'}</span>
                    <span style={{ flex:1 }}/>
                    {s.verified && <Chip kind="accent" dot>VERIFIED</Chip>}
                    <span className="sys muted" style={{ fontSize:10 }}>{fmtDate(s.created_at)}</span>
                  </div>
                  <div style={{ color:'var(--ink-0)', fontSize:14, lineHeight:1.6 }}>{s.text}</div>
                  <div style={{ display:'flex', gap:12, marginTop:8, paddingTop:8, borderTop:'1px dashed var(--border-1)' }}>
                    <span className="sys muted" style={{ cursor:'pointer', fontSize:10 }}>▸ VÁLASZ</span>
                    <span style={{ flex:1 }}/>
                    <span className="sys dim" style={{ fontSize:10 }}>MSG-{s.id.slice(-4).toUpperCase()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
