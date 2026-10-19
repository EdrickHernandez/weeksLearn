import { z } from 'zod'

/** Usuario autenticado expuesto a la UI (mínimo necesario). */
export const sessionUserSchema = z.object({
  id: z.uuid(),
  email: z.email().nullable(),
})

export type SessionUser = z.infer<typeof sessionUserSchema>
