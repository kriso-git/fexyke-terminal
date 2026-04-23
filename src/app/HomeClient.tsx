'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Chip } from '@/components/ui/Chip'
import { Panel } from '@/components/ui/Panel'
import { Meta } from '@/components/ui/Meta'
import { Heading } from '@/components/ui/Heading'
import { Avatar } from '@/components/ui/Avatar'
import { LiveTicks } from '@/components/ui/LiveTicks'
import { NodeMap } from '@/components/ui/NodeMap'
import { YouTubeThumbnail, extractYouTubeId } from '@/components/ui/YouTubePlayer'
import { createEntry, toggleReaction, fetchEntryById, deleteEntry } from '@/app/actions'
import type { Entry, Operator, Thread } from '@/lib/types'


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
function PostPanel({ op, onPost }: { op: Operator | null; onPost: (id: string) => void }) {
  const router = useRouter()
  const [open, setOpen]             = useState(true)
  const [kind, setKind]             = useState<'POSZT'|'VIDEÓ'>('POSZT')
  const [content, setContent]       = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [tags, setTags]             = useState('')
  const [uploadedFile, setUploadedFile] = useState<{url:string;name:string;type:string}|null>(null)
  const [mediaLabel, setMediaLabel] = useState('')
  const [uploading, setUploading]   = useState(false)
  const [uploadPct, setUploadPct]   = useState(0)
  const [dragOver, setDragOver]     = useState(false)
  const [error, setError]           = useState<string|null>(null)
  const [pending, setPending]       = useState(false)
  const [done, setDone]             = useState(false)
  const contentRef   = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!op || (op.role !== 'admin' && op.role !== 'superadmin')) return null

  const handleFile = useCallback(async (file: File | null | undefined) => {
    if (!file) return
    if (!ALLOWED_UPLOAD.has(file.type)) { setError('Csak kép (gif/jpg/png/webp) és hang (mp3/wav/ogg) engedélyezett.'); return }
    if (file.size > 100 * 1024 * 1024) { setError('A fájl túl nagy (max 100 MB).'); return }
    setUploading(true); setUploadPct(0); setError(null)
    try {
      const result = await uploadWithProgress(file, setUploadPct)
      setUploadedFile(result)
      if (!mediaLabel) setMediaLabel(file.name.replace(/\.[^.]+$/, ''))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Feltöltési hiba')
    } finally { setUploading(false) }
  }, [mediaLabel])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (kind === 'VIDEÓ' && !youtubeUrl.trim()) { setError('YouTube URL megadása kötelező videóhoz.'); return }
    setPending(true); setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('kind', kind)
    fd.set('content', content)
    fd.set('sigs', tags)
    if (kind === 'VIDEÓ') {
      fd.set('media_type', 'youtube')
      fd.set('media_url', youtubeUrl.trim())
      fd.set('media_label', '')
    } else if (uploadedFile) {
      fd.set('media_type', uploadedFile.type.startsWith('audio/') ? 'audio' : 'image')
      fd.set('media_url', uploadedFile.url)
      fd.set('media_label', mediaLabel)
    } else {
      fd.set('media_type', ''); fd.set('media_url', ''); fd.set('media_label', '')
    }
    const res = await createEntry(fd)
    if (res?.error) { setError(res.error); setPending(false) }
    else {
      setDone(true)
      ;(e.currentTarget as HTMLFormElement).reset()
      setContent(''); setYoutubeUrl(''); setTags(''); setUploadedFile(null); setMediaLabel('')
      if (res?.id) onPost(res.id)
      setTimeout(() => { setPending(false); setDone(false) }, 1800)
    }
  }

  const ytId = extractYouTubeId(youtubeUrl)

  return (
    <Panel tag="◢ ÚJ BEJEGYZÉS" title="LÉTREHOZÁS" className="panel-raised"
      chips={<>
        <button type="button" onClick={()=>setOpen(o=>!o)} className="btn btn-ghost btn-sm">{open?'◢ BEZÁR':'◢ NYIT'}</button>
      </>}
      style={{ marginBottom:28 }}
    >
      {open && (
        <form onSubmit={handleSubmit}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 220px', gap:16 }}>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

              {/* Kind tabs */}
              <div style={{ display:'flex', gap:8 }}>
                {(['POSZT','VIDEÓ'] as const).map(k => (
                  <button key={k} type="button" onClick={()=>{ setKind(k); setUploadedFile(null); setError(null) }}
                    style={{
                      padding:'6px 18px', cursor:'pointer', fontFamily:'var(--f-sys)', fontSize:13,
                      letterSpacing:'.1em', border:'1px solid',
                      borderColor: kind===k ? 'var(--accent)' : 'var(--border-1)',
                      color: kind===k ? 'var(--accent)' : 'var(--ink-2)',
                      background: kind===k ? 'var(--accent-soft)' : 'transparent',
                    }}
                  >{kind===k ? '◉ ' : '◯ '}{k}</button>
                ))}
              </div>

              {/* Title */}
              <input name="title" className="input" required
                placeholder={kind === 'VIDEÓ' ? 'Videó címe...' : 'Poszt címe...'}
                style={{ fontSize:17 }}/>

              {/* VIDEÓ: YouTube URL */}
              {kind === 'VIDEÓ' && (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <span className="sys muted" style={{ fontSize:10 }}>▶ YOUTUBE URL</span>
                  <input className="input" value={youtubeUrl} onChange={e=>setYoutubeUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... vagy youtu.be/..."/>
                  {ytId && <YouTubeThumbnail url={youtubeUrl} height={110}/>}
                </div>
              )}

              {/* Body with rich text toolbar */}
              <div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                  <span className="sys muted" style={{ fontSize:10 }}>
                    {kind === 'VIDEÓ' ? 'LEÍRÁS (opcionális)' : 'SZÖVEG'}
                  </span>
                  <div style={{ display:'flex', gap:4 }}>
                    {([['b','B','Félkövér'],['i','I','Dőlt'],['u','U','Aláhúzott'],['s','S','Áthúzott']] as const).map(([tag,label,title])=>(
                      <button key={tag} type="button" title={title}
                        onMouseDown={ev=>{ ev.preventDefault(); if(contentRef.current) applyFormat(tag,contentRef.current,content,setContent) }}
                        style={{ width:22, height:22, border:'1px solid var(--border-1)', background:'var(--bg-2)', color:'var(--ink-1)', cursor:'pointer', fontSize:11,
                          fontWeight:tag==='b'?700:'normal', fontStyle:tag==='i'?'italic':'normal',
                          textDecoration:tag==='u'?'underline':tag==='s'?'line-through':'none',
                        }}>{label}</button>
                    ))}
                  </div>
                </div>
                <textarea ref={contentRef} className="input" rows={kind==='VIDEÓ'?3:5}
                  value={content} onChange={e=>setContent(e.target.value)}
                  placeholder={kind==='VIDEÓ' ? 'Rövid leírás a videóhoz...' : 'Írd be a poszt szövegét...'}
                  style={{ resize:'vertical' }}/>
              </div>

              {/* POSZT: file upload */}
              {kind === 'POSZT' && (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <span className="sys muted" style={{ fontSize:10 }}>⊡ KÉP VAGY ♪ HANG (opcionális)</span>
                  <div
                    onDrop={e=>{ e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
                    onDragOver={e=>{ e.preventDefault(); setDragOver(true) }}
                    onDragLeave={()=>setDragOver(false)}
                    onClick={()=>!uploading && fileInputRef.current?.click()}
                    style={{
                      border:`2px dashed ${dragOver?'var(--accent)':'var(--border-1)'}`,
                      padding:'16px', textAlign:'center', cursor:'pointer',
                      background: dragOver?'var(--accent-soft)':'transparent',
                    }}
                  >
                    {uploading ? (
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        <div className="sys muted" style={{ fontSize:11 }}>Feltöltés · {uploadPct}%</div>
                        <div className="bar-track"><div className="bar-fill" style={{ width:`${uploadPct}%` }}/></div>
                      </div>
                    ) : uploadedFile ? (
                      <span className="sys" style={{ color:'var(--accent)', fontSize:11 }}>✓ {uploadedFile.name} · klikk a cserére</span>
                    ) : (
                      <span className="sys muted" style={{ fontSize:11 }}>⬆ Húzd ide vagy kattints · gif · jpg · png · mp3 · wav — max 100 MB</span>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" style={{ display:'none' }}
                    accept="image/gif,image/jpeg,image/png,image/webp,audio/mpeg,audio/ogg,audio/wav,audio/flac"
                    onChange={e=>handleFile(e.target.files?.[0])}/>
                  {uploadedFile && (
                    <input className="input" value={mediaLabel} onChange={e=>setMediaLabel(e.target.value)}
                      placeholder="Felirat (opcionális)" style={{ fontSize:12 }}/>
                  )}
                </div>
              )}

              {/* Tags — for both but labeled differently */}
              <div style={{ display:'flex', gap:8, alignItems:'center', paddingTop:8, borderTop:'1px dashed var(--border-1)' }}>
                <span className="sys muted" style={{ fontSize:10, flexShrink:0 }}>
                  {kind === 'VIDEÓ' ? '# TAGEK' : '# TAGEK'}
                </span>
                <input className="input" value={tags} onChange={e=>setTags(e.target.value)}
                  placeholder={kind === 'VIDEÓ' ? '#gaming, #tutorial, #review' : '#hírek, #vélemény'}
                  style={{ flex:1, fontSize:12 }}/>
              </div>

              {error && <div style={{ padding:'8px 12px', background:'rgba(255,58,58,.1)', border:'1px solid var(--red)', color:'var(--red)', fontFamily:'var(--f-sys)', fontSize:11 }}>◢ {error}</div>}
              {done  && <div style={{ padding:'8px 12px', background:'rgba(24,233,104,.1)', border:'1px solid var(--accent)', color:'var(--accent)', fontFamily:'var(--f-sys)', fontSize:11 }}>◢ {kind === 'VIDEÓ' ? 'Videó' : 'Poszt'} sikeresen létrehozva!</div>}
            </div>

            {/* Right */}
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div className="sys muted" style={{ fontSize:10 }}>◢ ÖSSZEFOGLALÓ</div>
              <Meta k="TÍPUS"  v={kind}/>
              {kind==='VIDEÓ' && ytId && <Meta k="VIDEÓ ID" v={ytId}/>}
              {kind==='POSZT' && uploadedFile && <Meta k="FÁJL" v={uploadedFile.type.startsWith('audio/')? 'HANG':'KÉP'}/>}
              <div style={{ borderTop:'1px solid var(--border-1)', paddingTop:10, marginTop:4 }}>
                <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', marginBottom:10 }}>
                  <input type="checkbox" name="priority" style={{ accentColor:'var(--accent)' }}/>
                  <span className="sys muted" style={{ fontSize:11 }}>Kiemelés (prioritás)</span>
                </label>
                <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} disabled={pending || uploading}>
                  {done ? '✓ Sikeres!' : pending ? 'Küldés...' : kind === 'VIDEÓ' ? '▶ Videó közzététele' : '◢ Poszt közzététele'}
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
function EntryCard({ e, i, currentOperator, onDelete }: { e: Entry; i: number; currentOperator: Operator | null; onDelete: (id: string) => void }) {
  const [reactions, setReactions] = useState<Record<string,number>>(e.reactions ?? {})
  const [userRx, setUserRx]       = useState<string[]>([])
  const [rxPending, setRxPending] = useState<string|null>(null)
  const [deleting, setDeleting]   = useState(false)
  const chipKind = e.priority ? 'solid' : 'accent'
  const time    = new Date(e.created_at).toLocaleTimeString('hu-HU', { hour:'2-digit', minute:'2-digit' })
  const isVideo = e.kind === 'VIDEÓ' || e.kind === 'ADÁS' || e.media_type === 'youtube'
  const isSuperadmin = currentOperator?.role === 'superadmin'

  async function handleDelete() {
    if (!confirm('Biztosan törlöd ezt a bejegyzést?')) return
    setDeleting(true)
    const res = await deleteEntry(e.id)
    if (res?.error) { alert(res.error); setDeleting(false) }
    else onDelete(e.id)
  }

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
                <Chip kind="accent">{isVideo ? 'VIDEÓ' : 'POSZT'}</Chip>
                {e.sigs.map(s=><Chip key={s} kind="dash">{s}</Chip>)}
                <Chip kind="cyan">{e.operator?.callsign ?? '—'}</Chip>
                {e.priority && <Chip kind="solid" dot>KIEMELT</Chip>}
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

      {/* Reactions + delete row */}
      <div style={{ display:'flex', gap:6, alignItems:'center', padding:'7px 14px', background:'var(--bg-1)', border:'1px solid var(--border-1)', borderTop:'none', opacity: deleting ? 0.4 : 1 }}>
        {EMOJIS.map(emoji => {
          const count = reactions[emoji] ?? 0
          const active = userRx.includes(emoji)
          return (
            <button key={emoji} onClick={()=>handleReact(emoji)}
              disabled={rxPending !== null || deleting}
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
        <span style={{ flex:1 }}/>
        {isSuperadmin && (
          <button onClick={handleDelete} disabled={deleting}
            style={{
              background:'none', border:'1px solid var(--border-1)', color:'var(--red)',
              fontFamily:'var(--f-sys)', fontSize:10, padding:'2px 8px', cursor:'pointer',
              letterSpacing:'.08em', opacity: deleting ? 0.5 : 1,
              transition:'border-color .15s',
            }}
            onMouseOver={e=>(e.currentTarget.style.borderColor='var(--red)')}
            onMouseOut={e=>(e.currentTarget.style.borderColor='var(--border-1)')}
          >
            {deleting ? '◢ TÖRLÉS...' : '◢ TÖRLÉS'}
          </button>
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


/* ─── Root export ─── */
interface HomeClientProps {
  entries: Entry[]
  operators: Operator[]
  threads: Thread[]
  currentOperator: Operator | null
}

export function HomeClient({ entries: initialEntries, operators, threads, currentOperator }: HomeClientProps) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries)
  const [filter, setFilter]   = useState<'mind'|'posztok'|'videók'>('mind')

  async function handlePost(id: string) {
    const entry = await fetchEntryById(id)
    if (entry) setEntries(prev => [{ ...(entry as Entry), reactions: {} }, ...prev])
  }

  function handleDelete(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const isVideoEntry = (e: Entry) => e.kind === 'VIDEÓ' || e.kind === 'ADÁS' || e.media_type === 'youtube'
  const filtered = filter === 'mind' ? entries
    : filter === 'videók'
      ? entries.filter(isVideoEntry)
      : entries.filter(e => !isVideoEntry(e))

  return (
    <div className="shell">
      <Hero/>
      <div style={{ padding:'28px 0 0' }}>
        <PostPanel op={currentOperator} onPost={handlePost}/>

        {/* Feed header + filter */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <Heading tag="SZEKCIÓ · 01" title="BEJEGYZÉS FOLYAM"
            sub="Posztok és videók időrendben."/>
          <div style={{ display:'flex', gap:6 }}>
            {(['mind','posztok','videók'] as const).map(f => (
              <button key={f} type="button" onClick={()=>setFilter(f)}
                className="chip"
                style={{
                  cursor:'pointer', textTransform:'uppercase', fontSize:11,
                  borderColor: filter===f ? 'var(--accent)' : 'var(--border-1)',
                  color:       filter===f ? 'var(--accent)' : 'var(--ink-2)',
                  background:  filter===f ? 'var(--accent-soft)' : 'transparent',
                }}>
                {f === 'mind' ? 'Összes' : f === 'posztok' ? 'Posztok' : '▶ Videók'}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="panel" style={{ padding:'32px 24px', textAlign:'center', borderStyle:'dashed' }}>
            <div className="sys muted" style={{ fontSize:12, letterSpacing:'.1em' }}>
              {entries.length === 0 ? 'Még nincsenek bejegyzések.' : `Nincs ${filter === 'videók' ? 'videó' : 'poszt'} a folyamban.`}
            </div>
          </div>
        ) : (
          <div>
            {filtered.map((e,i)=>(<EntryCard key={e.id} e={e} i={i} currentOperator={currentOperator} onDelete={handleDelete}/>))}
          </div>
        )}
      </div>
      {operators.length > 0 && <OperatorRoster operators={operators}/>}
      {threads.length > 0 && <ThreadIndex threads={threads}/>}
    </div>
  )
}
