import { useState, type FormEvent } from 'react'
import { Button } from '../../shared/ui/atoms/Button'
import { FIELD_CONTROL_CLASSES } from '../../shared/ui/molecules/field-classes'
import { FormField } from '../../shared/ui/molecules/FormField'
import { BrandMark } from '../../shared/ui/molecules/BrandMark'
import {
  credentialsFrom,
  credentialsProblems,
  type AdminCredentials,
  type CredentialsDraft,
  type CredentialsProblem,
} from '../domain/admin-credentials'

type SignInFormProps = {
  isSigningIn: boolean
  // Why the last attempt was refused, ready to show.
  refusal: string | undefined
  onSignIn: (credentials: AdminCredentials) => void
}

const PROBLEM_MESSAGES: Record<CredentialsProblem, string> = {
  invalidPhone: 'Escribe los 10 dígitos de tu celular.',
  missingPassword: 'Escribe tu contraseña.',
}

const EMPTY_DRAFT: CredentialsDraft = { phone: '', password: '' }

export function SignInForm({ isSigningIn, refusal, onSignIn }: SignInFormProps) {
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [problems, setProblems] = useState<CredentialsProblem[]>([])

  const change = (field: keyof CredentialsDraft) => (value: string) =>
    setDraft((current) => ({ ...current, [field]: value }))

  const signIn = (event: FormEvent) => {
    event.preventDefault()
    const found = credentialsProblems(draft)
    setProblems(found)
    if (found.length === 0) onSignIn(credentialsFrom(draft))
  }

  const messageFor = (problem: CredentialsProblem) =>
    problems.includes(problem) ? PROBLEM_MESSAGES[problem] : undefined

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-margin py-space-lg">
      <form onSubmit={signIn} noValidate className="flex w-full max-w-[420px] flex-col gap-space-lg">
        <BrandMark size="regular" />
        <h1 className="text-display-lg-mobile text-on-surface md:text-display-lg">Entrar al panel</h1>
        <div className="flex flex-col gap-space-md">
          {/* username and current-password let the browser's password manager fill both. */}
          <FormField label="Celular" error={messageFor('invalidPhone')}>
            {(props) => (
              <input {...props} type="tel" inputMode="numeric" autoComplete="username" value={draft.phone} onChange={(event) => change('phone')(event.target.value)} className={FIELD_CONTROL_CLASSES} />
            )}
          </FormField>
          <FormField label="Contraseña" error={messageFor('missingPassword')}>
            {(props) => (
              <input {...props} type="password" autoComplete="current-password" value={draft.password} onChange={(event) => change('password')(event.target.value)} className={FIELD_CONTROL_CLASSES} />
            )}
          </FormField>
        </div>
        {refusal && (
          <p role="alert" className="text-body-lg text-error">
            {refusal}
          </p>
        )}
        <Button type="submit" variant="primary" disabled={isSigningIn} className="disabled:cursor-wait disabled:opacity-70">
          {isSigningIn ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </main>
  )
}
