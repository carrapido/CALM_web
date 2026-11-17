import type { Weekday } from '../../shared/domain/calendar-date'

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
}

// "998 123 4567": the 10-digit number in the 3-3-4 groups people read aloud.
export function formatWhatsapp(number: string): string {
  return `${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`
}
