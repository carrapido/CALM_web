import { addDays, weekdayOf, type CalendarDate } from '../../shared/domain/calendar-date'
import type { Appointment } from '../domain/appointment'
import type { OpenHours, WeeklySchedule } from '../domain/schedule'

const DEFAULT_HOURS: OpenHours = { isOpen: true, opensAt: '10:00', closesAt: '18:00' }

// Placeholder until the admin sets her own hours in "Mi horario".
const DEFAULT_SCHEDULE: WeeklySchedule = {
  monday: DEFAULT_HOURS,
  tuesday: DEFAULT_HOURS,
  wednesday: DEFAULT_HOURS,
  thursday: DEFAULT_HOURS,
  friday: DEFAULT_HOURS,
  saturday: DEFAULT_HOURS,
  sunday: { isOpen: false },
}

// Demo data for the in-memory adapter, dated from the next open day so the agenda is never empty.
export function sampleAgenda(today: CalendarDate) {
  const firstDay = nextOpenDay(today)
  const appointments: Appointment[] = [
    {
      ticket: '4821',
      clientName: 'María López',
      whatsapp: '9981234567',
      date: firstDay,
      time: '10:30',
      quote: { services: ['Dobladillo de pantalón', 'Cambio de cierre'], preliminaryTotalMxn: 250 },
    },
    {
      ticket: '3156',
      clientName: 'Ana Martínez',
      date: firstDay,
      time: '13:00',
      quote: { services: ['Ajuste de vestido de fiesta'], preliminaryTotalMxn: 300 },
    },
    {
      ticket: '0937',
      clientName: 'Juan Pérez',
      whatsapp: '9989876543',
      date: nextOpenDay(addDays(firstDay, 1)),
      time: '11:00',
      quote: { services: ['Ajuste de cintura'], preliminaryTotalMxn: 180 },
    },
  ]
  return { schedule: DEFAULT_SCHEDULE, appointments }
}

function nextOpenDay(date: CalendarDate): CalendarDate {
  return DEFAULT_SCHEDULE[weekdayOf(date)].isOpen ? date : nextOpenDay(addDays(date, 1))
}
