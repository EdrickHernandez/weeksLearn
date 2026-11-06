import * as React from 'react'
import type { Despacho } from '../schemas'
import { formatClp, sumBultos } from '../service'

/** Solo día-mes ("04-11"): la lista de jornada es idéntica a la del historial. */
const FORMATO_FECHA = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit',
  month: '2-digit',
})

export type DespachosListaProps = {
  despachos: readonly Despacho[]
  onAbrirFicha: (despacho: Despacho) => void
}

/**
 * Listado del HISTORIAL con el mismo lenguaje de fila-documento que la
 * jornada: la lista define las columnas una vez y cada fila las hereda con
 * subgrid. La fila entera es el botón que abre la ficha — Editar/Eliminar
 * viven en la ficha (nada de acciones flotantes duplicadas).
 */
export function DespachosLista({ despachos, onAbrirFicha }: DespachosListaProps) {
  return (
    <div className="historial-wrap">
      <section className="historial-lista" aria-label="Despachos del historial">
        {/* Cabecera visual de columnas (solo guía al ojo): los lectores de
            pantalla obtienen el contenido de las celdas, que se describen
            solas — mismo patrón que la cabecera de la jornada. */}
        <div className="fila-despacho fila-cabecera" aria-hidden="true">
          <span>Fecha</span>
          <span>Doc.</span>
          <span>Guía</span>
          <span>Transporte</span>
          <span>Comuna</span>
          <span>Valor</span>
          <span>Bultos</span>
          <span>Peso</span>
          <span>Retiró</span>
        </div>

        {despachos.map((despacho) => (
          <DespachoFilaHistorica
            key={despacho.id}
            despacho={despacho}
            onAbrirFicha={onAbrirFicha}
          />
        ))}
      </section>
    </div>
  )
}

type DespachoFilaHistoricaProps = {
  despacho: Despacho
  onAbrirFicha: (despacho: Despacho) => void
}

function DespachoFilaHistorica({ despacho, onAbrirFicha }: DespachoFilaHistoricaProps) {
  const abrir = () => onAbrirFicha(despacho)

  return (
    <article
      className="fila-despacho"
      role="button"
      tabIndex={0}
      title="Abrir ficha del despacho"
      onClick={abrir}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          abrir()
        }
      }}
    >
      <time className="fila-hora" dateTime={despacho.despachadoAt}>
        {FORMATO_FECHA.format(new Date(despacho.despachadoAt))}
      </time>
      <span className="fila-doc">
        {despacho.tipoDocumento === 'factura' ? 'Fact.' : 'Bol.'} {despacho.numeroDocumento}
      </span>
      <span className="fila-num">{despacho.numeroGuia}</span>
      <span className="trunc" title={despacho.transporte}>
        {despacho.transporte}
      </span>
      <span className="trunc" title={despacho.comuna}>
        {despacho.comuna}
        {!despacho.comunaEnCatalogo ? (
          <span
            className="badge-warn"
            title="Comuna fuera del catálogo oficial"
            aria-label="Comuna fuera del catálogo"
          >
            ⚠
          </span>
        ) : null}
      </span>
      <span className="fila-num">{formatClp(despacho.valorClp)}</span>
      <span className="fila-num">{despacho.bultos}</span>
      <span className="fila-num" title={desglosePesos(despacho)}>
        {sumBultos(despacho.pesosBultos)} kg
      </span>
      <span className="trunc" title={despacho.retiradoPor ?? undefined}>
        {despacho.retiradoPor ?? '—'}
      </span>
    </article>
  )
}

/** Desglose de pesos para el tooltip de la celda Peso (como en la jornada). */
function desglosePesos(despacho: Despacho): string {
  return despacho.pesosBultos.map((peso, i) => `Bulto ${i + 1}: ${peso} kg`).join(', ')
}
