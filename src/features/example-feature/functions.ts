import { createServerFn } from '@tanstack/react-start'
import { greetingInputSchema, greetingSchema } from './schemas'
import { buildGreeting, shoutGreeting } from './service'

export const getGreeting = createServerFn({ method: 'GET' })
  .validator(greetingInputSchema)
  .handler(({ data }) => {
    return buildGreeting(data.name)
  })

export const shoutGreetingFn = createServerFn({ method: 'POST' })
  .validator(greetingSchema)
  .handler(({ data }) => {
    return shoutGreeting(data)
  })
