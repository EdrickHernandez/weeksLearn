import { z } from 'zod'
import { parseEnv } from './parse-env'

/**
 * Variables PÚBLICAS: seguras para el navegador (prefijo VITE_).
 * Nunca pongas aquí secretos ni service role keys.
 */
export const publicEnvSchema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
})

export type PublicEnv = z.infer<typeof publicEnvSchema>

export const publicEnv = parseEnv(
  publicEnvSchema,
  {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },
  'públicas (prefijo VITE_)',
)
