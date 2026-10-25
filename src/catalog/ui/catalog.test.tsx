import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import {
  activeServices,
  button,
  field,
  inactiveServices,
  renderCatalog,
  serviceCard,
} from './catalog-test-kit'

describe('Active services', () => {
  it('lists the active services alphabetically', async () => {
    renderCatalog()

    const cards = within(await activeServices()).getAllByRole('listitem')

    expect(cards).toHaveLength(3)
    expect(cards[0]).toHaveTextContent('Ajuste de cintura')
    expect(cards[1]).toHaveTextContent('Cambio de cierre')
    expect(cards[2]).toHaveTextContent('Dobladillo de pantalón')
  })

  it('shows the base price and estimated time of each service', async () => {
    renderCatalog()

    const waist = await serviceCard(activeServices(), 'Ajuste de cintura')
    const zipper = await serviceCard(activeServices(), 'Cambio de cierre')

    expect(waist).toHaveTextContent('Precio base: $180 MXN')
    expect(waist).toHaveTextContent('Tiempo estimado: 3 días')
    expect(zipper).toHaveTextContent('Tiempo estimado: Mismo día')
  })
})

describe('Add and edit a service', () => {
  it('adds a new service to the list', async () => {
    renderCatalog()
    await activeServices()

    await userEvent.click(button('Agregar servicio'))
    await userEvent.type(field('Nombre del servicio'), 'Bastilla')
    await userEvent.type(field('Precio base (MXN)'), '100')
    await userEvent.selectOptions(field('Tiempo estimado'), '1')
    await userEvent.click(button('Guardar servicio'))

    const bastilla = await serviceCard(activeServices(), 'Bastilla')
    expect(bastilla).toHaveTextContent('Precio base: $100 MXN')
    expect(bastilla).toHaveTextContent('Tiempo estimado: 1 día')
  })

  it('edits a service, keeping its own name', async () => {
    renderCatalog()

    await userEvent.click(within(await serviceCard(activeServices(), 'Ajuste de cintura')).getByRole('button', { name: 'Editar' }))
    expect(field('Nombre del servicio')).toHaveValue('Ajuste de cintura')
    expect(field('Tiempo estimado')).toHaveValue('3')
    await userEvent.clear(field('Precio base (MXN)'))
    await userEvent.type(field('Precio base (MXN)'), '200')
    await userEvent.click(button('Guardar servicio'))

    await waitFor(async () =>
      expect(await serviceCard(activeServices(), 'Ajuste de cintura')).toHaveTextContent('Precio base: $200 MXN'),
    )
  })

  it('refuses a missing name or price and saves nothing', async () => {
    renderCatalog()
    await activeServices()

    await userEvent.click(button('Agregar servicio'))
    await userEvent.click(button('Guardar servicio'))

    expect(screen.getByText('Escribe el nombre del servicio')).toBeInTheDocument()
    expect(screen.getByText('Escribe un precio mayor a 0')).toBeInTheDocument()

    await userEvent.click(button('Volver sin guardar'))
    expect(within(await activeServices()).getAllByRole('listitem')).toHaveLength(3)
  })

  it('refuses a name another service already uses, ignoring case and accents', async () => {
    renderCatalog()
    await activeServices()

    await userEvent.click(button('Agregar servicio'))
    await userEvent.type(field('Nombre del servicio'), 'dobladillo de PANTALON')
    await userEvent.type(field('Precio base (MXN)'), '90')
    await userEvent.click(button('Guardar servicio'))

    expect(screen.getByText('Ya existe un servicio con ese nombre')).toBeInTheDocument()
  })
})

describe('Deactivate and activate a service', () => {
  it('moves a service to the deactivated list once confirmed', async () => {
    renderCatalog()

    await userEvent.click(within(await serviceCard(activeServices(), 'Cambio de cierre')).getByRole('button', { name: 'Desactivar' }))
    expect(screen.getByText('¿Desactivar Cambio de cierre? Los clientes ya no lo verán en la app.')).toBeInTheDocument()
    await userEvent.click(button('Sí, desactivar'))

    await waitFor(async () => expect(await activeServices()).not.toHaveTextContent('Cambio de cierre'))
    expect(await inactiveServices()).toHaveTextContent('Cambio de cierre')
  })

  it('keeps the service active when the admin changes her mind', async () => {
    renderCatalog()

    await userEvent.click(within(await serviceCard(activeServices(), 'Cambio de cierre')).getByRole('button', { name: 'Desactivar' }))
    await userEvent.click(button('No, dejarlo activo'))

    expect(await activeServices()).toHaveTextContent('Cambio de cierre')
  })

  it('activates a deactivated service again', async () => {
    renderCatalog()

    await userEvent.click(within(await serviceCard(inactiveServices(), 'Bordado')).getByRole('button', { name: 'Activar de nuevo' }))

    await waitFor(async () => expect(await activeServices()).toHaveTextContent('Bordado'))
  })
})
