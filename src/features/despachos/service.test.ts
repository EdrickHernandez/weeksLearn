import { describe, expect, it } from 'vitest'
import {
  buildDespachoBultosValues,
  buildDespachoInsert,
  buildDespachoUpdate,
  extractTransporteSuggestions,
  formatClp,
  normalizeComuna,
  normalizeTelefono,
  normalizeTransporte,
  searchDespachos,
  sumBultos,
  titleCase,
  toDespacho,
} from './service'
import {
  createDespachoInputSchema,
  despachoConBultosRowSchema,
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

describe('normalizeTelefono', () => {
  it('conserva dígitos y un único + inicial', () => {
    expect(normalizeTelefono('(+56) 9 1234-5678')).toBe('+56912345678')
    expect(normalizeTelefono('9-1234-5678')).toBe('912345678')
  })

  it('vacío o undefined → null', () => {
    expect(normalizeTelefono(undefined)).toBeNull()
    expect(normalizeTelefono('   ')).toBeNull()
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

describe('searchDespachos', () => {
  const despachos = [
    fixDespacho({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' }),
    fixDespacho({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
      transporte: 'Chilexpress',
      comuna: 'Los Ángeles',
      numeroGuia: 'G-200',
    }),
  ]

  it('sin query devuelve todos', () => {
    expect(searchDespachos(despachos, '')).toHaveLength(2)
    expect(searchDespachos(despachos, '   ')).toHaveLength(2)
  })

  it('matchea insensible a mayúsculas y tildes en varios campos', () => {
    expect(searchDespachos(despachos, 'starken')).toHaveLength(1)
    expect(searchDespachos(despachos, 'PROVIDENCIA')).toHaveLength(1)
    expect(searchDespachos(despachos, 'los angeles')).toHaveLength(1) // sin tilde
    expect(searchDespachos(despachos, 'g-200')).toHaveLength(1) // por guía
  })

  it('sin resultados devuelve lista vacía', () => {
    expect(searchDespachos(despachos, 'temuco')).toEqual([])
  })
})

describe('schemas', () => {
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
  })

  it('la cantidad de pesos debe igualar a los bultos', () => {
    expect(despachoInputSchema.safeParse({ ...inputBase, pesosKg: [5, 5] }).success).toBe(false)
    expect(despachoInputSchema.safeParse({ ...inputBase, pesosKg: [5, 5, 2.5] }).success).toBe(true)
  })

  it('regla pallet/caja/alusado por bulto: solo el pallet puede pesar 0 kg', () => {
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
        tipoEmbalaje: 'caja',
        pesosKg: [5, 0, 2.5],
      }).success,
    ).toBe(false)
    expect(
      despachoInputSchema.safeParse({
        ...inputBase,
        tipoEmbalaje: 'caja',
        pesosKg: [5, 0.01, 2.5],
      }).success,
    ).toBe(true)
    expect(
      despachoInputSchema.safeParse({
        ...inputBase,
        tipoEmbalaje: 'pallet',
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
    ).toBe(false)
  })

  it('el update comparte las reglas condicionales', () => {
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
