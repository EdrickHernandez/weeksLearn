import { describe, expect, it } from 'vitest'
import { armarWorkbookJornada, nombreArchivoJornada } from './exportar-jornada'
import type { Despacho } from './schemas'

/**
 * Fixture duplicado a propósito del de service.test.ts (por ahora):
 * cuando la feature tenga 3+ archivos de test, se extrae a un helper
 * compartido. Revisar entonces.
 */
function despachoBase(sobreescritos: Partial<Despacho> = {}): Despacho {
  return {
    id: '00000000-0000-0000-0000-000000000000',
    userId: '00000000-0000-0000-0000-000000000001',
    despachadoAt: '2026-11-03T14:30:00.000Z',
    tipoDocumento: 'boleta',
    numeroDocumento: '12345',
    numeroGuia: 'G-789',
    transporte: 'Starken',
    comuna: 'Providencia',
    comunaEnCatalogo: true,
    valorClp: 1_000,
    bultos: 2,
    tipoEmbalaje: 'caja',
    pesosBultos: [12.5, 8],
    direccion: 'Av. Ejemplo 123',
    telefono: null,
    contacto: 'Juan',
    retiradoPor: null,
    vehiculo: null,
    createdAt: '2026-11-03T14:31:00.000Z',
    updatedAt: '2026-11-03T14:31:00.000Z',
    ...sobreescritos,
  }
}

describe('nombreArchivoJornada', () => {
  it('firma el archivo con la jornada (mes 0-indexed: 10 = noviembre)', () => {
    expect(nombreArchivoJornada(new Date(2026, 10, 3))).toBe('despachos-acob3-2026-11-03.xlsx')
  })

  it('con días/meses de un dígito rellena con cero', () => {
    expect(nombreArchivoJornada(new Date(2026, 0, 5))).toBe('despachos-acob3-2026-01-05.xlsx')
  })
})

describe('armarWorkbookJornada', () => {
  it('arma: cabecera + una fila por despacho + totales al pie', () => {
    const workbook = armarWorkbookJornada([despachoBase(), despachoBase({ valorClp: 2_000 })])
    expect(workbook.worksheets).toHaveLength(1)
    const hoja = workbook.worksheets[0]

    // Fila 1 = encabezados, filas 2-3 = despachos, fila 4 = totales.
    expect(hoja.rowCount).toBe(4)
    expect(hoja.getCell('A1').value).toBe('Fecha/Hora')
  })

  it('los despachos llegan ya convertidos (documento fusionado, CLP formateado)', () => {
    const hoja = armarWorkbookJornada([despachoBase()]).worksheets[0]
    expect(hoja.getCell('B2').value).toBe('boleta 12345')
    expect(hoja.getCell('I2').value).toBe('12.5 / 8')
    expect(hoja.getCell('H1').value).toBe('Embalaje')
  })

  it('el pie resume la jornada: cantidad + valor total', () => {
    const hoja = armarWorkbookJornada([despachoBase(), despachoBase({ valorClp: 2_000 })])
      .worksheets[0]
    expect(hoja.getCell('B4').value).toBe('2 despachos')
    expect(hoja.getCell('F4').value).toBe('$3.000')
  })
})
