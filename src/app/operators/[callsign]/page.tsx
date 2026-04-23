import { supabase } from '@/lib/supabase'
import { getCurrentOperator } from '@/lib/session'
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

  if (!op) return { operator: null, entries: [] as Entry[], profileSignals: [] as ProfileSignal[] }

  const opId = (op as Operator).id
  const [entriesRes, signalsRes] = await Promise.all([
    supabase.from('entries').select('*').eq('operator_id', opId).order('created_at', { ascending: false }).limit(10),
    supabase.from('profile_signals').select('*, author:operators(*)').eq('target_id', opId).order('created_at', { ascending: false }),
  ])

  return {
    operator: op as Operator,
    entries: (entriesRes.data ?? []) as Entry[],
    profileSignals: (signalsRes.data ?? []) as ProfileSignal[],
  }
}

export default async function OperatorPage({ params }: { params: Promise<{ callsign: string }> }) {
  const { callsign } = await params
  const [data, currentOperator] = await Promise.all([getData(callsign), getCurrentOperator()])
  const userLabel = currentOperator ? `${currentOperator.id} · ${currentOperator.callsign}` : null

  return (
    <div className="page">
      <DataStream side="left" />
      <DataStream side="right" />
      <div className="scanline-sweep" />
      <TopBar user={userLabel} />
      <Nav />
      <ProfileClient {...data} currentOperator={currentOperator} />
      <Footer index="003 / 005" />
    </div>
  )
}
