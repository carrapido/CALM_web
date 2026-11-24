import { DatabaseError } from 'pg'

// The error node-postgres throws when the database refuses a statement, with the name of
// the constraint it broke when there is one.
export function postgresError(code: string, message = 'database refused the statement', constraint?: string) {
  const error = new DatabaseError(message, 0, 'error')
  error.code = code
  error.constraint = constraint
  return error
}
