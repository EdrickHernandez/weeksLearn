import { describe, expect, it } from 'vitest'
import { isRutValido, normalizeRut } from './rut'

describe('RUT chileno', () => {
  it('acepta formato visual y devuelve formato canónico', () => {
    expect(normalizeRut('12.345.678-5')).toBe('123456785')
    expect(normalizeRut('6-k')).toBe('6K')
  })

  it('acepta el mismo RUT sin puntos ni guion', () => {
    expect(isRutValido('123456785')).toBe(true)
  })

  it('rechaza un dígito verificador incorrecto', () => {
    expect(isRutValido('12.345.678-6')).toBe(false)
    expect(() => normalizeRut('12.345.678-6')).toThrow(/RUT inválido/)
  })

  it('rechaza caracteres o longitudes imposibles', () => {
    expect(isRutValido('ABC')).toBe(false)
    expect(isRutValido('123456789-5')).toBe(false)
  })
})
