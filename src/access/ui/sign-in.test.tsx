import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  FakeAdminAccess,
  button,
  field,
  panelNavigation,
  queryPanelNavigation,
  renderPanel,
  signIn,
  signInHeading,
} from './access-test-kit'

beforeEach(() => {
  window.location.hash = ''
})

describe('Opening the panel', () => {
  it('asks for phone and password when there is no session, and hides the panel', async () => {
    renderPanel(new FakeAdminAccess())

    expect(await signInHeading()).toBeInTheDocument()
    expect(field('Celular')).toBeInTheDocument()
    expect(field('Contraseña')).toBeInTheDocument()
    expect(button('Entrar')).toBeInTheDocument()
    expect(queryPanelNavigation()).not.toBeInTheDocument()
  })

  it('shows only a waiting message while it checks the stored session', () => {
    const access = new FakeAdminAccess()
    access.holdSessionCheck()

    renderPanel(access)

    expect(screen.getByText('Abriendo el panel…')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Entrar al panel' })).not.toBeInTheDocument()
    expect(queryPanelNavigation()).not.toBeInTheDocument()
  })

  it('opens the panel straight away with a stored session', async () => {
    renderPanel(new FakeAdminAccess({ hasStoredSession: true }))

    expect(await panelNavigation()).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Entrar al panel' })).not.toBeInTheDocument()
  })
})

describe('Signing in', () => {
  it('opens the panel on the page in the address, ignoring spaces and dashes in the phone', async () => {
    window.location.hash = '#/pedidos'
    const access = new FakeAdminAccess()
    renderPanel(access)
    await signInHeading()

    await signIn('998 123-4567', 'hilo-y-aguja')

    expect(await screen.findByRole('heading', { level: 1, name: 'Pedidos' })).toBeInTheDocument()
    expect(access.signInAttempts).toEqual([{ phone: '9981234567', password: 'hilo-y-aguja' }])
  })

  it('asks for the 10 digits of the phone without sending anything', async () => {
    const access = new FakeAdminAccess()
    renderPanel(access)
    await signInHeading()

    await signIn('99812345', 'hilo-y-aguja')

    expect(field('Celular')).toHaveAccessibleDescription('Escribe los 10 dígitos de tu celular.')
    expect(access.signInAttempts).toEqual([])
  })

  it('asks for the password without sending anything', async () => {
    const access = new FakeAdminAccess()
    renderPanel(access)
    await signInHeading()

    await signIn('9981234567', '')

    expect(field('Contraseña')).toHaveAccessibleDescription('Escribe tu contraseña.')
    expect(access.signInAttempts).toEqual([])
  })

  it.each([
    ['wrongCredentials', 'Celular o contraseña incorrectos.'],
    ['notAnAdmin', 'Esta cuenta no tiene acceso al panel.'],
    ['tooManyAttempts', 'Demasiados intentos. Espera unos minutos e intenta de nuevo.'],
    ['unavailable', 'No se pudo conectar. Revisa tu internet e intenta de nuevo.'],
  ] as const)('keeps her on the sign-in screen when the answer is %s', async (outcome, message) => {
    renderPanel(new FakeAdminAccess({ signInOutcome: outcome }))
    await signInHeading()

    await signIn('9981234567', 'hilo-y-aguja')

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(await signInHeading()).toBeInTheDocument()
    expect(queryPanelNavigation()).not.toBeInTheDocument()
  })

  it('disables the button while the sign-in is in flight', async () => {
    const access = new FakeAdminAccess()
    const answerSignIn = access.holdNextSignIn()
    renderPanel(access)
    await signInHeading()

    await signIn('9981234567', 'hilo-y-aguja')

    expect(button('Entrando…')).toBeDisabled()
    answerSignIn('signedIn')
    expect(await panelNavigation()).toBeInTheDocument()
  })
})

describe('Signing out', () => {
  // The phone header and the desktop sidebar each have the button; CSS shows one of them.
  it.each([
    ['the phone header', 'banner'],
    ['the sidebar', 'complementary'],
  ])('signs out from %s and shows the sign-in screen', async (_place, landmark) => {
    const access = new FakeAdminAccess({ hasStoredSession: true })
    renderPanel(access)
    await panelNavigation()

    await userEvent.click(within(screen.getByRole(landmark)).getByRole('button', { name: 'Cerrar sesión' }))

    expect(await signInHeading()).toBeInTheDocument()
    expect(access.isSignedIn).toBe(false)
  })

  it('shows the sign-in screen when the session ends in another tab', async () => {
    const access = new FakeAdminAccess({ hasStoredSession: true })
    renderPanel(access)
    await panelNavigation()

    act(() => access.endSessionElsewhere())

    expect(await signInHeading()).toBeInTheDocument()
    expect(queryPanelNavigation()).not.toBeInTheDocument()
  })
})
