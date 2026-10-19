import { createServerFn } from '@tanstack/react-start'
import { getUser } from '~/server/auth/session'
import { getSupabaseServerClient } from '~/server/db/supabase-server'
import * as repo from '~/server/services/despachos'
import {
  createDespachoInputSchema,
  despachoIdSchema,
  updateDespachoInputSchema,
  type Despacho,
  type DespachoResult,
  type ServiceError,
} from './schemas'
import {
  buildDespachoBultosValues,
  buildDespachoInsert,
  buildDespachoUpdate,
  toDespacho,
} from './service'

/**
 * Server Functions de despachos: ÚNICO puente hacia src/server/**.
 * Cada entrada se valida con Zod (.validator) y cada handler verifica la
 * sesión (getUser). Respuesta tipada: DespachoResult<T> en vez de throws,
 * para que los hooks de TanStack Query puedan distinguir 401/404/500.
 */

function unauthorized(): { ok: false; error: ServiceError } {
  return {
    ok: false,
    error: { code: 'unauthorized', message: 'Sesión no válida o expirada.', status: 401 },
  }
}

function notFound(): { ok: false; error: ServiceError } {
  return {
    ok: false,
    error: { code: 'not_found', message: 'El despacho no existe o no te pertenece.', status: 404 },
  }
}

/** Mensaje completo y legible por operación: nada de componer frases. */
function dbError(mensaje: string): { ok: false; error: ServiceError } {
  return {
    ok: false,
    error: { code: 'db_error', message: mensaje, status: 500 },
  }
}

export const listDespachosFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<DespachoResult<Despacho[]>> => {
    const user = await getUser()
    if (!user) return unauthorized()

    try {
      const db = getSupabaseServerClient()
      const rows = await repo.listDespachos(db, user.id)
      return { ok: true, data: rows.map(toDespacho) }
    } catch (error) {
      console.error('[despachos] list falló:', error)
      return dbError('No se pudieron cargar los despachos. Intenta de nuevo.')
    }
  },
)

export const getDespachoFn = createServerFn({ method: 'GET' })
  .validator(despachoIdSchema)
  .handler(async ({ data }): Promise<DespachoResult<Despacho>> => {
    const user = await getUser()
    if (!user) return unauthorized()

    try {
      const db = getSupabaseServerClient()
      const row = await repo.getDespacho(db, user.id, data.id)
      if (!row) return notFound()
      return { ok: true, data: toDespacho(row) }
    } catch (error) {
      console.error('[despachos] get falló:', error)
      return dbError('No se pudo obtener el despacho. Intenta de nuevo.')
    }
  })

export const createDespachoFn = createServerFn({ method: 'POST' })
  .validator(createDespachoInputSchema)
  .handler(async ({ data }): Promise<DespachoResult<Despacho>> => {
    const user = await getUser()
    if (!user) return unauthorized()

    try {
      const db = getSupabaseServerClient()
      // 1) el padre debe existir primero (la FK de bultos lo exige),
      // 2) luego sus bultos, 3) se relee completo para responder tipado.
      // Nota: son 3 llamadas REST sin transacción — si el paso 2 fallara,
      // quedaría un despacho sin bultos, editable para recuperarlo. MVP OK.
      const row = await repo.insertDespacho(db, user.id, buildDespachoInsert(data, user.id))
      await repo.insertBultos(db, row.id, buildDespachoBultosValues(data))
      const completo = await repo.getDespacho(db, user.id, row.id)
      if (!completo) return dbError('No se pudo confirmar el despacho creado. Intenta de nuevo.')
      return { ok: true, data: toDespacho(completo) }
    } catch (error) {
      console.error('[despachos] create falló:', error)
      return dbError('No se pudo crear el despacho. Intenta de nuevo.')
    }
  })

export const updateDespachoFn = createServerFn({ method: 'POST' })
  .validator(updateDespachoInputSchema)
  .handler(async ({ data }): Promise<DespachoResult<Despacho>> => {
    const user = await getUser()
    if (!user) return unauthorized()

    try {
      const db = getSupabaseServerClient()
      const { id, ...input } = data
      const row = await repo.updateDespacho(db, user.id, id, buildDespachoUpdate(input))
      if (!row) return notFound()
      // Reemplazo completo de bultos: borrar los viejos e insertar los nuevos
      // (estrategia simple y correcta; el diff fino no vale su complejidad).
      await repo.deleteBultos(db, id)
      await repo.insertBultos(db, id, buildDespachoBultosValues(input))
      const completo = await repo.getDespacho(db, user.id, id)
      if (!completo)
        return dbError('No se pudo confirmar el despacho actualizado. Intenta de nuevo.')
      return { ok: true, data: toDespacho(completo) }
    } catch (error) {
      console.error('[despachos] update falló:', error)
      return dbError('No se pudo actualizar el despacho. Intenta de nuevo.')
    }
  })

export const deleteDespachoFn = createServerFn({ method: 'POST' })
  .validator(despachoIdSchema)
  .handler(async ({ data }): Promise<DespachoResult<{ id: string }>> => {
    const user = await getUser()
    if (!user) return unauthorized()

    try {
      const db = getSupabaseServerClient()
      const eliminado = await repo.deleteDespacho(db, user.id, data.id)
      if (!eliminado) return notFound()
      return { ok: true, data: { id: data.id } }
    } catch (error) {
      console.error('[despachos] delete falló:', error)
      return dbError('No se pudo eliminar el despacho. Intenta de nuevo.')
    }
  })
