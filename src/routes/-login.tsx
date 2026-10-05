import * as React from 'react'
import { useRouter } from '@tanstack/react-router'
import { getSupabaseBrowserClient } from '~/lib/supabase-browser'

/**
 * Login email/password con Supabase Auth.
 * El cliente del navegador guarda la sesión en cookies (@supabase/ssr),
 * que es exactamente lo que las Server Functions leen vía getUser().
 */
export function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    try {
      const { error: signInError } = await getSupabaseBrowserClient().auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) {
        setError('Email o contraseña incorrectos.')
        return
      }

      await router.invalidate()
      router.navigate({ to: '/' })
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="container">
      <h1>Iniciar sesión</h1>
      <p>Tracker de Despachos — acceso con tu cuenta.</p>

      <form className="card" onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            disabled={pending}
          />
        </label>

        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            disabled={pending}
          />
        </label>

        {error ? (
          <p className="status-error" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={pending}>
          {pending ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </main>
  )
}
