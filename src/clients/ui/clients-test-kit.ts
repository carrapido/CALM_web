import { render, screen, within } from '@testing-library/react'
import { createElement } from 'react'
import type { ClientsRepository, EnrollmentOutcome } from '../application/clients-repository'
import type { Client } from '../domain/client'
import type { Enrollment } from '../domain/enrollment'
import { InMemoryClientsRepository } from '../infrastructure/in-memory-clients-repository'
import { ClientsPage } from './ClientsPage'

// Unsorted on purpose: a plain sort would put "Ángela" last.
export const CLIENTS: Client[] = [
  { id: '1', name: 'Rosa Méndez', phone: '9981234567', hasAppAccess: true },
  { id: '2', name: 'Lucía Pérez', phone: '9987654321', hasAppAccess: false },
  { id: '3', name: 'Ángela Ruiz', phone: null, hasAppAccess: false },
]

// Answers every enrollment with the same outcome, to show how the form reads it.
export class AnsweringClientsRepository extends InMemoryClientsRepository {
  private readonly outcome: EnrollmentOutcome

  constructor(clients: Client[], outcome: EnrollmentOutcome) {
    super(clients)
    this.outcome = outcome
  }

  async enroll(enrollment: Enrollment): Promise<EnrollmentOutcome> {
    this.enrollments.push(enrollment)
    return this.outcome
  }
}

export function renderClients(
  repository: ClientsRepository = new InMemoryClientsRepository(CLIENTS),
): ClientsRepository {
  render(createElement(ClientsPage, { repository }))
  return repository
}

export function clientList(): Promise<HTMLElement> {
  return screen.findByRole('list', { name: 'Clientes' })
}

export async function clientCard(name: string): Promise<HTMLElement> {
  const cards = within(await clientList()).getAllByRole('listitem')
  const card = cards.find((item) => item.textContent?.includes(name))
  if (card === undefined) throw new Error(`No client card for ${name}`)
  return card
}

export function field(label: string): HTMLElement {
  return screen.getByLabelText(label)
}

export function button(name: string): HTMLElement {
  return screen.getByRole('button', { name })
}
