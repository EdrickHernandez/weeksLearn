import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createDespachoFn } from '../functions'
import type { DespachoInput } from '../schemas'
import { unwrapDespachoResult } from '../unwrap'
import { despachoKeys } from '../queries/use-despachos'

export function useCreateDespachoMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: DespachoInput) =>
      createDespachoFn({ data: input }).then(unwrapDespachoResult),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: despachoKeys.lists() }),
  })
}
