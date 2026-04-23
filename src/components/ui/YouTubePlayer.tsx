'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

/* ─── YT IFrame API helpers ─── */
declare global {
  interface Window {
    YT: { Player: new (el: HTMLElement, opts: object) => YTPlayer; PlayerState: Record<string, number> }
    onYouTubeIframeAPIReady?: () => void
    _ytScriptLoaded?: boolean
    _ytReadyQueue?: (() => void)[]
  }
}
interface YTPlayer {
  playVideo(): void; pauseVideo(): void; mute(): void; unMute(): void
  setVolume(v: number): void; seekTo(t: number, a: boolean): void
  getCurrentTime(): number; getDuration(): number
  setPlaybackQuality(q: string): void; getAvailableQualityLevels(): string[]
  destroy(): void
}

function ensureYTScript() {
  if (typeof window === 'undefined' || window._ytScriptLoaded) return
  window._ytScriptLoaded = true
  window._ytReadyQueue = window._ytReadyQueue ?? []
  const prev = window.onYouTubeIframeAPIReady
  window.onYouTubeIframeAPIReady = () => {
    if (prev) prev()
    window._ytReadyQueue?.splice(0).forEach(fn => { try { fn() } catch {} })
  }
  const s = document.createElement('script')
  s.src = 'https://www.youtube.com/iframe_api'
  document.head.appendChild(s)
}

function onYTReady(cb: () => void) {
  if (window.YT?.Player) { cb(); return }
  window._ytReadyQueue = window._ytReadyQueue ?? []
  window._ytReadyQueue.push(cb)
}

const Q_LABELS: Record<string, string> = {
  hd1080:'1080p', hd720:'720p', large:'480p', medium:'360p', small:'240p', tiny:'144p',
}
const STATIC_QUALITIES = ['hd1080','hd720','large','medium','small','tiny']

function fmtTime(s: number) {
  if (!s || isNaN(s)) return '0:00'
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2,'0')}`
}

export function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url.trim())
    if (u.hostname.includes('youtube.com')) {
      return u.searchParams.get('v') ?? u.pathname.split('/embed/')[1]?.split(/[?&]/)[0] ?? null
    }
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0] || null
  } catch {}
  return null
}

/* ─── Quality dropdown ─── */
function QualityDropdown({ quality, qualities, onChange }: { quality: string; qualities: string[]; onChange: (q: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  return (
    <div className="yt-quality-wrap" ref={ref}>
      <button type="button" className={`yt-quality-btn${open?' open':''}`} onClick={()=>setOpen(o=>!o)}>
        <span>{Q_LABELS[quality] ?? quality}</span>
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ transition:'transform .2s', transform: open?'rotate(180deg)':'none' }}>
          <path d="M1.5 2.5L4 5.5L6.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="yt-quality-menu open">
          {qualities.map(q => (
            <button key={q} type="button" className={`yt-quality-option${q===quality?' active':''}`}
              onClick={()=>{ onChange(q); setOpen(false) }}>
              {Q_LABELS[q] ?? q}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Core player ─── */
interface CoreProps {
  videoId: string
  initialTime?: number
  initialQuality?: string | null
  isModal?: boolean
  onExpand?: () => void
  onClose?: () => void
  onTimeUpdate?: (t: number) => void
  onQualityChange?: (q: string) => void
}

function PlayerCore({ videoId, initialTime = 0, initialQuality = null, isModal, onExpand, onClose, onTimeUpdate, onQualityChange }: CoreProps) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const playerRef     = useRef<YTPlayer | null>(null)
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const desiredQRef   = useRef<string | null>(initialQuality)
  const enforceRef    = useRef(0)

  const [volume, setVolume]           = useState(80)
  const [muted, setMuted]             = useState(false)
  const [currentTime, setCurrentTime] = useState(initialTime)
  const [duration, setDuration]       = useState(0)
  const [playing, setPlaying]         = useState(false)
  const [ready, setReady]             = useState(false)
  const [quality, setQuality]         = useState(initialQuality ?? 'medium')
  const [avail, setAvail]             = useState<string[]>([])

  useEffect(() => {
    ensureYTScript()
    if (!videoId) return
    let destroyed = false

    onYTReady(() => {
      if (destroyed || !containerRef.current) return
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: { rel:0, modestbranding:1, controls:0, iv_load_policy:3, disablekb:1, fs:0, playsinline:1, start: Math.floor(initialTime) },
        events: {
          onReady: (ev: { target: YTPlayer }) => {
            if (destroyed) return
            ev.target.setVolume(80)
            setDuration(ev.target.getDuration() || 0)
            const aq = ev.target.getAvailableQualityLevels?.() ?? []
            const filtered = aq.filter((q: string) => Q_LABELS[q])
            setAvail(filtered.length > 0 ? filtered : STATIC_QUALITIES)
            if (desiredQRef.current) { enforceRef.current = 0; ev.target.setPlaybackQuality(desiredQRef.current) }
            if (initialTime > 0) { ev.target.seekTo(initialTime, true); ev.target.playVideo?.() }
            setReady(true)
          },
          onStateChange: (ev: { data: number }) => {
            const YTS = window.YT.PlayerState
            if (ev.data === YTS.PLAYING) {
              setPlaying(true)
              setAvail(prev => {
                if (prev.length > 0) return prev
                const aq = playerRef.current?.getAvailableQualityLevels?.() ?? []
                const f = aq.filter((q: string) => Q_LABELS[q])
                return f.length > 0 ? f : STATIC_QUALITIES
              })
              clearInterval(timerRef.current!)
              timerRef.current = setInterval(() => {
                const p = playerRef.current; if (!p) return
                const t = p.getCurrentTime?.() || 0
                setCurrentTime(t); onTimeUpdate?.(t)
                if (!duration) setDuration(p.getDuration?.() || 0)
              }, 500)
            } else {
              setPlaying(ev.data === window.YT.PlayerState.BUFFERING)
              clearInterval(timerRef.current!)
              if (ev.data === window.YT.PlayerState.PAUSED) {
                const t = playerRef.current?.getCurrentTime?.() || 0
                setCurrentTime(t); onTimeUpdate?.(t)
              }
            }
          },
          onPlaybackQualityChange: (ev: { data: string }) => {
            const actual = ev.data || 'medium'
            const desired = desiredQRef.current
            if (desired && actual !== desired && enforceRef.current < 2) {
              enforceRef.current++; playerRef.current?.setPlaybackQuality?.(desired); return
            }
            desiredQRef.current = null; enforceRef.current = 0
            setQuality(actual); onQualityChange?.(actual)
          },
        },
      })
    })

    return () => {
      destroyed = true; desiredQRef.current = null; enforceRef.current = 0
      clearInterval(timerRef.current!)
      try { playerRef.current?.destroy?.() } catch {}
      playerRef.current = null
      setReady(false); setPlaying(false); setAvail([])
    }
  }, [videoId])

  const togglePlay = useCallback(() => {
    const p = playerRef.current; if (!p) return
    playing ? p.pauseVideo?.() : p.playVideo?.()
  }, [playing])

  const toggleMute = useCallback(() => {
    const p = playerRef.current; if (!p) return
    if (muted) { p.unMute?.(); p.setVolume?.(volume); setMuted(false) }
    else { p.mute?.(); setMuted(true) }
  }, [muted, volume])

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value)
    setVolume(v); playerRef.current?.setVolume?.(v)
    if (muted && v > 0) { playerRef.current?.unMute?.(); setMuted(false) }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration
    playerRef.current?.seekTo?.(t, true); setCurrentTime(t); onTimeUpdate?.(t)
  }

  const handleQuality = useCallback((q: string) => {
    desiredQRef.current = q; enforceRef.current = 0
    playerRef.current?.setPlaybackQuality(q); setQuality(q); onQualityChange?.(q)
  }, [onQualityChange])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className={`yt-player-wrap${isModal?' yt-modal-player':''}`}>
      <div className="yt-video-area">
        <div ref={containerRef} className="yt-iframe-slot"/>
        {ready && (
          <button className="yt-play-overlay" onClick={togglePlay} title={playing?'Szünet':'Lejátszás'}>
            {!playing && <span className="yt-play-overlay-icon">▶</span>}
          </button>
        )}
        <button className="yt-expand-btn" onClick={isModal ? onClose : onExpand} title={isModal?'Bezárás':'Nagyítás'}>
          {isModal ? '✕' : '⛶'}
        </button>
      </div>
      <div className="yt-controls">
        <button className="yt-play-btn" onClick={togglePlay} disabled={!ready}>
          {playing ? '❚❚' : '▶'}
        </button>
        <span className="yt-time">{fmtTime(currentTime)}</span>
        <div className="yt-progress" onClick={handleSeek} title="Kattints a tekeréshez">
          <div className="yt-progress-fill" style={{ width:`${progress}%` }}/>
        </div>
        <span className="yt-time">{fmtTime(duration)}</span>
        <button className="yt-mute-btn" onClick={toggleMute} title={muted?'Hang be':'Némítás'}>
          {muted ? '🔇' : '🔊'}
        </button>
        <input type="range" min="0" max="100" value={muted?0:volume} onChange={handleVolume}
          className="yt-volume-slider" title={`Hangerő: ${volume}%`}/>
        {ready && avail.length > 0 && (
          <QualityDropdown quality={quality} qualities={avail} onChange={handleQuality}/>
        )}
      </div>
    </div>
  )
}

/* ─── Public export ─── */
export function YouTubePlayer({ url }: { url: string }) {
  const id = extractYouTubeId(url)
  const [expanded, setExpanded]     = useState(false)
  const timeRef    = useRef(0)
  const qualityRef = useRef<string | null>(null)
  const onTime     = useCallback((t: number) => { timeRef.current = t }, [])
  const onQuality  = useCallback((q: string) => { qualityRef.current = q }, [])

  useEffect(() => {
    if (!expanded) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [expanded])

  if (!id) return null

  return (
    <>
      {!expanded && (
        <PlayerCore videoId={id} initialTime={timeRef.current} initialQuality={qualityRef.current}
          onExpand={() => setExpanded(true)} onTimeUpdate={onTime} onQualityChange={onQuality}/>
      )}
      {expanded && createPortal(
        <div className="yt-modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setExpanded(false) }}>
          <div className="yt-modal-container">
            <PlayerCore videoId={id} initialTime={timeRef.current} initialQuality={qualityRef.current}
              isModal onClose={() => setExpanded(false)} onTimeUpdate={onTime} onQualityChange={onQuality}/>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

/* ─── Thumbnail only (for card preview) ─── */
export function YouTubeThumbnail({ url, height = 120 }: { url: string; height?: number }) {
  const id = extractYouTubeId(url)
  if (!id) return null
  return (
    <div style={{ position:'relative', height, background:'var(--bg-2)', overflow:'hidden', border:'1px solid var(--border-1)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`} alt="thumbnail"
        style={{ width:'100%', height:'100%', objectFit:'cover', opacity:.65 }}/>
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:40, height:40, borderRadius:'50%', background:'rgba(0,0,0,.75)', display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid var(--accent)' }}>
          <span style={{ color:'var(--accent)', fontSize:14, marginLeft:3 }}>▶</span>
        </div>
      </div>
      <span style={{ position:'absolute', top:4, left:4, fontFamily:'var(--f-sys)', fontSize:9, color:'var(--accent)', background:'rgba(0,0,0,.85)', padding:'2px 5px', letterSpacing:'.1em' }}>
        YOUTUBE
      </span>
    </div>
  )
}
