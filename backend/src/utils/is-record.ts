// A JSON object the controllers can read fields from; express.json() leaves req.body
// undefined when the request has no JSON body.
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
