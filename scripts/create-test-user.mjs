import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yejrjzoglmbrizwmgzwy.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_Ug_5onu0-aYIah4n9r8pNw_CIT7s3f5'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const CALLSIGN = 'ADMIN'
const PASSWORD = 'f3xykee2024'
const EMAIL = `${CALLSIGN}@f3xykee.net`

async function main() {
  console.log(`Teszt user létrehozása: ${CALLSIGN} / ${PASSWORD}`)

  // 1. Auth user létrehozása
  const { data, error } = await supabase.auth.signUp({ email: EMAIL, password: PASSWORD })

  if (error) {
    console.error('signUp hiba:', error.message)
    // Ha már létezik, próbáljuk meg bejelentkezni
    if (error.message.includes('already registered')) {
      console.log('→ User már létezik, bejelentkezés próba...')
      const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
      if (loginErr) { console.error('Login hiba:', loginErr.message); process.exit(1) }
      console.log('→ Login OK, user ID:', loginData.user?.id)
    } else {
      process.exit(1)
    }
    process.exit(0)
  }

  if (!data.user) {
    console.error('Nincs user az auth válaszban — email-megerősítés valószínűleg be van kapcsolva.')
    console.log('\n→ Menj a Supabase dashboardra → Authentication → Email Templates → deaktiváld a "Confirm email"-t.')
    process.exit(1)
  }

  console.log('Auth user OK, ID:', data.user.id)

  // 2. Operator rekord létrehozása (admin)
  const opId = 'F3X-ADM'
  const { error: opErr } = await supabase.from('operators').insert({
    id: opId,
    auth_id: data.user.id,
    callsign: CALLSIGN,
    level: 4,
    role: 'admin',
    node: 'f3x-pri-01',
    joined_cycle: 1,
    bio: 'Teszt admin operátor.',
  })

  if (opErr) {
    // Ha már van ilyen operator, az is OK
    if (opErr.code === '23505') {
      console.log('Operator rekord már létezik — OK')
    } else {
      console.error('Operator insert hiba:', opErr.message)
    }
  } else {
    console.log('Operator rekord létrehozva:', opId)
  }

  console.log('\n✓ Kész!')
  console.log('─────────────────────────────')
  console.log(`  Név:    ${CALLSIGN}`)
  console.log(`  Jelszó: ${PASSWORD}`)
  console.log('─────────────────────────────')
}

main()
