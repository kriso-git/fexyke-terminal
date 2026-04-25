'use client'

import { useState, ReactNode } from 'react'
import Link from 'next/link'
import { Chip } from '@/components/ui/Chip'
import { Panel } from '@/components/ui/Panel'
import { Avatar } from '@/components/ui/Avatar'
import type { Operator, Entry } from '@/lib/types'

const SEED_OPS: Operator[] = [
  { id:'F3X-001', auth_id:null, callsign:'KURIER',   level:4, role:'superadmin', node:'f3x-pri-01', joined_cycle:1,  bio:null, created_at:'2026-01-10T00:00:00Z' },
  { id:'F3X-014', auth_id:null, callsign:'NULLSET',  level:3, role:'admin',      node:'f3x-pri-01', joined_cycle:12, bio:null, created_at:'2026-02-01T00:00:00Z' },
  { id:'F3X-022', auth_id:null, callsign:'HALO',     level:2, role:'operator',   node:'f3x-pri-01', joined_cycle:18, bio:null, created_at:'2026-02-20T00:00:00Z' },
  { id:'F3X-031', auth_id:null, callsign:'MOTH',     level:2, role:'operator',   node:'f3x-pri-01', joined_cycle:21, bio:null, created_at:'2026-03-01T00:00:00Z' },
  { id:'F3X-044', auth_id:null, callsign:'PARALLAX', level:2, role:'operator',   node:'f3x-pri-01', joined_cycle:28, bio:null, created_at:'2026-03-15T00:00:00Z' },
  { id:'F3X-055', auth_id:null, callsign:'VOID',     level:1, role:'operator',   node:'f3x-pri-01', joined_cycle:30, bio:null, created_at:'2026-03-20T00:00:00Z' },
]

const LOG_ROWS = [
  ['00:14:02','INFO',    'F3X-014','Poszt publikálva · LOG-2481'],
  ['00:12:44','RENDSZER','—',      'Kapcsolat integritás 0.98 · ellenőrzés kész'],
  ['00:08:41','BIZTONSÁ','F3X-087','Belépés elutasítva · helytelen jelszó'],
  ['00:04:22','INFO',    'F3X-022','Poszt publikálva · LOG-2480'],
  ['00:02:14','KRITIKUS','—',      'Szerver timeout · automatikus újracsatlakozás'],
  ['00:00:14','INFO',    'F3X-014','Session indult · SES-7F2A-0481'],
  ['23:57:40','BIZTONSÁ','—',      'Belépés elutasítva · ismeretlen felhasználónév'],
  ['23:47:11','INFO',    'F3X-001','Üzenet kézbesítve F3X-014 részére'],
]

function KPI({ k, v, hint, kind = 'accent' }: { k:string; v:string; hint?:string; kind?:'accent'|'mag'|'cyan' }) {
  const color = kind==='mag'?'var(--magenta)':kind==='cyan'?'var(--cyan)':'var(--accent)'
  return (
    <div className="panel" style={{ padding:'18px 20px' }}>
      <div className="sys muted" style={{ fontSize:10 }}>{k}</div>
      <div className="head" style={{ fontSize:40, color, textShadow:kind==='accent'?'var(--accent-glow)':'none', marginTop:6 }}>{v}</div>
      {hint && <div className="sys muted" style={{ marginTop:4, fontSize:10 }}>{hint}</div>}
    </div>
  )
}

function CollapseSection({ tag, title, open: initOpen, children }: { tag:string; title:string; open?:boolean; children: ReactNode }) {
  const [open, setOpen] = useState(initOpen ?? true)
  return (
    <Panel tag={tag} title={title}
      chips={
        <button className="btn btn-ghost btn-sm" style={{ minHeight:0, padding:'3px 10px' }}
          onClick={() => setOpen(o => !o)}>
          {open ? '▼' : '▶'}
        </button>
      }
      style={{ marginBottom:18 }}
    >
      {open && children}
    </Panel>
  )
}

interface AdminClientProps {
  operators: Operator[]
  entries: Entry[]
}

export function AdminClient({ operators, entries }: AdminClientProps) {
  const [tab, setTab] = useState('ÁTTEKINTÉS')
  const ops = operators.length > 0 ? operators : SEED_OPS

  const onlineOps = ops.filter(o => o.level >= 2).length
  const liveEntries = entries.length || 2481
  const openTopics  = 38

  const fmtDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('hu-HU', { month:'short', day:'numeric' }) } catch { return '—' }
  }

  const lastSeen = (op: Operator) => op.level >= 2 ? 'Ma' : '3 napja'

  return (
    <div className="shell" style={{ padding:'24px 56px' }}>
      {/* Superadmin banner */}
      <div className="superadmin-banner">
        <span className="dot dot-mag"/>
        ◢ MODERÁTORI FELÜLET · KORLÁTOZOTT HOZZÁFÉRÉS · MINDEN MŰVELET NAPLÓZVA
      </div>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', padding:'24px 0 20px', borderBottom:'1px solid var(--border-1)' }}>
        <div>
          <div className="sys muted" style={{ fontSize:10, marginBottom:6 }}>◢ IRÁNYÍTÁS · CTL-01</div>
          <h1 className="head" style={{ margin:0, fontSize:32 }}>MODERÁTORI FELÜLET</h1>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Chip kind="accent" dot>RENDSZER · STABIL</Chip>
          <button className="btn btn-sm">◢ NAPLÓ EXPORT</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginTop:18 }}>
        {['ÁTTEKINTÉS','FELHASZNÁLÓK','POSZTOK','TÉMÁK','NAPLÓ'].map(t => (
          <div key={t} className={`tab${tab===t?' active':''}`} onClick={() => setTab(t)}>{t}</div>
        ))}
        <div style={{ flex:1, borderBottom:'1px solid var(--border-1)' }}/>
      </div>

      {/* 3 KPI */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginTop:22 }}>
        <KPI k="POSZTOK · KINT"        v={String(liveEntries)} hint="+12 / 24 óra"/>
        <KPI k="FELHASZNÁLÓK · ONLINE" v={`${onlineOps} / ${ops.length}`} hint="aktív sessiök" kind="cyan"/>
        <KPI k="TÉMÁK · NYITOTT"       v={String(openTopics)} hint="4 archivált" kind="mag"/>
      </div>

      {/* Collapsible: Users */}
      <div style={{ marginTop:22 }}>
        <CollapseSection tag="◢ FELHASZNÁLÓK" title={`REGISZTER · ${ops.length}`} open={true}>
          <div>
            {/* Table header */}
            <div style={{ display:'grid', gridTemplateColumns:'88px 32px 1fr 72px 80px 90px 100px 88px', background:'var(--bg-2)', borderBottom:'1px solid var(--border-1)' }}>
              {['ID','','FELHASZNÁLÓNÉV','SZINT','CSATL.','UTOLSÓ','ÁLLAPOT',''].map(h => (
                <div key={h} className="sys muted" style={{ padding:'7px 10px', fontSize:9 }}>{h}</div>
              ))}
            </div>
            {ops.map((op, ri) => {
              const online = op.level >= 2
              return (
                <div key={op.id} style={{ display:'grid', gridTemplateColumns:'88px 32px 1fr 72px 80px 90px 100px 88px', borderBottom: ri < ops.length-1 ? '1px solid var(--border-0)' : 'none', alignItems:'center' }}>
                  <span className="mono muted" style={{ padding:'10px', fontSize:10 }}>{op.id}</span>
                  <div style={{ padding:'10px 4px' }}><Avatar id={op.id} size={22}/></div>
                  <span className="head" style={{ padding:'10px', fontSize:13 }}>
                    <Link href={`/operators/${op.callsign}`} style={{ color:'inherit', textDecoration:'none' }}>{op.callsign}</Link>
                  </span>
                  <span style={{ padding:'10px' }}><Chip style={{ fontSize:9 }}>LVL-0{op.level}</Chip></span>
                  <span className="mono muted" style={{ padding:'10px', fontSize:11 }}>{fmtDate(op.created_at)}</span>
                  <span className="sys muted" style={{ padding:'10px', fontSize:10 }}>{lastSeen(op)}</span>
                  <div style={{ padding:'10px', display:'flex', alignItems:'center', gap:6 }}>
                    <span className={`dot${!online?' dot-err':''}`} style={{ width:6, height:6 }}/>
                    <span className="sys" style={{ fontSize:10, color: online?'var(--accent)':'var(--red)' }}>
                      {online ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </div>
                  <span className="sys muted" style={{ padding:'10px', fontSize:10, cursor:'pointer', color:'var(--ink-3)' }}>⋯</span>
                </div>
              )
            })}
          </div>
          <div style={{ display:'flex', gap:8, padding:'12px 0 4px', borderTop:'1px solid var(--border-1)', marginTop:4 }}>
            <button className="btn btn-sm">SZINT MÓD.</button>
            <button className="btn btn-sm">JELSZÓ RESET</button>
            <button className="btn btn-sm" style={{ color:'var(--red)', borderColor:'rgba(255,58,58,.3)' }}>TILTÁS</button>
            <span style={{ flex:1 }}/>
            <button className="btn btn-primary btn-sm">◢ ÚJ FELHASZNÁLÓ</button>
          </div>
        </CollapseSection>

        {/* Collapsible: Event log */}
        <CollapseSection tag="◢ ESEMÉNYNAPLÓ" title="RENDSZER NAPLÓ · ÉLŐ" open={true}>
          <div style={{ fontFamily:'var(--f-mono)', fontSize:11, lineHeight:1.7 }}>
            {LOG_ROWS.map((r, i, a) => {
              const c = r[1]==='KRITIKUS'?'var(--red)':r[1]==='BIZTONSÁ'?'var(--amber)':r[1]==='RENDSZER'?'var(--cyan)':'var(--ink-2)'
              return (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'80px 80px 90px 1fr', gap:10, padding:'6px 0', borderBottom:i<a.length-1?'1px solid var(--border-0)':'none', alignItems:'center' }}>
                  <span style={{ color:'var(--ink-3)' }}>{r[0]}</span>
                  <span className="sys" style={{ color:c, fontSize:9, letterSpacing:'.12em' }}>{r[1]}</span>
                  <span className="mono" style={{ color:'var(--ink-1)' }}>{r[2]}</span>
                  <span style={{ color:'var(--ink-1)' }}>{r[3]}</span>
                </div>
              )
            })}
          </div>
        </CollapseSection>
      </div>
    </div>
  )
}
