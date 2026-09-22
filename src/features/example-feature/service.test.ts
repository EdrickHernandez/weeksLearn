import { describe, expect, it } from 'vitest'
import { buildGreeting, shoutGreeting } from './service'
import { greetingInputSchema, greetingSchema } from './schemas'

describe('buildGreeting', () => {
  it('recorta el nombre y construye un saludo válido', () => {
    const greeting = buildGreeting('  Ada  ')

    expect(greeting.message).toBe('Hola, Ada! Este saludo vino del servidor.')
    expect(greeting.message).toContain('Ada')
    expect(greeting.shouted).toBe(false)
    // createdAt es un string ISO válido (lo verifica el schema de la feature).
    expect(greetingSchema.safeParse(greeting).success).toBe(true)
  })
})

describe('shoutGreeting', () => {
  it('convierte el mensaje a mayúsculas con "!!!" y preserva createdAt', () => {
    const base = buildGreeting('Ada')
    const shouted = shoutGreeting(base)

    expect(shouted.message).toBe(`${base.message.toUpperCase()}!!!`)
    expect(shouted.message.endsWith('!!!')).toBe(true)
    expect(shouted.shouted).toBe(true)
    expect(shouted.createdAt).toBe(base.createdAt)
  })
})

describe('schemas', () => {
  it('greetingInputSchema rechaza un nombre vacío', () => {
    expect(greetingInputSchema.safeParse({ name: '' }).success).toBe(false)
  })

  it('greetingInputSchema rechaza un nombre de más de 50 caracteres', () => {
    expect(greetingInputSchema.safeParse({ name: 'a'.repeat(51) }).success).toBe(false)
    expect(greetingInputSchema.safeParse({ name: 'a'.repeat(50) }).success).toBe(true)
  })

  it('greetingSchema acepta un objeto greeting válido', () => {
    const greeting = {
      message: 'Hola, Ada!',
      shouted: false,
      createdAt: new Date().toISOString(),
    }
    expect(greetingSchema.safeParse(greeting).success).toBe(true)
  })
})
