import { DatabaseError } from 'pg'

// The error node-postgres throws when the database refuses a statement.
export function postgresError(code: string, message = 'database refused the statement') {
  const error = new DatabaseError(message, 0, 'error')
  error.code = code
  return error
}
