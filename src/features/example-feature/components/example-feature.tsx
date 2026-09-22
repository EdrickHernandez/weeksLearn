import { useState } from 'react'
import { useGreetingQuery } from '../queries/use-greeting'
import { useShoutGreetingMutation } from '../mutations/use-shout-greeting'

const dateFmt = new Intl.DateTimeFormat('es', { dateStyle: 'full', timeStyle: 'short' })

/**
 * Demuestra la titularidad del estado:
 * - campo del formulario -> estado del componente (antes del submit)
 * - datos del servidor -> TanStack Query (query + mutation)
 */
export function ExampleFeature() {
  const [name, setName] = useState('')
  const greetingQuery = useGreetingQuery({ name })
  const shoutMutation = useShoutGreetingMutation()

  // Resultado gritado priorizado sobre el saludo original
  const greeting = shoutMutation.data ?? greetingQuery.data

  function handleShout() {
    if (greetingQuery.data) {
      shoutMutation.mutate(greetingQuery.data)
    }
  }

  return (
    <section>
      <form onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="name">Tu nombre</label>
        <br />
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Escribe tu nombre"
          maxLength={50}
        />
      </form>

      {name.trim().length > 0 && greetingQuery.isPending && <p>Cargando saludo…</p>}

      {greetingQuery.isError && (
        <p className="status-error">
          Error: {greetingQuery.error.message}{' '}
          <button onClick={() => greetingQuery.refetch()}>Reintentar</button>
        </p>
      )}

      {greeting && (
        <div className="card">
          <p>{greeting.message}</p>
          <p className="muted">{dateFmt.format(new Date(greeting.createdAt))}</p>
          <button onClick={handleShout} disabled={shoutMutation.isPending}>
            {shoutMutation.isPending ? 'Gritando…' : '¡GRITAR!'}
          </button>
        </div>
      )}

      {shoutMutation.isError && (
        <p className="status-error">Error al gritar: {shoutMutation.error.message}</p>
      )}
    </section>
  )
}
