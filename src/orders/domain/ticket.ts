const TICKET_COUNT = 10_000

// 4 random digits that no active ticket uses. `random` behaves like Math.random.
export function newTicket(takenTickets: ReadonlySet<string>, random: () => number): string {
  let ticket = drawTicket(random)
  while (takenTickets.has(ticket)) ticket = drawTicket(random)
  return ticket
}

function drawTicket(random: () => number): string {
  return String(Math.floor(random() * TICKET_COUNT)).padStart(4, '0')
}
