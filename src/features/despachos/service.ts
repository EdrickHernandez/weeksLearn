import comunas from './data/comunas.json'
import {
  despachoConBultosRowSchema,
  despachoRowSchema,
  type Despacho,
  type DespachoBultoValues,
  type DespachoConBultosRow,
  type DespachoFiltrosUrl,
  type DespachoInput,
  type DespachoInsertValues,
  type DespachoRow,
  type DespachoUpdateValues,
  type DespachoValues,
} from './schemas'

/**
 * Lógica de dominio PURA: sin red, sin base de datos, sin servidor.
 * Testeable de forma aislada (service.test.ts).
 */

/** Catálogo oficial de comunas de Chile (BDCUT/SUBDERE), 346 comunas. */
export const COMUNAS: readonly string[] = comunas.comunas

/** Empresas de transporte típicas: semilla del datalist cuando aún no hay historial. */
export const TRANSPORTES_BASE: readonly string[] = [
  'Starken',
  'Chilexpress',
  'Correos de Chile',
  'Bluexpress',
  'Pullman Cargo',
  'Western Cargo',
  'Andreani',
  'DTS Distribución',
  'Transportes Pacífico',
  'Cruz del Sur',
  'DHL',
  'Retiro en bodega',
]

/** Nombres de retiro frecuentes: semilla del datalist "Retirado por". */
export const RETIROS_BASE: readonly string[] = [
  'Felipe Gajardo',
  'Hector',
  'Omar Aguayo',
  'Hugo Villa',
  'Orlando Luna',
]

/** Clave de comparación: minúsculas, sin tildes, espacios colapsados ("Ñuñoa" → "nunoa"). */
function matchKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

const COMUNAS_POR_CLAVE = new Map(COMUNAS.map((comuna) => [matchKey(comuna), comuna]))

/** Conectores en minúscula (regla de títulos en español): "Correos de Chile". */
const CONECTORES = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'das', 'do', 'dos'])
/** Acrónimos cortos todo-mayúsculas se preservan (DTS, IBM, S.A.). */
const ES_ACRONIMO = /^[^\p{Ll}]{2,4}$/u

/** Capitaliza cada palabra respetando conectores y acrónimos ("correos DE chile" → "Correos de Chile"). */
export function titleCase(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((palabra, indice) => {
      const lower = palabra.toLowerCase()
      if (indice > 0 && CONECTORES.has(lower)) return lower
      if (ES_ACRONIMO.test(palabra)) return palabra
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}

export type ComunaNormalizada = {
  /** Nombre canónico del catálogo si existe; si no, el input limpio y capitalizado. */
  comuna: string
  /** Validación SOFT: false solo significa badge en UI, nunca bloquea el guardado. */
  enCatalogo: boolean
}

/**
 * Normaliza la comuna contra el catálogo: "providencia", "Providencia " y
 * "PROVIDENCIA" → "Providencia" (en catálogo); "Aisen" → "Aisen" (fuera).
 */
export function normalizeComuna(raw: string): ComunaNormalizada {
  const canonica = COMUNAS_POR_CLAVE.get(matchKey(raw))
  if (canonica) return { comuna: canonica, enCatalogo: true }
  return { comuna: titleCase(raw), enCatalogo: false }
}

/**
 * Normaliza el transporte: colapsa espacios y capitaliza cada palabra.
 * "  starken  cargex " → "Starken Cargex".
 */
export function normalizeTransporte(raw: string): string {
  return titleCase(raw)
}

/**
 * Limpia un teléfono: conserva dígitos y un único "+" inicial.
 * "(+56) 9 1234-5678" → "+56912345678". Vacío → null.
 */
export function normalizeTelefono(raw: string | undefined): string | null {
  if (raw === undefined) return null
  const soloValidos = raw.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '')
  return soloValidos.length > 0 ? soloValidos : null
}

/** Formatea un monto entero en pesos chilenos: 1234567 → "$1.234.567". */
export function formatClp(valor: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(valor)
}

/**
 * Extrae sugerencias de transporte para el datalist: únicos del historial
 * (dedupe insensible a mayúsculas/espacios, forma normalizada) + base,
 * orden alfabético español.
 */
export function extractTransporteSuggestions(
  historial: ReadonlyArray<Pick<Despacho, 'transporte'>>,
): string[] {
  const vistas = new Set<string>()
  const sugerencias: string[] = []
  const agregar = (transporte: string) => {
    const normalizado = normalizeTransporte(transporte)
    const clave = matchKey(normalizado)
    if (clave && !vistas.has(clave)) {
      vistas.add(clave)
      sugerencias.push(normalizado)
    }
  }
  for (const registro of historial) agregar(registro.transporte)
  for (const base of TRANSPORTES_BASE) agregar(base)
  return sugerencias.sort((a, b) => a.localeCompare(b, 'es'))
}

/** Fecha aceptada por el schema ("2026-09-30T14:30" o ISO) → ISO UTC. Falla si es inválida. */
function toUtcIso(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error(`Fecha de despacho inválida: ${value}`)
  return date.toISOString()
}

function optionalToNull(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/** Input ya validado por Zod → valores listos para PostgreSQL (normalizados). */
export function buildDespachoValues(input: DespachoInput): DespachoValues {
  const { comuna } = normalizeComuna(input.comuna)
  return {
    despachado_at: toUtcIso(input.despachadoAt),
    tipo_documento: input.tipoDocumento,
    numero_documento: input.numeroDocumento,
    numero_guia: input.numeroGuia,
    transporte: normalizeTransporte(input.transporte),
    comuna,
    valor_clp: input.valorClp,
    bultos: input.bultos,
    tipo_embalaje: input.tipoEmbalaje,
    direccion: optionalToNull(input.direccion),
    telefono: normalizeTelefono(input.telefono),
    contacto: optionalToNull(input.contacto),
    retirado_por: optionalToNull(input.retiradoPor),
    vehiculo: input.vehiculo ?? null,
  }
}

export function buildDespachoInsert(input: DespachoInput, userId: string): DespachoInsertValues {
  return { user_id: userId, ...buildDespachoValues(input) }
}

export function buildDespachoUpdate(input: DespachoInput): DespachoUpdateValues {
  return { ...buildDespachoValues(input), updated_at: new Date().toISOString() }
}

/**
 * Bultos listos para INSERT: el numero es la posición (1..N) y el peso viaja
 * por bulto. El despacho padre debe existir antes (la FK lo exige).
 */
export function buildDespachoBultosValues(input: DespachoInput): DespachoBultoValues[] {
  return input.pesosKg.map((peso_kg, indice) => ({ numero: indice + 1, peso_kg }))
}

/** Peso total del despacho: suma de sus bultos (se calcula al LEER, no se guarda). */
export function sumBultos(pesos: readonly number[]): number {
  return pesos.reduce((total, peso) => total + peso, 0)
}

/** Fila cruda con bultos embebidos → registro del dominio. */
export function toDespacho(row: DespachoConBultosRow): Despacho {
  const { comuna, enCatalogo } = normalizeComuna(row.comuna)
  return {
    id: row.id,
    userId: row.user_id,
    despachadoAt: new Date(row.despachado_at).toISOString(),
    tipoDocumento: row.tipo_documento,
    numeroDocumento: row.numero_documento,
    numeroGuia: row.numero_guia,
    transporte: row.transporte,
    comuna,
    comunaEnCatalogo: enCatalogo,
    valorClp: row.valor_clp,
    bultos: row.bultos,
    tipoEmbalaje: row.tipo_embalaje,
    pesosBultos: [...row.bultos_detalle]
      .sort((a, b) => a.numero - b.numero)
      .map((bulto) => Number(bulto.peso_kg)),
    direccion: row.direccion,
    telefono: row.telefono,
    contacto: row.contacto,
    retiradoPor: row.retirado_por,
    vehiculo: row.vehiculo,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }
}

/** Valida una fila cruda contra el schema (fail-fast si PostgreSQL devolviera algo inesperado). */
export function parseDespachoRow(row: unknown): DespachoRow {
  return despachoRowSchema.parse(row)
}

/** Valida la fila con bultos embebidos (listado y detalle). */
export function parseDespachoConBultos(row: unknown): DespachoConBultosRow {
  return despachoConBultosRowSchema.parse(row)
}

/* ============================================================
   FILTROS SERVER-SIDE — la psicología del dato es la misma que la
   del formulario: el estado OPCIONAL se normaliza ANTES de tocar
   la base (aquí, antes de llegar a la Server Function).
   ============================================================ */

/**
 * ¿Hay search activa? La PAGINACIÓN es un accesorio de la búsqueda:
 * sin filtros, ?pagina=N no tiene sentido (el default sin filtros es
 * siempre la jornada con lo más reciente) y la URL lo descarta antes
 * de que el estado contamine otras vistas. La firma recibe la página
 * completa a propósito: se IGNORA — pagina no es un filtro.
 */
export function hayFiltrosActivos(filtros: DespachoFiltrosUrl): boolean {
  return Boolean(
    filtros.q ||
    filtros.desde ||
    filtros.hasta ||
    filtros.tipoDocumento ||
    filtros.transporte ||
    filtros.comuna,
  )
}

/**
 * Caracteres que rompen el `or-filter` de PostgREST o son comodines
 * del `ilike` (`*` viaja como %): la q es texto libre del usuario,
 * no una query. Saneamos en vez de escapar — es búsqueda, no literal.
 */
const RESERVADOS_POSTGREST = /[\\%_*,().:"']/g

/** Texto libre usado por el `.or(...)` del repo. Vacío tras el saneo → sin filtro. */
export function termQPostgrest(q: string): string {
  return q.replace(RESERVADOS_POSTGREST, '').trim()
}

/** Patrón `ilike` de una sola columna: comodines del usuario fuera, match parcial. */
export function patronIlike(valor: string): string {
  return `%${valor.replace(/[\\%_*,().:"']/g, '').trim()}%`
}

/* ============================================================
   LAS FRONTERAS DEL DÍA — mismo criterio que la jornada: el día
   es un concepto LOCAL del navegador. La URL viaja "2026-10-01"
   y el cliente la convierte a ISO UTC ANTES de llamar al server.
   El constructor numérico local (no el parseo de strings, que
   implicaría UTC) ancla el día a la zona del usuario.
   ============================================================ */

/** "2026-10-01" → ISO UTC de la medianoche LOCAL de ese día (inclusive). */
export function inicioDiaLocalIso(fecha: string): string {
  const [anio, mes, dia] = partesFecha(fecha)
  return medianocheLocal(anio, mes, dia).toISOString()
}

/** "2026-10-01" → ISO UTC de la medianoche LOCAL del día SIGUIENTE (exclusivo). */
export function finDiaLocalIso(fecha: string): string {
  const [anio, mes, dia] = partesFecha(fecha)
  return medianocheLocal(anio, mes, dia + 1).toISOString()
}

/** Construye la medianoche local sin la regla especial del constructor para años 0–99. */
function medianocheLocal(anio: number, mes: number, dia: number): Date {
  const fecha = new Date(0)
  fecha.setFullYear(anio, mes, dia)
  fecha.setHours(0, 0, 0, 0)
  return fecha
}

/** Desglose del "YYYY-MM-DD" validado por el schema (falla si la fecha es imposible). */
function partesFecha(fecha: string): [number, number, number] {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  if (!Number.isInteger(anio) || !Number.isInteger(mes) || !Number.isInteger(dia)) {
    throw new Error(`Fecha de filtro inválida: ${fecha}`)
  }
  // La validez del día calendario se comprueba en UTC (independiente de la
  // TZ del runner); luego usamos constructor local para obtener el límite real.
  const validada = new Date(0)
  validada.setUTCFullYear(anio, mes - 1, dia)
  if (
    validada.getUTCFullYear() !== anio ||
    validada.getUTCMonth() !== mes - 1 ||
    validada.getUTCDate() !== dia
  ) {
    throw new Error(`Fecha de filtro inválida: ${fecha}`)
  }
  return [anio, mes - 1, dia]
}

/* ============================================================
   LA JORNADA — la vista del día (héroe del dashboard).
   "Hoy" es un concepto LOCAL: la comparación usa la zona del
   navegador, no UTC (las fechas viven guardadas en ISO UTC).
   ============================================================ */

/** ¿Cae `iso` en el mismo día local que `referencia`? */
export function esDelMismoDia(iso: string, referencia: Date): boolean {
  const fecha = new Date(iso)
  return (
    fecha.getFullYear() === referencia.getFullYear() &&
    fecha.getMonth() === referencia.getMonth() &&
    fecha.getDate() === referencia.getDate()
  )
}

/**
 * Los despachos de la jornada de `referencia`, del más reciente al más
 * antiguo. `referencia` viaja como parámetro: el test controla el reloj.
 * El orden compara los strings ISO directo: `toDespacho` normaliza todo a
 * `toISOString()`, y en ese formato fijo el orden lexicográfico ES el
 * cronológico.
 */
export function despachosDelDia(despachos: readonly Despacho[], referencia: Date): Despacho[] {
  return despachos
    .filter((despacho) => esDelMismoDia(despacho.despachadoAt, referencia))
    .sort((a, b) => (a.despachadoAt < b.despachadoAt ? 1 : -1))
}

/** Suma del valor de un conjunto de despachos (resumen de la jornada). */
export function sumValorClp(despachos: readonly Pick<Despacho, 'valorClp'>[]): number {
  return despachos.reduce((total, despacho) => total + despacho.valorClp, 0)
}

/** Encabezado de la jornada: "Viernes 23 de octubre de 2026" (es-CL, capitalizado). */
export function formatoFechaJornada(referencia: Date): string {
  const texto = new Intl.DateTimeFormat('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(referencia)
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}
/** Sustituto visual de un dato ausente en el Excel (negocio: legible para humanos). */
const SIN_DATO = '—'

/** Fecha/hora de una celda del Excel: "28-10-2026 14:30" (hora local, es-CL, sin AM/PM). */
export function formatoFechaHora(iso: string): string {
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

/** Una fila del Excel de jornada, lista para addRow por key (campo a campo del despacho). */
export type FilaDespacho = {
  despachadoAt: string
  documento: string
  numeroGuia: string
  transporte: string
  comuna: string
  valorClp: string
  bultos: number
  tipoEmbalaje: string
  pesosBultos: string
  direccion: string
  telefono: string
  contacto: string
  retiradoPor: string
  vehiculo: string
}

export function despachoAFila(despacho: Despacho): FilaDespacho {
  return {
    despachadoAt: formatoFechaHora(despacho.despachadoAt),
    documento: `${despacho.tipoDocumento} ${despacho.numeroDocumento}`,
    numeroGuia: despacho.numeroGuia,
    transporte: despacho.transporte,
    comuna: despacho.comuna,
    valorClp: formatClp(despacho.valorClp),
    bultos: despacho.bultos,
    tipoEmbalaje: despacho.tipoEmbalaje,
    pesosBultos: despacho.pesosBultos.join(' / '),
    direccion: despacho.direccion ?? SIN_DATO,
    telefono: despacho.telefono ?? SIN_DATO,
    contacto: despacho.contacto ?? SIN_DATO,
    retiradoPor: despacho.retiradoPor ?? SIN_DATO,
    vehiculo: despacho.vehiculo ?? SIN_DATO,
  }
}
