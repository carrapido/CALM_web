// "9981234567" reads as "998 123 4567"; a phone of any other length stays as stored.
export function formatPhone(phone: string | null): string {
  if (phone === null) return 'Sin celular'
  const groups = /^(\d{3})(\d{3})(\d{4})$/.exec(phone)
  return groups ? `${groups[1]} ${groups[2]} ${groups[3]}` : phone
}
