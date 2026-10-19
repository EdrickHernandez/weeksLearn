import * as React from 'react'
import type { Despacho } from '../schemas'
import { formatClp, sumBultos } from '../service'

const FORMATO_FECHA = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

export type DespachosTableProps = {
  despachos: readonly Despacho[]
  /** Id cuya eliminación está en curso (para deshabilitar sus botones). */
  eliminandoId: string | null
  onEditar: (despacho: Despacho) => void
  onEliminar: (id: string) => void
}

export function DespachosTable({
  despachos,
  eliminandoId,
  onEditar,
  onEliminar,
}: DespachosTableProps) {
  // Confirmación inline de borrado: estado local de componente (convención de estado).
  const [confirmandoId, setConfirmandoId] = React.useState<string | null>(null)

  return (
    <div className="table-wrap">
      <table className="despachos">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Doc.</th>
            <th>Guía</th>
            <th>Transporte</th>
            <th>Comuna</th>
            <th>Valor</th>
            <th>Bultos</th>
            <th>Peso</th>
            <th>Contacto</th>
            <th>Retiró</th>
            <th>Vehículo</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {despachos.map((despacho) => {
            const contacto = [despacho.contacto, despacho.telefono].filter(Boolean).join(' · ')
            const pesoTotal = sumBultos(despacho.pesosBultos)
            const desglose = despacho.pesosBultos
              .map((peso, i) => `Bulto ${i + 1}: ${peso} kg`)
              .join(', ')
            return (
              <tr key={despacho.id}>
                <td>{FORMATO_FECHA.format(new Date(despacho.despachadoAt))}</td>
                <td>
                  {despacho.tipoDocumento === 'factura' ? 'Fact.' : 'Bol.'}{' '}
                  {despacho.numeroDocumento}
                </td>
                <td>{despacho.numeroGuia}</td>
                <td>{despacho.transporte}</td>
                <td>
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
                </td>
                <td className="num">{formatClp(despacho.valorClp)}</td>
                <td className="num">{despacho.bultos}</td>
                <td className="num" title={desglose}>
                  {pesoTotal} kg
                </td>
                <td title={despacho.direccion ?? undefined}>{contacto || '—'}</td>
                <td>{despacho.retiradoPor ?? '—'}</td>
                <td>{despacho.vehiculo ?? '—'}</td>
                <td>
                  {confirmandoId === despacho.id ? (
                    <span className="row-actions">
                      <button
                        type="button"
                        className="btn-danger"
                        disabled={eliminandoId === despacho.id}
                        onClick={() => {
                          onEliminar(despacho.id)
                          setConfirmandoId(null)
                        }}
                      >
                        {eliminandoId === despacho.id ? '…' : 'Sí, eliminar'}
                      </button>
                      <button
                        type="button"
                        className="btn-ghost"
                        disabled={eliminandoId === despacho.id}
                        onClick={() => setConfirmandoId(null)}
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <span className="row-actions">
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
                        onClick={() => setConfirmandoId(despacho.id)}
                      >
                        Eliminar
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
