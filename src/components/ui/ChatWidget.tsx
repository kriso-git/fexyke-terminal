'use client'

import { useEffect, useRef, useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Chip } from '@/components/ui/Chip'
import { sendMessage, getConversation, getMyFriends, getUnreadCount } from '@/app/actions'
import type { Message, Operator } from '@/lib/types'

type Friend = { id: string; callsign: string; level: number; avatar_url: string | null }

interface ChatWidgetProps {
  currentOperator: Operator | null
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
  const scrollRef                 = useRef<HTMLDivElement>(null)

  // Initial friends + unread + polling
  useEffect(() => {
    if (!currentOperator) return
    let cancelled = false

    async function loadFriends() {
      const res = await getMyFriends()
      if (!cancelled) setFriends(res.friends)
    }
    async function loadUnread() {
      const res = await getUnreadCount()
      if (!cancelled) setUnread(res.count)
    }

    loadFriends()
    loadUnread()
    const id = setInterval(loadUnread, 15000)
    return () => { cancelled = true; clearInterval(id) }
  }, [currentOperator])

  // Active conversation polling
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
      // refresh unread after marking-read on server
      const u = await getUnreadCount()
      if (!cancelled) setUnread(u.count)
    }

    load(true)
    const id = setInterval(() => load(false), 5000)
    return () => { cancelled = true; clearInterval(id) }
  }, [activeId, open, currentOperator])

  // Auto-scroll on new messages
  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, activeId])

  if (!currentOperator) return null

  const active = friends.find(f => f.id === activeId) ?? null

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!activeId || !draft.trim() || sending) return
    setSending(true)
    setError(null)
    const text = draft.trim()
    setDraft('')
    const res = await sendMessage(activeId, text)
    if (res.error) {
      setError(res.error)
      setDraft(text) // restore
    } else if (res.message) {
      setMessages(prev => [...prev, res.message as Message])
    }
    setSending(false)
  }

  const fmtTime = (iso: string) => {
    try { return new Date(iso).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
  }

  // Closed pill ─────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="chat-pill"
        style={{
          position: 'fixed', right: 24, bottom: 24, zIndex: 8000,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px',
          background: 'var(--bg-1)',
          border: '1px solid var(--accent)',
          color: 'var(--accent)',
          cursor: 'pointer',
          fontFamily: 'var(--f-sys)',
          fontSize: 12, letterSpacing: '.16em',
          boxShadow: '0 0 0 1px rgba(24,233,104,.15), 0 14px 36px -10px rgba(0,0,0,.7)',
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

  // Open panel ──────────────────────────────────────────────
  return (
    <div
      className="chat-panel"
      style={{
        position: 'fixed', right: 24, bottom: 24, zIndex: 8000,
        width: 360, height: 480,
        background: 'var(--bg-1)',
        border: '1px solid var(--accent)',
        boxShadow: '0 0 0 1px rgba(24,233,104,.15), 0 24px 60px -12px rgba(0,0,0,.85)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px',
        borderBottom: '1px solid var(--border-1)',
        background: 'var(--bg-2)',
        cursor: 'default',
      }}>
        {active && (
          <button
            onClick={() => setActiveId(null)}
            className="btn btn-ghost btn-sm"
            style={{ padding: '2px 8px', minHeight: 0, fontSize: 11 }}
          >‹</button>
        )}
        <span className="dot dot-mag"/>
        <span className="sys" style={{ fontSize: 10, letterSpacing: '.18em', color: 'var(--magenta)', flex: 1 }}>
          {active ? `◢ ${active.callsign}` : '◢ ÜZENETEK'}
        </span>
        <button
          onClick={() => setOpen(false)}
          className="btn btn-ghost btn-sm"
          style={{ padding: '2px 8px', minHeight: 0, fontSize: 11 }}
          title="Bezárás"
        >▾</button>
      </div>

      {/* Body */}
      {!active ? (
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
          {friends.length === 0 ? (
            <div className="sys muted" style={{ padding: '24px 14px', fontSize: 11, textAlign: 'center' }}>
              Még nincsenek visszaigazolt ismerőseid.
            </div>
          ) : friends.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveId(f.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px',
                width: '100%',
                background: 'transparent',
                border: 'none', borderBottom: '1px solid var(--border-0)',
                cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Avatar id={f.id} src={f.avatar_url} size={32}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="head" style={{ fontSize: 13 }}>{f.callsign}</div>
                <div className="sys muted" style={{ fontSize: 9 }}>LVL-0{f.level}</div>
              </div>
              <span className="sys muted" style={{ fontSize: 10 }}>›</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          {/* Messages */}
          <div ref={scrollRef} style={{
            flex: 1, overflow: 'auto',
            padding: '12px 12px',
            display: 'flex', flexDirection: 'column', gap: 6,
            background: 'var(--bg-0)',
          }}>
            {loading && messages.length === 0 ? (
              <div className="sys muted" style={{ fontSize: 11, textAlign: 'center', padding: 20 }}>Betöltés…</div>
            ) : messages.length === 0 ? (
              <div className="sys muted" style={{ fontSize: 11, textAlign: 'center', padding: 20 }}>
                Nincs még üzenet. Köszönj be {active.callsign}-nak!
              </div>
            ) : messages.map(m => {
              const mine = m.sender_id === currentOperator.id
              return (
                <div key={m.id} style={{
                  display: 'flex',
                  justifyContent: mine ? 'flex-end' : 'flex-start',
                }}>
                  <div style={{
                    maxWidth: '78%',
                    padding: '6px 10px',
                    background: mine ? 'var(--accent-soft)' : 'var(--bg-2)',
                    border: `1px solid ${mine ? 'var(--accent)' : 'var(--border-1)'}`,
                    color: mine ? 'var(--accent)' : 'var(--ink-0)',
                    fontSize: 13, lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}>
                    {m.text}
                    <div className="sys muted" style={{ fontSize: 8, marginTop: 3, textAlign: mine ? 'right' : 'left' }}>
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

          {/* Composer */}
          <form onSubmit={send} style={{
            display: 'flex', gap: 6,
            padding: '8px 10px',
            borderTop: '1px solid var(--border-1)',
            background: 'var(--bg-2)',
          }}>
            <input
              className="input"
              placeholder={`Írj ${active.callsign}-nak…`}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              maxLength={2000}
              disabled={sending}
              style={{ flex: 1, fontSize: 12, padding: '6px 10px' }}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={sending || !draft.trim()}>
              {sending ? '…' : '↗'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
