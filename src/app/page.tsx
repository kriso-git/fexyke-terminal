import { supabase } from '@/lib/supabase'
import { getCurrentOperator } from '@/lib/session'
import { TopBar } from '@/components/shell/TopBar'
import { Nav } from '@/components/shell/Nav'
import { Footer } from '@/components/shell/Footer'
import { DataStream } from '@/components/shell/DataStream'
import { HomeClient } from './HomeClient'
import type { Entry, Operator, Thread } from '@/lib/types'

async function getData() {
  const [entriesRes, operatorsRes, threadsRes] = await Promise.all([
    supabase
      .from('entries')
      .select('*, operator:operators(*)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('operators')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(20),
    supabase
      .from('threads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(4),
  ])

  return {
    entries: (entriesRes.data ?? []) as Entry[],
    operators: (operatorsRes.data ?? []) as Operator[],
    threads: (threadsRes.data ?? []) as Thread[],
  }
}

export default async function HomePage() {
  const [data, currentOperator] = await Promise.all([getData(), getCurrentOperator()])
  const userLabel = currentOperator ? `${currentOperator.id} · ${currentOperator.callsign}` : null

  return (
    <div className="page">
      <DataStream side="left" />
      <DataStream side="right" />
      <div className="scanline-sweep" />
      <TopBar user={userLabel} />
      <Nav />
      <HomeClient {...data} currentOperator={currentOperator} />
      <Footer index="001 / 005" />
    </div>
  )
}
