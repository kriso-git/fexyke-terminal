'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Chip } from '@/components/ui/Chip'
import { Panel } from '@/components/ui/Panel'
import { Meta } from '@/components/ui/Meta'
import { Heading } from '@/components/ui/Heading'
import { Avatar } from '@/components/ui/Avatar'
import { LiveTicks } from '@/components/ui/LiveTicks'
import { NodeMap } from '@/components/ui/NodeMap'
import { YouTubeThumbnail, extractYouTubeId } from '@/components/ui/YouTubePlayer'
import { createEntry, toggleReaction } from '@/app/actions'
import type { Entry, Operator, Thread } from '@/lib/types'

/* ─── Seed data ─── */
const SEED_ENTRIES: Entry[] = [
  { id:'LOG-2481', kind:'ÁTVITEL', sigs:['//PROTOKOLL','//ŰR'], operator_id:'F3X-014', content:'', operator:{ id:'', auth_id:null, callsign:'NULLSET', level:3, role:'admin', node:'f3x-pri-01', joined_cycle:12, bio:null, created_at:'' }, title:'Átvitel 04 · protokoll-sodródás a hideg szektorokban', excerpt:'Bomlási minta észlelve a külső rácsban 11 relé csomóponton keresztül. Aláírás-eltérés rögzítve. Operátori beavatkozás javasolt a 048-as ciklus lezárása előtt.', cycle:47, reads:142, priority:true, alert:false, created_at:'2026-04-21T00:14:00Z' },
  { id:'LOG-2480', kind:'RIASZTÁS', sigs:['//MEZŐ','//RELÉ'], operator_id:'F3X-022', content:'', operator:{ id:'', auth_id:null, callsign:'HALO', level:2, role:'operator', node:'f3x-pri-01', joined_cycle:18, bio:null, created_at:'' }, title:'Relé-14 offline · mezőnapló', excerpt:'A hideg szektorban lévő 14-es relé csomópont kilépett a hálózatból 00:02:14-kor. Automatikus visszacsatolási kísérlet kudarcot vallott.', cycle:47, reads:64, priority:false, alert:true, created_at:'2026-04-21T00:02:00Z' },
  { id:'LOG-2479', kind:'MEMÓRIADIFF', sigs:['//MEMÓRIA'], operator_id:'F3X-014', content:'', operator:{ id:'', auth_id:null, callsign:'NULLSET', level:3, role:'admin', node:'f3x-pri-01', joined_cycle:12, bio:null, created_at:'' }, title:'Memóriadiff · 046 → 047 ciklus', excerpt:'Rekord-delta: +12 bejegyzés, +4 jelzéslánc, +1 operátor. Három ütközés fel lett oldva.', cycle:47, reads:38, priority:false, alert:false, created_at:'2026-04-21T00:00:00Z' },
  { id:'LOG-2478', kind:'ADÁS', sigs:['//OPS'], operator_id:'F3X-001', content:'', operator:{ id:'', auth_id:null, callsign:'KURIER', level:4, role:'superadmin', node:'f3x-pri-01', joined_cycle:1, bio:null, created_at:'' }, title:'Kimenő küldemény · Nullset tanácsadás', excerpt:'Kézbesítve F3X-014 részére. Tartalom: relé-ellenőrzési protokoll újracsomagolva.', cycle:46, reads:27, priority:false, alert:false, created_at:'2026-04-20T23:47:00Z' },
]

const SEED_OPERATORS: Operator[] = [
  { id:'1', auth_id:null, callsign:'KURIER',   level:4, role:'superadmin', node:'f3x-pri-01', joined_cycle:1,  bio:null, created_at:'' },
  { id:'2', auth_id:null, callsign:'NULLSET',  level:3, role:'admin',      node:'f3x-pri-01', joined_cycle:12, bio:null, created_at:'' },
  { id:'3', auth_id:null, callsign:'HALO',     level:2, role:'operator',   node:'f3x-pri-01', joined_cycle:18, bio:null, created_at:'' },
  { id:'4', auth_id:null, callsign:'MOTH',     level:2, role:'operator',   node:'f3x-pri-01', joined_cycle:21, bio:null, created_at:'' },
  { id:'5', auth_id:null, callsign:'PARALLAX', level:2, role:'operator',   node:'f3x-pri-01', joined_cycle:28, bio:null, created_at:'' },
  { id:'6', auth_id:null, callsign:'VOID',     level:1, role:'operator',   node:'f3x-mir-01', joined_cycle:30, bio:null, created_at:'' },
  { id:'7', auth_id:null, callsign:'CIPHER',   level:2, role:'operator',   node:'f3x-pri-01', joined_cycle:32, bio:null, created_at:'' },
  { id:'8', auth_id:null, callsign:'RELAY',    level:1, role:'operator',   node:'f3x-mir-02', joined_cycle:34, bio:null, created_at:'' },
]

const SEED_THREADS: Thread[] = [
  { id:'THR-0419', title:'Űr-protokoll töredékek',  created_at:'' },
  { id:'THR-0418', title:'Leszerelt relé naplók',   created_at:'' },
  { id:'THR-0417', title:'Parallax mezőnapló',       created_at:'' },
  { id:'THR-0416', title:'Memóriadiffek · 04',       created_at:'' },
]

const ALLOWED_UPLOAD = new Set([
  'image/gif','image/jpeg','image/png','image/webp',
  'audio/mpeg','audio/mp3','audio/ogg','audio/wav','audio/flac',
])

const EMOJIS = ['👍','🔥','💀','😂']

function applyFormat(tag: string, textarea: HTMLTextAreaElement, value: string, setValue: (v: string) => void) {
  const start = textarea.selectionStart
  const end   = textarea.selectionEnd
  if (start === end) return
  const selected = value.slice(start, end)
  const newVal = value.slice(0, start) + `<${tag}>${selected}</${tag}>` + value.slice(end)
  setValue(newVal)
  requestAnimationFrame(() => {
    textarea.focus()
    const cursor = end + tag.length * 2 + 5
    textarea.setSelectionRange(cursor, cursor)
  })
}

function uploadWithProgress(file: File, onProgress: (pct: number) => void): Promise<{url: string; name: string; type: string}> {
  return new Promise((resolve, reject) => {
    const fd = new FormData()
    fd.append('file', file)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/upload')
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100)) }
    xhr.onload = () => {
      const data = JSON.parse(xhr.responseText)
      if (xhr.status >= 200 && xhr.status < 300) resolve(data)
      else reject(new Error(data.error ?? `HTTP ${xhr.status}`))
    }
    xhr.onerror = () => reject(new Error('Feltöltési hiba'))
    xhr.send(fd)
  })
}

/* ─── Hero ─── */
function Hero() {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:24, padding:'40px 0 32px', borderBottom:'1px solid var(--border-1)' }}>
      <div>
        <div style={{ display:'flex', gap:8, marginBottom:18 }}>
          <Chip kind="accent" dot>◢ ADÁSBAN</Chip>
          <Chip>CIKLUS 047</Chip>
          <Chip kind="cyan">UPLINK · STABIL</Chip>
          <Chip kind="dash">V0.1.0</Chip>
        </div>
        <h1 className="display" style={{ margin:0, fontSize:84, lineHeight:.92, letterSpacing:'-.02em', color:'var(--ink-0)' }}>
          F3XYKEE /<br/>
          <span style={{ color:'var(--accent)', textShadow:'0 0 12px rgba(24,233,104,.35)' }}>ADATHÁLÓZATI</span><br/>
          TERMINÁL
        </h1>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, marginTop:28, maxWidth:780 }}>
          <div className="muted" style={{ fontSize:13, lineHeight:1.55 }}>
            Elosztott írás-olvasás interfész bejegyzésekhez, operátorokhoz és jelzésláncokhoz.
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ display:'flex', gap:8 }}>
              <Link href="/gate" className="btn btn-primary">◢ BELÉPÉS A TERMINÁLBA</Link>
              <Link href="/entries" className="btn">⌕ INDEX</Link>
            </div>
            <div className="sys muted">◣ VAGY OLVASÓI MÓDBAN TOVÁBB ↓</div>
          </div>
        </div>
      </div>
      <Panel tag="◢ RENDSZER" title="ÁLLAPOT · PRI-01" className="panel-raised">
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border-1)' }}>
            <span className="dot"/>
            <div>
              <div className="head" style={{ fontSize:18 }}>ÉLŐ · ONLINE</div>
              <div className="sys muted">INTEGRITÁS 0.98 · UTOLSÓ SYNC 00:00:42</div>
            </div>
          </div>
          <Meta k="NODE"       v="f3x-pri-01 (aktív)"/>
          <Meta k="OPERÁTOROK" v="142 regisztrált · 17 online"/>
          <Meta k="BEJEGYZÉSEK" v="2 481 élő · +12 / 24h"/>
          <Meta k="JELZÉSLÁNC" v="38 aktív · 4 archivált"/>
          <div style={{ borderTop:'1px solid var(--border-1)', paddingTop:10, marginTop:4 }}>
            <div className="sys muted" style={{ marginBottom:6 }}>◢ UPLINK · 24H INTEGRITÁS</div>
            <div style={{ height:32 }}><LiveTicks count={28} height={32}/></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginTop:4 }}>
            {[['PING','18ms'],['THRPUT','128kB/s'],['LOSS','0.01%']].map(([k,v])=>(
              <div key={k} className="panel" style={{ padding:'6px 8px', background:'transparent' }}>
                <div className="sys muted" style={{ fontSize:9 }}>{k}</div>
                <div className="mono" style={{ fontSize:13, color:'var(--accent)' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  )
}

/* ─── Post panel (admin only) ─── */
function PostPanel({ op }: { op: Operator | null }) {
  const [open, setOpen]           = useState(true)
  const [kind, setKind]           = useState('ÁTVITEL')
  const [mediaTab, setMediaTab]   = useState<'text'|'youtube'|'image'|'audio'>('text')
  const [content, setContent]     = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [uploadedFile, setUploadedFile] = useState<{url:string;name:string;type:string}|null>(null)
  const [mediaLabel, setMediaLabel] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [dragOver, setDragOver]   = useState(false)
  const [error, setError]         = useState<string|null>(null)
  const [pending, setPending]     = useState(false)
  const [done, setDone]           = useState(false)
  const contentRef  = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const KINDS = ['ÁTVITEL','RIASZTÁS','MEZŐNAPLÓ','MEMÓRIADIFF','ADÁS']

  if (!op || (op.role !== 'admin' && op.role !== 'superadmin')) return null

  const handleFile = useCallback(async (file: File | null | undefined) => {
    if (!file) return
    if (!ALLOWED_UPLOAD.has(file.type)) { setError('Csak kép (gif/jpg/png/webp) és hang (mp3/wav/ogg) engedélyezett.'); return }
    if (file.size > 100 * 1024 * 1024) { setError('A fájl túl nagy (max 100 MB).'); return }
    setUploading(true); setUploadPct(0); setError(null)
    try {
      const result = await uploadWithProgress(file, setUploadPct)
      setUploadedFile(result)
      setMediaTab(file.type.startsWith('audio/') ? 'audio' : 'image')
      if (!mediaLabel) setMediaLabel(file.name.replace(/\.[^.]+$/, '').toUpperCase())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Feltöltési hiba')
    } finally { setUploading(false) }
  }, [mediaLabel])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true); setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('kind', kind)
    fd.set('content', content)
    fd.set('media_type', mediaTab === 'text' ? '' : mediaTab)
    fd.set('media_url', mediaTab === 'youtube' ? youtubeUrl : (uploadedFile?.url ?? ''))
    fd.set('media_label', mediaLabel)
    const res = await createEntry(fd)
    if (res?.error) { setError(res.error); setPending(false) }
    else {
      setDone(true)
      ;(e.currentTarget as HTMLFormElement).reset()
      setContent(''); setYoutubeUrl(''); setUploadedFile(null); setMediaLabel('')
      setTimeout(() => { setPending(false); setDone(false) }, 1800)
    }
  }

  const ytId = extractYouTubeId(youtubeUrl)
  const roleTag = op.role === 'superadmin' ? '◢ SUPERADMIN · INPUT MODUL' : '◢ ADMIN · INPUT MODUL'

  return (
    <Panel tag={roleTag} title="BEJEGYZÉS LÉTREHOZÁSA" className="panel-raised"
      chips={<>
        <Chip kind="accent" dot>JOGOSULTSÁG · LVL-03+</Chip>
        <button type="button" onClick={()=>setOpen(o=>!o)} className="btn btn-ghost btn-sm">{open?'◢ BEZÁR':'◢ NYIT'}</button>
      </>}
      style={{ marginBottom:28 }}
    >
      {open && (
        <form onSubmit={handleSubmit}>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

            {/* Kind + Media tabs */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {KINDS.map(k=>(
                <button key={k} type="button" onClick={()=>setKind(k)} className="chip" style={{
                  cursor:'pointer', borderColor:kind===k?'var(--accent)':'var(--border-1)',
                  color:kind===k?'var(--accent)':'var(--ink-2)', background:kind===k?'var(--accent-soft)':'transparent',
                }}>{k}</button>
              ))}
            </div>
            <div style={{ display:'flex', gap:6 }}>
              {([['text','◢ SZÖVEG'],['youtube','▶ YOUTUBE'],['image','⊡ KÉP'],['audio','♪ HANG']] as const).map(([t,label])=>(
                <button key={t} type="button" onClick={()=>{ setMediaTab(t); setUploadedFile(null); setError(null) }} className="chip" style={{
                  cursor:'pointer', fontSize:10,
                  borderColor:mediaTab===t?'var(--cyan)':'var(--border-1)',
                  color:mediaTab===t?'var(--cyan)':'var(--ink-3)',
                  background:mediaTab===t?'rgba(77,240,255,.06)':'transparent',
                }}>{label}</button>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 240px', gap:16 }}>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {/* Title */}
                <input name="title" className="input" placeholder="Bejegyzés címe..."
                  style={{ fontFamily:'var(--f-head)', fontSize:18, textTransform:'uppercase' }}/>

                {/* Body / rich text */}
                <div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                    <span className="sys muted" style={{ fontSize:10 }}>◢ TARTALOM {mediaTab!=='text'?'(opcionális)':''}</span>
                    <div style={{ display:'flex', gap:4 }}>
                      {([['b','B','Félkövér'],['i','I','Dőlt'],['u','U','Aláhúzott'],['s','S','Áthúzott']] as const).map(([tag,label,title])=>(
                        <button key={tag} type="button" title={title}
                          onMouseDown={e=>{ e.preventDefault(); if(contentRef.current) applyFormat(tag,contentRef.current,content,setContent) }}
                          style={{ width:22, height:22, border:'1px solid var(--border-1)', background:'var(--bg-2)', color:'var(--ink-1)', cursor:'pointer', fontSize:11,
                            fontWeight:tag==='b'?700:'normal', fontStyle:tag==='i'?'italic':'normal',
                            textDecoration:tag==='u'?'underline':tag==='s'?'line-through':'none',
                          }}>{label}</button>
                      ))}
                    </div>
                  </div>
                  <textarea ref={contentRef} className="input" rows={5}
                    value={content} onChange={e=>setContent(e.target.value)}
                    placeholder="// Tartalom · //TAG formát aláírásra..."
                    style={{ resize:'vertical', minHeight:100 }}/>
                </div>

                {/* YouTube URL */}
                {mediaTab === 'youtube' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <span className="sys muted" style={{ fontSize:10 }}>◢ YOUTUBE URL</span>
                    <input className="input" value={youtubeUrl} onChange={e=>setYoutubeUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=... vagy youtu.be/..."/>
                    {ytId && (
                      <YouTubeThumbnail url={youtubeUrl} height={100}/>
                    )}
                  </div>
                )}

                {/* File upload */}
                {(mediaTab === 'image' || mediaTab === 'audio') && (
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <div
                      onDrop={e=>{ e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
                      onDragOver={e=>{ e.preventDefault(); setDragOver(true) }}
                      onDragLeave={()=>setDragOver(false)}
                      onClick={()=>!uploading && fileInputRef.current?.click()}
                      style={{
                        border:`2px dashed ${dragOver?'var(--accent)':'var(--border-1)'}`,
                        padding:'20px 16px', textAlign:'center', cursor:'pointer',
                        background: dragOver?'var(--accent-soft)':'transparent',
                        transition:'border-color .15s, background .15s',
                      }}
                    >
                      {uploading ? (
                        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                          <div className="sys muted" style={{ fontSize:11 }}>◢ FELTÖLTÉS · {uploadPct}%</div>
                          <div className="bar-track"><div className="bar-fill" style={{ width:`${uploadPct}%`, transition:'width .2s' }}/></div>
                        </div>
                      ) : uploadedFile ? (
                        <div className="sys" style={{ color:'var(--accent)', fontSize:11 }}>
                          ✓ {uploadedFile.name} · klikk a cserére
                        </div>
                      ) : (
                        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                          <div className="sys muted">⬆ Húzd ide vagy klikkelj</div>
                          <div className="sys dim" style={{ fontSize:10 }}>
                            {mediaTab==='image' ? 'gif · jpg · png · webp — max 100 MB' : 'mp3 · wav · ogg · flac — max 100 MB'}
                          </div>
                        </div>
                      )}
                    </div>
                    <input ref={fileInputRef} type="file" style={{ display:'none' }}
                      accept={mediaTab==='image' ? 'image/gif,image/jpeg,image/png,image/webp' : 'audio/mpeg,audio/ogg,audio/wav,audio/flac'}
                      onChange={e=>handleFile(e.target.files?.[0])}/>
                    {uploadedFile && (
                      <input className="input" value={mediaLabel} onChange={e=>setMediaLabel(e.target.value)}
                        placeholder="Felirat / cím (opcionális)" style={{ fontSize:12 }}/>
                    )}
                  </div>
                )}

                {/* Sigs */}
                <div style={{ display:'flex', gap:6, alignItems:'center', paddingTop:8, borderTop:'1px dashed var(--border-1)', marginTop:4 }}>
                  <span className="sys muted" style={{ fontSize:10 }}>◢ ALÁÍRÁSOK ·</span>
                  <input name="sigs" className="input" placeholder="//PROTOKOLL, //ŰR" style={{ flex:1, fontSize:11 }}/>
                </div>

                {error && (
                  <div style={{ padding:'8px 12px', background:'rgba(255,58,58,.1)', border:'1px solid var(--red)', color:'var(--red)', fontFamily:'var(--f-sys)', fontSize:11 }}>◢ {error}</div>
                )}
                {done && (
                  <div style={{ padding:'8px 12px', background:'rgba(24,233,104,.1)', border:'1px solid var(--accent)', color:'var(--accent)', fontFamily:'var(--f-sys)', fontSize:11 }}>◢ BEJEGYZÉS LÉTREHOZVA · TRANSMIT SIKERES</div>
                )}
              </div>

              {/* Right props */}
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div className="sys muted" style={{ fontSize:10 }}>◢ TULAJDONSÁGOK</div>
                <Meta k="TÍPUS"      v={kind}/>
                <Meta k="MÉDIA"      v={mediaTab.toUpperCase()}/>
                <Meta k="CIKLUS"     v="047"/>
                <Meta k="LÁTHATÓSÁG" v="HÁLÓZAT"/>
                <div style={{ borderTop:'1px solid var(--border-1)', paddingTop:12, marginTop:4 }}>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <span className="dot"/><span className="mono" style={{ fontSize:11 }}>KÉSZEN · UNCOMMITTED</span>
                  </div>
                  <div className="bar-track" style={{ marginTop:8 }}><div className="bar-fill" style={{ width:'82%' }}/></div>
                  <div className="sys muted" style={{ marginTop:4, fontSize:10 }}>INTEGRITÁS · 82%</div>
                </div>
                <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                  <input type="checkbox" name="priority" style={{ accentColor:'var(--accent)' }}/>
                  <span className="sys muted" style={{ fontSize:11 }}>PRIORITÁSOS</span>
                </label>
                <button type="submit" className="btn btn-primary" style={{ justifyContent:'center', marginTop:'auto' }} disabled={pending || uploading}>
                  {done ? '◢ SIKERES!' : pending ? '◢ KÜLDÉS...' : '◢ PUBLIKÁLÁS · TRANSMIT'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </Panel>
  )
}

/* ─── Entry card ─── */
function EntryCard({ e, i, currentOperator }: { e: Entry; i: number; currentOperator: Operator | null }) {
  const [reactions, setReactions] = useState<Record<string,number>>(e.reactions ?? {})
  const [userRx, setUserRx]       = useState<string[]>([])
  const [rxPending, setRxPending] = useState<string|null>(null)
  const chipKind = e.priority ? 'solid' : e.alert ? 'mag' : 'accent'
  const time = new Date(e.created_at).toLocaleTimeString('hu-HU', { hour:'2-digit', minute:'2-digit' })

  async function handleReact(emoji: string) {
    if (!currentOperator || rxPending) return
    setRxPending(emoji)
    const res = await toggleReaction(e.id, emoji)
    if (res?.reactions) setReactions(res.reactions)
    if (res?.userReactions) setUserRx(res.userReactions)
    setRxPending(null)
  }

  const hasMedia = e.media_type && e.media_url
  const totalReactions = EMOJIS.reduce((s, em) => s + (reactions[em] ?? 0), 0)

  return (
    <div style={{ marginBottom:14 }}>
      <Link href={`/entries/${e.id}`} style={{ display:'block', textDecoration:'none' }}>
        <div className="entry-card panel" style={{ padding:0 }}>
          <div style={{ display:'grid', gridTemplateColumns:'140px 1fr 220px', borderBottom:'1px solid var(--border-1)' }}>
            {/* Left meta */}
            <div style={{ padding:'14px 12px', borderRight:'1px solid var(--border-1)', display:'flex', flexDirection:'column', gap:6, background:'rgba(0,0,0,.2)' }}>
              <Chip kind={chipKind}>{e.id}</Chip>
              <div className="mono muted" style={{ fontSize:10, lineHeight:1.5 }}>
                CIKLUS {e.cycle}<br/>{time} UTC<br/>◢ OP · {e.operator?.callsign ?? e.operator_id}
              </div>
              <div style={{flex:1}}/>
              <div className="sys dim" style={{ fontSize:9 }}>#{String(2500-i).padStart(4,'0')}</div>
            </div>

            {/* Middle */}
            <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                <Chip kind="accent">{e.kind}</Chip>
                {e.sigs.map(s=><Chip key={s} kind="dash">{s}</Chip>)}
                <Chip kind="cyan">◢ {e.operator?.callsign ?? '—'}</Chip>
                {e.priority && <Chip kind="solid" dot>PRIORITÁSOS</Chip>}
                {e.alert && <Chip kind="mag" dot>RIASZTÁS · ÉLŐ</Chip>}
                {e.media_type === 'youtube' && <Chip kind="dash">▶ YOUTUBE</Chip>}
                {e.media_type === 'image'   && <Chip kind="dash">⊡ KÉP</Chip>}
                {e.media_type === 'audio'   && <Chip kind="dash">♪ HANG</Chip>}
              </div>
              <h3 className="entry-title head" style={{ margin:0, fontSize:e.priority?28:22, lineHeight:1.05, color:'var(--ink-0)' }}>
                {e.title}
              </h3>
              <p style={{ margin:0, color:'var(--ink-1)', maxWidth:720, fontSize:13, lineHeight:1.6 }}>
                {e.excerpt}
              </p>
              <div style={{ display:'flex', gap:18, alignItems:'center', paddingTop:8, borderTop:'1px dashed var(--border-1)', marginTop:4 }}>
                <span className="sys muted">◢ {e.reads} OLVASÓ</span>
                {totalReactions > 0 && <span className="sys muted">◢ {totalReactions} REAKCIÓ</span>}
                <span style={{flex:1}}/>
                <span className="sys" style={{ color:'var(--accent)' }}>↗ BEJEGYZÉS MEGNYITÁSA</span>
              </div>
            </div>

            {/* Right visual */}
            <div style={{ borderLeft:'1px solid var(--border-1)', display:'flex', flexDirection:'column', background:'rgba(0,0,0,.15)' }}>
              {hasMedia && e.media_type === 'youtube' ? (
                <YouTubeThumbnail url={e.media_url!} height={120}/>
              ) : hasMedia && e.media_type === 'image' ? (
                <div style={{ height:120, overflow:'hidden' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={e.media_url!} alt={e.media_label ?? ''} style={{ width:'100%', height:'100%', objectFit:'cover', opacity:.7 }}/>
                </div>
              ) : (
                <div className="fig-ph" style={{ height:120, margin:'12px 12px 0' }}>
                  <svg viewBox="0 0 200 120" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
                    {Array.from({length:24}).map((_,j)=>{
                      const x = 8+(j*11+i*7)%184; const y = 8+(j*17+i*13)%104
                      return <circle key={j} cx={x} cy={y} r={j%5===0?2.2:1.2}
                        fill={j%7===i?'var(--accent)':'var(--ink-3)'}
                        style={j%7===i?{filter:'drop-shadow(0 0 3px var(--accent))'}:undefined}/>
                    })}
                  </svg>
                  <span className="fig-label">FIG · {String(i+1).padStart(2,'0')}</span>
                </div>
              )}
              <div style={{ flex:1 }}/>
              <div style={{ padding:'8px 12px', borderTop:'1px solid var(--border-1)', display:'flex', justifyContent:'space-between' }}>
                <span className="sys muted" style={{ fontSize:10 }}>◢ IDX {String(2481-i).padStart(4,'0')}</span>
                <span className="sys muted" style={{ fontSize:10 }}>◣ V.1</span>
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Reactions row — outside link */}
      <div style={{ display:'flex', gap:6, alignItems:'center', padding:'7px 14px', background:'var(--bg-1)', border:'1px solid var(--border-1)', borderTop:'none' }}>
        {EMOJIS.map(emoji => {
          const count = reactions[emoji] ?? 0
          const active = userRx.includes(emoji)
          return (
            <button key={emoji} onClick={()=>handleReact(emoji)}
              disabled={rxPending !== null}
              style={{
                display:'flex', alignItems:'center', gap:4, padding:'2px 8px',
                border:`1px solid ${active?'var(--accent)':'var(--border-1)'}`,
                background: active?'var(--accent-soft)':'transparent',
                color: active?'var(--accent)':'var(--ink-2)',
                cursor: currentOperator?'pointer':'default',
                fontFamily:'var(--f-sys)', fontSize:12,
                opacity: rxPending === emoji ? 0.5 : 1,
                transition:'border-color .15s, background .15s',
              }}
            >
              <span>{emoji}</span>
              {count > 0 && <span style={{ fontSize:10 }}>{count}</span>}
            </button>
          )
        })}
        {!currentOperator && (
          <span className="sys dim" style={{ fontSize:9, marginLeft:'auto' }}>◢ BELÉPÉS SZÜKSÉGES A REAKCIÓHOZ</span>
        )}
      </div>
    </div>
  )
}

/* ─── Thread index ─── */
function ThreadIndex({ threads }: { threads: Thread[] }) {
  return (
    <div style={{ padding:'40px 0', borderBottom:'1px solid var(--border-1)' }}>
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:24 }}>
        <Heading tag="SZEKCIÓ · 02" title="JELZÉSLÁNC INDEX"
          sub="Aktív beszélgetési csomópontok a hálózatban."/>
        <div style={{ display:'flex', gap:8 }}>
          <Chip kind="accent">38 AKTÍV</Chip>
          <Chip kind="dash">4 ARCHIVÁLT</Chip>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {threads.map((t,i)=>(
          <Panel key={t.id} tag={t.id} chips={<Chip kind="accent">11 CSOMÓPONT</Chip>} style={{ background:'var(--panel)' }}>
            <h4 className="head" style={{ margin:'0 0 10px', fontSize:18, lineHeight:1.1 }}>{t.title}</h4>
            <div style={{ height:100, background:'var(--bg-2)', border:'1px solid var(--border-0)' }}>
              <NodeMap count={10} highlight={i+2} seed={i*9+3}/>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:10 }}>
              <span className="sys muted">◢ 4 OP</span>
              <span className="sys muted">UTOLSÓ PING 00:12</span>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  )
}

/* ─── Operator roster ─── */
function OperatorRoster({ operators }: { operators: Operator[] }) {
  const statusOf = (op: Operator) => (op.role === 'superadmin' || op.role === 'admin' || op.level >= 2) ? 'ONLINE' : 'OFFLINE'
  return (
    <div style={{ padding:'40px 0', borderBottom:'1px solid var(--border-1)' }}>
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:24 }}>
        <Heading tag="SZEKCIÓ · 03" title="OPERÁTOR LISTA"
          sub="142 regisztrált operátor · 17 online · rangsorolás csatlakozási ciklus alapján."/>
        <Chip kind="cyan">↗ TELJES LISTA</Chip>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
        {operators.map(op=>{
          const st = statusOf(op)
          return (
            <div key={op.id} className="panel" style={{ padding:12, display:'grid', gridTemplateColumns:'44px 1fr auto', gap:12, alignItems:'center' }}>
              <Avatar id={'F3X-' + op.id.slice(0,3).toUpperCase()} size={44}/>
              <div>
                <div className="head" style={{ fontSize:15 }}>{op.callsign}</div>
                <div className="sys muted">LVL-0{op.level}</div>
              </div>
              <span className={`dot${st==='ONLINE'?'':' dot-err'}`}/>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Archive ─── */
function Archive() {
  return (
    <div style={{ padding:'40px 0 56px' }}>
      <div style={{ marginBottom:18 }}>
        <Heading tag="SZEKCIÓ · 04" title="ARCHÍV · CIKLUSOK"/>
      </div>
      <div className="panel" style={{ padding:0 }}>
        {[['041','2025·11·12','218 bejegyzés'],['038','2025·09·04','144 bejegyzés'],['032','2025·06·18','612 bejegyzés'],['028','2025·04·02','411 bejegyzés'],['021','2024·12·30','302 bejegyzés']].map((r,i)=>(
          <div key={r[0]} style={{ display:'grid', gridTemplateColumns:'100px 160px 1fr 120px 40px', padding:'12px 16px', borderBottom:i<4?'1px solid var(--border-1)':'none', alignItems:'center' }}>
            <Chip>CIKLUS {r[0]}</Chip>
            <span className="mono muted">{r[1]}</span>
            <span className="head" style={{ fontSize:15 }}>{r[2]}</span>
            <Chip kind="dash">LEZÁRVA</Chip>
            <span style={{ textAlign:'right', color:'var(--ink-3)' }}>↗</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Root export ─── */
interface HomeClientProps {
  entries: Entry[]
  operators: Operator[]
  threads: Thread[]
  currentOperator: Operator | null
}

export function HomeClient({ entries, operators, threads, currentOperator }: HomeClientProps) {
  const displayEntries = entries.length  > 0 ? entries  : SEED_ENTRIES
  const displayOps     = operators.length > 0 ? operators : SEED_OPERATORS
  const displayThreads = threads.length  > 0 ? threads  : SEED_THREADS

  return (
    <div className="shell">
      <Hero/>
      <div style={{ padding:'28px 0 0' }}>
        <PostPanel op={currentOperator}/>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:18 }}>
          <Heading tag="SZEKCIÓ · 01" title="BEJEGYZÉS FOLYAM"
            sub="Legújabb átvitelek, riasztások és memóriadiffek. Sorrend: ciklus-index, nem algoritmus."/>
          <div style={{ display:'flex', gap:6 }}>
            <Chip kind="accent">LEGÚJABB</Chip>
            <Chip>CIKLUS</Chip>
            <Chip kind="dash">⌕ SZŰRŐ</Chip>
          </div>
        </div>
        <div>
          {displayEntries.map((e,i)=>(<EntryCard key={e.id} e={e} i={i} currentOperator={currentOperator}/>))}
        </div>
        <div className="panel" style={{ padding:14, textAlign:'center', borderStyle:'dashed', marginTop:10, color:'var(--ink-2)', fontFamily:'var(--f-sys)', fontSize:11, letterSpacing:'.2em' }}>
          ◢ KÖVETKEZŐ CIKLUS BETÖLTÉSE · 046 → 045
        </div>
      </div>
      <ThreadIndex threads={displayThreads}/>
      <OperatorRoster operators={displayOps}/>
      <Archive/>
    </div>
  )
}
