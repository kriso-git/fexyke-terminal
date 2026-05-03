// Operator IDs are numeric (e.g. "0001"). Allow 1–20 digits.
const OP_ID_RE    = /^\d{1,20}$/
const UUID_RE     = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
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
