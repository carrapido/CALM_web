import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useQuery } from '../hooks/useQuery'

const FAILURE = new Error('La API no respondió')

describe('useQuery', () => {
  it('exposes a failed load and loads again on reload', async () => {
    let calls = 0
    const load = async () => {
      calls += 1
      if (calls === 1) throw FAILURE
      return 'servicios'
    }
    const { result } = renderHook(() => useQuery('services', load))

    await waitFor(() => expect(result.current.error).toBe(FAILURE))
    expect(result.current.data).toBeUndefined()

    act(() => result.current.reload())

    expect(result.current.error).toBeUndefined()
    await waitFor(() => expect(result.current.data).toBe('servicios'))
    expect(result.current.error).toBeUndefined()
  })

  it('never shows the failure of a key the view already left', async () => {
    const { result, rerender } = renderHook(
      ({ key }) => useQuery(key, () => (key === 'october' ? Promise.reject(FAILURE) : new Promise<string>(() => {}))),
      { initialProps: { key: 'october' } },
    )
    await waitFor(() => expect(result.current.error).toBe(FAILURE))

    rerender({ key: 'november' })

    expect(result.current.error).toBeUndefined()
    expect(result.current.data).toBeUndefined()
  })
})
