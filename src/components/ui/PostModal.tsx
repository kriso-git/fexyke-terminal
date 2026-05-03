'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Chip } from '@/components/ui/Chip'
import { Avatar } from '@/components/ui/Avatar'
import { YouTubePlayer } from '@/components/ui/YouTubePlayer'
import { AudioPlayer } from '@/components/ui/AudioPlayer'
import { RolePresenceChip } from '@/components/ui/PresenceChip'
import { getEntryDetail, createSignal, toggleReaction } from '@/app/actions'
import { sanitizeHtml } from '@/lib/sanitize'
import { ShareButton } from '@/components/ui/ShareButton'
import type { Entry, Operator, Signal } from '@/lib/types'

const EMOJIS = ['👍', '🔥', '💀', '😂']

interface PostModalProps {
  entryId: string | null
  currentOperator: Operator | null
  onClose: () => void
}

export function PostModal({ entryId, currentOperator, onClose }: PostModalProps) {
  const [entry, setEntry] = useState<Entry | null>(null)
  const [signals, setSignals] = useState<Signal[]>([])
  const [reactions, setReactions] = useState<Record<string, number>>({})
  const [userRx, setUserRx] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentPending, setCommentPending] = useState(false)
  const [rxPending, setRxPending] = useState<string | null>(null)

  useEffect(() => {
    if (!entryId) return
    setLoading(true)
    setEntry(null)
    setSignals([])
    getEntryDetail(entryId).then(res => {
      setEntry((res.entry ?? null) as Entry | null)
      setSignals(res.signals as Signal[])
      setReactions(res.reactions ?? {})
      setUserRx(res.userReactions ?? [])
      setLoading(false)
    })
  }, [entryId])

  useEffect(() => {
    if (!entryId) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [entryId, onClose])

  if (!entryId) return null

  async function handleReact(emoji: string) {
    if (!currentOperator || !entry || rxPending) return
    setRxPending(emoji)
    const res = await toggleReaction(entry.id, emoji)
    if (res?.reactions) setReactions(res.reactions)
    if (res?.userReactions) setUserRx(res.userReactions)
    setRxPending(null)
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!entry || !commentText.trim() || !currentOperator) return
    setCommentPending(true)
    const fd = new FormData()
    fd.append('entry_id', entry.id)
    fd.append('text', commentText.trim())
    const res = await createSignal(fd)
    if (!res?.error && entryId) {
      setCommentText('')
      const refreshed = await getEntryDetail(entryId)
      setSignals(refreshed.signals as Signal[])
    }
    setCommentPending(false)
  }

  const isVideo = entry && (entry.kind === 'VIDEÓ' || entry.kind === 'ADÁS' || entry.media_type === 'youtube')
  const isImage = entry && entry.media_type === 'image' && entry.media_url
  const isAudio = entry && entry.media_type === 'audio' && entry.media_url
  const date = entry ? new Date(entry.created_at).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''

  return (
    <div
      className="post-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,.78)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '40px 20px', overflowY: 'auto',
      }}
    >
      <div
        className="post-modal"
        style={{
          position: 'relative',
          width: '100%', maxWidth: 920,
          background: 'var(--bg-1)',
          border: '1px solid var(--accent)',
          boxShadow: '0 0 0 1px rgba(24,233,104,.15), 0 30px 80px -20px rgba(0,0,0,.9)',
          padding: 0,
        }}
      >
        {/* Corner accents */}
        <div style={{ position: 'absolute', top: -1, left: -1, width: 14, height: 14, borderTop: '1px solid var(--accent)', borderLeft: '1px solid var(--accent)' }}/>
        <div style={{ position: 'absolute', top: -1, right: -1, width: 14, height: 14, borderTop: '1px solid var(--accent)', borderRight: '1px solid var(--accent)' }}/>
        <div style={{ position: 'absolute', bottom: -1, left: -1, width: 14, height: 14, borderBottom: '1px solid var(--accent)', borderLeft: '1px solid var(--accent)' }}/>
        <div style={{ position: 'absolute', bottom: -1, right: -1, width: 14, height: 14, borderBottom: '1px solid var(--accent)', borderRight: '1px solid var(--accent)' }}/>

        {/* Header / close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-2)' }}>
          <span className="dot dot-mag"/>
          <span className="sys" style={{ fontSize: 10, letterSpacing: '.18em', color: 'var(--magenta)' }}>◢ POSZT NÉZET · LEBEGŐ</span>
          <span style={{ flex: 1 }}/>
          <span className="mono muted" style={{ fontSize: 10 }}>{entry?.id ?? ''}</span>
          {entry && (
            <ShareButton
              url={`/?post=${entry.id}`}
              title={entry.title}
              text={entry.excerpt ?? entry.title}
              size="sm"
            />
          )}
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ padding: '4px 10px', fontSize: 11, minHeight: 0 }}
          >
            ✕ BEZÁR
          </button>
        </div>

        {loading || !entry ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div className="sys muted" style={{ fontSize: 11 }}>Betöltés…</div>
          </div>
        ) : (
          <div style={{ padding: '24px 28px 28px' }}>
            {/* Tags + meta */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
              <Chip kind={entry.priority ? 'solid' : 'accent'}>
                {isVideo ? 'VIDEÓ' : isImage ? 'KÉP' : isAudio ? 'HANG' : 'SZÖVEG'}
              </Chip>
              {entry.priority && <Chip kind="solid" dot>KIEMELT</Chip>}
              {entry.sigs?.map((s: string) => <Chip key={s} kind="dash">{s}</Chip>)}
              <span style={{ flex: 1 }}/>
              <span className="sys muted" style={{ fontSize: 10 }}>{date}</span>
            </div>

            {/* Title */}
            <h2 className="head" style={{ margin: 0, fontSize: 32, lineHeight: 1.1, color: 'var(--ink-0)' }}>{entry.title}</h2>

            {/* Author */}
            <Link href={entry.operator?.callsign ? `/operators/${entry.operator.callsign}` : '#'}
              style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14, marginBottom: 18, textDecoration: 'none', color: 'inherit' }}>
              <Avatar id={entry.operator_id} src={entry.operator?.avatar_url} lastSeen={entry.operator?.last_seen} size={32}/>
              <div>
                <div className="head" style={{ fontSize: 13 }}>{entry.operator?.callsign ?? entry.operator_id}</div>
                <div className="sys muted" style={{ fontSize: 10 }}>LVL-0{entry.operator?.level ?? 1} · {entry.reads ?? 0} olvasás</div>
              </div>
            </Link>

            {/* Media */}
            {isVideo && entry.media_url && (
              <div style={{ marginBottom: 18 }}>
                <YouTubePlayer url={entry.media_url}/>
              </div>
            )}
            {isImage && entry.media_url && (
              <div style={{ marginBottom: 18 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={entry.media_url} alt={entry.media_label ?? ''} style={{ width: '100%', maxHeight: 520, objectFit: 'cover', display: 'block' }}/>
                {entry.media_label && <div className="sys muted" style={{ fontSize: 10, marginTop: 6 }}>{entry.media_label}</div>}
              </div>
            )}
            {isAudio && entry.media_url && (
              <div style={{ marginBottom: 18 }}>
                <AudioPlayer url={entry.media_url} label={entry.media_label ?? ''}/>
              </div>
            )}

            {/* Content */}
            {entry.content && (
              <div
                style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--ink-0)', marginBottom: 20 }}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(entry.content) }}
              />
            )}

            {/* Reactions */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '12px 0', borderTop: '1px dashed var(--border-1)', borderBottom: '1px dashed var(--border-1)', flexWrap: 'wrap' }}>
              {EMOJIS.map(em => {
                const count = reactions[em] ?? 0
                const active = userRx.includes(em)
                return (
                  <button
                    key={em}
                    onClick={() => handleReact(em)}
                    disabled={!currentOperator || rxPending !== null}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '6px 14px',
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border-1)'}`,
                      background: active ? 'var(--accent-soft)' : 'transparent',
                      cursor: currentOperator ? 'pointer' : 'default',
                      fontSize: 18,
                      color: active ? 'var(--accent)' : 'var(--ink-2)',
                    }}
                  >
                    {em}{count > 0 && <span style={{ fontSize: 12, fontFamily: 'var(--f-sys)' }}>{count}</span>}
                  </button>
                )
              })}
              <span style={{ flex: 1 }}/>
              <span className="sys muted" style={{ fontSize: 10 }}>{signals.length} KOMMENT</span>
            </div>

            {/* Comments */}
            <div style={{ marginTop: 18 }}>
              <div className="sys muted" style={{ fontSize: 10, marginBottom: 10 }}>◢ KOMMENTEK</div>
              {currentOperator && (
                <form onSubmit={handleComment} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  <Avatar id={currentOperator.id} src={currentOperator.avatar_url} lastSeen={currentOperator.last_seen} size={32}/>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Írj kommentet…"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    style={{ flex: 1, fontSize: 13, padding: '8px 10px', resize: 'vertical' }}
                  />
                  <button type="submit" className="btn btn-primary btn-sm" disabled={commentPending || !commentText.trim()}>
                    {commentPending ? '…' : '↗ KÜLD'}
                  </button>
                </form>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {signals.length === 0 ? (
                  <div className="sys muted" style={{ fontSize: 11, padding: '12px 0' }}>Még nincsenek kommentek.</div>
                ) : signals.map(s => (
                  <div key={s.id} className="panel" style={{ padding: '10px 12px', display: 'grid', gridTemplateColumns: '32px 1fr', gap: 10 }}>
                    <Link href={s.operator?.callsign ? `/operators/${s.operator.callsign}` : '#'} style={{ textDecoration:'none' }}>
                      <Avatar id={s.operator_id} src={s.operator?.avatar_url} lastSeen={s.operator?.last_seen} size={32}/>
                    </Link>
                    <div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                        <Link href={s.operator?.callsign ? `/operators/${s.operator.callsign}` : '#'} className="head" style={{ fontSize: 12, color:'var(--ink-0)', textDecoration:'none' }}>{s.operator?.callsign ?? s.operator_id}</Link>
                        <RolePresenceChip role={s.operator?.role} lastSeen={s.operator?.last_seen} fontSize={9}/>
                        <span style={{ flex: 1 }}/>
                        <span className="sys muted" style={{ fontSize: 9 }}>
                          {new Date(s.created_at).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--ink-0)', lineHeight: 1.55 }}>{s.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
