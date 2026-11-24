import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { activeServices, button, inactiveServices, renderCatalog, serviceCard } from './catalog-test-kit'

describe('Delete a deactivated service', () => {
  it('deletes a deactivated service for good once confirmed', async () => {
    renderCatalog()

    await userEvent.click(within(await serviceCard(inactiveServices(), 'Bordado')).getByRole('button', { name: 'Eliminar' }))
    expect(screen.getByText('¿Eliminar Bordado para siempre? Esto no se puede deshacer.')).toBeInTheDocument()
    await userEvent.click(button('Sí, eliminar'))

    await waitFor(() => expect(screen.queryByText('Bordado')).not.toBeInTheDocument())
    expect(await activeServices()).not.toHaveTextContent('Bordado')
  })

  it('keeps the service when the admin changes her mind', async () => {
    renderCatalog()

    await userEvent.click(within(await serviceCard(inactiveServices(), 'Bordado')).getByRole('button', { name: 'Eliminar' }))
    await userEvent.click(button('No, conservarlo'))

    expect(await inactiveServices()).toHaveTextContent('Bordado')
  })

  it('offers no delete on an active service', async () => {
    renderCatalog()

    const waist = await serviceCard(activeServices(), 'Ajuste de cintura')

    expect(within(waist).queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
  })
})
