import { describe, expect, it } from 'vitest'
import { fechaEntregaAISO, fechaHoraChileAISO } from './fecha-chile'

describe('fechas de entrega en Chile', () => {
  it('convierte una hora de verano chilena a UTC', () => {
    expect(fechaHoraChileAISO('2026-01-15T12:00')).toBe('2026-01-15T15:00:00.000Z')
  })

  it('convierte una hora de invierno chilena a UTC', () => {
    expect(fechaHoraChileAISO('2026-07-15T12:00')).toBe('2026-07-15T16:00:00.000Z')
  })

  it('rechaza fechas futuras contra un reloj controlado', () => {
    const ahora = new Date('2026-11-16T15:00:00.000Z')
    expect(() => fechaEntregaAISO('2026-11-16T13:01', ahora)).toThrow(/futuro/)
  })

  it('acepta una fecha pasada', () => {
    const ahora = new Date('2026-11-16T15:00:00.000Z')
    expect(fechaEntregaAISO('2026-11-16T11:00', ahora)).toBe('2026-11-16T14:00:00.000Z')
  })
})
