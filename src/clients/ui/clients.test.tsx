import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { InMemoryClientsRepository } from '../infrastructure/in-memory-clients-repository'
import {
  AnsweringClientsRepository,
  CLIENTS,
  button,
  clientCard,
  clientList,
  field,
  renderClients,
} from './clients-test-kit'

const UNAVAILABLE_MESSAGE = 'No pudimos guardar. Revisa tu internet e inténtalo de nuevo.'

describe('Client list', () => {
  it('lists every client alphabetically', async () => {
    renderClients()

    const cards = within(await clientList()).getAllByRole('listitem')

    expect(cards).toHaveLength(3)
    expect(cards[0]).toHaveTextContent('Ángela Ruiz')
    expect(cards[1]).toHaveTextContent('Lucía Pérez')
    expect(cards[2]).toHaveTextContent('Rosa Méndez')
  })

  it('shows each phone grouped, or that she has none', async () => {
    renderClients()

    expect(await clientCard('Rosa Méndez')).toHaveTextContent('998 123 4567')
    expect(await clientCard('Ángela Ruiz')).toHaveTextContent('Sin celular')
  })

  it('shows whether each client has access to the app, with the matching action', async () => {
    renderClients()

    const rosa = await clientCard('Rosa Méndez')
    const lucia = await clientCard('Lucía Pérez')

    expect(rosa).toHaveTextContent('Tiene acceso a la app')
    expect(within(rosa).getByRole('button', { name: 'Cambiar NIP' })).toBeInTheDocument()
    expect(within(rosa).queryByRole('button', { name: 'Dar acceso a la app' })).not.toBeInTheDocument()
    expect(lucia).toHaveTextContent('Sin acceso a la app')
    expect(within(lucia).getByRole('button', { name: 'Dar acceso a la app' })).toBeInTheDocument()
    expect(within(lucia).queryByRole('button', { name: 'Cambiar NIP' })).not.toBeInTheDocument()
  })

  it('says it is loading, then that there are no clients', async () => {
    renderClients(new InMemoryClientsRepository([]))

    expect(screen.getByText('Cargando los clientes…')).toBeInTheDocument()
    expect(await screen.findByText('No hay clientes.')).toBeInTheDocument()
  })
})

describe('Register a client', () => {
  it('registers a new client with her NIP and lists her with access', async () => {
    const repository = new InMemoryClientsRepository(CLIENTS)
    renderClients(repository)
    await clientList()

    await userEvent.click(button('Dar de alta cliente'))
    await userEvent.type(field('Nombre'), '  Marta Gil ')
    await userEvent.type(field('Celular'), '998 555 1234')
    await userEvent.type(field('NIP'), '4321')
    await userEvent.click(button('Dar de alta'))

    const marta = await clientCard('Marta Gil')
    expect(marta).toHaveTextContent('998 555 1234')
    expect(marta).toHaveTextContent('Tiene acceso a la app')
    expect(repository.enrollments).toEqual([
      { kind: 'new', name: 'Marta Gil', phone: '9985551234', nip: '4321' },
    ])
  })

  it('goes back to the list without saving', async () => {
    const repository = new InMemoryClientsRepository(CLIENTS)
    renderClients(repository)
    await clientList()

    await userEvent.click(button('Dar de alta cliente'))
    await userEvent.type(field('Nombre'), 'Marta Gil')
    await userEvent.click(button('Volver sin guardar'))

    expect(within(await clientList()).getAllByRole('listitem')).toHaveLength(3)
    expect(repository.enrollments).toEqual([])
  })
})

describe('Give access to a client', () => {
  it('gives access to a client without it, titled with her name', async () => {
    const repository = new InMemoryClientsRepository(CLIENTS)
    renderClients(repository)

    await userEvent.click(within(await clientCard('Ángela Ruiz')).getByRole('button', { name: 'Dar acceso a la app' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Ángela Ruiz' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
    expect(field('Celular')).toHaveValue('')
    await userEvent.type(field('Celular'), '9983334444')
    await userEvent.type(field('NIP'), '1111')
    await userEvent.click(button('Guardar acceso'))

    const angela = await clientCard('Ángela Ruiz')
    expect(angela).toHaveTextContent('998 333 4444')
    expect(angela).toHaveTextContent('Tiene acceso a la app')
    expect(within(angela).getByRole('button', { name: 'Cambiar NIP' })).toBeInTheDocument()
    expect(repository.enrollments).toEqual([
      { kind: 'existing', clientId: '3', phone: '9983334444', nip: '1111' },
    ])
  })

  it('changes the NIP of a client with access, her phone prefilled, and forgets the NIP', async () => {
    const repository = new InMemoryClientsRepository(CLIENTS)
    renderClients(repository)

    await userEvent.click(within(await clientCard('Rosa Méndez')).getByRole('button', { name: 'Cambiar NIP' }))
    expect(field('Celular')).toHaveValue('9981234567')
    expect(field('NIP')).toHaveValue('')
    await userEvent.type(field('NIP'), '2468')
    await userEvent.click(button('Guardar acceso'))

    const rosa = await clientCard('Rosa Méndez')
    expect(rosa).toHaveTextContent('Tiene acceso a la app')
    expect(repository.enrollments).toEqual([
      { kind: 'existing', clientId: '1', phone: '9981234567', nip: '2468' },
    ])
    expect(screen.queryByText('2468')).not.toBeInTheDocument()

    await userEvent.click(within(rosa).getByRole('button', { name: 'Cambiar NIP' }))
    expect(field('NIP')).toHaveValue('')
  })
})

describe('Form checks', () => {
  it('asks for the name, phone and NIP of a new client and saves nothing', async () => {
    const repository = new InMemoryClientsRepository(CLIENTS)
    renderClients(repository)
    await clientList()

    await userEvent.click(button('Dar de alta cliente'))
    await userEvent.click(button('Dar de alta'))

    expect(field('Nombre')).toHaveAccessibleDescription('Escribe el nombre del cliente.')
    expect(field('Celular')).toHaveAccessibleDescription('Escribe el celular a 10 dígitos.')
    expect(field('NIP')).toHaveAccessibleDescription('El NIP necesita 4 dígitos.')
    expect(repository.enrollments).toEqual([])
  })

  it('refuses a phone without 10 digits and a short NIP for an existing client', async () => {
    const repository = new InMemoryClientsRepository(CLIENTS)
    renderClients(repository)

    await userEvent.click(within(await clientCard('Lucía Pérez')).getByRole('button', { name: 'Dar acceso a la app' }))
    await userEvent.clear(field('Celular'))
    await userEvent.type(field('Celular'), '99812345')
    await userEvent.type(field('NIP'), '12')
    await userEvent.click(button('Guardar acceso'))

    expect(field('Celular')).toHaveAccessibleDescription('Escribe el celular a 10 dígitos.')
    expect(field('NIP')).toHaveAccessibleDescription('El NIP necesita 4 dígitos.')
    expect(screen.queryByText('Escribe el nombre del cliente.')).not.toBeInTheDocument()
    expect(repository.enrollments).toEqual([])
  })

  it('takes only digits in the NIP, at most 4, and hides them', async () => {
    renderClients()
    await clientList()

    await userEvent.click(button('Dar de alta cliente'))
    await userEvent.type(field('NIP'), '12a3456')

    expect(field('NIP')).toHaveValue('1234')
    expect(field('NIP')).toHaveAttribute('type', 'password')
    expect(field('NIP')).toHaveAttribute('inputMode', 'numeric')
  })
})

describe('Server refusals', () => {
  it('shows a refusal beside the field it names and stays on the form', async () => {
    const repository = new AnsweringClientsRepository(CLIENTS, {
      kind: 'refused',
      message: 'Ese celular ya es de otro cliente.',
      field: 'phone',
    })
    renderClients(repository)
    await clientList()

    await userEvent.click(button('Dar de alta cliente'))
    await userEvent.type(field('Nombre'), 'Marta Gil')
    await userEvent.type(field('Celular'), '9981234567')
    await userEvent.type(field('NIP'), '4321')
    await userEvent.click(button('Dar de alta'))

    await waitFor(() =>
      expect(field('Celular')).toHaveAccessibleDescription('Ese celular ya es de otro cliente.'),
    )
    expect(field('Nombre')).toHaveValue('Marta Gil')
  })

  it('shows a refusal that names no field as is', async () => {
    renderClients(
      new AnsweringClientsRepository(CLIENTS, {
        kind: 'refused',
        message: 'Ese cliente ya no existe.',
        field: undefined,
      }),
    )

    await userEvent.click(within(await clientCard('Lucía Pérez')).getByRole('button', { name: 'Dar acceso a la app' }))
    await userEvent.type(field('NIP'), '1234')
    await userEvent.click(button('Guardar acceso'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ese cliente ya no existe.')
  })

  it('asks to check the internet when the server cannot answer', async () => {
    renderClients(new AnsweringClientsRepository(CLIENTS, { kind: 'unavailable' }))

    await userEvent.click(within(await clientCard('Lucía Pérez')).getByRole('button', { name: 'Dar acceso a la app' }))
    await userEvent.type(field('NIP'), '1234')
    await userEvent.click(button('Guardar acceso'))

    expect(await screen.findByRole('alert')).toHaveTextContent(UNAVAILABLE_MESSAGE)
  })
})
