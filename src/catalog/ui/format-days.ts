import { formatCount } from '../../shared/ui/format'

export function formatEstimatedDays(days: number): string {
  return days === 0 ? 'Mismo día' : formatCount(days, 'día', 'días')
}
