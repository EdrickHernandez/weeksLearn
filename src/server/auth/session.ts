import { getSupabaseServerClient } from '../db/supabase-server'

/**
 * Devuelve el usuario autenticado de la petición actual o null.
 * Las rutas protegidas lo usarán en beforeLoad a partir de la Semana 1.
 */
export async function getUser() {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  return data.user ?? null
}
