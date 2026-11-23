import * as React from 'react'
import type { Despacho } from '../schemas'

export type SeleccionExportacionProps = {
  despachos: readonly Despacho[]
  onExportar: (ids: readonly string[]) => void
  children: React.ReactNode
}

const IDS_VACIOS = new Set<string>()

/**
 * Coordina la selección temporal del conjunto visible.
 * Los ids ya existen en cada despacho; este componente solo guarda cuáles
 * fueron marcados y deja la exportación de datos al dashboard.
 */
export function SeleccionExportacion({
  despachos,
  onExportar,
  children,
}: SeleccionExportacionProps) {
  const [modoSeleccion, setModoSeleccion] = React.useState(false)
  const [seleccion, setSeleccion] = React.useState<{ clave: string; ids: Set<string> }>(() => ({
    clave: '',
    ids: new Set(),
  }))
  const claveVisibles = despachos.map(({ id }) => id).join('|')
  // Si la firma cambió, la selección anterior ya no pertenece a este conjunto visible.
  // Se considera vacía sin mutar estado ni disparar un render adicional.
  const idsSeleccionados = seleccion.clave === claveVisibles ? seleccion.ids : IDS_VACIOS

  const todosSeleccionados =
    despachos.length > 0 && despachos.every(({ id }) => idsSeleccionados.has(id))

  function alternarDespacho(id: string) {
    setSeleccion((anterior) => {
      const base = anterior.clave === claveVisibles ? anterior.ids : IDS_VACIOS
      const siguientes = new Set(base)
      if (siguientes.has(id)) siguientes.delete(id)
      else siguientes.add(id)
      return { clave: claveVisibles, ids: siguientes }
    })
  }

  function alternarTodos() {
    setSeleccion((anterior) => {
      const base = anterior.clave === claveVisibles ? anterior.ids : IDS_VACIOS
      const siguientes = new Set(base)
      if (todosSeleccionados) {
        despachos.forEach(({ id }) => siguientes.delete(id))
      } else {
        despachos.forEach(({ id }) => siguientes.add(id))
      }
      return { clave: claveVisibles, ids: siguientes }
    })
  }

  function cancelar() {
    setModoSeleccion(false)
    setSeleccion({ clave: claveVisibles, ids: new Set() })
  }

  function exportarSeleccionados() {
    onExportar([...idsSeleccionados])
  }

  return (
    <section className="seleccion-exportacion" aria-label="Selección para exportar">
      <div className="seleccion-exportacion-acciones">
        {!modoSeleccion ? (
          <button type="button" onClick={() => setModoSeleccion(true)}>
            Marcar para exportar
          </button>
        ) : (
          <>
            <span className="muted" aria-live="polite">
              {idsSeleccionados.size} seleccionados
            </span>
            <button
              type="button"
              onClick={exportarSeleccionados}
              disabled={idsSeleccionados.size === 0}
            >
              Exportar seleccionados
            </button>
            <button type="button" className="btn-ghost" onClick={cancelar}>
              Cancelar
            </button>
          </>
        )}
      </div>

      {modoSeleccion ? (
        <div className="seleccion-exportacion-cuerpo">
          <aside className="seleccion-exportacion-gutter" aria-label="Despachos seleccionables">
            <label className="seleccion-exportacion-cabecera">
              <input
                type="checkbox"
                checked={todosSeleccionados}
                onChange={alternarTodos}
                disabled={despachos.length === 0}
                aria-label="Seleccionar todos los despachos visibles"
              />
            </label>
            {despachos.map((despacho) => (
              <label className="seleccion-exportacion-checkbox" key={despacho.id}>
                <input
                  type="checkbox"
                  checked={idsSeleccionados.has(despacho.id)}
                  onChange={() => alternarDespacho(despacho.id)}
                  aria-label={`Seleccionar despacho ${despacho.numeroDocumento}`}
                />
              </label>
            ))}
          </aside>
          <div className="seleccion-exportacion-lista">{children}</div>
        </div>
      ) : (
        children
      )}
    </section>
  )
}
