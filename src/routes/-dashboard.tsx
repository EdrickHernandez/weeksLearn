import * as React from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { signOutFn } from '~/features/auth/functions'
import { useSessionQuery } from '~/features/auth/queries/use-session'
import { DespachoApiError } from '~/features/despachos/unwrap'
import type { Despacho, DespachoInput } from '~/features/despachos/schemas'
import { DESPACHOS_LIMITE_LISTADO } from '~/features/despachos/schemas'
import { useCreateDespachoMutation } from '~/features/despachos/mutations/use-create-despacho'
import { useDeleteDespachoMutation } from '~/features/despachos/mutations/use-delete-despacho'
import { useUpdateDespachoMutation } from '~/features/despachos/mutations/use-update-despacho'
import { DespachoForm } from '~/features/despachos/components/despacho-form'
import { DespachoFicha } from '~/features/despachos/components/despacho-ficha'
import { DespachoFila } from '~/features/despachos/components/despacho-fila'
import { DespachosTable } from '~/features/despachos/components/despachos-table'
import { useDespachosQuery } from '~/features/despachos/queries/use-despachos'
import {
  despachosDelDia,
  extractTransporteSuggestions,
  formatoFechaJornada,
  formatClp,
  searchDespachos,
  sumValorClp,
} from '~/features/despachos/service'
import { Route } from './index'

type ModoForm = { modo: 'cerrado' } | { modo: 'crear' }

type Ficha = { despacho: Despacho; editando: boolean }

function mensajeDeError(error: unknown): string {
  if (error instanceof DespachoApiError) {
    return error.status === 401 ? 'Tu sesión expiró. Vuelve a iniciar sesión.' : error.message
  }
  return 'Ocurrió un error inesperado. Intenta de nuevo.'
}

/** Barra mínima de sesión: confirma el email autenticado y permite salir. */
function BarraSesion() {
  const router = useRouter()
  const { data: user } = useSessionQuery()

  async function handleSignOut() {
    await signOutFn()
    await router.invalidate()
    router.navigate({ to: '/login' })
  }

  return (
    <div className="card session-bar">
      <p>
        Sesión: <strong>{user?.email ?? '…'}</strong>
      </p>
      <button type="button" className="btn-ghost" onClick={handleSignOut}>
        Cerrar sesión
      </button>
    </div>
  )
}

export function DashboardPage() {
  const { q } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: despachos, isPending, isError, error, refetch } = useDespachosQuery()

  const crear = useCreateDespachoMutation()
  const actualizar = useUpdateDespachoMutation()
  const eliminar = useDeleteDespachoMutation()

  const [form, setForm] = React.useState<ModoForm>({ modo: 'cerrado' })
  const formAbierto = form.modo !== 'cerrado'

  // --- La ficha (dialog nativo) ---
  // El <dialog> maneja foco y Escape; el estado solo recuerda QUÉ despacho
  // se está viendo y si está en modo edición. El flujo de cierre SIEMPRE
  // pasa por dialog.close() → onClose limpia el estado.
  const refDialog = React.useRef<HTMLDialogElement>(null)
  const [ficha, setFicha] = React.useState<Ficha | null>(null)

  function abrirFicha(despacho: Despacho) {
    setFicha({ despacho, editando: false })
    refDialog.current?.showModal()
  }

  function cerrarFicha() {
    refDialog.current?.close() // onClose del <dialog> hace el resto
  }

  // La jornada: el reloj se congela al montar (una vez por visita), no por
  // render. useState con inicializador = el patrón "fijar al montar".
  const [ahora] = React.useState(() => new Date())
  const delDia = React.useMemo(
    () => (despachos ? despachosDelDia(despachos, ahora) : []),
    [despachos, ahora],
  )

  // Día vacío → la pantalla abre directo en el registro. Los datos llegan
  // async, así que no puede decidirse en el useState inicial: se ajusta
  // DURANTE el render (patrón "adjust state on props change" de React),
  // una sola vez. Si el usuario lo cierra, la jornada queda con su botón.
  const [autoAbierto, setAutoAbierto] = React.useState(false)
  if (despachos && despachos.length === 0 && !autoAbierto && form.modo === 'cerrado') {
    setAutoAbierto(true)
    setForm({ modo: 'crear' })
  }

  const filtrados = React.useMemo(() => searchDespachos(despachos ?? [], q ?? ''), [despachos, q])

  const sugerenciasTransporte = React.useMemo(
    () => extractTransporteSuggestions(despachos ?? []),
    [despachos],
  )

  // El form de pantalla completa SOLO crea; la edición vive en la ficha
  // (dialog) con el mismo DespachoForm montado adentro.
  const errorDeServidor = crear.error ? mensajeDeError(crear.error) : null

  function handleGuardar(input: DespachoInput) {
    crear.mutate(input, { onSuccess: () => setForm({ modo: 'cerrado' }) })
  }

  function cambiarFiltro(valor: string) {
    const limpio = valor.trim()
    void navigate({ search: limpio ? { q: limpio } : {}, replace: true })
  }

  const hayFiltro = Boolean(q)

  /**
   * Modelo de pantalla:
   * - Form de creación → pantalla completa (la tarea principal).
   * - Click en fila → ficha en <dialog>: ver todo, editar (el MISMO
   *   DespachoForm montado dentro) o eliminar. Click fuera / Escape → cerrar.
   * - Default → solo la jornada; historial solo bajo búsqueda activa.
   */
  return (
    <main className="container">
      <BarraSesion />

      {formAbierto ? (
        <DespachoForm
          despacho={null}
          sugerenciasTransporte={sugerenciasTransporte}
          pending={crear.isPending}
          errorDeServidor={errorDeServidor}
          onGuardar={handleGuardar}
          onCancelar={() => setForm({ modo: 'cerrado' })}
        />
      ) : (
        <>
          <header className="jornada">
            <div>
              <h1 className="jornada-fecha">{formatoFechaJornada(ahora)}</h1>
              <p className="jornada-resumen" aria-live="polite">
                {delDia.length > 0
                  ? `${delDia.length === 1 ? '1 despacho' : `${delDia.length} despachos`} por ${formatClp(
                      sumValorClp(delDia),
                    )}`
                  : 'Hoy no ha salido nada todavía.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm({ modo: 'crear' })}
              disabled={eliminar.isPending}
            >
              Registrar despacho
            </button>
          </header>

          {isError ? (
            <div className="card" role="alert">
              <p className="status-error">{mensajeDeError(error)}</p>
              {error instanceof DespachoApiError && error.status === 401 ? (
                <p>
                  <Link to="/login">Ir a iniciar sesión</Link>
                </p>
              ) : (
                <button type="button" onClick={() => refetch()}>
                  Reintentar
                </button>
              )}
            </div>
          ) : isPending ? (
            <p className="card" role="status">
              Cargando despachos…
            </p>
          ) : (
            <>
              {delDia.length > 0 ? (
                <section className="jornada-lista" aria-label="Despachos de hoy">
                  {/* Cabecera visual de columnas (solo guía al ojo): los
                      lectores de pantalla obtienen el contenido de las celdas,
                      que se describen solas. */}
                  <div className="fila-despacho fila-cabecera" aria-hidden="true">
                    <span>Hora</span>
                    <span>Doc.</span>
                    <span>Guía</span>
                    <span>Transporte</span>
                    <span>Comuna</span>
                    <span>Valor</span>
                    <span>Bultos</span>
                    <span>Peso</span>
                    <span>Retiro</span>
                  </div>
                  {delDia.map((despacho) => (
                    <DespachoFila key={despacho.id} despacho={despacho} onAbrirFicha={abrirFicha} />
                  ))}
                </section>
              ) : null}

              <section className="busqueda" aria-label="Buscar en el historial">
                <div className="toolbar">
                  <input
                    type="search"
                    value={q ?? ''}
                    onChange={(e) => cambiarFiltro(e.target.value)}
                    placeholder="Buscar en el historial: N° doc, N° guía, transporte, comuna…"
                    aria-label="Buscar despachos"
                  />
                </div>

                {hayFiltro ? (
                  <>
                    {despachos.length === DESPACHOS_LIMITE_LISTADO ? (
                      <p className="muted">
                        Mostrando los {DESPACHOS_LIMITE_LISTADO} despachos más recientes. Usa el
                        filtro para acotar la búsqueda.
                      </p>
                    ) : null}

                    <p className="muted" aria-live="polite">
                      {filtrados.length} de {despachos.length} despachos
                    </p>

                    {filtrados.length === 0 ? (
                      <p className="card" role="status">
                        Sin resultados para «{q}» — prueba con otro término.
                      </p>
                    ) : (
                      <DespachosTable
                        despachos={filtrados}
                        eliminandoId={eliminar.isPending ? (eliminar.variables ?? null) : null}
                        onEditar={(despacho) => setFicha({ despacho, editando: false })}
                        onEliminar={(id) => eliminar.mutate(id)}
                      />
                    )}
                  </>
                ) : null}
              </section>
            </>
          )}
        </>
      )}

      {/* La ficha vive FUERA de las ramas: el dialog nativo bloquea el resto
          de la página, así que el fondo queda inaccesible mientras está
          abierto — sin estados que coordinar. */}
      <dialog
        ref={refDialog}
        className={`ficha${ficha?.editando ? ' ficha-editando' : ''}`}
        onClick={(e) => {
          // Click en el backdrop: el evento aterriza en el propio <dialog>
          // (el ::backdrop no es un elemento), no en su contenido.
          if (e.target === refDialog.current) cerrarFicha()
        }}
        onClose={() => setFicha(null)}
      >
        {ficha && !ficha.editando ? (
          <DespachoFicha
            despacho={ficha.despacho}
            onEditar={() => setFicha({ ...ficha, editando: true })}
            onEliminar={() => {
              eliminar.mutate(ficha.despacho.id)
              cerrarFicha()
            }}
          />
        ) : null}

        {ficha && ficha.editando ? (
          <>
            {/* Navegación del dialog: Atrás vuelve a la ficha de lectura.
                SVG inline con currentColor (pinta del color del texto):
                sin librería de íconos por UN glifo. Botón solo-ícono →
                necesita nombre accesible (aria-label). Además el cierre
                del form está apagado (mostrarCancelar=false) para no
                duplicar salidas. */}
            <button
              type="button"
              className="btn-ghost ficha-atras"
              aria-label="Volver a la ficha del despacho"
              title="Volver a la ficha"
              onClick={() => setFicha({ ...ficha, editando: false })}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <DespachoForm
              despacho={ficha.despacho}
              sugerenciasTransporte={sugerenciasTransporte}
              pending={actualizar.isPending}
              errorDeServidor={actualizar.error ? mensajeDeError(actualizar.error) : null}
              onGuardar={(input) =>
                actualizar.mutate({ ...input, id: ficha.despacho.id }, { onSuccess: cerrarFicha })
              }
              onCancelar={() => setFicha({ ...ficha, editando: false })}
              mostrarCancelar={false}
            />
          </>
        ) : null}
      </dialog>
    </main>
  )
}
