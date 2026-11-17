import { describe, expect, it } from 'vitest'
import { appointmentFromRow } from './appointment-rows'

describe('Appointment rows', () => {
  it('reads an appointment with its client, time and services', () => {
    expect(
      appointmentFromRow({
        ticket: '4821',
        scheduled_date: '2026-11-17',
        scheduled_time: '10:30:00',
        preliminary_total_mxn: 250,
        client: { name: 'María López', phone: '9981234567' },
        appointment_services: [
          { services: { name: 'Dobladillo de pantalón' } },
          { services: { name: 'Cambio de cierre' } },
        ],
      }),
    ).toEqual({
      ticket: '4821',
      clientName: 'María López',
      whatsapp: '9981234567',
      date: '2026-11-17',
      time: '10:30',
      quote: {
        services: ['Dobladillo de pantalón', 'Cambio de cierre'],
        preliminaryTotalMxn: 250,
      },
    })
  })

  it('leaves the WhatsApp number out when the client has no phone', () => {
    const appointment = appointmentFromRow({
      ticket: '3156',
      scheduled_date: '2026-11-17',
      scheduled_time: '13:00:00',
      preliminary_total_mxn: 300,
      client: { name: 'Ana Martínez', phone: null },
      appointment_services: [{ services: { name: 'Ajuste de vestido de fiesta' } }],
    })

    expect(appointment.whatsapp).toBeUndefined()
  })
})
