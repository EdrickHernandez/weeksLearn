import { useQuery } from '@tanstack/react-query'
import { listDespachosFn } from '../functions'
import { unwrapDespachoResult } from '../unwrap'

/** Fábrica de query keys de la feature (convención: [feature, recurso, params]). */
export const despachoKeys = {
  all: ['despachos'] as const,
  lists: () => [...despachoKeys.all, 'list'] as const,
  details: () => [...despachoKeys.all, 'detail'] as const,
  detail: (id: string) => [...despachoKeys.details(), id] as const,
}

/**
 * Listado de despachos del usuario (más reciente primero, lo ordena el repo).
 * El filtro de búsqueda (?q= en la URL) NO entra al query key: es filtrado
 * client-side sobre este mismo cache (MVP, volúmenes pequeños).
 */
export function useDespachosQuery() {
  return useQuery({
    queryKey: despachoKeys.lists(),
    queryFn: () => listDespachosFn().then(unwrapDespachoResult),
  })
}
