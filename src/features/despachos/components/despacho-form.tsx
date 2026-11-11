import * as React from 'react'
import { despachoInputSchema, type Despacho, type DespachoInput } from '../schemas'
import { COMUNAS, formatoMiles, formatoTelefono, RETIROS_BASE, soloDigitos } from '../service'

const TIPOS_DOCUMENTO = [
  { value: 'factura', label: 'Factura' },
  { value: 'boleta', label: 'Boleta' },
] as const

const TIPOS_EMBALAJE = [
  { value: 'caja', label: 'Caja' },
  { value: 'pallet', label: 'Pallet' },
  { value: 'alusado', label: 'Alusado' },
] as const

const VEHICULOS = [
  { value: 'moto', label: 'Moto' },
  { value: 'furgon', label: 'Furgón' },
  { value: 'camion', label: 'Camión' },
  { value: 'camioneta', label: 'Camioneta' },
  { value: 'otro', label: 'Otro' },
] as const

type FormState = {
  despachadoAt: string
  tipoDocumento: string
  numeroDocumento: string
  numeroGuia: string
  transporte: string
  comuna: string
  valorClp: string
  bultos: string
  pesosKg: string[]
  tipoEmbalaje: string
  direccion: string
  telefono: string
  contacto: string
  retiradoPor: string
  vehiculo: string
}

/** Fecha actual en formato datetime-local (YYYY-MM-DDTHH:mm, hora local). */
function ahoraLocal(): string {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

/** ISO UTC → formato datetime-local en hora local del navegador. */
function isoALocal(iso: string): string {
  const date = new Date(iso)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

function stateInicial(despacho?: Despacho | null): FormState {
  if (despacho) {
    return {
      despachadoAt: isoALocal(despacho.despachadoAt),
      tipoDocumento: despacho.tipoDocumento,
      numeroDocumento: despacho.numeroDocumento,
      numeroGuia: despacho.numeroGuia,
      transporte: despacho.transporte,
      comuna: despacho.comuna,
      valorClp: String(despacho.valorClp),
      bultos: String(despacho.bultos),
      pesosKg: despacho.pesosBultos.length > 0 ? despacho.pesosBultos.map(String) : [''],
      tipoEmbalaje: despacho.tipoEmbalaje,
      direccion: despacho.direccion ?? '',
      telefono: formatoTelefono(despacho.telefono) ?? '',
      contacto: despacho.contacto ?? '',
      retiradoPor: despacho.retiradoPor ?? '',
      vehiculo: despacho.vehiculo ?? '',
    }
  }
  return {
    despachadoAt: ahoraLocal(),
    tipoDocumento: 'boleta',
    numeroDocumento: '',
    numeroGuia: '',
    transporte: '',
    comuna: '',
    valorClp: '',
    bultos: '1',
    pesosKg: [''],
    tipoEmbalaje: 'caja',
    direccion: '',
    telefono: '',
    contacto: '',
    retiradoPor: '',
    vehiculo: '',
  }
}

/** Contrato del form (strings crudos) → DespachoInput validable por Zod. El navegador convierte la fecha local a ISO UTC con su zona. */
function aDespachoInput(state: FormState): DespachoInput {
  const texto = (valor: string) => {
    const trimmed = valor.trim()
    return trimmed ? trimmed : undefined
  }
  return {
    despachadoAt: new Date(state.despachadoAt).toISOString(),
    tipoDocumento: state.tipoDocumento as DespachoInput['tipoDocumento'],
    numeroDocumento: state.numeroDocumento.trim(),
    numeroGuia: state.numeroGuia.trim(),
    transporte: state.transporte.trim(),
    comuna: state.comuna.trim(),
    valorClp: Number(state.valorClp),
    bultos: Number(state.bultos),
    pesosKg: state.pesosKg.map((peso) => Number(peso)),
    tipoEmbalaje: state.tipoEmbalaje as DespachoInput['tipoEmbalaje'],
    direccion: texto(state.direccion),
    telefono: texto(state.telefono),
    contacto: texto(state.contacto),
    retiradoPor: texto(state.retiradoPor),
    vehiculo: (state.vehiculo || undefined) as DespachoInput['vehiculo'],
  }
}

export type DespachoFormProps = {
  /** Despacho a editar, o null para crear. */
  despacho?: Despacho | null
  sugerenciasTransporte: readonly string[]
  pending: boolean
  errorDeServidor: string | null
  onGuardar: (input: DespachoInput) => void
  onCancelar: () => void
  /** El anfitrión que ofrece su propio control de vuelta (p. ej. la ficha
      con su botón Atrás) puede apagar este Cancelar para no duplicar. */
  mostrarCancelar?: boolean
}

/**
 * Tres momentos de validación con UNA sola fuente de verdad (Zod):
 *   onChange → transporte del valor (cada tecla llega al estado).
 *   onBlur   → revisión del campo que se abandona: error temprano, sin
 *              esperar el submit. La regla cruzada bultos↔pesos vive acá
 *              en su versión "en vivo".
 *   submit   → el muro final: schema completo + reglas cruzadas oficiales.
 */
export function DespachoForm({
  despacho,
  sugerenciasTransporte,
  pending,
  errorDeServidor,
  onGuardar,
  onCancelar,
  mostrarCancelar = true,
}: DespachoFormProps) {
  const [state, setState] = React.useState<FormState>(() => stateInicial(despacho))
  const [errores, setErrores] = React.useState<Record<string, string>>({})

  // El N° de documento es la llave mental del operador: el cursor lo espera ahí.
  const refNumeroDocumento = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    refNumeroDocumento.current?.focus()
  }, [])

  /* ------ helpers de estado ------ */

  const set = (campo: keyof FormState) => (valor: string) => {
    setState((previo) => ({ ...previo, [campo]: valor }))
    // Error vivo: si el campo estaba marcado y el usuario corrige, se perdona
    // mientras escribe — el próximo blur (o Guardar) re-verifica.
    limpiarError(campo)
  }

  function limpiarError(clave: string) {
    setErrores((previo) => {
      if (!(clave in previo)) return previo
      const proximo = { ...previo }
      delete proximo[clave]
      return proximo
    })
  }

  /** Cambia la cantidad de bultos y redimensiona los pesos, conservando lo escrito. */
  const setBultos = (valor: string) => {
    setState((previo) => {
      const cantidad = Math.max(0, Math.min(10_000, Number(valor) || 0))
      const pesos = [...previo.pesosKg]
      while (pesos.length < cantidad) pesos.push('')
      pesos.length = cantidad
      return { ...previo, bultos: valor, pesosKg: pesos }
    })
    limpiarError('bultos')
  }

  const setPesoBulto = (indice: number) => (valor: string) => {
    setState((previo) => ({
      ...previo,
      pesosKg: previo.pesosKg.map((peso, i) => (i === indice ? valor : peso)),
    }))
    limpiarError(`pesosKg.${indice}`)
  }

  /* ------ validación temprana (onBlur) ------ */

  /** Revisa el par cruzado bultos ↔ pesos con el estado ACTUAL del render. */
  function validarParBultosYPesos() {
    setErrores((previo) => {
      const proximo = { ...previo }
      const cantidad = Number(state.bultos)
      const parCoherente =
        state.bultos !== '' && Number.isFinite(cantidad) && cantidad === state.pesosKg.length
      if (!parCoherente) {
        proximo['bultos'] = `Hay ${state.pesosKg.length} bultos pero ${
          state.pesosKg.length === 1 ? '1 peso' : `${state.pesosKg.length} pesos`
        } registrados`
      } else {
        delete proximo['bultos']
      }
      // Cada peso se revisa una por una (mismos límites que el schema).
      state.pesosKg.forEach((raw, indice) => {
        const limite = Number(raw)
        if (raw.trim() === '') {
          proximo[`pesosKg.${indice}`] = 'Registra el peso del bulto'
        } else if (!Number.isFinite(limite) || limite < 0 || limite > 50_000) {
          proximo[`pesosKg.${indice}`] = 'Peso inválido (0 a 50.000 kg)'
        } else {
          delete proximo[`pesosKg.${indice}`]
        }
      })
      return proximo
    })
  }

  /** Valida UN campo contra su pedazo del schema (la fuente única). */
  function validarCampo(campo: keyof FormState) {
    if (campo === 'bultos' || campo === 'pesosKg') {
      validarParBultosYPesos()
      return
    }
    try {
      const input = aDespachoInput(state)
      const resultado = despachoInputSchema.shape[campo].safeParse(input[campo])
      setErrores((previo) => {
        const proximo = { ...previo }
        if (resultado.success) {
          delete proximo[campo]
        } else {
          proximo[campo] ??= resultado.error.issues[0].message
        }
        return proximo
      })
    } catch {
      // aDespachoInput lanza solo si la fecha no es interpretable por Date.
      setErrores((previo) => ({
        ...previo,
        [campo]: campo === 'despachadoAt' ? 'Fecha y hora inválida' : 'Valor inválido',
      }))
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = despachoInputSchema.safeParse(aDespachoInput(state))
    if (!parsed.success) {
      const porCampo: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        // Los paths anidados llegan como ['pesosKg', 1] → clave "pesosKg.1".
        const campo = issue.path.length > 0 ? issue.path.join('.') : 'form'
        porCampo[campo] ??= issue.message
      }
      setErrores(porCampo)
      return
    }
    setErrores({})
    onGuardar(parsed.data)
  }

  return (
    <form className="card" onSubmit={handleSubmit} noValidate>
      <h2>{despacho ? 'Editar despacho' : 'Nuevo despacho'}</h2>

      <div className="form-grid">
        <label>
          Fecha y hora
          <input
            type="datetime-local"
            value={state.despachadoAt}
            onChange={(e) => set('despachadoAt')(e.target.value)}
            onBlur={() => validarCampo('despachadoAt')}
            required
            disabled={pending}
          />
          {errores.despachadoAt ? (
            <span className="field-error">{errores.despachadoAt}</span>
          ) : null}
        </label>

        <label>
          Tipo de documento
          <select
            value={state.tipoDocumento}
            onChange={(e) => set('tipoDocumento')(e.target.value)}
            onBlur={() => validarCampo('tipoDocumento')}
            disabled={pending}
          >
            {TIPOS_DOCUMENTO.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {errores.tipoDocumento ? (
            <span className="field-error">{errores.tipoDocumento}</span>
          ) : null}
        </label>

        <label>
          N° documento
          <input
            ref={refNumeroDocumento}
            type="text"
            value={state.numeroDocumento}
            onChange={(e) => set('numeroDocumento')(e.target.value)}
            onBlur={() => validarCampo('numeroDocumento')}
            placeholder="1.639.758"
            required
            disabled={pending}
          />
          {errores.numeroDocumento ? (
            <span className="field-error">{errores.numeroDocumento}</span>
          ) : null}
        </label>

        <label>
          N° guía
          <input
            type="text"
            value={state.numeroGuia}
            onChange={(e) => set('numeroGuia')(e.target.value)}
            onBlur={() => validarCampo('numeroGuia')}
            placeholder="1.386.677"
            required
            disabled={pending}
          />
          {errores.numeroGuia ? <span className="field-error">{errores.numeroGuia}</span> : null}
        </label>

        <label>
          Comuna
          <input
            list="sugerencias-comuna"
            type="text"
            value={state.comuna}
            onChange={(e) => set('comuna')(e.target.value)}
            onBlur={() => validarCampo('comuna')}
            placeholder="Providencia…"
            required
            disabled={pending}
          />
          <datalist id="sugerencias-comuna">
            {COMUNAS.map((nombre) => (
              <option key={nombre} value={nombre} />
            ))}
          </datalist>
          {errores.comuna ? <span className="field-error">{errores.comuna}</span> : null}
        </label>

        <label>
          Dirección
          <input
            type="text"
            value={state.direccion}
            onChange={(e) => set('direccion')(e.target.value)}
            onBlur={() => validarCampo('direccion')}
            placeholder="Av. Providencia 123"
            disabled={pending}
          />
          {errores.direccion ? <span className="field-error">{errores.direccion}</span> : null}
        </label>

        <label>
          Transporte
          <input
            list="sugerencias-transporte"
            type="text"
            value={state.transporte}
            onChange={(e) => set('transporte')(e.target.value)}
            onBlur={() => validarCampo('transporte')}
            placeholder="Starken, Chilexpress…"
            required
            disabled={pending}
          />
          <datalist id="sugerencias-transporte">
            {sugerenciasTransporte.map((nombre) => (
              <option key={nombre} value={nombre} />
            ))}
          </datalist>
          {errores.transporte ? <span className="field-error">{errores.transporte}</span> : null}
        </label>

        <label>
          Valor (CLP)
          <input
            type="text"
            inputMode="numeric"
            value={formatoMiles(state.valorClp)}
            onChange={(e) => set('valorClp')(soloDigitos(e.target.value))}
            onBlur={() => validarCampo('valorClp')}
            placeholder="25.000"
            required
            disabled={pending}
          />
          {errores.valorClp ? <span className="field-error">{errores.valorClp}</span> : null}
        </label>

        {/* Separador de secciones: obligatorios + destino arriba, contacto
            y carga física abajo — los pesos por bulto nacen identificados
            seguidos al final, sea 1 bulto o 10. */}
        <hr className="form-separador" />

        <label>
          Teléfono
          <input
            type="tel"
            value={state.telefono}
            onChange={(e) => set('telefono')(e.target.value)}
            onBlur={() => {
              // La revisión PRIMERO (sobre lo tecleado, como hoy) y luego el
              // re-pintado en formato nacional. Directo con setState, sin el
              // set() oficial: su perdón en vivo borraria el error recién
              // creado — aquí no hay corrección en curso, es un cierre.
              validarCampo('telefono')
              const formateado = formatoTelefono(state.telefono)
              if (formateado && formateado !== state.telefono) {
                setState((previo) => ({ ...previo, telefono: formateado }))
              }
            }}
            placeholder="912345678"
            disabled={pending}
          />
          {errores.telefono ? (
            <span className="field-error">{errores.telefono}</span>
          ) : (
            <span className="muted">Ingresa los 9 dígitos (móvil o fijo)</span>
          )}
        </label>

        <label>
          Contacto
          <input
            type="text"
            value={state.contacto}
            onChange={(e) => set('contacto')(e.target.value)}
            onBlur={() => validarCampo('contacto')}
            placeholder="Juan Pérez"
            disabled={pending}
          />
          {errores.contacto ? <span className="field-error">{errores.contacto}</span> : null}
        </label>

        <label>
          Retirado por
          <input
            list="sugerencias-retiro"
            type="text"
            value={state.retiradoPor}
            onChange={(e) => set('retiradoPor')(e.target.value)}
            onBlur={() => validarCampo('retiradoPor')}
            placeholder="Nombre de quien retira"
            disabled={pending}
          />
          <datalist id="sugerencias-retiro">
            {RETIROS_BASE.map((nombre) => (
              <option key={nombre} value={nombre} />
            ))}
          </datalist>
          {errores.retiradoPor ? <span className="field-error">{errores.retiradoPor}</span> : null}
        </label>

        <label>
          Vehículo
          <select
            value={state.vehiculo}
            onChange={(e) => set('vehiculo')(e.target.value)}
            onBlur={() => validarCampo('vehiculo')}
            disabled={pending}
          >
            <option value="">—</option>
            {VEHICULOS.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
          {errores.vehiculo ? <span className="field-error">{errores.vehiculo}</span> : null}
        </label>

        <label>
          Bultos
          <input
            type="number"
            min="1"
            step="1"
            value={state.bultos}
            onChange={(e) => setBultos(e.target.value)}
            onBlur={() => validarCampo('bultos')}
            required
            disabled={pending}
          />
          {errores.bultos ? <span className="field-error">{errores.bultos}</span> : null}
        </label>

        <label>
          Embalaje
          <select
            value={state.tipoEmbalaje}
            onChange={(e) => set('tipoEmbalaje')(e.target.value)}
            onBlur={() => validarCampo('tipoEmbalaje')}
            disabled={pending}
          >
            {TIPOS_EMBALAJE.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        {state.pesosKg.map((peso, indice) => (
          <label key={indice}>
            Peso bulto {indice + 1} (kg)
            <input
              type="number"
              min={state.tipoEmbalaje === 'pallet' ? '0' : '0.01'}
              step="0.01"
              value={peso}
              onChange={(e) => setPesoBulto(indice)(e.target.value)}
              onBlur={() => validarCampo('pesosKg')}
              placeholder={state.tipoEmbalaje === 'pallet' ? '0.00 (pallet)' : '12.5'}
              required
              disabled={pending}
            />
            {errores[`pesosKg.${indice}`] ? (
              <span className="field-error">{errores[`pesosKg.${indice}`]}</span>
            ) : null}
          </label>
        ))}
      </div>

      {errorDeServidor ? (
        <p className="status-error" role="alert">
          {errorDeServidor}
        </p>
      ) : null}

      <div className="form-acciones">
        {mostrarCancelar ? (
          <button type="button" className="btn-ghost" onClick={onCancelar} disabled={pending}>
            Cancelar
          </button>
        ) : null}
        <button type="submit" disabled={pending}>
          {pending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
