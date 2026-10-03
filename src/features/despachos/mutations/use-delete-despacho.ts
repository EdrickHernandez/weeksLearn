import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteDespachoFn } from '../functions'
import { unwrapDespachoResult } from '../unwrap'
import { despachoKeys } from '../queries/use-despachos'

export function useDeleteDespachoMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteDespachoFn({ data: { id } }).then(unwrapDespachoResult),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: despachoKeys.lists() }),
  })
}
