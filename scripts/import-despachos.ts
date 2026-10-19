/**
 * Importador CSV → Supabase (tracker de despachos).
 *
 * Pipeline: CSV crudo → mapeo → validación con el MISMO despachoInputSchema
 * de la feature → normalización con el MISMO service (comuna canónica,
 * transporte en TitleCase) → inserción vía service role.
 *
 * Modo por defecto: DRY-RUN (valida y reporta; no escribe nada).
 * Modo real: --insert (y --force si el usuario ya tiene despachos, para
 * evitar duplicar un lote por accidente — idempotencia básica).
 *
 * Uso (ver script `import:despachos` en package.json):
 *   pnpm tsx --env-file=.env scripts/import-despachos.ts \
 *     --file ~/datos/despachos.csv \
 *     --user-id <uuid-del-dueño>            [--insert] [--force]
 *
 * NOTA IMPORTANTE: el CSV contiene datos de negocio — nunca se commitea
 * (*.csv está en .gitignore; mantenlo fuera del repo).
 */
import { readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { parse as csvParse } from 'csv-parse/sync'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import * as repo from '../src/server/services/despachos'
import {
  COMUNAS,
  buildDespachoBultosValues,
  buildDespachoInsert,
  normalizeTransporte,
} from '../src/features/despachos/service'
import {
  createDespachoInputSchema,
  type DespachoInput,
  type Vehiculo,
} from '../src/features/despachos/schemas'

/* ------------------------------------------------------------------ */
/* 1. CLI args                                                         */
/* ------------------------------------------------------------------ */

const { values: args } = parseArgs({
  options: {
    file: { type: 'string' },
    'user-id': { type: 'string' },
    insert: { type: 'boolean', default: false },
    force: { type: 'boolean', default: false },
  },
})

function fail(mensaje: string): never {
  console.error(`❌ ${mensaje}`)
  process.exit(1)
}

if (!args.file) fail('Falta --file <ruta-del-csv>')
const userId = args['user-id']
if (!userId || !z.uuid().safeParse(userId).success) {
  fail('Falta --user-id <uuid> (búscalo con: select id, email from profiles;)')
}

/* ------------------------------------------------------------------ */
/* 2. ENV fail-fast (service role = canal de sistema, bypass de RLS)   */
/* ------------------------------------------------------------------ */

const envSchema = z.object({
  VITE_SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
})

const env = envSchema.parse({
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
})

if (!args.insert) {
  console.log('🧪 MODO DRY-RUN: valida y reporta, NO escribe nada. (--insert para insertar)\n')
}

/* ------------------------------------------------------------------ */
/* 3. CSV: parseo + helpers de normalización de la fuente             */
/* ------------------------------------------------------------------ */

const crudo = readFileSync(args.file, 'utf8').replace(/^\uFEFF/, '') // BOM de Excel
const primeraLinea = crudo.slice(0, crudo.indexOf('\n'))
const delimitador =
  (primeraLinea.match(/;/g)?.length ?? 0) > (primeraLinea.match(/,/g)?.length ?? 0) ? ';' : ','
const filas = csvParse(crudo, {
  columns: true,
  delimiter: delimitador,
  skipEmptyLines: true,
  trim: true,
}) as Array<Record<string, string>>

/** Clave de comparación: minúsculas, sin tildes, espacios colapsados. */
function matchKey(valor: string): string {
  return valor
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Fecha del CSV "(05-05-20)  16:10", "(01-09-2026) 12:30" — con o sin espacio antes de la hora, año de 2 o 4 dígitos → ISO UTC. */
function parsearFecha(celda: string): string | null {
  const match = celda.match(/^\(?\s*(\d{1,2})-(\d{1,2})-(\d{2}|\d{4})\)?\s*(\d{1,2}):(\d{2})\s*$/)
  if (!match) return null
  const dia = Number(match[1])
  const mes = Number(match[2])
  const añoRaw = match[3]
  const hh = Number(match[4])
  const mm = Number(match[5])
  const año = añoRaw.length === 4 ? Number(añoRaw) : 2000 + Number(añoRaw)
  const fecha = new Date(año, mes - 1, dia, hh, mm) // hora local del corredor (Chile)
  if (
    Number.isNaN(fecha.getTime()) ||
    mes < 1 ||
    mes > 12 ||
    dia < 1 ||
    dia > 31 ||
    año < 2000 ||
    año > new Date().getFullYear()
  ) {
    return null
  }
  return fecha.toISOString()
}

/**
 * Splitea la celda "comuna_transporte": comuna por match de prefijo contra
 * el catálogo oficial (sin tildes, tolerante a espacios múltiples) y lo
 * restante es transporte.
 *
 * Orden soportado: comuna primero ("San Bernardo - Starken"), con fallback
 * al orden invertido ("Starken San Bernardo"). Sin match de comuna → la
 * celda completa es transporte y la comuna toma el sentinel "Sin comuna":
 * son los despachos entregados directo por courier (decisión de producto:
 * preservar el historial; el badge ⚠ de la tabla los distingue en UI).
 */
const COMUNA_SIN_DATO = 'Sin comuna'
const COMUNAS_ORDEN = [...COMUNAS].sort((a, b) => b.length - a.length)

function splitearComunaTransporte(celda: string): { comuna: string; transporte: string } {
  const clave = matchKey(celda)
  for (const comuna of COMUNAS_ORDEN) {
    const claveComuna = matchKey(comuna)
    if (claveComuna.length === 0) continue
    if (clave.startsWith(claveComuna)) {
      const resto = celda.slice(claveComuna.length)
      return { comuna, transporte: normalizeTransporte(resto.replace(/^[-/,.\s]+/, ' ')) }
    }
    if (clave.endsWith(claveComuna)) {
      const resto = celda.slice(0, clave.length - claveComuna.length)
      return { comuna, transporte: normalizeTransporte(resto.replace(/[-/,.\s]+$/, ' ')) }
    }
  }
  return { comuna: COMUNA_SIN_DATO, transporte: normalizeTransporte(celda) }
}

/** Traduce vehículos del CSV al enum ("Camión"→camion, desconocidos→otro). */
const MAPA_VEHICULO: Record<string, Vehiculo> = {
  moto: 'moto',
  camion: 'camion',
  camioneta: 'camioneta',
  furgon: 'furgon',
  furgoneta: 'furgon',
}
const vehiculosDesconocidos = new Set<string>()
/** Embalajes con contenido que el mapa no entendió (top 5 en reporte). */
/** Formatos de fecha con contenido que el parser no entendió (p/c arreglar el parser). */
const fechasNoParseadas = new Map<string, number>()
let bultosPorDefecto = 0

function mapVehicle(celda: string): Vehiculo | null {
  if (!celda || !celda.trim()) return null
  const clave = matchKey(celda)
  const mapeado = MAPA_VEHICULO[clave]
  if (!mapeado) {
    vehiculosDesconocidos.add(celda)
    return 'otro'
  }
  return mapeado
}

/**
 * Decisión de producto: embalaje vacío o desconocido → "caja" por defecto
 * (dominante en el negocio; variantes "Cajon"/"Cajas"/"Bultos" también
 * normalizan ahí). Tally en el reporte para que nada sea silencioso.
 */
const embalajesReasignados = new Map<string, number>()
let embalajesPorDefecto = 0

function mapEmbalaje(celda: string): string {
  if (!celda || !celda.trim()) {
    embalajesPorDefecto++
    return 'caja'
  }
  const clave = matchKey(celda)
  if (clave === 'caja' || clave === 'carton') return 'caja'
  if (clave === 'pallet') return 'pallet'
  if (clave === 'alusado' || clave === 'bulto') return 'alusado'
  const original = celda.trim()
  embalajesReasignados.set(original, (embalajesReasignados.get(original) ?? 0) + 1)
  return 'caja'
}

type FilaProcesada = {
  fila: number
  input: DespachoInput | null
  motivos: string[]
}

/* ------------------------------------------------------------------ */
/* 4. Mapeo fila cruda → DespachoInput (+ reporte de problemas)        */
/* ------------------------------------------------------------------ */

const procesadas: FilaProcesada[] = filas.map((columnas, indice) => {
  const numeroFila = indice + 2 // header ocupa la fila 1 del CSV
  const motivos: string[] = []

  const despachadoAtCelda = columnas['fecha_hora'] ?? ''
  const despachadoAt = parsearFecha(despachadoAtCelda)
  if (!despachadoAt) {
    motivos.push(`fecha_hora no parseable: "${despachadoAtCelda}"`)
    if (despachadoAtCelda.trim()) {
      // Con contenido pero formato desconocido: candidato a rescate via parser fix.
      fechasNoParseadas.set(
        despachadoAtCelda.trim(),
        (fechasNoParseadas.get(despachadoAtCelda.trim()) ?? 0) + 1,
      )
    }
  }

  const split = splitearComunaTransporte(columnas['comuna_transporte'] ?? '')

  const valorRaw = (columnas['valor'] ?? '').replace(/\s/g, '')
  const valor = Math.round(Number(valorRaw.replace('.', '').replace(',', '.')))
  if (!Number.isFinite(valor) || valor <= 0) motivos.push(`valor inválido: "${columnas['valor']}"`)

  // bulto: en el historial consolidado es irrelevante (siempre 1 bulto con el
  // peso total). Vacío o inválido → default 1, con tally en el reporte.
  const bultosRaw = String(columnas['bulto'] ?? '').trim()
  const bultosCsv = Number(bultosRaw)
  if (!Number.isInteger(bultosCsv) || bultosCsv < 1) bultosPorDefecto++

  const peso = Number(columnas['peso'] ?? '')
  if (!Number.isFinite(peso) || peso < 0) motivos.push(`peso inválido: "${columnas['peso']}"`)

  const tipoCelda = columnas['tipo'] ?? ''
  const embalaje = mapEmbalaje(tipoCelda)

  let input: DespachoInput | null = null
  if (motivos.length === 0 && despachadoAt) {
    const candidato: DespachoInput = {
      despachadoAt,
      tipoDocumento: 'factura',
      numeroDocumento: String(columnas['factura'] ?? '').trim(),
      numeroGuia: String(columnas['guia'] ?? '').trim(),
      transporte: split.transporte || '(sin especificar)',
      comuna: split.comuna,
      valorClp: valor,
      // Consolidación completa: el CSV trae peso TOTAL sin detalle por bulto,
      // así que el despacho queda con 1 bulto consolidado (no 2 de peso total:
      // eso sería inflar el kilaje). Fiel al dato real del historial.
      bultos: 1,
      pesosKg: [peso],
      tipoEmbalaje: embalaje as DespachoInput['tipoEmbalaje'],
      direccion: (columnas['direccion'] ?? '').trim() || undefined,
      telefono: (columnas['tlfn'] ?? '').trim() || undefined,
      contacto: undefined,
      retiradoPor: (columnas['retiro'] ?? '').trim() || undefined,
      vehiculo: mapVehicle(columnas['vehiculo'] ?? '') ?? undefined,
    }

    const parsed = createDespachoInputSchema.safeParse(candidato)
    if (!parsed.success) {
      motivos.push(
        ...parsed.error.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`),
      )
    } else {
      input = parsed.data
    }
  }

  return { fila: numeroFila, input, motivos }
})

const validas = procesadas.filter((p) => p.input !== null)
const conProblemas = procesadas.filter((p) => p.input === null)

/* ------------------------------------------------------------------ */
/* 5. Reporte (es el producto principal del dry-run)                   */
/* ------------------------------------------------------------------ */

const fechaMax = (input: DespachoInput): Date => new Date(input.despachadoAt)
const fechas = validas.map((p) => fechaMax(p.input as DespachoInput))
const valorTotal = validas.reduce((acc, p) => acc + (p.input as DespachoInput).valorClp, 0)

const formatClp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' })

console.log(`📄 Filas del CSV: ${filas.length}`)
console.log(`✅ Listas para insertar: ${validas.length}`)
console.log(
  `📅 Rango de fechas parseadas: ${
    fechas.length > 0
      ? `${fechas[0].toISOString()} → ${fechas[fechas.length - 1].toISOString()} (orden CSV, no cron)`
      : 'n/a'
  } — ¡verifica que el rango haga sentido!`,
)
console.log(`💰 Valor total del lote: ${formatClp.format(valorTotal)}`)

// Sanity-check de calidad: outlier que huele a CSV sucio.
const valores = validas.map((p) => (p.input as DespachoInput).valorClp).sort((a, b) => a - b)
if (valores.length > 0) {
  const p95 = valores[Math.floor(valores.length * 0.95)]
  const max = valores[valores.length - 1]
  console.log(`💸 Valor p95: ${formatClp.format(p95)} · máx: ${formatClp.format(max)}`)
}

if (vehiculosDesconocidos.size > 0) {
  console.log(`🚗 Vehículos mapeados a "otro": ${[...vehiculosDesconocidos].join(', ')}`)
}

if (fechasNoParseadas.size > 0) {
  const conContenido = [...fechasNoParseadas.entries()].sort((a, b) => b[1] - a[1])
  console.log(
    `⏰ Fechas CON contenido pero formato desconocido: ${conContenido.reduce((acc, [, n]) => acc + n, 0)} filas, ${conContenido.length} formatos distintos (top 5):`,
  )
  for (const [formato, n] of conContenido.slice(0, 5)) {
    console.log(`   "${formato}" × ${n}`)
  }
}
if (bultosPorDefecto > 0) {
  console.log(`🔢 Filas con bulto vacío/inválido → default 1 consolidado: ${bultosPorDefecto}`)
}
if (embalajesReasignados.size > 0 || embalajesPorDefecto > 0) {
  console.log(
    `📦 Embalajes reasignados a "caja" (decisión de producto): ${embalajesPorDefecto} vacíos + ${[
      ...embalajesReasignados.entries(),
    ]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([f, n]) => `"${f}" × ${n}`)
      .join(' · ')}`,
  )
}
const sinComuna = validas.filter(
  (p) => (p.input as DespachoInput).comuna === COMUNA_SIN_DATO,
).length
console.log(`📦 Despachos por courier (comuna "${COMUNA_SIN_DATO}"): ${sinComuna}`)

console.log(`⚠️  Filas con problemas: ${conProblemas.length}`)
// Agrupados por TIPO de motivo con conteo exacto + ejemplos por bin.
const grupos = new Map<string, { total: number; ejemplos: string[] }>()
function motivoTipo(motivo: string): string {
  return motivo.split(':')[0] ?? motivo
}
for (const p of conProblemas) {
  for (const motivo of p.motivos) {
    const tipo = motivoTipo(motivo)
    const grupo = grupos.get(tipo) ?? { total: 0, ejemplos: [] }
    grupo.total++
    if (grupo.ejemplos.length < 2) {
      grupo.ejemplos.push(`     ejemplo — fila ${p.fila}: ${motivo}`)
    }
    grupos.set(tipo, grupo)
  }
}
for (const [tipo, grupo] of [...grupos.entries()].sort((a, b) => b[1].total - a[1].total)) {
  console.log(`   ${tipo}: ${grupo.total}`)
  for (const ejemplo of grupo.ejemplos) console.log(ejemplo)
}

// Conteo de celdas vacías por columna: separa "desechos del export" de "datos faltantes reales".
const vaciasPorColumna = new Map<string, number>()
for (const p of conProblemas) {
  const columnasRaw = filas[p.fila - 2] ?? {}
  for (const [columna, valor] of Object.entries(columnasRaw)) {
    if (!String(valor ?? '').trim()) {
      vaciasPorColumna.set(columna, (vaciasPorColumna.get(columna) ?? 0) + 1)
    }
  }
}
if (vaciasPorColumna.size > 0) {
  console.log('🫥 Celdas vacías en filas problemáticas (por columna):')
  for (const [columna, cantidad] of [...vaciasPorColumna.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${columna}: ${cantidad}`)
  }
}

/* ------------------------------------------------------------------ */
/* 6. Insert (solo con --insert; guard de idempotencia)               */
/* ------------------------------------------------------------------ */

if (!args.insert) {
  console.log('\n🧪 DRY-RUN completado: nada se escribió. Revisa el reporte y corre con --insert.')
  process.exit(0)
}

if (conProblemas.length > 0) {
  // Decisión de producto revisada en el dry-run: las filas con datos críticos
  // ausentes (valor sin dato, sin fecha, sin documento/guía) se OMITEN, no se
  // inventan. El reporte de arriba las muestra explícitas antes de correr esto.
  console.log(
    `⚠️ Omitiendo ${conProblemas.length} filas con datos inválidos (detalle en el reporte de arriba).`,
  )
}

const db: SupabaseClient = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { count, error: errorCount } = await db
  .from('despachos')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', userId)

if (errorCount) {
  fail(
    `No se pudo verificar el estado del lote. Error completo de PostgREST: ${JSON.stringify(errorCount)}`,
  )
}
if ((count ?? 0) > 0 && !args.force) {
  fail(
    `El usuario ya tiene ${count} despachos. Si este lote es NUEVO e intencional, corre con --force.`,
  )
}

let ok = 0
let fallidos = 0
for (const p of validas) {
  const input = p.input as DespachoInput
  try {
    // Mismo flujo que createDespachoFn: padre → bultos consolidados.
    const fila = await repo.insertDespacho(db, userId, buildDespachoInsert(input, userId))
    await repo.insertBultos(db, fila.id, buildDespachoBultosValues(input))
    ok++
  } catch (error) {
    fallidos++
    console.error(`  fila ${p.fila}: falló al insertar:`, error)
  }
}

console.log(`\n✅ Insertados: ${ok} · ❌ Fallidos: ${fallidos}`)
process.exit(fallidos > 0 ? 2 : 0)
