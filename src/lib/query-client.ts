import { QueryClient } from '@tanstack/react-query'

const MAX_RETRIES = 2

/**
 * Defaults de TanStack Query para TODO el proyecto:
 * - staleTime 30s: evita refetches en cascada al montar componentes
 * - reintentos: máximo 2, nunca en errores 4xx (no se autocorrigen)
 * - mutaciones: sin reintento por defecto (seguridad de idempotencia)
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (isClientError(error)) return false
          return failureCount < MAX_RETRIES
        },
        retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 30_000),
      },
      mutations: {
        retry: false,
      },
    },
  })
}

function isClientError(error: unknown) {
  const status = (error as { status?: number } | null)?.status
  return typeof status === 'number' && status >= 400 && status < 500
}
