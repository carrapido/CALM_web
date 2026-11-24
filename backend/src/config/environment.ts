import 'dotenv/config'

export type Environment = {
  port: number
  databaseUrl: string
  // Path to Supabase's CA certificate; when set, the database certificate is verified.
  databaseSslCa?: string
  supabaseUrl: string
  supabasePublishableKey: string
  // Lets the server rename a client's auth email when her phone changes; never sent to the panel.
  supabaseServiceRoleKey: string
  // The panel's origins, separated by commas.
  corsOrigin: string
}

// Read once on startup, so a missing setting stops the server before it takes requests.
export function readEnvironment(): Environment {
  return {
    port: Number(process.env.PORT ?? 3000),
    databaseUrl: required('DATABASE_URL'),
    databaseSslCa: process.env.DATABASE_SSL_CA || undefined,
    supabaseUrl: required('SUPABASE_URL'),
    supabasePublishableKey: required('SUPABASE_PUBLISHABLE_KEY'),
    supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173',
  }
}

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is missing: copy .env.example to .env and fill it in`)
  return value
}
