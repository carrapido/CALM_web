import { useEffect, useState, type ReactNode } from 'react'
import type { AdminAccess } from '../services/admin-access'
import { SignInPage } from '../pages/SignInPage'

type AccessGateProps = {
  access: AdminAccess
  // The panel, given the action that signs her out.
  panel: (signOut: () => void) => ReactNode
}

type AccessState = 'checking' | 'signedOut' | 'signedIn'

// Nothing of the panel renders until the admin's session is confirmed.
export function AccessGate({ access, panel }: AccessGateProps) {
  const [state, setState] = useState<AccessState>('checking')

  useEffect(() => {
    let isMounted = true
    // A session that cannot be confirmed, for example offline, counts as none.
    access
      .hasSession()
      .catch(() => false)
      .then((hasSession) => {
        if (isMounted) setState(hasSession ? 'signedIn' : 'signedOut')
      })
    const stopListening = access.onSessionEnd(() => setState('signedOut'))
    return () => {
      isMounted = false
      stopListening()
    }
  }, [access])

  const signOut = () => {
    access.signOut().finally(() => setState('signedOut'))
  }

  switch (state) {
    case 'checking':
      return <OpeningPanel />
    case 'signedOut':
      return <SignInPage access={access} onSignedIn={() => setState('signedIn')} />
    case 'signedIn':
      return panel(signOut)
  }
}

function OpeningPanel() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-margin">
      <p role="status" className="text-body-lg text-on-surface-variant">
        Abriendo el panel…
      </p>
    </main>
  )
}
