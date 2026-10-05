import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  DespachoBultoValues,
  DespachoConBultosRow,
  DespachoInsertValues,
  DespachoRow,
  DespachoUpdateValues,
} from '~/features/despachos/schemas'
import { parseDespachoConBultos, parseDespachoRow } from '~/features/despachos/service'

/**
 * Acceso a datos de despachos y sus bultos (SOLO-SERVIDOR).
 * Único consumidor permitido: src/features/despachos/functions.ts.
 * Toda consulta de despachos filtra por user_id explícito (defensa en
 * profundidad además de RLS); en despacho_bultos la autorización la hace
 * la política EXISTS contra el padre (la tabla hija no tiene user_id).
 */

type Db = SupabaseClient

/** SELECT con los bultos embebidos: PostgREST resuelve la FK por el nombre.
 *  Alias "bultos_detalle" para no chocar con la columna "bultos" del despacho. */
const CON_BULTOS = '*, bultos_detalle:despacho_bultos(numero, peso_kg)'

export async function listDespachos(db: Db, userId: string): Promise<DespachoConBultosRow[]> {
  const { data, error } = await db
    .from('despachos')
    .select(CON_BULTOS)
    .eq('user_id', userId)
    .order('despachado_at', { ascending: false })

  if (error) throw new Error(`No se pudieron listar los despachos: ${error.message}`)
  return (data ?? []).map(parseDespachoConBultos)
}

export async function getDespacho(
  db: Db,
  userId: string,
  id: string,
): Promise<DespachoConBultosRow | null> {
  const { data, error } = await db
    .from('despachos')
    .select(CON_BULTOS)
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(`No se pudo obtener el despacho: ${error.message}`)
  return data ? parseDespachoConBultos(data) : null
}

export async function insertDespacho(
  db: Db,
  userId: string,
  values: DespachoInsertValues,
): Promise<DespachoRow> {
  const { data, error } = await db.from('despachos').insert(values).select('*').single()

  if (error) throw new Error(`No se pudo crear el despacho: ${error.message}`)
  return parseDespachoRow(data)
}

export async function insertBultos(
  db: Db,
  despachoId: string,
  bultos: DespachoBultoValues[],
): Promise<void> {
  if (bultos.length === 0) return

  const filas = bultos.map((bulto) => ({ ...bulto, despacho_id: despachoId }))
  const { error } = await db.from('despacho_bultos').insert(filas)

  if (error) throw new Error(`No se pudieron registrar los bultos: ${error.message}`)
}

export async function deleteBultos(db: Db, despachoId: string): Promise<void> {
  const { error } = await db.from('despacho_bultos').delete().eq('despacho_id', despachoId)

  if (error) throw new Error(`No se pudieron eliminar los bultos anteriores: ${error.message}`)
}

export async function updateDespacho(
  db: Db,
  userId: string,
  id: string,
  values: DespachoUpdateValues,
): Promise<DespachoRow | null> {
  const { data, error } = await db
    .from('despachos')
    .update(values)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle()

  if (error) throw new Error(`No se pudo actualizar el despacho: ${error.message}`)
  return data ? parseDespachoRow(data) : null
}

export async function deleteDespacho(db: Db, userId: string, id: string): Promise<boolean> {
  const { data, error } = await db
    .from('despachos')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle()

  if (error) throw new Error(`No se pudo eliminar el despacho: ${error.message}`)
  return data !== null
}
