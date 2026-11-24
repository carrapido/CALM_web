import { createClient } from '@supabase/supabase-js'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SupabaseAdminAccess } from './services/supabase-admin-access'
import { AccessGate } from './components/AccessGate'
import { ApiAgendaRepository } from './services/api-agenda-repository'
import { ApiCatalogRepository } from './services/api-catalog-repository'
import { ApiClient } from './services/api-client'
import { ApiClientsRepository } from './services/api-clients-repository'
import { ApiOrdersRepository } from './services/api-orders-repository'
import { App } from './App'
import type { Database } from './types/database.types'
import './index.css'

const rootElement = document.getElementById('root')
if (rootElement === null) throw new Error('index.html is missing the #root element')

// https://supabase.com/docs/reference/javascript/initializing
// Supabase only signs the admin in; every read and write goes through the CALM API.
const supabase = createClient<Database>(
  requiredSetting('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL),
  requiredSetting('VITE_SUPABASE_PUBLISHABLE_KEY', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
)
const adminAccess = new SupabaseAdminAccess(supabase)
// https://supabase.com/docs/reference/javascript/auth-getsession
const api = new ApiClient(requiredSetting('VITE_API_URL', import.meta.env.VITE_API_URL), async () => {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token
})
const agendaRepository = new ApiAgendaRepository(api)
const ordersRepository = new ApiOrdersRepository(api)
const catalogRepository = new ApiCatalogRepository(api)
const clientsRepository = new ApiClientsRepository(api)

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
