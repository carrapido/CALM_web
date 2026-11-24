import { useState } from 'react'
import type { DayStatus } from '../../../agenda/domain/day-agenda'
import { firstDayOfMonth, type CalendarDate } from '../../../shared/domain/calendar-date'
import { Icon } from '../../../shared/ui/atoms/Icon'
import { capitalize, formatLongDate } from '../../../shared/ui/format'
import { entriesOn, entryKey, type CalendarEntry } from '../../domain/calendar-entries'
import { EntryChip } from './EntryChip'

type MonthGridProps = {
  // Whole Monday-to-Sunday weeks, from monthWeeks.
  weeks: CalendarDate[][]
  // The first day of the month shown; days of the other months carry no chips.
  month: CalendarDate
  today: CalendarDate
  entries: CalendarEntry[]
  statusOf: (date: CalendarDate) => DayStatus
  chosenKey: string | undefined
  onChoose: (entry: CalendarEntry) => void
  onOpenDay: (date: CalendarDate) => void
  className: string
}

const WEEKDAY_HEADERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function MonthGrid({
  weeks,
  month,
  today,
  entries,
  statusOf,
  chosenKey,
  onChoose,
  onOpenDay,
  className,
}: MonthGridProps) {
  // "N más" opens the rest of that day in place.
  const [expandedDate, setExpandedDate] = useState<CalendarDate>()

  return (
    <section
      aria-label="Calendario del mes"
      className={`min-w-0 flex-1 overflow-hidden rounded-xl bg-surface-container-lowest ${className}`}
    >
      <div aria-hidden="true" className="grid grid-cols-7 border-b border-separator">
        {WEEKDAY_HEADERS.map((weekday) => (
          <span key={weekday} className="px-2 pt-3 pb-2.5 text-label-lg text-on-surface-variant">
            {weekday}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flat().map((date) => (
          <MonthDay
            key={date}
            date={date}
            isInMonth={firstDayOfMonth(date) === month}
            isToday={date === today}
            status={statusOf(date)}
            entries={entriesOn(entries, date)}
            isExpanded={date === expandedDate}
            chosenKey={chosenKey}
            onChoose={onChoose}
            onExpand={() => setExpandedDate(date)}
            onOpen={() => onOpenDay(date)}
          />
        ))}
      </div>
    </section>
  )
}

type MonthDayProps = {
  date: CalendarDate
  isInMonth: boolean
  isToday: boolean
  status: DayStatus
  entries: CalendarEntry[]
  isExpanded: boolean
  chosenKey: string | undefined
  onChoose: (entry: CalendarEntry) => void
  onExpand: () => void
  onOpen: () => void
}

// The first row has no top line and the first column no left line: the card's edge is enough.
const DAY_LINES_CLASSES = 'border-t border-l border-separator [&:nth-child(-n+7)]:border-t-0 [&:nth-child(7n+1)]:border-l-0'

function MonthDay({
  date,
  isInMonth,
  isToday,
  status,
  entries,
  isExpanded,
  chosenKey,
  onChoose,
  onExpand,
  onOpen,
}: MonthDayProps) {
  const longDate = formatLongDate(date)

  return (
    <div
      role="group"
      aria-label={capitalize(longDate)}
      className={`flex min-h-29 min-w-0 flex-col gap-[3px] px-1 pt-1.5 pb-2 max-md:min-h-19 ${DAY_LINES_CLASSES} ${isInMonth ? '' : 'bg-surface-container-low'}`}
    >
      <DayNumber date={date} isInMonth={isInMonth} isToday={isToday} onOpen={onOpen} />
      <DayState status={status} />
      {isInMonth && (
        <DayEntries
          longDate={longDate}
          entries={entries}
          isExpanded={isExpanded}
          chosenKey={chosenKey}
          onChoose={onChoose}
          onExpand={onExpand}
        />
      )}
    </div>
  )
}

type DayNumberProps = {
  date: CalendarDate
  isInMonth: boolean
  isToday: boolean
  onOpen: () => void
}

// Opens the day view, with all its actions, on that date.
function DayNumber({ date, isInMonth, isToday, onOpen }: DayNumberProps) {
  const stateClasses = isToday
    ? 'bg-now font-extrabold text-white'
    : `hover:bg-fill ${isInMonth ? 'font-bold text-on-surface' : 'font-semibold text-outline'}`

  return (
    <button
      type="button"
      aria-label={`Abrir el ${formatLongDate(date)}${isToday ? ', hoy' : ''}`}
      onClick={onOpen}
      className={`flex h-7.5 min-w-7.5 items-center justify-center self-start rounded-full px-1.5 text-body-md tabular-nums transition-colors ${stateClasses}`}
    >
      {Number(date.slice(8))}
    </button>
  )
}

function DayState({ status }: { status: DayStatus }) {
  if (status === 'open') return null

  return (
    <span className="flex items-center gap-[3px] px-1 text-[12px] leading-[18px] font-bold text-on-surface-variant">
      {status === 'blocked' && <Icon name="lock" className="text-[16px]" />}
      {status === 'blocked' ? 'Bloqueado' : 'Cerrado'}
    </span>
  )
}

const VISIBLE_CHIPS = 3

type DayEntriesProps = {
  longDate: string
  entries: CalendarEntry[]
  isExpanded: boolean
  chosenKey: string | undefined
  onChoose: (entry: CalendarEntry) => void
  onExpand: () => void
}

// A chosen entry past the third one keeps its day open, so its chip stays in sight.
function DayEntries({ longDate, entries, isExpanded, chosenKey, onChoose, onExpand }: DayEntriesProps) {
  const hidden = entries.slice(VISIBLE_CHIPS)
  const isOpen = isExpanded || hidden.some((entry) => entryKey(entry) === chosenKey)
  const shown = isOpen ? entries : entries.slice(0, VISIBLE_CHIPS)

  return (
    <>
      {shown.map((entry) => (
        <EntryChip
          key={entryKey(entry)}
          entry={entry}
          isChosen={entryKey(entry) === chosenKey}
          onChoose={onChoose}
        />
      ))}
      {!isOpen && hidden.length > 0 && (
        <button
          type="button"
          aria-label={`Ver ${hidden.length} más del ${longDate}`}
          onClick={onExpand}
          className="self-start rounded-full px-2 py-0.5 text-[12px] leading-[17px] font-extrabold text-on-surface-variant hover:bg-fill"
        >
          {hidden.length} más
        </button>
      )}
    </>
  )
}
