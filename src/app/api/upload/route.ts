import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const maxDuration = 60

const ALLOWED = new Set([
  'image/gif', 'image/jpeg', 'image/png', 'image/webp', 'image/avif',
  'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/flac', 'audio/webm', 'audio/aac',
])

const MAX_DIM = 1920    // longest side
const JPEG_QUALITY = 82

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
    await admin.storage.createBucket('entry-media', { public: true }).catch(() => { })

    const isImage = file.type.startsWith('image/')
    const isAnimated = file.type === 'image/gif'
    let bytes: ArrayBuffer | Uint8Array = await file.arrayBuffer()
    let outType = file.type
    let outExt = file.name.split('.').pop()?.toLowerCase() ?? 'bin'

    // Resize/compress static images. Skip GIFs to preserve animation.
    if (isImage && !isAnimated) {
      try {
        const input = Buffer.from(bytes as ArrayBuffer)
        const meta = await sharp(input).metadata()
        const w = meta.width ?? 0
        const h = meta.height ?? 0
        const longest = Math.max(w, h)

        let pipeline = sharp(input, { failOn: 'none' }).rotate() // honor EXIF orientation
        if (longest > MAX_DIM) {
          pipeline = pipeline.resize({
            width: w >= h ? MAX_DIM : undefined,
            height: h > w ? MAX_DIM : undefined,
            fit: 'inside', withoutEnlargement: true,
          })
        }

        // Convert PNG with no transparency to jpeg for size; otherwise re-encode keeping format.
        const hasAlpha = !!meta.hasAlpha
        if (file.type === 'image/png' && !hasAlpha) {
          const out = await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer()
          bytes = out
          outType = 'image/jpeg'
          outExt = 'jpg'
        } else if (file.type === 'image/jpeg') {
          const out = await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer()
          bytes = out
        } else if (file.type === 'image/png') {
          const out = await pipeline.png({ compressionLevel: 9 }).toBuffer()
          bytes = out
        } else if (file.type === 'image/webp') {
          const out = await pipeline.webp({ quality: JPEG_QUALITY }).toBuffer()
          bytes = out
        } else if (file.type === 'image/avif') {
          const out = await pipeline.avif({ quality: JPEG_QUALITY }).toBuffer()
          bytes = out
        }
      } catch (resizeErr) {
        // If sharp fails, just upload the original
        console.error('image resize failed, uploading original:', resizeErr)
      }
    }

    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${outExt}`
    const { error } = await admin.storage.from('entry-media').upload(safeName, bytes, {
      contentType: outType,
      cacheControl: '31536000',
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data } = admin.storage.from('entry-media').getPublicUrl(safeName)
    return NextResponse.json({ url: data.publicUrl, name: file.name, type: outType })
  } catch (err) {
    console.error('upload error:', err)
    return NextResponse.json({ error: 'Szerver hiba' }, { status: 500 })
  }
}
