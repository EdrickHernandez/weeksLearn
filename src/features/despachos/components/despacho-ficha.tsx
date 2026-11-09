import * as React from 'react'
import type { Despacho } from '../schemas'
import { formatClp, sumBultos, formatoTelefono } from '../service'

const FORMATO_FECHA = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

export type DespachoFichaProps = {
  despacho: Despacho
  onEditar: () => void
  onEliminar: () => void
}

/** Par etiqueta/valor de la ficha: etiqueta tenue, dato en tinta. */
function Dato({
  etiqueta,
  title,
  children,
}: {
  etiqueta: string
  title?: string
  children: React.ReactNode
}) {
  return (
    <div className="ficha-dato">
      <span className="ficha-etiqueta">{etiqueta}</span>
      <span title={title}>{children}</span>
    </div>
  )
}

/**
 * Ficha completa del despacho dentro del dialog: TODO lo que la fila
 * trunca u omite (dirección, teléfono, contacto, vehículo, desglose de
 * pesos, fecha completa). Solo lectura + acciones — la edición la hace el
 * DespachoForm que se monta en el MISMO dialog (una sola superficie de
 * edición, dos anfitriones).
 */
export function DespachoFicha({ despacho, onEditar, onEliminar }: DespachoFichaProps) {
  // Confirmación inline de borrado: estado local de componente.
  const [confirmando, setConfirmando] = React.useState(false)
  const pesoTotal = sumBultos(despacho.pesosBultos)
  const desglose = despacho.pesosBultos.map((peso, i) => `Bulto ${i + 1}: ${peso} kg`).join(', ')

  return (
    <>
      <h2 className="ficha-titulo fila-doc">
        {despacho.tipoDocumento === 'factura' ? 'Fact.' : 'Bol.'} {despacho.numeroDocumento}
      </h2>
      <p className="ficha-fecha">{FORMATO_FECHA.format(new Date(despacho.despachadoAt))}</p>

      <div className="ficha-datos">
        <Dato etiqueta="Guía">{despacho.numeroGuia}</Dato>
        <Dato etiqueta="Transporte">{despacho.transporte}</Dato>
        <Dato etiqueta="Comuna">
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
        </Dato>
        <Dato etiqueta="Valor">{formatClp(despacho.valorClp)}</Dato>
        <Dato etiqueta="Bultos">{despacho.bultos}</Dato>
        <Dato etiqueta="Peso total" title={desglose}>
          {pesoTotal} kg
        </Dato>
        <Dato etiqueta="Dirección">{despacho.direccion ?? '—'}</Dato>
        <Dato etiqueta="Teléfono">{formatoTelefono(despacho.telefono) ?? '—'}</Dato>
        <Dato etiqueta="Contacto">{despacho.contacto ?? '—'}</Dato>
        <Dato etiqueta="Retiró">{despacho.retiradoPor ?? '—'}</Dato>
        <Dato etiqueta="Vehículo">{despacho.vehiculo ?? '—'}</Dato>
      </div>

      <div className="ficha-acciones">
        {confirmando ? (
          <div className="ficha-confirmar">
            <span>¿Eliminar este despacho?</span>
            <button type="button" className="btn-danger" onClick={onEliminar}>
              Sí, eliminar
            </button>
            <button type="button" className="btn-ghost" onClick={() => setConfirmando(false)}>
              No
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="btn-ghost btn-danger-text"
              onClick={() => setConfirmando(true)}
            >
              Eliminar
            </button>
            <button type="button" onClick={onEditar}>
              Editar despacho
            </button>
          </>
        )}
      </div>
    </>
  )
}
