import { createServerClient } from '@supabase/ssr'
import { getCookies, setCookie } from '@tanstack/react-start/server'
import { publicEnv } from '~/lib/env'
import { serverEnv } from '../env'

/**
 * Cliente Supabase del lado servidor, ligado a las cookies de la petición
 * (respeta RLS con la identidad del usuario autenticado).
 */
export function getSupabaseServerClient() {
  return createServerClient(publicEnv.VITE_SUPABASE_URL, publicEnv.VITE_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return Object.entries(getCookies()).map(([name, value]) => ({ name, value }))
      },
      setAll(cookies) {
        cookies.forEach((cookie) => {
          setCookie(cookie.name, cookie.value)
        })
      },
    },
  })
}

/**
 * Cliente admin con service role key: SOLO para operaciones de sistema
 * (webhooks, provisioning). Salta RLS — usar con extremo cuidado.
 */
export function getSupabaseAdminClient() {
  return createServerClient(publicEnv.VITE_SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    cookies: {
      getAll() {
        return []
      },
      setAll() {},
    },
  })
}
