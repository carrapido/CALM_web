import { useState } from 'react'
import type { AdminAccess, SignInOutcome } from '../application/admin-access'
import type { AdminCredentials } from '../domain/admin-credentials'
import { SignInForm } from './SignInForm'

type SignInContainerProps = {
  access: AdminAccess
  onSignedIn: () => void
}

type Refusal = Exclude<SignInOutcome, 'signedIn'>

const REFUSAL_MESSAGES: Record<Refusal, string> = {
  wrongCredentials: 'Celular o contraseña incorrectos.',
  notAnAdmin: 'Esta cuenta no tiene acceso al panel.',
  tooManyAttempts: 'Demasiados intentos. Espera unos minutos e intenta de nuevo.',
  unavailable: 'No se pudo conectar. Revisa tu internet e intenta de nuevo.',
}

export function SignInContainer({ access, onSignedIn }: SignInContainerProps) {
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [refusal, setRefusal] = useState<Refusal>()

  const signIn = (credentials: AdminCredentials) => {
    setIsSigningIn(true)
    setRefusal(undefined)
    access
      .signIn(credentials)
      .catch((): SignInOutcome => 'unavailable')
      .then((outcome) => {
        if (outcome === 'signedIn') {
          onSignedIn()
          return
        }
        setIsSigningIn(false)
        setRefusal(outcome)
      })
  }

  return (
    <SignInForm
      isSigningIn={isSigningIn}
      refusal={refusal && REFUSAL_MESSAGES[refusal]}
      onSignIn={signIn}
    />
  )
}
