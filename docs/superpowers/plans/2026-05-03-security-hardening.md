# F3XYKEE Terminal — Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all security fixes from the 2026-05-03 security review: generic error masking, ID validation, rate limiting, DOMPurify XSS sanitization, avatar URL whitelist, register ID collision fix, session write throttling, upload MIME hardening, CSP headers, audit logging, and superadmin re-authentication.

**Architecture:** Shared utilities in `src/lib/` (error helper, ID validator, sanitizer) are imported by `actions.ts`, client components, and the upload route. DB-based rate limiting reuses existing Supabase tables (timestamp of last row per operator). Security headers live entirely in `next.config.ts`. A new Supabase migration creates the audit log table.

**Tech Stack:** Next.js 16, Supabase (SSR + admin), TypeScript, isomorphic-dompurify + jsdom, existing sharp pipeline.

---

## File Map

| Action | Path |
|--------|------|
| Create | `src/lib/serverError.ts` — maps DB errors to generic user messages |
| Create | `src/lib/validate.ts` — assertOpId / assertUuid / assertEntryId |
| Create | `src/lib/sanitize.ts` — isomorphic DOMPurify whitelist wrapper |
| Modify | `src/app/actions.ts` — apply all of the above + avatar whitelist + register fix + rate limits + re-auth |
| Modify | `src/lib/session.ts` — 60-second last_seen throttle |
| Modify | `src/app/api/upload/route.ts` — outExt derived from MIME |
| Modify | `src/components/ui/PostModal.tsx` — DOMPurify replace |
| Modify | `src/app/HomeClient.tsx` — DOMPurify replace |
| Modify | `src/middleware.ts` — pass options to request.cookies.set |
| Modify | `next.config.ts` — CSP + X-Frame-Options + Permissions-Policy |
| Create | `supabase/migrations/011_audit_log.sql` — admin_audit_log table |
| Modify | `src/app/control/AdminClient.tsx` — own-password field for pw/callsign changes |

---

## Task 1: Install isomorphic-dompurify

**Files:**
- No file changes (package install)

- [ ] **Step 1: Install package**

```bash
cd "e:/Website Biz/f3xykee-terminal"
npm install isomorphic-dompurify
npm install --save-dev @types/dompurify
```

Expected: `node_modules/isomorphic-dompurify` exists, no TS errors.

- [ ] **Step 2: Verify import compiles**

```typescript
// test only — do not save this file
import DOMPurify from 'isomorphic-dompurify'
const clean = DOMPurify.sanitize('<b>ok</b>')
```

Run: `npx tsc --noEmit` — Expected: 0 errors related to dompurify.

---

## Task 2: Create `src/lib/serverError.ts` — generic error helper

**Files:**
- Create: `src/lib/serverError.ts`

- [ ] **Step 1: Write the file**

```typescript
export function dbErr(err: unknown, label: string): string {
  console.error(`[${label}]`, err)
  return 'Szerver hiba. Próbáld újra.'
}
```

This returns a generic Hungarian message and logs the real error. Used everywhere a Supabase `error.message` would otherwise leak schema details to the client.

- [ ] **Step 2: Spot-check usage pattern**

In `actions.ts` every place that currently does `return { error: error.message }` (after a Supabase call) will become either:
- `return { error: dbErr(error, 'functionName') }` for DB errors, OR
- keep user-friendly validation errors (e.g. `'Hívójel legalább 3 karakter.'`) unchanged — those are safe.

---

## Task 3: Create `src/lib/validate.ts` — ID format validators

**Files:**
- Create: `src/lib/validate.ts`

- [ ] **Step 1: Write the file**

```typescript
const OP_ID_RE   = /^F3X-[A-Z0-9]{1,20}$/
const UUID_RE    = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ENTRY_ID_RE = /^LOG-[A-Z0-9]{1,20}$/

export function assertOpId(id: string): void {
  if (!OP_ID_RE.test(id)) throw new Error('Invalid operator ID')
}

export function assertUuid(id: string): void {
  if (!UUID_RE.test(id)) throw new Error('Invalid UUID')
}

export function assertEntryId(id: string): void {
  if (!ENTRY_ID_RE.test(id)) throw new Error('Invalid entry ID')
}
```

These throw so callers can wrap in `try/catch` and return `{ error: 'Érvénytelen azonosító.' }`.

---

## Task 4: Create `src/lib/sanitize.ts` — DOMPurify whitelist wrapper

**Files:**
- Create: `src/lib/sanitize.ts`

- [ ] **Step 1: Write the file**

```typescript
import DOMPurify from 'isomorphic-dompurify'

// Whitelist: block everything dangerous; allow only safe inline HTML tags.
const CONFIG: Parameters<typeof DOMPurify.sanitize>[1] = {
  ALLOWED_TAGS: [
    'b', 'i', 'em', 'strong', 'u', 's', 'del', 'br', 'p', 'ul', 'ol', 'li',
    'blockquote', 'code', 'pre', 'a', 'span', 'h1', 'h2', 'h3', 'h4',
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  ALLOW_DATA_ATTR: false,
  FORCE_BODY: true,
}

// Force all links to open in a new tab with noopener for safety
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

export function sanitizeHtml(dirty: string): string {
  if (!dirty) return ''
  return DOMPurify.sanitize(dirty, CONFIG) as string
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd "e:/Website Biz/f3xykee-terminal"
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 5: Replace client-side sanitizers with `sanitizeHtml` from `src/lib/sanitize.ts`

**Files:**
- Modify: `src/components/ui/PostModal.tsx`
- Modify: `src/app/HomeClient.tsx`

### PostModal.tsx

- [ ] **Step 1: Remove local `sanitizeHtml` and import shared one**

Replace the import block top of file — add:
```typescript
import { sanitizeHtml } from '@/lib/sanitize'
```

Delete lines 15–26 (the local `function sanitizeHtml(html: string): string { ... }`).

The `dangerouslySetInnerHTML={{ __html: sanitizeHtml(entry.content) }}` call on line 198 stays unchanged (same function name).

### HomeClient.tsx

- [ ] **Step 2: Remove local `sanitize` and import shared one**

Add to imports:
```typescript
import { sanitizeHtml } from '@/lib/sanitize'
```

Delete the local `function sanitize(html: string) { ... }` (lines 473–479).

Change line 521:
```typescript
dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
```
(was `sanitize(content)` — rename to `sanitizeHtml` to match the import).

---

## Task 6: Replace server-side regex sanitizer in `actions.ts`

**Files:**
- Modify: `src/app/actions.ts`

- [ ] **Step 1: Add import at top of file**

After the existing imports, add:
```typescript
import { sanitizeHtml } from '@/lib/sanitize'
```

- [ ] **Step 2: Replace `safeContent` block in `createEntry` (lines 188–198)**

Remove:
```typescript
const safeContent = content
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<iframe[\s\S]*?>/gi, '')
  .replace(/<object[\s\S]*?>/gi, '')
  .replace(/<embed[\s\S]*?>/gi, '')
  .replace(/<base[\s\S]*?>/gi, '')
  .replace(/\s(on\w+)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  .replace(/(href|src|action)\s*=\s*["']?\s*(javascript:|vbscript:|data:text\/html)[^"'\s>]*/gi, '$1="#"')
```

Replace with:
```typescript
const safeContent = sanitizeHtml(content)
```

---

## Task 7: Fix `outExt` in upload route — derive from MIME type

**Files:**
- Modify: `src/app/api/upload/route.ts`

- [ ] **Step 1: Add MIME→ext map and fix outExt assignment (line 36)**

After the `const ALLOWED` set, add:
```typescript
const MIME_TO_EXT: Record<string, string> = {
  'image/gif': 'gif', 'image/jpeg': 'jpg', 'image/png': 'png',
  'image/webp': 'webp', 'image/avif': 'avif',
  'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/ogg': 'ogg',
  'audio/wav': 'wav', 'audio/flac': 'flac', 'audio/webm': 'webm',
  'audio/aac': 'aac',
}
```

Change line 36 from:
```typescript
let outExt = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
```
to:
```typescript
let outExt = MIME_TO_EXT[file.type] ?? 'bin'
```

This ensures the stored extension always matches the actual MIME type, regardless of the uploaded filename.

---

## Task 8: Throttle `last_seen` writes in `session.ts`

**Files:**
- Modify: `src/lib/session.ts`

- [ ] **Step 1: Update `getCurrentOperator` to only write if stale**

Replace the `if (data)` block (lines 22–29):
```typescript
if (data) {
  const op = data as Operator
  const lastSeen = op.last_seen ? new Date(op.last_seen).getTime() : 0
  const staleSec = (Date.now() - lastSeen) / 1000
  if (staleSec > 60) {
    try {
      const admin = createAdminClient()
      const now = new Date().toISOString()
      await admin.from('operators').update({ last_seen: now }).eq('id', op.id)
      op.last_seen = now
    } catch {}
  }
}
```

This cuts DB write load by ~60× for active users.

---

## Task 9: Require auth + rate-limit `incrementReads`

**Files:**
- Modify: `src/app/actions.ts`

- [ ] **Step 1: Replace `incrementReads` function (lines 746–749)**

Replace:
```typescript
export async function incrementReads(entryId: string) {
  const supabase = await createClient()
  await supabase.rpc('increment_reads', { entry_id: entryId })
}
```

With:
```typescript
export async function incrementReads(entryId: string) {
  try {
    const op = await getCurrentOperator()
    if (!op) return  // unauthenticated — silently ignore

    // Rate-limit: one increment per operator per entry per 10 minutes (DB-based)
    const admin = createAdminClient()
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { data: recent } = await admin
      .from('entry_read_log')
      .select('id')
      .eq('entry_id', entryId)
      .eq('operator_id', op.id)
      .gte('created_at', tenMinAgo)
      .limit(1)
      .maybeSingle()

    if (recent) return  // already incremented recently

    await admin.from('entry_read_log').insert({ entry_id: entryId, operator_id: op.id })
    await admin.rpc('increment_reads', { entry_id: entryId })
  } catch {
    // reads counter is non-critical; never surface errors
  }
}
```

- [ ] **Step 2: Create migration for `entry_read_log` table**

Create `supabase/migrations/011_entry_read_log.sql`:
```sql
CREATE TABLE IF NOT EXISTS public.entry_read_log (
  id          BIGSERIAL PRIMARY KEY,
  entry_id    TEXT NOT NULL,
  operator_id TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_read_log_lookup ON public.entry_read_log(entry_id, operator_id, created_at);

ALTER TABLE public.entry_read_log ENABLE ROW LEVEL SECURITY;
-- Service role only; no user-direct writes via RLS
```

---

## Task 10: Rate-limit `createSignal`, `createProfileSignal`, `sendMessage`

**Files:**
- Modify: `src/app/actions.ts`

Pattern: check timestamp of last row from this operator in the relevant table.

- [ ] **Step 1: Add rate-limit guard to `createSignal`**

After the `if (!op) return` check, before the `admin.from('signals').insert`, add:

```typescript
// Rate-limit: max 1 signal per 5 seconds per operator
const fiveSecAgo = new Date(Date.now() - 5000).toISOString()
const admin = createAdminClient()
const { data: lastSig } = await admin
  .from('signals')
  .select('created_at')
  .eq('operator_id', op.id)
  .gte('created_at', fiveSecAgo)
  .limit(1)
  .maybeSingle()
if (lastSig) return { error: 'Túl gyors. Várj egy pillanatot.' }
```

The existing `const admin = createAdminClient()` line below must be removed (deduplication) since it's now declared above.

- [ ] **Step 2: Add rate-limit guard to `createProfileSignal`**

Same pattern — after the `if (!op) return` check:

```typescript
const fiveSecAgo = new Date(Date.now() - 5000).toISOString()
const admin = createAdminClient()
const { data: lastSig } = await admin
  .from('profile_signals')
  .select('created_at')
  .eq('author_id', op.id)
  .gte('created_at', fiveSecAgo)
  .limit(1)
  .maybeSingle()
if (lastSig) return { error: 'Túl gyors. Várj egy pillanatot.' }
```

Remove the duplicate `const admin = createAdminClient()` below.

- [ ] **Step 3: Add rate-limit guard to `sendMessage`**

After the `ensureFriends` check, before `.insert`:

```typescript
// Rate-limit: max 1 message per 2 seconds per sender
const twoSecAgo = new Date(Date.now() - 2000).toISOString()
const { data: lastMsg } = await admin
  .from('messages')
  .select('created_at')
  .eq('sender_id', op.id)
  .gte('created_at', twoSecAgo)
  .limit(1)
  .maybeSingle()
if (lastMsg) return { error: 'Túl gyors. Várj egy pillanatot.' }
```

Note: `admin` is already declared in this function.

---

## Task 11: Avatar URL whitelist in `updateProfile`

**Files:**
- Modify: `src/app/actions.ts`

- [ ] **Step 1: Add URL validation before update**

In `updateProfile`, after `const avatarUrl = ...` line, add:
```typescript
if (avatarUrl !== undefined && avatarUrl !== '') {
  const storageBase = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '') + '/storage/v1/object/public/'
  if (!avatarUrl.startsWith(storageBase)) {
    return { error: 'Érvénytelen avatar URL.' }
  }
}
```

---

## Task 12: Fix register operator ID collision

**Files:**
- Modify: `src/app/actions.ts`

- [ ] **Step 1: Replace `opId` generation on line 83**

Replace:
```typescript
const opId = 'F3X-' + String(Math.floor(Math.random() * 900) + 100)
```

With a retry loop that generates a unique ID using crypto:
```typescript
// Generate a unique operator ID (retry up to 5 times on collision)
let opId = ''
for (let attempt = 0; attempt < 5; attempt++) {
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map(b => b.toString(36).toUpperCase()).join('').slice(0, 6)
  const candidate = `F3X-${rand}`
  const { data: taken } = await admin.from('operators').select('id').eq('id', candidate).maybeSingle()
  if (!taken) { opId = candidate; break }
}
if (!opId) {
  await admin.auth.admin.deleteUser(authData.user.id)
  return { error: 'Nem sikerült egyedi azonosítót generálni. Próbáld újra.' }
}
```

`crypto` is globally available in Next.js 16 (Node 20+), no import needed.

---

## Task 13: Apply generic error masking + ID validation across `actions.ts`

**Files:**
- Modify: `src/app/actions.ts`

- [ ] **Step 1: Add imports at top of `actions.ts`**

```typescript
import { dbErr } from '@/lib/serverError'
import { assertOpId, assertUuid, assertEntryId } from '@/lib/validate'
```

- [ ] **Step 2: Replace bare `error.message` leaks in Supabase calls**

Every place with pattern `return { error: error.message }` after a Supabase DB operation (not user-facing validation) — replace with `return { error: dbErr(error, 'functionName') }`.

Functions affected (replace only DB error returns, keep user-validation strings as-is):
- `createEntry` — the `if (error)` block returning `e2.message`
- `togglePin` — `error.message`
- `publishDraft` — `error.message`
- `deleteEntry` — `error.message`
- `updateOperatorRole` — `error.message`
- `updateOperatorLevel` — `error.message`
- `updateOperatorPassword` — `error.message`
- `updateOperatorCallsign` — `opErr.message`
- `deleteOperator` — `error.message`
- `cleanupSeedOperators` — `error.message`
- `sendFriendRequest` — `error.message`
- `acceptFriendRequest` — `error.message`
- `updateProfile` — `error.message`
- `updateChatColor` — `error.message`
- `sendMessage` — `error.message`
- `updateInterests` — `error.message`
- `toggleSignalReaction` — `error.message`

Also fix the insert error leak in `register`:
```typescript
// line 97: was
return { error: 'Operátor rekord létrehozása sikertelen: ' + insertError.message }
// change to:
return { error: dbErr(insertError, 'register:insertOperator') }
```

- [ ] **Step 3: Add ID validation to user-supplied parameters**

In each function, validate IDs as early as possible:

**`getConversation(otherId)`:**
```typescript
try { assertOpId(otherId) } catch { return { messages: [], error: 'Érvénytelen azonosító.' } }
```

**`sendMessage(receiverId, ...)`:**
```typescript
try { assertOpId(receiverId) } catch { return { error: 'Érvénytelen azonosító.' } }
```

**`sendFriendRequest(targetId)`:**
```typescript
try { assertOpId(targetId) } catch { return { error: 'Érvénytelen azonosító.' } }
```

**`acceptFriendRequest(friendshipId)`:**
```typescript
try { assertUuid(friendshipId) } catch { return { error: 'Érvénytelen azonosító.' } }
```

**`removeFriend(targetId)`:**
```typescript
try { assertOpId(targetId) } catch { return { error: 'Érvénytelen azonosító.' } }
```

**`getFriendshipState(targetId)`:**
```typescript
try { assertOpId(targetId) } catch { return { state: 'none' as const } }
```

**`toggleSignalReaction(signalId, ...)`:**
```typescript
try { assertUuid(signalId) } catch { return { error: 'Érvénytelen azonosító.' } }
```

**`toggleProfileSignalReaction(signalId, ...)`:**
```typescript
try { assertUuid(signalId) } catch { return { error: 'Érvénytelen azonosító.' } }
```

**`deleteProfileSignal(signalId)`:**
```typescript
try { assertUuid(signalId) } catch { return { error: 'Érvénytelen azonosító.' } }
```

**`toggleProfileSignalPin(signalId, ...)`:**
```typescript
try { assertUuid(signalId) } catch { return { error: 'Érvénytelen azonosító.' } }
```

**`createSignal` — `entryId`:**
```typescript
try { assertEntryId(entryId) } catch { return { error: 'Érvénytelen azonosító.' } }
```

**`createProfileSignal` — `targetId`:**
```typescript
try { assertOpId(targetId) } catch { return { error: 'Érvénytelen azonosító.' } }
```

---

## Task 14: Fix middleware cookie options

**Files:**
- Modify: `src/middleware.ts`

- [ ] **Step 1: Pass options to `request.cookies.set`**

Change:
```typescript
cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
```
To:
```typescript
cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value, options as Parameters<typeof request.cookies.set>[2]))
```

This preserves HttpOnly, SameSite, Secure, Path flags when the middleware updates the request object.

---

## Task 15: CSP + security headers in `next.config.ts`

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Replace the config**

```typescript
import type { NextConfig } from 'next'

const SUPABASE_ORIGIN = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '')

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,   // Next.js requires unsafe-eval in dev
      `style-src 'self' 'unsafe-inline'`,
      `img-src 'self' data: blob: ${SUPABASE_ORIGIN} https://img.youtube.com`,
      `media-src 'self' blob: ${SUPABASE_ORIGIN}`,
      `connect-src 'self' ${SUPABASE_ORIGIN} wss://*.supabase.co`,
      `frame-src https://www.youtube.com https://youtube.com`,
      `font-src 'self'`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `frame-ancestors 'none'`,
    ].join('; '),
  },
  { key: 'X-Frame-Options',        value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=()' },
]

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}

export default nextConfig
```

---

## Task 16: Audit log migration + superadmin re-auth for password/callsign changes

**Files:**
- Create: `supabase/migrations/012_audit_log.sql`
- Modify: `src/app/actions.ts`
- Modify: `src/app/control/AdminClient.tsx`

### Migration

- [ ] **Step 1: Create `supabase/migrations/012_audit_log.sql`**

```sql
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id           BIGSERIAL PRIMARY KEY,
  actor_id     TEXT NOT NULL,
  action       TEXT NOT NULL,
  target_id    TEXT,
  detail       JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_actor    ON public.admin_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created  ON public.admin_audit_log(created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
-- Only service role can read/write; no user policy needed
```

### `actions.ts` changes

- [ ] **Step 2: Add `adminPassword` parameter to `updateOperatorPassword`**

Change signature from:
```typescript
export async function updateOperatorPassword(operatorId: string, newPassword: string)
```
To:
```typescript
export async function updateOperatorPassword(operatorId: string, newPassword: string, adminPassword: string)
```

Before proceeding with the auth admin call, add re-auth:
```typescript
// Verify superadmin's own current password before granting this privilege
const supabase = await createClient()
const { data: { user: me } } = await supabase.auth.getUser()
if (!me?.email) return { error: 'Nem sikerült azonosítani a superadmin fiókot.' }
const { error: reAuthErr } = await supabase.auth.signInWithPassword({ email: me.email, password: adminPassword })
if (reAuthErr) return { error: 'Saját jelszó ellenőrzés sikertelen. Hozzáférés megtagadva.' }
```

After success, write to audit log:
```typescript
await admin.from('admin_audit_log').insert({
  actor_id: op.id, action: 'password_change', target_id: operatorId,
  detail: { target_callsign: target.callsign },
})
```

- [ ] **Step 3: Add `adminPassword` parameter to `updateOperatorCallsign`**

Same pattern — add `adminPassword: string` parameter, add re-auth block at the start (same code as above), and after success write to audit log:
```typescript
await admin.from('admin_audit_log').insert({
  actor_id: op.id, action: 'callsign_change', target_id: operatorId,
  detail: { old_callsign: target.callsign ?? '', new_callsign: clean },
})
```

Note: the `target` variable is already fetched later in the function; move or fetch `callsign` too: `.select('auth_id, callsign')`.

### `AdminClient.tsx` UI changes

- [ ] **Step 4: Add `adminPw` state and input to `UserRow`**

Add state near the top of `UserRow`:
```typescript
const [adminPw, setAdminPw] = useState('')
```

In `changePassword()`, pass `adminPw`:
```typescript
const res = await updateOperatorPassword(op.id, pwValue, adminPw)
if (res.error) setError(res.error)
else { setInfo('Jelszó frissítve.'); setPwValue(''); setAdminPw(''); setShowPw(false) }
```

In `changeCallsign()`, pass `adminPw`:
```typescript
const res = await updateOperatorCallsign(op.id, v, adminPw)
```

Add a password input field to the UI — render it whenever `showPw` is true or `editingCs` is true (both require re-auth):
```tsx
{(showPw || editingCs) && (
  <input
    type="password"
    className="input"
    placeholder="Saját jelszavad megerősítéshez…"
    value={adminPw}
    onChange={e => setAdminPw(e.target.value)}
    style={{ fontSize: 12 }}
  />
)}
```

---

## Task 17: Verify build passes

- [ ] **Step 1: Run TypeScript check**

```bash
cd "e:/Website Biz/f3xykee-terminal"
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Run dev build**

```bash
npm run build
```

Expected: Build succeeds. Note any warnings about `unsafe-eval` in CSP — these are expected in dev and can be tightened in production by removing `'unsafe-eval'` from `script-src`.

- [ ] **Step 3: Apply migrations to Supabase**

Apply `011_entry_read_log.sql` and `012_audit_log.sql` via Supabase dashboard or CLI:
```
npx supabase db push
```
Or paste into Supabase SQL editor.

---

## Self-Review Against Security Report

| Finding | Task | Status |
|---------|------|--------|
| C0 #1 — Superadmin re-auth + audit log | Task 16 | ✓ covered |
| C1 #2 — Postgres error leaks | Tasks 2 + 13 | ✓ covered |
| C1 #3 — or() injection hardening | Task 13 | ✓ covered |
| C1 #5 — Rate limits on write actions | Task 10 | ✓ covered (createSignal, createProfileSignal, sendMessage) |
| C1 #6 — incrementReads rate-limit + auth | Task 9 | ✓ covered |
| C2 #7 — Register ID collision | Task 12 | ✓ covered |
| C2 #8 — Middleware cookie options | Task 14 | ✓ covered |
| C2 #9 — Avatar URL whitelist | Task 11 | ✓ covered |
| C2 #10 — DOMPurify replace | Tasks 4,5,6 | ✓ covered |
| C2 #11 — outExt from MIME | Task 7 | ✓ covered |
| C3 #14-15 — CSP + security headers | Task 15 | ✓ covered |
| C3 #16 — last_seen throttling | Task 8 | ✓ covered |
| C3 #19 — cleanupSeedOperators missing messages | Not included — messages has FK cascades in migration 006 |

**Items intentionally excluded from code changes:**
- C3 #17 (Supabase auth rate-limit for email brute-force) — configured in Supabase dashboard, not in code
- C3 #18 (read_log per-IP DISTINCT counting) — goes beyond this sprint; covered by Task 9's per-operator rate limit
- C3 #20 (service role key scope reduction via DB functions) — long-term architectural refactor
