import { createApp } from './app.js'
import { checkConnection, createPool } from './config/database.js'
import { readEnvironment } from './config/environment.js'
import { supabaseAuthAccounts } from './config/supabase-admin.js'
import { supabaseIdentity } from './config/supabase-auth.js'
import { supabaseClientSessions } from './config/supabase-sessions.js'
import { adminRepository } from './repositories/admin.repository.js'
import { agendaRepository } from './repositories/agenda.repository.js'
import { clientAppRepository } from './repositories/client-app.repository.js'
import { clientRepository } from './repositories/client.repository.js'
import { orderRepository } from './repositories/order.repository.js'
import { serviceRepository } from './repositories/service.repository.js'

async function startServer(): Promise<void> {
  const environment = readEnvironment()
  const pool = createPool(environment.databaseUrl, environment.databaseSslCa)
  await checkConnection(pool)

  const app = createApp({
    corsOrigin: environment.corsOrigin,
    identity: supabaseIdentity(environment.supabaseUrl, environment.supabasePublishableKey),
    admins: adminRepository(pool),
    services: serviceRepository(pool),
    clients: clientRepository(pool),
    authAccounts: supabaseAuthAccounts(environment.supabaseUrl, environment.supabaseServiceRoleKey),
    agenda: agendaRepository(pool),
    orders: orderRepository(pool),
    clientApp: clientAppRepository(pool),
    clientSessions: supabaseClientSessions(
      environment.supabaseUrl,
      environment.supabaseServiceRoleKey,
      environment.supabasePublishableKey,
    ),
  })
  app.listen(environment.port, () => {
    console.log(`API de CALM en http://localhost:${environment.port}`)
  })
}

startServer().catch((error: unknown) => {
  console.error('No fue posible iniciar el servidor:', error)
  process.exit(1)
})
