import { redirect } from 'next/navigation'
import { getCurrentOperator } from '@/lib/session'
import { createAdminClient } from '@/lib/supabase-admin'
import { TopBar } from '@/components/shell/TopBar'
import { Nav } from '@/components/shell/Nav'
import { Footer } from '@/components/shell/Footer'
import { DataStream } from '@/components/shell/DataStream'
import { AdminClient } from './AdminClient'
import type { Operator, Entry } from '@/lib/types'

async function getData() {
  const admin = createAdminClient()
  const [opsRes, entriesRes] = await Promise.all([
    admin.from('operators').select('*').order('created_at'),
    admin.from('entries').select('*, operator:operators!operator_id(*)').order('created_at', { ascending: false }).limit(100),
  ])
  return {
    operators: (opsRes.data ?? []) as Operator[],
    entries: (entriesRes.data ?? []) as Entry[],
  }
}

export default async function ControlPage() {
  const operator = await getCurrentOperator()
  if (!operator || operator.role !== 'superadmin') {
    redirect('/')
  }

  const data = await getData()

  return (
    <div className="page">
      <DataStream side="left" />
      <DataStream side="right" />
      <div className="scanline-sweep" />
      <TopBar user={`${operator.id} · ${operator.callsign}`} status={operator.role.toUpperCase()} />
      <Nav role={operator.role} />
      <AdminClient {...data} currentOperator={operator} />
      <Footer index="005 / 005" />
    </div>
  )
}
