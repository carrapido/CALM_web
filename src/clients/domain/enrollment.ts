// Ready to send: the phone holds its 10 digits and the NIP its 4.
export type Enrollment =
  | { kind: 'new'; name: string; phone: string; nip: string }
  | { kind: 'existing'; clientId: string; phone: string; nip: string }

// What the admin typed in the form.
export type EnrollmentDraft = {
  name: string
  phone: string
  nip: string
}

export type EnrollmentProblem = 'missingName' | 'invalidPhone' | 'invalidNip'

export const NIP_LENGTH = 4

// An existing client keeps her name, so only a new one needs it.
export function enrollmentProblems(draft: EnrollmentDraft, isNewClient: boolean): EnrollmentProblem[] {
  const problems: EnrollmentProblem[] = []
  if (isNewClient && draft.name.trim() === '') problems.push('missingName')
  if (!/^\d{10}$/.test(phoneDigits(draft.phone))) problems.push('invalidPhone')
  if (!new RegExp(`^\\d{${NIP_LENGTH}}$`).test(draft.nip)) problems.push('invalidNip')
  return problems
}

// `clientId` is the client getting access; undefined for a new client.
export function enrollmentFrom(draft: EnrollmentDraft, clientId: string | undefined): Enrollment {
  const phone = phoneDigits(draft.phone)
  return clientId === undefined
    ? { kind: 'new', name: draft.name.trim(), phone, nip: draft.nip }
    : { kind: 'existing', clientId, phone, nip: draft.nip }
}

// "998 123-4567" is the same phone as "9981234567".
function phoneDigits(phone: string): string {
  return phone.replaceAll(/[\s-]/g, '')
}
