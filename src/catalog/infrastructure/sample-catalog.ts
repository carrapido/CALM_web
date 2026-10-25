import type { Service } from '../domain/service'

// Demo data for the in-memory adapter. Prices are placeholders the admin replaces;
// the market study found only indicative Cancún prices (~$100 MXN per garment).
export function sampleCatalog(): Service[] {
  return [
    { id: 'hem', name: 'Dobladillo de pantalón', price: { kind: 'base', amountMxn: 100 }, estimatedDays: 1, isActive: true },
    { id: 'zipper', name: 'Cambio de cierre', price: { kind: 'base', amountMxn: 130 }, estimatedDays: 2, isActive: true },
    { id: 'waist', name: 'Ajuste de cintura', price: { kind: 'base', amountMxn: 180 }, estimatedDays: 3, isActive: true },
    { id: 'party-dress', name: 'Ajuste de vestido de fiesta', price: { kind: 'base', amountMxn: 300 }, estimatedDays: 5, isActive: true },
    { id: 'patch', name: 'Parche', price: { kind: 'base', amountMxn: 40 }, estimatedDays: 0, isActive: true },
    { id: 'wedding-dress', name: 'Arreglo de vestido de novia', price: { kind: 'inStore' }, estimatedDays: 7, isActive: true },
    { id: 'embroidery', name: 'Bordado', price: { kind: 'base', amountMxn: 250 }, estimatedDays: 7, isActive: false },
  ]
}
