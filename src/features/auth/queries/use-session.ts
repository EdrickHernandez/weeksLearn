import { useQuery } from '@tanstack/react-query'
import { getSessionUserFn } from '../functions'

/** Fábrica de query keys de auth (convención: [feature, recurso]). */
export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
}

export function useSessionQuery() {
  return useQuery({
    queryKey: authKeys.session(),
    queryFn: () => getSessionUserFn(),
    staleTime: 60_000,
  })
}
