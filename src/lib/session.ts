import { createClient } from './supabase-server'
import { createAdminClient } from './supabase-admin'
import type { Operator } from './types'

export async function getSession() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getCurrentOperator(): Promise<Operator | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('operators')
    .select('*')
    .eq('auth_id', user.id)
    .single()

  // Synchronously refresh last_seen so the value we return is fresh
  if (data) {
    try {
      const admin = createAdminClient()
      const now = new Date().toISOString()
      await admin.from('operators').update({ last_seen: now }).eq('id', (data as Operator).id)
      ;(data as Operator).last_seen = now
    } catch {}
  }

  return data as Operator | null
}
