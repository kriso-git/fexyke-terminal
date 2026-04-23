'use client'

import { useState } from 'react'
import { Chip } from '@/components/ui/Chip'
import { Panel } from '@/components/ui/Panel'
import { Meta } from '@/components/ui/Meta'
import { Heading } from '@/components/ui/Heading'
import { Avatar } from '@/components/ui/Avatar'
import { NodeMap } from '@/components/ui/NodeMap'
import type { Operator, Entry } from '@/lib/types'

const SEED_OPS: Operator[] = [
  { id:'1', auth_id:null, callsign:'KURIER',   level:4, role:'superadmin', node:'f3x-pri-01', joined_cycle:1,  bio:null, created_at:'' },
  { id:'2', auth_id:null, callsign:'NULLSET',  level:3, role:'admin',      node:'f3x-pri-01', joined_cycle:12, bio:null, created_at:'' },
  { id:'3', auth_id:null, callsign:'HALO',     level:2, role:'operator',   node:'f3x-pri-01', joined_cycle:18, bio:null, created_at:'' },
  { id:'4', auth_id:null, callsign:'MOTH',     level:2, role:'operator',   node:'f3x-pri-01', joined_cycle:21, bio:null, created_at:'' },
  { id:'5', auth_id:null, callsign:'PARALLAX', level:2, role:'operator',   node:'f3x-pri-01', joined_cycle:28, bio:null, created_at:'' },
  { id:'6', auth_id:null, callsign:'VOID',     level:1, role:'operator',   node:'f3x-mir-01', joined_cycle:30, bio:null, created_at:'' },
  { id:'7', auth_id:null, callsign:'CIPHER',   level:2, role:'operator',   node:'f3x-pri-01', joined_cycle:32, bio:null, created_at:'' },
  { id:'8', auth_id:null, callsign:'RELAY',    level:1, role:'operator',   node:'f3x-mir-02', joined_cycle:34, bio:null, created_at:'' },
  { id:'9', auth_id:null, callsign:'ECHO',     level:2, role:'operator',   node:'f3x-pri-01', joined_cycle:41, bio:null, created_at:'' },
]

function KPI({ k, v, hint, kind = 'accent' }: { k:string; v:string; hint?:string; kind?:'accent'|'mag'|'warn' }) {
  const color = kind==='mag'?'var(--magenta)':kind==='warn'?'var(--amber)':'var(--accent)'
  return (
    <div className="panel" style={{ padding:'14px 16px' }}>
      <div className="sys muted">{k}</div>
      <div className="head" style={{ fontSize:34, color, textShadow:kind==='accent'?'var(--accent-glow)':'none', marginTop:4 }}>{v}</div>
      {hint && <div className="sys muted" style={{ marginTop:2 }}>{hint}</div>}
    </div>
  )
}

interface AdminClientProps {
  operators: Operator[]
  entries: Entry[]
}

export function AdminClient({ operators, entries }: AdminClientProps) {
  const [tab, setTab] = useState('OVERVIEW')
  const ops = operators.length > 0 ? operators : SEED_OPS

  const statusOf = (op: Operator) => {
    if (op.level >= 3) return { label:'ONLINE', kind:'acc' }
    if (op.level >= 2) return { label:'ONLINE', kind:'acc' }
    return { label:'OFFLINE', kind:'err' }
  }

  return (
    <div className="shell" style={{ padding:'24px 56px' }}>
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', padding:'16px 0 24px', borderBottom:'1px solid var(--border-1)' }}>
        <Heading tag="IRÁNYÍTÁS · CTL-01" title="RENDSZER PARANCSNOKI FELÜLET"
          sub="Operátorok, bejegyzések, ciklus commit-ok, jelzésláncok és integritási metrikák egy képen. Minden művelethez 2-of-3 aláírás szükséges."/>
        <div style={{ display:'flex', gap:8 }}>
          <Chip kind="accent" dot>SYSTEMS · NOMINAL</Chip>
          <button className="btn btn-sm">◢ EXPORT NAPLÓ</button>
          <button className="btn btn-primary btn-sm">◢ CIKLUS 048 COMMIT</button>
        </div>
      </div>

      <div className="tabs" style={{ marginTop:18 }}>
        {['OVERVIEW','OPERÁTOROK','BEJEGYZÉSEK','JELZÉSLÁNCOK','KULCSTÁR','NAPLÓ'].map(t=>(
          <div key={t} className={`tab${tab===t?' active':''}`} onClick={()=>setTab(t)}>{t}</div>
        ))}
        <div style={{flex:1, borderBottom:'1px solid var(--border-1)'}}/>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginTop:22 }}>
        <KPI k="BEJEGYZÉS · ÉLŐ" v="2 481" hint="+12 / 24h"/>
        <KPI k="OPERÁTOR · ONLINE" v={`17 / ${ops.length}`} hint="3 privilegizált"/>
        <KPI k="JELZÉSLÁNC · NYITOTT" v="38" hint="4 archiválva"/>
        <KPI k="INTEGRITÁS · RÁCS" v="0.98" hint="küszöb 0.90" kind="accent"/>
        <KPI k="RIASZTÁS · 24H" v="2" hint="1 kritikus · 1 info" kind="mag"/>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:18, marginTop:18 }}>
        {/* Operators table */}
        <Panel tag="OPERÁTOROK" title={`REGISZTER · ${ops.length}`}
          chips={<><Chip kind="dash">⌕ SZŰRŐ</Chip><Chip kind="accent">ÉLŐ</Chip></>}>
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'90px 32px 1fr 80px 80px 100px 32px', background:'var(--bg-2)' }}>
              {['ID','','HÍVÓJEL','SZINT','CSATL.','ÁLLAPOT',''].map(h=>(
                <div key={h} className="sys muted" style={{ padding:'8px 10px', borderBottom:'1px solid var(--border-1)', fontSize:10 }}>{h}</div>
              ))}
            </div>
            {ops.map((op, ri) => {
              const st = statusOf(op)
              return (
                <div key={op.id} style={{ display:'grid', gridTemplateColumns:'90px 32px 1fr 80px 80px 100px 32px', borderBottom: ri < ops.length-1 ? '1px solid var(--border-0)' : 'none' }}>
                  <div style={{ padding:'10px', display:'flex', alignItems:'center' }}><span className="mono" style={{ fontSize:11 }}>{op.id}</span></div>
                  <div style={{ padding:'10px', display:'flex', alignItems:'center' }}><Avatar id={op.callsign} size={22}/></div>
                  <div style={{ padding:'10px', display:'flex', alignItems:'center' }}><span className="head" style={{ fontSize:13 }}>{op.callsign}</span></div>
                  <div style={{ padding:'10px', display:'flex', alignItems:'center' }}><Chip>LVL-0{op.level}</Chip></div>
                  <div style={{ padding:'10px', display:'flex', alignItems:'center' }}><span className="mono muted">{op.joined_cycle}</span></div>
                  <div style={{ padding:'10px', display:'flex', alignItems:'center', gap:6 }}>
                    <span className={`dot${st.kind==='err'?' dot-err':''}`}/>
                    <span className="sys" style={{ fontSize:10, color:st.kind==='err'?'var(--red)':'var(--accent)' }}>{st.label}</span>
                  </div>
                  <div style={{ padding:'10px', display:'flex', alignItems:'center' }}><span style={{ color:'var(--ink-3)' }}>⋯</span></div>
                </div>
              )
            })}
          </div>
          <div style={{ display:'flex', gap:8, padding:'12px', borderTop:'1px solid var(--border-1)' }}>
            <button className="btn btn-sm">◢ SZINT MÓD.</button>
            <button className="btn btn-sm">◢ KULCS ROTÁCIÓ</button>
            <span style={{flex:1}}/>
            <button className="btn btn-sm" style={{ color:'var(--red)', borderColor:'rgba(255,58,58,.4)' }}>◢ TILTÁS</button>
            <button className="btn btn-primary btn-sm">◢ ÚJ OPERÁTOR</button>
          </div>
        </Panel>

        <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
          <Panel tag="CIKLUS COMMIT" title="047 → 048" className="panel-raised" chips={<Chip kind="accent" dot>2-OF-3</Chip>}>
            <Meta k="BEJEGYZÉS" v="12 új · 3 szerkesztett · 0 törölt"/>
            <Meta k="ÜTKÖZÉS"   v="0 függő"/>
            <Meta k="INTEGRITÁS" v="0.98 (küszöb 0.90)"/>
            <Meta k="ALÁÍRÁS"   v="1 / 3 · vár KURIER · NULLSET"/>
            <div className="bar-track" style={{ marginTop:8 }}><div className="bar-fill" style={{ width:'33%' }}/></div>
            <div style={{ display:'flex', gap:8, marginTop:10 }}>
              <button className="btn btn-sm">◢ DIFF</button>
              <button className="btn btn-sm">◢ ROLLBACK</button>
              <span style={{flex:1}}/>
              <button className="btn btn-primary btn-sm">◢ ALÁÍR</button>
            </div>
          </Panel>

          <Panel tag="RIASZTÁSOK" title="AKTÍV ESEMÉNYEK">
            {[
              ['REL-14','Relé offline','CIKLUS 047 · 00:02','mag'],
              ['AUT-87','Ismétlődő login hiba · F3X-087','CIKLUS 047 · 00:08','warn'],
            ].map(r=>(
              <div key={r[0]} className="panel" style={{ padding:'10px 12px', marginBottom:8,
                background:r[3]==='mag'?'rgba(255,77,191,.06)':'rgba(255,179,71,.06)',
                borderColor:r[3]==='mag'?'var(--magenta)':'var(--amber)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <span className={`dot${r[3]==='mag'?' dot-mag':' dot-warn'}`}/>
                  <Chip kind={r[3]==='mag'?'mag':'warn'}>{r[0]}</Chip>
                  <span className="head" style={{ fontSize:13, color:'var(--ink-0)' }}>{r[1]}</span>
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <span className="sys muted">{r[2]}</span>
                  <span style={{flex:1}}/>
                  <span className="sys" style={{ color:'var(--cyan)' }}>↗ RÉSZLETEK</span>
                  <span className="sys" style={{ color:'var(--accent)' }}>◢ LEZÁR</span>
                </div>
              </div>
            ))}
          </Panel>

          <Panel tag="RÁCS TÉRKÉP" title="HIDEG SZEKTOR · ÉLŐ">
            <div style={{ height:180, background:'var(--bg-2)', border:'1px solid var(--border-0)' }}>
              <NodeMap count={18} highlight={4} seed={12}/>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:10 }}>
              <Chip kind="accent">14 STABIL</Chip>
              <Chip kind="warn">3 SODRÓDIK</Chip>
              <Chip kind="mag">1 OFFLINE</Chip>
            </div>
          </Panel>
        </div>
      </div>

      {/* Log stream */}
      <div style={{ marginTop:22, paddingBottom:56 }}>
        <Panel tag="RENDSZER NAPLÓ" title="ESEMÉNYFOLYAM · ÉLŐ"
          chips={<><Chip kind="dash">⌕ SZŰRŐ</Chip><Chip kind="cyan">VÁLTOZÁSOK</Chip><Chip kind="accent" dot>FOLYAMATOS</Chip></>}>
          <div style={{ fontFamily:'var(--f-mono)', fontSize:12, lineHeight:1.7 }}>
            {[
              ['00:14:02','INFO','F3X-014','átvitel publikálva · LOG-2481 · sig 9f·0a·72·c4'],
              ['00:12:44','SYS','—','uplink integritás 0.98 · minta 040'],
              ['00:08:41','SEC','F3X-087','login elutasítva · fingerprint nem egyezik'],
              ['00:04:22','INFO','F3X-022','átvitel publikálva · LOG-2480'],
              ['00:02:14','CRIT','RELAY','relé-14 offline · auto-retry kudarc'],
              ['00:00:14','INFO','F3X-014','session indult · SES-7F2A-0481'],
              ['23:57:40','SEC','—','login elutasítva · hívójel hiányzik'],
              ['23:47:11','INFO','F3X-001','küldemény kézbesítve F3X-014 részére'],
            ].map((r,i,a)=>{
              const c = r[1]==='CRIT'?'var(--red)':r[1]==='SEC'?'var(--amber)':r[1]==='SYS'?'var(--cyan)':'var(--ink-2)'
              return (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'80px 60px 90px 1fr 32px', gap:10, padding:'6px 12px', borderBottom:i<a.length-1?'1px solid var(--border-0)':'none', alignItems:'center' }}>
                  <span style={{ color:'var(--ink-3)' }}>{r[0]}</span>
                  <span className="sys" style={{ color:c, letterSpacing:'.15em' }}>{r[1]}</span>
                  <span className="mono" style={{ color:'var(--ink-1)' }}>{r[2]}</span>
                  <span style={{ color:'var(--ink-1)' }}>{r[3]}</span>
                  <span className="sys" style={{ color:'var(--ink-3)', textAlign:'right' }}>↗</span>
                </div>
              )
            })}
          </div>
        </Panel>
      </div>
    </div>
  )
}
