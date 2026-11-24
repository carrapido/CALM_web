import type { AgendaRepository } from '../services/agenda-repository'
import { dayStatus } from '../utils/day-agenda'
import { pendingAppointments } from '../services/appointments-awaiting-order'
import type { OrdersRepository } from '../services/orders-repository'
import type { Order } from '../utils/order'
import { FinishedNotice } from './FinishedNotice'
import type { MoveOrder } from './OrderDetail'
import { addMonths, firstDayOfMonth, momentInCancun, type CalendarDate } from '../utils/calendar-date'
import { PeriodChanger } from './PeriodChanger'
import { formatMonthLabel } from '../utils/format'
import { useQuery } from '../hooks/useQuery'
import { calendarEntries, entryKey, visibleEntries, type CalendarFilter } from '../utils/calendar-entries'
import { monthWeeks } from '../utils/month-grid'
import { EntryDetail } from './EntryDetail'
import { PendingAppointments } from './PendingAppointments'
import { useChosenDetail } from '../hooks/useChosenDetail'
import { ChipLegend } from './EntryChip'
import { MonthGrid } from './MonthGrid'

type MonthContainerProps = {
  repository: AgendaRepository
  ordersRepository: OrdersRepository
  // undefined while the orders load.
  orders: Order[] | undefined
  filter: CalendarFilter
  now: () => Date
  date: CalendarDate
  onDateChange: (date: CalendarDate) => void
  onOpenDay: (date: CalendarDate) => void
  onMoveOrder: MoveOrder
}

// The month beside the chosen chip's detail. Below the split width (the @container's
// @3xl) the detail is a screen of its own: the month steps aside.
export function MonthContainer({
  repository,
  ordersRepository,
  orders,
  filter,
  now,
  date,
  onDateChange,
  onOpenDay,
  onMoveOrder,
}: MonthContainerProps) {
  const currentMoment = momentInCancun(now())
  const today = currentMoment.date
  const weeks = monthWeeks(date)
  const { data: agenda, reload } = useQuery(weeks[0][0], () => loadAgenda(repository, weeks))
  const { chosenKey, notice, choose, movingWithNotice } = useChosenDetail()
  const entries = agenda && orders && visibleEntries(calendarEntries(agenda.appointments, orders), filter)
  const chosen = entries?.find((entry) => entryKey(entry) === chosenKey)
  const hiddenBesideDetail = chosen ? '@max-3xl:hidden' : ''
  const showsPending = filter.show === 'appointments'
  // Loaded only on Citas, so the other filters cost no extra agenda read.
  const { data: pending, reload: reloadPending } = useQuery(showsPending ? 'pending-appointments' : 'none', () =>
    showsPending ? pendingAppointments(repository, ordersRepository, today) : Promise.resolve([]),
  )

  // Only the chosen appointment's detail offers to cancel it, so its date is the chip's.
  const cancelAppointment = async (ticket: string) => {
    if (chosen === undefined) return
    await repository.cancelAppointment(ticket, chosen.date)
    reload()
    reloadPending()
  }

  return (
    <div className="mt-space-lg flex flex-col gap-space-md">
      <FinishedNotice notice={notice} />
      <div className={`flex flex-col gap-3 ${hiddenBesideDetail}`}>
        <div className="flex flex-wrap items-center justify-between gap-space-md">
          <h2 className="text-headline-lg text-on-surface">{formatMonthLabel(date)}</h2>
          <PeriodChanger
            label="Cambiar de mes"
            previousLabel="Mes anterior"
            nextLabel="Mes siguiente"
            isCurrent={firstDayOfMonth(date) === firstDayOfMonth(today)}
            onPrevious={() => onDateChange(addMonths(date, -1))}
            onToday={() => onDateChange(today)}
            onNext={() => onDateChange(addMonths(date, 1))}
          />
        </div>
        <ChipLegend filter={filter} />
      </div>
      <div className="flex flex-col gap-7 @3xl:flex-row @3xl:items-start">
        {agenda === undefined || entries === undefined ? (
          <p className="min-w-0 flex-1 text-on-surface-variant">Cargando el mes…</p>
        ) : (
          <MonthGrid
            weeks={weeks}
            month={firstDayOfMonth(date)}
            today={today}
            entries={entries}
            statusOf={(day) => dayStatus(agenda.schedule, day, agenda.blockedDates)}
            chosenKey={chosenKey}
            onChoose={(entry) => choose(entryKey(entry))}
            onOpenDay={onOpenDay}
            className={hiddenBesideDetail}
          />
        )}
        <EntryDetail
          key={chosenKey}
          entry={chosen}
          now={currentMoment}
          nothingChosen={showsPending ? <PendingAppointments appointments={pending} today={today} /> : undefined}
          onCancelAppointment={cancelAppointment}
          onMoveOrder={movingWithNotice(onMoveOrder)}
          onClose={() => choose(undefined)}
        />
      </div>
    </div>
  )
}

async function loadAgenda(repository: AgendaRepository, weeks: CalendarDate[][]) {
  const [schedule, appointments, blockedDates] = await Promise.all([
    repository.weeklySchedule(),
    repository.appointmentsBetween(weeks[0][0], weeks[weeks.length - 1][6]),
    repository.blockedDates(),
  ])
  return { schedule, appointments, blockedDates }
}
