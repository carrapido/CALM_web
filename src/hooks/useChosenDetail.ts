import { useState } from 'react'
import { isActive } from '../utils/order'
import type { MoveOrder } from '../components/OrderDetail'
import { finishedNotice } from '../utils/order-listing'

// What the detail beside a list shows, by key, and the notice a finished order leaves:
// choosing something else clears the notice.
export function useChosenDetail() {
  const [chosenKey, setChosenKey] = useState<string>()
  const [notice, setNotice] = useState<string>()

  const choose = (key: string | undefined) => {
    setChosenKey(key)
    setNotice(undefined)
  }

  // A finished order leaves the list, so the detail closes and a notice says where it went.
  const movingWithNotice =
    (onMove: MoveOrder): MoveOrder =>
    (order, status) =>
      onMove(order, status).then(() => {
        if (isActive({ ...order, status })) return
        setChosenKey(undefined)
        setNotice(finishedNotice(order, status))
      })

  return { chosenKey, notice, choose, movingWithNotice }
}
