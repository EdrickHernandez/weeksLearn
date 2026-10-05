import * as React from 'react'
import { despachoInputSchema, type Despacho, type DespachoInput } from '../schemas'
import { COMUNAS, formatClp } from '../service'

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
      telefono: despacho.telefono ?? '',
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
}

export function DespachoForm({
  despacho,
  sugerenciasTransporte,
  pending,
  errorDeServidor,
  onGuardar,
  onCancelar,
}: DespachoFormProps) {
  const [state, setState] = React.useState<FormState>(() => stateInicial(despacho))
  const [errores, setErrores] = React.useState<Record<string, string>>({})

  const set = (campo: keyof FormState) => (valor: string) =>
    setState((previo) => ({ ...previo, [campo]: valor }))

  /** Cambia la cantidad de bultos y redimensiona los pesos, conservando lo escrito. */
  const setBultos = (valor: string) => {
    setState((previo) => {
      const cantidad = Math.max(0, Math.min(10_000, Number(valor) || 0))
      const pesos = [...previo.pesosKg]
      while (pesos.length < cantidad) pesos.push('')
      pesos.length = cantidad
      return { ...previo, bultos: valor, pesosKg: pesos }
    })
  }

  const setPesoBulto = (indice: number) => (valor: string) =>
    setState((previo) => ({
      ...previo,
      pesosKg: previo.pesosKg.map((peso, i) => (i === indice ? valor : peso)),
    }))

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

  const valorPreview =
    Number.isFinite(Number(state.valorClp)) && state.valorClp !== ''
      ? formatClp(Number(state.valorClp))
      : null

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
            disabled={pending}
          >
            {TIPOS_DOCUMENTO.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          N° documento
          <input
            value={state.numeroDocumento}
            onChange={(e) => set('numeroDocumento')(e.target.value)}
            placeholder="F-001"
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
            value={state.numeroGuia}
            onChange={(e) => set('numeroGuia')(e.target.value)}
            placeholder="G-100"
            required
            disabled={pending}
          />
          {errores.numeroGuia ? <span className="field-error">{errores.numeroGuia}</span> : null}
        </label>

        <label>
          Transporte
          <input
            list="sugerencias-transporte"
            value={state.transporte}
            onChange={(e) => set('transporte')(e.target.value)}
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
          Comuna
          <input
            list="sugerencias-comuna"
            value={state.comuna}
            onChange={(e) => set('comuna')(e.target.value)}
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
          Valor (CLP)
          <input
            type="number"
            min="1"
            step="1"
            value={state.valorClp}
            onChange={(e) => set('valorClp')(e.target.value)}
            placeholder="25000"
            required
            disabled={pending}
          />
          {valorPreview ? <span className="muted">{valorPreview}</span> : null}
          {errores.valorClp ? <span className="field-error">{errores.valorClp}</span> : null}
        </label>

        <label>
          Bultos
          <input
            type="number"
            min="1"
            step="1"
            value={state.bultos}
            onChange={(e) => setBultos(e.target.value)}
            required
            disabled={pending}
          />
          {errores.bultos ? <span className="field-error">{errores.bultos}</span> : null}
          {errores.pesosKg && !errores.bultos ? (
            <span className="field-error">{errores.pesosKg}</span>
          ) : null}
        </label>

        <label>
          Embalaje
          <select
            value={state.tipoEmbalaje}
            onChange={(e) => set('tipoEmbalaje')(e.target.value)}
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
              placeholder={state.tipoEmbalaje === 'pallet' ? '0.00 (pallet)' : '12.5'}
              required
              disabled={pending}
            />
            {errores[`pesosKg.${indice}`] ? (
              <span className="field-error">{errores[`pesosKg.${indice}`]}</span>
            ) : null}
          </label>
        ))}

        <label>
          Dirección
          <input
            value={state.direccion}
            onChange={(e) => set('direccion')(e.target.value)}
            placeholder="Av. Providencia 123"
            disabled={pending}
          />
        </label>

        <label>
          Teléfono
          <input
            type="tel"
            value={state.telefono}
            onChange={(e) => set('telefono')(e.target.value)}
            placeholder="+56912345678"
            disabled={pending}
          />
        </label>

        <label>
          Contacto
          <input
            value={state.contacto}
            onChange={(e) => set('contacto')(e.target.value)}
            placeholder="Juan Pérez"
            disabled={pending}
          />
        </label>

        <label>
          Retirado por
          <input
            value={state.retiradoPor}
            onChange={(e) => set('retiradoPor')(e.target.value)}
            placeholder="Nombre de quien retira"
            disabled={pending}
          />
        </label>

        <label>
          Vehículo
          <select
            value={state.vehiculo}
            onChange={(e) => set('vehiculo')(e.target.value)}
            disabled={pending}
          >
            <option value="">—</option>
            {VEHICULOS.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {errorDeServidor ? (
        <p className="status-error" role="alert">
          {errorDeServidor}
        </p>
      ) : null}

      <div className="row-actions">
        <button type="submit" disabled={pending}>
          {pending ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancelar} disabled={pending}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
