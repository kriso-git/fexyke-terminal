import { supabase } from '@/lib/supabase'
import { getCurrentOperator } from '@/lib/session'
import { TopBar } from '@/components/shell/TopBar'
import { Nav } from '@/components/shell/Nav'
import { Footer } from '@/components/shell/Footer'
import { DataStream } from '@/components/shell/DataStream'
import { EntryDetailClient } from './EntryDetailClient'
import type { Entry, Signal } from '@/lib/types'

async function getData(id: string, operatorId?: string) {
  const [entryRes, signalsRes, rxRes] = await Promise.all([
    supabase.from('entries').select('*, operator:operators(*)').eq('id', id).single(),
    supabase.from('signals').select('*, operator:operators(*)').eq('entry_id', id).order('created_at'),
    supabase.from('entry_reactions').select('emoji, operator_id').eq('entry_id', id),
  ])

  const counts: Record<string, number> = {}
  const userRx: string[] = []
  for (const r of (rxRes.data ?? []) as { emoji: string; operator_id: string }[]) {
    counts[r.emoji] = (counts[r.emoji] ?? 0) + 1
    if (operatorId && r.operator_id === operatorId) userRx.push(r.emoji)
  }

  return {
    entry: entryRes.data as Entry | null,
    signals: (signalsRes.data ?? []) as Signal[],
    reactions: counts,
    userReactions: userRx,
  }
}

export default async function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const currentOperator = await getCurrentOperator()
  const { entry, signals, reactions, userReactions } = await getData(id, currentOperator?.id)
  const userLabel = currentOperator ? `${currentOperator.id} · ${currentOperator.callsign}` : null

  return (
    <div className="page">
      <DataStream side="left" />
      <DataStream side="right" />
      <div className="scanline-sweep" />
      <TopBar user={userLabel} />
      <Nav />
      <EntryDetailClient
        entry={entry}
        signals={signals}
        entryId={id}
        currentOperator={currentOperator}
        initialReactions={reactions}
        initialUserReactions={userReactions}
      />
      <Footer index="002 / 005" />
    </div>
  )
}
