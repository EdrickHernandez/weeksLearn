import { describe, expect, it } from 'vitest'
import { buildEntregaInsert } from './service'
import { entregaInputSchema } from './schemas'

const AHORA = new Date('2026-11-16T15:00:00.000Z')

describe('buildEntregaInsert', () => {
  it('mapea cliente final y conserva solo sus columnas', () => {
    const input = entregaInputSchema.parse({
      tipoEntrega: 'cliente_final',
      nombreCliente: ' Ana ',
      apellidoCliente: ' Pérez ',
      rutCliente: '12.345.678-5',
      entregaEstimadaAt: '2026-11-16T11:00',
    })

    expect(buildEntregaInsert('11111111-1111-4111-8111-111111111111', input, AHORA)).toEqual({
      despacho_id: '11111111-1111-4111-8111-111111111111',
      tipo_entrega: 'cliente_final',
      nombre_cliente: 'Ana',
      apellido_cliente: 'Pérez',
      rut_cliente: '123456785',
      entrega_estimada_at: '2026-11-16T14:00:00.000Z',
      nombre_transporte: null,
      orden_compra: null,
      rut_transporte: null,
      recibido_at: null,
      nombre_recibio: null,
    })
  })

  it('mapea transporte y limpia el nombre opcional', () => {
    const input = entregaInputSchema.parse({
      tipoEntrega: 'transporte_tercerizado',
      nombreTransporte: 'Starken',
      ordenCompra: 'OC-123',
      rutTransporte: '12.345.678-5',
      recibidoAt: '2026-11-16T11:00',
      nombreRecibio: '  Juan Pérez  ',
    })

    const result = buildEntregaInsert('11111111-1111-4111-8111-111111111111', input, AHORA)

    expect(result).toMatchObject({
      tipo_entrega: 'transporte_tercerizado',
      nombre_transporte: 'Starken',
      orden_compra: 'OC-123',
      rut_transporte: '123456785',
      recibido_at: '2026-11-16T14:00:00.000Z',
      nombre_recibio: 'Juan Pérez',
    })
    expect(result.nombre_cliente).toBeNull()
    expect(result.entrega_estimada_at).toBeNull()
  })

  it('rechaza una fecha futura antes de construir el insert', () => {
    const input = entregaInputSchema.parse({
      tipoEntrega: 'cliente_final',
      nombreCliente: 'Ana',
      apellidoCliente: 'Pérez',
      rutCliente: '12.345.678-5',
      entregaEstimadaAt: '2026-11-16T13:01',
    })

    expect(() => buildEntregaInsert('11111111-1111-4111-8111-111111111111', input, AHORA)).toThrow(
      /futuro/,
    )
  })
})
