import { describe, expect, it } from 'vitest'
import { parseEnv } from './parse-env'
import { publicEnvSchema } from './env'

const validEnv = {
  VITE_SUPABASE_URL: 'https://test-project.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'test-anon-key',
}

describe('publicEnvSchema', () => {
  it('acepta valores válidos', () => {
    const result = publicEnvSchema.safeParse(validEnv)
    expect(result.success).toBe(true)
  })

  it('rechaza una VITE_SUPABASE_URL inválida (no es URL)', () => {
    const result = publicEnvSchema.safeParse({
      ...validEnv,
      VITE_SUPABASE_URL: 'no-es-una-url',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza una VITE_SUPABASE_URL faltante', () => {
    const result = publicEnvSchema.safeParse({ VITE_SUPABASE_ANON_KEY: 'test-anon-key' })
    expect(result.success).toBe(false)
  })

  it('rechaza una VITE_SUPABASE_ANON_KEY vacía', () => {
    const result = publicEnvSchema.safeParse({ ...validEnv, VITE_SUPABASE_ANON_KEY: '' })
    expect(result.success).toBe(false)
  })
})

describe('parseEnv', () => {
  it('lanza un error que menciona "Variables de entorno" y la variable culpable', () => {
    expect(() =>
      parseEnv(publicEnvSchema, { VITE_SUPABASE_ANON_KEY: 'test-anon-key' }, 'públicas de test'),
    ).toThrowError(/Variables de entorno/)
    expect(() =>
      parseEnv(publicEnvSchema, { VITE_SUPABASE_ANON_KEY: 'test-anon-key' }, 'públicas de test'),
    ).toThrowError(/VITE_SUPABASE_URL/)
  })

  it('devuelve los datos parseados cuando todo es válido', () => {
    const parsed = parseEnv(publicEnvSchema, validEnv, 'públicas de test')
    expect(parsed).toEqual(validEnv)
  })
})
