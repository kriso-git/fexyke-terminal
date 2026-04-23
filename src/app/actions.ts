'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
// toggleReaction uses admin client to bypass RLS
import { getCurrentOperator } from '@/lib/session'
import type { EntryKind } from '@/lib/types'

/* ─── Auth ─── */

export async function login(formData: FormData) {
  try {
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
  } catch (err) {
    console.error('login error:', err)
    return { error: 'Szerver hiba történt. Próbáld újra.' }
  }
}

export async function register(formData: FormData) {
  try {
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

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return { error: 'Szerver konfiguráció hiányzik. Értesítsd az adminisztrátort.' }
    }

    const admin = createAdminClient()
    const email = `${callsign}@f3xykee.net`

    // Ellenőrzés: foglalt-e már a hívójel
    const { data: existing } = await admin
      .from('operators')
      .select('id')
      .eq('callsign', callsign)
      .single()

    if (existing) {
      return { error: 'Ez a hívójel már foglalt.' }
    }

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
      await admin.auth.admin.deleteUser(authData.user.id)
      return { error: 'Operátor rekord létrehozása sikertelen: ' + insertError.message }
    }

    // Bejelentkezés a frissen létrehozott userrel
    const regularClient = await createClient()
    await regularClient.auth.signInWithPassword({ email, password })

    return { success: true }
  } catch (err) {
    console.error('register error:', err)
    return { error: 'Szerver hiba történt. Próbáld újra.' }
  }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/gate')
}

/* ─── Entries ─── */

export async function createEntry(formData: FormData) {
  try {
    const op = await getCurrentOperator()
    if (!op || (op.role !== 'admin' && op.role !== 'superadmin')) {
      return { error: 'Nincs jogosultságod bejegyzés létrehozásához.' }
    }

    const title      = ((formData.get('title') as string) ?? '').trim()
    const content    = ((formData.get('content') as string) ?? '').trim()
    const kind       = ((formData.get('kind') as string) ?? 'POSZT') as EntryKind
    const sigsRaw    = (formData.get('sigs') as string) ?? ''
    const sigs       = sigsRaw.split(',').map(s => s.trim()).filter(Boolean)
    const mediaUrl   = ((formData.get('media_url') as string) ?? '').trim() || null
    const mediaType  = ((formData.get('media_type') as string) ?? '').trim() || null
    const mediaLabel = ((formData.get('media_label') as string) ?? '').trim() || null

    if (!title) return { error: 'Cím megadása kötelező.' }
    if (!content && !mediaUrl) return { error: 'Tartalom vagy média megadása kötelező.' }

    // Use admin client to bypass RLS for insert
    const admin = createAdminClient()
    const { count } = await admin.from('entries').select('*', { count:'exact', head:true })
    const id = `LOG-${(count ?? 0) + 2482}`

    const plainText = content.replace(/<[^>]+>/g, '')
    const excerpt   = plainText.slice(0, 180) || mediaLabel || title.slice(0, 180)

    // Only include media fields when they have values (avoids errors if migration not yet run)
    const baseRow = {
      id, title, content, kind, excerpt,
      operator_id: op.id,
      cycle: 47, sigs,
      priority: formData.get('priority') === 'on',
      alert: false,
    }
    const mediaRow = mediaUrl
      ? { media_url: mediaUrl, media_type: mediaType, media_label: mediaLabel }
      : {}

    const { error } = await admin.from('entries').insert({ ...baseRow, ...mediaRow })

    if (error) {
      // If media columns missing (migration not run), retry without them
      if (error.message.includes('media_') || error.message.includes('column')) {
        const { error: e2 } = await admin.from('entries').insert(baseRow)
        if (e2) return { error: e2.message }
      } else {
        return { error: error.message }
      }
    }

    revalidatePath('/', 'layout')
    revalidatePath(`/entries/${id}`)
    return { success: true, id }
  } catch (err) {
    console.error('createEntry error:', err)
    return { error: 'Szerver hiba. Próbáld újra.' }
  }
}

export async function toggleReaction(entryId: string, emoji: string) {
  try {
    const op = await getCurrentOperator()
    if (!op) return { error: 'Be kell lépni a reakcióhoz.' }

    const admin = createAdminClient()

    const { data: existing } = await admin
      .from('entry_reactions')
      .select('*')
      .eq('entry_id', entryId)
      .eq('operator_id', op.id)
      .eq('emoji', emoji)
      .maybeSingle()

    if (existing) {
      await admin.from('entry_reactions').delete()
        .eq('entry_id', entryId).eq('operator_id', op.id).eq('emoji', emoji)
    } else {
      await admin.from('entry_reactions').insert({ entry_id: entryId, operator_id: op.id, emoji })
    }

    const { data: all } = await admin.from('entry_reactions').select('emoji, operator_id').eq('entry_id', entryId)
    const counts: Record<string, number> = {}
    const userRx: string[] = []
    for (const r of all ?? []) {
      counts[r.emoji] = (counts[r.emoji] ?? 0) + 1
      if (r.operator_id === op.id) userRx.push(r.emoji)
    }

    revalidatePath('/')
    revalidatePath(`/entries/${entryId}`)
    return { success: true, reactions: counts, userReactions: userRx }
  } catch (err) {
    console.error('toggleReaction error:', err)
    return { error: 'Reakció rögzítése sikertelen.' }
  }
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
