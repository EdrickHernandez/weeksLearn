import { z } from 'zod'

/**
 * Esquemas Zod de la feature despachos: ÚNICA fuente de verdad de tipos.
 * Espejan los constraints CHECK de la migración `crear_despachos`.
 */

/** Dominios cerrados del negocio (CHECK constraints en PostgreSQL). */
export const tipoDocumentoSchema = z.enum(['factura', 'boleta'])
export const tipoEmbalajeSchema = z.enum(['caja', 'pallet', 'alusado'])
export const vehiculoSchema = z.enum(['moto', 'furgon', 'camion', 'camioneta', 'otro'])
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
 * Regla de negocio: la cantidad de pesos debe igualar a los bultos.
 * Peso 0 está permitido para CUALQUIER embalaje: significa "sin pesar"
 * (convención del historial real del negocio desde 2020). Los negativos
 * los rechaza el propio elemento del array (min(0)).
 */
function validarBultos(data: { bultos: number; pesosKg: number[] }, ctx: z.RefinementCtx) {
  if (data.pesosKg.length !== data.bultos) {
    ctx.addIssue({
      code: 'custom',
      path: ['bultos'],
      message: `Hay ${data.bultos} bultos pero ${data.pesosKg.length} pesos registrados`,
    })
  }
}

export const despachoInputSchema = despachoInputBase.superRefine(validarBultos)

export const createDespachoInputSchema = despachoInputSchema

export const updateDespachoInputSchema = despachoInputBase
  .extend({ id: z.uuid('Id de despacho inválido') })
  .superRefine(validarBultos)

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

/**
 * Tamaño de página DEFAULT del listado server-side. El operador puede
 * ampliarlo hasta 200 desde el panel (?porPagina=N): valores verificados
 * (los permitidos viajan en la URL), nunca arbitrarios.
 */
export const DESPACHOS_POR_PAGINA_DEFAULT = 50

/** Tope duro de página: una URL forjada no baila el server por media hora. */
const MAX_PAGINA = 500

/** Opciones legítimas del selector "Mostrar" del panel de filtros. */
const OPCIONES_POR_PAGINA: readonly number[] = [50, 100, 150, 200]

/**
 * Filtros del historial que viven en la URL (?q=&desde=&hasta=&pagina=).
 * Las fechas viajan como día calendario (YYYY-MM-DD, input date): el límite
 * horario lo resuelve el NAVEGADOR en su zona local (mismo criterio de la
 * jornada), nunca el servidor.
 */
const filtroTextoUrl = (max: number) =>
  z.preprocess(
    (valor) => (typeof valor !== 'string' ? undefined : valor.trim() || undefined),
    z.string().max(max, `El filtro admite hasta ${max} caracteres`).optional(),
  )

const filtroFechaUrl = z.preprocess(
  (valor) => (typeof valor !== 'string' ? undefined : valor || undefined),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha del filtro inválida')
    .refine((valor) => {
      const [anio, mes, dia] = valor.split('-').map(Number)
      // Validación de calendario en UTC: no depende de la TZ del servidor
      // (el instante local se calcula después en el navegador).
      const fecha = new Date(0)
      fecha.setUTCFullYear(anio, mes - 1, dia)
      return (
        fecha.getUTCFullYear() === anio &&
        fecha.getUTCMonth() === mes - 1 &&
        fecha.getUTCDate() === dia
      )
    }, 'Fecha del filtro inválida')
    .optional(),
)

/**
 * La URL solo lleva strings: "3" → 3. Todo lo demás (vacío, "0", "abc",
 * "501") se descarga a undefined con .catch() — la pagina es estado de
 * NAVEGACIÓN, no semántica: basura en la página borra la página, nunca
 * los filtros que acompañan (que son semántica y sí merecen fallar).
 */
export const filtroPaginaUrl = z.preprocess(
  (valor) => (typeof valor !== 'string' && typeof valor !== 'number' ? undefined : valor),
  z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGINA, `Sin páginas más allá de ${MAX_PAGINA}`)
    .optional()
    .catch(undefined),
)

/** Solo los valores del selector "Mostrar" son legítimos: basura → default (50). */
export const filtroPorPaginaUrl = z.preprocess(
  (valor) => (typeof valor !== 'string' && typeof valor !== 'number' ? undefined : valor),
  z.coerce
    .number()
    .refine((n) => OPCIONES_POR_PAGINA.includes(n), 'Por página inválido')
    .optional()
    .catch(undefined),
)

export const despachoFiltrosUrlSchema = z.object({
  q: filtroTextoUrl(120),
  desde: filtroFechaUrl,
  hasta: filtroFechaUrl,
  tipoDocumento: tipoDocumentoSchema.optional(),
  transporte: filtroTextoUrl(80),
  comuna: filtroTextoUrl(60),
  pagina: filtroPaginaUrl,
  porPagina: filtroPorPaginaUrl,
})

export type DespachoFiltrosUrl = z.infer<typeof despachoFiltrosUrlSchema>

/** Página server-side cruda (filas con bultos embebidos + COUNT total). */
export const paginaDespachosRowSchema = z.object({
  despachos: z.array(despachoConBultosRowSchema),
  /** Total de filas que cumplen los filtros (COUNT exacto de PostgREST). */
  total: z.number().int().min(0),
})

export type PaginaDespachosRow = z.infer<typeof paginaDespachosRowSchema>

/** Página del dominio que consume la UI (camelCase, fechas ISO UTC). */
export const paginaDespachosSchema = z.object({
  despachos: z.array(despachoSchema),
  /** Total de filas que cumplen los filtros (COUNT de PostgREST). */
  total: z.number().int().min(0),
})

export type PaginaDespachos = z.infer<typeof paginaDespachosSchema>

/** Filtros YA convertidos a fronteras ISO UTC + página (input del Server Function). */
export const listadoDespachosInputSchema = z.object({
  q: z.string().trim().max(120).optional(),
  /** Límite inferior INCLUSIVO (inicio del día local en ISO UTC). */
  desde: z.iso.datetime().optional(),
  /** Límite superior EXCLUSIVO (inicio del día siguiente local en ISO UTC). */
  hasta: z.iso.datetime().optional(),
  tipoDocumento: tipoDocumentoSchema.optional(),
  transporte: z.string().trim().max(80).optional(),
  comuna: z.string().trim().max(60).optional(),
  /** Página 1-based (la URL la valida con filtroPaginaUrl; el server la revalida). */
  pagina: filtroPaginaUrl,
  /** Tamaño de página del selector "Mostrar" (50/100/150/200, default 50). */
  porPagina: filtroPorPaginaUrl,
})

export type ListadoDespachosInput = z.infer<typeof listadoDespachosInputSchema>
