import type { Greeting } from './schemas'

/**
 * Lógica de dominio PURA: sin red, sin base de datos, sin servidor.
 * Testeable de forma aislada (los tests llegan en la siguiente fase).
 */
export function buildGreeting(name: string): Greeting {
  const trimmed = name.trim()
  return {
    message: `Hola, ${trimmed}! Este saludo vino del servidor.`,
    shouted: false,
    createdAt: new Date().toISOString(),
  }
}

export function shoutGreeting(greeting: Greeting): Greeting {
  return {
    ...greeting,
    message: `${greeting.message.toUpperCase()}!!!`,
    shouted: true,
  }
}
