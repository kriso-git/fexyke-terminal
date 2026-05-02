'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import {
  sendMessage, getConversation, getMyFriends, getUnreadCount, updateChatColor,
} from '@/app/actions'
import type { Message, Operator } from '@/lib/types'

type Friend = { id: string; callsign: string; level: number; avatar_url: string | null; chat_color?: string | null; last_seen?: string | null }

interface ChatWidgetProps {
  currentOperator: Operator | null
}

const COLOR_PRESETS = ['#18e968', '#43e8d8', '#ff4dbf', '#ffb347', '#7aa2ff', '#ff6b6b', '#c084fc', '#ffffff']
const EMOJI_PALETTE = ['😀','😂','😍','🥰','😎','🤔','😴','🤯','😱','😭','👍','🙏','🔥','💀','💯','✨','❤️','💔','🎉','🎮','☕','🌙','⚡','🚀','📌','📷']

function relTime(iso?: string | null): string {
  if (!iso) return 'sosem'
  const d = new Date(iso).getTime()
  if (isNaN(d)) return ''
  const diff = (Date.now() - d) / 1000
  if (diff < 60) return 'most'
  if (diff < 3600) return `${Math.floor(diff / 60)} perce`
  if (diff < 86400) return `${Math.floor(diff / 3600)} órája`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} napja`
  return new Date(iso).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })
}

function isOnline(iso?: string | null): boolean {
  if (!iso) return false
  return Date.now() - new Date(iso).getTime() < 1000 * 60 * 5
}

export function ChatWidget({ currentOperator }: ChatWidgetProps) {
  const [open, setOpen]           = useState(false)
  const [friends, setFriends]     = useState<Friend[]>([])
  const [activeId, setActiveId]   = useState<string | null>(null)
  const [messages, setMessages]   = useState<Message[]>([])
  const [draft, setDraft]         = useState('')
  const [sending, setSending]     = useState(false)
  const [loading, setLoading]     = useState(false)
  const [unread, setUnread]       = useState(0)
  const [error, setError]         = useState<string | null>(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [myColor, setMyColor]     = useState<string | null>(currentOperator?.chat_color ?? null)
  const scrollRef                 = useRef<HTMLDivElement>(null)
  const fileInputRef              = useRef<HTMLInputElement>(null)
  const inputRef                  = useRef<HTMLInputElement>(null)

  // Initial friends + unread + polling
  useEffect(() => {
    if (!currentOperator) return
    let cancelled = false

    async function loadFriends() {
      const res = await getMyFriends()
      if (!cancelled) setFriends(res.friends as Friend[])
    }
    async function loadUnread() {
      const res = await getUnreadCount()
      if (!cancelled) setUnread(res.count)
    }

    loadFriends()
    loadUnread()
    const id = setInterval(() => { loadUnread(); if (open) loadFriends() }, 20000)
    return () => { cancelled = true; clearInterval(id) }
  }, [currentOperator, open])

  // Active conversation polling — only when panel + thread open
  useEffect(() => {
    if (!activeId || !open || !currentOperator) return
    let cancelled = false

    async function load(initial: boolean) {
      if (initial) setLoading(true)
      const res = await getConversation(activeId!)
      if (cancelled) return
      if (res.error) setError(res.error)
      else { setError(null); setMessages(res.messages as Message[]) }
      if (initial) setLoading(false)
      const u = await getUnreadCount()
      if (!cancelled) setUnread(u.count)
    }

    load(true)
    const id = setInterval(() => load(false), 5000)
    return () => { cancelled = true; clearInterval(id) }
  }, [activeId, open, currentOperator])

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, activeId])

  const friendMap = useMemo(() => {
    const m = new Map<string, Friend>()
    for (const f of friends) m.set(f.id, f)
    return m
  }, [friends])

  if (!currentOperator) return null

  const active = activeId ? (friendMap.get(activeId) ?? null) : null

  async function send(e?: React.FormEvent, imageUrl?: string | null) {
    if (e) e.preventDefault()
    if (!activeId) return
    const text = draft.trim()
    if (!text && !imageUrl) return
    if (sending) return
    setSending(true)
    setError(null)
    if (!imageUrl) setDraft('')
    setShowEmoji(false)
    const res = await sendMessage(activeId, text, imageUrl ?? null)
    if (res.error) {
      setError(res.error)
      if (!imageUrl) setDraft(text)
    } else if (res.message) {
      setMessages(prev => [...prev, res.message as Message])
    }
    setSending(false)
    inputRef.current?.focus()
  }

  async function handleImageUpload(file: File) {
    if (!activeId) return
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Feltöltési hiba')
      await send(undefined, data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Feltöltési hiba')
    } finally {
      setUploading(false)
    }
  }

  async function applyColor(color: string | null) {
    setMyColor(color)
    await updateChatColor(color)
  }

  const fmtTime = (iso: string) => {
    try { return new Date(iso).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
  }

  const myDisplayColor = myColor ?? 'var(--accent)'

  // Closed pill ─────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="chat-pill"
        aria-label="Üzenetek megnyitása"
        style={{
          position: 'fixed', right: 'max(20px, env(safe-area-inset-right))', bottom: 'max(20px, env(safe-area-inset-bottom))', zIndex: 8000,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px',
          background: 'var(--bg-1)', border: '1px solid var(--accent)',
          color: 'var(--accent)',
          cursor: 'pointer', fontFamily: 'var(--f-sys)', fontSize: 12, letterSpacing: '.16em',
          boxShadow: '0 0 0 1px rgba(24,233,104,.15), 0 14px 36px -10px rgba(0,0,0,.7)',
          touchAction: 'manipulation',
        }}
      >
        <span className="dot" style={{ width: 8, height: 8 }}/>
        ◢ ÜZENETEK
        {unread > 0 && (
          <span style={{
            background: 'var(--magenta)', color: 'var(--bg-0)',
            borderRadius: 999, padding: '0 7px', fontSize: 10, fontWeight: 700,
          }}>{unread}</span>
        )}
      </button>
    )
  }

  return (
    <div
      className="chat-panel"
      style={{
        position: 'fixed', right: 'max(20px, env(safe-area-inset-right))', bottom: 'max(20px, env(safe-area-inset-bottom))', zIndex: 8000,
        width: 'min(380px, calc(100vw - 24px))', height: 'min(520px, calc(100vh - 80px))',
        background: 'var(--bg-1)', border: '1px solid var(--accent)',
        boxShadow: '0 0 0 1px rgba(24,233,104,.15), 0 24px 60px -12px rgba(0,0,0,.85)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 12px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-2)',
      }}>
        {active && (
          <button onClick={() => { setActiveId(null); setShowEmoji(false); setShowSettings(false) }}
            className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', minHeight: 0, fontSize: 11 }}>‹</button>
        )}
        <span className="dot dot-mag"/>
        <span className="sys" style={{ fontSize: 10, letterSpacing: '.18em', color: 'var(--magenta)', flex: 1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {active ? `◢ ${active.callsign}` : '◢ ÜZENETEK'}
        </span>
        {!active && (
          <button onClick={() => setShowSettings(s => !s)} className="btn btn-ghost btn-sm" title="Beállítások"
            style={{ padding: '2px 8px', minHeight: 0, fontSize: 11 }}>⚙</button>
        )}
        <button onClick={() => setOpen(false)} className="btn btn-ghost btn-sm" title="Bezár"
          style={{ padding: '2px 8px', minHeight: 0, fontSize: 11 }}>▾</button>
      </div>

      {/* Settings panel */}
      {!active && showSettings && (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-2)' }}>
          <div className="sys muted" style={{ fontSize: 9, marginBottom: 6, letterSpacing: '.14em' }}>◢ NÉV SZÍN A CHAT-BEN</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {COLOR_PRESETS.map(c => (
              <button key={c} onClick={() => applyColor(c)}
                style={{ width: 22, height: 22, background: c, border: myColor === c ? '2px solid var(--ink-0)' : '1px solid var(--border-1)', cursor: 'pointer', borderRadius: 0 }}/>
            ))}
            <button onClick={() => applyColor(null)} className="btn btn-ghost btn-sm"
              style={{ padding: '2px 8px', fontSize: 9, minHeight: 0 }}>RESET</button>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: myDisplayColor, fontFamily: 'var(--f-head)' }}>
            ◤ Előnézet: <strong>{currentOperator.callsign}</strong>
          </div>
        </div>
      )}

      {/* Body */}
      {!active ? (
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 0', WebkitOverflowScrolling: 'touch' }}>
          {friends.length === 0 ? (
            <div className="sys muted" style={{ padding: '24px 14px', fontSize: 11, textAlign: 'center' }}>
              Még nincsenek visszaigazolt ismerőseid.
            </div>
          ) : friends.map(f => {
            const online = isOnline(f.last_seen)
            return (
              <button key={f.id} onClick={() => setActiveId(f.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', width: '100%', background: 'transparent',
                  border: 'none', borderBottom: '1px solid var(--border-0)',
                  cursor: 'pointer', textAlign: 'left',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ position: 'relative' }}>
                  <Avatar id={f.id} src={f.avatar_url} size={32}/>
                  <span style={{
                    position: 'absolute', bottom: -2, right: -2, width: 10, height: 10,
                    borderRadius: '50%', background: online ? 'var(--accent)' : 'var(--ink-3)',
                    boxShadow: online ? '0 0 6px var(--accent)' : 'none',
                    border: '2px solid var(--bg-1)',
                  }}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="head" style={{ fontSize: 13, color: f.chat_color || 'var(--ink-0)' }}>{f.callsign}</div>
                  <div className="sys muted" style={{ fontSize: 9 }}>
                    {online ? 'ONLINE most' : `Utoljára ${relTime(f.last_seen)}`}
                  </div>
                </div>
                <span className="sys muted" style={{ fontSize: 10 }}>›</span>
              </button>
            )
          })}
        </div>
      ) : (
        <>
          {/* Subheader: active friend status */}
          <div style={{ padding: '6px 14px', background: 'var(--bg-1)', borderBottom: '1px solid var(--border-0)' }}>
            <div className="sys muted" style={{ fontSize: 9 }}>
              {isOnline(active.last_seen) ? '◉ ONLINE most' : `◯ Utoljára: ${relTime(active.last_seen)}`}
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{
            flex: 1, overflow: 'auto',
            padding: '12px 12px',
            display: 'flex', flexDirection: 'column', gap: 6,
            background: 'var(--bg-0)', WebkitOverflowScrolling: 'touch',
          }}>
            {loading && messages.length === 0 ? (
              <div className="sys muted" style={{ fontSize: 11, textAlign: 'center', padding: 20 }}>Betöltés…</div>
            ) : messages.length === 0 ? (
              <div className="sys muted" style={{ fontSize: 11, textAlign: 'center', padding: 20 }}>
                Köszönj be {active.callsign}-nak!
              </div>
            ) : messages.map(m => {
              const mine = m.sender_id === currentOperator.id
              const senderColor = mine ? myDisplayColor : (active.chat_color || 'var(--ink-1)')
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '78%',
                    padding: m.image_url ? 4 : '6px 10px',
                    background: mine ? 'var(--accent-soft)' : 'var(--bg-2)',
                    border: `1px solid ${mine ? 'var(--accent)' : 'var(--border-1)'}`,
                    color: mine ? 'var(--ink-0)' : 'var(--ink-0)',
                    fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word',
                  }}>
                    {!mine && (
                      <div className="sys" style={{ fontSize: 9, color: senderColor, marginBottom: 2, letterSpacing: '.1em' }}>
                        {active.callsign}
                      </div>
                    )}
                    {m.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.image_url} alt="kép" style={{ maxWidth: '100%', maxHeight: 220, display: 'block' }} loading="lazy"/>
                    )}
                    {m.text && <div style={{ padding: m.image_url ? '6px 4px 0' : 0, whiteSpace: 'pre-wrap' }}>{m.text}</div>}
                    <div className="sys muted" style={{ fontSize: 8, marginTop: 3, padding: m.image_url ? '0 4px 4px' : 0, textAlign: mine ? 'right' : 'left' }}>
                      {fmtTime(m.created_at)}{mine && m.read ? ' · OLVASVA' : ''}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {error && (
            <div style={{ padding: '6px 12px', background: 'rgba(255,58,58,.1)', color: 'var(--red)', fontSize: 10, fontFamily: 'var(--f-sys)' }}>◢ {error}</div>
          )}

          {/* Emoji picker */}
          {showEmoji && (
            <div style={{ borderTop: '1px solid var(--border-1)', background: 'var(--bg-2)', padding: 6, display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 110, overflow: 'auto' }}>
              {EMOJI_PALETTE.map(em => (
                <button key={em} onClick={() => { setDraft(d => d + em); inputRef.current?.focus() }}
                  style={{ width: 30, height: 30, background: 'transparent', border: '1px solid var(--border-0)', cursor: 'pointer', fontSize: 18 }}>
                  {em}
                </button>
              ))}
            </div>
          )}

          {/* Composer */}
          <form onSubmit={(e) => send(e)} style={{
            display: 'flex', gap: 6, padding: '8px 10px',
            borderTop: '1px solid var(--border-1)', background: 'var(--bg-2)',
            alignItems: 'center',
          }}>
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading || sending}
              className="btn btn-ghost btn-sm" title="Kép küldése"
              style={{ padding: '4px 8px', minHeight: 0, fontSize: 14 }}>
              {uploading ? '…' : '📎'}
            </button>
            <input ref={fileInputRef} type="file" accept="image/gif,image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = '' }}/>

            <button type="button" onClick={() => setShowEmoji(s => !s)}
              className="btn btn-ghost btn-sm" title="Emoji"
              style={{ padding: '4px 8px', minHeight: 0, fontSize: 14 }}>😀</button>

            <input
              ref={inputRef}
              className="input"
              placeholder={`Írj ${active.callsign}-nak…`}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              maxLength={2000}
              disabled={sending}
              style={{ flex: 1, fontSize: 13, padding: '6px 10px' }}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={sending || (!draft.trim() && !uploading)}>
              {sending ? '…' : '↗'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
