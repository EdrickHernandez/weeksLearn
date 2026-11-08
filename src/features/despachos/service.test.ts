import { describe, expect, it } from 'vitest'
import {
  buildDespachoBultosValues,
  buildDespachoInsert,
  buildDespachoUpdate,
  despachosDelDia,
  extractTransporteSuggestions,
  finDiaLocalIso,
  formatoFechaJornada,
  formatoTelefono,
  formatClp,
  hayFiltrosActivos,
  inicioDiaLocalIso,
  normalizeComuna,
  normalizeTelefono,
  normalizeTransporte,
  patronIlike,
  sumBultos,
  sumValorClp,
  termQPostgrest,
  titleCase,
  toDespacho,
  despachoAFila,
  formatoFechaHora,
} from './service'
import {
  createDespachoInputSchema,
  despachoConBultosRowSchema,
  despachoFiltrosUrlSchema,
  despachoInputSchema,
  updateDespachoInputSchema,
  type Despacho,
  type DespachoInput,
} from './schemas'

/** Fixture de despacho de dominio válido, con overrides por test. */
function fixDespacho(overrides: Partial<Despacho> & { id: string }): Despacho {
  return {
    userId: '11111111-1111-4111-8111-111111111111',
    despachadoAt: '2026-09-30T17:30:00.000Z',
    tipoDocumento: 'boleta',
    numeroDocumento: 'B-1',
    numeroGuia: 'G-1',
    transporte: 'Starken',
    comuna: 'Providencia',
    comunaEnCatalogo: true,
    valorClp: 25000,
    bultos: 1,
    pesosBultos: [5],
    tipoEmbalaje: 'caja',
    direccion: null,
    telefono: null,
    contacto: null,
    retiradoPor: null,
    vehiculo: null,
    createdAt: '2026-09-30T18:00:00.000Z',
    updatedAt: '2026-09-30T18:00:00.000Z',
    ...overrides,
  }
}

const inputBase: DespachoInput = {
  despachadoAt: '2026-09-30T14:30:00-03:00',
  tipoDocumento: 'factura',
  numeroDocumento: 'F-001',
  numeroGuia: 'G-100',
  transporte: '  starken  ',
  comuna: 'providencia',
  valorClp: 1234567,
  bultos: 3,
  pesosKg: [5, 5, 2.5],
  tipoEmbalaje: 'caja',
  direccion: 'Av. Providencia 123',
  telefono: '(+56) 9 1234-5678',
  contacto: 'Juan Pérez',
  retiradoPor: undefined,
  vehiculo: undefined,
}

describe('normalizeTransporte', () => {
  it('colapsa espacios y capitaliza cada palabra', () => {
    expect(normalizeTransporte('  starken  cargex ')).toBe('Starken Cargex')
    expect(normalizeTransporte('CHILEXPRESS')).toBe('Chilexpress')
  })
})

describe('titleCase', () => {
  it('normaliza palabra por palabra, con conectores en minúscula y acrónimos intactos', () => {
    expect(titleCase('correos DE chile')).toBe('Correos de Chile')
    // El acrónimo se preserva solo si el usuario lo escribió en mayúsculas.
    expect(titleCase('dts distribucion')).toBe('Dts Distribucion')
    expect(titleCase('DTS Distribución')).toBe('DTS Distribución')
    expect(titleCase('transportes del sur')).toBe('Transportes del Sur')
  })
})

describe('normalizeComuna', () => {
  it('canoniza variantes del mismo nombre (mayúsculas, espacios, tildes)', () => {
    expect(normalizeComuna('providencia')).toEqual({ comuna: 'Providencia', enCatalogo: true })
    expect(normalizeComuna('  LOS   angeles ')).toEqual({ comuna: 'Los Ángeles', enCatalogo: true })
    expect(normalizeComuna('ñuñoa')).toEqual({ comuna: 'Ñuñoa', enCatalogo: true })
  })

  it('validación soft: comuna desconocida se guarda limpia y marcada fuera de catálogo', () => {
    expect(normalizeComuna('aisen')).toEqual({ comuna: 'Aisen', enCatalogo: false })
  })
})

describe('normalizeTelefono (canónico E.164 con libphonenumber)', () => {
  it('los formatos comunes convergen al MISMO canónico', () => {
    // "un mismo número = un solo registro en la base" — el objetivo del cambio.
    expect(normalizeTelefono('(+56) 9 1234-5678')).toBe('+56912345678')
    expect(normalizeTelefono('+56912345678')).toBe('+56912345678')
    expect(normalizeTelefono('912345678')).toBe('+56912345678') // nacional: default CL
    expect(normalizeTelefono('+56 2 2123 4567')).toBe('+56221234567') // fijo válido
  })

  it('vacío o undefined → null (sin teléfono)', () => {
    expect(normalizeTelefono(undefined)).toBeNull()
    expect(normalizeTelefono('   ')).toBeNull()
  })

  it('un número inválido GRITE (el schema debió rechazarlo antes)', () => {
    // Fail-fast: si llega acá, es un bug del pipeline, no un dato a tolerar.
    expect(() => normalizeTelefono('123')).toThrow(/inválido/)
    expect(() => normalizeTelefono('+59991234567')).toThrow(/inválido/) // válido, pero NO de Chile
  })
})

describe('formatClp', () => {
  it('formatea con separador de miles y sin decimales', () => {
    expect(formatClp(1234567)).toBe('$1.234.567')
    expect(formatClp(1000)).toBe('$1.000')
  })
})

describe('sumBultos', () => {
  it('suma los pesos por bulto; vacío suma 0', () => {
    expect(sumBultos([1, 2, 3.5])).toBe(6.5)
    expect(sumBultos([0, 0])).toBe(0)
    expect(sumBultos([])).toBe(0)
  })
})

describe('extractTransporteSuggestions', () => {
  it('dedupea insensible a mayúsculas/espacios, agrega la base y ordena es-CL', () => {
    const sugerencias = extractTransporteSuggestions([
      { transporte: 'starken' },
      { transporte: '  Starken  ' },
      { transporte: 'CHILEXPRESS' },
    ])

    expect(sugerencias).toContain('Starken')
    expect(sugerencias).toContain('Chilexpress')
    // La lista base siempre está disponible aunque no haya historial.
    expect(sugerencias).toContain('Correos de Chile')
    expect(sugerencias).toEqual([...sugerencias].sort((a, b) => a.localeCompare(b, 'es')))
    // Sin duplicados por clave normalizada.
    expect(sugerencias.filter((s) => s === 'Starken')).toHaveLength(1)
  })
})

describe('buildDespachoInsert / buildDespachoUpdate', () => {
  it('normaliza y produce valores listos para PostgreSQL', () => {
    const insert = buildDespachoInsert(inputBase, '11111111-1111-4111-8111-111111111111')

    expect(insert.user_id).toBe('11111111-1111-4111-8111-111111111111')
    expect(insert.despachado_at).toBe('2026-09-30T17:30:00.000Z')
    expect(insert.transporte).toBe('Starken')
    expect(insert.comuna).toBe('Providencia')
    expect(insert.telefono).toBe('+56912345678')
    expect(insert.vehiculo).toBeNull()
    expect(insert.retirado_por).toBeNull()
  })

  it('el peso ya no vive en despachos: vive por bulto', () => {
    const insert = buildDespachoInsert(inputBase, '11111111-1111-4111-8111-111111111111')
    expect(insert).not.toHaveProperty('peso_kg')
  })

  it('el update no cambia user_id y estampa updated_at', () => {
    const update = buildDespachoUpdate(inputBase)

    expect(update).not.toHaveProperty('user_id')
    expect(new Date(update.updated_at).getTime()).not.toBeNaN()
  })

  it('convierte fecha local sin zona (contrato del form datetime-local)', () => {
    // La zona del proceso afecta el resultado, pero siempre produce ISO válido.
    const values = buildDespachoInsert(
      { ...inputBase, despachadoAt: '2026-09-30T14:30' },
      '11111111-1111-4111-8111-111111111111',
    )
    expect(values.despachado_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })
})

describe('buildDespachoBultosValues', () => {
  it('numera los bultos 1..N con su peso', () => {
    expect(buildDespachoBultosValues(inputBase)).toEqual([
      { numero: 1, peso_kg: 5 },
      { numero: 2, peso_kg: 5 },
      { numero: 3, peso_kg: 2.5 },
    ])
  })
})

describe('toDespacho', () => {
  it('mapea la fila con bultos embebidos al registro del dominio', () => {
    const row = despachoConBultosRowSchema.parse({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      user_id: '11111111-1111-4111-8111-111111111111',
      despachado_at: '2026-09-30T17:30:00+00:00',
      tipo_documento: 'boleta',
      numero_documento: 'B-9',
      numero_guia: 'G-9',
      transporte: 'Chilexpress',
      comuna: 'LOS ANGELES',
      valor_clp: 99000,
      bultos: 2,
      tipo_embalaje: 'pallet',
      direccion: null,
      telefono: null,
      contacto: null,
      retirado_por: 'María Soto',
      vehiculo: 'camion',
      created_at: '2026-09-30T18:00:00+00:00',
      updated_at: '2026-09-30T18:00:00+00:00',
      bultos_detalle: [
        { numero: 2, peso_kg: 0 },
        { numero: 1, peso_kg: '20.4' },
      ],
    })

    const despacho = toDespacho(row)

    // pesosBultos ordenados por numero, numeric string → number.
    expect(despacho.pesosBultos).toEqual([20.4, 0])
    expect(despacho.comuna).toBe('Los Ángeles')
    expect(despacho.comunaEnCatalogo).toBe(true)
    expect(despacho.retiradoPor).toBe('María Soto')
    expect(despacho.vehiculo).toBe('camion')
  })

  it('marca comunaEnCatalogo=false para comunas fuera del catálogo', () => {
    const row = despachoConBultosRowSchema.parse({
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      user_id: '11111111-1111-4111-8111-111111111111',
      despachado_at: '2026-09-30T17:30:00Z',
      tipo_documento: 'boleta',
      numero_documento: 'B-10',
      numero_guia: 'G-10',
      transporte: 'Otro Transporte',
      comuna: 'Villa Ficción',
      valor_clp: 5000,
      bultos: 1,
      tipo_embalaje: 'caja',
      direccion: null,
      telefono: null,
      contacto: null,
      retirado_por: null,
      vehiculo: null,
      created_at: '2026-09-30T18:00:00Z',
      updated_at: '2026-09-30T18:00:00Z',
      bultos_detalle: [{ numero: 1, peso_kg: 1 }],
    })

    expect(toDespacho(row).comunaEnCatalogo).toBe(false)
  })
})

describe('los helpers PostgREST (sanear antes de tocar la base)', () => {
  it('hayFiltrosActivos: la pagina NO es un filtro (regla del negocio)', () => {
    expect(hayFiltrosActivos({})).toBe(false)
    expect(hayFiltrosActivos({ pagina: 3 })).toBe(false)
    expect(hayFiltrosActivos({ q: 'starken' })).toBe(true)
    expect(hayFiltrosActivos({ desde: '2026-10-01' })).toBe(true)
    // Contrato: recibe filtros YA saneados (el schema trimea/descarta vacíos
    // y espacios); este helper no re-trimea — eso sería duplicar normalización.
    expect(hayFiltrosActivos({ comuna: '' })).toBe(false)
    expect(hayFiltrosActivos({ tipoDocumento: 'factura' })).toBe(true)
  })

  it('termQPostgrest saca reservados del or-filter, comodines y trimmea', () => {
    expect(termQPostgrest(' starken,1295 ')).toBe('starken1295')
    expect(termQPostgrest('correos (chile)')).toBe('correos chile')
    expect(termQPostgrest('a*b%')).toBe('ab')
  })

  it('patronIlike arma el patrón parcial, neutralizando comodines del usuario', () => {
    expect(patronIlike('Starken')).toBe('%Starken%')
    expect(patronIlike('  %villa_  ')).toBe('%villa%')
  })
})

describe('las fronteras del día (URL YYYY-MM-DD → límites ISO UTC)', () => {
  // Ambos lados se construyen LOCALMENTE: el test es inmune a la zona del
  // runner (Chile UTC-3 vs CI UTC) — el mismo truco de la jornada.
  it('desde = medianoche local INCLUSIVA; hasta = medianoche del día siguiente', () => {
    expect(inicioDiaLocalIso('2026-10-28')).toBe(new Date(2026, 9, 28, 0, 0, 0, 0).toISOString())
    expect(finDiaLocalIso('2026-10-28')).toBe(new Date(2026, 9, 29, 0, 0, 0, 0).toISOString())
  })

  it('el +1 rueda sobre mes y año', () => {
    expect(finDiaLocalIso('2026-10-31')).toBe(new Date(2026, 10, 1, 0, 0, 0, 0).toISOString())
    expect(finDiaLocalIso('2026-02-28')).toBe(new Date(2026, 2, 1, 0, 0, 0, 0).toISOString())
  })

  it('fecha imposible → error explícito (la URL viaja sanada, pero Date no se confía)', () => {
    expect(() => inicioDiaLocalIso('2026-13-00')).toThrow()
    expect(() => inicioDiaLocalIso('2026-02-31')).toThrow()
  })
})

describe('schemas', () => {
  it('valida y sanea los filtros de URL, incluida la fecha del calendario', () => {
    expect(
      despachoFiltrosUrlSchema.parse({
        q: '  guía  ',
        desde: '2026-10-01',
        hasta: '2026-10-31',
        tipoDocumento: 'factura',
        transporte: ' Chilexpress ',
        comuna: ' Ñuñoa ',
      }),
    ).toEqual({
      q: 'guía',
      desde: '2026-10-01',
      hasta: '2026-10-31',
      tipoDocumento: 'factura',
      transporte: 'Chilexpress',
      comuna: 'Ñuñoa',
    })
    expect(despachoFiltrosUrlSchema.safeParse({ desde: '2026-02-31' }).success).toBe(false)
    expect(despachoFiltrosUrlSchema.safeParse({ tipoDocumento: 'guia' }).success).toBe(false)
  })

  it('pagina viaja como string en la URL: "3" → 3; basura → undefined sin derribar los demás', () => {
    expect(despachoFiltrosUrlSchema.parse({ pagina: '3' }).pagina).toBe(3)
    // Estado de navegación: basura borra la página, no los filtros vecinos.
    for (const basura of ['0', 'abc', '501', '']) {
      const parsed = despachoFiltrosUrlSchema.parse({ pagina: basura, q: 'starken' })
      expect(parsed.pagina).toBeUndefined()
      expect(parsed.q).toBe('starken')
    }
    expect(despachoFiltrosUrlSchema.parse({}).pagina).toBeUndefined()
  })

  it('porPagina solo acepta los valores del selector (50/100/150/200)', () => {
    expect(despachoFiltrosUrlSchema.parse({ porPagina: '100' }).porPagina).toBe(100)
    for (const basura of ['75', 'abc', '', '-1']) {
      const parsed = despachoFiltrosUrlSchema.parse({ porPagina: basura, q: 'starken' })
      expect(parsed.porPagina).toBeUndefined()
      expect(parsed.q).toBe('starken')
    }
    expect(despachoFiltrosUrlSchema.parse({}).porPagina).toBeUndefined()
  })

  it('despachoInputSchema rechaza valor 0, bultos inválidos y enums inválidos', () => {
    expect(despachoInputSchema.safeParse({ ...inputBase, valorClp: 0 }).success).toBe(false)
    expect(despachoInputSchema.safeParse({ ...inputBase, bultos: 0 }).success).toBe(false)
    expect(despachoInputSchema.safeParse({ ...inputBase, tipoDocumento: 'guia' }).success).toBe(
      false,
    )
    expect(despachoInputSchema.safeParse({ ...inputBase, tipoEmbalaje: 'sobre' }).success).toBe(
      false,
    )
    expect(despachoInputSchema.safeParse({ ...inputBase, vehiculo: 'avion' }).success).toBe(false)
    expect(despachoInputSchema.safeParse({ ...inputBase, vehiculo: 'camioneta' }).success).toBe(
      true,
    )
  })

  it('la cantidad de pesos debe igualar a los bultos', () => {
    expect(despachoInputSchema.safeParse({ ...inputBase, pesosKg: [5, 5] }).success).toBe(false)
    expect(despachoInputSchema.safeParse({ ...inputBase, pesosKg: [5, 5, 2.5] }).success).toBe(true)
  })

  it('peso 0 = "sin pesar": válido para cualquier embalaje; negativos, no', () => {
    expect(
      despachoInputSchema.safeParse({
        ...inputBase,
        tipoEmbalaje: 'caja',
        pesosKg: [5, 0, 2.5],
      }).success,
    ).toBe(true)
    expect(
      despachoInputSchema.safeParse({
        ...inputBase,
        tipoEmbalaje: 'pallet',
        pesosKg: [0, 0, 0],
      }).success,
    ).toBe(true)
    expect(
      despachoInputSchema.safeParse({
        ...inputBase,
        tipoEmbalaje: 'alusado',
        pesosKg: [0, 3, 0],
      }).success,
    ).toBe(true)
    expect(
      despachoInputSchema.safeParse({
        ...inputBase,
        tipoEmbalaje: 'caja',
        pesosKg: [-1, 0, 0],
      }).success,
    ).toBe(false)
  })

  it('alusado es un tipo de embalaje válido y exige peso > 0 como caja', () => {
    expect(
      despachoInputSchema.safeParse({
        ...inputBase,
        tipoEmbalaje: 'alusado',
        pesosKg: [3, 4, 5],
      }).success,
    ).toBe(true)
    expect(
      despachoInputSchema.safeParse({
        ...inputBase,
        tipoEmbalaje: 'alusado',
        pesosKg: [3, 0, 5],
      }).success,
    ).toBe(true)
  })

  it('el update comparte la regla de cantidad peso=bultos', () => {
    const id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    expect(
      updateDespachoInputSchema.safeParse({
        ...inputBase,
        tipoEmbalaje: 'pallet',
        pesosKg: [0, 0, 0],
        id,
      }).success,
    ).toBe(true)
    expect(
      updateDespachoInputSchema.safeParse({
        ...inputBase,
        tipoEmbalaje: 'caja',
        pesosKg: [5, 0, 2.5],
        id,
      }).success,
    ).toBe(true)
    expect(
      updateDespachoInputSchema.safeParse({
        ...inputBase,
        tipoEmbalaje: 'caja',
        pesosKg: [5, 0], // 2 pesos para 3 bultos
        id,
      }).success,
    ).toBe(false)
  })

  it('despachoInputSchema rechaza fechas inválidas y acepta datetime-local', () => {
    expect(
      despachoInputSchema.safeParse({ ...inputBase, despachadoAt: '30-09-2026' }).success,
    ).toBe(false)
    expect(
      despachoInputSchema.safeParse({ ...inputBase, despachadoAt: '2026-09-30T14:30' }).success,
    ).toBe(true)
    expect(despachoInputSchema.safeParse(inputBase).success).toBe(true)
  })

  it('createDespachoInputSchema es el payload puro y update exige id uuid', () => {
    expect(createDespachoInputSchema.safeParse(inputBase).success).toBe(true)
    expect(updateDespachoInputSchema.safeParse({ ...inputBase, id: 'no-uuid' }).success).toBe(false)
    expect(
      updateDespachoInputSchema.safeParse({
        ...inputBase,
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      }).success,
    ).toBe(true)
  })

  it('los campos opcionales faltantes no rompen la validación', () => {
    const minimo = { ...inputBase }
    delete minimo.direccion
    delete minimo.telefono
    expect(despachoInputSchema.safeParse(minimo).success).toBe(true)
  })
})

describe('telefonoSchema — CL móvil y fijo (libphonenumber)', () => {
  const parseTelefono = (telefono: string | undefined) =>
    createDespachoInputSchema.safeParse({ ...inputBase, telefono }).success

  it('acepta móviles y fijos chilenos en formatos comunes', () => {
    expect(parseTelefono('+56912345678')).toBe(true)
    expect(parseTelefono('912345678')).toBe(true) // nacional, default CL
    expect(parseTelefono('+56 2 2123 4567')).toBe(true) // fijo
  })

  it('acepta ausencia y "" (sin teléfono)', () => {
    expect(parseTelefono(undefined)).toBe(true)
    expect(parseTelefono('')).toBe(true)
  })

  it('rechaza inválidos y números extranjeros válidos', () => {
    expect(parseTelefono('123')).toBe(false)
    expect(parseTelefono('hola')).toBe(false)
    expect(parseTelefono('+34 912345678')).toBe(false) // válido, pero de España
  })
})

describe('formatoTelefono (formato de LECTURA, humano)', () => {
  it('el canónico E.164 y los formatos legacy convergen al formato nacional', () => {
    // El historial importado mezcla formatos viejos: la vista los iguala.
    expect(formatoTelefono('+56912345678')).toBe('9 1234 5678')
    expect(formatoTelefono('56912345678')).toBe('9 1234 5678') // legacy sin +
    expect(formatoTelefono('9-1234-5678')).toBe('9 1234 5678')
    // Fijo: los metadatos SÍ agrupan fijos (área entre paréntesis) — solo
    // los móviles van crudos y los formateamos nosotros.
    expect(formatoTelefono('+56221234567')).toBe('(2) 2123 4567')
  })

  it('sin teléfono → null', () => {
    expect(formatoTelefono(null)).toBeNull()
    expect(formatoTelefono(undefined)).toBeNull()
    expect(formatoTelefono('')).toBeNull()
  })

  it('dato no parseable se muestra CRUDO (tolerante con el legacy)', () => {
    expect(formatoTelefono('dato-raro')).toBe('dato-raro')
  })
})

describe('la jornada', () => {
  // Fechas construidas en hora LOCAL del entorno: los tests no dependen de
  // la zona horaria del CI. Jornada de referencia: 23-oct-2026, 14:30 local.
  const ahora = new Date(2026, 9, 23, 14, 30)
  const deHoy = (id: string, hora: number, minuto: number, valorClp = 10_000) =>
    fixDespacho({ id, valorClp, despachadoAt: new Date(2026, 9, 23, hora, minuto).toISOString() })
  const deOtroDia = (id: string, fecha: Date) =>
    fixDespacho({ id, despachadoAt: fecha.toISOString() })

  it('deja solo los despachos del día, del más reciente al más antiguo', () => {
    const dia = despachosDelDia(
      [
        deOtroDia('ayer', new Date(2026, 9, 22, 23, 59)),
        deHoy('hoy-915', 9, 15),
        deOtroDia('otro-mes', new Date(2026, 8, 23, 12, 0)),
        deHoy('hoy-1400', 14, 0, 20_000),
      ],
      ahora,
    )
    expect(dia.map((despacho) => despacho.id)).toEqual(['hoy-1400', 'hoy-915'])
  })

  it('el borde de medianoche local separa las jornadas', () => {
    const recienMedianoche = new Date(2026, 9, 23, 0, 0, 1)
    const antesDeMedianoche = new Date(2026, 9, 22, 23, 59, 59)
    expect(despachosDelDia([deOtroDia('ayer-tarde', antesDeMedianoche)], recienMedianoche)).toEqual(
      [],
    )
  })

  it('sumValorClp suma los valores del día', () => {
    expect(sumValorClp([deHoy('a', 9, 15), deHoy('b', 14, 0, 20_000)])).toBe(30_000)
    expect(sumValorClp([])).toBe(0)
  })

  it('formatoFechaJornada nombra la fecha en es-CL, capitalizada', () => {
    const texto = formatoFechaJornada(ahora)
    expect(texto).toContain('23 de octubre')
    expect(texto.charAt(0)).toBe(texto.charAt(0).toUpperCase())
  })
})

function despachoBase(sobreescritos: Partial<Despacho> = {}): Despacho {
  return {
    id: '00000000-0000-0000-0000-000000000000',
    userId: '00000000-0000-0000-0000-000000000001',
    despachadoAt: '2026-10-28T14:30:00.000Z',
    tipoDocumento: 'boleta',
    numeroDocumento: '12345',
    numeroGuia: 'G-789',
    transporte: 'Starken',
    comuna: 'Providencia',
    comunaEnCatalogo: true,
    valorClp: 1_234_567,
    bultos: 2,
    tipoEmbalaje: 'caja',
    pesosBultos: [12.5, 8],
    direccion: 'Av. Ejemplo 123',
    telefono: null,
    contacto: 'Juan',
    retiradoPor: null,
    vehiculo: null,
    createdAt: '2026-10-28T14:31:00.000Z',
    updatedAt: '2026-10-28T14:31:00.000Z',
    ...sobreescritos,
  }
}

describe('formatoFechaHora', () => {
  it('round-trip local: 28 oct 14:30 local → ISO → legible', () => {
    // Constructor LOCAL (mes 9 = octubre, los meses son 0-indexed):
    // el ISO resultante codifica 14:30 EN LA ZONA del runner, así el test
    // no depende de si corre en Chile (UTC-3) o en el CI (UTC).
    const local = new Date(2026, 9, 28, 14, 30)
    const legible = formatoFechaHora(local.toISOString())
    expect(legible).toMatch(/28-10-2026/)
    expect(legible).toContain('14:30')
  })
})

describe('despachoAFila', () => {
  it('concatena los pesos con " / "', () => {
    expect(despachoAFila(despachoBase()).pesosBultos).toBe('12.5 / 8')
  })

  it('bultos vacíos → celda blanca (el regalo del join)', () => {
    const fila = despachoAFila(despachoBase({ pesosBultos: [], bultos: 0 }))
    expect(fila.pesosBultos).toBe('')
  })

  it('lo presente pasa intacto; lo ausente se marca con —', () => {
    const fila = despachoAFila(despachoBase())
    expect(fila.direccion).toBe('Av. Ejemplo 123')
    expect(fila.telefono).toBe('—')
    expect(fila.retiradoPor).toBe('—')
  })

  it('el valor viaja formateado en CLP', () => {
    expect(despachoAFila(despachoBase()).valorClp).toBe('$1.234.567')
  })

  it('retiro en bodega: nombre del retiro; dirección marcada', () => {
    const fila = despachoAFila(
      despachoBase({
        retiradoPor: 'Omar Aguayo',
        direccion: null,
      }),
    )
    expect(fila.direccion).toBe('—')
    expect(fila.retiradoPor).toBe('Omar Aguayo')
  })
})
