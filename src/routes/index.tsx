import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionUserFn } from '~/features/auth/functions'
import { DashboardPage } from './-dashboard'

export const Route = createFileRoute('/')({
  /** Filtro de búsqueda compartible: /?q=starken (convención de estado: URL). */
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q: typeof search.q === 'string' && search.q.trim() ? search.q.trim() : undefined,
  }),
  beforeLoad: async () => {
    // Ruta protegida: sin sesión válida, al login.
    const user = await getSessionUserFn()
    if (!user) throw redirect({ to: '/login' })
  },
  component: DashboardPage,
})
