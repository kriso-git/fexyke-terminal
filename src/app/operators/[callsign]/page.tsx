import { supabase } from '@/lib/supabase'
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
  const { data: op } = await supabase
    .from('operators')
    .select('*')
    .eq('callsign', callsign.toUpperCase())
    .single()

  if (!op) return { operator: null, entries: [] as Entry[], profileSignals: [] as ProfileSignal[], friends: [] as Operator[], pendingIn: [] as { id: string; requester: Operator }[] }

  const opId = (op as Operator).id
  const admin = createAdminClient()
  const [entriesRes, signalsRes, friendsRes, pendingInRes] = await Promise.all([
    supabase.from('entries').select('*').eq('operator_id', opId).order('created_at', { ascending: false }).limit(10),
    supabase.from('profile_signals').select('*, author:operators!author_id(*)').eq('target_id', opId).order('created_at', { ascending: false }),
    admin.from('friendships')
      .select('id, requester_id, addressee_id, status, requester:operators!requester_id(*), addressee:operators!addressee_id(*)')
      .or(`requester_id.eq.${opId},addressee_id.eq.${opId}`)
      .eq('status', 'accepted'),
    admin.from('friendships')
      .select('id, requester:operators!requester_id(*)')
      .eq('addressee_id', opId)
      .eq('status', 'pending'),
  ])

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
