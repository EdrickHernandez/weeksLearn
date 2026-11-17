import * as React from 'react'
import { entregaInputSchema, type EntregaInput } from '../schemas'
import arrowLeft from '../../../../icons/arrow-left (1).svg'

type TipoEntrega = 'cliente_final' | 'transporte_tercerizado'

export type EntregaFormProps = {
  onCancelar: () => void
  onGuardar: (input: EntregaInput) => void
  pending: boolean
  errorDeServidor: string | null
}

/**
 * Formulario visual de entrega.
 * En esta primera iteración solo define la superficie y los campos;
 * el guardado se conectará después a Zod y a la Server Function.
 */
export function EntregaForm({ onCancelar, onGuardar, pending, errorDeServidor }: EntregaFormProps) {
  const [tipo, setTipo] = React.useState<TipoEntrega | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const datos = new FormData(event.currentTarget)

    if (!tipo) {
      setError('Selecciona quién recibió el despacho')
      return
    }

    const input =
      tipo === 'cliente_final'
        ? {
            tipoEntrega: tipo,
            nombreCliente: String(datos.get('nombre-cliente') ?? ''),
            apellidoCliente: String(datos.get('apellido-cliente') ?? ''),
            rutCliente: String(datos.get('rut-cliente') ?? ''),
            entregaEstimadaAt: String(datos.get('entrega-estimada-at') ?? ''),
          }
        : {
            tipoEntrega: tipo,
            nombreTransporte: String(datos.get('nombre-transporte') ?? ''),
            ordenCompra: String(datos.get('orden-compra') ?? ''),
            rutTransporte: String(datos.get('rut-transporte') ?? ''),
            recibidoAt: String(datos.get('recibido-at') ?? ''),
            nombreRecibio: String(datos.get('nombre-recibio') ?? ''),
          }

    const resultado = entregaInputSchema.safeParse(input)
    if (!resultado.success) {
      setError(resultado.error.issues[0]?.message ?? 'Revisa los datos ingresados')
      return
    }

    setError(null)
    onGuardar(resultado.data)
  }

  return (
    <form className="entrega-form" onSubmit={handleSubmit}>
      <button
        type="button"
        className="btn-ghost ficha-atras"
        aria-label="Volver a la ficha del despacho"
        title="Volver a la ficha"
        onClick={onCancelar}
      >
        <img src={arrowLeft} alt="" aria-hidden="true" />
      </button>

      <div className="entrega-form-titulo">
        <div>
          <span className="ficha-etiqueta">Nueva recepción</span>
          <h2>Registrar entrega</h2>
        </div>
      </div>

      <fieldset className="entrega-tipos">
        <legend>¿Quién recibió el despacho?</legend>
        <div className="entrega-tipos-opciones">
          <label className={`entrega-tipo${tipo === 'cliente_final' ? ' seleccionado' : ''}`}>
            <input
              type="radio"
              name="tipo-entrega"
              value="cliente_final"
              checked={tipo === 'cliente_final'}
              onChange={() => setTipo('cliente_final')}
            />
            <span>
              <strong>Cliente final</strong>
              <small>Recepción respaldada por guía firmada</small>
            </span>
          </label>

          <label
            className={`entrega-tipo${tipo === 'transporte_tercerizado' ? ' seleccionado' : ''}`}
          >
            <input
              type="radio"
              name="tipo-entrega"
              value="transporte_tercerizado"
              checked={tipo === 'transporte_tercerizado'}
              onChange={() => setTipo('transporte_tercerizado')}
            />
            <span>
              <strong>Transporte tercerizado</strong>
              <small>Recepción respaldada por orden de compra</small>
            </span>
          </label>
        </div>
      </fieldset>

      {tipo === 'cliente_final' ? (
        <fieldset className="entrega-campos">
          <legend>Datos del cliente final</legend>
          <label>
            Nombre
            <input name="nombre-cliente" type="text" required />
          </label>
          <label>
            Apellido
            <input name="apellido-cliente" type="text" required />
          </label>
          <label>
            RUT
            <input name="rut-cliente" type="text" inputMode="text" required />
          </label>
          <label>
            Fecha y hora estimada
            <input name="entrega-estimada-at" type="datetime-local" required />
          </label>
        </fieldset>
      ) : null}

      {tipo === 'transporte_tercerizado' ? (
        <fieldset className="entrega-campos">
          <legend>Datos del transporte tercerizado</legend>
          <label>
            Nombre del transporte
            <input name="nombre-transporte" type="text" required />
          </label>
          <label>
            Orden de compra
            <input name="orden-compra" type="text" required />
          </label>
          <label>
            RUT del transporte
            <input name="rut-transporte" type="text" inputMode="text" required />
          </label>
          <label>
            Fecha y hora de recepción
            <input name="recibido-at" type="datetime-local" required />
          </label>
          <label>
            Nombre de quien recibió <span className="muted">(opcional)</span>
            <input name="nombre-recibio" type="text" />
          </label>
        </fieldset>
      ) : null}

      {error || errorDeServidor ? (
        <p className="status-error" role="alert">
          {error ?? errorDeServidor}
        </p>
      ) : null}

      <div className="ficha-acciones">
        <button type="button" className="btn-ghost" onClick={onCancelar} disabled={pending}>
          Cancelar
        </button>
        <button type="submit" disabled={pending || tipo === null}>
          {pending ? 'Guardando…' : 'Guardar entrega'}
        </button>
      </div>
    </form>
  )
}
