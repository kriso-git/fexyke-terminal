import { createClient } from './supabase-server'
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

  return data as Operator | null
}
