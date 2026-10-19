import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateDespachoFn } from '../functions'
import type { DespachoInput } from '../schemas'
import { unwrapDespachoResult } from '../unwrap'
import { despachoKeys } from '../queries/use-despachos'

export type UpdateDespachoArgs = DespachoInput & { id: string }

export function useUpdateDespachoMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateDespachoArgs) =>
      updateDespachoFn({ data: { ...input, id } }).then(unwrapDespachoResult),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: despachoKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: despachoKeys.details() })
    },
  })
}
