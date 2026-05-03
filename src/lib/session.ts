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

  // Throttle last_seen writes — only update if older than 60 seconds
  if (data) {
    const op = data as Operator
    const lastSeen = op.last_seen ? new Date(op.last_seen).getTime() : 0
    const staleSec = (Date.now() - lastSeen) / 1000
    if (staleSec > 60) {
      try {
        const admin = createAdminClient()
        const now = new Date().toISOString()
        await admin.from('operators').update({ last_seen: now }).eq('id', op.id)
        op.last_seen = now
      } catch {}
    }
  }

  return data as Operator | null
}
