import { getCurrentOperator } from '@/lib/session'
import { TopBar } from '@/components/shell/TopBar'
import { Nav } from '@/components/shell/Nav'
import { Footer } from '@/components/shell/Footer'
import { DataStream } from '@/components/shell/DataStream'
import { HomeClient } from './HomeClient'
import { TiszaEgg } from '@/components/ui/TiszaEgg'
import type { Entry, Operator, Signal, Thread } from '@/lib/types'
import { createAdminClient } from '@/lib/supabase-admin'
import { OPERATOR_JOIN } from '@/lib/operatorFields'

async function getData() {
  const admin = createAdminClient()
  const [entriesRes, operatorsRes, threadsRes] = await Promise.all([
    admin.from('entries')
      .select(`*, ${OPERATOR_JOIN}`)
      .neq('status', 'draft')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20),
    admin.from('operators').select('*').order('created_at', { ascending: true }).limit(20),
    admin.from('threads').select('*').order('created_at', { ascending: false }).limit(4),
  ])

  const entries = (entriesRes.data ?? []) as Entry[]

  let reactionsByEntry: Record<string, Record<string, number>> = {}
  let commentsByEntry:  Record<string, Signal[]> = {}
  let commentCountByEntry: Record<string, number> = {}

  if (entries.length > 0) {
    const ids = entries.map(e => e.id)
    const [rxRes, sigRes] = await Promise.all([
      admin.from('entry_reactions').select('entry_id, emoji').in('entry_id', ids),
      admin.from('signals').select(`id, entry_id, operator_id, parent_id, text, image_url, sigs, verified, created_at, ${OPERATOR_JOIN}`).in('entry_id', ids).order('created_at', { ascending: true }),
    ])
    for (const r of (rxRes.data ?? []) as { entry_id: string; emoji: string }[]) {
      if (!reactionsByEntry[r.entry_id]) reactionsByEntry[r.entry_id] = {}
      reactionsByEntry[r.entry_id][r.emoji] = (reactionsByEntry[r.entry_id][r.emoji] ?? 0) + 1
    }

    const sigList = (sigRes.data ?? []) as unknown as Signal[]
    // Fetch comment reactions for all loaded signals at once
    const sigIds = sigList.map(s => s.id)
    const sigRxByComment: Record<string, Record<string, number>> = {}
    if (sigIds.length > 0) {
      const { data: srxData } = await admin.from('signal_reactions').select('signal_id, emoji').in('signal_id', sigIds)
      for (const r of (srxData ?? []) as { signal_id: string; emoji: string }[]) {
        if (!sigRxByComment[r.signal_id]) sigRxByComment[r.signal_id] = {}
        sigRxByComment[r.signal_id][r.emoji] = (sigRxByComment[r.signal_id][r.emoji] ?? 0) + 1
      }
    }

    for (const s of sigList) {
      s.reactions = sigRxByComment[s.id] ?? {}
      const eid = s.entry_id as string
      if (!commentsByEntry[eid]) commentsByEntry[eid] = []
      commentsByEntry[eid].push(s)
      commentCountByEntry[eid] = (commentCountByEntry[eid] ?? 0) + 1
    }
  }

  return {
    entries: entries.map(e => ({
      ...e,
      reactions: reactionsByEntry[e.id] ?? {},
      initialComments: (commentsByEntry[e.id] ?? []).slice(-3),
      commentCount: commentCountByEntry[e.id] ?? 0,
    })),
    operators: (operatorsRes.data ?? []) as Operator[],
    threads: (threadsRes.data ?? []) as Thread[],
  }
}

export default async function HomePage() {
  const [data, currentOperator] = await Promise.all([getData(), getCurrentOperator()])

  let postCount = 0
  let totalLikes = 0
  if (currentOperator) {
    const admin = createAdminClient()
    const { data: opEntries } = await admin
      .from('entries')
      .select('id')
      .eq('operator_id', currentOperator.id)
    const entryIds = (opEntries ?? []).map((e: { id: string }) => e.id)
    postCount = entryIds.length
    if (entryIds.length > 0) {
      const { count } = await admin
        .from('entry_reactions')
        .select('*', { count: 'exact', head: true })
        .in('entry_id', entryIds)
      totalLikes = count ?? 0
    }
  }

  const userLabel = currentOperator ? `${currentOperator.id} · ${currentOperator.callsign}` : null

  return (
    <div className="page">
      <DataStream side="left" />
      <DataStream side="right" />
      <div className="scanline-sweep" />
      <TopBar user={userLabel} />
      <Nav role={currentOperator?.role ?? null} />
      <HomeClient {...data} currentOperator={currentOperator} postCount={postCount} totalLikes={totalLikes} />
      <Footer index="001 / 005" />
      <TiszaEgg />
    </div>
  )
}
