import type { Pool } from 'pg'
import type { AdminRepository } from '../types/auth.js'

export function adminRepository(pool: Pool): AdminRepository {
  return {
    async isAdmin(userId) {
      const { rowCount } = await pool.query('select 1 from admins where id = $1', [userId])
      return rowCount !== null && rowCount > 0
    },
  }
}
