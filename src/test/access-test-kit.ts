import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import { App } from '../App'
import { emptyPanelProps } from './app-test-kit'
import type { AdminAccess, SignInOutcome } from '../services/admin-access'
import type { AdminCredentials } from '../utils/admin-credentials'
import { AccessGate } from '../components/AccessGate'

type FakeAdminAccessOptions = {
  hasStoredSession?: boolean
  signInOutcome?: SignInOutcome
}

// Stands in for Supabase Auth. Tests can hold an answer to see the screen while it waits.
export class FakeAdminAccess implements AdminAccess {
  readonly signInAttempts: AdminCredentials[] = []
  isSignedIn: boolean
  private readonly signInOutcome: SignInOutcome
  private heldSessionCheck: Promise<boolean> | undefined
  private heldSignIn: Promise<SignInOutcome> | undefined
  private readonly sessionEndListeners = new Set<() => void>()

  constructor({ hasStoredSession = false, signInOutcome = 'signedIn' }: FakeAdminAccessOptions = {}) {
    this.isSignedIn = hasStoredSession
    this.signInOutcome = signInOutcome
  }

  hasSession(): Promise<boolean> {
    return this.heldSessionCheck ?? Promise.resolve(this.isSignedIn)
  }

  signIn(credentials: AdminCredentials): Promise<SignInOutcome> {
    this.signInAttempts.push(credentials)
    const outcome = this.heldSignIn ?? Promise.resolve(this.signInOutcome)
    return outcome.then((answer) => {
      this.isSignedIn = answer === 'signedIn'
      return answer
    })
  }

  signOut(): Promise<void> {
    this.isSignedIn = false
    return Promise.resolve()
  }

  onSessionEnd(listener: () => void): () => void {
    this.sessionEndListeners.add(listener)
    return () => this.sessionEndListeners.delete(listener)
  }

  // The stored session is never confirmed, so the screen keeps waiting.
  holdSessionCheck(): void {
    this.heldSessionCheck = new Promise(() => {})
  }

  // Returns the function that lets the held sign-in answer.
  holdNextSignIn(): (outcome: SignInOutcome) => void {
    let answer: (outcome: SignInOutcome) => void = () => {}
    this.heldSignIn = new Promise((resolve) => {
      answer = resolve
    })
    return answer
  }

  endSessionElsewhere(): void {
    this.isSignedIn = false
    this.sessionEndListeners.forEach((listener) => listener())
  }
}

export function renderPanel(access: AdminAccess) {
  render(
    createElement(AccessGate, {
      access,
      panel: (signOut: () => void) => createElement(App, emptyPanelProps(signOut)),
    }),
  )
}

export async function signIn(phone: string, password: string) {
  await typeInto('Celular', phone)
  await typeInto('Contraseña', password)
  await userEvent.click(button('Entrar'))
}

async function typeInto(label: string, text: string) {
  if (text !== '') await userEvent.type(field(label), text)
}

export function signInHeading(): Promise<HTMLElement> {
  return screen.findByRole('heading', { level: 1, name: 'Entrar al panel' })
}

export function panelNavigation(): Promise<HTMLElement> {
  return screen.findByRole('navigation', { name: 'Navegación del panel' })
}

export function queryPanelNavigation(): HTMLElement | null {
  return screen.queryByRole('navigation', { name: 'Navegación del panel' })
}

export function field(label: string): HTMLElement {
  return screen.getByLabelText(label)
}

export function button(name: string): HTMLElement {
  return screen.getByRole('button', { name })
}
