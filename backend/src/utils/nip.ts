import { randomBytes } from 'node:crypto'
import { argon2id } from 'hash-wasm'

// The client app's sign-in verifies NIPs with these same parameters
// (supabase/functions/_shared/client-auth.ts), so a change here locks every new client out.
export function hashNip(nip: string): Promise<string> {
  return argon2id({
    password: nip,
    salt: randomBytes(16),
    parallelism: 1,
    iterations: 2,
    memorySize: 19456,
    hashLength: 32,
    outputType: 'encoded',
  })
}
