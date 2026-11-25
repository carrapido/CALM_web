import { DatabaseError, type Pool, type PoolClient } from 'pg'
import type {
  AppAccess, Client, ClientHistory, ClientRepository, DeleteAuthUser, GrantedAccess, NewClient, RemovedClient,
} from '../types/client.js'
import { inTransaction } from '../utils/in-transaction.js'

// node-postgres reads bigint as a string, which is the id type the panel uses.
// has_app_access is generated from nip_hash and phone, so nip_hash never has to leave the table.
type ClientRow = {
  id: string
  name: string
  phone: string | null
  has_app_access: boolean
}

type AccessBefore = { phone: string | null; user_id: string | null }

const COLUMNS = 'id, name, phone, has_app_access'

// Every value goes in as a $n parameter; only the fixed COLUMNS list is part of the text.
// safe-anything:ignore
const INSERT_CLIENT = `insert into clients (name, phone, nip_hash)
  values ($1, $2, $3)
  returning ${COLUMNS}`

// safe-anything:ignore
const UPDATE_ACCESS = `update clients
  set phone = $1, nip_hash = $2
  where id = $3
  returning ${COLUMNS}`

const LOCK_ACCESS_BEFORE = 'select phone, user_id from clients where id = $1 for update'

const HISTORY = `select
    (select count(*) from appointments where client_id = clients.id)::int as appointments,
    (select count(*) from orders where client_id = clients.id)::int as orders
  from clients
  where id = $1`

const UNIQUE_VIOLATION = '23505'

export function clientRepository(pool: Pool): ClientRepository {
  return {
    async all() {
      const { rows } = await pool.query<ClientRow>(`select ${COLUMNS} from clients order by id`)
      return rows.map(clientFromRow)
    },

    // clients.phone is the only unique column a new client can collide on.
    async add(client) {
      try {
        return await inTransaction(pool, (db) => insertClient(db, client))
      } catch (error) {
        if (isUniqueViolation(error)) return 'phoneTaken'
        throw error
      }
    },

    async grantAccess(access) {
      try {
        return await inTransaction(pool, (db) => updateAccess(db, access))
      } catch (error) {
        if (isUniqueViolation(error)) return 'phoneTaken'
        throw error
      }
    },

    async history(clientId) {
      const { rows } = await pool.query<ClientHistory>(HISTORY, [clientId])
      return rows[0] ?? 'notFound'
    },

    async remove(clientId, deleteAuthUser) {
      return inTransaction(pool, (db) => deleteClient(db, clientId, deleteAuthUser))
    },
  }
}

async function insertClient(db: PoolClient, { name, phone, nipHash }: NewClient): Promise<Client> {
  const { rows } = await db.query<ClientRow>(INSERT_CLIENT, [name, phone, nipHash])
  await clearSignInAttempts(db, [phone])
  return clientFromRow(onlyRow(rows))
}

async function updateAccess(db: PoolClient, { clientId, phone, nipHash }: AppAccess): Promise<GrantedAccess | 'notFound'> {
  const before = await db.query<AccessBefore>(LOCK_ACCESS_BEFORE, [clientId])
  const previous = before.rows[0]
  if (previous === undefined) return 'notFound'

  const { rows } = await db.query<ClientRow>(UPDATE_ACCESS, [phone, nipHash, clientId])
  await clearSignInAttempts(db, [phone, previous.phone])
  const isRenamed = previous.user_id !== null && previous.phone !== phone
  return { client: clientFromRow(onlyRow(rows)), authUserToRename: isRenamed ? previous.user_id : null }
}

// Orders first, since they point to her appointments; appointment_services goes with each
// appointment (on delete cascade).
async function deleteClient(
  db: PoolClient,
  clientId: string,
  deleteAuthUser: DeleteAuthUser,
): Promise<RemovedClient | 'notFound'> {
  const before = await db.query<AccessBefore>(LOCK_ACCESS_BEFORE, [clientId])
  const client = before.rows[0]
  if (client === undefined) return 'notFound'

  await db.query('delete from orders where client_id = $1', [clientId])
  await db.query('delete from appointments where client_id = $1', [clientId])
  await clearSignInAttempts(db, [client.phone])
  await db.query('delete from clients where id = $1', [clientId])
  if (client.user_id !== null) await deleteAuthUser(client.user_id)
  return { authUserId: client.user_id }
}

// A fresh NIP starts with a clean slate: a lockout earned by the forgotten one is lifted, on the
// new phone and on the one she leaves.
async function clearSignInAttempts(db: PoolClient, phones: (string | null)[]): Promise<void> {
  await db.query('delete from sign_in_attempts where phone = any($1::text[])', [phones.filter((phone) => phone !== null)])
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof DatabaseError && error.code === UNIQUE_VIOLATION
}

function clientFromRow(row: ClientRow): Client {
  return { id: row.id, name: row.name, phone: row.phone, hasAppAccess: row.has_app_access }
}

function onlyRow(rows: ClientRow[]): ClientRow {
  const [row] = rows
  if (row === undefined) throw new Error('The statement returned no row')
  return row
}
