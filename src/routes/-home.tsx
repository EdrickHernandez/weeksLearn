import { Link } from '@tanstack/react-router'
import { publicEnv } from '~/lib/env'

export function Home() {
  const supabaseHost = new URL(publicEnv.VITE_SUPABASE_URL).host

  return (
    <main className="container">
      <h1>Fullstack Starter — Semana 0</h1>
      <p>Infraestructura de aplicación lista y verificada.</p>

      <h2>Stack</h2>
      <ul>
        <li>TanStack Start</li>
        <li>TanStack Query</li>
        <li>Redux Toolkit</li>
        <li>Supabase</li>
        <li>Zod</li>
      </ul>

      <div className="card">
        <h2>Entorno</h2>
        <p className="status-ok">VITE_SUPABASE_URL configurado ✓ ({supabaseHost})</p>
        <p className="status-ok">VITE_SUPABASE_ANON_KEY configurado ✓</p>
      </div>

      <p>
        <Link to="/example">Ver feature de ejemplo →</Link>
      </p>
    </main>
  )
}
