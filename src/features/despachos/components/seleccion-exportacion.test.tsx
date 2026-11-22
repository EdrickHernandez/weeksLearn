import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Despacho } from '../schemas'
import { SeleccionExportacion } from './seleccion-exportacion'

function despacho(id: string, numeroDocumento: string): Despacho {
  return {
    id,
    userId: '11111111-1111-4111-8111-111111111111',
    despachadoAt: '2026-09-30T17:30:00.000Z',
    tipoDocumento: 'boleta',
    numeroDocumento,
    numeroGuia: `G-${numeroDocumento}`,
    transporte: 'Starken',
    comuna: 'Providencia',
    comunaEnCatalogo: true,
    valorClp: 25000,
    bultos: 1,
    pesosBultos: [5],
    entrega: null,
    entregado: false,
    tipoEmbalaje: 'caja',
    direccion: null,
    telefono: null,
    contacto: null,
    retiradoPor: null,
    vehiculo: null,
    createdAt: '2026-09-30T18:00:00.000Z',
    updatedAt: '2026-09-30T18:00:00.000Z',
  }
}

const despachos = [despacho('id-1', 'B-1'), despacho('id-2', 'B-2')]

function renderSeleccion(onExportar = vi.fn(), visibles = despachos) {
  return render(
    <SeleccionExportacion despachos={visibles} onExportar={onExportar}>
      <div>Filas visibles</div>
    </SeleccionExportacion>,
  )
}

describe('SeleccionExportacion', () => {
  afterEach(() => {
    cleanup()
  })

  it('habilita la exportación y devuelve solo el id marcado', async () => {
    const user = userEvent.setup()
    const onExportar = vi.fn()
    renderSeleccion(onExportar)

    await user.click(screen.getByRole('button', { name: 'Marcar para exportar' }))
    const exportar = screen.getByRole('button', { name: 'Exportar seleccionados' })
    expect(exportar).toBeDisabled()

    await user.click(screen.getByRole('checkbox', { name: 'Seleccionar despacho B-1' }))
    expect(exportar).toBeEnabled()

    await user.click(exportar)
    expect(onExportar).toHaveBeenCalledWith(['id-1'])
  })

  it('selecciona y exporta todos los despachos visibles', async () => {
    const user = userEvent.setup()
    const onExportar = vi.fn()
    renderSeleccion(onExportar)

    await user.click(screen.getByRole('button', { name: 'Marcar para exportar' }))
    await user.click(
      screen.getByRole('checkbox', { name: 'Seleccionar todos los despachos visibles' }),
    )
    await user.click(screen.getByRole('button', { name: 'Exportar seleccionados' }))

    expect(onExportar).toHaveBeenCalledWith(['id-1', 'id-2'])
  })

  it('limpia la selección cuando cambia el conjunto visible', async () => {
    const user = userEvent.setup()
    const onExportar = vi.fn()
    const vistaInicial = renderSeleccion(onExportar)

    await user.click(screen.getByRole('button', { name: 'Marcar para exportar' }))
    await user.click(screen.getByRole('checkbox', { name: 'Seleccionar despacho B-1' }))
    expect(screen.getByRole('button', { name: 'Exportar seleccionados' })).toBeEnabled()

    vistaInicial.rerender(
      <SeleccionExportacion despachos={[despachos[1]]} onExportar={onExportar}>
        <div>Filas visibles</div>
      </SeleccionExportacion>,
    )

    expect(screen.getByText('0 seleccionados')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Exportar seleccionados' })).toBeDisabled()
  })
})
