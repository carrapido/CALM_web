import { createClient } from '@supabase/supabase-js'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SupabaseAdminAccess } from './services/supabase-admin-access'
import { AccessGate } from './components/AccessGate'
import { SupabaseAgendaRepository } from './services/supabase-agenda-repository'
import { App } from './App'
import { SupabaseCatalogRepository } from './services/supabase-catalog-repository'
import { SupabaseClientsRepository } from './services/supabase-clients-repository'
import { SupabaseOrdersRepository } from './services/supabase-orders-repository'
import type { Database } from './types/database.types'
import './index.css'

const rootElement = document.getElementById('root')
if (rootElement === null) throw new Error('index.html is missing the #root element')

// https://supabase.com/docs/reference/javascript/initializing
// The generated Database type makes every table and column the adapters use checked at compile time.
const supabase = createClient<Database>(
  requiredSetting('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL),
  requiredSetting('VITE_SUPABASE_PUBLISHABLE_KEY', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
)
const adminAccess = new SupabaseAdminAccess(supabase)
const agendaRepository = new SupabaseAgendaRepository(supabase)
const ordersRepository = new SupabaseOrdersRepository(supabase)
const catalogRepository = new SupabaseCatalogRepository(supabase)
const clientsRepository = new SupabaseClientsRepository(supabase)

const now = () => new Date()

createRoot(rootElement).render(
  <StrictMode>
    <AccessGate
      access={adminAccess}
      panel={(signOut) => (
        <App
          agendaRepository={agendaRepository}
          ordersRepository={ordersRepository}
          catalogRepository={catalogRepository}
          clientsRepository={clientsRepository}
          now={now}
          random={Math.random}
          onSignOut={signOut}
        />
      )}
    />
  </StrictMode>,
)

// Vite replaces only direct `import.meta.env.VITE_*` reads, so the caller passes the value.
function requiredSetting(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} is missing: copy .env.example to .env.local and fill it in`)
  return value
}
