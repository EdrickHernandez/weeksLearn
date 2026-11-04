import ExcelJS from 'exceljs'
import type { Despacho } from './schemas'
import { despachoAFila, formatClp, sumValorClp } from './service'

/**
 * Piezas del export a Excel de la jornada (pieza 1 del acuerdo):
 * - `nombreArchivoJornada` y `armarWorkbookJornada` son PURAS y testeables.
 * - `exportarJornada` es la única que toca APIs del browser (Blob/descarga)
 *   y solo se invoca desde un click de la UI.
 * ExcelJS vive SOLO en este archivo: el service queda libre de librerías.
 */

/** Nombre determinista del archivo: la jornada exportada viaja fechada. */
export function nombreArchivoJornada(referencia: Date): string {
  const y = referencia.getFullYear()
  const m = String(referencia.getMonth() + 1).padStart(2, '0') // getMonth es 0-indexed
  const d = String(referencia.getDate()).padStart(2, '0')
  return `despachos-acob3-${y}-${m}-${d}.xlsx`
}

/**
 * Arma el workbook completo: encabezados, una fila por despacho y el
 * resumen al pie (decisión de negocio: valor total + cantidad de despachos).
 * No toca el DOM: se puede testear tal cual.
 */
export function armarWorkbookJornada(delDia: readonly Despacho[]): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook()
  const hoja = workbook.addWorksheet('Jornada')

  // El orden de las columnas replica el orden de las keys de FilaDespacho:
  // addRow({}) llena por key, así un cambio de orden no corrompe el Excel.
  hoja.columns = [
    { header: 'Fecha/Hora', key: 'despachadoAt', width: 17 },
    { header: 'Documento', key: 'documento', width: 16 },
    { header: 'N° Guía', key: 'numeroGuia', width: 12 },
    { header: 'Transporte', key: 'transporte', width: 18 },
    { header: 'Comuna', key: 'comuna', width: 14 },
    { header: 'Valor', key: 'valorClp', width: 14 },
    { header: 'Bultos', key: 'bultos', width: 8 },
    { header: 'Embalaje', key: 'tipoEmbalaje', width: 11 },
    { header: 'Pesos (kg)', key: 'pesosBultos', width: 14 },
    { header: 'Dirección', key: 'direccion', width: 26 },
    { header: 'Teléfono', key: 'telefono', width: 14 },
    { header: 'Contacto', key: 'contacto', width: 14 },
    { header: 'Retirado por', key: 'retiradoPor', width: 16 },
    { header: 'Vehículo', key: 'vehiculo', width: 12 },
  ]

  for (const despacho of delDia) {
    // El service hace la conversión (formatClp, pesos concatenados, fecha legible):
    // este archivo SOLO orquesta, no traduce datos.
    hoja.addRow(despachoAFila(despacho))
  }

  // Resumen al pie: la etiqueta vive en 'documento', el total en 'valorClp'
  // (las keys que quedan vacías quedan como celdas en blanco).
  hoja.addRow({
    documento: `${delDia.length} despachos`,
    valorClp: formatClp(sumValorClp(delDia)),
  })

  return workbook
}

/**
 * Coreografía de descarga del browser: bytes en RAM → Blob (archivo en
 * memoria) → URL temporal → un <a> invisible finge el click → el browser
 * lo baja a disco → la URL se libera (mismo porqué que liberar una pool).
 */
export async function exportarJornada(
  delDia: readonly Despacho[],
  referencia: Date,
): Promise<void> {
  const workbook = armarWorkbookJornada(delDia)
  const bytes = await workbook.xlsx.writeBuffer()
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = nombreArchivoJornada(referencia)
  anchor.click()
  URL.revokeObjectURL(url)
}
