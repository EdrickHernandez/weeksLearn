import * as React from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { signOutFn } from '~/features/auth/functions'
import { useSessionQuery } from '~/features/auth/queries/use-session'
import { DespachoApiError } from '~/features/despachos/unwrap'
import type { Despacho, DespachoFiltrosUrl, DespachoInput } from '~/features/despachos/schemas'
import { DESPACHOS_POR_PAGINA_DEFAULT } from '~/features/despachos/schemas'
import { useCreateDespachoMutation } from '~/features/despachos/mutations/use-create-despacho'
import { useDeleteDespachoMutation } from '~/features/despachos/mutations/use-delete-despacho'
import { useUpdateDespachoMutation } from '~/features/despachos/mutations/use-update-despacho'
import { BuscadorFiltros } from '~/features/despachos/components/buscador-filtros'
import { DespachoForm } from '~/features/despachos/components/despacho-form'
import { DespachoFicha } from '~/features/despachos/components/despacho-ficha'
import { DespachoFila } from '~/features/despachos/components/despacho-fila'
import { DespachosLista } from '~/features/despachos/components/despachos-lista'
import { useDespachosQuery } from '~/features/despachos/queries/use-despachos'
import { exportarFiltro, exportarJornada } from '~/features/despachos/exportar-jornada'
import {
  despachosDelDia,
  extractTransporteSuggestions,
  formatoFechaJornada,
  formatClp,
  hayFiltrosActivos,
  sumValorClp,
} from '~/features/despachos/service'
import { Route } from './index'

type ModoForm = { modo: 'cerrado' } | { modo: 'crear' }

type Ficha = { despacho: Despacho; editando: boolean }

/** Página vacía compartida: referencialmente estable para los memo. */
const EMPTY: Despacho[] = []

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
  // Filtros de búsqueda: la URL es el dueño (validateSearch con Zod).
  const filtros = Route.useSearch()
  const navigate = Route.useNavigate()
  // Una sola definición de "hay búsqueda": la misma que usa validateSearch.
  const hayFiltros = hayFiltrosActivos(filtros)

  // Panel de filtros detrás del botón "Filtro" (jornada limpia por defecto).
  // Arranca abierto si la URL ya trae filtros activos: resultados filtrados
  // con sus criterios ocultos dejarían al operador sin línea de salida.
  const [filtrosAbierto, setFiltrosAbierto] = React.useState(hayFiltros)
  const { data, isPending, isFetching, isError, error, refetch } = useDespachosQuery(filtros)

  // Página plana + total del COUNT (viajan juntos desde la Server Function).
  // useMemo: cada render recrearía el `?? EMPTY` y rompería los memo aguas abajo.
  const despachos = React.useMemo(() => data?.despachos ?? EMPTY, [data])
  const total = data?.total ?? 0
  const paginaActual = filtros.pagina ?? 1
  const porPagina = filtros.porPagina ?? DESPACHOS_POR_PAGINA_DEFAULT
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina))

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
  // Con filtros activos el vacío es elecciones del filtro, no falta de
  // trabajo: no se auto-abre el form.
  const [autoAbierto, setAutoAbierto] = React.useState(false)
  if (
    !isPending &&
    !isError &&
    despachos.length === 0 &&
    !hayFiltros &&
    !autoAbierto &&
    form.modo === 'cerrado'
  ) {
    setAutoAbierto(true)
    setForm({ modo: 'crear' })
  }

  // Los resultados son server-side: lo que llega es lo filtrado, nada de
  // refiltrar el cache en el cliente.
  const sugerenciasTransporte = React.useMemo(
    () => extractTransporteSuggestions(despachos),
    [despachos],
  )

  // El form de pantalla completa SOLO crea; la edición vive en la ficha
  // (dialog) con el mismo DespachoForm montado adentro.
  const errorDeServidor = crear.error ? mensajeDeError(crear.error) : null

  function handleGuardar(input: DespachoInput) {
    crear.mutate(input, { onSuccess: () => setForm({ modo: 'cerrado' }) })
  }

  /** Commitea cambios de filtro a la URL (los valida validateSearch).
   *  Todo cambio reinicia la página: una página válida con los filtros
   *  anteriores puede ser vacía con los nuevos (offset fuera de rango). */
  function cambiarFiltros(cambios: Partial<DespachoFiltrosUrl>) {
    void navigate({
      search: (previo) => ({ ...previo, ...cambios, pagina: undefined }),
      replace: true,
    })
  }

  /** Cambia de página CONSERVANDO los filtros; la página 1 no ensucia la URL. */
  function cambiarPagina(paginaNueva: number) {
    void navigate({
      search: (previo) => ({ ...previo, pagina: paginaNueva > 1 ? paginaNueva : undefined }),
      replace: true,
    })
  }

  function limpiarFiltros() {
    void navigate({ search: {}, replace: true })
  }

  /**
   * Modelo de pantalla:
   * - Default → jornada: header + lista del día, sin filas cuando hay
   *   filtro activo (la búsqueda manda).
   * - Click en "Filtro" → panel de filtros + sección búsqueda.
   * - Click en fila → ficha en <dialog>: ver todo, editar (el MISMO
   *   DespachoForm montado dentro) o eliminar. Click fuera / Escape → cerrar.
   * - Exportar exporta lo que hay en pantalla: jornada si no hay filtros,
   *   resultados filtrados si los hay.
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
            <div className="jornada-acciones">
              {/* Exporta lo que hay en pantalla: la jornada si no hay
                  filtros, el resultado filtrado si los hay (nombre con
                  sufijo -filtro para no confundir los archivos). */}
              {(hayFiltros ? despachos.length > 0 : delDia.length > 0) && (
                <button
                  type="button"
                  onClick={() =>
                    void (hayFiltros
                      ? exportarFiltro(despachos, ahora)
                      : exportarJornada(delDia, ahora))
                  }
                  title={
                    hayFiltros
                      ? 'Descarga el Excel de los despachos filtrados'
                      : 'Descarga el Excel de la jornada de hoy'
                  }
                >
                  Exportar
                </button>
              )}
              {/* El panel vive fuera de este <header> (desplegable de la
                  jornada); el id lo ancora para aria-expanded/controls. */}
              <button
                type="button"
                onClick={() => setFiltrosAbierto((abierto) => !abierto)}
                aria-expanded={filtrosAbierto}
                aria-controls="panel-filtros"
                title="Mostrar u ocultar los filtros de búsqueda"
              >
                Filtro
              </button>
              <button
                type="button"
                onClick={() => setForm({ modo: 'crear' })}
                disabled={eliminar.isPending}
              >
                Registrar despacho
              </button>
            </div>
          </header>

          {/* Despliegue condicional (monta/desmonta): cada apertura re-leerá
              los borradores desde la URL, sin estado residual. */}
          {filtrosAbierto ? (
            <div id="panel-filtros">
              <BuscadorFiltros
                filtros={filtros}
                onCambiar={cambiarFiltros}
                onLimpiar={limpiarFiltros}
              />
            </div>
          ) : null}

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
              {/* La jornada vive en la pantalla principal y desaparece al
                  filtrar: el operador está buscando el historial, no el hoy. */}
              {!hayFiltros && delDia.length > 0 ? (
                <section className="jornada-lista" aria-label="Despachos de hoy">
                  {/* Cabecera visual de columnas (solo guía al ojo): los
                      lectores de pantalla obtienen el contenido de las celdas,
                      que se describen solas. */}
                  <div className="fila-despacho fila-cabecera" aria-hidden="true">
                    <span>Fecha</span>
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
                {hayFiltros ? (
                  <>
                    <p className="muted" aria-live="polite">
                      {total > despachos.length
                        ? `Mostrando ${despachos.length} de ${total} despachos${isFetching ? '…' : ''}`
                        : `${total === 1 ? '1 despacho' : `${total} despachos`}`}
                    </p>

                    {despachos.length === 0 ? (
                      <p className="card" role="status">
                        Sin resultados para tu búsqueda — revisa los filtros o limpia y prueba de
                        nuevo.
                      </p>
                    ) : (
                      /* El filtrado y la paginación corren en PostgreSQL:
                         la lista muestra la página ?pagina=N, del más
                         reciente al más antiguo. La fila entera abre la
                         ficha — Editar/Eliminar viven en la ficha. */
                      <DespachosLista despachos={despachos} onAbrirFicha={abrirFicha} />
                    )}

                    {/* Paginación por offset en la URL (?pagina=N): FUERA de
                        la rama de resultados — una página fuera de rango
                        (URL forjada o filtros cambiados a mano) muestra la
                        lista vacía PERO conserva el paginador para escapar. */}
                    {total > porPagina || paginaActual > 1 ? (
                      <div className="paginacion" role="navigation" aria-label="Paginación">
                        <button
                          type="button"
                          onClick={() => cambiarPagina(paginaActual - 1)}
                          disabled={paginaActual <= 1 || isFetching}
                        >
                          Anterior
                        </button>
                        <span className="muted" aria-live="polite">
                          Página {paginaActual} de {totalPaginas}
                        </span>
                        <button
                          type="button"
                          onClick={() => cambiarPagina(paginaActual + 1)}
                          disabled={paginaActual >= totalPaginas || isFetching}
                        >
                          Siguiente
                        </button>
                      </div>
                    ) : null}
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
