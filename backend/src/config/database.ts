import { readFileSync } from 'node:fs'
import { Pool } from 'pg'

// Supabase accepts only SSL connections, signed by Supabase's own CA, which Node does not
// trust by default. With DATABASE_SSL_CA pointing to that certificate (Project Settings →
// Database → SSL Configuration → Download certificate) the chain is verified. Without it the
// connection is still encrypted but the server is not authenticated, which is fine only for
// local development. Keep "sslmode" out of DATABASE_URL, because a value there replaces this.
// https://node-postgres.com/features/ssl
export function createPool(databaseUrl: string, caCertificatePath?: string): Pool {
  const ssl = caCertificatePath
    ? { ca: readFileSync(caCertificatePath, 'utf8'), rejectUnauthorized: true }
    : { rejectUnauthorized: false } // safe-anything:ignore (development only, see above)
  return new Pool({ connectionString: databaseUrl, ssl })
}

export async function checkConnection(pool: Pool): Promise<void> {
  await pool.query('select 1')
}
