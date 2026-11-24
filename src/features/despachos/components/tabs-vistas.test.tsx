import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DespachoFiltrosUrl } from '../schemas'
import { TabsVistas } from './tabs-vistas'

describe('TabsVistas', () => {
  afterEach(() => cleanup())

  it('convierte la pestaña Semana en el rango lunes-domingo', async () => {
    const user = userEvent.setup()
    const onCambiar = vi.fn()
    render(<TabsVistas filtros={{}} ahora={new Date(2026, 10, 18)} onCambiar={onCambiar} />)

    await user.click(screen.getByRole('button', { name: 'Semana' }))

    expect(onCambiar).toHaveBeenCalledWith({
      vista: 'semana',
      desde: '2026-11-16',
      hasta: '2026-11-22',
      pagina: undefined,
    })
  })

  it('deja las pestañas sin selección cuando el rango es personalizado', () => {
    const filtros: DespachoFiltrosUrl = { desde: '2026-11-03', hasta: '2026-11-18' }
    render(<TabsVistas filtros={filtros} ahora={new Date(2026, 10, 18)} onCambiar={vi.fn()} />)

    expect(screen.queryByRole('button', { current: 'page' })).not.toBeInTheDocument()
  })

  it('General elimina el rango y la vista predefinida', async () => {
    const user = userEvent.setup()
    const onCambiar = vi.fn()
    render(
      <TabsVistas
        filtros={{ vista: 'mes', desde: '2026-11-01', hasta: '2026-11-30' }}
        ahora={new Date(2026, 10, 18)}
        onCambiar={onCambiar}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'General' }))

    expect(onCambiar).toHaveBeenCalledWith({
      vista: undefined,
      desde: undefined,
      hasta: undefined,
      pagina: undefined,
    })
  })

  it('permite cambiar la fecha cuando Día está activo', () => {
    const onCambiar = vi.fn()
    render(
      <TabsVistas
        filtros={{ vista: 'dia', desde: '2026-11-18', hasta: '2026-11-18' }}
        ahora={new Date(2026, 10, 18)}
        onCambiar={onCambiar}
      />,
    )

    fireEvent.change(screen.getByLabelText('Fecha de la vista Día'), {
      target: { value: '2026-11-12' },
    })

    expect(onCambiar).toHaveBeenLastCalledWith({
      vista: 'dia',
      desde: '2026-11-12',
      hasta: '2026-11-12',
      pagina: undefined,
    })
  })

  it('activa Día al enfocar su selector de fecha', () => {
    const onCambiar = vi.fn()
    render(<TabsVistas filtros={{}} ahora={new Date(2026, 10, 18)} onCambiar={onCambiar} />)

    fireEvent.focus(screen.getByLabelText('Fecha de la vista Día'))

    expect(onCambiar).toHaveBeenCalledWith({
      vista: 'dia',
      desde: '2026-11-18',
      hasta: '2026-11-18',
      pagina: undefined,
    })
  })
})
