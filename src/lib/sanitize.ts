// Whitelist of safe inline tags and attributes for user-submitted HTML.
// In a browser we run DOMPurify; on the server (or any non-DOM env) we
// fall back to a strict regex strip. Defense-in-depth: the server-stored
// content is sanitized again on the client before rendering.

import DOMPurify from 'dompurify'

const ALLOWED_TAGS = new Set([
  'b', 'i', 'em', 'strong', 'u', 's', 'del', 'br', 'p', 'ul', 'ol', 'li',
  'blockquote', 'code', 'pre', 'a', 'span', 'h1', 'h2', 'h3', 'h4',
])

const ALLOWED_ATTR = new Set(['href', 'target', 'rel', 'class'])

function regexStrip(dirty: string): string {
  if (!dirty) return ''
  const out = dirty
    .replace(/<\s*(script|style|iframe|object|embed|base|form|input|svg|foreignobject|math|link|meta)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|base|form|input|svg|foreignobject|math|link|meta)\b[^>]*\/?>/gi, '')
    .replace(/\s(on\w+)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src|action|xlink:href|formaction)\s*=\s*["']?\s*(javascript:|vbscript:|data:text\/html)[^"'\s>]*/gi, '$1="#"')
    .replace(/<\s*\/?\s*([a-z][a-z0-9-]*)\b[^>]*>/gi, (m, tag: string) => (
      ALLOWED_TAGS.has(tag.toLowerCase()) ? m : ''
    ))
    .replace(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi, (_m, tag: string, attrs: string) => {
      const cleaned = attrs.replace(/\s([a-z:][a-z0-9_:-]*)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
        (full, name: string) => (ALLOWED_ATTR.has(name.toLowerCase()) ? full : ''))
      return `<${tag}${cleaned}>`
    })
  return out
}

function forceSafeAnchor(html: string): string {
  return html.replace(/<a\b([^>]*)>/gi, (_m: string, rest: string) => {
    let attrs = rest
    if (!/\btarget\s*=/i.test(attrs)) attrs += ' target="_blank"'
    if (!/\brel\s*=/i.test(attrs))    attrs += ' rel="noopener noreferrer"'
    return `<a${attrs}>`
  })
}

export function sanitizeHtml(dirty: string): string {
  if (!dirty) return ''
  // DOMPurify needs a DOM. In any non-DOM environment (Next.js Node SSR,
  // server actions, edge runtime) fall back to the regex strip.
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return regexStrip(dirty)
  }
  const clean = DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: Array.from(ALLOWED_TAGS),
    ALLOWED_ATTR: Array.from(ALLOWED_ATTR),
    ALLOW_DATA_ATTR: false,
    FORCE_BODY: true,
  })
  return forceSafeAnchor(clean as string)
}
