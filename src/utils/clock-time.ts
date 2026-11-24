// Postgres returns `time` columns as `HH:MM:SS`; the panel works in `HH:MM`.
export function clockTimeOf(postgresTime: string): string {
  return postgresTime.slice(0, 5)
}
