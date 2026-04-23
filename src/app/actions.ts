'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentOperator } from '@/lib/session'
import type { EntryKind } from '@/lib/types'

/* ─── Auth ─── */

export async function login(formData: FormData) {
  const supabase = await createClient()
  const callsign = (formData.get('callsign') as string | null)?.trim().toUpperCase() ?? ''
  const password = (formData.get('password') as string | null) ?? ''

  if (!callsign || !password) {
    return { error: 'Hívójel és jelszó megadása kötelező.' }
  }

  const email = `${callsign}@f3xykee.net`
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'HITELESÍTÉS SIKERTELEN · Hibás hívójel vagy jelszó.' }
  }

  return { success: true }
}

export async function register(formData: FormData) {
  const callsign = (formData.get('callsign') as string | null)?.trim().toUpperCase() ?? ''
  const password = (formData.get('password') as string | null) ?? ''

  if (!callsign || callsign.length < 3) {
    return { error: 'A hívójel legalább 3 karakter.' }
  }
  if (!/^[A-Z0-9]+$/.test(callsign)) {
    return { error: 'A hívójel csak betűket és számokat tartalmazhat.' }
  }
  if (!password || password.length < 6) {
    return { error: 'A jelszó legalább 6 karakter.' }
  }

  const admin = createAdminClient()

  // Ellenőrzés: foglalt-e már a hívójel
  const { data: existing } = await admin
    .from('operators')
    .select('id')
    .eq('callsign', callsign)
    .single()

  if (existing) {
    return { error: 'Ez a hívójel már foglalt.' }
  }

  const email = `${callsign}@f3xykee.net`

  // Admin klienssel létrehozzuk a usert email-megerősítés nélkül
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { callsign },
  })

  if (authError || !authData.user) {
    return { error: authError?.message ?? 'Regisztráció sikertelen.' }
  }

  const opId = 'F3X-' + String(Math.floor(Math.random() * 900) + 100)
  const { error: insertError } = await admin.from('operators').insert({
    id: opId,
    auth_id: authData.user.id,
    callsign,
    level: 1,
    role: 'operator',
    node: 'f3x-pri-01',
    joined_cycle: 47,
    bio: null,
  })

  if (insertError) {
    // Rollback: töröljük az auth usert ha az operator insert sikertelen
    await admin.auth.admin.deleteUser(authData.user.id)
    return { error: 'Operátor rekord létrehozása sikertelen: ' + insertError.message }
  }

  // Bejelentkezés a frissen létrehozott userrel
  const regularClient = await createClient()
  await regularClient.auth.signInWithPassword({ email, password })

  return { success: true }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/gate')
}

/* ─── Entries ─── */

export async function createEntry(formData: FormData) {
  const op = await getCurrentOperator()
  if (!op || (op.role !== 'admin' && op.role !== 'superadmin')) {
    return { error: 'Nincs jogosultságod bejegyzés létrehozásához.' }
  }

  const title   = (formData.get('title') as string).trim()
  const content = (formData.get('content') as string).trim()
  const kind    = (formData.get('kind') as string) as EntryKind
  const sigsRaw = (formData.get('sigs') as string) ?? ''
  const sigs    = sigsRaw.split(',').map(s => s.trim()).filter(Boolean)

  if (!title || !content) {
    return { error: 'Cím és tartalom kötelező.' }
  }

  const supabase = await createClient()

  // Generate LOG ID
  const { count } = await supabase
    .from('entries')
    .select('*', { count: 'exact', head: true })

  const nextNum = (count ?? 0) + 2482
  const id = `LOG-${nextNum}`

  const { error } = await supabase.from('entries').insert({
    id,
    title,
    content,
    kind,
    excerpt: content.slice(0, 180),
    operator_id: op.id,
    cycle: 47,
    sigs,
    priority: formData.get('priority') === 'on',
    alert: false,
  })

  if (error) return { error: error.message }

  revalidatePath('/')
  revalidatePath(`/entries/${id}`)
  return { success: true, id }
}

/* ─── Signals (jelzések bejegyzésre) ─── */

export async function createSignal(formData: FormData) {
  const op = await getCurrentOperator()
  if (!op) return { error: 'Be kell lépni jelzés küldéséhez.' }

  const supabase = await createClient()
  const entryId  = formData.get('entry_id') as string
  const text     = (formData.get('text') as string).trim()
  const parentId = formData.get('parent_id') as string | null

  if (!text) return { error: 'A jelzés nem lehet üres.' }

  const { error } = await supabase.from('signals').insert({
    entry_id:    entryId,
    operator_id: op.id,
    parent_id:   parentId || null,
    text,
    sigs:        [],
    verified:    op.level >= 3,
  })

  if (error) return { error: error.message }

  revalidatePath(`/entries/${entryId}`)
  return { success: true }
}

/* ─── Profile signals (profil-írások) ─── */

export async function createProfileSignal(formData: FormData) {
  const op = await getCurrentOperator()
  if (!op) return { error: 'Be kell lépni jelzés küldéséhez.' }

  const supabase  = await createClient()
  const targetId  = formData.get('target_id') as string
  const text      = (formData.get('text') as string).trim()

  if (!text) return { error: 'Az üzenet nem lehet üres.' }

  const { error } = await supabase.from('profile_signals').insert({
    target_id:  targetId,
    author_id:  op.id,
    text,
    verified:   op.level >= 3,
  })

  if (error) return { error: error.message }

  revalidatePath(`/operators/${targetId}`)
  return { success: true }
}

/* ─── Reads counter ─── */

export async function incrementReads(entryId: string) {
  const supabase = await createClient()
  await supabase.rpc('increment_reads', { entry_id: entryId })
}
