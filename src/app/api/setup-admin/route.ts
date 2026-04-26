import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET() {
  const admin = createAdminClient()
  const callsign = 'ADMIN'
  const password = 'admin1234'
  const email = `${callsign}@f3xykee.net`

  const { data: existing } = await admin
    .from('operators')
    .select('id')
    .eq('callsign', callsign)
    .single()

  if (existing) {
    return NextResponse.json({ message: 'Superadmin already exists', callsign, note: 'Use the password you set during creation' })
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { callsign },
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? 'Auth creation failed' }, { status: 500 })
  }

  const opId = 'F3X-001'
  const { error: insertError } = await admin.from('operators').insert({
    id: opId,
    auth_id: authData.user.id,
    callsign,
    level: 10,
    role: 'superadmin',
    node: 'f3x-pri-01',
    joined_cycle: 1,
    bio: 'Rendszer adminisztrátor.',
  })

  if (insertError) {
    await admin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, callsign, password })
}
