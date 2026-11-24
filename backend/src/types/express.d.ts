import type { SignedInClient } from './client-app.js'

// The auth middlewares set who is asking: requireAdmin the admin's id, which writes record as
// updated_by or blocked_by; requireClient the client the app's session names.
// https://www.typescriptlang.org/docs/handbook/declaration-merging.html
declare global {
  namespace Express {
    interface Request {
      adminId?: string
      client?: SignedInClient
    }
  }
}

export {}
