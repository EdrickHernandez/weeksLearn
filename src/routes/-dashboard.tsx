import * as React from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { signOutFn } from '~/features/auth/functions'
import { useSessionQuery } from '~/features/auth/queries/use-session'
import { DespachoApiError } from '~/features/despachos/unwrap'
import type { Despacho, DespachoInput } from '~/features/despachos/schemas'
import { useCreateDespachoMutation } from '~/features/despachos/mutations/use-create-despacho'
import { useDeleteDespachoMutation } from '~/features/despachos/mutations/use-delete-despacho'
import { useUpdateDespachoMutation } from '~/features/despachos/mutations/use-update-despacho'
import { DespachoForm } from '~/features/despachos/components/despacho-form'
import { DespachosTable } from '~/features/despachos/components/despachos-table'
import { useDespachosQuery } from '~/features/despachos/queries/use-despachos'
import { extractTransporteSuggestions, searchDespachos } from '~/features/despachos/service'
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

  return (
    <main className="container">
      <h1>Tracker de Despachos</h1>

      <BarraSesion />

      <div className="toolbar">
        <input
          type="search"
          value={q ?? ''}
          onChange={(e) => cambiarFiltro(e.target.value)}
          placeholder="Buscar por transporte, comuna, N° doc, N° guía…"
          aria-label="Buscar despachos"
        />
        <button
          type="button"
          onClick={() => setForm({ modo: 'crear' })}
          disabled={form.modo !== 'cerrado' || eliminar.isPending}
        >
          + Nuevo despacho
        </button>
      </div>

      {isError ? (
        <div className="card" role="alert">
          <p className="status-error">{mensajeDeError(error)}</p>
          {error instanceof DespachoApiError && error.status === 401 ? (
            <p>
              <Link to="/login">Ir a iniciar sesión →</Link>
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
      ) : despachos.length === 0 ? (
        <div className="card empty-state">
          <p>Aún no hay despachos registrados.</p>
          <button
            type="button"
            onClick={() => setForm({ modo: 'crear' })}
            disabled={form.modo !== 'cerrado'}
          >
            Crear el primero
          </button>
        </div>
      ) : (
        <>
          <p className="muted" aria-live="polite">
            {hayFiltro
              ? `${filtrados.length} de ${despachos.length} despachos`
              : `${despachos.length} despachos`}
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
      )}

      {/* El form vive FUERA de las ramas del listado: debe abrirse aunque el
          listado esté en error o vacío (antes quedaba inaccesible). */}
      {form.modo !== 'cerrado' ? (
        <DespachoForm
          despacho={form.modo === 'editar' ? form.despacho : null}
          sugerenciasTransporte={sugerenciasTransporte}
          pending={mutationFormActiva.isPending}
          errorDeServidor={errorDeServidor}
          onGuardar={handleGuardar}
          onCancelar={() => setForm({ modo: 'cerrado' })}
        />
      ) : null}
    </main>
  )
}
