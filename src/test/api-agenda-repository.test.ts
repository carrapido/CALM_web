import { describe, expect, it } from 'vitest'
import { ApiAgendaRepository } from '../services/api-agenda-repository'
import { ApiClient } from '../services/api-client'
import type { Appointment } from '../types/appointment'
import type { WeeklySchedule } from '../utils/schedule'

type SentRequest = { url: string; method: string; headers: Headers; body: unknown }

const WEEK: WeeklySchedule = {
  monday: { isOpen: true, opensAt: '09:00', closesAt: '18:00' },
  tuesday: { isOpen: true, opensAt: '09:00', closesAt: '18:00' },
  wednesday: { isOpen: false },
  thursday: { isOpen: true, opensAt: '09:00', closesAt: '18:00' },
  friday: { isOpen: true, opensAt: '09:00', closesAt: '18:00' },
  saturday: { isOpen: true, opensAt: '10:00', closesAt: '14:00' },
  sunday: { isOpen: false },
}
const ANA: Appointment = {
  ticket: '0427',
  clientName: 'Ana López',
  whatsapp: '9981234567',
  date: '2026-06-01',
  time: '10:00',
  quote: { services: ['Parche'], preliminaryTotalMxn: 40 },
}
const API = 'http://localhost:3000/api'

// Answers every request with `answer` and records what the adapter sent.
function fakeApi(answer: () => Response) {
  const sent: SentRequest[] = []
  const fetchFake = async (url: string | URL | Request, init?: RequestInit) => {
    sent.push({
      url: String(url),
      method: init?.method ?? 'GET',
      headers: new Headers(init?.headers),
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    })
    return answer()
  }
  const client = new ApiClient(`${API}/`, async () => 'token-de-sesion', fetchFake)
  return { repository: new ApiAgendaRepository(client), sent }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function noContent(): Response {
  return new Response(null, { status: 204 })
}

describe('The agenda through the API', () => {
  it('reads the weekly schedule with the session token', async () => {
    const { repository, sent } = fakeApi(() => json(200, WEEK))

    expect(await repository.weeklySchedule()).toEqual(WEEK)
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({ url: `${API}/schedule`, method: 'GET' })
    expect(sent[0].headers.get('Authorization')).toBe('Bearer token-de-sesion')
  })

  it('saves the whole week', async () => {
    const { repository, sent } = fakeApi(() => json(200, WEEK))

    await repository.saveWeeklySchedule(WEEK)

    expect(sent[0]).toMatchObject({ url: `${API}/schedule`, method: 'PUT', body: { schedule: WEEK } })
  })

  it('reads the appointments of a range', async () => {
    const { repository, sent } = fakeApi(() => json(200, [ANA]))

    expect(await repository.appointmentsBetween('2026-06-01', '2026-06-30')).toEqual([ANA])
    expect(sent[0]).toMatchObject({ url: `${API}/appointments?from=2026-06-01&to=2026-06-30`, method: 'GET' })
  })

  it('cancels the appointment with that ticket on that date', async () => {
    const { repository, sent } = fakeApi(noContent)

    await repository.cancelAppointment('0427', '2026-06-01')

    expect(sent[0]).toMatchObject({ url: `${API}/appointments/0427?date=2026-06-01`, method: 'DELETE' })
  })

  it('rejects with the API message when it refuses the cancel', async () => {
    const message = 'La fecha no es válida; usa el formato AAAA-MM-DD.'
    const { repository } = fakeApi(() => json(400, { error: message, code: 'invalid_input' }))

    await expect(repository.cancelAppointment('0427', '2026-02-30')).rejects.toMatchObject({ status: 400, message })
  })

  it('reads the blocked days', async () => {
    const { repository, sent } = fakeApi(() => json(200, ['2026-05-20', '2026-06-10']))

    expect(await repository.blockedDates()).toEqual(['2026-05-20', '2026-06-10'])
    expect(sent[0]).toMatchObject({ url: `${API}/blocked-dates`, method: 'GET' })
  })

  it('blocks a day', async () => {
    const { repository, sent } = fakeApi(() => json(201, { date: '2026-06-15' }))

    await repository.blockDay('2026-06-15')

    expect(sent[0]).toMatchObject({ url: `${API}/blocked-dates`, method: 'POST', body: { date: '2026-06-15' } })
  })

  it('unblocks a day', async () => {
    const { repository, sent } = fakeApi(noContent)

    await repository.unblockDay('2026-06-15')

    expect(sent[0]).toMatchObject({ url: `${API}/blocked-dates/2026-06-15`, method: 'DELETE' })
  })
})
