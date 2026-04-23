#!/usr/bin/env node
// Automatikusan létrehozza a .env.local fájlt ha még nem létezik.
// Futtatás: node scripts/setup-env.mjs
// Vagy egyszerűbb: npx vercel env pull .env.local

import { existsSync, writeFileSync } from 'fs'
import { createInterface } from 'readline'

if (existsSync('.env.local')) {
  console.log('✓ .env.local már létezik, nem írom felül.')
  process.exit(0)
}

const rl = createInterface({ input: process.stdin, output: process.stdout })
const q = (prompt) => new Promise(r => rl.question(prompt, r))

console.log('\n◢ F3XYKEE · .env.local beállítás\n')
console.log('Supabase Dashboard → Settings → API\n')

const url = await q('NEXT_PUBLIC_SUPABASE_URL: ')
const anon = await q('NEXT_PUBLIC_SUPABASE_ANON_KEY: ')
const service = await q('SUPABASE_SERVICE_ROLE_KEY: ')

rl.close()

writeFileSync('.env.local', [
  `NEXT_PUBLIC_SUPABASE_URL=${url.trim()}`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anon.trim()}`,
  `SUPABASE_SERVICE_ROLE_KEY=${service.trim()}`,
].join('\n') + '\n')

console.log('\n✓ .env.local létrehozva!')
