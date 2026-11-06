import type { SupabaseClient } from '@supabase/supabase-js'
import {
  DESPACHOS_POR_PAGINA_DEFAULT,
  type DespachoBultoValues,
  type DespachoConBultosRow,
  type DespachoInsertValues,
  type DespachoRow,
  type DespachoUpdateValues,
  type ListadoDespachosInput,
  type PaginaDespachosRow,
} from '~/features/despachos/schemas'
import {
  parseDespachoConBultos,
  parseDespachoRow,
  patronIlike,
  termQPostgrest,
} from '~/features/despachos/service'

/**
 * Acceso a datos de despachos y sus bultos (SOLO-SERVIDOR).
 * Único consumidor permitido: src/features/despachos/functions.ts.
 * Lecturas: la VISIBILIDAD de filas la gobierna la policy RLS
 * (todos los roles conocidos leen; el código no filtra por user_id).
 * Escrituras: doble cerco — RLS (admin + own-row) y filtro explícito
 * de user_id en el código (misma regla, defensa en profundidad).
 */

type Db = SupabaseClient

/** SELECT con los bultos embebidos: PostgREST resuelve la FK por el nombre.
 *  Alias "bultos_detalle" para no chocar con la columna "bultos" del despacho. */
const CON_BULTOS = '*, bultos_detalle:despacho_bultos(numero, peso_kg)'

/** Columnas que escanea el texto libre ?q= — los mismos campos del search client-side. */
const COLUMNAS_Q = [
  'transporte',
  'comuna',
  'numero_documento',
  'numero_guia',
  'contacto',
  'retirado_por',
] as const

/**
 * Listado paginado y filtrado server-side (offset + total).
 * El filtro dinámico vive aquí y solo aquí: cada entrada OPCIONAL agrega su
 * condición y PostgREST las AND-a todas. La paginación es offset ADDRESSABLE
 * (página 1-based): con el orden determinista (despachado_at desc, id desc)
 * no hay repeticiones y el índice compuesto (despachado_at desc, id desc)
 * sostiene el orden. El COUNT exacto acompaña la página para que la UI arme
 * el paginador (página X de Y).
 */
export async function listDespachos(
  db: Db,
  filtros: ListadoDespachosInput,
): Promise<PaginaDespachosRow> {
  let consulta = db
    .from('despachos')
    .select(CON_BULTOS, { count: 'exact' })
    .order('despachado_at', { ascending: false })
    .order('id', { ascending: false })

  // Texto libre: un único or-filter (una única condición OR posible desde
  // que la paginación es offset — el keyset era quien compartía ese parámetro).
  const texto = filtros.q ? termQPostgrest(filtros.q) : ''
  if (texto) {
    consulta = consulta.or(COLUMNAS_Q.map((columna) => `${columna}.ilike.*${texto}*`).join(','))
  }

  // Fronteras ya convertidas a ISO UTC por el cliente (días locales).
  if (filtros.desde) consulta = consulta.gte('despachado_at', filtros.desde)
  if (filtros.hasta) consulta = consulta.lt('despachado_at', filtros.hasta)
  if (filtros.tipoDocumento) consulta = consulta.eq('tipo_documento', filtros.tipoDocumento)
  if (filtros.transporte) consulta = consulta.ilike('transporte', patronIlike(filtros.transporte))
  if (filtros.comuna) consulta = consulta.ilike('comuna', patronIlike(filtros.comuna))

  // Página 1 → offset 0; página N → (N-1) * por página (input fresh de Zod).
  const pagina = Math.max(1, filtros.pagina ?? 1)
  const porPagina = filtros.porPagina ?? DESPACHOS_POR_PAGINA_DEFAULT
  const offset = (pagina - 1) * porPagina
  consulta = consulta.range(offset, offset + porPagina - 1)

  const { data, count, error } = await consulta
  if (error) throw new Error(`No se pudieron listar los despachos: ${error.message}`)
  return {
    despachos: (data ?? []).map(parseDespachoConBultos),
    total: count ?? 0,
  }
}

export async function getDespacho(
  db: Db,
  userId: string,
  id: string,
): Promise<DespachoConBultosRow | null> {
  const { data, error } = await db.from('despachos').select(CON_BULTOS).eq('id', id).maybeSingle()

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
