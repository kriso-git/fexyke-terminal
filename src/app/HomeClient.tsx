'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Chip } from '@/components/ui/Chip'
import { Panel } from '@/components/ui/Panel'
import { Meta } from '@/components/ui/Meta'
import { Heading } from '@/components/ui/Heading'
import { Avatar } from '@/components/ui/Avatar'
import { LiveTicks } from '@/components/ui/LiveTicks'
import { HeroCube } from '@/components/ui/HeroCube'
import { LangPicker } from '@/components/ui/LangPicker'
import { YouTubePlayer, YouTubeThumbnail, extractYouTubeId } from '@/components/ui/YouTubePlayer'
import { createEntry, toggleReaction, fetchEntryById, deleteEntry, createSignal } from '@/app/actions'
import type { Entry, Operator } from '@/lib/types'

const ALLOWED_UPLOAD = new Set([
  'image/gif','image/jpeg','image/png','image/webp',
  'audio/mpeg','audio/mp3','audio/ogg','audio/wav','audio/flac',
])
const EMOJIS = ['👍','🔥','💀','😂']

function uploadWithProgress(file: File, onProgress: (p: number) => void): Promise<{url:string;name:string;type:string}> {
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

function applyFormat(tag: string, ta: HTMLTextAreaElement, val: string, set: (v:string)=>void) {
  const s = ta.selectionStart, e = ta.selectionEnd
  if (s === e) return
  const selected = val.slice(s, e)
  set(val.slice(0,s) + `<${tag}>${selected}</${tag}>` + val.slice(e))
  requestAnimationFrame(() => { ta.focus(); const c = e + tag.length*2+5; ta.setSelectionRange(c,c) })
}

function getWeekNum(dateStr: string) {
  const d = new Date(dateStr)
  d.setHours(0,0,0,0)
  d.setDate(d.getDate() + 3 - (d.getDay()+6)%7)
  const w1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime()-w1.getTime())/86400000 - 3 + (w1.getDay()+6)%7)/7)
}

/* ─── Hero ─── */
function Hero({ currentOperator }: { currentOperator: Operator | null }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr auto 420px', gap:32, padding:'40px 0 32px', borderBottom:'1px solid var(--border-1)', alignItems:'start' }}>

      {/* Left — title + sub + lang + CTA */}
      <div>
        <div style={{ display:'flex', gap:8, marginBottom:18 }}>
          <Chip kind="accent" dot>◢ ADÁSBAN</Chip>
          <Chip kind="cyan">KAPCSOLAT · STABIL</Chip>
          <Chip kind="dash">V0.1.0</Chip>
        </div>
        <h1 className="display r-display" style={{ margin:0, color:'var(--ink-0)', lineHeight:.92 }}>
          F3XYKEE /<br/>
          <span style={{ color:'var(--accent)', textShadow:'0 0 12px rgba(24,233,104,.35)' }}>BLOG</span><br/>
          FELÜLET
        </h1>
        <p className="muted" style={{ marginTop:18, fontSize:13, lineHeight:1.6, maxWidth:420 }}>
          Élo blog felület — posztok, videók, kommentek.
        </p>
        <div style={{ marginTop:14, marginBottom:20 }}>
          <LangPicker/>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Link href="/gate" className="btn btn-primary">◢ BELÉPÉS</Link>
          <Link href="#feed" className="btn">⌕ POSZTOK</Link>
        </div>
      </div>

      {/* Center — HeroCube */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', paddingTop:20 }}>
        <HeroCube/>
      </div>

      {/* Right — UserCard */}
      <div className="panel panel-hud panel-raised" style={{ position:'relative' }}>
        <span className="hud-br"/><span className="hud-bl"/>
        <div className="panel-header"><span className="label">◢ PROFIL</span> AKTÍV FELHASZNÁLÓ</div>
        <div className="panel-body">
          {currentOperator ? (
            <>
              <div style={{ display:'flex', gap:14, alignItems:'center', marginBottom:14 }}>
                <div style={{ position:'relative' }}>
                  <Avatar id={currentOperator.id} size={64}/>
                  <span className="dot" style={{ position:'absolute', bottom:2, right:2 }}/>
                </div>
                <div>
                  <div className="head" style={{ fontSize:22, lineHeight:1 }}>{currentOperator.callsign}</div>
                  <div className="sys muted" style={{ marginTop:4 }}>LVL-0{currentOperator.level} · {currentOperator.role.toUpperCase()}</div>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:2, marginBottom:12 }}>
                <Meta k="ÁLLAPOT"   v="ONLINE"/>
                <Meta k="CSOMÓPONT" v="BUD-01"/>
              </div>
              <div style={{ marginBottom:10 }}>
                <div className="sys muted" style={{ fontSize:9, marginBottom:5 }}>◢ KAPCSOLAT · ÉLŐJEL</div>
                <LiveTicks count={20} height={24}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                {[['PING','18ms'],['ÁTVITEL','128kB'],['VESZTESÉG','0.01%']].map(([k,v])=>(
                  <div key={k} className="panel" style={{ padding:'5px 7px' }}>
                    <div className="sys muted" style={{ fontSize:9 }}>{k}</div>
                    <div className="mono" style={{ fontSize:12, color:'var(--accent)' }}>{v}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign:'center', padding:'16px 0' }}>
              <div className="head" style={{ fontSize:16, marginBottom:10, color:'var(--ink-2)' }}>NEM BEJELENTKEZETT</div>
              <Link href="/gate" className="btn btn-primary" style={{ display:'inline-flex' }}>◢ BELÉPÉS</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Post panel ─── */
function PostPanel({ op, onPost }: { op: Operator | null; onPost: (id: string) => void }) {
  const [open, setOpen]               = useState(true)
  const [kind, setKind]               = useState<'SZÖVEG'|'KÉP'|'VIDEÓ'>('SZÖVEG')
  const [content, setContent]         = useState('')
  const [youtubeUrl, setYoutubeUrl]   = useState('')
  const [tags, setTags]               = useState('')
  const [uploadedFile, setUploadedFile] = useState<{url:string;name:string;type:string}|null>(null)
  const [mediaLabel, setMediaLabel]   = useState('')
  const [uploading, setUploading]     = useState(false)
  const [uploadPct, setUploadPct]     = useState(0)
  const [dragOver, setDragOver]       = useState(false)
  const [error, setError]             = useState<string|null>(null)
  const [pending, setPending]         = useState(false)
  const [done, setDone]               = useState(false)
  const contentRef   = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!op || (op.role !== 'admin' && op.role !== 'superadmin')) return null

  const handleFile = useCallback(async (file: File | null | undefined) => {
    if (!file) return
    if (!ALLOWED_UPLOAD.has(file.type)) { setError('Csak kép (gif/jpg/png/webp) és hang (mp3/wav/ogg) engedélyezett.'); return }
    if (file.size > 100 * 1024 * 1024) { setError('Max 100 MB.'); return }
    setUploading(true); setUploadPct(0); setError(null)
    try {
      const result = await uploadWithProgress(file, setUploadPct)
      setUploadedFile(result)
      if (!mediaLabel) setMediaLabel(file.name.replace(/\.[^.]+$/, ''))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Feltöltési hiba')
    } finally { setUploading(false) }
  }, [mediaLabel])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>, mode: 'draft'|'publish') {
    e.preventDefault()
    if (kind === 'VIDEÓ' && !youtubeUrl.trim()) { setError('YouTube URL megadása kötelező.'); return }
    if (kind === 'KÉP' && !uploadedFile) { setError('Kép feltöltése kötelező.'); return }
    setPending(true); setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('kind', kind === 'VIDEÓ' ? 'VIDEÓ' : 'POSZT')
    fd.set('content', content)
    fd.set('sigs', tags)
    if (mode === 'draft') fd.set('priority', '')
    if (kind === 'VIDEÓ') {
      fd.set('media_type', 'youtube'); fd.set('media_url', youtubeUrl.trim()); fd.set('media_label', '')
    } else if (uploadedFile) {
      fd.set('media_type', uploadedFile.type.startsWith('audio/') ? 'audio' : 'image')
      fd.set('media_url', uploadedFile.url); fd.set('media_label', mediaLabel)
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
    <Panel tag="◢ ÚJ POSZT" title="LÉTREHOZÁS" className="panel-raised"
      chips={<button type="button" onClick={()=>setOpen(o=>!o)} className="btn btn-ghost btn-sm">{open?'◢ BEZÁR':'◢ NYIT'}</button>}
      style={{ marginBottom:28 }}
    >
      {open && (
        <form onSubmit={(e) => handleSubmit(e, 'publish')}>
          <div className="r-form">
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {/* Kind */}
              <div style={{ display:'flex', gap:6 }}>
                {(['SZÖVEG','KÉP','VIDEÓ'] as const).map(k => (
                  <button key={k} type="button"
                    className={`chip${kind===k?' chip-accent':''}`}
                    style={{ cursor:'pointer' }}
                    onClick={() => { setKind(k); setUploadedFile(null); setError(null) }}
                  >{kind===k?'◉ ':'◯ '}{k}</button>
                ))}
              </div>

              <input name="title" className="input" required
                placeholder={kind==='VIDEÓ' ? 'Videó címe…' : kind==='KÉP' ? 'Kép felirata…' : 'Poszt címe…'}
                style={{ fontSize:17 }}/>

              {kind === 'VIDEÓ' && (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <span className="sys muted" style={{ fontSize:10 }}>▶ YOUTUBE URL</span>
                  <input className="input" value={youtubeUrl} onChange={e=>setYoutubeUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=…"/>
                  {ytId && <YouTubeThumbnail url={youtubeUrl} height={110}/>}
                </div>
              )}

              {(kind === 'KÉP' || kind === 'SZÖVEG') && (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <span className="sys muted" style={{ fontSize:10 }}>
                    {kind==='KÉP' ? '⊡ KÉP (kötelező)' : '⊡ KÉP VAGY ♪ HANG (opcionális)'}
                  </span>
                  <div
                    onDrop={ev=>{ev.preventDefault();setDragOver(false);handleFile(ev.dataTransfer.files[0])}}
                    onDragOver={ev=>{ev.preventDefault();setDragOver(true)}}
                    onDragLeave={()=>setDragOver(false)}
                    onClick={()=>!uploading && fileInputRef.current?.click()}
                    style={{ border:`2px dashed ${dragOver?'var(--accent)':'var(--border-1)'}`, padding:16, textAlign:'center', cursor:'pointer', background:dragOver?'var(--accent-soft)':'transparent' }}
                  >
                    {uploading ? (
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        <div className="sys muted" style={{ fontSize:11 }}>Feltöltés · {uploadPct}%</div>
                        <div className="bar-track"><div className="bar-fill" style={{ width:`${uploadPct}%` }}/></div>
                      </div>
                    ) : uploadedFile ? (
                      <span className="sys" style={{ color:'var(--accent)', fontSize:11 }}>✓ {uploadedFile.name}</span>
                    ) : (
                      <span className="sys muted" style={{ fontSize:11 }}>⬆ Húzd ide vagy kattints · gif · jpg · png · mp3 · wav — max 100 MB</span>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" style={{ display:'none' }}
                    accept="image/gif,image/jpeg,image/png,image/webp,audio/mpeg,audio/ogg,audio/wav,audio/flac"
                    onChange={ev=>handleFile(ev.target.files?.[0])}/>
                  {uploadedFile && <input className="input" value={mediaLabel} onChange={ev=>setMediaLabel(ev.target.value)} placeholder="Felirat (opcionális)" style={{ fontSize:12 }}/>}
                </div>
              )}

              <div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                  <span className="sys muted" style={{ fontSize:10 }}>{kind==='VIDEÓ' ? 'LEÍRÁS (opcionális)' : 'TARTALOM'}</span>
                  <div style={{ display:'flex', gap:4 }}>
                    {([['b','B'],['i','I'],['u','U'],['s','S']] as const).map(([tag,label])=>(
                      <button key={tag} type="button"
                        onMouseDown={ev=>{ev.preventDefault();if(contentRef.current)applyFormat(tag,contentRef.current,content,setContent)}}
                        style={{ width:22, height:22, border:'1px solid var(--border-1)', background:'var(--bg-2)', color:'var(--ink-1)', cursor:'pointer', fontSize:11,
                          fontWeight:tag==='b'?700:'normal', fontStyle:tag==='i'?'italic':'normal',
                          textDecoration:tag==='u'?'underline':tag==='s'?'line-through':'none' }}
                      >{label}</button>
                    ))}
                  </div>
                </div>
                <textarea ref={contentRef} className="input" rows={kind==='VIDEÓ'?3:5}
                  value={content} onChange={ev=>setContent(ev.target.value)}
                  placeholder={kind==='VIDEÓ'?'Rövid leírás…':'Írd be a poszt szövegét…'}/>
              </div>

              <div style={{ display:'flex', gap:8, alignItems:'center', paddingTop:8, borderTop:'1px dashed var(--border-1)' }}>
                <span className="sys muted" style={{ fontSize:10, flexShrink:0 }}># TÉMÁK</span>
                <input className="input" value={tags} onChange={ev=>setTags(ev.target.value)}
                  placeholder="#hírek, #vélemény" style={{ flex:1, fontSize:12 }}/>
              </div>

              {error && <div style={{ padding:'8px 12px', background:'rgba(255,58,58,.1)', border:'1px solid var(--red)', color:'var(--red)', fontFamily:'var(--f-sys)', fontSize:11 }}>◢ {error}</div>}
              {done  && <div style={{ padding:'8px 12px', background:'rgba(24,233,104,.1)', border:'1px solid var(--accent)', color:'var(--accent)', fontFamily:'var(--f-sys)', fontSize:11 }}>◢ Poszt sikeresen létrehozva!</div>}
            </div>

            {/* Right sidebar */}
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div className="sys muted" style={{ fontSize:10 }}>◢ META</div>
              <Meta k="TÍPUS" v={kind}/>
              <Meta k="SZERZŐ" v={op.callsign}/>
              {kind==='VIDEÓ' && ytId && <Meta k="VIDEÓ ID" v={ytId}/>}
              <div style={{ borderTop:'1px solid var(--border-1)', paddingTop:10, marginTop:4, display:'flex', flexDirection:'column', gap:6 }}>
                <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                  <input type="checkbox" name="priority" style={{ accentColor:'var(--accent)' }}/>
                  <span className="sys muted" style={{ fontSize:11 }}>Kiemelés</span>
                </label>
                <div style={{ display:'flex', gap:6 }}>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ flex:1, justifyContent:'center', opacity:.7 }} disabled={pending || uploading}>VÁZLAT</button>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ flex:1, justifyContent:'center', opacity:.7 }} disabled={pending || uploading}>ELŐNÉZET</button>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} disabled={pending || uploading}>
                  {done ? '✓ Sikeres!' : pending ? 'Küldés…' : '◢ KÖZZÉTESZ'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </Panel>
  )
}

/* ─── Inline comment composer ─── */
function CommentComposer({ entryId, currentOperator }: { entryId: string; currentOperator: Operator | null }) {
  const [text, setText] = useState('')
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!currentOperator) return null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setPending(true)
    const fd = new FormData()
    fd.append('entry_id', entryId)
    fd.append('text', text.trim())
    const res = await createSignal(fd)
    if (!res?.error) { setText(''); setDone(true); setTimeout(() => setDone(false), 1600) }
    setPending(false)
  }

  return (
    <form onSubmit={submit} className="comment-composer">
      <Avatar id={currentOperator.id} size={28}/>
      <textarea
        className="input"
        style={{ flex:1, minHeight:36, maxHeight:100, resize:'vertical', fontSize:12, padding:'6px 10px' }}
        placeholder="Írj kommentet…"
        value={text}
        onChange={e=>setText(e.target.value)}
        rows={1}
      />
      <button type="button" className="btn btn-ghost btn-sm" style={{ padding:'4px 8px', opacity:.6 }}
        onClick={()=>fileInputRef.current?.click()} title="Kép csatolása">⊡</button>
      <input ref={fileInputRef} type="file" style={{ display:'none' }} accept="image/gif,image/jpeg,image/png,image/webp"/>
      <button type="submit" className="btn btn-primary btn-sm" disabled={pending || !text.trim()}>
        {done ? '✓' : pending ? '…' : '↗'}
      </button>
    </form>
  )
}

/* ─── Post card (blog style) ─── */
function PostCard({ e, i, currentOperator, onDelete }: { e: Entry; i: number; currentOperator: Operator | null; onDelete: (id: string) => void }) {
  const [reactions, setReactions] = useState<Record<string,number>>(e.reactions ?? {})
  const [userRx, setUserRx]       = useState<string[]>([])
  const [rxPending, setRxPending] = useState<string|null>(null)
  const [deleting, setDeleting]   = useState(false)
  const isVideo  = e.kind === 'VIDEÓ' || e.kind === 'ADÁS' || e.media_type === 'youtube'
  const isImage  = e.media_type === 'image' && e.media_url
  const week     = getWeekNum(e.created_at)
  const date     = new Date(e.created_at).toLocaleDateString('hu-HU', { month:'short', day:'numeric' })
  const totalRx  = EMOJIS.reduce((s,em) => s + (reactions[em] ?? 0), 0)

  async function handleDelete() {
    if (!confirm('Biztosan törlöd?')) return
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

  return (
    <div style={{ marginBottom:14, opacity: deleting ? 0.4 : 1 }}>
      <div className="entry-card panel" style={{ padding:0 }}>

        {/* 3-column layout: 140px gutter | 1fr content | 280px aside */}
        <div style={{ display:'grid', gridTemplateColumns:'140px 1fr 280px', borderBottom:'1px solid var(--border-1)' }}>

          {/* Left gutter */}
          <div style={{ padding:'16px 12px', borderRight:'1px solid var(--border-1)', display:'flex', flexDirection:'column', gap:8, background:'rgba(0,0,0,.2)' }}>
            <div className="sys dim" style={{ fontSize:9 }}>#{String(i+1).padStart(4,'0')}</div>
            <div className="mono muted" style={{ fontSize:10, lineHeight:1.5 }}>{date}<br/>{week}. HÉT</div>
            <Chip kind={e.priority ? 'solid' : 'accent'} style={{ fontSize:9, padding:'2px 5px' }}>
              {isVideo ? 'VIDEÓ' : isImage ? 'KÉP' : 'SZÖVEG'}
            </Chip>
            <div style={{ flex:1 }}/>
            <div style={{ display:'flex', flexDirection:'column', gap:4, alignItems:'flex-start' }}>
              <div className="sys muted" style={{ fontSize:9 }}>SZERZŐ</div>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <Avatar id={e.operator_id} size={24}/>
                <span className="sys" style={{ fontSize:10 }}>{e.operator?.callsign ?? '—'}</span>
              </div>
            </div>
          </div>

          {/* Center content */}
          <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {e.sigs.map(s=><Chip key={s} kind="dash">{s}</Chip>)}
              {e.priority && <Chip kind="solid" dot>KIEMELT</Chip>}
            </div>
            <Link href={`/entries/${e.id}`} style={{ textDecoration:'none' }}>
              <h3 className="entry-title head" style={{ margin:0, fontSize:e.priority?26:20, lineHeight:1.08, color:'var(--ink-0)' }}>
                {e.title}
              </h3>
            </Link>
            {e.excerpt && (
              <p style={{ margin:0, color:'var(--ink-1)', fontSize:13, lineHeight:1.6, maxWidth:640 }}>
                {e.excerpt}
              </p>
            )}

            {/* Stats row */}
            <div style={{ display:'flex', gap:14, alignItems:'center', paddingTop:6, borderTop:'1px dashed var(--border-1)', flexWrap:'wrap' }}>
              <span className="sys muted" style={{ fontSize:10 }}>◢ {e.reads} OLVASÁS</span>
              {totalRx > 0 && <span className="sys muted" style={{ fontSize:10 }}>◢ {totalRx} KEDVELÉS</span>}
              {EMOJIS.map(em => {
                const count = reactions[em] ?? 0
                const active = userRx.includes(em)
                return (
                  <button key={em} onClick={()=>handleReact(em)} disabled={rxPending !== null}
                    style={{ display:'flex', alignItems:'center', gap:3, padding:'1px 6px',
                      border:`1px solid ${active?'var(--accent)':'var(--border-1)'}`,
                      background: active?'var(--accent-soft)':'transparent',
                      cursor: currentOperator?'pointer':'default', fontSize:11,
                      color: active?'var(--accent)':'var(--ink-2)' }}
                  >
                    {em}{count > 0 && <span style={{ fontSize:9, fontFamily:'var(--f-sys)' }}>{count}</span>}
                  </button>
                )
              })}
              <span style={{ flex:1 }}/>
              <Link href={`/entries/${e.id}`} className="sys" style={{ fontSize:10, color:'var(--accent)' }}>↗ MEGNYITÁS</Link>
              {currentOperator?.role === 'superadmin' && (
                <button onClick={handleDelete} style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', fontFamily:'var(--f-sys)', fontSize:10 }}>
                  ◢ TÖRLÉS
                </button>
              )}
            </div>
          </div>

          {/* Right aside */}
          <div className="entry-col-right" style={{ borderLeft:'1px solid var(--border-1)', display:'flex', flexDirection:'column' }}>
            {isVideo && e.media_url ? (
              <div style={{ height:160 }} onClick={ev=>ev.stopPropagation()}>
                <YouTubePlayer url={e.media_url}/>
              </div>
            ) : isImage ? (
              <div style={{ height:160, overflow:'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.media_url!} alt={e.media_label ?? ''} style={{ width:'100%', height:'100%', objectFit:'cover', opacity:.8 }}/>
              </div>
            ) : (
              <div className="fig-ph" style={{ height:160, margin:12 }}>
                <svg viewBox="0 0 200 120" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
                  {Array.from({length:24}).map((_,j) => {
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
              <span className="sys muted" style={{ fontSize:9 }}>◢ {e.id}</span>
              <span className="sys muted" style={{ fontSize:9 }}>◣ V.1</span>
            </div>
          </div>
        </div>

        {/* Comment composer */}
        <CommentComposer entryId={e.id} currentOperator={currentOperator}/>
      </div>
    </div>
  )
}

/* ─── Archive section ─── */
function Archive({ entries }: { entries: Entry[] }) {
  const byWeek: Record<number, Entry[]> = {}
  for (const e of entries) {
    const w = getWeekNum(e.created_at)
    if (!byWeek[w]) byWeek[w] = []
    byWeek[w].push(e)
  }
  const weeks = Object.keys(byWeek).map(Number).sort((a,b)=>b-a).slice(0,8)
  if (weeks.length === 0) return null

  return (
    <div style={{ padding:'40px 0', borderBottom:'1px solid var(--border-1)' }}>
      <Heading tag="◢ ARCHÍVUM" title="HETI VISSZATEKINTŐ" sub="Posztok hetek szerint csoportosítva."/>
      <div style={{ marginTop:24 }}>
        <table className="archive-table">
          <thead>
            <tr>
              <th>HÉT</th>
              <th>POSZTOK</th>
              <th>VIDEÓK</th>
              <th>TOP POSZT</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map(w => {
              const ws = byWeek[w]
              const videos = ws.filter(e => e.kind === 'VIDEÓ' || e.kind === 'ADÁS' || e.media_type === 'youtube')
              const top = ws.reduce((a,b) => (b.reads > a.reads ? b : a), ws[0])
              return (
                <tr key={w}>
                  <td className="sys" style={{ color:'var(--accent)', fontSize:11 }}>{w}. HÉT</td>
                  <td>{ws.length}</td>
                  <td>{videos.length}</td>
                  <td>
                    <Link href={`/entries/${top.id}`} style={{ color:'var(--ink-1)', fontSize:11 }}>
                      {top.title.slice(0, 40)}{top.title.length > 40 ? '…' : ''}
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─── Root export ─── */
interface HomeClientProps {
  entries: Entry[]
  operators: Operator[]
  threads: unknown[]
  currentOperator: Operator | null
}

export function HomeClient({ entries: initialEntries, currentOperator }: HomeClientProps) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries)
  const [filter, setFilter]   = useState<'MIND'|'SZÖVEG'|'KÉP'|'VIDEÓ'>('MIND')

  async function handlePost(id: string) {
    const entry = await fetchEntryById(id)
    if (entry) setEntries(prev => [{ ...(entry as Entry), reactions: {} }, ...prev])
  }

  function handleDelete(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const isVideo = (e: Entry) => e.kind === 'VIDEÓ' || e.kind === 'ADÁS' || e.media_type === 'youtube'
  const isImage = (e: Entry) => e.media_type === 'image' && !!e.media_url
  const filtered = entries.filter(e => {
    if (filter === 'MIND')   return true
    if (filter === 'VIDEÓ')  return isVideo(e)
    if (filter === 'KÉP')    return isImage(e) && !isVideo(e)
    return !isVideo(e)
  })

  return (
    <div className="shell">
      <Hero currentOperator={currentOperator}/>

      <div style={{ padding:'28px 0 0' }} id="feed">
        <PostPanel op={currentOperator} onPost={handlePost}/>

        {/* Feed header + filter */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <Heading tag="◢ BEJEGYZÉSEK" title="POSZT FOLYAM" sub="Posztok, képek és videók időrendben."/>
          <div style={{ display:'flex', gap:6 }}>
            {(['MIND','SZÖVEG','KÉP','VIDEÓ'] as const).map(f => (
              <button key={f} type="button" onClick={()=>setFilter(f)}
                className={`chip${filter===f?' chip-accent':''}`}
                style={{ cursor:'pointer' }}>
                {f === 'VIDEÓ' ? '▶ VIDEÓ' : f}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="panel" style={{ padding:'32px 24px', textAlign:'center', borderStyle:'dashed' }}>
            <div className="sys muted" style={{ fontSize:12 }}>
              {entries.length === 0 ? 'Még nincsenek bejegyzések.' : `Nincs találat a „${filter}" szűrőre.`}
            </div>
          </div>
        ) : (
          <div>{filtered.map((e,i) => <PostCard key={e.id} e={e} i={i} currentOperator={currentOperator} onDelete={handleDelete}/>)}</div>
        )}
      </div>

      <Archive entries={entries}/>
    </div>
  )
}
