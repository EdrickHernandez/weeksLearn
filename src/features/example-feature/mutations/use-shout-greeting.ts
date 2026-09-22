import { useMutation } from '@tanstack/react-query'
import { shoutGreetingFn } from '../functions'
import type { Greeting } from '../schemas'

export function useShoutGreetingMutation() {
  return useMutation({
    mutationFn: (greeting: Greeting) => shoutGreetingFn({ data: greeting }),
  })
}
