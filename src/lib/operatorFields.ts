// Public-safe column list for the operators table.
// `auth_id` is intentionally excluded — it's an internal auth foreign key
// that should never reach the client. Whenever we join `operators` from
// another table, use OPERATOR_JOIN below instead of `(*)`.

export const PUBLIC_OPERATOR_COLS =
  'id, callsign, level, role, node, joined_cycle, bio, avatar_url, xp, last_seen, chat_color, interests, created_at'

export const OPERATOR_JOIN =
  `operator:operators!operator_id(${PUBLIC_OPERATOR_COLS})`
