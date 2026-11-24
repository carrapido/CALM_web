import { randomBytes } from 'node:crypto'
import { argon2id, argon2Verify } from 'hash-wasm'

// Verified against when the phone has no NIP, so answering takes about as long either way.
const DECOY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$hjQlfpqkLALK0NuPZmC2VA$lzOmu8EsFiCoxXDQ5lXPdg+ZBdshUNG00nHtgb3KIjo'

// Every stored NIP and DECOY_HASH use these parameters, so checking a phone without a NIP costs
// as much as checking one with it; change them together.
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

// A phone with no NIP still pays for a verification, so the timing does not tell them apart.
export async function nipMatches(nip: string, hash: string | null): Promise<boolean> {
  const matched = await argon2Verify({ password: nip, hash: hash ?? DECOY_HASH }).catch(() => false)
  return hash !== null && matched
}
