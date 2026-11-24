// Some work can only be priced after seeing the garment.
export type ServicePrice = { kind: 'base'; amountMxn: number } | { kind: 'inStore' }

export type Service = {
  id: string
  name: string
  price: ServicePrice
  // Days until the garment is ready; 0 means the same day.
  estimatedDays: number
  // Only active services reach the client app.
  isActive: boolean
}

export type ServiceDetails = Omit<Service, 'id' | 'isActive'>
