import { z } from 'zod'
import { parseEnv } from '~/lib/parse-env'

/**
 * Variables SOLO de servidor. Este módulo vive en src/server/** y jamás
 * debe importarse desde código de cliente (components/queries/mutations/routes).
 */
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

export const serverEnv = parseEnv(serverEnvSchema, process.env, 'de servidor')
