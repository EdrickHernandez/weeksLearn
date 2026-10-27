import * as React from 'react'
import type { Despacho } from '../schemas'
import { formatClp, sumBultos } from '../service'

const FORMATO_HORA = new Intl.DateTimeFormat('es-CL', {
  hour: '2-digit',
  minute: '2-digit',
})

export type DespachoFilaProps = {
  despacho: Despacho
  /** Id cuya eliminación está en curso (para deshabilitar sus botones). */
  eliminandoId: string | null
  onEditar: (despacho: Despacho) => void
  onEliminar: (id: string) => void
}

/**
 * Fila-documento de la jornada: TODO el despacho visible en una línea grid,
 * sin scroll horizontal — las columnas elásticas truncan con ellipsis y
 * muestran el valor completo en tooltip. La fecha completa no se repite:
 * vive en el header de la jornada; aquí solo la hora.
 *
 * Acciones fantasma: al 20% de opacidad en reposo, plenas al hover o al
 * foco de teclado (:focus-within), siempre visibles en touch — ver CSS.
 */
export function DespachoFila({ despacho, eliminandoId, onEditar, onEliminar }: DespachoFilaProps) {
  // Confirmación inline de borrado: estado local de componente (convención).
  const [confirmando, setConfirmando] = React.useState(false)

  const pesoTotal = sumBultos(despacho.pesosBultos)
  const desglose = despacho.pesosBultos.map((peso, i) => `Bulto ${i + 1}: ${peso} kg`).join(', ')

  return (
    <article className="fila-despacho">
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
      <span className="fila-num" title={desglose}>
        {pesoTotal} kg
      </span>
      <span className="trunc" title={despacho.retiradoPor ?? undefined}>
        {despacho.retiradoPor ?? '—'}
      </span>
      <span className="row-actions">
        {confirmando ? (
          <>
            <button
              type="button"
              className="btn-danger"
              disabled={eliminandoId === despacho.id}
              onClick={() => {
                onEliminar(despacho.id)
                setConfirmando(false)
              }}
            >
              {eliminandoId === despacho.id ? '…' : 'Sí, eliminar'}
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={eliminandoId !== null}
              onClick={() => setConfirmando(false)}
            >
              No
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn-ghost"
              disabled={eliminandoId !== null}
              onClick={() => onEditar(despacho)}
            >
              Editar
            </button>
            <button
              type="button"
              className="btn-ghost btn-danger-text"
              disabled={eliminandoId !== null}
              onClick={() => setConfirmando(true)}
            >
              Eliminar
            </button>
          </>
        )}
      </span>
    </article>
  )
}
