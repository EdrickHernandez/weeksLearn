import * as React from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { DespachoFiltrosUrl, ListadoDespachosInput } from '../schemas'
import { listDespachosFn } from '../functions'
import { finDiaLocalIso, inicioDiaLocalIso } from '../service'
import { unwrapDespachoResult } from '../unwrap'

/** Fábrica de query keys de la feature (convención: [feature, recurso, params]). */
export const despachoKeys = {
  all: ['despachos'] as const,
  lists: () => [...despachoKeys.all, 'list'] as const,
  list: (filtros: DespachoFiltrosUrl) => [...despachoKeys.lists(), filtros] as const,
  details: () => [...despachoKeys.all, 'detail'] as const,
  detail: (id: string) => [...despachoKeys.details(), id] as const,
}

/** Filtros de URL → input del Server Function (fronteras de día en ISO UTC). */
function aInputListado(filtros: DespachoFiltrosUrl): ListadoDespachosInput {
  return {
    q: filtros.q,
    desde: filtros.desde ? inicioDiaLocalIso(filtros.desde) : undefined,
    hasta: filtros.hasta ? finDiaLocalIso(filtros.hasta) : undefined,
    tipoDocumento: filtros.tipoDocumento,
    transporte: filtros.transporte,
    comuna: filtros.comuna,
    pagina: filtros.pagina,
    porPagina: filtros.porPagina,
  }
}

/**
 * UNA página del listado server-side, por número addressable en la URL
 * (?pagina=N): el Router es el dueño del estado y cada página es query
 * propia en el cache (los mutations invalidan por el prefijo lists()).
 * La zona horaria de las fronteras de día se resuelve ACÁ, en el
 * navegador (el provider de Query es client-only, sin prefetch SSR: si
 * algún día se hidrata de server ese pasaje es el punto a revisar).
 */
export function useDespachosQuery(filtros: DespachoFiltrosUrl) {
  const input = React.useMemo(
    () => ({ ...aInputListado(filtros), pagina: filtros.pagina ?? 1 }),
    [filtros],
  )

  return useQuery({
    queryKey: despachoKeys.list(filtros),
    queryFn: () => listDespachosFn({ data: input }).then(unwrapDespachoResult),
    // Al cambiar ?pagina= la query es OTRA (key distinto): mostrar la página
    // vieja mientras llega la nueva evita un flash de vacío por tecla... de
    // botón. Cambia "Cargando" por transición suave.
    placeholderData: keepPreviousData,
  })
}
