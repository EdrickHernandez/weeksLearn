import type { z } from 'zod'

/**
 * Valida variables de entorno y falla rápido con un mensaje claro
 * si falta algo o tiene un formato inválido.
 */
export function parseEnv<T>(schema: z.ZodType<T>, raw: unknown, source: string): T {
  const result = schema.safeParse(raw)
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(
      `Variables de entorno inválidas o faltantes (${source}):\n${issues}\n` +
        `Copia .env.example a .env y completa los valores.`,
    )
  }
  return result.data
}
