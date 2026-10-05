import { z } from 'zod'

/**
 * Esquemas Zod de la feature despachos: ÚNICA fuente de verdad de tipos.
 * Espejan los constraints CHECK de la migración `crear_despachos`.
 */

/** Dominios cerrados del negocio (CHECK constraints en PostgreSQL). */
export const tipoDocumentoSchema = z.enum(['factura', 'boleta'])
export const tipoEmbalajeSchema = z.enum(['caja', 'pallet', 'alusado'])
export const vehiculoSchema = z.enum(['moto', 'furgon', 'camion', 'otro'])

export type TipoDocumento = z.infer<typeof tipoDocumentoSchema>
export type TipoEmbalaje = z.infer<typeof tipoEmbalajeSchema>
export type Vehiculo = z.infer<typeof vehiculoSchema>

/**
 * Fecha del despacho: acepta "2026-09-30T14:30" (input datetime-local)
 * o ISO 8601 completo con zona. El service normaliza SIEMPRE a ISO UTC
 * antes de persistir (el navegador convierte con su zona horaria).
 */
export const fechaDespachoSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?$/,
    'Fecha y hora del despacho inválida',
  )

/** Objeto base SIN refinar: el update necesita .extend() y superRefine lo bloquea. */
const despachoInputBase = z.object({
  despachadoAt: fechaDespachoSchema,
  tipoDocumento: tipoDocumentoSchema,
  numeroDocumento: z.string().trim().min(1, 'El número de documento es obligatorio').max(50),
  numeroGuia: z.string().trim().min(1, 'El número de guía es obligatorio').max(50),
  transporte: z.string().trim().min(1, 'El transporte es obligatorio').max(80),
  comuna: z.string().trim().min(1, 'La comuna es obligatoria').max(60),
  valorClp: z
    .number()
    .int('El valor debe ser un entero (CLP no usa decimales)')
    .positive('El valor debe ser mayor a 0')
    .max(1_000_000_000, 'El valor excede el máximo permitido'),
  bultos: z.number().int().min(1, 'Un despacho debe tener al menos 1 bulto').max(10_000),
  tipoEmbalaje: tipoEmbalajeSchema,
  pesosKg: z
    .array(z.number().min(0, 'El peso no puede ser negativo').max(50_000))
    .min(1, 'Registra el peso de al menos un bulto'),
  direccion: z.string().trim().max(200).optional(),
  telefono: z.string().trim().max(30).optional(),
  contacto: z.string().trim().max(120).optional(),
  retiradoPor: z.string().trim().max(120).optional(),
  vehiculo: vehiculoSchema.optional(),
})

/**
 * Regla de negocio: la cantidad de pesos debe igualar a los bultos, y solo
 * un pallet puede tener bultos de 0 kg; una caja, no.
 * Validación CRUZADA (tipoEmbalaje + bultos + pesosKg) → superRefine.
 */
function validarBultosSegunEmbalaje(
  data: { tipoEmbalaje: TipoEmbalaje; bultos: number; pesosKg: number[] },
  ctx: z.RefinementCtx,
) {
  if (data.pesosKg.length !== data.bultos) {
    ctx.addIssue({
      code: 'custom',
      path: ['bultos'],
      message: `Hay ${data.bultos} bultos pero ${data.pesosKg.length} pesos registrados`,
    })
  }

  data.pesosKg.forEach((peso, indice) => {
    // Solo el pallet puede pesar 0 kg; caja y alusado, no.
    if (data.tipoEmbalaje !== 'pallet' && peso <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['pesosKg', indice],
        message: `Un bulto de tipo ${data.tipoEmbalaje} debe pesar más de 0 kg (solo un pallet puede pesar 0)`,
      })
    }
  })
}

export const despachoInputSchema = despachoInputBase.superRefine(validarBultosSegunEmbalaje)

export const createDespachoInputSchema = despachoInputSchema

export const updateDespachoInputSchema = despachoInputBase
  .extend({ id: z.uuid('Id de despacho inválido') })
  .superRefine(validarBultosSegunEmbalaje)

export const despachoIdSchema = z.object({
  id: z.uuid('Id de despacho inválido'),
})

export type DespachoInput = z.infer<typeof despachoInputSchema>

/** Fila cruda de PostgreSQL (snake_case). `peso_kg` llega como string (numeric). */
export const despachoRowSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  despachado_at: z.string(),
  tipo_documento: tipoDocumentoSchema,
  numero_documento: z.string(),
  numero_guia: z.string(),
  transporte: z.string(),
  comuna: z.string(),
  valor_clp: z.number(),
  bultos: z.number(),
  tipo_embalaje: tipoEmbalajeSchema,
  direccion: z.string().nullable(),
  telefono: z.string().nullable(),
  contacto: z.string().nullable(),
  retirado_por: z.string().nullable(),
  vehiculo: vehiculoSchema.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type DespachoRow = z.infer<typeof despachoRowSchema>

/** Fila con los bultos embebidos (SELECT con join de PostgREST). */
export const despachoConBultosRowSchema = despachoRowSchema.extend({
  bultos_detalle: z.array(
    z.object({
      numero: z.number(),
      peso_kg: z.union([z.string(), z.number()]),
    }),
  ),
})

export type DespachoConBultosRow = z.infer<typeof despachoConBultosRowSchema>

/**
 * Registro del dominio que consume la UI (camelCase, fechas ISO UTC).
 * `comunaEnCatalogo` es la validación soft contra comunas.json (badge en UI).
 */
export const despachoSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  despachadoAt: z.iso.datetime(),
  tipoDocumento: tipoDocumentoSchema,
  numeroDocumento: z.string(),
  numeroGuia: z.string(),
  transporte: z.string(),
  comuna: z.string(),
  comunaEnCatalogo: z.boolean(),
  valorClp: z.number().int().positive(),
  bultos: z.number().int().min(0),
  tipoEmbalaje: tipoEmbalajeSchema,
  pesosBultos: z.array(z.number().min(0)),
  direccion: z.string().nullable(),
  telefono: z.string().nullable(),
  contacto: z.string().nullable(),
  retiradoPor: z.string().nullable(),
  vehiculo: vehiculoSchema.nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export type Despacho = z.infer<typeof despachoSchema>

/** Valores listos para PostgreSQL (snake_case, fechas ISO UTC). */
export type DespachoValues = {
  despachado_at: string
  tipo_documento: TipoDocumento
  numero_documento: string
  numero_guia: string
  transporte: string
  comuna: string
  valor_clp: number
  bultos: number
  tipo_embalaje: TipoEmbalaje
  direccion: string | null
  telefono: string | null
  contacto: string | null
  retirado_por: string | null
  vehiculo: Vehiculo | null
}

export type DespachoInsertValues = DespachoValues & { user_id: string }
export type DespachoUpdateValues = DespachoValues & { updated_at: string }

/** Fila de bulto lista para INSERT en despacho_bultos. */
export type DespachoBultoValues = { numero: number; peso_kg: number }

/** Contrato de error tipado de las Server Functions (el hook lo convierte a throw con .status). */
export const serviceErrorSchema = z.object({
  code: z.enum(['unauthorized', 'not_found', 'db_error']),
  message: z.string(),
  status: z.union([z.literal(401), z.literal(404), z.literal(500)]),
})

export type ServiceError = z.infer<typeof serviceErrorSchema>

export type DespachoResult<T> = { ok: true; data: T } | { ok: false; error: ServiceError }
