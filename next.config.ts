import type { NextConfig } from 'next'

const SUPABASE_ORIGIN = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '')

// SHA256 of the boot-state inline script in src/app/layout.tsx — kept here so we
// can drop 'unsafe-inline' if/when Next.js stops emitting other inline scripts.
const BOOT_SCRIPT_HASH = "'sha256-Y5cgrWiP79tTqpyu2vo0M5E6VSotQ/G9/YZzJFrE5CU='"

// Next.js 16 (Turbopack-built bundles, Vercel runtime injects, RSC payload
// hydration) needs 'unsafe-eval' AND 'unsafe-inline' to actually run.
// Removing either breaks the app on first load. The boot-script hash is kept
// as a future stepping stone toward a strict CSP once Next ships a
// non-eval/non-inline pipeline. https://github.com/vercel/next.js/discussions
const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  "'unsafe-eval'",
  BOOT_SCRIPT_HASH,
  // Vercel platform scripts (analytics, speed insights). Harmless if unused.
  'https://vercel.live',
  'https://va.vercel-scripts.com',
].join(' ')

const cspDirectives = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${SUPABASE_ORIGIN} https://img.youtube.com https://i.ytimg.com`,
  `media-src 'self' blob: ${SUPABASE_ORIGIN}`,
  `connect-src 'self' ${SUPABASE_ORIGIN} wss://*.supabase.co https://*.supabase.co https://vercel.live https://*.pusher.com wss://*.pusher.com`,
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
]

const securityHeaders = [
  { key: 'Content-Security-Policy', value: cspDirectives.join('; ') },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}

export default nextConfig
