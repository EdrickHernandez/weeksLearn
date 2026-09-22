import { createBrowserClient } from '@supabase/ssr'
import { publicEnv } from './env'

let client: ReturnType<typeof createBrowserClient> | undefined

/**
 * Cliente Supabase del navegador (para auth en cliente, realtime, etc.).
 */
export function getSupabaseBrowserClient() {
  client ??= createBrowserClient(publicEnv.VITE_SUPABASE_URL, publicEnv.VITE_SUPABASE_ANON_KEY)
  return client
}
