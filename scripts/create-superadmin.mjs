import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yejrjzoglmbrizwmgzwy.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllanJqem9nbG1icml6d21nend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njg3MDU1NSwiZXhwIjoyMDkyNDQ2NTU1fQ.Xv2Z5wBjaxRWQo7bYDv06hwfeUebdnCKLpm1cLD2Njo'

const CALLSIGN = 'ADMIN'
const PASSWORD  = 'F3xykee#2024!'

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log(`\n◢ F3XYKEE · Superadmin létrehozása`)
  console.log(`  Hívójel: ${CALLSIGN}`)
  console.log(`  Jelszó:  ${PASSWORD}\n`)

  const email = `${CALLSIGN}@f3xykee.net`

  // Meglévő user törlése ha szükséges
  const { data: existing } = await admin
    .from('operators')
    .select('id, auth_id')
    .eq('callsign', CALLSIGN)
    .single()

  if (existing) {
    console.log('→ Meglévő operátor rekord törölve:', existing.id)
    await admin.from('operators').delete().eq('id', existing.id)
    if (existing.auth_id) {
      await admin.auth.admin.deleteUser(existing.auth_id)
      console.log('→ Meglévő auth user törölve')
    }
  }

  // Auth user létrehozása (email megerősítés nélkül)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { callsign: CALLSIGN },
  })

  if (authError || !authData.user) {
    console.error('✗ Auth user létrehozása sikertelen:', authError?.message)
    process.exit(1)
  }
  console.log('✓ Auth user létrehozva, ID:', authData.user.id)

  // Operator rekord
  const { error: opError } = await admin.from('operators').insert({
    id: 'F3X-ADM',
    auth_id: authData.user.id,
    callsign: CALLSIGN,
    level: 4,
    role: 'superadmin',
    node: 'f3x-pri-01',
    joined_cycle: 1,
    bio: 'Rendszergazda operátor.',
  })

  if (opError) {
    console.error('✗ Operátor rekord hiba:', opError.message)
    await admin.auth.admin.deleteUser(authData.user.id)
    process.exit(1)
  }

  console.log('✓ Operátor rekord létrehozva: F3X-ADM')
  console.log('\n◢ KÉSZ ──────────────────────────────')
  console.log(`  Belépés: https://f3xykee-terminal.vercel.app/gate`)
  console.log(`  Hívójel: ${CALLSIGN}`)
  console.log(`  Jelszó:  ${PASSWORD}`)
  console.log('─────────────────────────────────────\n')
}

main()
