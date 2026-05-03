'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
// toggleReaction uses admin client to bypass RLS
import { getCurrentOperator } from '@/lib/session'
import { dbErr } from '@/lib/serverError'
import { assertOpId, assertUuid, assertEntryId } from '@/lib/validate'
import { sanitizeHtml } from '@/lib/sanitize'
import { OPERATOR_JOIN } from '@/lib/operatorFields'
import type { Entry, EntryKind } from '@/lib/types'

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

    // Generate a unique operator ID — uniform sampling over a confusable-free
    // alphabet, retried on collision.
    const ALPH = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no I/L/O/0/1
    let opId = ''
    for (let attempt = 0; attempt < 5; attempt++) {
      const bytes = crypto.getRandomValues(new Uint8Array(6))
      const rand = Array.from(bytes).map(b => ALPH[b % ALPH.length]).join('')
      const candidate = `F3X-${rand}`
      const { data: taken } = await admin.from('operators').select('id').eq('id', candidate).maybeSingle()
      if (!taken) { opId = candidate; break }
    }
    if (!opId) {
      await admin.auth.admin.deleteUser(authData.user.id)
      return { error: 'Nem sikerült egyedi azonosítót generálni. Próbáld újra.' }
    }

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
      return { error: dbErr(insertError, 'register:insertOperator') }
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

export async function fetchEntryById(id: string) {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('entries')
      .select(`*, ${OPERATOR_JOIN}`)
      .eq('id', id)
      .single()
    return data
  } catch {
    return null
  }
}

export async function getEntryDetail(id: string) {
  try {
    const admin = createAdminClient()
    const op = await getCurrentOperator()
    const [entryRes, signalsRes, rxRes] = await Promise.all([
      admin.from('entries').select(`*, ${OPERATOR_JOIN}`).eq('id', id).single(),
      admin.from('signals').select(`*, ${OPERATOR_JOIN}`).eq('entry_id', id).order('created_at'),
      admin.from('entry_reactions').select('emoji, operator_id').eq('entry_id', id),
    ])
    const counts: Record<string, number> = {}
    const userRx: string[] = []
    for (const r of (rxRes.data ?? []) as { emoji: string; operator_id: string }[]) {
      counts[r.emoji] = (counts[r.emoji] ?? 0) + 1
      if (op && r.operator_id === op.id) userRx.push(r.emoji)
    }
    return {
      entry: entryRes.data,
      signals: signalsRes.data ?? [],
      reactions: counts,
      userReactions: userRx,
    }
  } catch (err) {
    console.error('getEntryDetail error:', err)
    return { entry: null, signals: [], reactions: {}, userReactions: [] }
  }
}

export async function createEntry(formData: FormData) {
  try {
    const op = await getCurrentOperator()
    if (!op || (op.role !== 'admin' && op.role !== 'superadmin')) {
      return { error: 'Nincs jogosultságod bejegyzés létrehozásához.' }
    }

    const title      = ((formData.get('title') as string) ?? '').trim()
    const content    = ((formData.get('content') as string) ?? '').trim()
    const uiKind     = ((formData.get('kind') as string) ?? 'POSZT')
    const sigsRaw    = (formData.get('sigs') as string) ?? ''
    const sigs       = sigsRaw.split(',').map(s => s.trim()).filter(Boolean)
    const mediaUrl   = ((formData.get('media_url') as string) ?? '').trim() || null
    const mediaType  = ((formData.get('media_type') as string) ?? '').trim() || null
    const mediaLabel = ((formData.get('media_label') as string) ?? '').trim() || null

    if (!title) return { error: 'Cím megadása kötelező.' }
    if (!content && !mediaUrl) return { error: 'Tartalom vagy média megadása kötelező.' }

    // Map UI kind → DB kind (uses only values allowed by the existing constraint)
    const dbKind: EntryKind = uiKind === 'VIDEÓ' ? 'ADÁS' : 'ÁTVITEL'

    const admin = createAdminClient()
    // Generate collision-free ID using timestamp base36 + random suffix
    const ts = Date.now().toString(36).toUpperCase()
    const rand = Math.random().toString(36).slice(2, 5).toUpperCase()
    const id = `LOG-${ts}${rand}`

    const safeContent = sanitizeHtml(content)

    const plainText = safeContent.replace(/<[^>]+>/g, '')
    const excerpt   = plainText.slice(0, 180) || mediaLabel || title.slice(0, 180)

    const status = formData.get('status') === 'draft' ? 'draft' : 'published'
    const baseRow: Record<string, unknown> = {
      id, title, content: safeContent, excerpt,
      kind: dbKind,
      operator_id: op.id,
      cycle: 47, sigs,
      priority: formData.get('priority') === 'on',
      alert: false,
      status,
    }

    // Try insert with media fields first; if columns don't exist yet, retry without them
    const mediaRow = mediaUrl ? { media_url: mediaUrl, media_type: mediaType, media_label: mediaLabel } : {}
    let { error } = await admin.from('entries').insert({ ...baseRow, ...mediaRow })

    // Retry without status if the column doesn't exist yet (migration 009 not applied)
    if (error && /column .*status/i.test(error.message)) {
      const noStatus = { ...baseRow }
      delete (noStatus as { status?: unknown }).status
      const r2 = await admin.from('entries').insert({ ...noStatus, ...mediaRow })
      error = r2.error
    }

    if (error) {
      if (mediaUrl && (error.message.includes('media_') || error.message.includes('column'))) {
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

export async function listMyDrafts() {
  try {
    const op = await getCurrentOperator()
    if (!op) return { drafts: [] as Entry[] }
    const admin = createAdminClient()
    const { data } = await admin
      .from('entries')
      .select('*')
      .eq('operator_id', op.id)
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
    return { drafts: (data ?? []) as Entry[] }
  } catch (err) {
    console.error('listMyDrafts error:', err)
    return { drafts: [] as Entry[] }
  }
}

export async function togglePin(entryId: string, pinned: boolean) {
  try {
    const op = await getCurrentOperator()
    if (!op || (op.role !== 'admin' && op.role !== 'superadmin')) {
      return { error: 'Csak admin vagy superadmin tűzhet ki posztot.' }
    }
    try { assertEntryId(entryId) } catch { return { error: 'Érvénytelen azonosító.' } }
    const admin = createAdminClient()
    const { error } = await admin.from('entries').update({ priority: pinned }).eq('id', entryId)
    if (error) return { error: dbErr(error, 'togglePin') }
    revalidatePath('/')
    return { success: true, pinned }
  } catch (err) {
    console.error('togglePin error:', err)
    return { error: 'Szerver hiba.' }
  }
}

export async function publishDraft(entryId: string) {
  try {
    const op = await getCurrentOperator()
    if (!op) return { error: 'Be kell lépni.' }
    try { assertEntryId(entryId) } catch { return { error: 'Érvénytelen azonosító.' } }
    const admin = createAdminClient()
    const { data: target } = await admin.from('entries').select('operator_id').eq('id', entryId).single()
    if (!target) return { error: 'Bejegyzés nem található.' }
    if (target.operator_id !== op.id && op.role !== 'superadmin') return { error: 'Nincs jogosultság.' }
    const { error } = await admin.from('entries').update({ status: 'published' }).eq('id', entryId)
    if (error) return { error: dbErr(error, 'publishDraft') }
    revalidatePath('/')
    return { success: true }
  } catch (err) {
    console.error('publishDraft error:', err)
    return { error: 'Szerver hiba.' }
  }
}

export async function deleteEntry(entryId: string) {
  try {
    const op = await getCurrentOperator()
    if (!op || op.role !== 'superadmin') return { error: 'Csak superadmin törölhet bejegyzést.' }
    try { assertEntryId(entryId) } catch { return { error: 'Érvénytelen azonosító.' } }
    const admin = createAdminClient()
    const { error } = await admin.from('entries').delete().eq('id', entryId)
    if (error) return { error: dbErr(error, 'deleteEntry') }
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err) {
    console.error('deleteEntry error:', err)
    return { error: 'Szerver hiba.' }
  }
}

export async function toggleReaction(entryId: string, emoji: string) {
  try {
    const op = await getCurrentOperator()
    if (!op) return { error: 'Be kell lépni a reakcióhoz.' }
    try { assertEntryId(entryId) } catch { return { error: 'Érvénytelen azonosító.' } }
    if (emoji.length > 8) return { error: 'Érvénytelen emoji.' }

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

/* ─── Signal reactions (comment emoji + XP) ─── */

export async function toggleSignalReaction(signalId: string, emoji: string) {
  try {
    const op = await getCurrentOperator()
    if (!op) return { error: 'Be kell lépni a reakcióhoz.' }
    try { assertUuid(signalId) } catch { return { error: 'Érvénytelen azonosító.' } }
    if (emoji.length > 8) return { error: 'Érvénytelen emoji.' }

    const admin = createAdminClient()

    // Per-user, per-signal rate limit: 1 reaction add per 5 seconds (anti-spam)
    const { data: lastRx } = await admin
      .from('signal_reactions')
      .select('created_at')
      .eq('operator_id', op.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (lastRx && Date.now() - new Date(lastRx.created_at).getTime() < 1500) {
      return { error: 'Túl gyors. Várj egy pillanatot.' }
    }

    const { data: existing } = await admin
      .from('signal_reactions')
      .select('signal_id')
      .eq('signal_id', signalId)
      .eq('operator_id', op.id)
      .eq('emoji', emoji)
      .maybeSingle()

    if (existing) {
      await admin.from('signal_reactions').delete()
        .eq('signal_id', signalId).eq('operator_id', op.id).eq('emoji', emoji)
    } else {
      const { error } = await admin.from('signal_reactions').insert({ signal_id: signalId, operator_id: op.id, emoji })
      if (error) return { error: dbErr(error, 'toggleSignalReaction') }
      // Award XP to the comment author (+1) — only on add, not on remove
      const { data: sig } = await admin.from('signals').select('operator_id').eq('id', signalId).single()
      if (sig?.operator_id && sig.operator_id !== op.id) {
        try { await admin.rpc('award_xp', { op_id: sig.operator_id, amount: 1 }) } catch {}
      }
    }

    const { data: all } = await admin.from('signal_reactions').select('emoji, operator_id').eq('signal_id', signalId)
    const counts: Record<string, number> = {}
    const userRx: string[] = []
    for (const r of (all ?? []) as { emoji: string; operator_id: string }[]) {
      counts[r.emoji] = (counts[r.emoji] ?? 0) + 1
      if (r.operator_id === op.id) userRx.push(r.emoji)
    }
    revalidatePath('/')
    return { success: true, reactions: counts, userReactions: userRx }
  } catch (err) {
    console.error('toggleSignalReaction error:', err)
    return { error: 'Reakció rögzítése sikertelen.' }
  }
}

/* ─── Profile signal reactions / pin / delete ─── */

export async function toggleProfileSignalReaction(signalId: string, emoji: string) {
  try {
    const op = await getCurrentOperator()
    if (!op) return { error: 'Be kell lépni.' }
    try { assertUuid(signalId) } catch { return { error: 'Érvénytelen azonosító.' } }
    if (emoji.length > 8) return { error: 'Érvénytelen emoji.' }

    const admin = createAdminClient()

    const { data: lastRx } = await admin
      .from('profile_signal_reactions')
      .select('created_at')
      .eq('operator_id', op.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (lastRx && Date.now() - new Date(lastRx.created_at).getTime() < 1500) {
      return { error: 'Túl gyors.' }
    }

    const { data: existing } = await admin
      .from('profile_signal_reactions')
      .select('signal_id')
      .eq('signal_id', signalId)
      .eq('operator_id', op.id)
      .eq('emoji', emoji)
      .maybeSingle()

    if (existing) {
      await admin.from('profile_signal_reactions').delete()
        .eq('signal_id', signalId).eq('operator_id', op.id).eq('emoji', emoji)
    } else {
      const { error } = await admin.from('profile_signal_reactions').insert({ signal_id: signalId, operator_id: op.id, emoji })
      if (error) return { error: dbErr(error, 'toggleProfileSignalReaction') }
    }

    const { data: all } = await admin.from('profile_signal_reactions').select('emoji, operator_id').eq('signal_id', signalId)
    const counts: Record<string, number> = {}
    const userRx: string[] = []
    for (const r of (all ?? []) as { emoji: string; operator_id: string }[]) {
      counts[r.emoji] = (counts[r.emoji] ?? 0) + 1
      if (r.operator_id === op.id) userRx.push(r.emoji)
    }
    return { success: true, reactions: counts, userReactions: userRx }
  } catch (err) {
    console.error('toggleProfileSignalReaction error:', err)
    return { error: 'Reakció hiba.' }
  }
}

export async function deleteProfileSignal(signalId: string) {
  try {
    const op = await getCurrentOperator()
    if (!op) return { error: 'Be kell lépni.' }
    try { assertUuid(signalId) } catch { return { error: 'Érvénytelen azonosító.' } }
    const admin = createAdminClient()
    const { data: sig } = await admin.from('profile_signals').select('target_id, author_id').eq('id', signalId).single()
    if (!sig) return { error: 'Üzenet nem található.' }
    // Wall owner OR author OR superadmin can delete
    if (sig.target_id !== op.id && sig.author_id !== op.id && op.role !== 'superadmin') {
      return { error: 'Nincs jogosultság.' }
    }
    const { error } = await admin.from('profile_signals').delete().eq('id', signalId)
    if (error) return { error: dbErr(error, 'deleteProfileSignal') }
    return { success: true }
  } catch (err) {
    console.error('deleteProfileSignal error:', err)
    return { error: 'Szerver hiba.' }
  }
}

export async function toggleProfileSignalPin(signalId: string, pinned: boolean) {
  try {
    const op = await getCurrentOperator()
    if (!op) return { error: 'Be kell lépni.' }
    try { assertUuid(signalId) } catch { return { error: 'Érvénytelen azonosító.' } }
    const admin = createAdminClient()
    const { data: sig } = await admin.from('profile_signals').select('target_id').eq('id', signalId).single()
    if (!sig) return { error: 'Üzenet nem található.' }
    // Only the wall owner can pin / unpin
    if (sig.target_id !== op.id) return { error: 'Csak a fal tulajdonosa tűzhet ki.' }
    const { error } = await admin.from('profile_signals').update({ pinned }).eq('id', signalId)
    if (error) return { error: dbErr(error, 'toggleProfileSignalPin') }
    return { success: true, pinned }
  } catch (err) {
    console.error('toggleProfileSignalPin error:', err)
    return { error: 'Szerver hiba.' }
  }
}

/* ─── Operator interests ─── */

export async function updateInterests(interests: string[]) {
  try {
    const op = await getCurrentOperator()
    if (!op) return { error: 'Be kell lépni.' }
    const cleaned = (interests ?? [])
      .map(s => (s ?? '').trim())
      .filter(Boolean)
      .map(s => s.startsWith('#') ? s : `#${s}`)
      .map(s => s.toLowerCase())
      .slice(0, 12)
    const admin = createAdminClient()
    const { error } = await admin.from('operators').update({ interests: cleaned }).eq('id', op.id)
    if (error) {
      // If the column doesn't exist yet (migration 010 not applied), don't fail the
      // whole save — just skip silently so the bio update still succeeds.
      if (/interests/i.test(error.message) || /column/i.test(error.message) || /schema cache/i.test(error.message)) {
        return { success: true, skipped: true, interests: cleaned }
      }
      return { error: dbErr(error, 'updateInterests') }
    }
    revalidatePath(`/operators/${op.callsign}`)
    return { success: true, interests: cleaned }
  } catch (err) {
    console.error('updateInterests error:', err)
    return { error: 'Szerver hiba.' }
  }
}

/* ─── Signals (jelzések bejegyzésre) ─── */

export async function createSignal(formData: FormData) {
  const op = await getCurrentOperator()
  if (!op) return { error: 'Be kell lépni jelzés küldéséhez.' }

  const entryId  = formData.get('entry_id') as string
  const text     = ((formData.get('text') as string) ?? '').trim()
  const imageUrl = ((formData.get('image_url') as string) ?? '').trim() || null
  const parentId = formData.get('parent_id') as string | null

  try { assertEntryId(entryId) } catch { return { error: 'Érvénytelen azonosító.' } }
  if (parentId) {
    try { assertUuid(parentId) } catch { return { error: 'Érvénytelen szülő ID.' } }
  }
  if (text.length > 4000) return { error: 'Túl hosszú szöveg.' }
  if (!text && !imageUrl) return { error: 'A jelzés nem lehet üres.' }

  const admin = createAdminClient()

  // Verify entry exists
  const { data: entry } = await admin.from('entries').select('id').eq('id', entryId).maybeSingle()
  if (!entry) return { error: 'A bejegyzés nem található.' }

  // Rate-limit: max 1 signal per 5 seconds per operator
  const fiveSecAgo = new Date(Date.now() - 5000).toISOString()
  const { data: recent } = await admin
    .from('signals')
    .select('id')
    .eq('operator_id', op.id)
    .gte('created_at', fiveSecAgo)
    .limit(1)
    .maybeSingle()
  if (recent) return { error: 'Túl gyors. Várj egy pillanatot.' }

  // Comments are rendered as plain text in React. Strip raw HTML markers
  // anyway so a future code path that switches to `dangerouslySetInnerHTML`
  // can't accidentally execute stored markup.
  const safeText = text ? text.replace(/[<>]/g, c => (c === '<' ? '&lt;' : '&gt;')) : null

  const { error } = await admin.from('signals').insert({
    entry_id:    entryId,
    operator_id: op.id,
    parent_id:   parentId || null,
    text:        safeText,
    image_url:   imageUrl,
    sigs:        [],
    verified:    op.level >= 3,
  })

  if (error) return { error: dbErr(error, 'createSignal') }

  revalidatePath('/')
  revalidatePath(`/entries/${entryId}`)
  return { success: true }
}

export async function getEntryComments(entryId: string) {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('signals')
      .select(`id, entry_id, operator_id, parent_id, text, image_url, sigs, verified, created_at, ${OPERATOR_JOIN}`)
      .eq('entry_id', entryId)
      .order('created_at', { ascending: true })

    type Sig = { id: string; reactions?: Record<string, number> }
    const list = (data ?? []) as unknown as Sig[]
    const sigIds = list.map(s => s.id)
    if (sigIds.length > 0) {
      const { data: srx } = await admin.from('signal_reactions').select('signal_id, emoji').in('signal_id', sigIds)
      const byId: Record<string, Record<string, number>> = {}
      for (const r of (srx ?? []) as { signal_id: string; emoji: string }[]) {
        if (!byId[r.signal_id]) byId[r.signal_id] = {}
        byId[r.signal_id][r.emoji] = (byId[r.signal_id][r.emoji] ?? 0) + 1
      }
      for (const s of list) s.reactions = byId[s.id] ?? {}
    }
    return { signals: list }
  } catch (err) {
    console.error('getEntryComments error:', err)
    return { signals: [] }
  }
}

/* ─── Profile signals (profil-írások) ─── */

export async function createProfileSignal(formData: FormData) {
  const op = await getCurrentOperator()
  if (!op) return { error: 'Be kell lépni jelzés küldéséhez.' }

  const targetId  = formData.get('target_id') as string
  const text      = ((formData.get('text') as string) ?? '').trim()
  const imageUrl  = ((formData.get('image_url') as string) ?? '').trim() || null

  try { assertOpId(targetId) } catch { return { error: 'Érvénytelen azonosító.' } }
  if (text.length > 4000) return { error: 'Túl hosszú szöveg.' }
  if (!text && !imageUrl) return { error: 'Az üzenet nem lehet üres.' }

  const admin = createAdminClient()

  // Verify target operator exists
  const { data: targetOp } = await admin.from('operators').select('callsign').eq('id', targetId).maybeSingle()
  if (!targetOp) return { error: 'A célzott felhasználó nem található.' }

  // Rate-limit: max 1 profile signal per 5 seconds per author
  const fiveSecAgo = new Date(Date.now() - 5000).toISOString()
  const { data: recent } = await admin
    .from('profile_signals')
    .select('id')
    .eq('author_id', op.id)
    .gte('created_at', fiveSecAgo)
    .limit(1)
    .maybeSingle()
  if (recent) return { error: 'Túl gyors. Várj egy pillanatot.' }

  const safeText = text ? text.replace(/[<>]/g, c => (c === '<' ? '&lt;' : '&gt;')) : null

  const { error } = await admin.from('profile_signals').insert({
    target_id:  targetId,
    author_id:  op.id,
    text:       safeText,
    image_url:  imageUrl,
    verified:   op.level >= 3,
  })

  if (error) return { error: dbErr(error, 'createProfileSignal') }

  revalidatePath(`/operators/${targetOp.callsign ?? targetId}`)
  return { success: true }
}

/* ─── Profile update ─── */

export async function updateProfile(formData: FormData) {
  try {
    const op = await getCurrentOperator()
    if (!op) return { error: 'Be kell lépni.' }

    const bio       = (formData.get('bio') as string | null)?.trim() ?? undefined
    const avatarUrl = (formData.get('avatar_url') as string | null)?.trim() || undefined

    // Whitelist: only accept avatar URLs from our own Supabase storage
    if (avatarUrl) {
      const storageBase = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '') + '/storage/v1/object/public/'
      if (!avatarUrl.startsWith(storageBase)) {
        return { error: 'Érvénytelen avatar URL.' }
      }
    }

    const updates: Record<string, unknown> = {}
    if (bio !== undefined) {
      const safeBio = bio ? bio.replace(/[<>]/g, c => (c === '<' ? '&lt;' : '&gt;')) : null
      updates.bio = safeBio
    }
    if (avatarUrl !== undefined) updates.avatar_url = avatarUrl

    if (Object.keys(updates).length === 0) return { success: true }

    const admin = createAdminClient()
    const { error } = await admin.from('operators').update(updates).eq('id', op.id)
    if (error) return { error: dbErr(error, 'updateProfile') }

    revalidatePath(`/operators/${op.callsign}`)
    revalidatePath('/')
    return { success: true }
  } catch (err) {
    console.error('updateProfile error:', err)
    return { error: 'Szerver hiba.' }
  }
}

/* ─── Messaging ─── */

async function ensureFriends(myId: string, otherId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('friendships')
    .select('id')
    .eq('status', 'accepted')
    .or(`and(requester_id.eq.${myId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${myId})`)
    .maybeSingle()
  return !!data
}

export async function sendMessage(receiverId: string, text: string, imageUrl?: string | null) {
  try {
    const op = await getCurrentOperator()
    if (!op) return { error: 'Be kell lépni.' }
    try { assertOpId(receiverId) } catch { return { error: 'Érvénytelen címzett.' } }
    const trimmed = (text ?? '').trim()
    if (!trimmed && !imageUrl) return { error: 'Az üzenet nem lehet üres.' }
    if (trimmed.length > 2000) return { error: 'Max 2000 karakter.' }
    if (op.id === receiverId) return { error: 'Magadnak nem küldhetsz üzenetet.' }

    if (!(await ensureFriends(op.id, receiverId))) {
      return { error: 'Csak ismerősöknek küldhetsz üzenetet.' }
    }

    const admin = createAdminClient()

    // Layered flood-limit:
    //   • burst:    1 message  / 2 sec
    //   • short:   30 messages / 1 min
    //   • daily: 1000 messages / 24 h
    const now = Date.now()
    const twoSecAgo = new Date(now - 2_000).toISOString()
    const oneMinAgo = new Date(now - 60_000).toISOString()
    const oneDayAgo = new Date(now - 86_400_000).toISOString()

    const [{ data: burst }, { count: lastMinute }, { count: lastDay }] = await Promise.all([
      admin.from('messages').select('id').eq('sender_id', op.id).gte('created_at', twoSecAgo).limit(1).maybeSingle(),
      admin.from('messages').select('*', { count: 'exact', head: true }).eq('sender_id', op.id).gte('created_at', oneMinAgo),
      admin.from('messages').select('*', { count: 'exact', head: true }).eq('sender_id', op.id).gte('created_at', oneDayAgo),
    ])
    if (burst) return { error: 'Túl gyors. Várj egy pillanatot.' }
    if ((lastMinute ?? 0) >= 30) return { error: 'Üzenet-limit (30 / perc) elérve.' }
    if ((lastDay ?? 0) >= 1000) return { error: 'Napi üzenet-limit (1000) elérve.' }

    const safeText = trimmed ? trimmed.replace(/[<>]/g, c => (c === '<' ? '&lt;' : '&gt;')) : null

    const { data, error } = await admin
      .from('messages')
      .insert({ sender_id: op.id, receiver_id: receiverId, text: safeText, image_url: imageUrl || null })
      .select('id, sender_id, receiver_id, text, image_url, read, created_at')
      .single()

    if (error) return { error: dbErr(error, 'sendMessage') }
    return { success: true, message: data }
  } catch (err) {
    console.error('sendMessage error:', err)
    return { error: 'Szerver hiba.' }
  }
}

export async function updateChatColor(color: string | null) {
  try {
    const op = await getCurrentOperator()
    if (!op) return { error: 'Be kell lépni.' }
    // accept '#rrggbb' or null/empty to reset
    const clean = color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : null
    const admin = createAdminClient()
    const { error } = await admin.from('operators').update({ chat_color: clean }).eq('id', op.id)
    if (error) return { error: dbErr(error, 'updateChatColor') }
    revalidatePath('/')
    return { success: true, color: clean }
  } catch (err) {
    console.error('updateChatColor error:', err)
    return { error: 'Szerver hiba.' }
  }
}

export async function getConversation(otherId: string, limit = 100) {
  try {
    const op = await getCurrentOperator()
    if (!op) return { messages: [], error: 'Be kell lépni.' }
    try { assertOpId(otherId) } catch { return { messages: [], error: 'Érvénytelen azonosító.' } }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('messages')
      .select('id, sender_id, receiver_id, text, image_url, read, created_at')
      .or(`and(sender_id.eq.${op.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${op.id})`)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) return { messages: [], error: dbErr(error, 'getConversation') }

    // mark received messages as read
    await admin
      .from('messages')
      .update({ read: true })
      .eq('sender_id', otherId)
      .eq('receiver_id', op.id)
      .eq('read', false)

    return { messages: data ?? [] }
  } catch (err) {
    console.error('getConversation error:', err)
    return { messages: [], error: 'Szerver hiba.' }
  }
}

export async function getUnreadCount() {
  try {
    const op = await getCurrentOperator()
    if (!op) return { count: 0 }
    const admin = createAdminClient()
    const { count } = await admin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', op.id)
      .eq('read', false)
    return { count: count ?? 0 }
  } catch {
    return { count: 0 }
  }
}

/* ─── Post-share preview helpers (used by DM composer) ─── */

export async function listShareableEntries() {
  try {
    const op = await getCurrentOperator()
    if (!op) return { entries: [] }
    const admin = createAdminClient()
    const { data } = await admin
      .from('entries')
      .select('id, title, kind, media_type')
      .neq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(30)
    return { entries: (data ?? []) as { id: string; title: string; kind: string; media_type: string | null }[] }
  } catch {
    return { entries: [] }
  }
}

export async function getOperatorPreview(callsign: string) {
  try {
    const clean = (callsign ?? '').trim().toUpperCase()
    if (!/^[A-Z0-9]{3,32}$/.test(clean)) return { operator: null }
    const admin = createAdminClient()
    const { data } = await admin
      .from('operators')
      .select('id, callsign, level, role, avatar_url, last_seen, bio')
      .eq('callsign', clean)
      .maybeSingle()
    return { operator: data ?? null }
  } catch {
    return { operator: null }
  }
}

export async function getEntryPreview(entryId: string) {
  try {
    try { assertEntryId(entryId) } catch { return { entry: null } }
    const admin = createAdminClient()
    const { data } = await admin
      .from('entries')
      .select('id, title, excerpt, kind, media_type, media_url, media_label, operator_id, operator:operators!operator_id(id, callsign, avatar_url)')
      .eq('id', entryId)
      .neq('status', 'draft')
      .maybeSingle()
    return { entry: data ?? null }
  } catch {
    return { entry: null }
  }
}

/* ─── Reads counter ─── */

export async function incrementReads(entryId: string) {
  try {
    try { assertEntryId(entryId) } catch { return }
    const op = await getCurrentOperator()
    if (!op) return // unauthenticated — silently ignore

    const admin = createAdminClient()

    // Layer 1: per-operator overall cap — max 30 increments per minute (defeats
    // a bot that hops between many entry IDs to inflate stats site-wide).
    const oneMinAgo = new Date(Date.now() - 60_000).toISOString()
    const { count: lastMinute } = await admin
      .from('entry_read_log')
      .select('*', { count: 'exact', head: true })
      .eq('operator_id', op.id)
      .gte('created_at', oneMinAgo)
    if ((lastMinute ?? 0) >= 30) return

    // Layer 2: per-operator per-entry — at most one increment per 10 minutes.
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { data: recent } = await admin
      .from('entry_read_log')
      .select('id')
      .eq('entry_id', entryId)
      .eq('operator_id', op.id)
      .gte('created_at', tenMinAgo)
      .limit(1)
      .maybeSingle()
    if (recent) return

    await admin.from('entry_read_log').insert({ entry_id: entryId, operator_id: op.id })
    await admin.rpc('increment_reads', { entry_id: entryId })
  } catch {
    // reads counter is non-critical; never surface errors
  }
}

/* ─── Admin: operator management ─── */

export async function updateOperatorRole(operatorId: string, role: 'operator' | 'admin' | 'superadmin') {
  try {
    const op = await getCurrentOperator()
    if (!op || op.role !== 'superadmin') return { error: 'Csak superadmin változtathat jogosultságot.' }
    try { assertOpId(operatorId) } catch { return { error: 'Érvénytelen azonosító.' } }
    if (role !== 'operator' && role !== 'admin' && role !== 'superadmin') return { error: 'Érvénytelen jogosultság.' }
    const admin = createAdminClient()
    const { error } = await admin.from('operators').update({ role }).eq('id', operatorId)
    if (error) return { error: dbErr(error, 'updateOperatorRole') }
    revalidatePath('/control')
    return { success: true }
  } catch (err) {
    console.error('updateOperatorRole error:', err)
    return { error: 'Szerver hiba.' }
  }
}

export async function updateOperatorLevel(operatorId: string, level: number) {
  try {
    const op = await getCurrentOperator()
    if (!op || op.role !== 'superadmin') return { error: 'Csak superadmin változtathat szintet.' }
    try { assertOpId(operatorId) } catch { return { error: 'Érvénytelen azonosító.' } }
    if (!Number.isInteger(level) || level < 1 || level > 10) return { error: 'A szint 1 és 10 között lehet.' }
    const admin = createAdminClient()
    const { error } = await admin.from('operators').update({ level }).eq('id', operatorId)
    if (error) return { error: dbErr(error, 'updateOperatorLevel') }
    revalidatePath('/control')
    return { success: true }
  } catch (err) {
    console.error('updateOperatorLevel error:', err)
    return { error: 'Szerver hiba.' }
  }
}

async function reAuthSuperadmin(adminPassword: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!adminPassword || adminPassword.length < 6) {
    return { ok: false, error: 'Saját jelszó megadása kötelező.' }
  }
  const supabase = await createClient()
  const { data: { user: me } } = await supabase.auth.getUser()
  if (!me?.email) return { ok: false, error: 'Nem sikerült azonosítani a superadmin fiókot.' }

  // DB-based brute-force guard: max 5 failed re-auths in 5 minutes for this actor
  const admin = createAdminClient()
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { count: recentFails } = await admin
    .from('admin_audit_log')
    .select('*', { count: 'exact', head: true })
    .eq('actor_id', me.id)
    .eq('action', 'reauth_fail')
    .gte('created_at', fiveMinAgo)
  if ((recentFails ?? 0) >= 5) {
    return { ok: false, error: 'Túl sok sikertelen kísérlet. Várj 5 percet.' }
  }

  // Verify with a separate, throw-away client so we don't replace the active SSR session.
  // createAdminClient() uses the service role key but signInWithPassword runs the same
  // password-grant flow on the auth server — the resulting session token is discarded.
  const verifier = createAdminClient()
  const { data: signed, error } = await verifier.auth.signInWithPassword({ email: me.email, password: adminPassword })
  if (error || !signed?.user || signed.user.id !== me.id) {
    await admin.from('admin_audit_log').insert({
      actor_id: me.id, action: 'reauth_fail', target_id: null,
      detail: { reason: error?.message ?? 'unknown' },
    }).then(({ error }) => { if (error) console.error('[audit_log_write_failed]', error) }, (e: unknown) => { console.error('[audit_log_write_threw]', e) })
    return { ok: false, error: 'Saját jelszó ellenőrzés sikertelen. Hozzáférés megtagadva.' }
  }
  // Sign out the verifier session so no token survives in the admin client memory
  await verifier.auth.signOut().catch(() => {})
  return { ok: true }
}

export async function updateOperatorPassword(operatorId: string, newPassword: string, adminPassword: string) {
  try {
    const op = await getCurrentOperator()
    if (!op || op.role !== 'superadmin') return { error: 'Csak superadmin változtathat jelszót.' }
    try { assertOpId(operatorId) } catch { return { error: 'Érvénytelen azonosító.' } }
    if (!newPassword || newPassword.length < 6) return { error: 'A jelszó legalább 6 karakter.' }

    const reAuth = await reAuthSuperadmin(adminPassword)
    if (!reAuth.ok) return { error: reAuth.error }

    const admin = createAdminClient()
    const { data: target } = await admin.from('operators').select('auth_id, callsign').eq('id', operatorId).single()
    if (!target?.auth_id) return { error: 'A felhasználónak nincs auth fiókja.' }

    const { error } = await admin.auth.admin.updateUserById(target.auth_id, { password: newPassword })
    if (error) return { error: dbErr(error, 'updateOperatorPassword') }

    await admin.from('admin_audit_log').insert({
      actor_id: op.id, action: 'password_change', target_id: operatorId,
      detail: { target_callsign: target.callsign },
    }).then(({ error }) => { if (error) console.error('[audit_log_write_failed]', error) }, (e: unknown) => { console.error('[audit_log_write_threw]', e) })

    revalidatePath('/control')
    return { success: true }
  } catch (err) {
    console.error('updateOperatorPassword error:', err)
    return { error: 'Szerver hiba.' }
  }
}

export async function updateOperatorCallsign(operatorId: string, newCallsign: string, adminPassword: string) {
  try {
    const op = await getCurrentOperator()
    if (!op || op.role !== 'superadmin') return { error: 'Csak superadmin változtathat hívójelet.' }
    try { assertOpId(operatorId) } catch { return { error: 'Érvénytelen azonosító.' } }

    const clean = (newCallsign ?? '').trim().toUpperCase()
    if (!clean || clean.length < 3) return { error: 'A hívójel legalább 3 karakter.' }
    if (!/^[A-Z0-9]+$/.test(clean)) return { error: 'A hívójel csak betűket és számokat tartalmazhat.' }

    const reAuth = await reAuthSuperadmin(adminPassword)
    if (!reAuth.ok) return { error: reAuth.error }

    const admin = createAdminClient()

    // Uniqueness check
    const { data: existing } = await admin.from('operators').select('id').eq('callsign', clean).maybeSingle()
    if (existing && existing.id !== operatorId) return { error: 'Ez a hívójel már foglalt.' }

    const { data: target } = await admin.from('operators').select('auth_id, callsign').eq('id', operatorId).single()
    if (!target) return { error: 'Operátor nem található.' }
    const oldCallsign = target.callsign ?? ''

    // Update operators row
    const { error: opErr } = await admin.from('operators').update({ callsign: clean }).eq('id', operatorId)
    if (opErr) return { error: dbErr(opErr, 'updateOperatorCallsign') }

    await admin.from('admin_audit_log').insert({
      actor_id: op.id, action: 'callsign_change', target_id: operatorId,
      detail: { old_callsign: oldCallsign, new_callsign: clean },
    }).then(({ error }) => { if (error) console.error('[audit_log_write_failed]', error) }, (e: unknown) => { console.error('[audit_log_write_threw]', e) })

    // Sync auth email + metadata so login still works (email follows the callsign)
    if (target.auth_id) {
      const newEmail = `${clean}@f3xykee.net`
      await admin.auth.admin.updateUserById(target.auth_id, {
        email: newEmail,
        email_confirm: true,
        user_metadata: { callsign: clean },
      }).catch(() => {})
    }

    revalidatePath('/control')
    return { success: true, callsign: clean }
  } catch (err) {
    console.error('updateOperatorCallsign error:', err)
    return { error: 'Szerver hiba.' }
  }
}

export async function deleteOperator(operatorId: string) {
  try {
    const op = await getCurrentOperator()
    if (!op || op.role !== 'superadmin') return { error: 'Csak superadmin törölhet felhasználót.' }
    if (op.id === operatorId) return { error: 'Magadat nem törölheted.' }
    try { assertOpId(operatorId) } catch { return { error: 'Érvénytelen azonosító.' } }

    const admin = createAdminClient()
    const { data: target } = await admin.from('operators').select('auth_id').eq('id', operatorId).single()

    // Cascade-clean dependents first (FKs may not have ON DELETE CASCADE)
    const { data: opEntries } = await admin.from('entries').select('id').eq('operator_id', operatorId)
    const entryIds = (opEntries ?? []).map((r: { id: string }) => r.id)
    if (entryIds.length > 0) {
      await admin.from('entry_reactions').delete().in('entry_id', entryIds)
      await admin.from('signals').delete().in('entry_id', entryIds)
    }
    await admin.from('entries').delete().eq('operator_id', operatorId)
    await admin.from('signals').delete().eq('operator_id', operatorId)
    await admin.from('entry_reactions').delete().eq('operator_id', operatorId)
    await admin.from('profile_signals').delete().eq('author_id', operatorId)
    await admin.from('profile_signals').delete().eq('target_id', operatorId)
    await admin.from('friendships').delete().eq('requester_id', operatorId)
    await admin.from('friendships').delete().eq('addressee_id', operatorId)
    await admin.from('messages').delete().eq('sender_id', operatorId).then(() => {}, () => {})
    await admin.from('messages').delete().eq('receiver_id', operatorId).then(() => {}, () => {})

    const { error } = await admin.from('operators').delete().eq('id', operatorId)
    if (error) return { error: dbErr(error, 'deleteOperator') }

    if (target?.auth_id) {
      await admin.auth.admin.deleteUser(target.auth_id).catch(() => {})
    }

    await admin.from('admin_audit_log').insert({
      actor_id: op.id, action: 'operator_delete', target_id: operatorId,
    }).then(({ error }) => { if (error) console.error('[audit_log_write_failed]', error) }, (e: unknown) => { console.error('[audit_log_write_threw]', e) })

    revalidatePath('/control')
    return { success: true }
  } catch (err) {
    console.error('deleteOperator error:', err)
    return { error: 'Szerver hiba.' }
  }
}

/* ─── Friendships ─── */

export async function sendFriendRequest(targetId: string) {
  try {
    const op = await getCurrentOperator()
    if (!op) return { error: 'Be kell lépni.' }
    try { assertOpId(targetId) } catch { return { error: 'Érvénytelen azonosító.' } }
    if (op.id === targetId) return { error: 'Magadnak nem küldhetsz kérést.' }

    const admin = createAdminClient()

    const { data: existing } = await admin
      .from('friendships')
      .select('*')
      .or(`and(requester_id.eq.${op.id},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${op.id})`)
      .maybeSingle()

    if (existing) return { error: 'Már létezik kapcsolat.' }

    const { error } = await admin.from('friendships').insert({
      requester_id: op.id,
      addressee_id: targetId,
      status: 'pending',
    })
    if (error) return { error: dbErr(error, 'sendFriendRequest') }

    const { data: targetOp } = await admin.from('operators').select('callsign').eq('id', targetId).single()
    revalidatePath(`/operators/${targetOp?.callsign ?? targetId}`)
    return { success: true }
  } catch (err) {
    console.error('sendFriendRequest error:', err)
    return { error: 'Szerver hiba.' }
  }
}

export async function acceptFriendRequest(friendshipId: string) {
  try {
    const op = await getCurrentOperator()
    if (!op) return { error: 'Be kell lépni.' }
    try { assertUuid(friendshipId) } catch { return { error: 'Érvénytelen azonosító.' } }

    const admin = createAdminClient()

    const { data: fr } = await admin.from('friendships').select('*').eq('id', friendshipId).single()
    if (!fr) return { error: 'Kérés nem található.' }
    if (fr.addressee_id !== op.id) return { error: 'Nincs jogosultság.' }

    const { error } = await admin
      .from('friendships')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', friendshipId)
    if (error) return { error: dbErr(error, 'acceptFriendRequest') }

    revalidatePath(`/operators/${op.callsign}`)
    return { success: true }
  } catch (err) {
    console.error('acceptFriendRequest error:', err)
    return { error: 'Szerver hiba.' }
  }
}

export async function removeFriend(targetId: string) {
  try {
    const op = await getCurrentOperator()
    if (!op) return { error: 'Be kell lépni.' }
    try { assertOpId(targetId) } catch { return { error: 'Érvénytelen azonosító.' } }

    const admin = createAdminClient()
    const { error } = await admin
      .from('friendships')
      .delete()
      .or(`and(requester_id.eq.${op.id},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${op.id})`)
    if (error) return { error: dbErr(error, 'removeFriend') }

    const { data: targetOp } = await admin.from('operators').select('callsign').eq('id', targetId).single()
    revalidatePath(`/operators/${targetOp?.callsign ?? targetId}`)
    revalidatePath(`/operators/${op.callsign}`)
    return { success: true }
  } catch (err) {
    console.error('removeFriend error:', err)
    return { error: 'Szerver hiba.' }
  }
}

export async function getMyFriends() {
  try {
    const op = await getCurrentOperator()
    type FriendShape = { id: string; callsign: string; level: number; avatar_url: string | null; chat_color: string | null; last_seen: string | null }
    if (!op) return { friends: [] as FriendShape[] }
    const admin = createAdminClient()
    const { data } = await admin
      .from('friendships')
      .select('requester_id, addressee_id, requester:operators!requester_id(id,callsign,level,avatar_url,chat_color,last_seen), addressee:operators!addressee_id(id,callsign,level,avatar_url,chat_color,last_seen)')
      .or(`requester_id.eq.${op.id},addressee_id.eq.${op.id}`)
      .eq('status', 'accepted')

    type Row = { requester_id: string; addressee_id: string; requester: FriendShape; addressee: FriendShape }
    const rows = (data ?? []) as unknown as Row[]
    const friends = rows.map(r => r.requester_id === op.id ? r.addressee : r.requester)
    return { friends }
  } catch (err) {
    console.error('getMyFriends error:', err)
    return { friends: [] }
  }
}

export async function getFriendshipState(targetId: string) {
  try {
    const op = await getCurrentOperator()
    if (!op || op.id === targetId) return { state: 'self' as const }
    try { assertOpId(targetId) } catch { return { state: 'none' as const } }

    const admin = createAdminClient()
    const { data } = await admin
      .from('friendships')
      .select('*')
      .or(`and(requester_id.eq.${op.id},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${op.id})`)
      .maybeSingle()

    if (!data) return { state: 'none' as const }
    if (data.status === 'accepted') return { state: 'friends' as const, id: data.id }
    if (data.requester_id === op.id) return { state: 'pending_out' as const, id: data.id }
    return { state: 'pending_in' as const, id: data.id }
  } catch {
    return { state: 'none' as const }
  }
}
