'use client'

import { useState, useRef, useCallback, memo } from 'react'
import Link from 'next/link'
import { Chip } from '@/components/ui/Chip'
import { Panel } from '@/components/ui/Panel'
import { Meta } from '@/components/ui/Meta'
import { Heading } from '@/components/ui/Heading'
import { Avatar } from '@/components/ui/Avatar'
import { LiveTicks } from '@/components/ui/LiveTicks'
import { HeroCube } from '@/components/ui/HeroCube'
import { LangPicker } from '@/components/ui/LangPicker'
import { useI18n } from '@/hooks/useI18n'
import { YouTubePlayer, YouTubeThumbnail, extractYouTubeId } from '@/components/ui/YouTubePlayer'
import dynamic from 'next/dynamic'

const PostModal = dynamic(() => import('@/components/ui/PostModal').then(m => m.PostModal), { ssr: false })
import { createEntry, toggleReaction, fetchEntryById, deleteEntry, createSignal, getEntryComments, listMyDrafts, publishDraft } from '@/app/actions'
import { RolePresenceChip } from '@/components/ui/PresenceChip'
import type { Entry, Operator, Signal } from '@/lib/types'

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
function Hero({ currentOperator, postCount, totalLikes }: { currentOperator: Operator | null; postCount: number; totalLikes: number }) {
  const { t } = useI18n()
  return (
    <div className="r-hero" style={{ gap:32, padding:'40px 0 32px', borderBottom:'1px solid var(--border-1)', alignItems:'start' }}>

      {/* Left — title + sub + lang + CTA */}
      <div>
        <div style={{ display:'flex', gap:8, marginBottom:18 }}>
          <Chip kind="accent" dot>{t('hero.live')}</Chip>
          <Chip kind="cyan">{t('hero.link')}</Chip>
          <Chip kind="dash">V0.1.0</Chip>
        </div>
        <h1 className="display r-display" style={{ margin:0, color:'var(--ink-0)', lineHeight:.92 }}>
          F3XYKEE /<br/>
          <span style={{ color:'var(--accent)', textShadow:'0 0 12px rgba(24,233,104,.35)' }}>BLOG</span>
        </h1>
        <p className="muted" style={{ marginTop:18, fontSize:13, lineHeight:1.6, maxWidth:420 }}>
          {t('hero.sub')}
        </p>
        <div style={{ marginTop:14, marginBottom:20 }}>
          <LangPicker/>
        </div>
        <div className="hero-cta-row" style={{ display:'flex', gap:14, alignItems:'center', flexWrap:'wrap' }}>
          {!currentOperator && (
            <Link href="/gate" className="btn btn-primary">{t('hero.enter')}</Link>
          )}
          <Link href="#feed" className="btn">{t('hero.posts')}</Link>
          <div className="hero-cube-slot" aria-hidden style={{ display:'flex', alignItems:'center', marginLeft:400, marginTop:-90 }}>
            <HeroCube/>
          </div>
        </div>
      </div>

      {/* Right — UserCard */}
      <div className="hero-profile-col" style={{ display:'flex', flexDirection:'column', gap:20, marginTop:80 }}>

        {/* UserCard */}
        <div className="panel panel-hud panel-raised" style={{ position:'relative' }}>
          <span className="hud-br"/><span className="hud-bl"/>
          <div className="panel-header"><span className="label">◢ PROFIL</span> {t('hero.profile')}</div>
          <div className="panel-body">
            {currentOperator ? (
              <>
                <div style={{ display:'flex', gap:14, alignItems:'center', marginBottom:14 }}>
                  <div style={{ position:'relative' }}>
                    <Avatar id={currentOperator.id} src={currentOperator.avatar_url} size={56}/>
                    <span className="dot" style={{ position:'absolute', bottom:2, right:2 }}/>
                  </div>
                  <div>
                    <div className="head" style={{ fontSize:20, lineHeight:1 }}>{currentOperator.callsign}</div>
                    <div className="sys muted" style={{ marginTop:4 }}>LVL-0{currentOperator.level} · {currentOperator.role === 'operator' ? 'TAG' : currentOperator.role.toUpperCase()}</div>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:2, marginBottom:12 }}>
                  <Meta k={t('top.online')} v={t('top.online')}/>
                  <Meta k={t('archive.posts')} v={String(postCount)}/>
                  <Meta k={t('card.likes')} v={String(totalLikes)}/>
                </div>
                <div style={{ marginBottom:10 }}>
                  <div className="sys muted" style={{ fontSize:9, marginBottom:5 }}>{t('hero.link')}</div>
                  <LiveTicks count={20} height={22}/>
                </div>
              </>
            ) : (
              <div style={{ textAlign:'center', padding:'16px 0' }}>
                <div className="head" style={{ fontSize:16, marginBottom:10, color:'var(--ink-2)' }}>{t('hero.notlogged')}</div>
                <Link href="/gate" className="btn btn-primary" style={{ display:'inline-flex' }}>{t('hero.enter')}</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Post panel ─── */
function PostPanel({ op, onPost }: { op: Operator | null; onPost: (id: string) => void }) {
  const { t } = useI18n()
  const [open, setOpen]               = useState(true)
  const [kind, setKind]               = useState<'SZÖVEG'|'KÉP'|'VIDEÓ'>('SZÖVEG')
  const [title, setTitle]             = useState('')
  const [content, setContent]         = useState('')
  const [youtubeUrl, setYoutubeUrl]   = useState('')
  const [tags, setTags]               = useState('')
  const [priority, setPriority]       = useState(false)
  const [uploadedFile, setUploadedFile] = useState<{url:string;name:string;type:string}|null>(null)
  const [mediaLabel, setMediaLabel]   = useState('')
  const [uploading, setUploading]     = useState(false)
  const [uploadPct, setUploadPct]     = useState(0)
  const [dragOver, setDragOver]       = useState(false)
  const [error, setError]             = useState<string|null>(null)
  const [pending, setPending]         = useState(false)
  const [done, setDone]               = useState(false)
  const [savedDraft, setSavedDraft]   = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [drafts, setDrafts]           = useState<Entry[]>([])
  const [showDrafts, setShowDrafts]   = useState(false)
  const contentRef   = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load drafts on mount + on demand
  const refreshDrafts = useCallback(async () => {
    const res = await listMyDrafts()
    setDrafts(res.drafts as Entry[])
  }, [])

  if (!op || (op.role !== 'admin' && op.role !== 'superadmin')) return null

  function loadDraft(d: Entry) {
    setKind(d.media_type === 'youtube' ? 'VIDEÓ' : d.media_type === 'image' ? 'KÉP' : 'SZÖVEG')
    setTitle(d.title)
    setContent(d.content ?? '')
    setTags((d.sigs ?? []).join(', '))
    setPriority(d.priority)
    if (d.media_type === 'youtube' && d.media_url) {
      setYoutubeUrl(d.media_url); setUploadedFile(null); setMediaLabel('')
    } else if (d.media_url && d.media_type) {
      setUploadedFile({ url: d.media_url, name: d.media_label ?? '', type: d.media_type === 'image' ? 'image/jpeg' : 'audio/mpeg' })
      setMediaLabel(d.media_label ?? '')
      setYoutubeUrl('')
    } else {
      setUploadedFile(null); setMediaLabel(''); setYoutubeUrl('')
    }
    setShowDrafts(false)
    // Note: deleting the old draft after publish is handled when user submits as 'publish'
    sessionStorage.setItem('f3x_loaded_draft', d.id)
  }

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

  async function handleSubmit(mode: 'draft'|'publish') {
    if (!title.trim()) { setError('Cím megadása kötelező.'); return }
    if (mode === 'publish') {
      if (kind === 'VIDEÓ' && !youtubeUrl.trim()) { setError('YouTube URL megadása kötelező.'); return }
      if (kind === 'KÉP' && !uploadedFile) { setError('Kép feltöltése kötelező.'); return }
    }
    setPending(true); setError(null); setSavedDraft(false); setDone(false)
    const fd = new FormData()
    fd.set('title', title)
    fd.set('kind', kind === 'VIDEÓ' ? 'VIDEÓ' : 'POSZT')
    fd.set('content', content)
    fd.set('sigs', tags)
    fd.set('status', mode === 'draft' ? 'draft' : 'published')
    if (priority && mode === 'publish') fd.set('priority', 'on')
    if (kind === 'VIDEÓ' && youtubeUrl.trim()) {
      fd.set('media_type', 'youtube'); fd.set('media_url', youtubeUrl.trim()); fd.set('media_label', '')
    } else if (uploadedFile) {
      fd.set('media_type', uploadedFile.type.startsWith('audio/') ? 'audio' : 'image')
      fd.set('media_url', uploadedFile.url); fd.set('media_label', mediaLabel)
    } else {
      fd.set('media_type', ''); fd.set('media_url', ''); fd.set('media_label', '')
    }
    const res = await createEntry(fd)
    if (res?.error) { setError(res.error); setPending(false); return }

    // If we just published a loaded draft, delete the old draft row
    const loadedDraftId = sessionStorage.getItem('f3x_loaded_draft')
    if (mode === 'publish' && loadedDraftId) {
      await deleteEntry(loadedDraftId).catch(() => {})
      sessionStorage.removeItem('f3x_loaded_draft')
    }

    if (mode === 'draft') {
      setSavedDraft(true)
      setPending(false)
      refreshDrafts()
      setTimeout(() => setSavedDraft(false), 2000)
      return
    }

    setDone(true)
    setTitle(''); setContent(''); setYoutubeUrl(''); setTags(''); setUploadedFile(null); setMediaLabel(''); setPriority(false)
    if (res?.id) onPost(res.id)
    refreshDrafts()
    setTimeout(() => { setPending(false); setDone(false) }, 1800)
  }

  const ytId = extractYouTubeId(youtubeUrl)

  return (
    <Panel tag={`◢ ${t('post.new')}`} title={t('post.create')} className="panel-raised"
      chips={
        <div style={{ display:'flex', gap:6 }}>
          <button type="button"
            onClick={async () => { if (!showDrafts) await refreshDrafts(); setShowDrafts(s=>!s) }}
            className="btn btn-ghost btn-sm">
            ◢ VÁZLATOK{drafts.length>0 ? ` · ${drafts.length}` : ''}
          </button>
          <button type="button" onClick={()=>setOpen(o=>!o)} className="btn btn-ghost btn-sm">{open?t('post.close'):t('post.open')}</button>
        </div>
      }
      style={{ marginBottom:28 }}
    >
      {open && showDrafts && (
        <div style={{ marginBottom:14, padding:12, border:'1px dashed var(--border-1)', background:'rgba(0,0,0,.25)' }}>
          <div className="sys muted" style={{ fontSize:10, marginBottom:8, letterSpacing:'.14em' }}>◢ MENTETT VÁZLATOK</div>
          {drafts.length === 0 ? (
            <div className="sys muted" style={{ fontSize:11 }}>Nincsenek mentett vázlatok.</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {drafts.map(d => (
                <div key={d.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 8px', border:'1px solid var(--border-0)', background:'var(--bg-2)' }}>
                  <Chip kind="dash" style={{ fontSize:9 }}>{d.media_type==='youtube'?'VIDEÓ':d.media_type==='image'?'KÉP':'SZÖVEG'}</Chip>
                  <span className="head" style={{ fontSize:13, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.title || '(cím nélkül)'}</span>
                  <span className="sys muted" style={{ fontSize:9 }}>{new Date(d.created_at).toLocaleDateString('hu-HU',{month:'short',day:'numeric'})}</span>
                  <button type="button" onClick={()=>loadDraft(d)} className="btn btn-ghost btn-sm" style={{ padding:'2px 8px', fontSize:10, minHeight:0 }}>BETÖLT</button>
                  <button type="button"
                    onClick={async ()=>{ if(!confirm('Vázlat törlése?')) return; await deleteEntry(d.id); refreshDrafts() }}
                    className="btn btn-ghost btn-sm"
                    style={{ padding:'2px 8px', fontSize:10, minHeight:0, color:'var(--red)', borderColor:'rgba(255,58,58,.3)' }}>TÖRÖL</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {open && (
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit('publish') }}>
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
                value={title} onChange={ev=>setTitle(ev.target.value)}
                placeholder={kind==='VIDEÓ' ? t('post.title_video') : kind==='KÉP' ? t('post.title_image') : t('post.title_text')}
                style={{ fontSize:17 }}/>

              {kind === 'VIDEÓ' && (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <span className="sys muted" style={{ fontSize:10 }}>{t('post.yt_url')}</span>
                  <input className="input" value={youtubeUrl} onChange={e=>setYoutubeUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=…"/>
                  {ytId && <YouTubeThumbnail url={youtubeUrl} height={110}/>}
                </div>
              )}

              {(kind === 'KÉP' || kind === 'SZÖVEG') && (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <span className="sys muted" style={{ fontSize:10 }}>
                    {kind==='KÉP' ? t('post.image_required') : t('post.image_optional')}
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
                        <div className="sys muted" style={{ fontSize:11 }}>{t('post.uploading')} · {uploadPct}%</div>
                        <div className="bar-track"><div className="bar-fill" style={{ width:`${uploadPct}%` }}/></div>
                      </div>
                    ) : uploadedFile ? (
                      <span className="sys" style={{ color:'var(--accent)', fontSize:11 }}>✓ {uploadedFile.name}</span>
                    ) : (
                      <span className="sys muted" style={{ fontSize:11 }}>{t('post.upload_hint')}</span>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" style={{ display:'none' }}
                    accept="image/gif,image/jpeg,image/png,image/webp,audio/mpeg,audio/ogg,audio/wav,audio/flac"
                    onChange={ev=>handleFile(ev.target.files?.[0])}/>
                  {uploadedFile && <input className="input" value={mediaLabel} onChange={ev=>setMediaLabel(ev.target.value)} placeholder={t('post.caption')} style={{ fontSize:12 }}/>}
                </div>
              )}

              <div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                  <span className="sys muted" style={{ fontSize:10 }}>{kind==='VIDEÓ' ? t('post.body_optional') : t('post.body')}</span>
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
                  placeholder={kind==='VIDEÓ'?t('post.body_ph_video'):t('post.body_ph')}/>
              </div>

              <div style={{ display:'flex', gap:8, alignItems:'center', paddingTop:8, borderTop:'1px dashed var(--border-1)' }}>
                <span className="sys muted" style={{ fontSize:10, flexShrink:0 }}>{t('post.tags')}</span>
                <input className="input" value={tags} onChange={ev=>setTags(ev.target.value)}
                  placeholder={t('post.tags_ph')} style={{ flex:1, fontSize:12 }}/>
              </div>

              {error && <div style={{ padding:'8px 12px', background:'rgba(255,58,58,.1)', border:'1px solid var(--red)', color:'var(--red)', fontFamily:'var(--f-sys)', fontSize:11 }}>◢ {error}</div>}
              {done  && <div style={{ padding:'8px 12px', background:'rgba(24,233,104,.1)', border:'1px solid var(--accent)', color:'var(--accent)', fontFamily:'var(--f-sys)', fontSize:11 }}>{t('post.created')}</div>}
              {savedDraft && <div style={{ padding:'8px 12px', background:'rgba(77,240,255,.1)', border:'1px solid var(--cyan)', color:'var(--cyan)', fontFamily:'var(--f-sys)', fontSize:11 }}>◢ Vázlat mentve!</div>}
            </div>

            {/* Right sidebar */}
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div className="sys muted" style={{ fontSize:10 }}>{t('post.meta')}</div>
              <Meta k={t('post.kind_label')} v={kind}/>
              <Meta k={t('post.author')} v={op.callsign}/>
              {kind==='VIDEÓ' && ytId && <Meta k={t('post.video_id')} v={ytId}/>}
              <div style={{ borderTop:'1px solid var(--border-1)', paddingTop:10, marginTop:4, display:'flex', flexDirection:'column', gap:6 }}>
                <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                  <input type="checkbox" name="priority" checked={priority} onChange={ev=>setPriority(ev.target.checked)} style={{ accentColor:'var(--accent)' }}/>
                  <span className="sys muted" style={{ fontSize:11 }}>{t('post.priority')}</span>
                </label>
                <div style={{ display:'flex', gap:6 }}>
                  <button type="button" onClick={() => handleSubmit('draft')}
                    className="btn btn-ghost btn-sm"
                    style={{ flex:1, justifyContent:'center' }}
                    disabled={pending || uploading || !title.trim()}
                  >{t('post.draft')}</button>
                  <button type="button" onClick={() => setShowPreview(true)}
                    className="btn btn-ghost btn-sm"
                    style={{ flex:1, justifyContent:'center' }}
                    disabled={!title.trim()}
                  >{t('post.preview')}</button>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} disabled={pending || uploading}>
                  {done ? t('post.success') : pending ? t('post.publishing') : t('post.publish')}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
      {showPreview && (
        <PreviewModal
          title={title}
          content={content}
          tags={tags}
          kind={kind}
          priority={priority}
          youtubeUrl={youtubeUrl}
          uploadedFile={uploadedFile}
          mediaLabel={mediaLabel}
          op={op}
          onClose={() => setShowPreview(false)}
        />
      )}
    </Panel>
  )
}

/* ─── Preview modal ─── */
function PreviewModal({
  title, content, tags, kind, priority, youtubeUrl, uploadedFile, mediaLabel, op, onClose,
}: {
  title: string; content: string; tags: string;
  kind: 'SZÖVEG'|'KÉP'|'VIDEÓ'; priority: boolean;
  youtubeUrl: string;
  uploadedFile: { url:string; name:string; type:string } | null;
  mediaLabel: string;
  op: Operator;
  onClose: () => void;
}) {
  function sanitize(html: string) {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<iframe[\s\S]*?>/gi, '')
      .replace(/\s(on\w+)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  }
  const sigList = tags.split(',').map(s => s.trim()).filter(Boolean)
  const isVideo = kind === 'VIDEÓ'
  const isImage = kind === 'KÉP' && uploadedFile?.type.startsWith('image/')
  const isAudio = uploadedFile?.type.startsWith('audio/')

  return (
    <div onClick={(e)=>{ if (e.target===e.currentTarget) onClose() }}
      style={{ position:'fixed', inset:0, zIndex:9000, background:'rgba(0,0,0,.78)', backdropFilter:'blur(4px)', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'40px 16px', overflowY:'auto' }}>
      <div style={{ position:'relative', width:'100%', maxWidth:880, background:'var(--bg-1)', border:'1px solid var(--accent)', boxShadow:'0 0 0 1px rgba(24,233,104,.15), 0 30px 80px -20px rgba(0,0,0,.9)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderBottom:'1px solid var(--border-1)', background:'var(--bg-2)' }}>
          <span className="dot dot-mag"/>
          <span className="sys" style={{ fontSize:10, letterSpacing:'.18em', color:'var(--magenta)' }}>◢ ELŐNÉZET · NEM PUBLIKÁLT</span>
          <span style={{ flex:1 }}/>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding:'4px 10px', fontSize:11, minHeight:0 }}>✕ BEZÁR</button>
        </div>
        <div style={{ padding:'24px 28px 28px' }}>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:14 }}>
            <Chip kind={priority ? 'solid' : 'accent'}>{isVideo ? 'VIDEÓ' : isImage ? 'KÉP' : isAudio ? 'HANG' : 'SZÖVEG'}</Chip>
            {priority && <Chip kind="solid" dot>KIEMELT</Chip>}
            {sigList.map(s => <Chip key={s} kind="dash">{s}</Chip>)}
          </div>
          <h2 className="head" style={{ margin:0, fontSize:32, lineHeight:1.1, color:'var(--ink-0)' }}>{title || '(cím nélkül)'}</h2>
          <div style={{ display:'flex', gap:10, alignItems:'center', marginTop:14, marginBottom:18 }}>
            <Avatar id={op.id} src={op.avatar_url} size={32}/>
            <div>
              <div className="head" style={{ fontSize:13 }}>{op.callsign}</div>
              <div className="sys muted" style={{ fontSize:10 }}>LVL-0{op.level} · ELŐNÉZET</div>
            </div>
          </div>
          {isVideo && youtubeUrl && (
            <div style={{ marginBottom:18 }}><YouTubePlayer url={youtubeUrl}/></div>
          )}
          {isImage && uploadedFile && (
            <div style={{ marginBottom:18 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={uploadedFile.url} alt={mediaLabel} loading="lazy" style={{ width:'100%', maxHeight:520, objectFit:'contain', display:'block', background:'var(--bg-2)' }}/>
              {mediaLabel && <div className="sys muted" style={{ fontSize:10, marginTop:6 }}>{mediaLabel}</div>}
            </div>
          )}
          {content && (
            <div style={{ fontSize:14, lineHeight:1.7, color:'var(--ink-0)' }}
              dangerouslySetInnerHTML={{ __html: sanitize(content) }}/>
          )}
          {!content && !youtubeUrl && !uploadedFile && (
            <div className="sys muted" style={{ fontSize:11, textAlign:'center', padding:'20px 0' }}>Még nincs tartalom hozzáadva.</div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Inline comment thread (composer + list + collapse) ─── */
function CommentThread({
  entryId, currentOperator, initialComments, initialCount,
}: {
  entryId: string
  currentOperator: Operator | null
  initialComments: Signal[]
  initialCount: number
}) {
  const { t, lang } = useI18n()
  const localeMap: Record<string, string> = { hu:'hu-HU', en:'en-US', de:'de-DE', es:'es-ES', fr:'fr-FR', no:'no-NO', sv:'sv-SE' }
  const [comments, setComments] = useState<Signal[]>(initialComments)
  const [totalCount, setTotalCount] = useState(initialCount)
  const [expanded, setExpanded] = useState(false)
  const [text, setText] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [imgUploading, setImgUploading] = useState(false)
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentOperator) return
    if (!text.trim() && !image) return
    setPending(true); setError(null)
    const fd = new FormData()
    fd.append('entry_id', entryId)
    if (text.trim()) fd.append('text', text.trim())
    if (image) fd.append('image_url', image)
    const res = await createSignal(fd)
    if (res?.error) { setError(res.error); setPending(false); return }
    // re-fetch full thread so the new comment shows up reliably
    const fresh = await getEntryComments(entryId)
    setComments(fresh.signals as unknown as Signal[])
    setTotalCount(fresh.signals.length)
    setExpanded(true)
    setText(''); setImage(null); setDone(true); setPending(false)
    setTimeout(() => setDone(false), 1500)
  }

  async function uploadImage(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]
    if (!file) return
    setImgUploading(true); setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Feltöltési hiba')
      setImage(data.url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Feltöltési hiba')
    } finally {
      setImgUploading(false)
      if (ev.target) ev.target.value = ''
    }
  }

  async function loadAll() {
    if (expanded) { setExpanded(false); return }
    const fresh = await getEntryComments(entryId)
    setComments(fresh.signals as unknown as Signal[])
    setTotalCount(fresh.signals.length)
    setExpanded(true)
  }

  const visible = expanded ? comments : comments.slice(-3)
  const hiddenCount = Math.max(0, totalCount - visible.length)

  const fmt = (iso: string) => {
    try { return new Date(iso).toLocaleString(localeMap[lang] ?? 'hu-HU', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) } catch { return '' }
  }

  return (
    <div style={{ borderTop:'1px solid var(--border-0)', background:'rgba(0,0,0,.15)' }}>
      {/* Thread header */}
      {totalCount > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px', borderBottom:'1px solid var(--border-0)' }}>
          <span className="sys muted" style={{ fontSize:10 }}>◢ {totalCount} {t('post.comments')}</span>
          <span style={{ flex:1 }}/>
          {!expanded && hiddenCount > 0 && (
            <button onClick={loadAll} className="sys" style={{ fontSize:10, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', letterSpacing:'.12em' }}>
              ▾ TÖBB ({hiddenCount})
            </button>
          )}
          {expanded && totalCount > 3 && (
            <button onClick={() => setExpanded(false)} className="sys" style={{ fontSize:10, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', letterSpacing:'.12em' }}>
              ▴ KEVESEBB
            </button>
          )}
        </div>
      )}

      {/* Comment list */}
      {visible.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column' }}>
          {visible.map((s, idx) => (
            <div key={s.id} style={{ display:'grid', gridTemplateColumns:'32px 1fr', gap:10, padding:'10px 14px', borderBottom: idx < visible.length - 1 ? '1px solid var(--border-0)' : 'none' }}>
              <Link href={s.operator?.callsign ? `/operators/${s.operator.callsign}` : '#'} style={{ textDecoration:'none' }}>
                <Avatar id={s.operator_id} src={s.operator?.avatar_url} lastSeen={s.operator?.last_seen} size={32}/>
              </Link>
              <div style={{ minWidth:0 }}>
                <div style={{ display:'flex', gap:8, alignItems:'baseline', marginBottom:3, flexWrap:'wrap' }}>
                  <Link href={s.operator?.callsign ? `/operators/${s.operator.callsign}` : '#'} className="head" style={{ fontSize:12, color: s.operator?.chat_color || 'var(--ink-0)', textDecoration:'none' }}>
                    {s.operator?.callsign ?? s.operator_id}
                  </Link>
                  <RolePresenceChip role={s.operator?.role} lastSeen={s.operator?.last_seen} fontSize={8}/>
                  <span className="sys muted" style={{ fontSize:9 }}>{fmt(s.created_at)}</span>
                </div>
                {s.text && <div style={{ fontSize:12.5, lineHeight:1.55, color:'var(--ink-0)', wordBreak:'break-word', whiteSpace:'pre-wrap' }}>{s.text}</div>}
                {s.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.image_url} alt="" loading="lazy" decoding="async" style={{ marginTop:6, maxWidth:'100%', maxHeight:280, objectFit:'contain', display:'block', background:'var(--bg-2)', border:'1px solid var(--border-1)' }}/>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Composer */}
      {currentOperator ? (
        <form onSubmit={submit} className="comment-composer" style={{ display:'flex', gap:6, padding:'8px 12px', alignItems:'flex-start', flexWrap:'wrap' }}>
          <Avatar id={currentOperator.id} src={currentOperator.avatar_url} lastSeen={currentOperator.last_seen} size={28}/>
          <div style={{ flex:1, minWidth:160, display:'flex', flexDirection:'column', gap:4 }}>
            <textarea
              className="input"
              style={{ width:'100%', minHeight:36, maxHeight:120, resize:'vertical', fontSize:13, padding:'6px 10px' }}
              placeholder={t('comment.placeholder')}
              value={text}
              onChange={e=>setText(e.target.value)}
              rows={1}
            />
            {image && (
              <div style={{ position:'relative', maxWidth:200 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="" style={{ width:'100%', maxHeight:140, objectFit:'contain', background:'var(--bg-2)', border:'1px solid var(--border-1)' }}/>
                <button type="button" onClick={()=>setImage(null)} style={{ position:'absolute', top:2, right:2, width:20, height:20, background:'rgba(0,0,0,.7)', border:'1px solid var(--red)', color:'var(--red)', cursor:'pointer', fontSize:10 }}>✕</button>
              </div>
            )}
            {error && <div style={{ fontSize:10, color:'var(--red)', fontFamily:'var(--f-sys)' }}>◢ {error}</div>}
          </div>
          <button type="button" className="btn btn-ghost btn-sm" style={{ padding:'4px 8px', opacity: imgUploading ? .4 : .8, minHeight:0 }}
            disabled={imgUploading}
            onClick={()=>fileInputRef.current?.click()} title={t('comment.attach')}>{imgUploading ? '…' : '⊡'}</button>
          <input ref={fileInputRef} type="file" style={{ display:'none' }} accept="image/gif,image/jpeg,image/png,image/webp" onChange={uploadImage}/>
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending || (!text.trim() && !image)} style={{ minHeight:0 }}>
            {done ? '✓' : pending ? '…' : '↗'}
          </button>
        </form>
      ) : (
        <div className="sys muted" style={{ padding:'10px 14px', fontSize:11, textAlign:'center', borderTop:'1px dashed var(--border-1)' }}>
          <Link href="/gate" style={{ color:'var(--accent)' }}>◢ BELÉPÉS</Link> · kommenteléshez
        </div>
      )}
    </div>
  )
}

/* ─── Post card (blog style) ─── */
function PostCard({ e, i, currentOperator, onDelete, onOpen }: { e: Entry; i: number; currentOperator: Operator | null; onDelete: (id: string) => void; onOpen: (id: string) => void }) {
  const { t, lang } = useI18n()
  const [reactions, setReactions] = useState<Record<string,number>>(e.reactions ?? {})
  const [userRx, setUserRx]       = useState<string[]>([])
  const [rxPending, setRxPending] = useState<string|null>(null)
  const [deleting, setDeleting]   = useState(false)
  const isVideo  = e.kind === 'VIDEÓ' || e.kind === 'ADÁS' || e.media_type === 'youtube'
  const isImage  = e.media_type === 'image' && e.media_url
  const week     = getWeekNum(e.created_at)
  const localeMap: Record<string, string> = { hu:'hu-HU', en:'en-US', de:'de-DE', es:'es-ES', fr:'fr-FR', no:'no-NO', sv:'sv-SE' }
  const date     = new Date(e.created_at).toLocaleDateString(localeMap[lang] ?? 'hu-HU', { month:'short', day:'numeric' })
  const totalRx  = EMOJIS.reduce((s,em) => s + (reactions[em] ?? 0), 0)

  async function handleDelete() {
    if (!confirm(t('card.confirm_delete'))) return
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

        {/* 2-column layout: 140px gutter | 1fr content */}
        <div className="entry-card-grid" style={{ display:'grid', gridTemplateColumns:'140px 1fr', borderBottom:'1px solid var(--border-1)' }}>

          {/* Left gutter */}
          <div style={{ padding:'16px 12px', borderRight:'1px solid var(--border-1)', display:'flex', flexDirection:'column', gap:8, background:'rgba(0,0,0,.2)' }}>
            <div className="sys dim" style={{ fontSize:9 }}>#{String(i+1).padStart(4,'0')}</div>
            <div className="mono muted" style={{ fontSize:10, lineHeight:1.5 }}>{date}<br/>{week}. {t('archive.week')}</div>
            <Chip kind={e.priority ? 'solid' : 'accent'} style={{ fontSize:9, padding:'2px 5px' }}>
              {isVideo ? t('post.video') : isImage ? t('post.image') : t('post.text')}
            </Chip>
            <div style={{ flex:1 }}/>
            <div style={{ display:'flex', flexDirection:'column', gap:4, alignItems:'flex-start' }}>
              <div className="sys muted" style={{ fontSize:9 }}>{t('card.author')}</div>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <Avatar id={e.operator_id} src={e.operator?.avatar_url} lastSeen={e.operator?.last_seen} size={24}/>
                <span className="sys" style={{ fontSize:10 }}>{e.operator?.callsign ?? '—'}</span>
              </div>
            </div>
          </div>

          {/* Content column */}
          <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {e.sigs.map(s=><Chip key={s} kind="dash">{s}</Chip>)}
              {e.priority && <Chip kind="solid" dot>{t('card.featured')}</Chip>}
            </div>
            <h3 className="entry-title head" style={{ margin:0, fontSize:e.priority?26:20, lineHeight:1.08, color:'var(--ink-0)' }}>
              {e.title}
            </h3>
            {e.excerpt && (
              <p style={{ margin:0, color:'var(--ink-1)', fontSize:13, lineHeight:1.6, maxWidth:700 }}>
                {e.excerpt}
              </p>
            )}

            {/* Inline media */}
            {isVideo && e.media_url && (
              <div style={{ marginTop:4 }} onClick={ev=>ev.stopPropagation()}>
                <YouTubePlayer url={e.media_url}/>
              </div>
            )}
            {isImage && e.media_url && (
              <div style={{ marginTop:4, maxHeight:360, overflow:'hidden', borderRadius:2 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.media_url} alt={e.media_label ?? ''} loading="lazy" decoding="async" style={{ width:'100%', height:'auto', maxHeight:520, objectFit:'contain', opacity:.95, display:'block', background:'var(--bg-2)' }}/>
                {e.media_label && <div className="sys muted" style={{ fontSize:10, marginTop:4 }}>{e.media_label}</div>}
              </div>
            )}

            {/* Reactions + stats */}
            <div style={{ display:'flex', gap:8, alignItems:'center', paddingTop:8, borderTop:'1px dashed var(--border-1)', flexWrap:'wrap' }}>
              {EMOJIS.map(em => {
                const count = reactions[em] ?? 0
                const active = userRx.includes(em)
                return (
                  <button key={em} onClick={()=>handleReact(em)} disabled={rxPending !== null}
                    style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 14px',
                      border:`1px solid ${active?'var(--accent)':'var(--border-1)'}`,
                      background: active?'var(--accent-soft)':'transparent',
                      cursor: currentOperator?'pointer':'default', fontSize:18,
                      color: active?'var(--accent)':'var(--ink-2)', borderRadius:2 }}
                  >
                    {em}{count > 0 && <span style={{ fontSize:12, fontFamily:'var(--f-sys)' }}>{count}</span>}
                  </button>
                )
              })}
              <span style={{ flex:1 }}/>
              <span className="sys muted" style={{ fontSize:10 }}>◢ {e.reads} {t('card.reads')}</span>
              {totalRx > 0 && <span className="sys muted" style={{ fontSize:10 }}>◢ {totalRx} {t('card.likes')}</span>}
              <button onClick={() => onOpen(e.id)} className="sys" style={{ fontSize:10, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--f-sys)', letterSpacing:'.12em' }}>{t('card.open')}</button>
              {currentOperator?.role === 'superadmin' && (
                <button onClick={handleDelete} style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', fontFamily:'var(--f-sys)', fontSize:10 }}>
                  {t('card.delete')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Comment thread */}
        <CommentThread
          entryId={e.id}
          currentOperator={currentOperator}
          initialComments={e.initialComments ?? []}
          initialCount={e.commentCount ?? 0}
        />
      </div>
    </div>
  )
}
const PostCardMemo = memo(PostCard, (a, b) =>
  a.e.id === b.e.id &&
  a.e.reads === b.e.reads &&
  a.e.commentCount === b.e.commentCount &&
  a.currentOperator?.id === b.currentOperator?.id &&
  a.i === b.i
)

/* ─── Archive section ─── */
function Archive({ entries, onOpen }: { entries: Entry[]; onOpen: (id: string) => void }) {
  const { t } = useI18n()
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
      <Heading tag={t('archive.tag')} title={t('archive.title')} sub={t('archive.sub')}/>
      <div style={{ marginTop:24 }}>
        <table className="archive-table">
          <thead>
            <tr>
              <th>{t('archive.week')}</th>
              <th>{t('archive.posts')}</th>
              <th>{t('archive.videos')}</th>
              <th>{t('archive.top')}</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map(w => {
              const ws = byWeek[w]
              const videos = ws.filter(e => e.kind === 'VIDEÓ' || e.kind === 'ADÁS' || e.media_type === 'youtube')
              const top = ws.reduce((a,b) => (b.reads > a.reads ? b : a), ws[0])
              return (
                <tr key={w}>
                  <td className="sys" style={{ color:'var(--accent)', fontSize:11 }}>{w}. {t('archive.week')}</td>
                  <td>{ws.length}</td>
                  <td>{videos.length}</td>
                  <td>
                    <button onClick={() => onOpen(top.id)} style={{ color:'var(--ink-1)', fontSize:11, background:'none', border:'none', padding:0, cursor:'pointer', textAlign:'left', textDecoration:'underline dotted var(--border-1)' }}>
                      {top.title.slice(0, 40)}{top.title.length > 40 ? '…' : ''}
                    </button>
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
  postCount?: number
  totalLikes?: number
}

export function HomeClient({ entries: initialEntries, currentOperator, postCount = 0, totalLikes = 0 }: HomeClientProps) {
  const { t } = useI18n()
  const [entries, setEntries] = useState<Entry[]>(initialEntries)
  const [filter, setFilter]   = useState<'MIND'|'SZÖVEG'|'KÉP'|'VIDEÓ'>('MIND')
  const [openEntryId, setOpenEntryId] = useState<string | null>(null)

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
      <Hero currentOperator={currentOperator} postCount={postCount} totalLikes={totalLikes}/>

      <div style={{ padding:'28px 0 0' }} id="feed">
        <PostPanel op={currentOperator} onPost={handlePost}/>

        {/* Feed header + filter */}
        <div className="feed-head-row" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:18, flexWrap:'wrap' }}>
          <Heading tag={t('feed.head_tag')} title={t('feed.head_title')} sub={t('feed.head_sub')}/>
          <div className="feed-filter-chips" style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {(['MIND','SZÖVEG','KÉP','VIDEÓ'] as const).map(f => {
              const labelMap = { MIND: t('feed.all'), SZÖVEG: t('post.text'), KÉP: t('post.image'), 'VIDEÓ': '▶ '+t('post.video') }
              return (
                <button key={f} type="button" onClick={()=>setFilter(f)}
                  className={`chip${filter===f?' chip-accent':''}`}
                  style={{ cursor:'pointer' }}>
                  {labelMap[f]}
                </button>
              )
            })}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="panel" style={{ padding:'32px 24px', textAlign:'center', borderStyle:'dashed' }}>
            <div className="sys muted" style={{ fontSize:12 }}>
              {entries.length === 0 ? t('feed.empty') : t('feed.no_match')}
            </div>
          </div>
        ) : (
          <div>{filtered.map((e,i) => <PostCardMemo key={e.id} e={e} i={i} currentOperator={currentOperator} onDelete={handleDelete} onOpen={setOpenEntryId}/>)}</div>
        )}
      </div>

      <Archive entries={entries} onOpen={setOpenEntryId}/>

      <PostModal entryId={openEntryId} currentOperator={currentOperator} onClose={() => setOpenEntryId(null)}/>
    </div>
  )
}
