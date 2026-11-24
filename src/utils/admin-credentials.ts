// What the admin typed on the sign-in screen.
export type CredentialsDraft = {
  phone: string
  password: string
}

// Ready to send: the phone holds its 10 digits and nothing else.
export type AdminCredentials = {
  phone: string
  password: string
}

export type CredentialsProblem = 'invalidPhone' | 'missingPassword'

export function credentialsProblems(draft: CredentialsDraft): CredentialsProblem[] {
  const problems: CredentialsProblem[] = []
  if (!/^\d{10}$/.test(phoneDigits(draft.phone))) problems.push('invalidPhone')
  if (draft.password === '') problems.push('missingPassword')
  return problems
}

export function credentialsFrom(draft: CredentialsDraft): AdminCredentials {
  return { phone: phoneDigits(draft.phone), password: draft.password }
}

// "998 123-4567" is the same phone as "9981234567".
function phoneDigits(phone: string): string {
  return phone.replaceAll(/[\s-]/g, '')
}
