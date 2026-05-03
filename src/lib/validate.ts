// Sequential numeric IDs (F3X-0001) are the new format; the broader
// alphanumeric pattern stays accepted so historical IDs from before the
// renumbering still pass validation.
const OP_ID_RE    = /^F3X-[A-Z0-9]{1,20}$/
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
