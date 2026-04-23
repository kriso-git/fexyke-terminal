'use client'

import { useState, useRef, useEffect } from 'react'

export function AudioPlayer({ url, label }: { url: string; label?: string | null }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => {
      setCurrent(audio.currentTime)
      setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0)
    }
    const onMeta = () => setDuration(audio.duration)
    const onEnd  = () => { setPlaying(false); setProgress(0); setCurrent(0) }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('ended', onEnd)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('ended', onEnd)
    }
  }, [])

  function toggle() {
    if (!audioRef.current) return
    if (playing) audioRef.current.pause()
    else audioRef.current.play()
    setPlaying(p => !p)
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    if (!audioRef.current || !audioRef.current.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * audioRef.current.duration
  }

  function toggleMute() {
    if (!audioRef.current) return
    audioRef.current.muted = !muted
    setMuted(m => !m)
  }

  function fmt(s: number) {
    if (!s || isNaN(s)) return '0:00'
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  return (
    <div style={{ background:'var(--bg-2)', border:'1px solid var(--border-1)', padding:'12px 14px' }}>
      <audio ref={audioRef} src={url} preload="metadata"/>
      {label && (
        <div className="sys muted" style={{ fontSize:10, marginBottom:8, letterSpacing:'.1em' }}>◢ {label}</div>
      )}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={toggle} style={{
          width:32, height:32, borderRadius:'50%', flexShrink:0,
          border:'1px solid var(--accent)', background:'var(--accent-soft)',
          color:'var(--accent)', cursor:'pointer', fontSize:11,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          {playing ? '◼' : '▶'}
        </button>
        <div onClick={seek} style={{ flex:1, height:3, background:'var(--bg-1)', cursor:'pointer', position:'relative', borderRadius:2 }}>
          <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${progress}%`, background:'var(--accent)', borderRadius:2, transition:'width .1s linear' }}/>
        </div>
        <button onClick={toggleMute} style={{ background:'none', border:'none', color: muted ? 'var(--ink-3)' : 'var(--ink-1)', cursor:'pointer', fontSize:12, padding:0 }}>
          {muted ? '◉' : '◎'}
        </button>
        <span className="mono muted" style={{ fontSize:10, minWidth:60, textAlign:'right' }}>
          {fmt(current)} / {fmt(duration)}
        </span>
      </div>
    </div>
  )
}
