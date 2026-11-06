import * as React from 'react'
import type { DespachoFiltrosUrl } from '../schemas'
import { DESPACHOS_POR_PAGINA_DEFAULT } from '../schemas'
import { hayFiltrosActivos } from '../service'

const TIPOS_DOCUMENTO_FILTRO = [
  { value: '', label: 'Todos' },
  { value: 'factura', label: 'Factura' },
  { value: 'boleta', label: 'Boleta' },
] as const

/** Opciones del selector "Mostrar" (tamaño de página ⇒ ?porPagina=N en la URL). */
const OPCIONES_MOSTRAR = [50, 100, 150, 200] as const
/** El borrador de texto no le pega a la URL (ni a la base) por cada tecla. */
const MS_DEBOUNCE = 350

export type BuscadorFiltrosProps = {
  /** Filtros vigentes (dueño del estado: la URL). */
  filtros: DespachoFiltrosUrl
  /** Commitea cambios de filtro (la URL los valida con Zod). */
  onCambiar: (cambios: Partial<DespachoFiltrosUrl>) => void
  onLimpiar: () => void
}

/**
 * Barra de filtros del historial. Contrato de estados:
 * - selects y fechas: commit INMEDIATO a la URL (el Router es el dueño).
 * - el texto libre (q): borrador local + commit con debounce — cada filtro
 *   nuevo en la URL es una query en el cache de TanStack Query, no puede
 *   haber una por tecla.
 * - borrador local ↔ URL: "adjust state on props change" (link compartido
 *   o Limpiar escriben la URL y el borrador se alinea).
 */
export function BuscadorFiltros({ filtros, onCambiar, onLimpiar }: BuscadorFiltrosProps) {
  const [q, setQ] = React.useState(filtros.q ?? '')
  const [qUrlPrevio, setQUrlPrevio] = React.useState(filtros.q ?? '')

  // Ajuste durante render cuando cambia el dueño externo (URL/back/forward,
  // enlace compartido o Limpiar), evitando un render atrasado vía effect.
  if (qUrlPrevio !== (filtros.q ?? '')) {
    setQUrlPrevio(filtros.q ?? '')
    setQ(filtros.q ?? '')
  }

  // Commit con debounce: el timer siempre dispara contra el callback vigente.
  const onCambiarRef = React.useRef(onCambiar)
  React.useEffect(() => {
    onCambiarRef.current = onCambiar
  })

  React.useEffect(() => {
    if (q === (filtros.q ?? '')) return
    const timer = window.setTimeout(
      () => onCambiarRef.current({ q: q.trim() || undefined }),
      MS_DEBOUNCE,
    )
    return () => window.clearTimeout(timer)
  }, [q, filtros.q])

  return (
    <div className="filtros">
      <div className="filtros-grid">
        <label className="filtros-q">
          Buscar
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="N° doc, N° guía, transporte, comuna, contacto…"
            aria-label="Buscar despachos"
          />
        </label>

        <label>
          Desde
          <input
            type="date"
            value={filtros.desde ?? ''}
            onChange={(e) => onCambiar({ desde: e.target.value || undefined })}
            aria-label="Fecha de despacho desde"
          />
        </label>

        <label>
          Hasta
          <input
            type="date"
            value={filtros.hasta ?? ''}
            onChange={(e) => onCambiar({ hasta: e.target.value || undefined })}
            aria-label="Fecha de despacho hasta"
          />
        </label>

        <label>
          Doc.
          <select
            value={filtros.tipoDocumento ?? ''}
            onChange={(e) =>
              onCambiar({
                tipoDocumento: (e.target.value || undefined) as DespachoFiltrosUrl['tipoDocumento'],
              })
            }
            aria-label="Tipo de documento"
          >
            {TIPOS_DOCUMENTO_FILTRO.map((tipo) => (
              <option key={tipo.value} value={tipo.value}>
                {tipo.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Mostrar
          <select
            value={filtros.porPagina ?? DESPACHOS_POR_PAGINA_DEFAULT}
            onChange={(e) => onCambiar({ porPagina: Number(e.target.value) })}
            aria-label="Cantidad de despachos por página"
          >
            {OPCIONES_MOSTRAR.map((opcion) => (
              <option key={opcion} value={opcion}>
                {opcion}
              </option>
            ))}
          </select>
        </label>

        {hayFiltrosActivos(filtros) ? (
          <button type="button" className="btn-ghost" onClick={onLimpiar}>
            Limpiar
          </button>
        ) : null}
      </div>
    </div>
  )
}
