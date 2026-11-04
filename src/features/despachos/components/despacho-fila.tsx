import * as React from 'react'
import type { Despacho } from '../schemas'
import { formatClp, sumBultos } from '../service'

const FORMATO_HORA = new Intl.DateTimeFormat('es-CL', {
  hour: '2-digit',
  minute: '2-digit',
})

export type DespachoFilaProps = {
  despacho: Despacho
  onAbrirFicha: (despacho: Despacho) => void
}

/**
 * Fila-documento de la jornada: TODO el despacho visible en una línea
 * (las elásticas truncan con ellipsis + tooltip) y LA FILA ENTERA es el
 * botón que abre la ficha completa en el dialog — no hay acciones
 * flotantes: la ficha es descubrible, teclado (Enter/Espacio) y hover
 * incluidos.
 */
export function DespachoFila({ despacho, onAbrirFicha }: DespachoFilaProps) {
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
        {FORMATO_HORA.format(new Date(despacho.despachadoAt))}
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
      <span className="fila-num" title={sumTooltip(despacho)}>
        {sumBultos(despacho.pesosBultos)} kg
      </span>
      <span className="trunc" title={despacho.retiradoPor ?? undefined}>
        {despacho.retiradoPor ?? '—'}
      </span>
    </article>
  )
}

/** Desglose de pesos para el tooltip de la celda Peso. */
function sumTooltip(despacho: Despacho): string {
  return despacho.pesosBultos.map((peso, i) => `Bulto ${i + 1}: ${peso} kg`).join(', ')
}
