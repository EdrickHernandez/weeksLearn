import { useQuery } from '@tanstack/react-query'
import { getGreeting } from '../functions'
import type { GreetingInput } from '../schemas'

/** Fábrica de query keys de la feature (convención: [feature, recurso, params]). */
export const exampleKeys = {
  all: ['example'] as const,
  greeting: (name: string) => [...exampleKeys.all, 'greeting', name] as const,
}

export function useGreetingQuery(input: GreetingInput) {
  return useQuery({
    queryKey: exampleKeys.greeting(input.name),
    queryFn: () => getGreeting({ data: input }),
    enabled: input.name.trim().length > 0,
  })
}
