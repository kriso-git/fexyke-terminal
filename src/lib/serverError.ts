export function dbErr(err: unknown, label: string): string {
  console.error(`[${label}]`, err)
  return 'Szerver hiba. Próbáld újra.'
}
