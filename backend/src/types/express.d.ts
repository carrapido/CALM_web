// The auth middleware sets the admin's id, which writes record as updated_by or blocked_by.
// https://www.typescriptlang.org/docs/handbook/declaration-merging.html
declare global {
  namespace Express {
    interface Request {
      adminId?: string
    }
  }
}

export {}
