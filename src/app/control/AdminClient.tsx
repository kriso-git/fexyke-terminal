'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Chip } from '@/components/ui/Chip'
import { Panel } from '@/components/ui/Panel'
import { Avatar } from '@/components/ui/Avatar'
import { LangPicker } from '@/components/ui/LangPicker'
import { useI18n } from '@/hooks/useI18n'
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
  const { t } = useI18n()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [editingCs, setEditingCs] = useState(false)
  const [csValue, setCsValue] = useState(op.callsign)
  const [showPw, setShowPw] = useState(false)
  const [pwValue, setPwValue] = useState('')
  const [adminPw, setAdminPw] = useState('')
  const isSelf = op.id === currentOp.id

  function changeCallsign() {
    if (currentOp.role !== 'superadmin') return
    const v = csValue.trim().toUpperCase()
    if (v === op.callsign) { setEditingCs(false); return }
    if (adminPw.length < 6) { setError(t('admin.confirm_own_password')); return }
    setError(null); setInfo(null)
    startTransition(async () => {
      const res = await updateOperatorCallsign(op.id, v, adminPw)
      if (res.error) setError(res.error)
      else { setInfo(t('admin.callsign_updated', { V: res.callsign ?? '' })); setEditingCs(false); setAdminPw(''); onChange() }
    })
  }

  function changePassword() {
    if (currentOp.role !== 'superadmin') return
    if (pwValue.length < 6) { setError(t('admin.password_min')); return }
    if (adminPw.length < 6) { setError(t('admin.confirm_own_password')); return }
    if (!confirm(t('admin.password_set_confirm', { NAME: op.callsign, PW: pwValue }))) return
    setError(null); setInfo(null)
    startTransition(async () => {
      const res = await updateOperatorPassword(op.id, pwValue, adminPw)
      if (res.error) setError(res.error)
      else { setInfo(t('admin.password_updated')); setPwValue(''); setAdminPw(''); setShowPw(false) }
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
    if (!confirm(t('admin.delete_user_confirm', { NAME: op.callsign }))) return
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
        <span className="admin-user-id mono muted" style={{ fontSize: 10 }}>{op.id}</span>
        <div className="admin-user-info" style={{ minWidth: 0 }}>
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
            <div style={{ display:'flex', gap:6, marginTop:4, flexWrap:'wrap' }}>
              <button onClick={() => setEditingCs(true)} className="sys" style={{ background:'none', border:'none', color:'var(--cyan)', cursor:'pointer', fontSize:9, letterSpacing:'.12em', padding:0 }}>{t('admin.callsign_edit')}</button>
              <button onClick={() => setShowPw(s=>!s)} className="sys" style={{ background:'none', border:'none', color:'var(--amber)', cursor:'pointer', fontSize:9, letterSpacing:'.12em', padding:0 }}>{t('admin.password_reset')}</button>
            </div>
          )}
          {showPw && (
            <div style={{ display:'flex', flexDirection:'column', gap:4, marginTop:6 }}>
              <input
                className="input"
                type="text"
                placeholder={t('admin.new_password_ph')}
                value={pwValue}
                onChange={e => setPwValue(e.target.value)}
                style={{ fontSize:11, padding:'4px 6px', minHeight:0 }}
              />
              <input
                className="input"
                type="password"
                placeholder={t('admin.own_password_ph')}
                value={adminPw}
                onChange={e => setAdminPw(e.target.value)}
                onKeyDown={e => { if (e.key==='Enter') changePassword(); if (e.key==='Escape') { setShowPw(false); setPwValue(''); setAdminPw('') } }}
                style={{ fontSize:11, padding:'4px 6px', minHeight:0 }}
              />
              <div style={{ display:'flex', gap:4 }}>
                <button className="btn btn-ghost btn-sm" disabled={pending || pwValue.length<6 || adminPw.length<6} onClick={changePassword} style={{ padding:'2px 6px', fontSize:10, minHeight:0, color:'var(--accent)' }}>{t('admin.save')}</button>
                <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => { setShowPw(false); setPwValue(''); setAdminPw('') }} style={{ padding:'2px 6px', fontSize:10, minHeight:0 }}>{t('admin.cancel')}</button>
              </div>
            </div>
          )}
          {editingCs && (
            <div style={{ marginTop:6 }}>
              <input
                className="input"
                type="password"
                placeholder={t('admin.own_password_ph')}
                value={adminPw}
                onChange={e => setAdminPw(e.target.value)}
                style={{ fontSize:11, padding:'4px 6px', minHeight:0, width:'100%' }}
              />
            </div>
          )}
        </div>

        {/* Role select */}
        <select
          className="admin-user-role input"
          disabled={pending || currentOp.role !== 'superadmin' || isSelf}
          value={op.role}
          onChange={e => changeRole(e.target.value as Role)}
          style={{ fontSize: 10, padding: '4px 6px', minWidth: 104, color: roleColor }}
        >
          <option value="operator">{t('admin.role_member')}</option>
          <option value="admin">{t('admin.role_admin')}</option>
          <option value="superadmin">{t('admin.role_super')}</option>
        </select>

        {/* Level controls */}
        <div className="admin-user-level" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button className="btn btn-ghost btn-sm" disabled={pending || op.level <= 1} onClick={() => changeLevel(-1)} style={{ padding: '2px 7px', minHeight: 0, fontSize: 11 }}>−</button>
          <Chip kind="accent" style={{ minWidth: 56, justifyContent: 'center', fontSize: 10 }}>LVL-{String(op.level).padStart(2, '0')}</Chip>
          <button className="btn btn-ghost btn-sm" disabled={pending || op.level >= 10} onClick={() => changeLevel(+1)} style={{ padding: '2px 7px', minHeight: 0, fontSize: 11 }}>+</button>
        </div>

        {/* Status */}
        <div className="admin-user-status">
          <Chip kind={op.auth_id ? 'accent' : 'dash'} dot={!!op.auth_id} style={{ fontSize: 9 }}>
            {op.auth_id ? t('admin.status_active') : t('admin.status_no_auth')}
          </Chip>
        </div>

        {/* Delete */}
        <button
          className="admin-user-delete btn btn-ghost btn-sm"
          disabled={pending || currentOp.role !== 'superadmin' || isSelf}
          onClick={handleDelete}
          style={{ padding: '4px 10px', color: 'var(--red)', borderColor: 'rgba(255,58,58,.3)', fontSize: 10 }}
        >
          {t('admin.delete')}
        </button>
      </div>
      {error && <div style={{ marginTop: 6, padding: '4px 8px', background: 'rgba(255,58,58,.1)', color: 'var(--red)', fontSize: 10 }}>◢ {error}</div>}
      {info && <div style={{ marginTop: 6, padding: '4px 8px', background: 'rgba(24,233,104,.1)', color: 'var(--accent)', fontSize: 10 }}>◢ {info}</div>}
    </div>
  )
}

/* ─── Post row ─── */
function PostRow({ entry, onChange }: { entry: Entry; onChange: () => void }) {
  const { t, lang } = useI18n()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const localeMap: Record<string, string> = { hu:'hu-HU', en:'en-US', de:'de-DE', es:'es-ES', fr:'fr-FR', no:'no-NO', sv:'sv-SE', ua:'uk-UA', ru:'ru-RU' }
  const fmtDate = (iso: string) => {
    try { return new Date(iso).toLocaleString(localeMap[lang] ?? 'hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return '—' }
  }

  function handleDelete() {
    if (!confirm(t('admin.delete_post_confirm', { TITLE: entry.title }))) return
    setError(null)
    startTransition(async () => {
      const res = await deleteEntry(entry.id)
      if (res.error) setError(res.error)
      else onChange()
    })
  }

  const isVideo = entry.kind === 'VIDEÓ' || entry.kind === 'ADÁS' || entry.media_type === 'youtube'
  const isImage = entry.media_type === 'image'
  const kindLabel = isVideo ? t('post.video') : isImage ? t('post.image') : t('post.text')

  return (
    <div style={{ borderBottom: '1px solid var(--border-0)', padding: '12px 14px' }}>
      <div className="admin-post-row" style={{ display: 'grid', gridTemplateColumns: '120px 80px 1fr 100px 90px 70px auto', gap: 12, alignItems: 'center' }}>
        <span className="mono muted" style={{ fontSize: 10 }}>{entry.id}</span>
        <Chip kind={isVideo ? 'mag' : isImage ? 'cyan' : 'dash'} style={{ fontSize: 9 }}>{kindLabel}</Chip>
        <span className="head" style={{ fontSize: 13, color: 'var(--ink-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.title}
          {entry.priority && <Chip kind="accent" dot style={{ marginLeft: 8, fontSize: 9 }}>{t('card.featured')}</Chip>}
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
          {t('admin.delete')}
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
  const { t, lang } = useI18n()
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
    if (!confirm(t('admin.cleanup_confirm'))) return
    setCleanupPending(true)
    setCleanupMsg(null)
    const res = await cleanupSeedOperators()
    setCleanupPending(false)
    if (res.error) setCleanupMsg(`HIBA: ${res.error}`)
    else { setCleanupMsg(t('admin.cleanup_done', { N: res.deleted ?? 0 })); refresh() }
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
  const localeMap: Record<string, string> = { hu:'hu-HU', en:'en-US', de:'de-DE', es:'es-ES', fr:'fr-FR', no:'no-NO', sv:'sv-SE', ua:'uk-UA', ru:'ru-RU' }
  type LogEntry = { ts: string; level: string; actor: string; msg: string }
  const logEntries: LogEntry[] = entries
    .slice(0, 30)
    .map(e => ({
      ts: new Date(e.created_at).toLocaleString(localeMap[lang] ?? 'hu-HU', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      level: e.priority ? t('admin.event_pinned') : t('admin.event_info'),
      actor: e.operator?.callsign ?? e.operator_id,
      msg: t('admin.event_post_published', { ID: e.id, T: e.title.slice(0, 60) + (e.title.length > 60 ? '…' : '') }),
    }))

  return (
    <div className="shell admin-shell-pad" style={{ padding: '24px 56px' }}>
      <div className="superadmin-banner">
        <span className="dot dot-mag" />
        ◢ {t('admin.banner', { NAME: currentOperator.callsign })}
      </div>

      {/* Header */}
      <div className="admin-head-row" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '24px 0 20px', borderBottom: '1px solid var(--border-1)', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div className="sys muted" style={{ fontSize: 10, marginBottom: 6 }}>{t('admin.head_tag')}</div>
          <h1 className="head" style={{ margin: 0, fontSize: 32 }}>{t('admin.head_title')}</h1>
        </div>
        <div className="admin-head-actions" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <LangPicker align="right" size="sm"/>
          <Chip kind="accent" dot>{t('admin.system_stable')}</Chip>
          {currentOperator.role === 'superadmin' && (
            <button className="btn btn-sm" disabled={cleanupPending} onClick={handleCleanup} style={{ color: 'var(--magenta)', borderColor: 'rgba(255,77,191,.4)' }}>
              {cleanupPending ? t('admin.cleanup_progress') : t('admin.cleanup')}
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
        {(['OVERVIEW', 'USERS', 'POSTS', 'LOG'] as Tab[]).map(tabKey => {
          const labelKeys: Record<Tab, string> = {
            OVERVIEW: 'admin.tab_overview',
            USERS: 'admin.tab_users',
            POSTS: 'admin.tab_posts',
            LOG: 'admin.tab_log',
          }
          return (
            <div key={tabKey} className={`tab${tab === tabKey ? ' active' : ''}`} onClick={() => setTab(tabKey)}>{t(labelKeys[tabKey])}</div>
          )
        })}
        <div style={{ flex: 1, borderBottom: '1px solid var(--border-1)' }} />
      </div>

      {tab === 'OVERVIEW' && (
        <>
          <div className="admin-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginTop: 22 }}>
            <KPI k={t('admin.kpi_posts_total')} v={String(totalPosts)} hint={t('admin.kpi_posts_hint')} />
            <KPI k={t('admin.kpi_users_real')} v={`${realUsers} / ${totalUsers}`} hint={placeholders > 0 ? t('admin.kpi_users_placeholder', { N: placeholders }) : t('admin.kpi_users_clean')} kind="cyan" />
            <KPI k={t('admin.kpi_total_xp')} v={String(totalXP)} hint={t('admin.kpi_xp_hint')} kind="mag" />
            <KPI k={t('admin.kpi_my_role')} v={currentOperator.role.toUpperCase()} hint={`LVL-0${currentOperator.level}`} />
          </div>

          <Panel tag={t('admin.quick_view')} title={t('admin.latest_posts')} style={{ marginTop: 22 }}>
            {entries.slice(0, 5).map(e => (
              <PostRow key={e.id} entry={e} onChange={refresh} />
            ))}
            {entries.length === 0 && <div className="sys muted" style={{ padding: 14, fontSize: 11 }}>{t('admin.no_posts')}</div>}
          </Panel>
        </>
      )}

      {tab === 'USERS' && (
        <div style={{ marginTop: 22 }}>
          <Panel tag={t('admin.users_panel')} title={t('admin.users_register', { N: operators.length })}
            chips={
              <input
                className="input"
                placeholder={t('admin.search')}
                value={opSearch}
                onChange={e => setOpSearch(e.target.value)}
                style={{ fontSize: 11, padding: '4px 8px', width: 220 }}
              />
            }
          >
            <div className="admin-table-header" style={{ display: 'grid', gridTemplateColumns: '36px 90px 1fr 116px 130px 90px auto', gap: 12, padding: '8px 14px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-2)' }}>
              {['', t('admin.col_id'), t('admin.col_user'), t('admin.col_role'), t('admin.col_level'), t('admin.col_status'), ''].map((h, i) => (
                <span key={i} className="sys muted" style={{ fontSize: 9 }}>{h}</span>
              ))}
            </div>
            {filteredOps.length === 0 ? (
              <div className="sys muted" style={{ padding: 16, fontSize: 11 }}>{t('admin.no_match')}</div>
            ) : filteredOps.map(op => (
              <UserRow key={op.id} op={op} currentOp={currentOperator} onChange={refresh} />
            ))}
          </Panel>
        </div>
      )}

      {tab === 'POSTS' && (
        <div style={{ marginTop: 22 }}>
          <Panel tag={t('admin.posts_panel')} title={t('admin.posts_manage', { N: entries.length })}
            chips={
              <input
                className="input"
                placeholder={t('admin.search_post')}
                value={postSearch}
                onChange={e => setPostSearch(e.target.value)}
                style={{ fontSize: 11, padding: '4px 8px', width: 220 }}
              />
            }
          >
            <div className="admin-table-header" style={{ display: 'grid', gridTemplateColumns: '120px 80px 1fr 100px 90px 70px auto', gap: 12, padding: '8px 14px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-2)' }}>
              {[t('admin.col_id'), t('admin.col_type'), t('admin.col_title'), t('admin.col_author'), t('admin.col_time'), t('admin.col_reads'), ''].map((h, i) => (
                <span key={i} className="sys muted" style={{ fontSize: 9 }}>{h}</span>
              ))}
            </div>
            {filteredEntries.length === 0 ? (
              <div className="sys muted" style={{ padding: 16, fontSize: 11 }}>{t('admin.no_match')}</div>
            ) : filteredEntries.map(e => (
              <PostRow key={e.id} entry={e} onChange={refresh} />
            ))}
          </Panel>
        </div>
      )}

      {tab === 'LOG' && (
        <div style={{ marginTop: 22 }}>
          <Panel tag={t('admin.log_panel')} title={t('admin.log_live')}>
            <div className="admin-table-header" style={{ display: 'grid', gridTemplateColumns: '110px 90px 110px 1fr', gap: 12, padding: '8px 14px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-2)' }}>
              {[t('admin.col_log_time'), t('admin.col_log_level'), t('admin.col_log_actor'), t('admin.col_log_event')].map((h, i) => (
                <span key={i} className="sys muted" style={{ fontSize: 9 }}>{h}</span>
              ))}
            </div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, lineHeight: 1.7 }}>
              {logEntries.length === 0 ? (
                <div className="sys muted" style={{ padding: 16, fontSize: 11 }}>{t('admin.no_events')}</div>
              ) : logEntries.map((r, i, a) => {
                const c = r.level === t('admin.event_pinned') ? 'var(--magenta)' : 'var(--accent)'
                return (
                  <div key={i} className="admin-log-row" style={{ display: 'grid', gridTemplateColumns: '110px 90px 110px 1fr', gap: 12, padding: '8px 14px', borderBottom: i < a.length - 1 ? '1px solid var(--border-0)' : 'none', alignItems: 'center' }}>
                    <span className="admin-log-cell-time" style={{ color: 'var(--ink-3)' }}>{r.ts}</span>
                    <span className="admin-log-cell-level sys" style={{ color: c, fontSize: 9, letterSpacing: '.12em' }}>{r.level}</span>
                    <span className="admin-log-cell-actor mono" style={{ color: 'var(--ink-1)' }}>{r.actor}</span>
                    <span className="admin-log-cell-msg" style={{ color: 'var(--ink-1)' }}>{r.msg}</span>
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
