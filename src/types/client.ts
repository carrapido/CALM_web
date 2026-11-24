export type Client = {
  id: string
  name: string
  // 10 digits; some clients were registered without one.
  phone: string | null
  // She can sign in to the client app with her phone and NIP.
  hasAppAccess: boolean
}
