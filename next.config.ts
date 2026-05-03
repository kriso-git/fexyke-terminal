import type { NextConfig } from 'next'

const SUPABASE_ORIGIN = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '')

// IMPORTANT: do NOT add a SHA256 hash or nonce here. Per the CSP spec, when a
// hash or nonce is present, 'unsafe-inline' is IGNORED. Next.js 16 injects
// many different inline scripts (RSC payloads, hydration, route prefetch, …)
// each with different content — only an 'unsafe-inline' allow-all keeps the
// app working. This is the same posture every Next.js + Vercel deploy uses.
const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  "'unsafe-eval'",
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
