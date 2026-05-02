import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const maxDuration = 60

const ALLOWED = new Set([
  'image/gif','image/jpeg','image/png','image/webp','image/avif',
  'audio/mpeg','audio/mp3','audio/ogg','audio/wav','audio/flac','audio/webm','audio/aac',
])

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nem vagy bejelentkezve' }, { status: 401 })

    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file || file.size === 0) return NextResponse.json({ error: 'Nincs fájl' }, { status: 400 })
    if (!ALLOWED.has(file.type)) return NextResponse.json({ error: 'Nem engedélyezett fájltípus' }, { status: 400 })
    if (file.size > 100 * 1024 * 1024) return NextResponse.json({ error: 'Max 100 MB' }, { status: 400 })

    const admin = createAdminClient()
    await admin.storage.createBucket('entry-media', { public: true }).catch(() => {})

    const ext = file.name.split('.').pop() ?? 'bin'
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const bytes = await file.arrayBuffer()

    const { error } = await admin.storage.from('entry-media').upload(name, bytes, { contentType: file.type })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data } = admin.storage.from('entry-media').getPublicUrl(name)
    return NextResponse.json({ url: data.publicUrl, name: file.name, type: file.type })
  } catch (err) {
    console.error('upload error:', err)
    return NextResponse.json({ error: 'Szerver hiba' }, { status: 500 })
  }
}
