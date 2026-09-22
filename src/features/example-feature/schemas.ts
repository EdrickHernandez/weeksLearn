import { z } from 'zod'

/** Entrada del caso de uso (se valida en el boundary del Server Function). */
export const greetingInputSchema = z.object({
  name: z.string().min(1, 'El nombre no puede estar vacío').max(50),
})

/** Salida del servicio: única fuente de verdad del tipo Greeting. */
export const greetingSchema = z.object({
  message: z.string(),
  shouted: z.boolean(),
  createdAt: z.iso.datetime(),
})

export type GreetingInput = z.infer<typeof greetingInputSchema>
export type Greeting = z.infer<typeof greetingSchema>
