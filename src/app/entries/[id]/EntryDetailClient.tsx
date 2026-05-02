'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Chip } from '@/components/ui/Chip'
import { Panel } from '@/components/ui/Panel'
import { Meta } from '@/components/ui/Meta'
import { Avatar } from '@/components/ui/Avatar'
import { NodeMap } from '@/components/ui/NodeMap'
import { YouTubePlayer } from '@/components/ui/YouTubePlayer'
import { AudioPlayer } from '@/components/ui/AudioPlayer'
import { createSignal, toggleReaction } from '@/app/actions'
import type { Entry, Operator, Signal } from '@/lib/types'

const EMOJIS = ['👍','🔥','💀','😂']


function sanitizeHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?>/gi, '')
    .replace(/<object[\s\S]*?>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/<base[\s\S]*?>/gi, '')
    .replace(/\s(on\w+)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src|action)\s*=\s*["']?\s*(javascript:|vbscript:|data:text\/html)[^"'\s>]*/gi, '$1="#"')
}

function RenderContent({ content }: { content: string }) {
  if (!content) return null
  if (/<[a-z]/i.test(content)) {
    return <div style={{ fontSize:15, lineHeight:1.75, color:'var(--ink-0)' }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}/>
  }
  return (
    <div style={{ fontSize:15, lineHeight:1.75, color:'var(--ink-0)' }}>
      {content.split('\n\n').map((p,i)=><p key={i} style={{ marginBottom:16 }}>{p}</p>)}
    </div>
  )
}

function SignalNode({ s, isLast }: { s: Signal; isLast: boolean }) {
  const time = s.created_at.startsWith('+') ? s.created_at : new Date(s.created_at).toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit'})
  return (
    <div style={{ display:'grid', gridTemplateColumns:'32px 1fr' }}>
      <div style={{ position:'relative' }}>
        <div style={{ position:'absolute', left:15, top:0, bottom:isLast?'50%':0, width:1, background:'var(--border-1)' }}/>
        <div style={{ position:'absolute', left:15, top:'50%', width:16, height:1, background:'var(--border-1)' }}/>
      </div>
      <div style={{ padding:'10px 0 10px 6px' }}>
        <div className="panel" style={{ padding:'12px 14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <Avatar id={s.operator?.callsign ?? s.operator_id} size={28}/>
            <div style={{flex:1}}>
              <div className="head" style={{ fontSize:14 }}>{s.operator?.callsign ?? s.operator_id}</div>
              <div className="sys muted">{s.operator_id} · {time}</div>
            </div>
            {s.verified && <Chip kind="accent" dot>VERIFIED</Chip>}
          </div>
          <div style={{ color:'var(--ink-1)', fontSize:13, lineHeight:1.55 }}>{s.text}</div>
          <div style={{ display:'flex', gap:14, marginTop:10, paddingTop:8, borderTop:'1px dashed var(--border-1)' }}>
            <span className="sys muted">▸ VÁLASZ</span>
            <span className="sys muted">⟡ JELZÉS</span>
            <span style={{flex:1}}/>
            <span className="sys dim">SIG-{s.id.slice(0,4).toUpperCase()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

interface EntryDetailClientProps {
  entry: Entry | null
  signals: Signal[]
  entryId: string
  currentOperator: Operator | null
  initialReactions?: Record<string, number>
  initialUserReactions?: string[]
}

export function EntryDetailClient({ entry, signals, entryId, currentOperator, initialReactions = {}, initialUserReactions = [] }: EntryDetailClientProps) {
  const [sigError, setSigError]   = useState<string|null>(null)
  const [sigPending, setSigPending] = useState(false)
  const [sigDone, setSigDone]     = useState(false)
  const [reactions, setReactions] = useState<Record<string,number>>(initialReactions)
  const [userRx, setUserRx]       = useState<string[]>(initialUserReactions)
  const [rxPending, setRxPending] = useState<string|null>(null)

  if (!entry) return (
    <div className="shell" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <div style={{ textAlign:'center' }}>
        <div className="sys muted" style={{ fontSize:12, letterSpacing:'.2em', marginBottom:12 }}>◢ BEJEGYZÉS NEM TALÁLHATÓ</div>
        <Link href="/" className="btn">◢ VISSZAFŐOLDALRA</Link>
      </div>
    </div>
  )

  const e    = entry
  const sigs = signals

  async function handleSignal(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    setSigPending(true); setSigError(null)
    const res = await createSignal(new FormData(ev.currentTarget))
    if (res?.error) { setSigError(res.error); setSigPending(false) }
    else { ;(ev.currentTarget as HTMLFormElement).reset(); setSigPending(false); setSigDone(true); setTimeout(()=>setSigDone(false),2000) }
  }

  async function handleReact(emoji: string) {
    if (!currentOperator || rxPending) return
    setRxPending(emoji)
    const res = await toggleReaction(e.id, emoji)
    if (res?.reactions) setReactions(res.reactions)
    if (res?.userReactions) setUserRx(res.userReactions)
    setRxPending(null)
  }

  const prevId = 'LOG-' + String(parseInt(e.id.split('-')[1] ?? '2481') - 1)
  const nextId = 'LOG-' + String(parseInt(e.id.split('-')[1] ?? '2481') + 1)

  return (
    <div className="shell">
      {/* Breadcrumb */}
      <div style={{ display:'flex', gap:10, padding:'12px 0', borderBottom:'1px solid var(--border-1)' }}>
        <Link href="/" className="sys muted">◢ FŐOLDAL</Link><span className="sys dim">/</span>
        <Link href="/entries" className="sys muted">BEJEGYZÉSEK</Link><span className="sys dim">/</span>
        <span className="sys" style={{ color:'var(--accent)' }}>{e.id}</span>
        <span style={{flex:1}}/>
        <Link href={`/entries/${prevId}`} className="sys muted">⟵ {prevId}</Link>
        <Link href={`/entries/${nextId}`} className="sys muted">{nextId} ⟶</Link>
      </div>

      {/* Header */}
      <div className="r-detail-header">
        <div>
          <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
            <Chip kind="solid" dot>{e.id}</Chip>
            <Chip kind="accent">{e.kind}</Chip>
            {e.sigs.map(s=><Chip key={s} kind="dash">{s}</Chip>)}
            {e.priority && <Chip kind="mag">PRIORITÁSOS</Chip>}
            {e.media_type === 'youtube' && <Chip kind="dash">▶ YOUTUBE</Chip>}
            {e.media_type === 'image'   && <Chip kind="dash">⊡ KÉP</Chip>}
            {e.media_type === 'audio'   && <Chip kind="dash">♪ HANG</Chip>}
          </div>
          <h1 className="display" style={{ margin:0, fontSize:56, lineHeight:.95, letterSpacing:'-.02em' }}>
            {e.title}
          </h1>
          {e.excerpt && (
            <p style={{ maxWidth:600, color:'var(--ink-1)', fontSize:14, lineHeight:1.6, marginTop:18 }}>
              <span className="sys muted">◢ ABSZTRAKT · </span>{e.excerpt}
            </p>
          )}
        </div>
        <Panel tag="◢ REKORD" title="RENDSZER TANÚSÍTVÁNY" className="panel-raised">
          <Meta k="ID"       v={e.id}/>
          <Meta k="CIKLUS"   v={`${e.cycle} / 2026·04·21`}/>
          <Meta k="OPERÁTOR" v={`${e.operator_id} · ${e.operator?.callsign ?? '—'}`}/>
          <Meta k="TÍPUS"    v={e.kind}/>
          {e.media_type && <Meta k="MÉDIA" v={e.media_type.toUpperCase()}/>}
          <Meta k="HASH"     v="9f·0a·72·c4·e1·ff"/>
          <Meta k="ÁLLAPOT"  v="ÉLŐ · NYITOTT"/>
          <div style={{ borderTop:'1px solid var(--border-1)', marginTop:10, paddingTop:10, display:'flex', gap:10 }}>
            <span className="sys muted">◢ {e.reads} OLVASÓ</span>
            <span className="sys muted">▸ {sigs.length} JELZÉS</span>
          </div>
        </Panel>
      </div>

      {/* Body */}
      <div className="r-detail">
        <article style={{ display:'flex', flexDirection:'column', gap:20 }}>

          {/* Media */}
          {e.media_type === 'youtube' && e.media_url && (
            <div>
              <div className="sys muted" style={{ fontSize:10, marginBottom:6 }}>◢ YOUTUBE · BEÁGYAZOTT VIDEÓ</div>
              <YouTubePlayer url={e.media_url}/>
              {e.media_label && <div className="sys muted" style={{ fontSize:11, marginTop:6 }}>◢ {e.media_label}</div>}
            </div>
          )}

          {e.media_type === 'image' && e.media_url && (
            <div>
              {e.media_label && <div className="sys muted" style={{ fontSize:10, marginBottom:6 }}>◢ KÉP · {e.media_label}</div>}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={e.media_url} alt={e.media_label ?? ''} style={{ width:'100%', maxHeight:520, objectFit:'contain', background:'var(--bg-2)', border:'1px solid var(--border-1)' }}/>
            </div>
          )}

          {e.media_type === 'audio' && e.media_url && (
            <AudioPlayer url={e.media_url} label={e.media_label}/>
          )}

          {/* Text content */}
          {e.content && (
            <div style={{ display:'grid', gridTemplateColumns:'56px 1fr', gap:18 }}>
              <span className="sys muted">§ 01</span>
              <RenderContent content={e.content}/>
            </div>
          )}

          {/* Figure (if no media) */}
          {!e.media_type && (
            <div style={{ display:'grid', gridTemplateColumns:'56px 1fr', gap:18 }}>
              <span className="sys muted">FIG 01</span>
              <div>
                <div className="fig-ph" style={{ height:280 }}>
                  <svg viewBox="0 0 400 280" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
                    {Array.from({length:40}).map((_,j)=>{
                      const x=20+(j*43%360); const y=20+(j*29%240); const hi=j%9===0
                      return <g key={j}>
                        <circle cx={x} cy={y} r={hi?4:1.8} fill={hi?'var(--accent)':'var(--ink-3)'} style={hi?{filter:'drop-shadow(0 0 4px var(--accent))'}:undefined}/>
                        {hi && <circle cx={x} cy={y} r="10" fill="none" stroke="var(--accent)" strokeWidth="0.6" opacity="0.5"/>}
                      </g>
                    })}
                    {Array.from({length:30}).map((_,j)=>{
                      const x1=20+(j*43%360),y1=20+(j*29%240),x2=20+((j+3)*43%360),y2=20+((j+3)*29%240)
                      return <line key={j} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--border-1)" strokeWidth="0.5"/>
                    })}
                  </svg>
                  <span className="fig-label">RELÉ BOMLÁSI TÉRKÉP · 046→047</span>
                </div>
              </div>
            </div>
          )}

          {/* Reactions */}
          <div style={{ borderTop:'1px solid var(--border-1)', paddingTop:16 }}>
            <div className="sys muted" style={{ fontSize:10, marginBottom:10 }}>◢ REAKCIÓK</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {EMOJIS.map(emoji => {
                const count = reactions[emoji] ?? 0
                const active = userRx.includes(emoji)
                return (
                  <button key={emoji} onClick={()=>handleReact(emoji)}
                    disabled={rxPending !== null || !currentOperator}
                    style={{
                      display:'flex', alignItems:'center', gap:6, padding:'6px 14px',
                      border:`1px solid ${active?'var(--accent)':'var(--border-1)'}`,
                      background: active?'var(--accent-soft)':'transparent',
                      color: active?'var(--accent)':'var(--ink-1)',
                      cursor: currentOperator?'pointer':'default',
                      fontFamily:'var(--f-sys)', fontSize:13,
                      opacity: rxPending === emoji ? 0.5 : 1,
                      transition:'all .15s',
                    }}
                  >
                    <span style={{ fontSize:18 }}>{emoji}</span>
                    <span>{count}</span>
                  </button>
                )
              })}
              {!currentOperator && (
                <span className="sys dim" style={{ fontSize:10, alignSelf:'center', marginLeft:4 }}>◢ BELÉPÉS SZÜKSÉGES</span>
              )}
            </div>
          </div>

          {/* Signature */}
          <div style={{ borderTop:'1px solid var(--border-1)', paddingTop:18, display:'grid', gridTemplateColumns:'1fr 220px', gap:14, alignItems:'end' }}>
            <div style={{ display:'flex', gap:14, alignItems:'center' }}>
              <Avatar id={e.operator?.callsign ?? 'F3X-014'} size={52}/>
              <div>
                <div className="sys muted">◢ ALÁÍRTA</div>
                <div className="head" style={{ fontSize:18 }}>{e.operator_id} · {e.operator?.callsign ?? '—'}</div>
                <div className="sys muted">CIKLUS {e.cycle} · UPLINK f3x-pri-01</div>
              </div>
            </div>
            <div className="panel" style={{ padding:'10px 12px', fontFamily:'var(--f-mono)', fontSize:10, color:'var(--cyan)' }}>
              SIG: 9f·0a·72·c4<br/>e1·ff·31·77<br/><span style={{color:'var(--accent)'}}>◉ VERIFIED</span>
            </div>
          </div>
        </article>

        {/* Aside */}
        <aside className="detail-aside" style={{ display:'flex', flexDirection:'column', gap:18 }}>
          <Panel tag="◢ LÁNC TÉRKÉP" title="THR-0419">
            <div style={{ height:180, background:'var(--bg-2)', border:'1px solid var(--border-0)' }}>
              <NodeMap count={12} highlight={5} seed={7}/>
            </div>
            <div className="sys muted" style={{ marginTop:8 }}>8 CSOMÓPONT · CIKLUS 043→047</div>
          </Panel>
          <Panel tag="◢ HIVATKOZÁS">
            <div className="mono" style={{ fontSize:11, background:'var(--bg-2)', padding:'10px 12px', border:'1px solid var(--border-0)', color:'var(--cyan)' }}>
              f3xykee://entry/{e.id}#cycle.{e.cycle}
            </div>
            <div style={{ display:'flex', gap:6, marginTop:10 }}>
              <Chip>◢ MÁSOL</Chip>
              <Chip kind="dash">◢ ARCHÍV</Chip>
            </div>
          </Panel>
        </aside>
      </div>

      {/* Signal composer */}
      <div style={{ padding:'28px 0', borderBottom:'1px solid var(--border-1)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
          <Chip kind="accent" dot>◢ JELZÉS HOZZÁFŰZÉSE</Chip>
          {currentOperator
            ? <Chip kind="dash">MINT {currentOperator.id} · {currentOperator.callsign}</Chip>
            : <Chip kind="dash">BEJELENTKEZÉS SZÜKSÉGES</Chip>}
          <span style={{flex:1}}/>
          <span className="sys muted">CIKLUS 047 · VÁZLAT</span>
        </div>
        {currentOperator ? (
          <form onSubmit={handleSignal}>
            <input type="hidden" name="entry_id" value={e.id}/>
            <div className="panel" style={{ padding:14, display:'flex', flexDirection:'column', gap:10 }}>
              <textarea name="text" className="input" rows={3} placeholder="// Gépeld be a jelzést · //TAG formát aláírásra"/>
              {sigError && <div style={{ padding:'8px 12px', background:'rgba(255,58,58,.1)', border:'1px solid var(--red)', color:'var(--red)', fontFamily:'var(--f-sys)', fontSize:11 }}>◢ {sigError}</div>}
              {sigDone  && <div style={{ padding:'8px 12px', background:'rgba(24,233,104,.1)', border:'1px solid var(--accent)', color:'var(--accent)', fontFamily:'var(--f-sys)', fontSize:11 }}>◢ JELZÉS ELKÜLDVE · TRANSMIT SIKERES</div>}
              <div style={{ display:'flex', gap:8, alignItems:'center', paddingTop:8, borderTop:'1px dashed var(--border-1)' }}>
                <span style={{flex:1}}/>
                <button type="submit" className="btn btn-primary" disabled={sigPending}>
                  {sigPending ? '◢ KÜLDÉS...' : '◢ TRANSMIT'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="panel" style={{ padding:14, textAlign:'center', color:'var(--ink-3)', fontFamily:'var(--f-sys)', fontSize:12 }}>
            <Link href="/gate" style={{ color:'var(--accent)' }}>◢ BELÉPÉS</Link> · jelzés küldéséhez
          </div>
        )}
      </div>

      {/* Thread */}
      <div style={{ padding:'28px 0 56px' }}>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:18 }}>
          <div>
            <div className="sys muted" style={{marginBottom:6}}>◢ JELZÉSLÁNC · THR-0419</div>
            <h2 className="display" style={{ margin:0, fontSize:28 }}>HOZZÁFŰZÖTT JELZÉSEK · {sigs.length}</h2>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <Chip kind="accent">LEGÚJABB</Chip>
            <Chip>IDŐREND</Chip>
          </div>
        </div>
        <div>
          {sigs.map((s,i)=>(<SignalNode key={s.id} s={s} isLast={i===sigs.length-1}/>))}
        </div>
      </div>
    </div>
  )
}
