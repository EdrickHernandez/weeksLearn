import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createEntregaFn } from '../functions'
import type { EntregaInput } from '../schemas'
import { unwrapEntregaResult } from '../unwrap'
import { despachoKeys } from '../queries/use-despachos'

type CrearEntregaInput = {
  despachoId: string
  entrega: EntregaInput
}

export function useCreateEntregaMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ despachoId, entrega }: CrearEntregaInput) =>
      createEntregaFn({ data: { despachoId, entrega } }).then(unwrapEntregaResult),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: despachoKeys.lists() }),
  })
}
