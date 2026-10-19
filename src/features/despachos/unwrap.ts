import type { DespachoResult, ServiceError } from './schemas'

/**
 * Error tipado del cliente de datos: expone .status para que los defaults
 * de TanStack Query (createQueryClient) no reintenten errores 4xx.
 */
export class DespachoApiError extends Error {
  readonly status: ServiceError['status']
  readonly code: ServiceError['code']

  constructor(error: ServiceError) {
    super(error.message)
    this.name = 'DespachoApiError'
    this.status = error.status
    this.code = error.code
  }
}

/** Convierte el resultado tipado de las Server Functions en data o throw. */
export function unwrapDespachoResult<T>(result: DespachoResult<T>): T {
  if (result.ok) return result.data
  throw new DespachoApiError(result.error)
}
