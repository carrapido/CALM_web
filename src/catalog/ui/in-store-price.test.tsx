import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { activeServices, button, field, renderCatalog, serviceCard } from './catalog-test-kit'

describe('Price quoted in store', () => {
  it('adds a service whose price is quoted in store', async () => {
    renderCatalog()
    await activeServices()

    await userEvent.click(button('Agregar servicio'))
    await userEvent.type(field('Nombre del servicio'), 'Vestido de novia')
    await userEvent.click(screen.getByRole('radio', { name: 'Se cotiza en el local' }))
    expect(screen.queryByLabelText('Precio base (MXN)')).not.toBeInTheDocument()
    await userEvent.click(button('Guardar servicio'))

    const dress = await serviceCard(activeServices(), 'Vestido de novia')
    expect(dress).toHaveTextContent('Precio: se cotiza en el local')
    expect(dress).not.toHaveTextContent('MXN')
  })

  it('keeps the in-store choice when editing the service', async () => {
    renderCatalog()

    await userEvent.click(within(await serviceCard(activeServices(), 'Ajuste de cintura')).getByRole('button', { name: 'Editar' }))
    expect(screen.getByRole('radio', { name: 'Tiene precio base' })).toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: 'Se cotiza en el local' }))
    await userEvent.click(button('Guardar servicio'))
    await waitFor(async () =>
      expect(await serviceCard(activeServices(), 'Ajuste de cintura')).toHaveTextContent('Precio: se cotiza en el local'),
    )

    await userEvent.click(within(await serviceCard(activeServices(), 'Ajuste de cintura')).getByRole('button', { name: 'Editar' }))

    expect(screen.getByRole('radio', { name: 'Se cotiza en el local' })).toBeChecked()
  })

  it('asks for the base price again when switching back to it', async () => {
    renderCatalog()
    await activeServices()

    await userEvent.click(button('Agregar servicio'))
    await userEvent.type(field('Nombre del servicio'), 'Vestido de novia')
    await userEvent.click(screen.getByRole('radio', { name: 'Se cotiza en el local' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Tiene precio base' }))
    await userEvent.click(button('Guardar servicio'))

    expect(screen.getByText('Escribe un precio mayor a 0')).toBeInTheDocument()
  })
})
