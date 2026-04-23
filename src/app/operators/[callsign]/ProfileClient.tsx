'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Chip } from '@/components/ui/Chip'
import { Panel } from '@/components/ui/Panel'
import { Meta } from '@/components/ui/Meta'
import { Heading } from '@/components/ui/Heading'
import { Avatar } from '@/components/ui/Avatar'
import { LiveTicks } from '@/components/ui/LiveTicks'
import { createProfileSignal } from '@/app/actions'
import type { Operator, Entry, ProfileSignal } from '@/lib/types'

const SEED_OP: Operator = {
  id:'F3X-014', auth_id:null, callsign:'NULLSET', level:3, role:'admin', node:'f3x-pri-01', joined_cycle:12,
  bio:'Tizenkét ciklus óta figyelem a hideg szektorok protokoll-aláírásait. Hozzám érnek be először a külső rács szinkronjai, és én adom tovább a 04-B mérőrács diagnosztikáját a mirror-relékre. A memóriadiffek architektúrájának karbantartása és a soft-rollback protokoll dokumentálása a fő feladatom.',
  created_at:'',
}

const SEED_SIGNALS: ProfileSignal[] = [
  { id:'ps1', target_id:'F3X-014', author_id:'F3X-001', text:'Jól láttad a sodródást. A 2-of-3 aláírásomat adom, ha újra szükség lesz rá.', verified:true, created_at:'CIKLUS 047 · 02:31', author:{ id:'F3X-001', auth_id:null, callsign:'KURIER', level:4, role:'superadmin', node:'f3x-pri-01', joined_cycle:1, bio:null, created_at:'' } },
  { id:'ps2', target_id:'F3X-014', author_id:'F3X-022', text:'Köszi a memóriadiff elemzést — a 04-B konfig átvételét javaslom az én mezőnaplóimhoz is.', verified:false, created_at:'CIKLUS 046 · 21:04', author:{ id:'F3X-022', auth_id:null, callsign:'HALO', level:2, role:'operator', node:'f3x-pri-01', joined_cycle:18, bio:null, created_at:'' } },
]

interface ProfileClientProps {
  operator: Operator | null
  entries: Entry[]
  profileSignals: ProfileSignal[]
  currentOperator: Operator | null
}

export function ProfileClient({ operator, entries, profileSignals, currentOperator }: ProfileClientProps) {
  const [activeTab, setActiveTab] = useState('BIO')
  const [psError, setPsError] = useState<string | null>(null)
  const [psPending, setPsPending] = useState(false)
  const op = operator ?? SEED_OP
  const sigs = profileSignals.length > 0 ? profileSignals : SEED_SIGNALS
  const roleLabel = op.role === 'superadmin' ? 'SUPERADMIN' : op.role === 'admin' ? 'ADMIN' : 'OPERÁTOR'

  async function handleProfileSignal(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    setPsPending(true)
    setPsError(null)
    const res = await createProfileSignal(new FormData(ev.currentTarget))
    if (res?.error) { setPsError(res.error); setPsPending(false) }
    else { (ev.currentTarget as HTMLFormElement).reset(); setPsPending(false) }
  }

  return (
    <div className="shell">
      {/* Header */}
      <div style={{ display:'grid', gridTemplateColumns:'220px 1fr 320px', gap:28, padding:'36px 0 28px', borderBottom:'1px solid var(--border-1)', alignItems:'start' }}>
        <div>
          <div style={{ width:200, height:200, background:'var(--bg-2)', border:'1px solid var(--accent)', position:'relative', boxShadow:'var(--accent-glow)' }}>
            <Avatar id={op.callsign} size={200}/>
            {[['top-0 left-0','border-top border-left'],['top-0 right-0','border-top border-right'],['bottom-0 left-0','border-bottom border-left'],['bottom-0 right-0','border-bottom border-right']].map(([pos], i) => {
              const styles: React.CSSProperties[] = [
                { position:'absolute', top:-1, left:-1, borderTop:'1px solid var(--accent)', borderLeft:'1px solid var(--accent)', width:12, height:12 },
                { position:'absolute', top:-1, right:-1, borderTop:'1px solid var(--accent)', borderRight:'1px solid var(--accent)', width:12, height:12 },
                { position:'absolute', bottom:-1, left:-1, borderBottom:'1px solid var(--accent)', borderLeft:'1px solid var(--accent)', width:12, height:12 },
                { position:'absolute', bottom:-1, right:-1, borderBottom:'1px solid var(--accent)', borderRight:'1px solid var(--accent)', width:12, height:12 },
              ]
              return <div key={i} style={styles[i]}/>
            })}
          </div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop:10, width:200, justifyContent:'center' }}>◢ AVATAR CSERE</button>
        </div>

        <div>
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            <Chip kind="solid" dot>{op.id}</Chip>
            <Chip kind="accent">{roleLabel} · LVL-0{op.level}</Chip>
            <Chip kind="cyan">ONLINE</Chip>
            <Chip kind="dash">CSATL. CIKLUS {op.joined_cycle}</Chip>
          </div>
          <h1 className="display" style={{ margin:0, fontSize:72, lineHeight:.95, letterSpacing:'-.02em' }}>
            {op.callsign}
          </h1>
          <p style={{ maxWidth:620, color:'var(--ink-1)', fontSize:14, lineHeight:1.6, marginTop:14 }}>
            {op.bio ?? 'Nincs biografikus rekord.'}
          </p>
          <div style={{ display:'flex', gap:8, marginTop:18 }}>
            <button className="btn btn-primary">◢ JELZÉST HAGY</button>
            <button className="btn">PROFIL SZERKESZTÉSE</button>
            <button className="btn btn-ghost">◢ KÖVETÉS</button>
          </div>
        </div>

        <Panel tag="◢ STATISZTIKA" title="OPERÁTOR METRIKÁK" className="panel-raised">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[['BEJEGYZÉS',entries.length||84],['JELZÉS','412'],['LÁNC','17'],['OLVASÓ','3.2K'],['ALÁÍRÁS','91'],['CIKLUS',op.joined_cycle||35]].map(([k,v])=>(
              <div key={String(k)} className="panel" style={{ padding:'8px 10px', background:'transparent' }}>
                <div className="sys muted">{k}</div>
                <div className="head" style={{ fontSize:22, color:'var(--accent)' }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ borderTop:'1px solid var(--border-1)', marginTop:12, paddingTop:12 }}>
            <div className="sys muted" style={{ marginBottom:6 }}>◢ AKTIVITÁS · 30 CIKLUS</div>
            <LiveTicks count={30} height={32}/>
          </div>
        </Panel>
      </div>

      {/* Main */}
      <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:28, padding:'28px 0' }}>
        <aside style={{ display:'flex', flexDirection:'column', gap:18 }}>
          <Panel tag="◢ AZONOSÍTÓ" title="IDENTITÁS">
            <Meta k="ID"     v={op.id}/>
            <Meta k="NÉV"    v={op.callsign}/>
            <Meta k="SZINT"  v={`LVL-0${op.level} · ${roleLabel}`}/>
            <Meta k="CSATL." v={`CIKLUS ${op.joined_cycle}`}/>
            <Meta k="HASH"   v="9f·0a·72·c4"/>
            <Meta k="NÓD"    v={op.node}/>
          </Panel>
          <Panel tag="◢ JELZÉSMINTA" title="ALÁÍRÁSOK">
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {['//PROTOKOLL','//ŰR','//MEMÓRIA','//RÁCS','//OPS','//HIDEG-SZEKT','//04-B'].map(s=>(
                <Chip key={s} kind="cyan">{s}</Chip>
              ))}
            </div>
            <div style={{ borderTop:'1px solid var(--border-1)', marginTop:12, paddingTop:12 }}>
              <div className="sys muted" style={{ marginBottom:6 }}>◢ BIZALMI SZINT</div>
              <div className="bar-track"><div className="bar-fill" style={{ width:'92%' }}/></div>
              <div className="sys muted" style={{ marginTop:4 }}>92% · 47 aláírásból</div>
            </div>
          </Panel>
        </aside>

        <div>
          <div className="tabs">
            {['BIO / ÍRÁSOK','BEJEGYZÉSEK','JELZÉSEK','ARCHÍV'].map(t=>(
              <div key={t} className={`tab${activeTab===t?' active':''}`} onClick={()=>setActiveTab(t)}>{t}</div>
            ))}
            <div style={{flex:1, borderBottom:'1px solid var(--border-1)'}}/>
          </div>

          <div style={{ padding:'22px 0 28px', borderBottom:'1px solid var(--border-1)' }}>
            <div className="sys muted" style={{ marginBottom:10 }}>◢ BIOGRAFIKUS REKORD</div>
            <p style={{ color:'var(--ink-0)', fontSize:15, lineHeight:1.75, maxWidth:780, margin:0 }}>
              {op.bio ?? 'Nincs biografikus rekord.'}
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginTop:18, maxWidth:780 }}>
              {[['SZAKTERÜLET','RÁCS · MEMÓRIA'],['ELÉRHETŐSÉG',`f3xykee://op/${op.id}`],['ZÓNA','UTC+1 · BUD']].map(([k,v])=>(
                <div key={k} className="panel" style={{ padding:'10px 12px' }}>
                  <div className="sys muted">{k}</div>
                  <div className="mono" style={{ fontSize:13, color:'var(--accent)' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Profile signals */}
          <div style={{ padding:'22px 0 56px' }}>
            <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:14 }}>
              <Heading tag="PROFIL ÍRÁSOK" title="◢ HAGYJ JELZÉST"
                sub="Más operátorok strukturált üzenetei erre a profilra. Minden bejegyzés aláírt."/>
              <Chip kind="accent">{sigs.length} ÜZENET</Chip>
            </div>

            {/* Composer */}
            {currentOperator ? (
              <form onSubmit={handleProfileSignal} style={{ marginBottom:14 }}>
                <input type="hidden" name="target_id" value={op.id}/>
                <div className="panel" style={{ padding:14, display:'flex', gap:12 }}>
                  <Avatar id={currentOperator.callsign} size={40}/>
                  <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10 }}>
                    <textarea name="text" className="input" rows={2} placeholder={`// Üzenet ${op.id} · ${op.callsign} profilra · aláírt rekordként menti`}/>
                    {psError && (
                      <div style={{ padding:'6px 10px', background:'rgba(255,58,58,.1)', border:'1px solid var(--red)', color:'var(--red)', fontFamily:'var(--f-sys)', fontSize:11 }}>◢ {psError}</div>
                    )}
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <Chip kind="dash">MINT {currentOperator.id} · {currentOperator.callsign}</Chip>
                      <Chip kind="cyan">//PROFIL</Chip>
                      <span style={{flex:1}}/>
                      <button type="submit" className="btn btn-primary btn-sm" disabled={psPending}>
                        {psPending ? '◢ KÜLDÉS...' : '◢ ALÁÍR + KÜLD'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              <div className="panel" style={{ padding:14, marginBottom:14, textAlign:'center', color:'var(--ink-3)', fontFamily:'var(--f-sys)', fontSize:12 }}>
                <Link href="/gate" style={{ color:'var(--accent)' }}>◢ BELÉPÉS</Link> · üzenet küldéséhez
              </div>
            )}

            {/* Signal list */}
            <div>
              {sigs.map((s,i)=>(
                <div key={s.id} className="panel" style={{ padding:14, marginBottom:10, display:'grid', gridTemplateColumns:'40px 1fr', gap:12 }}>
                  <Avatar id={s.author?.callsign ?? s.author_id} size={40}/>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                      <span className="head" style={{ fontSize:15 }}>{s.author?.callsign ?? '—'}</span>
                      <span className="sys muted">{s.author_id}</span>
                      <span style={{flex:1}}/>
                      {s.verified && <Chip kind="accent" dot>VERIFIED</Chip>}
                      <span className="sys muted">{s.created_at}</span>
                    </div>
                    <div style={{ color:'var(--ink-0)', fontSize:14, lineHeight:1.6 }}>{s.text}</div>
                    <div style={{ display:'flex', gap:12, marginTop:8, paddingTop:8, borderTop:'1px dashed var(--border-1)' }}>
                      <span className="sys muted">▸ VÁLASZ</span>
                      <span className="sys muted">◢ ALÁÍR</span>
                      <span style={{flex:1}}/>
                      <span className="sys dim">SIG-{s.id.slice(-4).toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
