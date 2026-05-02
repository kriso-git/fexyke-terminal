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

  // Fire-and-forget last_seen update (use admin client so it's always allowed; ignore errors if column missing)
  if (data) {
    try {
      const admin = createAdminClient()
      void admin.from('operators').update({ last_seen: new Date().toISOString() }).eq('id', (data as Operator).id)
    } catch {}
  }

  return data as Operator | null
}
