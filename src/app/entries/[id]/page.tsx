import { supabase } from '@/lib/supabase'
import { getCurrentOperator } from '@/lib/session'
import { TopBar } from '@/components/shell/TopBar'
import { Nav } from '@/components/shell/Nav'
import { Footer } from '@/components/shell/Footer'
import { DataStream } from '@/components/shell/DataStream'
import { EntryDetailClient } from './EntryDetailClient'
import type { Entry, Signal } from '@/lib/types'

async function getData(id: string) {
  const [entryRes, signalsRes] = await Promise.all([
    supabase.from('entries').select('*, operator:operators(*)').eq('id', id).single(),
    supabase.from('signals').select('*, operator:operators(*)').eq('entry_id', id).order('created_at'),
  ])
  return {
    entry: entryRes.data as Entry | null,
    signals: (signalsRes.data ?? []) as Signal[],
  }
}

export default async function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [{ entry, signals }, currentOperator] = await Promise.all([getData(id), getCurrentOperator()])
  const userLabel = currentOperator ? `${currentOperator.id} · ${currentOperator.callsign}` : null

  return (
    <div className="page">
      <DataStream side="left" />
      <DataStream side="right" />
      <div className="scanline-sweep" />
      <TopBar user={userLabel} />
      <Nav />
      <EntryDetailClient entry={entry} signals={signals} entryId={id} currentOperator={currentOperator} />
      <Footer index="002 / 005" />
    </div>
  )
}
