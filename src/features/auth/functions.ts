import { createServerFn } from '@tanstack/react-start'
import { getUser } from '~/server/auth/session'
import { getSupabaseServerClient } from '~/server/db/supabase-server'
import { sessionUserSchema, type SessionUser } from './schemas'

/**
 * Server Functions de autenticación: ÚNICO puente hacia src/server/**.
 * El login usa el cliente del navegador (@supabase/ssr guarda la sesión en
 * cookies); el logout se hace en el servidor para revocar el token y limpiar
 * las cookies del request.
 */

/** Sesión del request actual (leída de cookies en el servidor) o null. */
export const getSessionUserFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SessionUser | null> => {
    const user = await getUser()
    if (!user) return null
    return sessionUserSchema.parse({ id: user.id, email: user.email })
  },
)

/** Cierra la sesión del request actual: revoca el token y limpia las cookies. */
export const signOutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  await supabase.auth.signOut()
  return { ok: true as const }
})
