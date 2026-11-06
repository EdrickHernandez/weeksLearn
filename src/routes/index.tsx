import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionUserFn } from '~/features/auth/functions'
import { despachoFiltrosUrlSchema, type DespachoFiltrosUrl } from '~/features/despachos/schemas'
import { hayFiltrosActivos } from '~/features/despachos/service'
import { DashboardPage } from './-dashboard'

export const Route = createFileRoute('/')({
  /**
   * Filtros de búsqueda compartibles en la URL (convención de estado Router):
   * /?q=starken&desde=2026-10-01&tipoDocumento=factura&pagina=2. El parseo es
   * Zod con preproceso (vacío → undefined). Regla de negocio: la paginación
   * SOLO existe bajo la búsqueda — sin filtros, ?pagina se descarta acá para
   * que la jornada reciba SIEMPRE la página 1 (lo más reciente) y ningún
   * param huérfano desplace su "hoy".
   */
  validateSearch: (search: Record<string, unknown>): DespachoFiltrosUrl => {
    const resultado = despachoFiltrosUrlSchema.safeParse(search)
    if (!resultado.success) return {}
    const filtros = resultado.data
    return hayFiltrosActivos(filtros) ? filtros : { ...filtros, pagina: undefined }
  },
  beforeLoad: async () => {
    // Ruta protegida: sin sesión válida, al login.
    const user = await getSessionUserFn()
    if (!user) throw redirect({ to: '/login' })
  },
  component: DashboardPage,
})
