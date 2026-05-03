'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Chip } from '@/components/ui/Chip'
import { Panel } from '@/components/ui/Panel'
import { Avatar } from '@/components/ui/Avatar'
import {
  updateOperatorRole,
  updateOperatorLevel,
  updateOperatorPassword,
  updateOperatorCallsign,
  deleteOperator,
  cleanupSeedOperators,
  deleteEntry,
} from '@/app/actions'
import type { Operator, Entry } from '@/lib/types'

type Role = 'operator' | 'admin' | 'superadmin'
type Tab = 'OVERVIEW' | 'USERS' | 'POSTS' | 'LOG'

function KPI({ k, v, hint, kind = 'accent' }: { k: string; v: string; hint?: string; kind?: 'accent' | 'mag' | 'cyan' }) {
  const color = kind === 'mag' ? 'var(--magenta)' : kind === 'cyan' ? 'var(--cyan)' : 'var(--accent)'
  return (
    <div className="panel" style={{ padding: '18px 20px' }}>
      <div className="sys muted" style={{ fontSize: 10 }}>{k}</div>
      <div className="head" style={{ fontSize: 40, color, textShadow: kind === 'accent' ? 'var(--accent-glow)' : 'none', marginTop: 6 }}>{v}</div>
      {hint && <div className="sys muted" style={{ marginTop: 4, fontSize: 10 }}>{hint}</div>}
    </div>
  )
}

/* ─── User row with role + level controls ─── */
function UserRow({ op, currentOp, onChange }: { op: Operator; currentOp: Operator; onChange: () => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [editingCs, setEditingCs] = useState(false)
  const [csValue, setCsValue] = useState(op.callsign)
  const [showPw, setShowPw] = useState(false)
  const [pwValue, setPwValue] = useState('')
  const isSelf = op.id === currentOp.id

  function changeCallsign() {
    if (currentOp.role !== 'superadmin') return
    const v = csValue.trim().toUpperCase()
    if (v === op.callsign) { setEditingCs(false); return }
    setError(null); setInfo(null)
    startTransition(async () => {
      const res = await updateOperatorCallsign(op.id, v)
      if (res.error) setError(res.error)
      else { setInfo(`Hívójel frissítve: ${res.callsign}`); setEditingCs(false); onChange() }
    })
  }

  function changePassword() {
    if (currentOp.role !== 'superadmin') return
    if (pwValue.length < 6) { setError('A jelszó legalább 6 karakter.'); return }
    if (!confirm(`Beállítsuk ${op.callsign} új jelszavát: "${pwValue}" ?`)) return
    setError(null); setInfo(null)
    startTransition(async () => {
      const res = await updateOperatorPassword(op.id, pwValue)
      if (res.error) setError(res.error)
      else { setInfo(`Jelszó frissítve.`); setPwValue(''); setShowPw(false) }
    })
  }

  const fmtDate = (iso: string) => {
    if (!iso) return '—'
    try { return new Date(iso).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return '—' }
  }

  function changeRole(role: Role) {
    if (currentOp.role !== 'superadmin') return
    setError(null)
    startTransition(async () => {
      const res = await updateOperatorRole(op.id, role)
      if (res.error) setError(res.error)
      else onChange()
    })
  }

  function changeLevel(delta: number) {
    const newLevel = Math.max(1, Math.min(10, op.level + delta))
    if (newLevel === op.level) return
    setError(null)
    startTransition(async () => {
      const res = await updateOperatorLevel(op.id, newLevel)
      if (res.error) setError(res.error)
      else onChange()
    })
  }

  function handleDelete() {
    if (currentOp.role !== 'superadmin') return
    if (isSelf) return
    if (!confirm(`Biztosan törlöd ${op.callsign} fiókját? Ez minden posztját, kommentjét és reakcióját is törli.`)) return
    setError(null)
    startTransition(async () => {
      const res = await deleteOperator(op.id)
      if (res.error) setError(res.error)
      else onChange()
    })
  }

  const roleColor = op.role === 'superadmin' ? 'var(--magenta)' : op.role === 'admin' ? 'var(--accent)' : 'var(--ink-2)'
  const xp = op.xp ?? 0

  return (
    <div style={{ borderBottom: '1px solid var(--border-0)', padding: '12px 14px' }}>
      <div className="admin-user-row" style={{ display: 'grid', gridTemplateColumns: '36px 90px 1fr auto auto auto auto', gap: 12, alignItems: 'center' }}>
        <Avatar id={op.id} src={op.avatar_url} size={32} />
        <span className="mono muted" style={{ fontSize: 10 }}>{op.id}</span>
        <div style={{ minWidth: 0 }}>
          {editingCs ? (
            <div style={{ display:'flex', gap:4, alignItems:'center' }}>
              <input
                className="input"
                value={csValue}
                onChange={e => setCsValue(e.target.value.toUpperCase())}
                onKeyDown={e => { if (e.key==='Enter') changeCallsign(); if (e.key==='Escape') { setEditingCs(false); setCsValue(op.callsign) } }}
                autoFocus
                style={{ fontSize:13, padding:'4px 6px', minHeight:0, textTransform:'uppercase' }}
              />
              <button className="btn btn-ghost btn-sm" disabled={pending} onClick={changeCallsign} style={{ padding:'2px 6px', fontSize:10, minHeight:0, color:'var(--accent)' }}>✓</button>
              <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => { setEditingCs(false); setCsValue(op.callsign) }} style={{ padding:'2px 6px', fontSize:10, minHeight:0 }}>✕</button>
            </div>
          ) : (
            <Link href={`/operators/${op.callsign}`} style={{ textDecoration: 'none' }}>
              <div className="head" style={{ fontSize: 14, color: 'var(--ink-0)' }}>{op.callsign}</div>
              <div className="sys muted" style={{ fontSize: 10 }}>{fmtDate(op.created_at)} · {xp} XP</div>
            </Link>
          )}
          {currentOp.role === 'superadmin' && !editingCs && (
            <div style={{ display:'flex', gap:6, marginTop:4 }}>
              <button onClick={() => setEditingCs(true)} className="sys" style={{ background:'none', border:'none', color:'var(--cyan)', cursor:'pointer', fontSize:9, letterSpacing:'.12em', padding:0 }}>◢ HÍVÓJEL ÁTÍRÁS</button>
              <button onClick={() => setShowPw(s=>!s)} className="sys" style={{ background:'none', border:'none', color:'var(--amber)', cursor:'pointer', fontSize:9, letterSpacing:'.12em', padding:0 }}>◢ JELSZÓ RESET</button>
            </div>
          )}
          {showPw && (
            <div style={{ display:'flex', gap:4, alignItems:'center', marginTop:6 }}>
              <input
                className="input"
                type="text"
                placeholder="Új jelszó (min. 6)"
                value={pwValue}
                onChange={e => setPwValue(e.target.value)}
                onKeyDown={e => { if (e.key==='Enter') changePassword(); if (e.key==='Escape') { setShowPw(false); setPwValue('') } }}
                style={{ fontSize:11, padding:'4px 6px', minHeight:0 }}
              />
              <button className="btn btn-ghost btn-sm" disabled={pending || pwValue.length<6} onClick={changePassword} style={{ padding:'2px 6px', fontSize:10, minHeight:0, color:'var(--accent)' }}>MENTÉS</button>
              <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => { setShowPw(false); setPwValue('') }} style={{ padding:'2px 6px', fontSize:10, minHeight:0 }}>MÉGSE</button>
            </div>
          )}
        </div>

        {/* Role select */}
        <select
          className="input"
          disabled={pending || currentOp.role !== 'superadmin' || isSelf}
          value={op.role}
          onChange={e => changeRole(e.target.value as Role)}
          style={{ fontSize: 10, padding: '4px 6px', minWidth: 104, color: roleColor }}
        >
          <option value="operator">TAG</option>
          <option value="admin">ADMIN</option>
          <option value="superadmin">SUPERADMIN</option>
        </select>

        {/* Level controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button className="btn btn-ghost btn-sm" disabled={pending || op.level <= 1} onClick={() => changeLevel(-1)} style={{ padding: '2px 7px', minHeight: 0, fontSize: 11 }}>−</button>
          <Chip kind="accent" style={{ minWidth: 56, justifyContent: 'center', fontSize: 10 }}>LVL-{String(op.level).padStart(2, '0')}</Chip>
          <button className="btn btn-ghost btn-sm" disabled={pending || op.level >= 10} onClick={() => changeLevel(+1)} style={{ padding: '2px 7px', minHeight: 0, fontSize: 11 }}>+</button>
        </div>

        {/* Status */}
        <Chip kind={op.auth_id ? 'accent' : 'dash'} dot={!!op.auth_id} style={{ fontSize: 9 }}>
          {op.auth_id ? 'AKTÍV' : 'NINCS AUTH'}
        </Chip>

        {/* Delete */}
        <button
          className="btn btn-ghost btn-sm"
          disabled={pending || currentOp.role !== 'superadmin' || isSelf}
          onClick={handleDelete}
          style={{ padding: '4px 10px', color: 'var(--red)', borderColor: 'rgba(255,58,58,.3)', fontSize: 10 }}
        >
          ◢ TÖRÖL
        </button>
      </div>
      {error && <div style={{ marginTop: 6, padding: '4px 8px', background: 'rgba(255,58,58,.1)', color: 'var(--red)', fontSize: 10 }}>◢ {error}</div>}
      {info && <div style={{ marginTop: 6, padding: '4px 8px', background: 'rgba(24,233,104,.1)', color: 'var(--accent)', fontSize: 10 }}>◢ {info}</div>}
    </div>
  )
}

/* ─── Post row ─── */
function PostRow({ entry, onChange }: { entry: Entry; onChange: () => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const fmtDate = (iso: string) => {
    try { return new Date(iso).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return '—' }
  }

  function handleDelete() {
    if (!confirm(`Biztosan törlöd a posztot: "${entry.title}"?`)) return
    setError(null)
    startTransition(async () => {
      const res = await deleteEntry(entry.id)
      if (res.error) setError(res.error)
      else onChange()
    })
  }

  const isVideo = entry.kind === 'VIDEÓ' || entry.kind === 'ADÁS' || entry.media_type === 'youtube'
  const isImage = entry.media_type === 'image'
  const kindLabel = isVideo ? 'VIDEÓ' : isImage ? 'KÉP' : 'SZÖVEG'

  return (
    <div style={{ borderBottom: '1px solid var(--border-0)', padding: '12px 14px' }}>
      <div className="admin-post-row" style={{ display: 'grid', gridTemplateColumns: '120px 80px 1fr 100px 90px 70px auto', gap: 12, alignItems: 'center' }}>
        <span className="mono muted" style={{ fontSize: 10 }}>{entry.id}</span>
        <Chip kind={isVideo ? 'mag' : isImage ? 'cyan' : 'dash'} style={{ fontSize: 9 }}>{kindLabel}</Chip>
        <span className="head" style={{ fontSize: 13, color: 'var(--ink-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.title}
          {entry.priority && <Chip kind="accent" dot style={{ marginLeft: 8, fontSize: 9 }}>KIEMELT</Chip>}
        </span>
        <span className="sys muted" style={{ fontSize: 10 }}>{entry.operator?.callsign ?? entry.operator_id}</span>
        <span className="mono muted" style={{ fontSize: 10 }}>{fmtDate(entry.created_at)}</span>
        <span className="sys" style={{ fontSize: 10, color: 'var(--accent)' }}>{entry.reads ?? 0} ◤</span>
        <button
          className="btn btn-ghost btn-sm"
          disabled={pending}
          onClick={handleDelete}
          style={{ padding: '4px 10px', color: 'var(--red)', borderColor: 'rgba(255,58,58,.3)', fontSize: 10 }}
        >
          ◢ TÖRÖL
        </button>
      </div>
      {error && <div style={{ marginTop: 6, padding: '4px 8px', background: 'rgba(255,58,58,.1)', color: 'var(--red)', fontSize: 10 }}>◢ {error}</div>}
    </div>
  )
}

interface AdminClientProps {
  operators: Operator[]
  entries: Entry[]
  currentOperator: Operator
}

export function AdminClient({ operators, entries, currentOperator }: AdminClientProps) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('OVERVIEW')
  const [opSearch, setOpSearch] = useState('')
  const [postSearch, setPostSearch] = useState('')
  const [cleanupPending, setCleanupPending] = useState(false)
  const [cleanupMsg, setCleanupMsg] = useState<string | null>(null)

  function refresh() {
    // Re-fetch server data without remounting the client tree (preserves tab + scroll)
    router.refresh()
  }

  async function handleCleanup() {
    if (!confirm('Töröljünk minden auth-azonosító nélküli (seed/placeholder) felhasználót és tartalmaikat? Ez nem visszafordítható.')) return
    setCleanupPending(true)
    setCleanupMsg(null)
    const res = await cleanupSeedOperators()
    setCleanupPending(false)
    if (res.error) setCleanupMsg(`HIBA: ${res.error}`)
    else { setCleanupMsg(`◢ Törölve: ${res.deleted ?? 0} placeholder fiók.`); refresh() }
  }

  const filteredOps = operators.filter(o =>
    !opSearch || o.callsign.toLowerCase().includes(opSearch.toLowerCase()) || o.id.toLowerCase().includes(opSearch.toLowerCase())
  )
  const filteredEntries = entries.filter(e =>
    !postSearch || e.title.toLowerCase().includes(postSearch.toLowerCase()) || e.id.toLowerCase().includes(postSearch.toLowerCase())
  )

  const totalPosts = entries.length
  const totalUsers = operators.length
  const realUsers = operators.filter(o => !!o.auth_id).length
  const placeholders = totalUsers - realUsers
  const totalXP = operators.reduce((s, o) => s + (o.xp ?? 0), 0)

  /* ─── Build a real activity log from posts ─── */
  type LogEntry = { ts: string; level: string; actor: string; msg: string }
  const logEntries: LogEntry[] = entries
    .slice(0, 30)
    .map(e => ({
      ts: new Date(e.created_at).toLocaleString('hu-HU', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      level: e.priority ? 'KIEMELT' : 'INFO',
      actor: e.operator?.callsign ?? e.operator_id,
      msg: `Poszt publikálva · ${e.id} · "${e.title.slice(0, 60)}${e.title.length > 60 ? '…' : ''}"`,
    }))

  return (
    <div className="shell admin-shell-pad" style={{ padding: '24px 56px' }}>
      <div className="superadmin-banner">
        <span className="dot dot-mag" />
        ◢ MODERÁTORI FELÜLET · {currentOperator.callsign} · MINDEN MŰVELET NAPLÓZVA
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '24px 0 20px', borderBottom: '1px solid var(--border-1)' }}>
        <div>
          <div className="sys muted" style={{ fontSize: 10, marginBottom: 6 }}>◢ IRÁNYÍTÁS · CTL-01</div>
          <h1 className="head" style={{ margin: 0, fontSize: 32 }}>MODERÁTORI FELÜLET</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Chip kind="accent" dot>RENDSZER · STABIL</Chip>
          {currentOperator.role === 'superadmin' && (
            <button className="btn btn-sm" disabled={cleanupPending} onClick={handleCleanup} style={{ color: 'var(--magenta)', borderColor: 'rgba(255,77,191,.4)' }}>
              {cleanupPending ? '◢ TÖRLÉS…' : '◢ PLACEHOLDER TISZTÍTÁS'}
            </button>
          )}
        </div>
      </div>
      {cleanupMsg && (
        <div style={{ marginTop: 10, padding: '8px 12px', background: cleanupMsg.startsWith('HIBA') ? 'rgba(255,58,58,.1)' : 'rgba(24,233,104,.1)', border: `1px solid ${cleanupMsg.startsWith('HIBA') ? 'var(--red)' : 'var(--accent)'}`, color: cleanupMsg.startsWith('HIBA') ? 'var(--red)' : 'var(--accent)', fontFamily: 'var(--f-sys)', fontSize: 11 }}>
          {cleanupMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" style={{ marginTop: 18 }}>
        {(['OVERVIEW', 'USERS', 'POSTS', 'LOG'] as Tab[]).map(t => {
          const labels: Record<Tab, string> = { OVERVIEW: 'ÁTTEKINTÉS', USERS: 'FELHASZNÁLÓK', POSTS: 'POSZTOK', LOG: 'NAPLÓ' }
          return (
            <div key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{labels[t]}</div>
          )
        })}
        <div style={{ flex: 1, borderBottom: '1px solid var(--border-1)' }} />
      </div>

      {tab === 'OVERVIEW' && (
        <>
          <div className="admin-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginTop: 22 }}>
            <KPI k="POSZTOK · ÖSSZESEN" v={String(totalPosts)} hint="rendszerben" />
            <KPI k="FELHASZNÁLÓK · VALÓS" v={`${realUsers} / ${totalUsers}`} hint={placeholders > 0 ? `${placeholders} placeholder` : 'tiszta'} kind="cyan" />
            <KPI k="ÖSSZES XP" v={String(totalXP)} hint="rendszer aktivitás" kind="mag" />
            <KPI k="SAJÁT JOG" v={currentOperator.role.toUpperCase()} hint={`LVL-0${currentOperator.level}`} />
          </div>

          <Panel tag="◢ GYORS NÉZET" title="LEGÚJABB POSZTOK" style={{ marginTop: 22 }}>
            {entries.slice(0, 5).map(e => (
              <PostRow key={e.id} entry={e} onChange={refresh} />
            ))}
            {entries.length === 0 && <div className="sys muted" style={{ padding: 14, fontSize: 11 }}>Nincs poszt.</div>}
          </Panel>
        </>
      )}

      {tab === 'USERS' && (
        <div style={{ marginTop: 22 }}>
          <Panel tag="◢ FELHASZNÁLÓK" title={`REGISZTER · ${operators.length}`}
            chips={
              <input
                className="input"
                placeholder="⌕ Keresés…"
                value={opSearch}
                onChange={e => setOpSearch(e.target.value)}
                style={{ fontSize: 11, padding: '4px 8px', width: 220 }}
              />
            }
          >
            <div style={{ display: 'grid', gridTemplateColumns: '36px 90px 1fr 116px 130px 90px auto', gap: 12, padding: '8px 14px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-2)' }}>
              {['', 'ID', 'FELHASZNÁLÓ', 'JOGOSULTSÁG', 'SZINT', 'STÁTUSZ', ''].map((h, i) => (
                <span key={i} className="sys muted" style={{ fontSize: 9 }}>{h}</span>
              ))}
            </div>
            {filteredOps.length === 0 ? (
              <div className="sys muted" style={{ padding: 16, fontSize: 11 }}>Nincs találat.</div>
            ) : filteredOps.map(op => (
              <UserRow key={op.id} op={op} currentOp={currentOperator} onChange={refresh} />
            ))}
          </Panel>
        </div>
      )}

      {tab === 'POSTS' && (
        <div style={{ marginTop: 22 }}>
          <Panel tag="◢ POSZTOK" title={`KEZELÉS · ${entries.length}`}
            chips={
              <input
                className="input"
                placeholder="⌕ Cím vagy ID…"
                value={postSearch}
                onChange={e => setPostSearch(e.target.value)}
                style={{ fontSize: 11, padding: '4px 8px', width: 220 }}
              />
            }
          >
            <div style={{ display: 'grid', gridTemplateColumns: '120px 80px 1fr 100px 90px 70px auto', gap: 12, padding: '8px 14px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-2)' }}>
              {['ID', 'TÍPUS', 'CÍM', 'SZERZŐ', 'IDŐPONT', 'OLV.', ''].map((h, i) => (
                <span key={i} className="sys muted" style={{ fontSize: 9 }}>{h}</span>
              ))}
            </div>
            {filteredEntries.length === 0 ? (
              <div className="sys muted" style={{ padding: 16, fontSize: 11 }}>Nincs találat.</div>
            ) : filteredEntries.map(e => (
              <PostRow key={e.id} entry={e} onChange={refresh} />
            ))}
          </Panel>
        </div>
      )}

      {tab === 'LOG' && (
        <div style={{ marginTop: 22 }}>
          <Panel tag="◢ ESEMÉNYNAPLÓ" title="RENDSZER NAPLÓ · ÉLŐ">
            <div style={{ display: 'grid', gridTemplateColumns: '110px 90px 110px 1fr', gap: 12, padding: '8px 14px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-2)' }}>
              {['IDŐ', 'SZINT', 'SZEREPLŐ', 'ESEMÉNY'].map((h, i) => (
                <span key={i} className="sys muted" style={{ fontSize: 9 }}>{h}</span>
              ))}
            </div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, lineHeight: 1.7 }}>
              {logEntries.length === 0 ? (
                <div className="sys muted" style={{ padding: 16, fontSize: 11 }}>Nincs esemény.</div>
              ) : logEntries.map((r, i, a) => {
                const c = r.level === 'KIEMELT' ? 'var(--magenta)' : 'var(--accent)'
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '110px 90px 110px 1fr', gap: 12, padding: '8px 14px', borderBottom: i < a.length - 1 ? '1px solid var(--border-0)' : 'none', alignItems: 'center' }}>
                    <span style={{ color: 'var(--ink-3)' }}>{r.ts}</span>
                    <span className="sys" style={{ color: c, fontSize: 9, letterSpacing: '.12em' }}>{r.level}</span>
                    <span className="mono" style={{ color: 'var(--ink-1)' }}>{r.actor}</span>
                    <span style={{ color: 'var(--ink-1)' }}>{r.msg}</span>
                  </div>
                )
              })}
            </div>
          </Panel>
        </div>
      )}
    </div>
  )
}
