// Whitelist of safe inline tags and attributes for user-submitted HTML.
// We use DOMPurify when running in a browser, and fall back to a strict
// regex strip on the server (Next.js Node runtime). The server-side path
// is intentionally simple — defense-in-depth: the same content is sanitized
// again on the client before rendering.

const ALLOWED_TAGS = new Set([
  'b', 'i', 'em', 'strong', 'u', 's', 'del', 'br', 'p', 'ul', 'ol', 'li',
  'blockquote', 'code', 'pre', 'a', 'span', 'h1', 'h2', 'h3', 'h4',
])

const ALLOWED_ATTR = new Set(['href', 'target', 'rel', 'class'])

function regexStrip(dirty: string): string {
  if (!dirty) return ''
  let out = dirty
    // Drop entire dangerous elements (open + content + close, even unclosed)
    .replace(/<\s*(script|style|iframe|object|embed|base|form|input|svg|foreignobject|math|link|meta)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|base|form|input|svg|foreignobject|math|link|meta)\b[^>]*\/?>/gi, '')
    // Strip every `on*=` event handler attribute
    .replace(/\s(on\w+)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // Disallow javascript:, vbscript:, data:text/html
    .replace(/(href|src|action|xlink:href|formaction)\s*=\s*["']?\s*(javascript:|vbscript:|data:text\/html)[^"'\s>]*/gi, '$1="#"')
    // Drop tags not in the allowlist
    .replace(/<\s*\/?\s*([a-z][a-z0-9-]*)\b[^>]*>/gi, (m, tag: string) => {
      return ALLOWED_TAGS.has(tag.toLowerCase()) ? m : ''
    })
    // Drop attributes not in the allowlist (best-effort)
    .replace(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi, (_m, tag: string, attrs: string) => {
      const cleaned = attrs.replace(/\s([a-z:][a-z0-9_:-]*)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
        (full, name: string) => (ALLOWED_ATTR.has(name.toLowerCase()) ? full : ''))
      return `<${tag}${cleaned}>`
    })
  return out
}

export function sanitizeHtml(dirty: string): string {
  if (!dirty) return ''
  if (typeof window === 'undefined') {
    // Server-side: regex strip. Defense-in-depth — same content goes through
    // DOMPurify on the client before being rendered.
    return regexStrip(dirty)
  }
  // Browser-side: DOMPurify provides robust whitelist sanitization.
  // Lazy-load so server bundles never see dompurify.
  const DOMPurify = require('dompurify').default ?? require('dompurify')
  const clean = DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: Array.from(ALLOWED_TAGS),
    ALLOWED_ATTR: Array.from(ALLOWED_ATTR),
    ALLOW_DATA_ATTR: false,
    FORCE_BODY: true,
  })
  // Force every <a> to open in a new tab with noopener
  return clean.replace(/<a\b([^>]*)>/gi, (_m: string, rest: string) => {
    let attrs = rest
    if (!/\btarget\s*=/i.test(attrs)) attrs += ' target="_blank"'
    if (!/\brel\s*=/i.test(attrs)) attrs += ' rel="noopener noreferrer"'
    return `<a${attrs}>`
  })
}
