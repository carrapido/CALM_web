import { describe, expect, it } from 'vitest'
import { newServiceRow, serviceFromRow, serviceRowOf } from '../services/service-rows'

describe('Service rows in the services table', () => {
  it('reads a service with a base price', () => {
    expect(
      serviceFromRow({
        id: 3,
        name: 'Parche',
        category: 'arreglo',
        base_price_mxn: 40,
        estimated_days: 0,
        is_active: true,
      }),
    ).toEqual({
      id: '3',
      name: 'Parche',
      price: { kind: 'base', amountMxn: 40 },
      estimatedDays: 0,
      isActive: true,
    })
  })

  it('reads a service priced in the store when it has no base price', () => {
    expect(
      serviceFromRow({
        id: 6,
        name: 'Arreglo de vestido de novia',
        category: 'arreglo',
        base_price_mxn: null,
        estimated_days: 7,
        is_active: false,
      }).price,
    ).toEqual({ kind: 'inStore' })
  })

  it('writes a new service as an active arreglo, since the panel has no category yet', () => {
    expect(
      newServiceRow({
        name: 'Parche',
        price: { kind: 'base', amountMxn: 40 },
        estimatedDays: 0,
      }),
    ).toEqual({
      name: 'Parche',
      category: 'arreglo',
      base_price_mxn: 40,
      estimated_days: 0,
      is_active: true,
    })
  })

  it('writes an in-store price as a null base price', () => {
    expect(
      serviceRowOf({
        id: '6',
        name: 'Arreglo de vestido de novia',
        price: { kind: 'inStore' },
        estimatedDays: 7,
        isActive: true,
      }).base_price_mxn,
    ).toBeNull()
  })

  it('writes every editable column on update, including whether the service is active', () => {
    expect(
      serviceRowOf({
        id: '7',
        name: 'Bordado',
        price: { kind: 'base', amountMxn: 250 },
        estimatedDays: 7,
        isActive: false,
      }),
    ).toEqual({
      name: 'Bordado',
      base_price_mxn: 250,
      estimated_days: 7,
      is_active: false,
    })
  })
})
