import { supabase } from '@/lib/supabase'
import { TopBar } from '@/components/shell/TopBar'
import { Nav } from '@/components/shell/Nav'
import { Footer } from '@/components/shell/Footer'
import { DataStream } from '@/components/shell/DataStream'
import { AdminClient } from './AdminClient'
import type { Operator, Entry } from '@/lib/types'

async function getData() {
  const [opsRes, entriesRes] = await Promise.all([
    supabase.from('operators').select('*').order('created_at'),
    supabase.from('entries').select('*, operator:operators!operator_id(*)').order('created_at', { ascending:false }).limit(20),
  ])
  return {
    operators: (opsRes.data ?? []) as Operator[],
    entries:   (entriesRes.data ?? []) as Entry[],
  }
}

export default async function ControlPage() {
  const data = await getData()

  return (
    <div className="page">
      <DataStream side="left" />
      <DataStream side="right" />
      <div className="scanline-sweep" />
      <TopBar user="F3X-001 · KURIER" status="SUPERADMIN" />
      <div className="superadmin-banner">
        <span className="dot dot-mag" />◢ SUPERADMIN MÓD · MINDEN MŰVELET AUDITÁLVA
        <span style={{flex:1}}/>
        <span>SESSION · SES-7F2A-0481 · 14:22 MARADÉK</span>
      </div>
      <Nav />
      <AdminClient {...data} />
      <Footer index="005 / 005" />
    </div>
  )
}
