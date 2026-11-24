import type { Pool, PoolClient } from 'pg'

// Runs `work` on one connection between begin and commit; any error rolls everything back.
// https://node-postgres.com/features/transactions
export async function inTransaction<T>(pool: Pool, work: (db: PoolClient) => Promise<T>): Promise<T> {
  const db = await pool.connect()
  try {
    await db.query('begin')
    const result = await work(db)
    await db.query('commit')
    return result
  } catch (error) {
    await db.query('rollback')
    throw error
  } finally {
    db.release()
  }
}
