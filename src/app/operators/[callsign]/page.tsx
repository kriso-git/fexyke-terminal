import { getCurrentOperator } from '@/lib/session'
import { getFriendshipState } from '@/app/actions'
import { createAdminClient } from '@/lib/supabase-admin'
import { TopBar } from '@/components/shell/TopBar'
import { Nav } from '@/components/shell/Nav'
import { Footer } from '@/components/shell/Footer'
import { DataStream } from '@/components/shell/DataStream'
import { ProfileClient } from './ProfileClient'
import type { Operator, Entry, ProfileSignal } from '@/lib/types'

async function getData(callsign: string) {
  const { data: op } = await createAdminClient()
    .from('operators')
    .select('*')
    .eq('callsign', callsign.toUpperCase())
    .single()

  if (!op) return { operator: null, entries: [] as Entry[], profileSignals: [] as ProfileSignal[], friends: [] as Operator[], pendingIn: [] as { id: string; requester: Operator }[], allOperators: [] as Operator[], stats: { likes: 0, comments: 0, reads: 0 } }

  const opId = (op as Operator).id
  const admin = createAdminClient()
  const [entriesRes, signalsRes, friendsRes, pendingInRes, allOpsRes] = await Promise.all([
    admin.from('entries').select('*').eq('operator_id', opId).order('created_at', { ascending: false }).limit(20),
    admin.from('profile_signals').select('*, author:operators!author_id(*)').eq('target_id', opId).order('created_at', { ascending: false }),
    admin.from('friendships')
      .select('id, requester_id, addressee_id, status, requester:operators!requester_id(*), addressee:operators!addressee_id(*)')
      .or(`requester_id.eq.${opId},addressee_id.eq.${opId}`)
      .eq('status', 'accepted'),
    admin.from('friendships')
      .select('id, requester:operators!requester_id(*)')
      .eq('addressee_id', opId)
      .eq('status', 'pending'),
    admin.from('operators').select('id,callsign,level,avatar_url,role').not('auth_id', 'is', null).order('callsign'),
  ])

  // Real stats: likes (received reactions on own entries), comments (signals on own entries), total reads
  const myEntryIds = (entriesRes.data ?? []).map((e: { id: string }) => e.id)
  let likes = 0, comments = 0, reads = 0
  if (myEntryIds.length > 0) {
    const [likesRes, commentsRes, readsRes] = await Promise.all([
      admin.from('entry_reactions').select('*', { count: 'exact', head: true }).in('entry_id', myEntryIds),
      admin.from('signals').select('*', { count: 'exact', head: true }).in('entry_id', myEntryIds),
      admin.from('entries').select('reads').in('id', myEntryIds),
    ])
    likes = likesRes.count ?? 0
    comments = commentsRes.count ?? 0
    reads = ((readsRes.data ?? []) as { reads: number }[]).reduce((s, r) => s + (r.reads ?? 0), 0)
  }

  type FRow = { id: string; requester_id: string; addressee_id: string; requester: Operator; addressee: Operator }
  const friends: Operator[] = ((friendsRes.data ?? []) as unknown as FRow[]).map(f =>
    f.requester_id === opId ? f.addressee : f.requester
  )
  type PRow = { id: string; requester: Operator }
  const pendingIn: { id: string; requester: Operator }[] = ((pendingInRes.data ?? []) as unknown as PRow[]).map(p => ({
    id: p.id, requester: p.requester,
  }))

  return {
    operator: op as Operator,
    entries: (entriesRes.data ?? []) as Entry[],
    profileSignals: (signalsRes.data ?? []) as ProfileSignal[],
    friends,
    pendingIn,
    allOperators: (allOpsRes.data ?? []) as Operator[],
    stats: { likes, comments, reads },
  }
}

export default async function OperatorPage({ params }: { params: Promise<{ callsign: string }> }) {
  const { callsign } = await params
  const [data, currentOperator] = await Promise.all([getData(callsign), getCurrentOperator()])
  const userLabel = currentOperator ? `${currentOperator.id} · ${currentOperator.callsign}` : null
  const friendship = data.operator ? await getFriendshipState(data.operator.id) : { state: 'self' as const }

  return (
    <div className="page">
      <DataStream side="left" />
      <DataStream side="right" />
      <div className="scanline-sweep" />
      <TopBar user={userLabel} />
      <Nav />
      <ProfileClient {...data} currentOperator={currentOperator} friendship={friendship} />
      <Footer index="003 / 005" />
    </div>
  )
}
