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

type ModoForm = { modo: 'cerrado' } | { modo: 'crear' } | { modo: 'editar'; despacho: Despacho }

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

  const mutationFormActiva = form.modo === 'crear' ? crear : actualizar
  const errorDeServidor = mutationFormActiva.error ? mensajeDeError(mutationFormActiva.error) : null

  function handleGuardar(input: DespachoInput) {
    if (form.modo === 'editar') {
      actualizar.mutate(
        { ...input, id: form.despacho.id },
        { onSuccess: () => setForm({ modo: 'cerrado' }) },
      )
      return
    }
    crear.mutate(input, { onSuccess: () => setForm({ modo: 'cerrado' }) })
  }

  function cambiarFiltro(valor: string) {
    const limpio = valor.trim()
    void navigate({ search: limpio ? { q: limpio } : {}, replace: true })
  }

  const hayFiltro = Boolean(q)

  /**
   * Modelo de pantalla (decisión de producto del admin):
   * - Form abierto → ES la pantalla (nada más compite por la vista).
   * - Default → solo la jornada de hoy; el historial aparece solo cuando
   *   hay búsqueda activa (progressive disclosure).
   */
  return (
    <main className="container">
      <BarraSesion />

      {formAbierto ? (
        <DespachoForm
          despacho={form.modo === 'editar' ? form.despacho : null}
          sugerenciasTransporte={sugerenciasTransporte}
          pending={mutationFormActiva.isPending}
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
                    <DespachoFila
                      key={despacho.id}
                      despacho={despacho}
                      eliminandoId={eliminar.isPending ? (eliminar.variables ?? null) : null}
                      onEditar={(despachoEditar) =>
                        setForm({ modo: 'editar', despacho: despachoEditar })
                      }
                      onEliminar={(id) => eliminar.mutate(id)}
                    />
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
                        onEditar={(despacho) => setForm({ modo: 'editar', despacho })}
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
    </main>
  )
}
